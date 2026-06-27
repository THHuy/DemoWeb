import { Router } from "express";
import pool from "../db";
import bcrypt from "bcryptjs";
import { authenticate } from "../middleware/auth";
import { logAudit } from "../utils/audit";
import XLSX from "xlsx";
import { broadcastNotification } from "./reservations";

const router = Router();

// Protect all routes - Authentication required
router.use(authenticate);

// Middleware to ensure user is system admin OR has business roles manager/owner
async function requireHRAdmin(req: any, res: any, next: any) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (req.user.role === "admin") {
      next();
      return;
    }
    // Check database business roles
    const result = await pool.query(
      `SELECT r.code 
       FROM employees e
       JOIN employee_roles er ON e.id = er.employee_id
       JOIN roles r ON er.role_id = r.id
       WHERE e.user_id = $1`,
      [req.user.id]
    );
    const codes = result.rows.map((row: any) => row.code);
    if (codes.includes("owner") || codes.includes("manager")) {
      next();
      return;
    }
    res.status(403).json({ error: "Forbidden. Chỉ Quản lý hoặc Chủ quán mới được thực hiện hành động này." });
  } catch (err) {
    console.error("Auth check error in hr router:", err);
    res.status(500).json({ error: "Lỗi kiểm tra quyền truy cập." });
  }
}

router.use(requireHRAdmin);

// ==========================================
// 1. Quản lý Nhân Viên (Employees)
// ==========================================

// GET /api/hr/employees — List all employees
router.get("/employees", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, u.username,
              COALESCE(json_agg(json_build_object('code', r.code, 'name', r.name)) FILTER (WHERE r.id IS NOT NULL), '[]'::json) as roles,
              sc.salary_type, sc.base_rate, sc.standard_working_days,
              sc.meal_allowance, sc.parking_allowance, sc.responsibility_allowance,
              sc.attendance_allowance, sc.sales_bonus
       FROM employees e
       LEFT JOIN users u ON e.user_id = u.id
       LEFT JOIN employee_roles er ON e.id = er.employee_id
       LEFT JOIN roles r ON er.role_id = r.id
       LEFT JOIN salary_configs sc ON e.id = sc.employee_id
       GROUP BY e.id, u.username, sc.id
       ORDER BY e.employee_code ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/hr/employees error:", error);
    res.status(500).json({ error: "Lấy danh sách nhân viên thất bại." });
  }
});

// POST /api/hr/employees — Create employee
router.post("/employees", async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      full_name, phone, email, cccd, address, date_of_birth, hire_date, status, avatar_url,
      username, password, system_role,
      role_codes, // array of role codes, e.g. ['barista']
      salary_type, base_rate, standard_working_days,
      meal_allowance, parking_allowance, responsibility_allowance,
      attendance_allowance, sales_bonus
    } = req.body;

    if (!full_name) {
      res.status(400).json({ error: "Họ và tên nhân viên là bắt buộc." });
      return;
    }

    await client.query("BEGIN");

    // 1. Generate unique employee code: EMP001, EMP002, etc.
    const codeResult = await client.query("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM employees");
    const nextId = codeResult.rows[0].next_id;
    const employee_code = `EMP${nextId.toString().padStart(3, "0")}`;

    // 2. Create login user if username and password are provided
    let user_id = null;
    if (username && password) {
      // Check duplicate user
      const userCheck = await client.query("SELECT id FROM users WHERE username = $1", [username]);
      if (userCheck.rows.length > 0) {
        res.status(400).json({ error: "Tên đăng nhập đã tồn tại." });
        return;
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const userResult = await client.query(
        `INSERT INTO users (username, password_hash, role)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [username, hashedPassword, system_role || "staff"]
      );
      user_id = userResult.rows[0].id;
    }

    // 3. Insert employee profile
    const empResult = await client.query(
      `INSERT INTO employees (employee_code, full_name, phone, email, cccd, address, date_of_birth, hire_date, status, avatar_url, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        employee_code, full_name, phone || null, email || null, cccd || null, address || null,
        date_of_birth || null, hire_date || null, status || "active", avatar_url || null, user_id
      ]
    );
    const employee = empResult.rows[0];

    // 4. Map business roles
    if (role_codes && Array.isArray(role_codes)) {
      for (const code of role_codes) {
        const roleRes = await client.query("SELECT id FROM roles WHERE code = $1", [code]);
        if (roleRes.rows.length > 0) {
          await client.query(
            "INSERT INTO employee_roles (employee_id, role_id) VALUES ($1, $2)",
            [employee.id, roleRes.rows[0].id]
          );
        }
      }
    }

    // 5. Configure salary
    if (salary_type && base_rate) {
      await client.query(
        `INSERT INTO salary_configs (
           employee_id, salary_type, base_rate, standard_working_days, 
           meal_allowance, parking_allowance, responsibility_allowance, 
           attendance_allowance, sales_bonus
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          employee.id, salary_type, base_rate, standard_working_days || 26,
          meal_allowance || 0, parking_allowance || 0, responsibility_allowance || 0,
          attendance_allowance || 0, sales_bonus || 0
        ]
      );
    }

    await client.query("COMMIT");

    await logAudit(
      req.user?.id,
      "create_employee",
      "employees",
      employee.id,
      null,
      employee
    );

    res.status(201).json({ success: true, employee });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("POST /api/hr/employees error:", error);
    res.status(500).json({ error: "Tạo nhân viên mới thất bại." });
  } finally {
    client.release();
  }
});

// PUT /api/hr/employees/:id — Update employee profile
router.put("/employees/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      full_name, phone, email, cccd, address, date_of_birth, hire_date, status, avatar_url,
      password, system_role,
      role_codes, // array of codes
      salary_type, base_rate, standard_working_days,
      meal_allowance, parking_allowance, responsibility_allowance,
      attendance_allowance, sales_bonus
    } = req.body;

    // Fetch existing employee
    const empCheck = await client.query("SELECT * FROM employees WHERE id = $1", [id]);
    if (empCheck.rows.length === 0) {
      res.status(404).json({ error: "Không tìm thấy nhân viên." });
      return;
    }
    const oldEmployee = empCheck.rows[0];

    await client.query("BEGIN");

    // 1. Update user account details if linked
    if (oldEmployee.user_id) {
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hashedPassword, oldEmployee.user_id]);
      }
      if (system_role) {
        await client.query("UPDATE users SET role = $1 WHERE id = $2", [system_role, oldEmployee.user_id]);
      }
    }

    // 2. Update employee profile
    const updateResult = await client.query(
      `UPDATE employees 
       SET full_name = $1, phone = $2, email = $3, cccd = $4, address = $5, 
           date_of_birth = $6, hire_date = $7, status = $8, avatar_url = $9, updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        full_name || oldEmployee.full_name,
        phone !== undefined ? phone : oldEmployee.phone,
        email !== undefined ? email : oldEmployee.email,
        cccd !== undefined ? cccd : oldEmployee.cccd,
        address !== undefined ? address : oldEmployee.address,
        date_of_birth !== undefined ? date_of_birth : oldEmployee.date_of_birth,
        hire_date !== undefined ? hire_date : oldEmployee.hire_date,
        status || oldEmployee.status,
        avatar_url !== undefined ? avatar_url : oldEmployee.avatar_url,
        id
      ]
    );
    const updatedEmployee = updateResult.rows[0];

    // 3. Update business roles
    if (role_codes && Array.isArray(role_codes)) {
      // Clear old roles
      await client.query("DELETE FROM employee_roles WHERE employee_id = $1", [id]);
      // Add new roles
      for (const code of role_codes) {
        const roleRes = await client.query("SELECT id FROM roles WHERE code = $1", [code]);
        if (roleRes.rows.length > 0) {
          await client.query(
            "INSERT INTO employee_roles (employee_id, role_id) VALUES ($1, $2)",
            [id, roleRes.rows[0].id]
          );
        }
      }
    }

    // 4. Update salary config
    if (salary_type && base_rate) {
      await client.query(
        `INSERT INTO salary_configs (
           employee_id, salary_type, base_rate, standard_working_days, 
           meal_allowance, parking_allowance, responsibility_allowance, 
           attendance_allowance, sales_bonus
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (employee_id) DO UPDATE 
         SET salary_type = EXCLUDED.salary_type,
             base_rate = EXCLUDED.base_rate,
             standard_working_days = EXCLUDED.standard_working_days,
             meal_allowance = EXCLUDED.meal_allowance,
             parking_allowance = EXCLUDED.parking_allowance,
             responsibility_allowance = EXCLUDED.responsibility_allowance,
             attendance_allowance = EXCLUDED.attendance_allowance,
             sales_bonus = EXCLUDED.sales_bonus,
             updated_at = NOW()`,
        [
          id, salary_type, base_rate, standard_working_days || 26,
          meal_allowance || 0, parking_allowance || 0, responsibility_allowance || 0,
          attendance_allowance || 0, sales_bonus || 0
        ]
      );
    }

    await client.query("COMMIT");

    await logAudit(
      req.user?.id,
      "update_employee",
      "employees",
      updatedEmployee.id,
      oldEmployee,
      updatedEmployee
    );

    res.json({ success: true, employee: updatedEmployee });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("PUT /api/hr/employees/:id error:", error);
    res.status(500).json({ error: "Cập nhật nhân viên thất bại." });
  } finally {
    client.release();
  }
});

// DELETE /api/hr/employees/:id — Delete employee
router.delete("/employees/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    // Get details for log
    const checkRes = await client.query("SELECT * FROM employees WHERE id = $1", [id]);
    if (checkRes.rows.length === 0) {
      res.status(404).json({ error: "Không tìm thấy nhân viên." });
      return;
    }
    const emp = checkRes.rows[0];

    await client.query("BEGIN");

    // Delete employee (will cascade clean roles and salary configs)
    await client.query("DELETE FROM employees WHERE id = $1", [id]);

    // Delete user account if it existed
    if (emp.user_id) {
      await client.query("DELETE FROM users WHERE id = $1", [emp.user_id]);
    }

    await client.query("COMMIT");

    await logAudit(req.user?.id, "delete_employee", "employees", parseInt(id), emp, null);

    res.json({ success: true, message: "Xóa nhân viên thành công." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("DELETE /api/hr/employees/:id error:", error);
    res.status(500).json({ error: "Xóa nhân viên thất bại." });
  } finally {
    client.release();
  }
});

// ==========================================
// 2. Quản lý Ca Làm Việc (Work Shifts)
// ==========================================

// GET /api/hr/shifts — List shifts
router.get("/shifts", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM work_shifts ORDER BY start_time ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/hr/shifts error:", error);
    res.status(500).json({ error: "Lấy ca làm việc thất bại." });
  }
});

// POST /api/hr/shifts — Create work shift
router.post("/shifts", async (req, res) => {
  try {
    const { name, code, start_time, end_time, break_minutes, day_value, barista_slots, cashier_slots } = req.body;
    if (!name || !code || !start_time || !end_time) {
      res.status(400).json({ error: "Tên, Mã, Giờ bắt đầu, Giờ kết thúc là bắt buộc." });
      return;
    }

    const result = await pool.query(
      `INSERT INTO work_shifts (name, code, start_time, end_time, break_minutes, day_value, is_default, is_active, barista_slots, cashier_slots)
       VALUES ($1, $2, $3, $4, $5, $6, false, true, $7, $8)
       RETURNING *`,
      [name, code.toLowerCase(), start_time, end_time, break_minutes || 0, day_value || 1.0, barista_slots || 0, cashier_slots || 0]
    );

    await logAudit(req.user?.id, "create_shift", "work_shifts", result.rows[0].id, null, result.rows[0]);

    res.status(201).json({ success: true, shift: result.rows[0] });
  } catch (error) {
    console.error("POST /api/hr/shifts error:", error);
    res.status(500).json({ error: "Tạo ca làm việc mới thất bại." });
  }
});

// PUT /api/hr/shifts/:id — Update work shift
router.put("/shifts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_time, end_time, break_minutes, day_value, is_active, barista_slots, cashier_slots } = req.body;

    const check = await pool.query("SELECT * FROM work_shifts WHERE id = $1", [id]);
    if (check.rows.length === 0) {
      res.status(404).json({ error: "Không tìm thấy ca làm việc." });
      return;
    }

    const result = await pool.query(
      `UPDATE work_shifts
       SET name = COALESCE($1, name),
           start_time = COALESCE($2, start_time),
           end_time = COALESCE($3, end_time),
           break_minutes = COALESCE($4, break_minutes),
           day_value = COALESCE($5, day_value),
           is_active = COALESCE($6, is_active),
           barista_slots = COALESCE($7, barista_slots),
           cashier_slots = COALESCE($8, cashier_slots),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [name, start_time, end_time, break_minutes, day_value, is_active, barista_slots, cashier_slots, id]
    );

    await logAudit(req.user?.id, "update_shift", "work_shifts", parseInt(id), check.rows[0], result.rows[0]);

    res.json({ success: true, shift: result.rows[0] });
  } catch (error) {
    console.error("PUT /api/hr/shifts/:id error:", error);
    res.status(500).json({ error: "Cập nhật ca làm việc thất bại." });
  }
});

// ==========================================
// 3. Quản lý Đăng Ký Ca & Đổi Ca (Shift Registrations)
// ==========================================

// GET /api/hr/registrations — Get registrations for review
router.get("/registrations", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `
      SELECT sr.*, e.employee_code, e.full_name, e.avatar_url,
             ws.name as shift_name, ws.start_time, ws.end_time, ws.day_value
      FROM shift_registrations sr
      JOIN employees e ON sr.employee_id = e.id
      JOIN work_shifts ws ON sr.shift_id = ws.id
    `;
    const params = [];

    if (start_date && end_date) {
      query += ` WHERE sr.shift_date >= $1 AND sr.shift_date <= $2`;
      params.push(start_date, end_date);
    }

    query += ` ORDER BY sr.shift_date DESC, ws.start_time ASC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/hr/registrations error:", error);
    res.status(500).json({ error: "Lấy danh sách đăng ký ca thất bại." });
  }
});

// PUT /api/hr/registrations/:id — Approve/Reject registration
router.put("/registrations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!["approved", "rejected"].includes(status)) {
      res.status(400).json({ error: "Trạng thái không hợp lệ." });
      return;
    }

    const check = await pool.query("SELECT * FROM shift_registrations WHERE id = $1", [id]);
    if (check.rows.length === 0) {
      res.status(404).json({ error: "Bản đăng ký ca không tồn tại." });
      return;
    }

    const result = await pool.query(
      `UPDATE shift_registrations 
       SET status = $1, approved_by = $2, updated_at = NOW() 
       WHERE id = $3
       RETURNING *`,
      [status, req.user?.id, id]
    );

    await logAudit(req.user?.id, "approve_shift", "shift_registrations", parseInt(id), check.rows[0], result.rows[0]);

    // Broadcast real-time notification to employee
    try {
      const shiftInfo = await pool.query(
        `SELECT ws.name as shift_name 
         FROM shift_registrations sr
         JOIN work_shifts ws ON sr.shift_id = ws.id
         WHERE sr.id = $1`,
        [id]
      );
      const shiftName = shiftInfo.rows[0]?.shift_name || "Ca làm việc";
      const dateFormatted = new Date(result.rows[0].shift_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
      const statusText = status === "approved" ? "phê duyệt" : "từ chối";
      
      broadcastNotification({
        type: "shift_approval",
        title: status === "approved" ? "Đăng ký ca được duyệt! 🎉" : "Đăng ký ca bị từ chối ❌",
        message: `Đăng ký ca ${shiftName} ngày ${dateFormatted} của bạn đã được ${statusText}.`,
        time: `${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })} - ${new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())}`,
        targetEmployeeId: result.rows[0].employee_id,
      });
    } catch (err) {
      console.error("Failed to broadcast shift approval notification:", err);
    }

    res.json({ success: true, registration: result.rows[0] });
  } catch (error) {
    console.error("PUT /api/hr/registrations/:id error:", error);
    res.status(500).json({ error: "Cập nhật trạng thái duyệt ca thất bại." });
  }
});

// GET /api/hr/swap-requests — List shift swap requests
router.get("/swap-requests", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT ss.*,
              e1.full_name as requester_name, e1.employee_code as requester_code,
              e2.full_name as target_name, e2.employee_code as target_code,
              sr1.shift_date as req_date, ws1.name as req_shift_name, ws1.start_time as req_start_time, ws1.end_time as req_end_time,
              sr2.shift_date as tar_date, ws2.name as tar_shift_name, ws2.start_time as tar_start_time, ws2.end_time as tar_end_time
       FROM shift_swaps ss
       JOIN employees e1 ON ss.requester_id = e1.id
       JOIN employees e2 ON ss.target_employee_id = e2.id
       JOIN shift_registrations sr1 ON ss.requester_registration_id = sr1.id
       JOIN work_shifts ws1 ON sr1.shift_id = ws1.id
       LEFT JOIN shift_registrations sr2 ON ss.target_registration_id = sr2.id
       LEFT JOIN work_shifts ws2 ON sr2.shift_id = ws2.id
       ORDER BY ss.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/hr/swap-requests error:", error);
    res.status(500).json({ error: "Lấy danh sách yêu cầu đổi ca thất bại." });
  }
});

// PUT /api/hr/swap-requests/:id — Process swap request (approve/reject)
router.put("/swap-requests/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!["approved", "rejected"].includes(status)) {
      res.status(400).json({ error: "Trạng thái phê duyệt không hợp lệ." });
      return;
    }

    const swapRes = await client.query("SELECT * FROM shift_swaps WHERE id = $1", [id]);
    if (swapRes.rows.length === 0) {
      res.status(404).json({ error: "Không tìm thấy yêu cầu đổi ca." });
      return;
    }
    const swap = swapRes.rows[0];

    if (swap.status !== "pending") {
      res.status(400).json({ error: "Yêu cầu đổi ca này đã được xử lý rồi." });
      return;
    }

    await client.query("BEGIN");

    if (status === "approved") {
      // Execute the swap!
      // Requester gets target employee's role/assignment, target employee gets requester's assignment.
      if (swap.target_registration_id) {
        // Swap employee ownerships on both registrations
        await client.query(
          "UPDATE shift_registrations SET employee_id = $1, updated_at = NOW() WHERE id = $2",
          [swap.target_employee_id, swap.requester_registration_id]
        );
        await client.query(
          "UPDATE shift_registrations SET employee_id = $1, updated_at = NOW() WHERE id = $2",
          [swap.requester_id, swap.target_registration_id]
        );
      } else {
        // Give-away case: requester gives shift to target. Just update requester's registration to target employee.
        await client.query(
          "UPDATE shift_registrations SET employee_id = $1, updated_at = NOW() WHERE id = $2",
          [swap.target_employee_id, swap.requester_registration_id]
        );
      }
    }

    // Update swap request status
    const updateSwap = await client.query(
      `UPDATE shift_swaps 
       SET status = $1, approved_by = $2, updated_at = NOW() 
       WHERE id = $3
       RETURNING *`,
      [status, req.user?.id, id]
    );

    await client.query("COMMIT");

    await logAudit(
      req.user?.id,
      status === "approved" ? "approve_shift_swap" : "reject_shift_swap",
      "shift_swaps",
      parseInt(id),
      swap,
      updateSwap.rows[0]
    );

    // Broadcast real-time notifications to both employees involved in the swap
    try {
      const shiftInfo = await pool.query(
        `SELECT sr.shift_date, ws.name as shift_name 
         FROM shift_registrations sr
         JOIN work_shifts ws ON sr.shift_id = ws.id
         WHERE sr.id = $1`,
        [swap.requester_registration_id]
      );
      const shiftDate = shiftInfo.rows[0]?.shift_date;
      const shiftName = shiftInfo.rows[0]?.shift_name || "Ca làm việc";
      const dateFormatted = shiftDate ? new Date(shiftDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
      const statusText = status === "approved" ? "phê duyệt" : "từ chối";

      // Notify requester
      broadcastNotification({
        type: "swap_approval",
        title: status === "approved" ? "Yêu cầu đổi ca được duyệt! 🎉" : "Yêu cầu đổi ca bị từ chối ❌",
        message: `Yêu cầu đổi ca ${shiftName} ngày ${dateFormatted} của bạn đã được ${statusText}.`,
        time: `${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })} - ${new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())}`,
        targetEmployeeId: swap.requester_id,
      });

      // Notify target employee
      broadcastNotification({
        type: "swap_approval",
        title: status === "approved" ? "Yêu cầu đổi ca được duyệt! 🎉" : "Yêu cầu đổi ca bị từ chối ❌",
        message: `Yêu cầu đổi ca ${shiftName} ngày ${dateFormatted} của bạn đã được ${statusText}.`,
        time: `${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })} - ${new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())}`,
        targetEmployeeId: swap.target_employee_id,
      });
    } catch (err) {
      console.error("Failed to broadcast swap approval notification:", err);
    }

    res.json({ success: true, message: `Yêu cầu đổi ca đã được ${status === "approved" ? "chấp nhận" : "từ chối"}.` });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("PUT /api/hr/swap-requests/:id error:", error);
    res.status(500).json({ error: "Xử lý yêu cầu đổi ca thất bại." });
  } finally {
    client.release();
  }
});

// ==========================================
// 4. Chấm Công & Nghỉ Phép (Attendance & Leaves)
// ==========================================

// GET /api/hr/attendance — View attendance logs
router.get("/attendance", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `
      SELECT al.*, e.employee_code, e.full_name, ws.name as shift_name, ws.start_time, ws.end_time
       FROM attendance_logs al
       JOIN employees e ON al.employee_id = e.id
       LEFT JOIN work_shifts ws ON al.shift_id = ws.id
    `;
    const params = [];

    if (start_date && end_date) {
      query += ` WHERE al.shift_date >= $1 AND al.shift_date <= $2`;
      params.push(start_date, end_date);
    }

    query += ` ORDER BY al.shift_date DESC, al.check_in DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/hr/attendance error:", error);
    res.status(500).json({ error: "Lấy nhật ký chấm công thất bại." });
  }
});

// PUT /api/hr/attendance/:id — Edit attendance logs manually (Manager override)
router.put("/attendance/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { check_in, check_out, status } = req.body;

    const check = await pool.query(
      `SELECT al.*, ws.start_time, ws.end_time 
       FROM attendance_logs al 
       LEFT JOIN work_shifts ws ON al.shift_id = ws.id 
       WHERE al.id = $1`,
      [id]
    );

    if (check.rows.length === 0) {
      res.status(404).json({ error: "Không tìm thấy bản ghi chấm công." });
      return;
    }
    const log = check.rows[0];

    // Compute late/early minutes if times are changed
    let isLate = log.is_late;
    let lateMinutes = log.late_minutes;
    let isEarly = log.is_early;
    let earlyMinutes = log.early_minutes;

    const shiftDateStr = new Date(log.shift_date).toISOString().substring(0, 10);

    if (check_in && log.start_time) {
      const scheduledStart = new Date(`${shiftDateStr}T${log.start_time}`);
      const checkInDate = new Date(check_in);
      const diffMs = checkInDate.getTime() - scheduledStart.getTime();
      lateMinutes = diffMs > 0 ? Math.floor(diffMs / 60000) : 0;
      isLate = lateMinutes > 0;
    } else if (check_in === null) {
      isLate = false;
      lateMinutes = 0;
    }

    if (check_out && log.end_time) {
      const scheduledEnd = new Date(`${shiftDateStr}T${log.end_time}`);
      const checkOutDate = new Date(check_out);
      const diffMs = scheduledEnd.getTime() - checkOutDate.getTime();
      earlyMinutes = diffMs > 0 ? Math.floor(diffMs / 60000) : 0;
      isEarly = earlyMinutes > 0;
    } else if (check_out === null) {
      isEarly = false;
      earlyMinutes = 0;
    }

    const result = await pool.query(
      `UPDATE attendance_logs
       SET check_in = $1, check_out = $2, is_late = $3, late_minutes = $4,
           is_early = $5, early_minutes = $6, status = $7, verified_by = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        check_in ? new Date(check_in) : null,
        check_out ? new Date(check_out) : null,
        isLate,
        lateMinutes,
        isEarly,
        earlyMinutes,
        status || "approved",
        req.user?.id,
        id
      ]
    );

    await logAudit(
      req.user?.id,
      "edit_attendance",
      "attendance_logs",
      parseInt(id),
      log,
      result.rows[0]
    );

    res.json({ success: true, log: result.rows[0] });
  } catch (error) {
    console.error("PUT /api/hr/attendance/:id error:", error);
    res.status(500).json({ error: "Cập nhật chấm công thủ công thất bại." });
  }
});

// GET /api/hr/leaves — List leave requests
router.get("/leaves", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT lr.*, e.employee_code, e.full_name
       FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       ORDER BY lr.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/hr/leaves error:", error);
    res.status(500).json({ error: "Lấy đơn nghỉ phép thất bại." });
  }
});

// PUT /api/hr/leaves/:id — Approve/Reject leaves
router.put("/leaves/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!["approved", "rejected"].includes(status)) {
      res.status(400).json({ error: "Trạng thái không hợp lệ." });
      return;
    }

    const check = await client.query("SELECT * FROM leave_requests WHERE id = $1", [id]);
    if (check.rows.length === 0) {
      res.status(404).json({ error: "Không tìm thấy đơn xin nghỉ phép." });
      return;
    }
    const leave = check.rows[0];

    await client.query("BEGIN");

    // Update leave request status
    const updateResult = await client.query(
      `UPDATE leave_requests
       SET status = $1, approved_by = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, req.user?.id, id]
    );

    if (status === "approved") {
      // Automatically cancel/delete registered shifts of this employee during leave range
      await client.query(
        `DELETE FROM shift_registrations 
         WHERE employee_id = $1 AND shift_date >= $2 AND shift_date <= $3`,
        [leave.employee_id, leave.start_date, leave.end_date]
      );
    }

    await client.query("COMMIT");

    await logAudit(
      req.user?.id,
      status === "approved" ? "approve_leave" : "reject_leave",
      "leave_requests",
      parseInt(id),
      leave,
      updateResult.rows[0]
    );

    // Broadcast real-time notification to employee
    try {
      const startFormatted = new Date(leave.start_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
      const endFormatted = new Date(leave.end_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
      const statusText = status === "approved" ? "phê duyệt" : "từ chối";
      
      broadcastNotification({
        type: "leave_approval",
        title: status === "approved" ? "Đơn nghỉ phép được duyệt! 🎉" : "Đơn nghỉ phép bị từ chối ❌",
        message: `Đơn nghỉ phép từ ngày ${startFormatted} đến ${endFormatted} của bạn đã được ${statusText}.`,
        time: `${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })} - ${new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())}`,
        targetEmployeeId: leave.employee_id,
      });
    } catch (err) {
      console.error("Failed to broadcast leave approval notification:", err);
    }

    res.json({ success: true, leaveRequest: updateResult.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("PUT /api/hr/leaves/:id error:", error);
    res.status(500).json({ error: "Xử lý đơn nghỉ phép thất bại." });
  } finally {
    client.release();
  }
});

// ==========================================
// 5. Cấu hình HR Settings
// ==========================================

// GET /api/hr/settings — Get settings
router.get("/settings", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM hr_settings");
    const settingsMap = result.rows.reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json(settingsMap);
  } catch (error) {
    console.error("GET /api/hr/settings error:", error);
    res.status(500).json({ error: "Lấy cấu hình HR thất bại." });
  }
});

// POST /api/hr/settings — Save settings
router.post("/settings", async (req, res) => {
  try {
    const settings = req.body; // e.g. { late_penalty_type: 'warn', early_penalty_type: 'minute' }
    for (const key of Object.keys(settings)) {
      await pool.query(
        `INSERT INTO hr_settings (key, value) 
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, settings[key].toString()]
      );
      await logAudit(req.user?.id, "update_hr_setting", "hr_settings", null, null, { key, value: settings[key] });
    }
    res.json({ success: true, message: "Cập nhật cấu hình thành công." });
  } catch (error) {
    console.error("POST /api/hr/settings error:", error);
    res.status(500).json({ error: "Cập nhật cấu hình thất bại." });
  }
});

// ==========================================
// 6. Tính Lương & Bảng Lương (Payroll)
// ==========================================

// GET /api/hr/payroll — Get payroll summary for a month
router.get("/payroll", async (req, res) => {
  try {
    const { pay_month } = req.query; // YYYY-MM
    if (!pay_month) {
      res.status(400).json({ error: "Vui lòng chọn tháng tính lương (YYYY-MM)." });
      return;
    }

    const result = await pool.query(
      `SELECT sr.*, e.employee_code, e.full_name,
              COALESCE(json_agg(sa) FILTER (WHERE sa.id IS NOT NULL), '[]'::json) as allowances,
              COALESCE(json_agg(sd) FILTER (WHERE sd.id IS NOT NULL), '[]'::json) as deductions
       FROM salary_records sr
       JOIN employees e ON sr.employee_id = e.id
       LEFT JOIN salary_allowances sa ON sa.salary_record_id = sr.id
       LEFT JOIN salary_deductions sd ON sd.salary_record_id = sr.id
       WHERE sr.pay_month = $1
       GROUP BY sr.id, e.employee_code, e.full_name
       ORDER BY e.employee_code ASC`,
      [pay_month]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/hr/payroll error:", error);
    res.status(500).json({ error: "Lấy bảng lương thất bại." });
  }
});

// POST /api/hr/payroll/run — Execute payroll calculations
router.post("/payroll/run", async (req, res) => {
  const client = await pool.connect();
  try {
    const { pay_month } = req.body; // YYYY-MM
    if (!pay_month) {
      res.status(400).json({ error: "Vui lòng truyền vào tháng tính lương." });
      return;
    }

    // Fetch HR rules/settings
    const settingsRes = await client.query("SELECT * FROM hr_settings");
    const settings = settingsRes.rows.reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    const latePenaltyType = settings.late_penalty_type || "warn";
    const earlyPenaltyType = settings.early_penalty_type || "minute";

    await client.query("BEGIN");

    // Fetch all active employees with salary configurations
    const employeesRes = await client.query(
      `SELECT e.id, e.full_name, sc.salary_type, sc.base_rate, sc.standard_working_days,
              sc.meal_allowance, sc.parking_allowance, sc.responsibility_allowance, sc.attendance_allowance, sc.sales_bonus
       FROM employees e
       JOIN salary_configs sc ON e.id = sc.employee_id
       WHERE e.status <> 'terminated'`
    );

    const generatedRecords = [];

    for (const emp of employeesRes.rows) {
      const empId = emp.id;
      const salaryType = emp.salary_type;
      const baseRate = parseFloat(emp.base_rate);
      const stdWorkingDays = emp.standard_working_days || 26;

      let actualHours = 0;
      let actualDays = 0;
      let baseSalary = 0;
      let lateEarlyDeduction = 0;
      let totalLateMinutes = 0;
      let totalEarlyMinutes = 0;

      // 1. Fetch approved attendance logs for this employee in the month
      const logsRes = await client.query(
        `SELECT al.*, ws.start_time, ws.end_time, ws.break_minutes, ws.day_value 
         FROM attendance_logs al
         LEFT JOIN work_shifts ws ON al.shift_id = ws.id
         WHERE al.employee_id = $1 AND al.status = 'approved'
           AND TO_CHAR(al.shift_date, 'YYYY-MM') = $2`,
        [empId, pay_month]
      );

      // Hourly base equivalent for monthly late/early deduction
      // Standard: 8 hours work day
      const hourlyEquivalent = (baseRate / stdWorkingDays) / 8;

      for (const log of logsRes.rows) {
        if (!log.check_in || !log.check_out) continue;

        const checkIn = new Date(log.check_in);
        const checkOut = new Date(log.check_out);
        const breakMins = log.break_minutes || 0;

        // Shift day value
        const shiftDayValue = log.day_value ? parseFloat(log.day_value) : 1.0;

        // Base shift duration hours
        let shiftHours = (checkOut.getTime() - checkIn.getTime()) / 3600000;
        shiftHours = Math.max(0, shiftHours - (breakMins / 60));

        let currentLateMinutes = log.late_minutes || 0;
        let currentEarlyMinutes = log.early_minutes || 0;

        totalLateMinutes += currentLateMinutes;
        totalEarlyMinutes += currentEarlyMinutes;

        // Penalties calculations
        if (salaryType === "hourly") {
          // Hourly: Actual hours are reduced by penalty minutes
          let logHours = shiftHours;
          if (latePenaltyType === "minute") {
            logHours -= (currentLateMinutes / 60);
          }
          if (earlyPenaltyType === "minute") {
            logHours -= (currentEarlyMinutes / 60);
          } else if (earlyPenaltyType === "no_shift" && log.is_early) {
            logHours = 0;
          }
          actualHours += Math.max(0, logHours);
          actualDays += shiftDayValue;
        } else {
          // Monthly: count day values, and deduct fine money separately
          let countedDayValue = shiftDayValue;
          if (earlyPenaltyType === "no_shift" && log.is_early) {
            countedDayValue = 0;
          }
          actualDays += countedDayValue;

          // Fines money
          if (latePenaltyType === "minute") {
            lateEarlyDeduction += (currentLateMinutes / 60) * hourlyEquivalent;
          }
          if (earlyPenaltyType === "minute") {
            lateEarlyDeduction += (currentEarlyMinutes / 60) * hourlyEquivalent;
          }
        }
      }

      // 2. Base salary calculation
      if (salaryType === "hourly") {
        baseSalary = actualHours * baseRate;
      } else {
        baseSalary = (actualDays / stdWorkingDays) * baseRate;
      }

      // Allowances totals
      const mealAllow = parseFloat(emp.meal_allowance || 0);
      const parkAllow = parseFloat(emp.parking_allowance || 0);
      const respAllow = parseFloat(emp.responsibility_allowance || 0);
      const attenAllow = parseFloat(emp.attendance_allowance || 0);
      const salesBonus = parseFloat(emp.sales_bonus || 0);
      const allowanceTotal = mealAllow + parkAllow + respAllow + attenAllow + salesBonus;

      // Deductions totals
      const deductionTotal = lateEarlyDeduction;
      const netSalary = Math.max(0, baseSalary + allowanceTotal - deductionTotal);

      // 3. Upsert salary record
      const upsertRes = await client.query(
        `INSERT INTO salary_records (employee_id, pay_month, actual_hours, actual_days, base_salary, allowance_total, deduction_total, net_salary, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9)
         ON CONFLICT (employee_id, pay_month) DO UPDATE 
         SET actual_hours = EXCLUDED.actual_hours,
             actual_days = EXCLUDED.actual_days,
             base_salary = EXCLUDED.base_salary,
             allowance_total = EXCLUDED.allowance_total,
             deduction_total = EXCLUDED.deduction_total,
             net_salary = EXCLUDED.net_salary,
             updated_at = NOW()
         RETURNING *`,
        [empId, pay_month, actualHours, actualDays, baseSalary, allowanceTotal, deductionTotal, netSalary, req.user?.id]
      );
      const record = upsertRes.rows[0];

      // Clear old breakdowns
      await client.query("DELETE FROM salary_allowances WHERE salary_record_id = $1", [record.id]);
      await client.query("DELETE FROM salary_deductions WHERE salary_record_id = $1", [record.id]);

      // Insert allowance breakdowns
      if (mealAllow > 0) await client.query("INSERT INTO salary_allowances(salary_record_id, allowance_type, amount, note) VALUES ($1, 'Ăn uống', $2, 'Phụ cấp ăn uống cố định')", [record.id, mealAllow]);
      if (parkAllow > 0) await client.query("INSERT INTO salary_allowances(salary_record_id, allowance_type, amount, note) VALUES ($1, 'Gửi xe', $2, 'Phụ cấp gửi xe cố định')", [record.id, parkAllow]);
      if (respAllow > 0) await client.query("INSERT INTO salary_allowances(salary_record_id, allowance_type, amount, note) VALUES ($1, 'Trách nhiệm', $2, 'Phụ cấp trách nhiệm')", [record.id, respAllow]);
      if (attenAllow > 0) await client.query("INSERT INTO salary_allowances(salary_record_id, allowance_type, amount, note) VALUES ($1, 'Chuyên cần', $2, 'Phụ cấp chuyên cần')", [record.id, attenAllow]);
      if (salesBonus > 0) await client.query("INSERT INTO salary_allowances(salary_record_id, allowance_type, amount, note) VALUES ($1, 'Thưởng doanh số', $2, 'Thưởng doanh số')", [record.id, salesBonus]);

      // Insert deduction breakdowns
      if (lateEarlyDeduction > 0) {
        await client.query(
          "INSERT INTO salary_deductions(salary_record_id, deduction_type, amount, note) VALUES ($1, 'late_early', $2, $3)",
          [record.id, lateEarlyDeduction, `Phạt trễ (${totalLateMinutes}p), về sớm (${totalEarlyMinutes}p)`]
        );
      }

      generatedRecords.push({
        ...record,
        full_name: emp.full_name
      });
    }

    await client.query("COMMIT");

    await logAudit(req.user?.id, "calculate_payroll", "payrolls", null, { pay_month }, generatedRecords);

    res.json({ success: true, count: generatedRecords.length, records: generatedRecords });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("POST /api/hr/payroll/run error:", error);
    res.status(500).json({ error: "Tính lương tháng thất bại." });
  } finally {
    client.release();
  }
});

// PUT /api/hr/payroll/:id — Update pay slip status (draft -> approved -> paid)
router.put("/payroll/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'draft', 'approved', 'paid'

    if (!["draft", "approved", "paid"].includes(status)) {
      res.status(400).json({ error: "Trạng thái không hợp lệ." });
      return;
    }

    const check = await pool.query("SELECT * FROM salary_records WHERE id = $1", [id]);
    if (check.rows.length === 0) {
      res.status(404).json({ error: "Không tìm thấy bảng lương." });
      return;
    }

    const result = await pool.query(
      "UPDATE salary_records SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, id]
    );

    await logAudit(req.user?.id, "update_payroll_status", "salary_records", parseInt(id), check.rows[0], result.rows[0]);

    res.json({ success: true, record: result.rows[0] });
  } catch (error) {
    console.error("PUT /api/hr/payroll/:id error:", error);
    res.status(500).json({ error: "Cập nhật trạng thái chi trả lương thất bại." });
  }
});

// POST /api/hr/payroll/adjustments — Add manual allowance or deduction to a pay slip
router.post("/payroll/adjustments", async (req, res) => {
  const client = await pool.connect();
  try {
    const { salary_record_id, type, sub_type, amount, note } = req.body; // type: 'allowance' or 'deduction'

    if (!salary_record_id || !type || !amount || !sub_type) {
      res.status(400).json({ error: "Thiếu thông tin điều chỉnh lương." });
      return;
    }

    const check = await client.query("SELECT * FROM salary_records WHERE id = $1", [salary_record_id]);
    if (check.rows.length === 0) {
      res.status(404).json({ error: "Không tìm thấy bảng lương tương ứng." });
      return;
    }
    const record = check.rows[0];

    await client.query("BEGIN");

    const amountVal = parseFloat(amount);

    if (type === "allowance") {
      await client.query(
        "INSERT INTO salary_allowances (salary_record_id, allowance_type, amount, note) VALUES ($1, $2, $3, $4)",
        [salary_record_id, sub_type, amountVal, note || ""]
      );
      // Recalculate salary
      await client.query(
        `UPDATE salary_records 
         SET allowance_total = allowance_total + $1, 
             net_salary = net_salary + $1,
             updated_at = NOW() 
         WHERE id = $2`,
        [amountVal, salary_record_id]
      );
    } else {
      await client.query(
        "INSERT INTO salary_deductions (salary_record_id, deduction_type, amount, note) VALUES ($1, $2, $3, $4)",
        [salary_record_id, sub_type, amountVal, note || ""]
      );
      // Recalculate salary
      await client.query(
        `UPDATE salary_records 
         SET deduction_total = deduction_total + $1, 
             net_salary = GREATEST(0, net_salary - $1),
             updated_at = NOW() 
         WHERE id = $2`,
        [amountVal, salary_record_id]
      );
    }

    const updated = await client.query("SELECT * FROM salary_records WHERE id = $1", [salary_record_id]);

    await client.query("COMMIT");

    await logAudit(req.user?.id, "adjust_salary", "salary_records", salary_record_id, record, updated.rows[0]);

    res.json({ success: true, record: updated.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("POST /api/hr/payroll/adjustments error:", error);
    res.status(500).json({ error: "Điều chỉnh lương thất bại." });
  } finally {
    client.release();
  }
});

// ==========================================
// 7. Xuất Excel Bảng Lương (Excel Export)
// ==========================================

// GET /api/hr/payroll/export — Multi-sheet Excel exporter
router.get("/payroll/export", async (req, res) => {
  try {
    const { pay_month } = req.query; // YYYY-MM
    if (!pay_month || typeof pay_month !== "string") {
      res.status(400).send("Tháng tính lương (pay_month) không hợp lệ hoặc là bắt buộc.");
      return;
    }

    // 1. Fetch Payroll Records
    const payrollRes = await pool.query(
      `SELECT e.employee_code AS "Mã Nhân Viên", e.full_name AS "Họ Tên", 
              sc.salary_type AS "Hình thức lương", sr.actual_hours AS "Số Giờ Làm", 
              sr.actual_days AS "Số Công thực tế", sr.base_salary AS "Lương Cơ Bản (VNĐ)",
              sr.allowance_total AS "Tổng Phụ Cấp (VNĐ)", sr.deduction_total AS "Tổng Khấu Trừ (VNĐ)", 
              sr.net_salary AS "Lương Thực Nhận (VNĐ)", sr.status AS "Trạng thái chi trả"
       FROM salary_records sr
       JOIN employees e ON sr.employee_id = e.id
       JOIN salary_configs sc ON e.id = sc.employee_id
       WHERE sr.pay_month = $1`,
      [pay_month]
    );

    // 2. Fetch Working Sheets (Attendance Logs)
    const attendanceRes = await pool.query(
      `SELECT e.employee_code AS "Mã Nhân Viên", e.full_name AS "Họ Tên",
              al.shift_date AS "Ngày Làm", ws.name AS "Ca Làm",
              TO_CHAR(al.check_in, 'HH24:MI:SS') AS "Giờ Check-in", 
              TO_CHAR(al.check_out, 'HH24:MI:SS') AS "Giờ Check-out",
              al.late_minutes AS "Phút trễ", al.early_minutes AS "Phút về sớm",
              al.break_minutes AS "Phút nghỉ giữa ca", al.status AS "Trạng thái công"
       FROM attendance_logs al
       JOIN employees e ON al.employee_id = e.id
       LEFT JOIN work_shifts ws ON al.shift_id = ws.id
       WHERE TO_CHAR(al.shift_date, 'YYYY-MM') = $1
       ORDER BY al.shift_date ASC, e.employee_code ASC`,
      [pay_month]
    );

    // 3. Fetch Lateness Details
    const latenessRes = await pool.query(
      `SELECT e.employee_code AS "Mã Nhân Viên", e.full_name AS "Họ Tên",
              al.shift_date AS "Ngày trễ/về sớm", ws.name AS "Ca Làm",
              al.late_minutes AS "Số Phút Trễ", al.early_minutes AS "Số Phút Về Sớm"
       FROM attendance_logs al
       JOIN employees e ON al.employee_id = e.id
       LEFT JOIN work_shifts ws ON al.shift_id = ws.id
       WHERE TO_CHAR(al.shift_date, 'YYYY-MM') = $1
         AND (al.is_late = true OR al.is_early = true)
       ORDER BY al.shift_date ASC`,
      [pay_month]
    );

    // 4. Fetch Approved Leaves
    const leavesRes = await pool.query(
      `SELECT e.employee_code AS "Mã Nhân Viên", e.full_name AS "Họ Tên",
              lr.start_date AS "Ngày Bắt Đầu", lr.end_date AS "Ngày Kết Thúc",
              lr.leave_type AS "Loại Phép", lr.reason AS "Lý Do", lr.status AS "Trạng thái duyệt"
       FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       WHERE TO_CHAR(lr.start_date, 'YYYY-MM') = $1 OR TO_CHAR(lr.end_date, 'YYYY-MM') = $1
       ORDER BY lr.start_date ASC`,
      [pay_month]
    );

    // Create Excel Workbook
    const wb = XLSX.utils.book_new();

    // Add sheets
    const wsPayroll = XLSX.utils.json_to_sheet(payrollRes.rows);
    XLSX.utils.book_append_sheet(wb, wsPayroll, "Bảng Lương");

    const wsAttendance = XLSX.utils.json_to_sheet(attendanceRes.rows);
    XLSX.utils.book_append_sheet(wb, wsAttendance, "Bảng Chấm Công");

    const wsLateness = XLSX.utils.json_to_sheet(latenessRes.rows);
    XLSX.utils.book_append_sheet(wb, wsLateness, "Danh Sách Đi Trễ Về Sớm");

    const wsLeaves = XLSX.utils.json_to_sheet(leavesRes.rows);
    XLSX.utils.book_append_sheet(wb, wsLeaves, "Danh Sách Nghỉ Phép");

    // Write file to memory buffer
    const fileBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    const formattedMonth = pay_month.replace("-", "_");
    res.setHeader("Content-Disposition", `attachment; filename=Payroll_${formattedMonth}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(fileBuffer);
  } catch (error) {
    console.error("GET /api/hr/payroll/export error:", error);
    res.status(500).send("Xuất Excel thất bại.");
  }
});

// ==========================================
// 8. HR Dashboard & Audit Logs
// ==========================================

// GET /api/hr/dashboard — Dashboard HR stats
router.get("/dashboard", async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

    // 1. Total employees count (by status)
    const empCountRes = await pool.query(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'active') as active,
         COUNT(*) FILTER (WHERE status = 'on_leave') as on_leave,
         COUNT(*) FILTER (WHERE status = 'terminated') as terminated
       FROM employees`
    );
    const empCounts = empCountRes.rows[0];

    // 2. Total hours worked this month
    const hoursRes = await pool.query(
      `SELECT SUM(EXTRACT(EPOCH FROM (check_out - check_in))/3600 - (break_minutes/60.0)) as total_hours
       FROM attendance_logs
       WHERE status = 'approved' AND TO_CHAR(shift_date, 'YYYY-MM') = $1`,
      [currentMonth]
    );
    const totalHours = parseFloat(hoursRes.rows[0].total_hours || 0);

    // 3. Total salary costs this month
    const salaryCostRes = await pool.query(
      `SELECT SUM(net_salary) as total_cost
       FROM salary_records
       WHERE pay_month = $1`,
      [currentMonth]
    );
    const totalCost = parseFloat(salaryCostRes.rows[0].total_cost || 0);

    // 4. Top diligent employees (most shifts approved)
    const topDiligentRes = await pool.query(
      `SELECT e.full_name, e.employee_code, COUNT(al.id) as shift_count
       FROM attendance_logs al
       JOIN employees e ON al.employee_id = e.id
       WHERE al.status = 'approved' AND TO_CHAR(al.shift_date, 'YYYY-MM') = $1
       GROUP BY e.id
       ORDER BY shift_count DESC
       LIMIT 5`,
      [currentMonth]
    );

    // 5. Top late/early checkouts
    const topLateRes = await pool.query(
      `SELECT e.full_name, e.employee_code, SUM(al.late_minutes + al.early_minutes) as penalty_minutes
       FROM attendance_logs al
       JOIN employees e ON al.employee_id = e.id
       WHERE TO_CHAR(al.shift_date, 'YYYY-MM') = $1 AND (al.is_late = true OR al.is_early = true)
       GROUP BY e.id
       ORDER BY penalty_minutes DESC
       LIMIT 5`,
      [currentMonth]
    );

    res.json({
      employees: {
        total: parseInt(empCounts.total || 0),
        active: parseInt(empCounts.active || 0),
        on_leave: parseInt(empCounts.on_leave || 0),
        terminated: parseInt(empCounts.terminated || 0)
      },
      totalHours,
      totalCost,
      topDiligent: topDiligentRes.rows,
      topLate: topLateRes.rows
    });
  } catch (error) {
    console.error("GET /api/hr/dashboard error:", error);
    res.status(500).json({ error: "Lấy số liệu thống kê HR thất bại." });
  }
});

// GET /api/hr/audit-logs — Retrieve audit logs
router.get("/audit-logs", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT al.*, u.username
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/hr/audit-logs error:", error);
    res.status(500).json({ error: "Lấy nhật ký hoạt động hệ thống thất bại." });
  }
});

export default router;

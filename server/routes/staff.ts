import { Router } from "express";
import pool from "../db";
import { authenticate } from "../middleware/auth";
import { logAudit } from "../utils/audit";
import { broadcastNotification } from "./reservations";

const router = Router();

// Protect all routes under this router - must be logged in
router.use(authenticate);

// Helper to get linked employee
async function getLinkedEmployee(userId: number) {
  const result = await pool.query(
    `SELECT e.*, array_agg(r.code) as roles 
     FROM employees e
     LEFT JOIN employee_roles er ON e.id = er.employee_id
     LEFT JOIN roles r ON er.role_id = r.id
     WHERE e.user_id = $1
     GROUP BY e.id`,
    [userId]
  );
  return result.rows[0] || null;
}

// GET /api/staff/me — Get personal employee profile and roles
router.get("/me", async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const employee = await getLinkedEmployee(req.user.id);
    if (!employee) {
      res.status(404).json({ error: "Tài khoản chưa được liên kết với hồ sơ nhân viên." });
      return;
    }
    res.json({ success: true, employee });
  } catch (error) {
    console.error("GET /api/staff/me error:", error);
    res.status(500).json({ error: "Lấy thông tin nhân viên thất bại." });
  }
});

// GET /api/staff/shifts — View own scheduled work shifts
router.get("/shifts", async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const employee = await getLinkedEmployee(req.user.id);
    if (!employee) {
      res.status(404).json({ error: "Nhân viên chưa liên kết." });
      return;
    }

    const { start_date, end_date } = req.query;
    let query = `
      SELECT sr.id, sr.shift_date, sr.status,
             ws.id as shift_id, ws.name as shift_name, ws.start_time, ws.end_time, ws.break_minutes
      FROM shift_registrations sr
      JOIN work_shifts ws ON sr.shift_id = ws.id
      WHERE sr.employee_id = $1
    `;
    const params: any[] = [employee.id];

    if (start_date && end_date) {
      query += ` AND sr.shift_date >= $2 AND sr.shift_date <= $3`;
      params.push(start_date, end_date);
    } else {
      // Default: previous month, current month, and next month
      query += ` AND sr.shift_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
                 AND sr.shift_date < DATE_TRUNC('month', CURRENT_DATE + INTERVAL '2 month')`;
    }

    query += ` ORDER BY sr.shift_date ASC, ws.start_time ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/staff/shifts error:", error);
    res.status(500).json({ error: "Lấy lịch làm việc thất bại." });
  }
});

// GET /api/staff/shifts/all — View all employees' scheduled work shifts
router.get("/shifts/all", async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const employee = await getLinkedEmployee(req.user.id);
    if (!employee) {
      res.status(404).json({ error: "Nhân viên chưa liên kết." });
      return;
    }

    const { start_date, end_date } = req.query;
    let query = `
      SELECT sr.id, sr.shift_date, sr.status, sr.employee_id,
             ws.id as shift_id, ws.name as shift_name, ws.start_time, ws.end_time,
             e.full_name as employee_name, e.employee_code
      FROM shift_registrations sr
      JOIN work_shifts ws ON sr.shift_id = ws.id
      JOIN employees e ON sr.employee_id = e.id
      WHERE sr.status = 'approved'
    `;
    const params: any[] = [];

    if (start_date && end_date) {
      query += ` AND sr.shift_date >= $1 AND sr.shift_date <= $2`;
      params.push(start_date, end_date);
    } else {
      // Default: previous month, current month, and next month
      query += ` AND sr.shift_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
                 AND sr.shift_date < DATE_TRUNC('month', CURRENT_DATE + INTERVAL '2 month')`;
    }

    query += ` ORDER BY sr.shift_date ASC, ws.start_time ASC, e.full_name ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/staff/shifts/all error:", error);
    res.status(500).json({ error: "Lấy lịch làm việc của toàn bộ nhân viên thất bại." });
  }
});

// GET /api/staff/active-shifts — Fetch active work shifts list
router.get("/active-shifts", async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const result = await pool.query("SELECT * FROM work_shifts WHERE is_active = true ORDER BY start_time ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/staff/active-shifts error:", error);
    res.status(500).json({ error: "Lấy danh sách ca làm việc hoạt động thất bại." });
  }
});

// POST /api/staff/shifts/register — Register shifts for week/month
router.post("/shifts/register", async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const employee = await getLinkedEmployee(req.user.id);
    if (!employee) {
      res.status(404).json({ error: "Nhân viên chưa liên kết." });
      return;
    }

    const { shift_date, shift_id } = req.body;
    if (!shift_date || !shift_id) {
      res.status(400).json({ error: "Ngày và Ca làm việc là bắt buộc." });
      return;
    }

    // Check if shift exists
    const shiftCheck = await pool.query("SELECT * FROM work_shifts WHERE id = $1 AND is_active = true", [shift_id]);
    if (shiftCheck.rows.length === 0) {
      res.status(404).json({ error: "Ca làm việc không tồn tại hoặc ngừng hoạt động." });
      return;
    }
    const targetShift = shiftCheck.rows[0];

    // Check if on leave
    const leaveCheck = await pool.query(
      `SELECT id 
       FROM leave_requests 
       WHERE employee_id = $1 
         AND status != 'rejected' 
         AND $2::date >= start_date 
         AND $2::date <= end_date`,
      [employee.id, shift_date]
    );

    if (leaveCheck.rows.length > 0) {
      res.status(400).json({ error: "Bạn đã đăng ký nghỉ phép trong ngày này." });
      return;
    }

    // Check overlapping registrations (Full Ca + Ca Con)
    const existingRegs = await pool.query(
      `SELECT sr.id, sr.shift_id, ws.code, ws.name
       FROM shift_registrations sr
       JOIN work_shifts ws ON sr.shift_id = ws.id
       WHERE sr.employee_id = $1 AND sr.shift_date = $2 AND sr.status != 'rejected'`,
      [employee.id, shift_date]
    );

    const hasFull = existingRegs.rows.some((r: any) => r.code === "full");
    const hasSubShift = existingRegs.rows.some((r: any) => r.code === "sang" || r.code === "chieu");

    if (targetShift.code === "sang" || targetShift.code === "chieu") {
      if (hasFull) {
        res.status(400).json({ error: "Bạn đã đăng ký ca Full trong ngày này." });
        return;
      }
    }

    if (targetShift.code === "full") {
      if (hasSubShift) {
        res.status(400).json({ error: "Bạn đã đăng ký ca Full trong ngày này." });
        return;
      }
    }

    // Check if already registered
    const dupCheck = await pool.query(
      "SELECT id, status FROM shift_registrations WHERE employee_id = $1 AND shift_date = $2 AND shift_id = $3",
      [employee.id, shift_date, shift_id]
    );

    if (dupCheck.rows.length > 0) {
      res.status(400).json({ error: "Bạn đã đăng ký ca này vào ngày đã chọn rồi." });
      return;
    }

    // Fetch employee roles
    const rolesRes = await pool.query(
      `SELECT r.code 
       FROM employee_roles er
       JOIN roles r ON er.role_id = r.id
       WHERE er.employee_id = $1`,
      [employee.id]
    );
    const employeeRoles = rolesRes.rows.map((row: any) => row.code);

    let autoApprove = false;
    let hasSlotsConfigured = false;

    // Check Barista (Pha chế) slots
    if (employeeRoles.includes("barista")) {
      const baristaLimit = targetShift.barista_slots || 0;
      if (baristaLimit > 0) {
        hasSlotsConfigured = true;
        const countRes = await pool.query(
          `SELECT COUNT(DISTINCT sr.employee_id)
           FROM shift_registrations sr
           JOIN employee_roles er ON sr.employee_id = er.employee_id
           JOIN roles r ON er.role_id = r.id
           WHERE sr.shift_date = $1 
             AND sr.shift_id = $2 
             AND sr.status = 'approved'
             AND r.code = 'barista'`,
          [shift_date, shift_id]
        );
        const approvedCount = parseInt(countRes.rows[0].count);
        if (approvedCount < baristaLimit) {
          autoApprove = true;
        }
      }
    }

    // Check Cashier (Thu ngân) slots
    if (!autoApprove && employeeRoles.includes("cashier")) {
      const cashierLimit = targetShift.cashier_slots || 0;
      if (cashierLimit > 0) {
        hasSlotsConfigured = true;
        const countRes = await pool.query(
          `SELECT COUNT(DISTINCT sr.employee_id)
           FROM shift_registrations sr
           JOIN employee_roles er ON sr.employee_id = er.employee_id
           JOIN roles r ON er.role_id = r.id
           WHERE sr.shift_date = $1 
             AND sr.shift_id = $2 
             AND sr.status = 'approved'
             AND r.code = 'cashier'`,
          [shift_date, shift_id]
        );
        const approvedCount = parseInt(countRes.rows[0].count);
        if (approvedCount < cashierLimit) {
          autoApprove = true;
        }
      }
    }

    let initialStatus = 'pending';
    if (hasSlotsConfigured) {
      initialStatus = autoApprove ? 'approved' : 'pending';
    }

    const result = await pool.query(
      `INSERT INTO shift_registrations (employee_id, shift_date, shift_id, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [employee.id, shift_date, shift_id, initialStatus]
    );

    await logAudit(
      req.user.id,
      "register_shift",
      "shift_registrations",
      result.rows[0].id,
      null,
      result.rows[0]
    );

    // Broadcast real-time notification
    try {
      const dateFormatted = new Date(shift_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
      const statusText = initialStatus === "approved" ? "Tự động duyệt" : "Chờ duyệt";
      const notifyPayload = {
        type: "shift_register",
        title: "Đăng ký ca mới!",
        message: `${employee.full_name} đăng ký ca ${targetShift.name} ngày ${dateFormatted} (${statusText})`,
        time: `${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })} - ${new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())}`,
      };
      broadcastNotification(notifyPayload);
    } catch (err) {
      console.error("Failed to broadcast shift registration notification:", err);
    }

    res.status(201).json({ success: true, registration: result.rows[0] });
  } catch (error) {
    console.error("POST /api/staff/shifts/register error:", error);
    res.status(500).json({ error: "Đăng ký ca làm thất bại." });
  }
});

// POST /api/staff/shifts/swap — Request a shift swap with another employee
router.post("/shifts/swap", async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const employee = await getLinkedEmployee(req.user.id);
    if (!employee) {
      res.status(404).json({ error: "Nhân viên chưa liên kết." });
      return;
    }

    const { requester_registration_id, target_employee_id, target_registration_id } = req.body;
    if (!requester_registration_id || !target_employee_id) {
      res.status(400).json({ error: "Thiếu thông tin đổi ca làm việc." });
      return;
    }

    // Check requester registration
    const regCheck = await pool.query(
      "SELECT id, employee_id, status FROM shift_registrations WHERE id = $1",
      [requester_registration_id]
    );
    if (regCheck.rows.length === 0 || regCheck.rows[0].employee_id !== employee.id) {
      res.status(400).json({ error: "Ca làm việc đăng ký của bạn không hợp lệ." });
      return;
    }
    if (regCheck.rows[0].status !== "approved") {
      res.status(400).json({ error: "Chỉ được phép đổi ca làm việc đã được phê duyệt." });
      return;
    }

    // Check target employee
    const targetCheck = await pool.query("SELECT id FROM employees WHERE id = $1 AND status = 'active'", [target_employee_id]);
    if (targetCheck.rows.length === 0) {
      res.status(400).json({ error: "Nhân viên nhận đổi ca không hoạt động hoặc không tồn tại." });
      return;
    }

    // Check target registration if provided
    if (target_registration_id) {
      const tRegCheck = await pool.query(
        "SELECT id, employee_id, status FROM shift_registrations WHERE id = $1",
        [target_registration_id]
      );
      if (tRegCheck.rows.length === 0 || tRegCheck.rows[0].employee_id !== target_employee_id) {
        res.status(400).json({ error: "Ca đổi đối ứng của nhân viên kia không hợp lệ." });
        return;
      }
      if (tRegCheck.rows[0].status !== "approved") {
        res.status(400).json({ error: "Ca đổi đối ứng phải là ca đã được duyệt." });
        return;
      }
    }

    const swapResult = await pool.query(
      `INSERT INTO shift_swaps (requester_id, target_employee_id, requester_registration_id, target_registration_id, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [employee.id, target_employee_id, requester_registration_id, target_registration_id || null]
    );

    await logAudit(
      req.user.id,
      "request_shift_swap",
      "shift_swaps",
      swapResult.rows[0].id,
      null,
      swapResult.rows[0]
    );

    res.status(201).json({ success: true, swapRequest: swapResult.rows[0] });
  } catch (error) {
    console.error("POST /api/staff/shifts/swap error:", error);
    res.status(500).json({ error: "Gửi yêu cầu đổi ca thất bại." });
  }
});

// GET /api/staff/attendance — View personal attendance history
router.get("/attendance", async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const employee = await getLinkedEmployee(req.user.id);
    if (!employee) {
      res.status(404).json({ error: "Nhân viên chưa liên kết." });
      return;
    }

    const result = await pool.query(
      `SELECT al.id, al.employee_id, TO_CHAR(al.shift_date, 'YYYY-MM-DD') AS shift_date, 
              al.shift_id, al.check_in, al.check_out, al.device, al.ip, al.gps_location, 
              al.is_late, al.is_early, al.late_minutes, al.early_minutes, al.break_minutes, 
              al.status, al.verified_by, al.created_at, al.updated_at,
              ws.name as shift_name, ws.start_time, ws.end_time
       FROM attendance_logs al
       LEFT JOIN work_shifts ws ON al.shift_id = ws.id
       WHERE al.employee_id = $1
       ORDER BY al.shift_date DESC, al.check_in DESC`,
      [employee.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/staff/attendance error:", error);
    res.status(500).json({ error: "Lấy lịch sử chấm công thất bại." });
  }
});

// POST /api/staff/attendance/check-in — Check-In
router.post("/attendance/check-in", async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const employee = await getLinkedEmployee(req.user.id);
    if (!employee) {
      res.status(404).json({ error: "Nhân viên chưa liên kết." });
      return;
    }

    const { shift_id, gps_location } = req.body;
    if (!shift_id) {
      res.status(400).json({ error: "Vui lòng chọn ca làm việc để Check-in." });
      return;
    }

    const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const device = req.headers["user-agent"] || "";

    // Verify shift exists and is approved for this employee today
    const regCheck = await pool.query(
      `SELECT sr.id, ws.start_time, ws.end_time, ws.break_minutes
       FROM shift_registrations sr
       JOIN work_shifts ws ON sr.shift_id = ws.id
       WHERE sr.employee_id = $1 AND sr.shift_date = $2 AND sr.shift_id = $3 AND sr.status = 'approved'`,
      [employee.id, todayStr, shift_id]
    );

    if (regCheck.rows.length === 0) {
      res.status(400).json({
        error: "Bạn không có ca làm việc nào được phê duyệt cho ca này trong ngày hôm nay."
      });
      return;
    }

    const shift = regCheck.rows[0];

    // Check if already checked in
    const logCheck = await pool.query(
      "SELECT id FROM attendance_logs WHERE employee_id = $1 AND shift_date = $2 AND shift_id = $3",
      [employee.id, todayStr, shift_id]
    );

    if (logCheck.rows.length > 0) {
      res.status(400).json({ error: "Bạn đã thực hiện Check-in ca này hôm nay rồi." });
      return;
    }

    // Calculate lateness
    const now = new Date();
    const scheduledStart = new Date(`${todayStr}T${shift.start_time}`);
    const diffMs = now.getTime() - scheduledStart.getTime();
    const lateMinutes = diffMs > 0 ? Math.floor(diffMs / 60000) : 0;
    const isLate = lateMinutes > 0;

    const logResult = await pool.query(
      `INSERT INTO attendance_logs (employee_id, shift_date, shift_id, check_in, device, ip, gps_location, is_late, late_minutes, break_minutes, status)
       VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, 'approved')
       RETURNING *`,
      [employee.id, todayStr, shift_id, device, ip.toString(), gps_location || null, isLate, lateMinutes, shift.break_minutes]
    );

    await logAudit(
      req.user.id,
      "check_in",
      "attendance_logs",
      logResult.rows[0].id,
      null,
      logResult.rows[0]
    );

    res.json({
      success: true,
      message: isLate ? `Check-in thành công (Đi trễ ${lateMinutes} phút)` : "Check-in đúng giờ thành công!",
      log: logResult.rows[0]
    });
  } catch (error) {
    console.error("POST /api/staff/attendance/check-in error:", error);
    res.status(500).json({ error: "Check-in thất bại." });
  }
});

// POST /api/staff/attendance/check-out — Check-Out
router.post("/attendance/check-out", async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const employee = await getLinkedEmployee(req.user.id);
    if (!employee) {
      res.status(404).json({ error: "Nhân viên chưa liên kết." });
      return;
    }

    const { shift_id } = req.body;
    if (!shift_id) {
      res.status(400).json({ error: "Vui lòng chọn ca làm việc để Check-out." });
      return;
    }

    const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const device = req.headers["user-agent"] || "";

    // Find shift details
    const shiftRes = await pool.query("SELECT name, end_time FROM work_shifts WHERE id = $1", [shift_id]);
    if (shiftRes.rows.length === 0) {
      res.status(404).json({ error: "Không tìm thấy thông tin ca làm." });
      return;
    }
    const shift = shiftRes.rows[0];

    // Find check-in record for today and this shift
    const logCheck = await pool.query(
      `SELECT * FROM attendance_logs 
       WHERE employee_id = $1 AND shift_date = $2 AND shift_id = $3`,
      [employee.id, todayStr, shift_id]
    );

    const now = new Date();
    const scheduledEnd = new Date(`${todayStr}T${shift.end_time}`);
    const diffMs = scheduledEnd.getTime() - now.getTime();
    const earlyMinutes = diffMs > 0 ? Math.floor(diffMs / 60000) : 0;
    const isEarly = earlyMinutes > 0;

    let finalLog;

    if (logCheck.rows.length === 0) {
      // "Quên Check-In" case: Create log with null check_in and pending_approval status
      console.log("[Attendance] No Check-In log found, creating a forgot-checkin log.");
      
      const insertResult = await pool.query(
        `INSERT INTO attendance_logs (employee_id, shift_date, shift_id, check_in, check_out, device, ip, is_early, early_minutes, status)
         VALUES ($1, $2, $3, NULL, NOW(), $4, $5, $6, $7, 'pending_approval')
         RETURNING *`,
        [employee.id, todayStr, shift_id, device, ip.toString(), isEarly, earlyMinutes]
      );
      finalLog = insertResult.rows[0];

      await logAudit(
        req.user.id,
        "check_out_forgot_checkin",
        "attendance_logs",
        finalLog.id,
        null,
        finalLog
      );

      // Broadcast check-out notification
      try {
        const notifyPayload = {
          type: "check_out",
          title: "Nhân viên Check-out!",
          message: `${employee.full_name} check-out ca ${shift.name} (Thiếu check-in)`,
          time: `${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })} - ${new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())}`,
        };
        broadcastNotification(notifyPayload);
      } catch (err) {
        console.error("Failed to broadcast checkout notification:", err);
      }

      res.json({
        success: true,
        message: "Check-out được ghi nhận. Hệ thống ghi nhận thiếu Check-in và đang chờ quản lý xác nhận công.",
        log: finalLog
      });
    } else {
      const existingLog = logCheck.rows[0];
      if (existingLog.check_out) {
        res.status(400).json({ error: "Bạn đã thực hiện Check-out ca này hôm nay rồi." });
        return;
      }

      // Normal Check-out case
      const updateResult = await pool.query(
        `UPDATE attendance_logs
         SET check_out = NOW(), is_early = $1, early_minutes = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [isEarly, earlyMinutes, existingLog.id]
      );
      finalLog = updateResult.rows[0];

      await logAudit(
        req.user.id,
        "check_out",
        "attendance_logs",
        finalLog.id,
        existingLog,
        finalLog
      );

      // Broadcast check-out notification
      try {
        const typeText = isEarly ? `Về sớm ${earlyMinutes} phút` : "Đúng giờ";
        const notifyPayload = {
          type: "check_out",
          title: "Nhân viên Check-out!",
          message: `${employee.full_name} check-out ca ${shift.name} (${typeText})`,
          time: `${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })} - ${new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())}`,
        };
        broadcastNotification(notifyPayload);
      } catch (err) {
        console.error("Failed to broadcast checkout notification:", err);
      }

      res.json({
        success: true,
        message: isEarly ? `Check-out thành công (Về sớm ${earlyMinutes} phút)` : "Check-out đúng giờ thành công!",
        log: finalLog
      });
    }
  } catch (error) {
    console.error("POST /api/staff/attendance/check-out error:", error);
    res.status(500).json({ error: "Check-out thất bại." });
  }
});

// POST /api/staff/leaves — Request a leave
router.post("/leaves", async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const employee = await getLinkedEmployee(req.user.id);
    if (!employee) {
      res.status(404).json({ error: "Nhân viên chưa liên kết." });
      return;
    }

    const { start_date, end_date, leave_type, reason } = req.body;
    if (!start_date || !end_date || !leave_type) {
      res.status(400).json({ error: "Ngày bắt đầu, ngày kết thúc và loại nghỉ là bắt buộc." });
      return;
    }

    if (!["annual", "sick", "unpaid"].includes(leave_type)) {
      res.status(400).json({ error: "Loại nghỉ không hợp lệ." });
      return;
    }

    const result = await pool.query(
      `INSERT INTO leave_requests (employee_id, start_date, end_date, leave_type, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [employee.id, start_date, end_date, leave_type, reason || ""]
    );

    await logAudit(
      req.user.id,
      "request_leave",
      "leave_requests",
      result.rows[0].id,
      null,
      result.rows[0]
    );

    // Broadcast real-time notification
    try {
      const startFormatted = new Date(start_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
      const endFormatted = new Date(end_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
      const notifyPayload = {
        type: "leave_request",
        title: "Đơn xin nghỉ phép mới!",
        message: `${employee.full_name} xin nghỉ phép từ ${startFormatted} đến ${endFormatted}`,
        time: `${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })} - ${new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())}`,
      };
      broadcastNotification(notifyPayload);
    } catch (err) {
      console.error("Failed to broadcast leave request notification:", err);
    }

    res.status(201).json({ success: true, leaveRequest: result.rows[0] });
  } catch (error) {
    console.error("POST /api/staff/leaves error:", error);
    res.status(500).json({ error: "Gửi đơn nghỉ phép thất bại." });
  }
});

// GET /api/staff/leaves — View own leave requests
router.get("/leaves", async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const employee = await getLinkedEmployee(req.user.id);
    if (!employee) {
      res.status(404).json({ error: "Nhân viên chưa liên kết." });
      return;
    }

    const result = await pool.query(
      `SELECT * FROM leave_requests 
       WHERE employee_id = $1 
       ORDER BY start_date DESC`,
      [employee.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/staff/leaves error:", error);
    res.status(500).json({ error: "Lấy danh sách đơn nghỉ phép thất bại." });
  }
});

// DELETE /api/staff/leaves/:id — Cancel a pending leave request
router.delete("/leaves/:id", async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const employee = await getLinkedEmployee(req.user.id);
    if (!employee) {
      res.status(404).json({ error: "Nhân viên chưa liên kết." });
      return;
    }

    const { id } = req.params;

    // Check if the leave request exists, belongs to employee, and is pending
    const check = await pool.query(
      `SELECT * FROM leave_requests WHERE id = $1 AND employee_id = $2`,
      [id, employee.id]
    );

    if (check.rows.length === 0) {
      res.status(404).json({ error: "Không tìm thấy đơn xin nghỉ phép." });
      return;
    }

    const leaveReq = check.rows[0];
    if (leaveReq.status !== "pending") {
      res.status(400).json({ error: "Chỉ có thể hủy đơn xin nghỉ phép đang chờ duyệt." });
      return;
    }

    // Delete it
    await pool.query("DELETE FROM leave_requests WHERE id = $1", [id]);

    await logAudit(
      req.user.id,
      "cancel_leave",
      "leave_requests",
      parseInt(id),
      leaveReq,
      null
    );

    res.json({ success: true, message: "Hủy đơn xin nghỉ phép thành công." });
  } catch (error) {
    console.error("DELETE /api/staff/leaves/:id error:", error);
    res.status(500).json({ error: "Hủy đơn xin nghỉ phép thất bại." });
  }
});

// GET /api/staff/salary — View own salary payslips
router.get("/salary", async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const employee = await getLinkedEmployee(req.user.id);
    if (!employee) {
      res.status(404).json({ error: "Nhân viên chưa liên kết." });
      return;
    }

    // Only fetch salary records that are approved or paid
    const result = await pool.query(
      `SELECT sr.*, 
              (SELECT COALESCE(JSON_AGG(sa), '[]'::json) FROM salary_allowances sa WHERE sa.salary_record_id = sr.id) as allowances,
              (SELECT COALESCE(JSON_AGG(sd), '[]'::json) FROM salary_deductions sd WHERE sd.salary_record_id = sr.id) as deductions
       FROM salary_records sr
       WHERE sr.employee_id = $1 AND sr.status IN ('approved', 'paid')
       ORDER BY sr.pay_month DESC`,
      [employee.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/staff/salary error:", error);
    res.status(500).json({ error: "Lấy phiếu lương thất bại." });
  }
});

// GET /api/staff/coworkers — Get coworker list for shift swap
router.get("/coworkers", async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const employee = await getLinkedEmployee(req.user.id);
    if (!employee) {
      res.status(404).json({ error: "Nhân viên chưa liên kết." });
      return;
    }

    const result = await pool.query(
      `SELECT id, employee_code, full_name, avatar_url 
       FROM employees 
       WHERE status = 'active' AND id <> $1
       ORDER BY full_name ASC`,
      [employee.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/staff/coworkers error:", error);
    res.status(500).json({ error: "Lấy danh sách đồng nghiệp thất bại." });
  }
});

export default router;

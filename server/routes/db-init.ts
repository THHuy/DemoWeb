import { Router } from "express";
import pool from "../db";
import { readFileSync } from "fs";
import { resolve } from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticate, requireRole, JWT_SECRET } from "../middleware/auth";



const router = Router();

// POST /api/db-init — initialize database schema + seed
router.post("/", async (_req, res) => {
  try {
    // Check if database is already initialized with users
    let needsAuth = false;
    try {
      const tableCheck = await pool.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
      );
      if (tableCheck.rows[0].exists) {
        const countRes = await pool.query("SELECT COUNT(*) FROM users");
        if (parseInt(countRes.rows[0].count) > 0) {
          needsAuth = true;
        }
      }
    } catch (err) {
      // Table doesn't exist yet
    }

    if (needsAuth) {
      const token = _req.cookies?.access_token;
      if (!token) {
        res.status(401).json({ error: "Xác thực yêu cầu để khởi tạo lại database." });
        return;
      }
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded.role !== "admin") {
          res.status(403).json({ error: "Chỉ admin mới được quyền khởi tạo lại database." });
          return;
        }
      } catch (err) {
        res.status(401).json({ error: "Phiên làm việc hết hạn hoặc token không hợp lệ." });
        return;
      }
    }

    const schemaPath = resolve(__dirname, "..", "..", "lib", "db-schema.sql");
    const schemaSql = readFileSync(schemaPath, "utf-8");

    // Drop all existing tables to allow clean re-initialization and seeding
    await pool.query(`
      DROP TABLE IF EXISTS pos_order_items CASCADE;
      DROP TABLE IF EXISTS pos_audit_logs CASCADE;
      DROP TABLE IF EXISTS pos_orders CASCADE;
      DROP TABLE IF EXISTS inventory_stock CASCADE;
      DROP TABLE IF EXISTS shift_swaps CASCADE;
      DROP TABLE IF EXISTS attendance_logs CASCADE;
      DROP TABLE IF EXISTS shift_registrations CASCADE;
      DROP TABLE IF EXISTS leave_requests CASCADE;
      DROP TABLE IF EXISTS salary_allowances CASCADE;
      DROP TABLE IF EXISTS salary_deductions CASCADE;
      DROP TABLE IF EXISTS salary_records CASCADE;
      DROP TABLE IF EXISTS salary_configs CASCADE;
      DROP TABLE IF EXISTS employee_roles CASCADE;
      DROP TABLE IF EXISTS employees CASCADE;
      DROP TABLE IF EXISTS roles CASCADE;
      DROP TABLE IF EXISTS hr_settings CASCADE;
      DROP TABLE IF EXISTS work_shifts CASCADE;
      DROP TABLE IF EXISTS reservations CASCADE;
      DROP TABLE IF EXISTS restaurant_tables CASCADE;
      DROP TABLE IF EXISTS reviews CASCADE;
      DROP TABLE IF EXISTS posts CASCADE;
      DROP TABLE IF EXISTS menu_items CASCADE;
      DROP TABLE IF EXISTS device_settings CASCADE;
      DROP TABLE IF EXISTS payment_settings CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    await pool.query(schemaSql);

    // Seed data
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Seed menu items
      const menuCheck = await client.query("SELECT COUNT(*) FROM menu_items");
      if (parseInt(menuCheck.rows[0].count) === 0) {
        const menuItems = [
          { name: "L'Ambiance Egg Coffee", category: "coffee", price: "69.000đ", description: "Cà phê trứng béo ngậy truyền thống kết hợp hạt Arabica cao cấp Cầu Đất rang xay mộc.", image_url: "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?q=80&w=600&auto=format&fit=crop", sort_order: 1 },
          { name: "Cold Brew Tonic Orange", category: "coffee", price: "75.000đ", description: "Cà phê ủ lạnh 16 tiếng mát lành kết hợp nước cam tươi và tonic sảng khoái.", image_url: "https://images.unsplash.com/photo-1513530534585-c7b1394c6d51?q=80&w=600&auto=format&fit=crop", sort_order: 2 },
          { name: "Coconut Latte", category: "coffee", price: "65.000đ", description: "Espresso đậm vị hòa cùng sữa cốt dừa béo ngậy xay mịn cùng đá bào mát lạnh.", image_url: "https://images.unsplash.com/photo-1570968915860-54d5c301fc9f?q=80&w=600&auto=format&fit=crop", sort_order: 3 },
          { name: "Trà Đào Cam Sả", category: "tea", price: "59.000đ", description: "Trà đen đậm đà kết hợp đào ngâm giòn ngọt, cam tươi ngọt thanh và hương sả nồng nàn.", image_url: "https://images.unsplash.com/photo-1497534446932-c925b458314e?q=80&w=600&auto=format&fit=crop", sort_order: 4 },
          { name: "Trà Lài Vải Nha Đam", category: "tea", price: "62.000đ", description: "Hương hoa lài thanh tao hòa quyện vải thiều mọng nước và nha đam giòn sần sật.", image_url: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=600&auto=format&fit=crop", sort_order: 5 },
          { name: "Tiramisu Classic", category: "pastry", price: "55.000đ", description: "Bánh bông lan mềm xốp thấm đẫm espresso, rượu rum nhẹ và lớp kem Mascarpone béo ngậy.", image_url: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?q=80&w=600&auto=format&fit=crop", sort_order: 6 },
          { name: "Croissant Bơ Pháp", category: "pastry", price: "45.000đ", description: "Bánh sừng bò ngập vị bơ thơm lừng, nhiều lớp xếp tầng vỏ giòn xốp rụm chuẩn vị Pháp.", image_url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=600&auto=format&fit=crop", sort_order: 7 },
          { name: "English Breakfast", category: "dish", price: "110.000đ", description: "Bữa sáng dinh dưỡng trọn vẹn với xúc xích nướng, trứng ốp la, thịt xông khói, đậu sốt và bánh mì.", image_url: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?q=80&w=600&auto=format&fit=crop", sort_order: 8 },
          { name: "Mỳ Ý Sốt Bò Băm", category: "dish", price: "95.000đ", description: "Mỳ Ý sợi dai mềm hoàn hảo phủ sốt bò băm đậm vị, phô mai Parmesan rắc bên trên.", image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=600&auto=format&fit=crop", sort_order: 9 },
        ];
        for (const item of menuItems) {
          await client.query(
            `INSERT INTO menu_items (name, category, price, description, image_url, sort_order) VALUES ($1, $2, $3, $4, $5, $6)`,
            [item.name, item.category, item.price, item.description, item.image_url, item.sort_order]
          );
        }
      }

      // Seed reviews
      const reviewCheck = await client.query("SELECT COUNT(*) FROM reviews");
      if (parseInt(reviewCheck.rows[0].count) === 0) {
        const reviews = [
          { name: "Minh Anh Nguyễn", role: "Khách hàng thân thiết", avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop", rating: 5, comment: "Không gian vô cùng xanh mát và thư giãn đúng kiểu resort. Trà Đào Cam Sả ngọt thanh mát lạnh cực kỳ giải nhiệt." },
          { name: "Thanh Thảo Phạm", role: "Local Guide", avatar_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop", rating: 5, comment: "Rất nhiều góc chụp hình đẹp xuất sắc, ánh sáng tự nhiên lên hình rất trong. Cà phê trứng béo ngậy chuẩn vị." },
          { name: "Hoàng Nam Trần", role: "Freelance Designer", avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop", rating: 5, comment: "Wifi tốc độ cao cực kỳ ổn định, nhiều ổ cắm tiện lợi. Cà phê nguyên chất đắng dịu, thơm nồng." },
          { name: "Khánh Linh Vũ", role: "Food Blogger", avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop", rating: 5, comment: "Kiến trúc resort sân vườn mộc mạc cực kỳ ấn tượng. Bánh sừng bò bơ Pháp nóng giòn rụm, ngon khó cưỡng." },
        ];
        for (const r of reviews) {
          await client.query(
            `INSERT INTO reviews (name, role, avatar_url, rating, comment) VALUES ($1, $2, $3, $4, $5)`,
            [r.name, r.role, r.avatar_url, r.rating, r.comment]
          );
        }
      }

      // Seed sample post
      const postCheck = await client.query("SELECT COUNT(*) FROM posts");
      if (parseInt(postCheck.rows[0].count) === 0) {
        await client.query(
          `INSERT INTO posts (title, slug, content, excerpt, cover_image, is_published) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            "Chào mừng đến với L'Ambiance Café",
            "chao-mung-den-voi-lambiance-cafe",
            "L'Ambiance Café & Bistro tự hào là điểm đến lý tưởng cho những ai yêu thích không gian xanh mát, cà phê chất lượng và ẩm thực tinh tế giữa lòng Thảo Điền, Quận 2.",
            "Khám phá không gian cà phê resort sân vườn thư giãn tại Thảo Điền",
            "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1200&auto=format&fit=crop",
            true,
          ]
        );
      }

      // Seed users
      const userCheck = await client.query("SELECT COUNT(*) FROM users");
      if (parseInt(userCheck.rows[0].count) === 0) {
        const adminHash = await bcrypt.hash("admin123", 10);
        const staffHash = await bcrypt.hash("staff123", 10);
        await client.query(
          `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3), ($4, $5, $6)`,
          ["admin", adminHash, "admin", "staff", staffHash, "staff"]
        );
      }

      // Seed tables
      const tableCheck = await client.query("SELECT COUNT(*) FROM restaurant_tables");
      if (parseInt(tableCheck.rows[0].count) === 0) {
        const tables = [
          { number: "T1", capacity: 2 },
          { number: "T2", capacity: 2 },
          { number: "T3", capacity: 2 },
          { number: "T4", capacity: 2 },
          { number: "T5", capacity: 4 },
          { number: "T6", capacity: 4 },
          { number: "T7", capacity: 4 },
          { number: "T8", capacity: 4 },
          { number: "T9", capacity: 6 },
          { number: "T10", capacity: 6 },
          { number: "T11", capacity: 8 },
          { number: "T12", capacity: 10 },
        ];
        for (const t of tables) {
          await client.query(
            `INSERT INTO restaurant_tables (table_number, capacity) VALUES ($1, $2)`,
            [t.number, t.capacity]
          );
        }
      }

      // Seed reservations
      const reservationCheck = await client.query("SELECT COUNT(*) FROM reservations");
      if (parseInt(reservationCheck.rows[0].count) === 0) {
        const dbTables = await client.query("SELECT id, table_number FROM restaurant_tables");
        const tableMap = new Map<string, number>();
        dbTables.rows.forEach((row: any) => {
          tableMap.set(row.table_number, row.id);
        });

        const reservations = [
          { name: "Nguyễn Văn A", phone: "0901234567", booking_date: "2026-06-25", booking_time: "18:30:00", guests: 2, notes: "Bàn gần cửa sổ, kỷ niệm ngày cưới", status: "confirmed", table_number: "T1" },
          { name: "Trần Thị B", phone: "0912345678", booking_date: "2026-06-25", booking_time: "19:00:00", guests: 4, notes: "Cần ghế trẻ em", status: "pending", table_number: "T5" },
          { name: "Lê Văn C", phone: "0923456789", booking_date: "2026-06-26", booking_time: "20:00:00", guests: 6, notes: "Họp mặt gia đình", status: "pending", table_number: "T9" },
        ];
        for (const r of reservations) {
          const tId = tableMap.get(r.table_number);
          await client.query(
            `INSERT INTO reservations (name, phone, booking_date, booking_time, guests, notes, status, table_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [r.name, r.phone, r.booking_date, r.booking_time, r.guests, r.notes, r.status, tId || null]
          );
        }
      }

      // Seed HR Roles
      const roleCheck = await client.query("SELECT COUNT(*) FROM roles");
      if (parseInt(roleCheck.rows[0].count) === 0) {
        const roles = [
          { code: "owner", name: "Chủ quán" },
          { code: "manager", name: "Quản lý" },
          { code: "barista", name: "Pha chế" },
          { code: "cashier", name: "Thu ngân" }
        ];
        for (const role of roles) {
          await client.query(
            "INSERT INTO roles (code, name) VALUES ($1, $2)",
            [role.code, role.name]
          );
        }
      }

      // Seed HR Default Shifts
      const shiftCheck = await client.query("SELECT COUNT(*) FROM work_shifts");
      if (parseInt(shiftCheck.rows[0].count) === 0) {
        const shifts = [
          { name: "Ca sáng", code: "sang", start_time: "06:00:00", end_time: "12:00:00", break_minutes: 0, day_value: 0.5, is_default: true, barista_slots: 2, cashier_slots: 1 },
          { name: "Ca chiều", code: "chieu", start_time: "12:00:00", end_time: "18:00:00", break_minutes: 0, day_value: 0.5, is_default: true, barista_slots: 2, cashier_slots: 1 },
          { name: "Ca tối", code: "toi", start_time: "18:00:00", end_time: "22:00:00", break_minutes: 0, day_value: 0.5, is_default: true, barista_slots: 3, cashier_slots: 2 },
          { name: "Ca full", code: "full", start_time: "06:00:00", end_time: "18:00:00", break_minutes: 60, day_value: 1.0, is_default: true, barista_slots: 0, cashier_slots: 0 }
        ];
        for (const shift of shifts) {
          await client.query(
            "INSERT INTO work_shifts (name, code, start_time, end_time, break_minutes, day_value, is_default, barista_slots, cashier_slots) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
            [shift.name, shift.code, shift.start_time, shift.end_time, shift.break_minutes, shift.day_value, shift.is_default, shift.barista_slots, shift.cashier_slots]
          );
        }
      }

      // Seed HR Settings
      const settingsCheck = await client.query("SELECT COUNT(*) FROM hr_settings");
      if (parseInt(settingsCheck.rows[0].count) === 0) {
        const settings = [
          { key: "late_penalty_type", value: "warn", description: "Cấu hình phạt đi trễ: warn (cảnh báo), minute (trừ theo phút)" },
          { key: "early_penalty_type", value: "minute", description: "Cấu hình phạt về sớm: minute (trừ theo phút), no_shift (không tính ca)" }
        ];
        for (const setting of settings) {
          await client.query(
            "INSERT INTO hr_settings (key, value, description) VALUES ($1, $2, $3)",
            [setting.key, setting.value, setting.description]
          );
        }
      }

      // Seed Employees if not exist
      const employeeCheck = await client.query("SELECT COUNT(*) FROM employees");
      if (parseInt(employeeCheck.rows[0].count) === 0) {
        // Find seeded users
        const usersRes = await client.query("SELECT id, username FROM users");
        const adminUser = usersRes.rows.find((u: any) => u.username === "admin");
        const staffUser = usersRes.rows.find((u: any) => u.username === "staff");

        let emp1: any = null;
        let emp2: any = null;

        if (adminUser) {
          // Create Owner Employee
          emp1 = await client.query(
            `INSERT INTO employees (employee_code, full_name, phone, email, status, user_id)
             VALUES ('EMP001', 'Chủ Quán L''Ambiance', '0988888888', 'owner@lambiance.com', 'active', $1)
             RETURNING id`,
            [adminUser.id]
          );
          // Assign Owner role
          const roleOwnerRes = await client.query("SELECT id FROM roles WHERE code = 'owner'");
          if (roleOwnerRes.rows.length > 0) {
            await client.query(
              "INSERT INTO employee_roles (employee_id, role_id) VALUES ($1, $2)",
              [emp1.rows[0].id, roleOwnerRes.rows[0].id]
            );
          }
          // Configure monthly salary (15M)
          await client.query(
            `INSERT INTO salary_configs (employee_id, salary_type, base_rate, standard_working_days, meal_allowance, parking_allowance)
             VALUES ($1, 'monthly', 15000000.00, 26, 500000.00, 200000.00)`,
            [emp1.rows[0].id]
          );
        }

        if (staffUser) {
          // Create Staff Employee (Barista + Cashier)
          emp2 = await client.query(
            `INSERT INTO employees (employee_code, full_name, phone, email, status, user_id)
             VALUES ('EMP002', 'Nguyễn Pha Chế', '0977777777', 'staff@lambiance.com', 'active', $1)
             RETURNING id`,
            [staffUser.id]
          );
          // Assign Barista and Cashier roles
          const baristaRole = await client.query("SELECT id FROM roles WHERE code = 'barista'");
          const cashierRole = await client.query("SELECT id FROM roles WHERE code = 'cashier'");
          if (baristaRole.rows.length > 0) {
            await client.query(
              "INSERT INTO employee_roles (employee_id, role_id) VALUES ($1, $2)",
              [emp2.rows[0].id, baristaRole.rows[0].id]
            );
          }
          if (cashierRole.rows.length > 0) {
            await client.query(
              "INSERT INTO employee_roles (employee_id, role_id) VALUES ($1, $2)",
              [emp2.rows[0].id, cashierRole.rows[0].id]
            );
          }
          // Configure hourly salary (30k/h)
          await client.query(
            `INSERT INTO salary_configs (employee_id, salary_type, base_rate, parking_allowance)
             VALUES ($1, 'hourly', 30000.00, 200000.00)`,
            [emp2.rows[0].id]
          );

          // Seed Sample Shift Registrations & Leave Requests (Current Month)
          const shiftsRes = await client.query("SELECT id, code FROM work_shifts");
          const shiftMap = new Map<string, number>();
          shiftsRes.rows.forEach((r: any) => shiftMap.set(r.code, r.id));

          const shiftSangId = shiftMap.get("sang");
          const shiftChieuId = shiftMap.get("chieu");
          const shiftToiId = shiftMap.get("toi");
          const shiftFullId = shiftMap.get("full");

          const today = new Date();
          const year = today.getFullYear();
          const month = today.getMonth();

          const formatDateLocal = (d: Date) => {
            return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
          };

          // Seed shifts for the last 5 days and the next 10 days
          for (let i = -5; i <= 10; i++) {
            const d = new Date(year, month, today.getDate() + i);
            const dateStr = formatDateLocal(d);

            // Staff (Nguyễn Pha Chế) registers for some shifts
            if (i % 3 === 0 && shiftSangId) {
              await client.query(
                `INSERT INTO shift_registrations (employee_id, shift_date, shift_id, status)
                 VALUES ($1, $2, $3, 'approved')`,
                [emp2.rows[0].id, dateStr, shiftSangId]
              );
            } else if (i % 3 === 1 && shiftToiId) {
              await client.query(
                `INSERT INTO shift_registrations (employee_id, shift_date, shift_id, status)
                 VALUES ($1, $2, $3, 'approved')`,
                [emp2.rows[0].id, dateStr, shiftToiId]
              );
            }

            // Admin/Manager registers for Ca Full on some days
            if (i % 4 === 0 && shiftFullId && emp1.rows[0]) {
              await client.query(
                `INSERT INTO shift_registrations (employee_id, shift_date, shift_id, status)
                 VALUES ($1, $2, $3, 'approved')`,
                [emp1.rows[0].id, dateStr, shiftFullId]
              );
            }
          }

          // Seed a pending leave request for staff next week
          const leaveDateStart = new Date();
          leaveDateStart.setDate(leaveDateStart.getDate() + 7);
          const leaveDateEnd = new Date();
          leaveDateEnd.setDate(leaveDateEnd.getDate() + 8);

          await client.query(
            `INSERT INTO leave_requests (employee_id, start_date, end_date, leave_type, reason, status)
             VALUES ($1, $2, $3, 'sick', 'Khám sức khỏe định kỳ', 'pending')`,
            [emp2.rows[0].id, formatDateLocal(leaveDateStart), formatDateLocal(leaveDateEnd)]
          );

          // Seed an approved leave request for staff last week
          const prevLeaveStart = new Date();
          prevLeaveStart.setDate(prevLeaveStart.getDate() - 10);
          const prevLeaveEnd = new Date();
          prevLeaveEnd.setDate(prevLeaveEnd.getDate() - 9);

          await client.query(
            `INSERT INTO leave_requests (employee_id, start_date, end_date, leave_type, reason, status)
             VALUES ($1, $2, $3, 'annual', 'Nghỉ gia đình', 'approved')`,
            [emp2.rows[0].id, formatDateLocal(prevLeaveStart), formatDateLocal(prevLeaveEnd)]
          );
        }
      }

      // Seed inventory stock for all menu items
      const menuItemsForStock = await client.query("SELECT id FROM menu_items");
      for (const row of menuItemsForStock.rows) {
        // Seed some quantities, making some items out of stock (qty = 0) for testing
        const qty = row.id % 4 === 0 ? 0 : 35;
        await client.query(
          `INSERT INTO inventory_stock (menu_item_id, stock_quantity, min_threshold)
           VALUES ($1, $2, 5)
           ON CONFLICT (menu_item_id) DO NOTHING`,
          [row.id, qty]
        );
      }

      await client.query("COMMIT");
      res.json({ success: true, message: "Database initialized and seeded successfully" });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("DB init error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

export default router;

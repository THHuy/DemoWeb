import { Router, Response } from "express";
import pool from "../db";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

interface SSEClient {
  res: Response;
  userId: number;
  role: string;
  isHRAdmin: boolean;
  employeeId?: number;
}

// Store connected SSE clients
let sseClients: SSEClient[] = [];

// GET /api/reservations/sse — Server-Sent Events endpoint for real-time notifications (Staff + Admin)
router.get("/sse", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    let isHRAdmin = false;
    if (req.user?.role === "admin") {
      isHRAdmin = true;
    } else if (req.user) {
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
        isHRAdmin = true;
      }
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders(); // Establish connection

    // Send a ping/heartbeat every 30 seconds to keep connection alive
    const keepAliveId = setInterval(() => {
      res.write(":\n\n");
    }, 30000);

    // Get employee ID if exists
    let employeeId: number | undefined = undefined;
    if (req.user) {
      const empRes = await pool.query(
        "SELECT id FROM employees WHERE user_id = $1",
        [req.user.id]
      );
      if (empRes.rows.length > 0) {
        employeeId = empRes.rows[0].id;
      }
    }

    const clientObj: SSEClient = {
      res,
      userId: req.user!.id,
      role: req.user!.role,
      isHRAdmin,
      employeeId
    };

    sseClients.push(clientObj);

    req.on("close", () => {
      clearInterval(keepAliveId);
      sseClients = sseClients.filter((client) => client !== clientObj);
    });
  } catch (err) {
    console.error("SSE connection error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/reservations — create booking (Public for customers)
router.post("/", async (req, res) => {
  try {
    const { name, phone, booking_date, booking_time, guests, notes } = req.body;

    if (!name || !phone || !booking_date || !booking_time || !guests) {
      res.status(400).json({ error: "Name, phone, booking date, time, and guests are required" });
      return;
    }

    const guestsNum = parseInt(guests);
    if (isNaN(guestsNum) || guestsNum <= 0) {
      res.status(400).json({ error: "Guests must be a valid number greater than 0" });
      return;
    }

    const result = await pool.query(
      `INSERT INTO reservations (name, phone, booking_date, booking_time, guests, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [name, phone, booking_date, booking_time, guestsNum, notes || ""]
    );

    const newReservation = result.rows[0];

    // Broadcast new reservation to all connected admin/staff clients via SSE
    sseClients.forEach((client) => {
      try {
        if (client.isHRAdmin) {
          client.res.write(`data: ${JSON.stringify(newReservation)}\n\n`);
        }
      } catch (err) {
        console.error("SSE broadcast error:", err);
      }
    });

    res.status(201).json({ success: true, reservation: newReservation });
  } catch (error) {
    console.error("POST /api/reservations error:", error);
    res.status(500).json({ error: "Failed to create reservation" });
  }
});

// GET /api/reservations — list bookings with table details (Staff + Admin)
router.get("/", authenticate, requireRole(["admin", "staff"]), async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, t.table_number, t.capacity AS table_capacity
       FROM reservations r
       LEFT JOIN restaurant_tables t ON r.table_id = t.id
       ORDER BY r.booking_date DESC, r.booking_time DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/reservations error:", error);
    res.status(500).json({ error: "Failed to fetch reservations" });
  }
});

// GET /api/reservations/tables — list all tables (Staff + Admin)
router.get("/tables", authenticate, requireRole(["admin", "staff"]), async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM restaurant_tables ORDER BY length(table_number), table_number"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/reservations/tables error:", error);
    res.status(500).json({ error: "Failed to fetch tables" });
  }
});

// GET /api/reservations/tables/status — list tables with reservation status for a given date (Staff + Admin)
router.get("/tables/status", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      res.status(400).json({ error: "Date parameter is required (YYYY-MM-DD)" });
      return;
    }

    const query = `
      SELECT t.id, t.table_number, t.capacity,
             r.id AS reservation_id, r.name AS guest_name, r.phone AS guest_phone, 
             r.booking_time, r.guests, r.status AS reservation_status
      FROM restaurant_tables t
      LEFT JOIN reservations r ON t.id = r.table_id 
           AND r.booking_date = $1 
           AND r.status = 'confirmed'
      ORDER BY length(t.table_number), t.table_number
    `;
    const result = await pool.query(query, [date]);
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/reservations/tables/status error:", error);
    res.status(500).json({ error: "Failed to fetch tables status" });
  }
});

// PUT /api/reservations/:id/assign-table — assign a table to a reservation (Staff + Admin)
router.put("/:id/assign-table", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { table_id } = req.body; // table_id can be number or null

    // 1. Get reservation details
    const resResult = await pool.query("SELECT * FROM reservations WHERE id = $1", [id]);
    if (resResult.rows.length === 0) {
      res.status(404).json({ error: "Reservation not found" });
      return;
    }
    const reservation = resResult.rows[0];

    // If table_id is null/undefined, unassign
    if (table_id === null || table_id === undefined) {
      const updateResult = await pool.query(
        "UPDATE reservations SET table_id = NULL, updated_at = NOW() WHERE id = $1 RETURNING *",
        [id]
      );
      res.json({ success: true, reservation: updateResult.rows[0] });
      return;
    }

    // 2. Get table details
    const tableResult = await pool.query("SELECT * FROM restaurant_tables WHERE id = $1", [table_id]);
    if (tableResult.rows.length === 0) {
      res.status(404).json({ error: "Table not found" });
      return;
    }
    const table = tableResult.rows[0];

    // 3. Verify capacity
    if (table.capacity < reservation.guests) {
      res.status(400).json({
        error: `Bàn ${table.table_number} có sức chứa tối đa ${table.capacity} người, nhỏ hơn số lượng khách đặt (${reservation.guests} người).`
      });
      return;
    }

    // 4. Verify availability (must not conflict with other confirmed reservations on same date)
    const conflictResult = await pool.query(
      `SELECT * FROM reservations 
       WHERE table_id = $1 
         AND booking_date = $2 
         AND status = 'confirmed' 
         AND id <> $3`,
      [table_id, reservation.booking_date, id]
    );

    if (conflictResult.rows.length > 0) {
      const conflict = conflictResult.rows[0];
      res.status(400).json({
        error: `Bàn ${table.table_number} đã được gán cho khách ${conflict.name} lúc ${conflict.booking_time.substring(0, 5)} trong ngày này.`
      });
      return;
    }

    // 5. Update
    await pool.query(
      `UPDATE reservations 
       SET table_id = $1, updated_at = NOW() 
       WHERE id = $2`,
      [table_id, id]
    );

    // Get fully joined details to return
    const finalResult = await pool.query(
      `SELECT r.*, t.table_number, t.capacity AS table_capacity 
       FROM reservations r 
       LEFT JOIN restaurant_tables t ON r.table_id = t.id 
       WHERE r.id = $1`,
      [id]
    );

    res.json({ success: true, reservation: finalResult.rows[0] });
  } catch (error) {
    console.error("PUT /api/reservations/:id/assign-table error:", error);
    res.status(500).json({ error: "Failed to assign table" });
  }
});


// PUT /api/reservations/:id — update status (Staff + Admin)
router.put("/:id", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["pending", "confirmed", "cancelled"].includes(status)) {
      res.status(400).json({ error: "Invalid status value" });
      return;
    }

    const result = await pool.query(
      `UPDATE reservations
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Reservation not found" });
      return;
    }

    res.json({ success: true, reservation: result.rows[0] });
  } catch (error) {
    console.error("PUT /api/reservations/:id error:", error);
    res.status(500).json({ error: "Failed to update reservation" });
  }
});

// DELETE /api/reservations/:id — delete booking (Admin only)
router.delete("/:id", authenticate, requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM reservations WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Reservation not found" });
      return;
    }

    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error("DELETE /api/reservations/:id error:", error);
    res.status(500).json({ error: "Failed to delete reservation" });
  }
});

export function broadcastNotification(payload: any) {
  sseClients.forEach((client) => {
    try {
      if (payload.targetEmployeeId !== undefined) {
        if (client.employeeId === payload.targetEmployeeId) {
          client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
        }
      } else {
        if (client.isHRAdmin) {
          client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
        }
      }
    } catch (err) {
      console.error("SSE broadcast error:", err);
    }
  });
}

export default router;

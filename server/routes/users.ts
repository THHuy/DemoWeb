import { Router } from "express";
import bcrypt from "bcryptjs";
import pool from "../db";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

// Protect all routes in this router - Admin only
router.use(authenticate, requireRole(["admin"]));

// GET /api/users — list users
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, role, created_at FROM users ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// POST /api/users — create user
router.post("/", async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
       res.status(400).json({ error: "Username, password, and role are required" });
       return;
    }

    if (!["admin", "staff"].includes(role)) {
       res.status(400).json({ error: "Invalid role value" });
       return;
    }

    // Check if user already exists
    const checkUser = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (checkUser.rows.length > 0) {
       res.status(400).json({ error: "Username is already taken" });
       return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, username, role, created_at`,
      [username, hashedPassword, role]
    );

    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error("POST /api/users error:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// PUT /api/users/:id — update user role/password
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { password, role } = req.body;

    if (role && !["admin", "staff"].includes(role)) {
       res.status(400).json({ error: "Invalid role value" });
       return;
    }

    // Prevent changing own role to prevent lockout
    if (req.user?.id === parseInt(id) && role && role !== req.user.role) {
       res.status(400).json({ error: "You cannot change your own role to avoid administrative lockout" });
       return;
    }

    let query = "UPDATE users SET updated_at = NOW()";
    const params: any[] = [];
    let paramIndex = 1;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += `, password_hash = $${paramIndex}`;
      params.push(hashedPassword);
      paramIndex++;
    }

    if (role) {
      query += `, role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    query += ` WHERE id = $${paramIndex} RETURNING id, username, role, created_at`;
    params.push(id);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
       res.status(404).json({ error: "User not found" });
       return;
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error("PUT /api/users/:id error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// DELETE /api/users/:id — delete user
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.user?.id === parseInt(id)) {
       res.status(400).json({ error: "You cannot delete your own account" });
       return;
    }

    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING id, username, role",
      [id]
    );

    if (result.rows.length === 0) {
       res.status(404).json({ error: "User not found" });
       return;
    }

    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error("DELETE /api/users/:id error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;

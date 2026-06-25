import { Router } from "express";
import pool from "../db";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

// GET /api/reviews — list reviews
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM reviews ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/reviews error:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// POST /api/reviews — create review
router.post("/", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const { name, role, avatar_url, rating, comment } = req.body;

    if (!name || !rating || !comment) {
      res.status(400).json({ error: "Name, rating, and comment are required" });
      return;
    }

    const result = await pool.query(
      `INSERT INTO reviews (name, role, avatar_url, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, role || "", avatar_url || "", rating, comment]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("POST /api/reviews error:", error);
    res.status(500).json({ error: "Failed to create review" });
  }
});

// PUT /api/reviews/:id — update review
router.put("/:id", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, avatar_url, rating, comment, is_visible } = req.body;

    const result = await pool.query(
      `UPDATE reviews
       SET name = COALESCE($1, name),
           role = COALESCE($2, role),
           avatar_url = COALESCE($3, avatar_url),
           rating = COALESCE($4, rating),
           comment = COALESCE($5, comment),
           is_visible = COALESCE($6, is_visible)
       WHERE id = $7
       RETURNING *`,
      [name, role, avatar_url, rating, comment, is_visible, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("PUT /api/reviews/:id error:", error);
    res.status(500).json({ error: "Failed to update review" });
  }
});

// DELETE /api/reviews/:id — delete review
router.delete("/:id", authenticate, requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM reviews WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error("DELETE /api/reviews/:id error:", error);
    res.status(500).json({ error: "Failed to delete review" });
  }
});

export default router;

import { Router } from "express";
import pool from "../db";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

// GET /api/posts — list posts
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM posts ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/posts error:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// GET /api/posts/:id — get single post
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM posts WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("GET /api/posts/:id error:", error);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

// POST /api/posts — create post
router.post("/", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const { title, slug, content, excerpt, cover_image, is_published } = req.body;

    if (!title || !slug) {
      res.status(400).json({ error: "Title and slug are required" });
      return;
    }

    const result = await pool.query(
      `INSERT INTO posts (title, slug, content, excerpt, cover_image, is_published)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, slug, content || "", excerpt || "", cover_image || "", is_published ?? false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("POST /api/posts error:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// PUT /api/posts/:id — update post
router.put("/:id", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, slug, content, excerpt, cover_image, is_published } = req.body;

    const result = await pool.query(
      `UPDATE posts
       SET title = COALESCE($1, title),
           slug = COALESCE($2, slug),
           content = COALESCE($3, content),
           excerpt = COALESCE($4, excerpt),
           cover_image = COALESCE($5, cover_image),
           is_published = COALESCE($6, is_published),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [title, slug, content, excerpt, cover_image, is_published, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("PUT /api/posts/:id error:", error);
    res.status(500).json({ error: "Failed to update post" });
  }
});

// DELETE /api/posts/:id — delete post
router.delete("/:id", authenticate, requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM posts WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error("DELETE /api/posts/:id error:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

export default router;

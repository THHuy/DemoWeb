import { Router } from "express";
import pool from "../db";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

// GET /api/menu — list menu items
router.get("/", async (req, res) => {
  try {
    const category = req.query.category as string | undefined;

    let query = "SELECT * FROM menu_items";
    const params: string[] = [];

    if (category && category !== "all") {
      query += " WHERE category = $1";
      params.push(category);
    }

    query += " ORDER BY sort_order ASC, created_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/menu error:", error);
    res.status(500).json({ error: "Failed to fetch menu items" });
  }
});

// POST /api/menu — create menu item
router.post("/", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const { name, category, price, description, image_url, sort_order } = req.body;

    if (!name || !category || !price) {
      res.status(400).json({ error: "Name, category, and price are required" });
      return;
    }

    const result = await pool.query(
      `INSERT INTO menu_items (name, category, price, description, image_url, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, category, price, description || "", image_url || "", sort_order || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("POST /api/menu error:", error);
    res.status(500).json({ error: "Failed to create menu item" });
  }
});

// PUT /api/menu/:id — update menu item
router.put("/:id", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, description, image_url, is_active, sort_order } = req.body;

    const result = await pool.query(
      `UPDATE menu_items
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           price = COALESCE($3, price),
           description = COALESCE($4, description),
           image_url = COALESCE($5, image_url),
           is_active = COALESCE($6, is_active),
           sort_order = COALESCE($7, sort_order),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [name, category, price, description, image_url, is_active, sort_order, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Menu item not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("PUT /api/menu/:id error:", error);
    res.status(500).json({ error: "Failed to update menu item" });
  }
});

// DELETE /api/menu/:id — delete menu item
router.delete("/:id", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM menu_items WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Menu item not found" });
      return;
    }

    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error("DELETE /api/menu/:id error:", error);
    res.status(500).json({ error: "Failed to delete menu item" });
  }
});

export default router;

import { Router } from "express";
import pool from "../db";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

// Migrate columns helper
async function ensureMenuScopeColumns() {
  await pool.query(`
    ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN DEFAULT true;
    ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS show_on_pos BOOLEAN DEFAULT true;
    ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS price_s INTEGER;
    ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS price_m INTEGER;
    ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS price_l INTEGER;
  `);
  await pool.query(`
    UPDATE menu_items SET price_m = price::integer WHERE price_m IS NULL AND price IS NOT NULL AND price ~ '^[0-9]+$';
  `);
}

// Migrate categories table helper
async function ensureMenuCategoriesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      icon VARCHAR(50) DEFAULT 'Coffee',
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_category_check;
  `);

  const check = await pool.query("SELECT COUNT(*) FROM menu_categories");
  if (parseInt(check.rows[0].count, 10) === 0) {
    await pool.query(`
      INSERT INTO menu_categories (name, slug, icon, sort_order) VALUES
        ('Cà phê', 'coffee', 'Coffee', 1),
        ('Trà & Nước', 'tea', 'Flower', 2),
        ('Bánh ngọt', 'pastry', 'Cake', 3),
        ('Món ăn', 'dish', 'UtensilsCrossed', 4)
    `);
  }
}

// GET /api/menu/categories — list all categories
router.get("/categories", async (req, res) => {
  try {
    await ensureMenuCategoriesTable();
    const result = await pool.query("SELECT * FROM menu_categories ORDER BY sort_order ASC, name ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/menu/categories error:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// POST /api/menu/categories — create new category
router.post("/categories", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    await ensureMenuCategoriesTable();
    const { name, slug, icon, sort_order } = req.body;
    if (!name || !slug) {
      res.status(400).json({ error: "Name and slug are required" });
      return;
    }
    const result = await pool.query(
      `INSERT INTO menu_categories (name, slug, icon, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, slug.toLowerCase().trim(), icon || "Coffee", sort_order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("POST /api/menu/categories error:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
});

// PUT /api/menu/categories/:id — update category
router.put("/categories/:id", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    await ensureMenuCategoriesTable();
    const { id } = req.params;
    const { name, slug, icon, sort_order } = req.body;
    const result = await pool.query(
      `UPDATE menu_categories
       SET name = COALESCE($1, name),
           slug = COALESCE($2, slug),
           icon = COALESCE($3, icon),
           sort_order = COALESCE($4, sort_order)
       WHERE id = $5
       RETURNING *`,
      [name, slug ? slug.toLowerCase().trim() : null, icon, sort_order, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("PUT /api/menu/categories/:id error:", error);
    res.status(500).json({ error: "Failed to update category" });
  }
});

// DELETE /api/menu/categories/:id — delete category
router.delete("/categories/:id", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    await ensureMenuCategoriesTable();
    const { id } = req.params;
    const result = await pool.query("DELETE FROM menu_categories WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error("DELETE /api/menu/categories/:id error:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// Migrate toppings table helper
async function ensureToppingsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_toppings (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      price INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  const check = await pool.query("SELECT COUNT(*) FROM menu_toppings");
  if (parseInt(check.rows[0].count, 10) === 0) {
    await pool.query(`
      INSERT INTO menu_toppings (name, price) VALUES
        ('Trân châu hoàng kim', 8000),
        ('Trân châu trắng', 8000),
        ('Kem cheese', 12000),
        ('Thạch nha đam', 8000),
        ('Thạch sương sáo', 6000)
    `);
  }
}

// GET /api/menu/toppings — list all toppings
router.get("/toppings", async (req, res) => {
  try {
    await ensureToppingsTable();
    const result = await pool.query("SELECT * FROM menu_toppings ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/menu/toppings error:", error);
    res.status(500).json({ error: "Failed to fetch toppings" });
  }
});

// POST /api/menu/toppings — create new topping
router.post("/toppings", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    await ensureToppingsTable();
    const { name, price } = req.body;
    if (!name) {
      res.status(400).json({ error: "Topping name is required" });
      return;
    }
    const result = await pool.query(
      `INSERT INTO menu_toppings (name, price) VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price
       RETURNING *`,
      [name.trim(), price || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("POST /api/menu/toppings error:", error);
    res.status(500).json({ error: "Failed to create topping" });
  }
});

// PUT /api/menu/toppings/:id — update topping
router.put("/toppings/:id", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    await ensureToppingsTable();
    const { id } = req.params;
    const { name, price } = req.body;
    const result = await pool.query(
      `UPDATE menu_toppings
       SET name = COALESCE($1, name),
           price = COALESCE($2, price)
       WHERE id = $3
       RETURNING *`,
      [name, price, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Topping not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("PUT /api/menu/toppings/:id error:", error);
    res.status(500).json({ error: "Failed to update topping" });
  }
});

// DELETE /api/menu/toppings/:id — delete topping
router.delete("/toppings/:id", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    await ensureToppingsTable();
    const { id } = req.params;
    const result = await pool.query("DELETE FROM menu_toppings WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Topping not found" });
      return;
    }
    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error("DELETE /api/menu/toppings/:id error:", error);
    res.status(500).json({ error: "Failed to delete topping" });
  }
});

// GET /api/menu — list menu items
router.get("/", async (req, res) => {
  try {
    await ensureMenuScopeColumns();
    const category = req.query.category as string | undefined;
    const scope = req.query.scope as string | undefined; // 'website' | 'pos'

    let query = "SELECT * FROM menu_items";
    const params: any[] = [];
    const clauses: string[] = [];

    if (category && category !== "all") {
      params.push(category);
      clauses.push(`category = $${params.length}`);
    }

    if (scope === "website") {
      clauses.push("show_on_website = true");
    } else if (scope === "pos") {
      clauses.push("show_on_pos = true");
    }

    if (clauses.length > 0) {
      query += " WHERE " + clauses.join(" AND ");
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
    await ensureMenuScopeColumns();
    const { name, category, price, description, image_url, sort_order, show_on_website, show_on_pos, price_s, price_m, price_l } = req.body;

    if (!name || !category) {
      res.status(400).json({ error: "Name and category are required" });
      return;
    }

    const finalPriceM = price_m || price || 0;

    const result = await pool.query(
      `INSERT INTO menu_items (name, category, price, description, image_url, sort_order, show_on_website, show_on_pos, price_s, price_m, price_l)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        name,
        category,
        String(finalPriceM),
        description || "",
        image_url || "",
        sort_order || 0,
        show_on_website ?? true,
        show_on_pos ?? true,
        price_s ? parseInt(price_s, 10) : null,
        finalPriceM ? parseInt(finalPriceM, 10) : null,
        price_l ? parseInt(price_l, 10) : null
      ]
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
    await ensureMenuScopeColumns();
    const { id } = req.params;
    const { name, category, price, description, image_url, is_active, sort_order, show_on_website, show_on_pos, price_s, price_m, price_l } = req.body;

    const result = await pool.query(
      `UPDATE menu_items
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           price = COALESCE($3, price),
           description = COALESCE($4, description),
           image_url = COALESCE($5, image_url),
           is_active = COALESCE($6, is_active),
           sort_order = COALESCE($7, sort_order),
           show_on_website = COALESCE($8, show_on_website),
           show_on_pos = COALESCE($9, show_on_pos),
           price_s = $10,
           price_m = $11,
           price_l = $12,
           updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [
        name,
        category,
        price ? String(price) : null,
        description,
        image_url,
        is_active,
        sort_order,
        show_on_website,
        show_on_pos,
        price_s !== undefined ? (price_s ? parseInt(price_s, 10) : null) : undefined,
        price_m !== undefined ? (price_m ? parseInt(price_m, 10) : null) : undefined,
        price_l !== undefined ? (price_l ? parseInt(price_l, 10) : null) : undefined,
        id
      ]
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
    await ensureMenuScopeColumns();
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

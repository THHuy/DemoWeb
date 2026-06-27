import pool from "../server/db";

async function test() {
  try {
    console.log("Testing POS database queries...");
    
    // Test 1: pos_orders
    console.log("Creating pos_orders...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pos_orders (
        id SERIAL PRIMARY KEY,
        order_code VARCHAR(50) UNIQUE NOT NULL,
        table_id INTEGER REFERENCES restaurant_tables(id) ON DELETE SET NULL,
        customer_name VARCHAR(200),
        customer_phone VARCHAR(50),
        customer_address TEXT,
        order_type VARCHAR(50) NOT NULL CHECK (order_type IN ('dine_in', 'take_away', 'delivery')),
        delivery_partner VARCHAR(50), 
        status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'sent_kitchen', 'preparing', 'completed', 'served', 'paid', 'done', 'cancelled')),
        notes TEXT,
        discount_type VARCHAR(50), 
        discount_value NUMERIC(15, 2) DEFAULT 0,
        discount_reason VARCHAR(255),
        vat_rate NUMERIC(5, 2) DEFAULT 10.0,
        surcharge NUMERIC(15, 2) DEFAULT 0,
        subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
        total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
        payment_methods JSONB, 
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Test 2: pos_order_items
    console.log("Creating pos_order_items...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pos_order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES pos_orders(id) ON DELETE CASCADE,
        menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_price NUMERIC(15, 2) NOT NULL,
        total_price NUMERIC(15, 2) NOT NULL,
        size VARCHAR(50) DEFAULT 'M',
        ice_level VARCHAR(50) DEFAULT '100%',
        sugar_level VARCHAR(50) DEFAULT '100%',
        temperature VARCHAR(50) DEFAULT 'cold',
        toppings JSONB, 
        notes TEXT,
        voided BOOLEAN DEFAULT false,
        void_reason VARCHAR(255),
        void_approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Test 3: pos_audit_logs
    console.log("Creating pos_audit_logs...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pos_audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        order_id INTEGER REFERENCES pos_orders(id) ON DELETE CASCADE,
        details TEXT,
        ip_address VARCHAR(100),
        device VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Test 4: inventory_stock
    console.log("Creating inventory_stock...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_stock (
        id SERIAL PRIMARY KEY,
        menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE UNIQUE,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        min_threshold INTEGER DEFAULT 10,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    console.log("All tables created successfully!");

    // Test 5: Fetch test
    const ordersRes = await pool.query(`
      SELECT o.*, t.table_number, u.username as creator_name
      FROM pos_orders o
      LEFT JOIN restaurant_tables t ON o.table_id = t.id
      LEFT JOIN users u ON o.created_by = u.id
      ORDER BY o.created_at DESC
    `);
    console.log("Query test successful, rows returned:", ordersRes.rows.length);

  } catch (err) {
    console.error("Test failed with error:", err);
  } finally {
    await pool.end();
  }
}

test();

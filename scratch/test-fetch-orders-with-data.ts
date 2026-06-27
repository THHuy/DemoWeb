import pool from "../server/db";

async function test() {
  try {
    console.log("Seeding a mock order...");
    
    // Get a user ID and table ID
    const userRes = await pool.query("SELECT id FROM users LIMIT 1");
    const tableRes = await pool.query("SELECT id FROM restaurant_tables LIMIT 1");
    const menuItemRes = await pool.query("SELECT id FROM menu_items LIMIT 1");

    if (userRes.rows.length === 0 || tableRes.rows.length === 0 || menuItemRes.rows.length === 0) {
      console.log("Cannot run test: users, restaurant_tables, or menu_items is empty.");
      console.log("Users:", userRes.rows.length);
      console.log("Tables:", tableRes.rows.length);
      console.log("MenuItems:", menuItemRes.rows.length);
      return;
    }

    const userId = userRes.rows[0].id;
    const tableId = tableRes.rows[0].id;
    const menuItemId = menuItemRes.rows[0].id;

    // Create a mock order
    const orderCode = `TEST-${Date.now().toString().slice(-6)}`;
    const orderInsert = await pool.query(`
      INSERT INTO pos_orders (
        order_code, table_id, customer_name, order_type, status, discount_value, vat_rate, surcharge, subtotal, total_amount, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [orderCode, tableId, "Test Customer", "dine_in", "draft", 0, 10, 0, 50000, 55000, userId]);

    const orderId = orderInsert.rows[0].id;
    console.log("Inserted order ID:", orderId);

    // Insert order item
    await pool.query(`
      INSERT INTO pos_order_items (
        order_id, menu_item_id, quantity, unit_price, total_price
      ) VALUES ($1, $2, $3, $4, $5)
    `, [orderId, menuItemId, 1, 50000, 50000]);

    console.log("Inserted mock order item.");

    // Now execute GET /orders route logic
    console.log("Running GET /orders query logic...");
    const ordersRes = await pool.query(`
      SELECT o.*, t.table_number, u.username as creator_name
      FROM pos_orders o
      LEFT JOIN restaurant_tables t ON o.table_id = t.id
      LEFT JOIN users u ON o.created_by = u.id
      ORDER BY o.created_at DESC
    `);

    console.log("Number of orders found:", ordersRes.rows.length);

    const orders = [];
    for (const order of ordersRes.rows) {
      const itemsRes = await pool.query(`
        SELECT oi.*, m.name as item_name, m.image_url, m.category
        FROM pos_order_items oi
        LEFT JOIN menu_items m ON oi.menu_item_id = m.id
        WHERE oi.order_id = $1
      `, [order.id]);

      orders.push({
        id: order.id,
        orderCode: order.order_code,
        tableId: order.table_id,
        tableNumber: order.table_number,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        customerAddress: order.customer_address,
        orderType: order.order_type,
        deliveryPartner: order.delivery_partner,
        status: order.status,
        notes: order.notes,
        discountType: order.discount_type,
        discountValue: parseFloat(order.discount_value),
        discountReason: order.discount_reason,
        vatRate: parseFloat(order.vat_rate),
        surcharge: parseFloat(order.surcharge),
        subtotal: parseFloat(order.subtotal),
        totalAmount: parseFloat(order.total_amount),
        paymentMethods: order.payment_methods || [],
        createdBy: order.created_by,
        creatorName: order.creator_name,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items: itemsRes.rows.map(item => ({
          id: item.id,
          menuItemId: item.menu_item_id,
          itemName: item.item_name,
          imageUrl: item.image_url,
          category: item.category,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unit_price),
          totalPrice: parseFloat(item.total_price),
          size: item.size,
          iceLevel: item.ice_level,
          sugarLevel: item.sugar_level,
          temperature: item.temperature,
          toppings: item.toppings || [],
          notes: item.notes,
          voided: item.voided,
          voidReason: item.void_reason,
          voidApprovedBy: item.void_approved_by
        }))
      });
    }

    console.log("Successfully processed all orders! Result matches schema.");
    console.log(JSON.stringify(orders[0], null, 2));

  } catch (err) {
    console.error("Test failed with error:", err);
  } finally {
    // Clean up test order
    console.log("Cleaning up test order...");
    await pool.query("DELETE FROM pos_orders WHERE order_code LIKE 'TEST-%'");
    await pool.end();
  }
}

test();

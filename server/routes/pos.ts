import { Router } from "express";
import pool from "../db";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

// Auto-create/migrate tables if not exists
async function ensurePosTables() {
  // 1. pos_orders
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

  // 2. pos_order_items
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

  // 3. pos_audit_logs
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

  // 4. inventory_stock
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_stock (
      id SERIAL PRIMARY KEY,
      menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE UNIQUE,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      min_threshold INTEGER DEFAULT 10,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Seed inventory stock if empty
  const stockCount = await pool.query("SELECT COUNT(*) FROM inventory_stock");
  if (parseInt(stockCount.rows[0].count, 10) === 0) {
    const menuItems = await pool.query("SELECT id FROM menu_items");
    for (const item of menuItems.rows) {
      // Seed random stock quantity, making some 0 (out of stock) for test
      const qty = item.id % 4 === 0 ? 0 : 45;
      await pool.query(
        "INSERT INTO inventory_stock (menu_item_id, stock_quantity) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [item.id, qty]
      );
    }
  }
}

// Helper to log audit
async function logAudit(userId: number | undefined, action: string, orderId: number, details: string, req: any) {
  try {
    const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
    const device = req.headers["user-agent"] || "POS Terminal";
    await pool.query(
      `INSERT INTO pos_audit_logs (user_id, action, order_id, details, ip_address, device)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId || null, action, orderId, details, ip, device]
    );
  } catch (err) {
    console.error("Audit log error:", err);
  }
}

// GET /api/pos/orders — List all orders
router.get("/orders", authenticate, async (_req, res) => {
  try {
    await ensurePosTables();
    
    // Fetch orders with table numbers
    const ordersRes = await pool.query(`
      SELECT o.*, t.table_number, u.username as creator_name
      FROM pos_orders o
      LEFT JOIN restaurant_tables t ON o.table_id = t.id
      LEFT JOIN users u ON o.created_by = u.id
      ORDER BY o.created_at DESC
    `);

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

    res.json(orders);
  } catch (error) {
    console.error("GET /api/pos/orders error:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// POST /api/pos/orders — Create a new order
router.post("/orders", authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensurePosTables();
    await client.query("BEGIN");

    const {
      tableId,
      customerName,
      customerPhone,
      customerAddress,
      orderType,
      deliveryPartner,
      status,
      notes,
      discountType,
      discountValue,
      discountReason,
      vatRate,
      surcharge,
      subtotal,
      totalAmount,
      items, // array of order items
    } = req.body;

    const userId = req.user?.id;
    const orderCode = `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    // Insert Order header
    const orderInsert = await client.query(`
      INSERT INTO pos_orders (
        order_code, table_id, customer_name, customer_phone, customer_address,
        order_type, delivery_partner, status, notes, discount_type,
        discount_value, discount_reason, vat_rate, surcharge, subtotal,
        total_amount, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING id, order_code
    `, [
      orderCode,
      tableId || null,
      customerName || "",
      customerPhone || "",
      customerAddress || "",
      orderType || "dine_in",
      deliveryPartner || null,
      status || "draft",
      notes || "",
      discountType || null,
      discountValue || 0,
      discountReason || "",
      vatRate ?? 10.0,
      surcharge || 0,
      subtotal || 0,
      totalAmount || 0,
      userId
    ]);

    const orderId = orderInsert.rows[0].id;

    // Insert Order items
    for (const item of items) {

      await client.query(`
        INSERT INTO pos_order_items (
          order_id, menu_item_id, quantity, unit_price, total_price,
          size, ice_level, sugar_level, temperature, toppings, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        orderId,
        item.menuItemId,
        item.quantity,
        item.unitPrice ?? item.price,
        item.totalPrice ?? ((item.price ?? 0) * (item.quantity ?? 1)),
        item.size || "M",
        item.iceLevel || "100%",
        item.sugarLevel || "100%",
        item.temperature || "cold",
        JSON.stringify(item.toppings || []),
        item.notes || ""
      ]);
    }

    await client.query("COMMIT");
    await logAudit(userId, "create_order", orderId, `Tạo đơn hàng mới: ${orderCode}`, req);
    res.json({ success: true, orderId, orderCode });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("POST /api/pos/orders error:", error);
    res.status(500).json({ error: "Failed to create order" });
  } finally {
    client.release();
  }
});

// PUT /api/pos/orders/:id — Update order (e.g. state change, item change, details update)
router.put("/orders/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await ensurePosTables();
    await client.query("BEGIN");

    const {
      status,
      notes,
      discountType,
      discountValue,
      discountReason,
      surcharge,
      subtotal,
      totalAmount,
      items, // updated items list
    } = req.body;

    const userId = req.user?.id;

    // Fetch existing order status
    const currentOrder = await client.query("SELECT status, order_code FROM pos_orders WHERE id = $1", [id]);
    if (currentOrder.rows.length === 0) {
      res.status(404).json({ error: "Order not found" });
      client.release();
      return;
    }

    // Update Header
    await client.query(`
      UPDATE pos_orders
      SET status = COALESCE($1, status),
          notes = COALESCE($2, notes),
          discount_type = $3,
          discount_value = $4,
          discount_reason = $5,
          surcharge = COALESCE($6, surcharge),
          subtotal = COALESCE($7, subtotal),
          total_amount = COALESCE($8, total_amount),
          updated_at = NOW()
      WHERE id = $9
    `, [status, notes, discountType, discountValue, discountReason, surcharge, subtotal, totalAmount, id]);

    // Update Items if provided
    if (items) {
      // Delete old items
      await client.query("DELETE FROM pos_order_items WHERE order_id = $1", [id]);

      // Re-insert new items
      for (const item of items) {

        await client.query(`
          INSERT INTO pos_order_items (
            order_id, menu_item_id, quantity, unit_price, total_price,
            size, ice_level, sugar_level, temperature, toppings, notes, voided, void_reason, void_approved_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          id,
          item.menuItemId,
          item.quantity,
          item.unitPrice ?? item.price,
          item.totalPrice ?? ((item.price ?? 0) * (item.quantity ?? 1)),
          item.size || "M",
          item.iceLevel || "100%",
          item.sugarLevel || "100%",
          item.temperature || "cold",
          JSON.stringify(item.toppings || []),
          item.notes || "",
          item.voided || false,
          item.voidReason || null,
          item.voidApprovedBy || null
        ]);
      }
    }

    await client.query("COMMIT");
    await logAudit(userId, "update_order", parseInt(id as string), `Cập nhật đơn hàng ${currentOrder.rows[0].order_code}. Trạng thái mới: ${status}`, req);
    res.json({ success: true, message: "Order updated successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("PUT /api/pos/orders error:", error);
    res.status(500).json({ error: "Failed to update order" });
  } finally {
    client.release();
  }
});

// POST /api/pos/orders/:id/pay — Pay invoice (multi payment methods supported)
router.post("/orders/:id/pay", authenticate, async (req, res) => {
  const { id } = req.params;
  const { paymentMethods } = req.body; // array of [{"method": "cash", "amount": 50000}]
  const userId = req.user?.id;

  try {
    await ensurePosTables();
    
    const orderRes = await pool.query("SELECT order_code, total_amount FROM pos_orders WHERE id = $1", [id]);
    if (orderRes.rows.length === 0) {
      res.status(404).json({ error: "Không tìm thấy hoá đơn" });
      return;
    }

    await pool.query(
      `UPDATE pos_orders 
       SET status = 'paid', payment_methods = $1, updated_at = NOW() 
       WHERE id = $2`,
      [JSON.stringify(paymentMethods), id]
    );

    await logAudit(
      userId, 
      "pay_order", 
      parseInt(id as string), 
      `Thanh toán hoá đơn ${orderRes.rows[0].order_code} với hình thức: ${paymentMethods.map((p: any) => `${p.method}: ${p.amount.toLocaleString()}đ`).join(", ")}`, 
      req
    );

    res.json({ success: true, message: "Thanh toán thành công!" });
  } catch (error) {
    console.error("POST /api/pos/orders/:id/pay error:", error);
    res.status(500).json({ error: "Failed to complete payment" });
  }
});

// POST /api/pos/orders/:id/void-item — Cancel/void specific order item (requires reason, approved_by)
router.post("/orders/:id/void-item", authenticate, async (req, res) => {
  const { id } = req.params;
  const { itemId, reason, approvedByUsername } = req.body;
  const userId = req.user?.id;

  const client = await pool.connect();
  try {
    await ensurePosTables();
    await client.query("BEGIN");

    // Check if supervisor exists
    const supervisor = await client.query("SELECT id, role FROM users WHERE username = $1", [approvedByUsername]);
    if (supervisor.rows.length === 0 || supervisor.rows[0].role !== "admin") {
      res.status(403).json({ error: "Chỉ người quản trị (admin) mới được quyền duyệt huỷ món" });
      client.release();
      return;
    }

    // Recalculate stock - return voided quantity to stock
    const itemQuery = await client.query("SELECT menu_item_id, quantity, total_price, voided FROM pos_order_items WHERE id = $1", [itemId]);
    if (itemQuery.rows.length === 0) {
      res.status(404).json({ error: "Món ăn cần hủy không tồn tại" });
      client.release();
      return;
    }

    if (itemQuery.rows[0].voided) {
      res.status(400).json({ error: "Món ăn đã được huỷ từ trước" });
      client.release();
      return;
    }

    // Set item as voided
    await client.query(
      `UPDATE pos_order_items 
       SET voided = true, void_reason = $1, void_approved_by = $2 
       WHERE id = $3`,
      [reason, supervisor.rows[0].id, itemId]
    );

    // Return stock (Disabled)

    // Recalculate order subtotal and total
    const orderQuery = await client.query("SELECT subtotal, vat_rate, surcharge, discount_value, discount_type FROM pos_orders WHERE id = $1", [id]);
    const currentOrder = orderQuery.rows[0];
    const voidedPrice = parseFloat(itemQuery.rows[0].total_price);
    const newSubtotal = Math.max(0, parseFloat(currentOrder.subtotal) - voidedPrice);
    
    let discount = parseFloat(currentOrder.discount_value);
    if (currentOrder.discount_type === "percentage") {
      discount = newSubtotal * (discount / 100);
    }
    const vat = newSubtotal * (parseFloat(currentOrder.vat_rate) / 100);
    const newTotal = Math.max(0, newSubtotal - discount + vat + parseFloat(currentOrder.surcharge));

    await client.query(
      `UPDATE pos_orders 
       SET subtotal = $1, total_amount = $2, updated_at = NOW() 
       WHERE id = $3`,
      [newSubtotal, newTotal, id]
    );

    await client.query("COMMIT");
    await logAudit(
      userId, 
      "void_item", 
      parseInt(id as string), 
      `Huỷ món ăn ID: ${itemQuery.rows[0].menu_item_id} (Số lượng: ${itemQuery.rows[0].quantity}). Lý do: ${reason}. Người duyệt: ${approvedByUsername}`, 
      req
    );

    res.json({ success: true, message: "Huỷ món thành công và hoàn trả kho" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("POST /api/pos/orders/:id/void-item error:", error);
    res.status(500).json({ error: "Failed to void item" });
  } finally {
    client.release();
  }
});

// POST /api/pos/orders/:id/refund — Refund parts or whole paid order
router.post("/orders/:id/refund", authenticate, async (req, res) => {
  const { id } = req.params;
  const { refundAmount, reason } = req.body;
  const userId = req.user?.id;

  try {
    await ensurePosTables();
    
    const orderRes = await pool.query("SELECT order_code, total_amount FROM pos_orders WHERE id = $1", [id]);
    if (orderRes.rows.length === 0) {
      res.status(404).json({ error: "Không tìm thấy hoá đơn" });
      return;
    }

    // Set order status as cancelled/refunded
    await pool.query(
      `UPDATE pos_orders 
       SET status = 'cancelled', notes = CONCAT(notes, '\n[Đã hoàn tiền: ', $1::text, 'đ. Lý do: ', $2::text, ']') 
       WHERE id = $3`,
      [refundAmount.toLocaleString(), reason, id]
    );

    await logAudit(
      userId, 
      "refund_order", 
      parseInt(id as string), 
      `Hoàn tiền hoá đơn ${orderRes.rows[0].order_code} số tiền: ${refundAmount.toLocaleString()}đ. Lý do: ${reason}`, 
      req
    );

    res.json({ success: true, message: "Hoàn tiền hoá đơn thành công!" });
  } catch (error) {
    console.error("POST /api/pos/orders/:id/refund error:", error);
    res.status(500).json({ error: "Failed to refund order" });
  }
});

// POST /api/pos/orders/:id/split — Split bill
router.post("/orders/:id/split", authenticate, async (req, res) => {
  const { id } = req.params;
  const { itemsToSplit } = req.body; // array of { itemId, quantityToSplit, unitPrice }
  const userId = req.user?.id;
  const client = await pool.connect();

  try {
    await ensurePosTables();
    await client.query("BEGIN");

    // Fetch original order details
    const originalRes = await client.query("SELECT * FROM pos_orders WHERE id = $1", [id]);
    if (originalRes.rows.length === 0) {
      res.status(404).json({ error: "Original order not found" });
      client.release();
      return;
    }
    const origOrder = originalRes.rows[0];

    // Create a new Split order code
    const splitCode = `${origOrder.order_code}-SPLIT`;

    // 1. Create split order header
    const splitOrderInsert = await client.query(`
      INSERT INTO pos_orders (
        order_code, table_id, customer_name, customer_phone, order_type, 
        status, vat_rate, created_by
      ) VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7)
      RETURNING id, order_code
    `, [
      splitCode,
      origOrder.table_id,
      `${origOrder.customer_name || "Khách"} (Tách)`,
      origOrder.customer_phone || "",
      origOrder.order_type,
      origOrder.vat_rate,
      userId
    ]);
    const splitOrderId = splitOrderInsert.rows[0].id;

    let splitSubtotal = 0;

    for (const item of itemsToSplit) {
      const origItemRes = await client.query("SELECT * FROM pos_order_items WHERE id = $1", [item.itemId]);
      if (origItemRes.rows.length === 0) continue;
      const origItem = origItemRes.rows[0];

      const splitQty = item.quantityToSplit;
      const itemPrice = parseFloat(origItem.unit_price);
      const splitTotalPrice = splitQty * itemPrice;
      splitSubtotal += splitTotalPrice;

      // 2. Insert item into split order
      await client.query(`
        INSERT INTO pos_order_items (
          order_id, menu_item_id, quantity, unit_price, total_price,
          size, ice_level, sugar_level, temperature, toppings, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        splitOrderId,
        origItem.menu_item_id,
        splitQty,
        origItem.unit_price,
        splitTotalPrice,
        origItem.size,
        origItem.ice_level,
        origItem.sugar_level,
        origItem.temperature,
        JSON.stringify(origItem.toppings),
        origItem.notes
      ]);

      // 3. Deduct/Adjust quantity on original order item
      const newOrigQty = origItem.quantity - splitQty;
      if (newOrigQty <= 0) {
        await client.query("DELETE FROM pos_order_items WHERE id = $1", [item.itemId]);
      } else {
        const newOrigTotalPrice = newOrigQty * itemPrice;
        await client.query(
          "UPDATE pos_order_items SET quantity = $1, total_price = $2 WHERE id = $3",
          [newOrigQty, newOrigTotalPrice, item.itemId]
        );
      }
    }

    // 4. Update split order subtotal and total
    const splitVat = splitSubtotal * (parseFloat(origOrder.vat_rate) / 100);
    const splitTotal = splitSubtotal + splitVat;

    await client.query(
      "UPDATE pos_orders SET subtotal = $1, total_amount = $2 WHERE id = $3",
      [splitSubtotal, splitTotal, splitOrderId]
    );

    // 5. Update original order subtotal and total
    const remainingItemsRes = await client.query("SELECT SUM(total_price) FROM pos_order_items WHERE order_id = $1", [id]);
    const newOrigSubtotal = parseFloat(remainingItemsRes.rows[0].sum || "0");
    const origVat = newOrigSubtotal * (parseFloat(origOrder.vat_rate) / 100);
    const newOrigTotal = newOrigSubtotal + origVat + parseFloat(origOrder.surcharge) - parseFloat(origOrder.discount_value);

    await client.query(
      "UPDATE pos_orders SET subtotal = $1, total_amount = $2 WHERE id = $3",
      [newOrigSubtotal, newOrigTotal, id]
    );

    await client.query("COMMIT");
    await logAudit(userId, "split_invoice", parseInt(id as string), `Tách hoá đơn thành hoá đơn mới: ${splitCode}`, req);
    res.json({ success: true, message: "Tách hoá đơn thành công!" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("POST /api/pos/orders/:id/split error:", error);
    res.status(500).json({ error: "Failed to split order" });
  } finally {
    client.release();
  }
});

// POST /api/pos/orders/merge — Merge multiple orders into one
router.post("/orders/merge", authenticate, async (req, res) => {
  const { sourceOrderIds, targetOrderId } = req.body;
  const userId = req.user?.id;
  const client = await pool.connect();

  try {
    await ensurePosTables();
    await client.query("BEGIN");

    // Fetch target order
    const targetRes = await client.query("SELECT order_code FROM pos_orders WHERE id = $1", [targetOrderId]);
    if (targetRes.rows.length === 0) {
      res.status(404).json({ error: "Target order not found" });
      client.release();
      return;
    }
    const targetCode = targetRes.rows[0].order_code;

    for (const sourceId of sourceOrderIds) {
      if (sourceId === targetOrderId) continue;

      // Transfer items
      const sourceItems = await client.query("SELECT * FROM pos_order_items WHERE order_id = $1", [sourceId]);
      for (const item of sourceItems.rows) {
        // Check if matching item exists in target (with same modifiers) to combine
        const matchRes = await client.query(`
          SELECT id, quantity FROM pos_order_items 
          WHERE order_id = $1 AND menu_item_id = $2 AND size = $3 AND ice_level = $4 AND sugar_level = $5 AND temperature = $6
        `, [targetOrderId, item.menu_item_id, item.size, item.ice_level, item.sugar_level, item.temperature]);

        if (matchRes.rows.length > 0) {
          const newQty = matchRes.rows[0].quantity + item.quantity;
          const newPrice = newQty * parseFloat(item.unit_price);
          await client.query(
            "UPDATE pos_order_items SET quantity = $1, total_price = $2 WHERE id = $3",
            [newQty, newPrice, matchRes.rows[0].id]
          );
        } else {
          // Point item to target order
          await client.query("UPDATE pos_order_items SET order_id = $1 WHERE id = $2", [targetOrderId, item.id]);
        }
      }

      // Delete source order
      await client.query("DELETE FROM pos_orders WHERE id = $1", [sourceId]);
    }

    // Recalculate target order totals
    const targetItemsSum = await client.query("SELECT SUM(total_price) FROM pos_order_items WHERE order_id = $1", [targetOrderId]);
    const newSubtotal = parseFloat(targetItemsSum.rows[0].sum || "0");
    const targetOrderDetails = await client.query("SELECT vat_rate, surcharge, discount_value FROM pos_orders WHERE id = $1", [targetOrderId]);
    const tDetails = targetOrderDetails.rows[0];

    const vat = newSubtotal * (parseFloat(tDetails.vat_rate) / 100);
    const newTotal = newSubtotal + vat + parseFloat(tDetails.surcharge) - parseFloat(tDetails.discount_value);

    await client.query(
      "UPDATE pos_orders SET subtotal = $1, total_amount = $2 WHERE id = $3",
      [newSubtotal, newTotal, targetOrderId]
    );

    await client.query("COMMIT");
    await logAudit(userId, "merge_invoice", targetOrderId, `Gộp các hoá đơn vào đơn: ${targetCode}`, req);
    res.json({ success: true, message: "Gộp hoá đơn thành công!" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("POST /api/pos/orders/merge error:", error);
    res.status(500).json({ error: "Failed to merge orders" });
  } finally {
    client.release();
  }
});

// GET /api/pos/inventory — List inventory stocks
router.get("/inventory", authenticate, async (_req, res) => {
  try {
    await ensurePosTables();
    const result = await pool.query(`
      SELECT i.*, m.name as item_name, m.price, m.category, m.image_url
      FROM inventory_stock i
      RIGHT JOIN menu_items m ON i.menu_item_id = m.id
      ORDER BY m.id ASC
    `);

    res.json(result.rows.map(row => ({
      id: row.id,
      menuItemId: row.menu_item_id,
      itemName: row.item_name,
      price: row.price,
      category: row.category,
      imageUrl: row.image_url,
      stockQuantity: row.stock_quantity ?? 0,
      minThreshold: row.min_threshold ?? 10
    })));
  } catch (error) {
    console.error("GET /api/pos/inventory error:", error);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// PUT /api/pos/inventory/:menuItemId — Update stock level
router.put("/inventory/:menuItemId", authenticate, requireRole(["admin"]), async (req, res) => {
  try {
    await ensurePosTables();
    const { menuItemId } = req.params;
    const { stockQuantity, minThreshold } = req.body;

    await pool.query(`
      INSERT INTO inventory_stock (menu_item_id, stock_quantity, min_threshold)
      VALUES ($1, $2, $3)
      ON CONFLICT (menu_item_id)
      DO UPDATE SET 
        stock_quantity = EXCLUDED.stock_quantity,
        min_threshold = COALESCE(EXCLUDED.min_threshold, inventory_stock.min_threshold),
        updated_at = NOW()
    `, [menuItemId, stockQuantity, minThreshold]);

    res.json({ success: true, message: "Cập nhật tồn kho thành công" });
  } catch (error) {
    console.error("PUT /api/pos/inventory error:", error);
    res.status(500).json({ error: "Failed to update inventory" });
  }
});

// GET /api/pos/reports — POS sales reports by shift, hour, day, month
router.get("/reports", authenticate, requireRole(["admin"]), async (req, res) => {
  try {
    await ensurePosTables();
    const { period } = req.query; // 'hour', 'shift', 'day', 'month'

    let dateTruncExpr = "day";
    if (period === "hour") dateTruncExpr = "hour";
    if (period === "month") dateTruncExpr = "month";

    // 1. Revenue report
    const revenueRes = await pool.query(`
      SELECT DATE_TRUNC($1, created_at) as time_label, SUM(total_amount) as revenue, COUNT(*) as orders_count
      FROM pos_orders
      WHERE status = 'paid' OR status = 'done'
      GROUP BY time_label
      ORDER BY time_label DESC
      LIMIT 30
    `, [dateTruncExpr]);

    // 2. Best sellers
    const topItemsRes = await pool.query(`
      SELECT m.name as item_name, SUM(oi.quantity) as quantity, SUM(oi.total_price) as sales_amount
      FROM pos_order_items oi
      JOIN pos_orders o ON oi.order_id = o.id
      JOIN menu_items m ON oi.menu_item_id = m.id
      WHERE (o.status = 'paid' OR o.status = 'done') AND oi.voided = false
      GROUP BY m.name
      ORDER BY quantity DESC
      LIMIT 10
    `);

    // 3. Revenue by payment methods
    const paymentMethodsRes = await pool.query(`
      SELECT method, SUM(amount) as total_collected
      FROM (
        SELECT jsonb_array_elements(payment_methods)->>'method' as method,
               (jsonb_array_elements(payment_methods)->>'amount')::numeric as amount
        FROM pos_orders
        WHERE status = 'paid' OR status = 'done'
      ) sub
      GROUP BY method
      ORDER BY total_collected DESC
    `);

    // 4. Employee performance
    const employeeRes = await pool.query(`
      SELECT u.username, SUM(o.total_amount) as total_sales, COUNT(o.id) as orders_handled
      FROM pos_orders o
      JOIN users u ON o.created_by = u.id
      WHERE o.status = 'paid' OR o.status = 'done'
      GROUP BY u.username
      ORDER BY total_sales DESC
    `);

    // 5. Void/cancel logs report
    const voidedReportRes = await pool.query(`
      SELECT m.name as item_name, oi.quantity, oi.void_reason, u.username as approver
      FROM pos_order_items oi
      JOIN menu_items m ON oi.menu_item_id = m.id
      JOIN users u ON oi.void_approved_by = u.id
      WHERE oi.voided = true
      ORDER BY oi.id DESC
      LIMIT 20
    `);

    res.json({
      revenue: revenueRes.rows,
      topItems: topItemsRes.rows,
      paymentMethods: paymentMethodsRes.rows,
      employees: employeeRes.rows,
      voidedLogs: voidedReportRes.rows
    });
  } catch (error) {
    console.error("GET /api/pos/reports error:", error);
    res.status(500).json({ error: "Failed to fetch sales report" });
  }
});

// GET /api/pos/audit-logs — POS logs
router.get("/audit-logs", authenticate, requireRole(["admin"]), async (_req, res) => {
  try {
    await ensurePosTables();
    const result = await pool.query(`
      SELECT al.*, u.username, o.order_code
      FROM pos_audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN pos_orders o ON al.order_id = o.id
      ORDER BY al.created_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/pos/audit-logs error:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

export default router;

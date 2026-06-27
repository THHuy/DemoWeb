import { Router } from "express";
import pool from "../db";
import { authenticate, requireRole } from "../middleware/auth";
import net from "net";

const router = Router();

// Auto-create/migrate settings table if not exists
async function ensureSettingsTable() {
  const checkColumn = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'device_settings' AND column_name = 'device_key'
  `);
  if (checkColumn.rows.length > 0) {
    await pool.query("DROP TABLE IF EXISTS device_settings CASCADE");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS device_settings (
      id SERIAL PRIMARY KEY,
      device_type VARCHAR(50) NOT NULL, -- 'pos', 'printer', 'timeClock'
      enabled BOOLEAN DEFAULT false,
      connection_type VARCHAR(20) DEFAULT 'network',
      ip_address VARCHAR(100) DEFAULT '',
      port VARCHAR(10) DEFAULT '',
      device_name VARCHAR(255) DEFAULT '',
      updated_at TIMESTAMP DEFAULT NOW(),
      updated_by INTEGER REFERENCES users(id)
    )
  `);

  // Seed default items if table is empty
  const countRes = await pool.query("SELECT COUNT(*) FROM device_settings");
  if (parseInt(countRes.rows[0].count, 10) === 0) {
    await pool.query(`
      INSERT INTO device_settings (device_type, device_name, enabled, connection_type, ip_address, port)
      VALUES 
        ('pos', 'Máy POS Thu Ngân 01', true, 'network', '192.168.1.100', '8080'),
        ('printer', 'Máy In Hoá Đơn Két', true, 'usb', '', '9100'),
        ('printer', 'Máy In Bếp Order', false, 'network', '192.168.1.150', '9100'),
        ('timeClock', 'Máy Chấm Công Vân Tay Sảnh', true, 'network', '192.168.1.200', '4370')
    `);
  }
}

// Auto-create/migrate payment_settings table if not exists
async function ensurePaymentSettingsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_settings (
      id SERIAL PRIMARY KEY,
      provider VARCHAR(50) UNIQUE NOT NULL, -- 'vietqr', 'momo', 'zalopay', 'vnpay'
      enabled BOOLEAN DEFAULT false,
      bank_name VARCHAR(100) DEFAULT '',
      account_number VARCHAR(100) DEFAULT '',
      account_holder VARCHAR(200) DEFAULT '',
      phone_number VARCHAR(50) DEFAULT '',
      merchant_id VARCHAR(100) DEFAULT '',
      secret_key TEXT DEFAULT '',
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Seed default providers if table is empty
  const countRes = await pool.query("SELECT COUNT(*) FROM payment_settings");
  if (parseInt(countRes.rows[0].count, 10) === 0) {
    await pool.query(`
      INSERT INTO payment_settings (provider, enabled, bank_name, account_number, account_holder, phone_number, merchant_id)
      VALUES 
        ('vietqr', true, 'Vietcombank', '1023456789', 'CONG TY CAFE L AMBIANCE', '', ''),
        ('momo', false, '', '', 'Nguyen Van A', '0912345678', ''),
        ('zalopay', false, '', '', '', '', 'ZALOPAY123'),
        ('vnpay', false, '', '', '', '', 'VNPAY456')
    `);
  }
}

// Auto-create/migrate system_settings table if not exists
async function ensureSystemSettingsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  // Seed default VAT value
  await pool.query(`
    INSERT INTO system_settings (key, value)
    VALUES ('vat_enabled', 'true')
    ON CONFLICT (key) DO NOTHING;
  `);
}

// GET /api/settings/system — get system settings
router.get("/system", authenticate, requireRole(["admin"]), async (_req, res) => {
  try {
    await ensureSystemSettingsTable();
    const result = await pool.query("SELECT * FROM system_settings");
    const settingsObj: Record<string, string> = {};
    result.rows.forEach(row => {
      settingsObj[row.key] = row.value;
    });
    res.json(settingsObj);
  } catch (error) {
    console.error("GET /api/settings/system error:", error);
    res.status(500).json({ error: "Failed to fetch system settings" });
  }
});

// PUT /api/settings/system — update system settings
router.put("/system", authenticate, requireRole(["admin"]), async (req, res) => {
  try {
    await ensureSystemSettingsTable();
    const settings = req.body;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const [key, value] of Object.entries(settings)) {
        await client.query(`
          INSERT INTO system_settings (key, value, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `, [key, String(value)]);
      }
      await client.query("COMMIT");
      res.json({ success: true, message: "Cấu hình hệ thống đã được lưu" });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("PUT /api/settings/system error:", error);
    res.status(500).json({ error: "Failed to save system settings" });
  }
});

// GET /api/settings/payment — get payment configurations
router.get("/payment", authenticate, requireRole(["admin"]), async (_req, res) => {
  try {
    await ensurePaymentSettingsTable();
    const result = await pool.query("SELECT * FROM payment_settings ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/settings/payment error:", error);
    res.status(500).json({ error: "Failed to fetch payment settings" });
  }
});

// PUT /api/settings/payment — save payment configurations
router.put("/payment", authenticate, requireRole(["admin"]), async (req, res) => {
  try {
    await ensurePaymentSettingsTable();
    const providers = req.body; // array of payment providers configs

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const prov of providers) {
        await client.query(`
          INSERT INTO payment_settings (provider, enabled, bank_name, account_number, account_holder, phone_number, merchant_id, secret_key, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT (provider)
          DO UPDATE SET
            enabled = EXCLUDED.enabled,
            bank_name = EXCLUDED.bank_name,
            account_number = EXCLUDED.account_number,
            account_holder = EXCLUDED.account_holder,
            phone_number = EXCLUDED.phone_number,
            merchant_id = EXCLUDED.merchant_id,
            secret_key = EXCLUDED.secret_key,
            updated_at = NOW()
        `, [
          prov.provider,
          prov.enabled ?? false,
          prov.bank_name ?? "",
          prov.account_number ?? "",
          prov.account_holder ?? "",
          prov.phone_number ?? "",
          prov.merchant_id ?? "",
          prov.secret_key ?? ""
        ]);
      }
      await client.query("COMMIT");
      res.json({ success: true, message: "Cấu hình thanh toán đã được lưu" });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("PUT /api/settings/payment error:", error);
    res.status(500).json({ error: "Failed to save payment settings" });
  }
});

// GET /api/settings — get all devices
router.get("/", authenticate, requireRole(["admin"]), async (_req, res) => {
  try {
    await ensureSettingsTable();

    const result = await pool.query(
      "SELECT * FROM device_settings ORDER BY id ASC"
    );

    // Map DB fields to camelCase for Next.js app
    const devices = result.rows.map((row) => ({
      id: row.id,
      deviceType: row.device_type,
      enabled: row.enabled,
      connectionType: row.connection_type,
      ipAddress: row.ip_address,
      port: row.port,
      deviceName: row.device_name,
    }));

    res.json(devices);
  } catch (error) {
    console.error("GET /api/settings error:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// POST /api/settings — add a new device
router.post("/", authenticate, requireRole(["admin"]), async (req, res) => {
  try {
    await ensureSettingsTable();
    const { deviceType, deviceName, connectionType, ipAddress, port, enabled } = req.body;
    const userId = req.user?.id;

    if (!deviceType || !deviceName) {
      res.status(400).json({ error: "Loại thiết bị và tên thiết bị là bắt buộc" });
      return;
    }

    const result = await pool.query(
      `INSERT INTO device_settings (device_type, device_name, connection_type, ip_address, port, enabled, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        deviceType,
        deviceName,
        connectionType || "network",
        ipAddress || "",
        port || "",
        enabled ?? false,
        userId,
      ]
    );

    const newDevice = {
      id: result.rows[0].id,
      deviceType: result.rows[0].device_type,
      deviceName: result.rows[0].device_name,
      connectionType: result.rows[0].connection_type,
      ipAddress: result.rows[0].ip_address,
      port: result.rows[0].port,
      enabled: result.rows[0].enabled,
    };

    res.json({ success: true, device: newDevice });
  } catch (error) {
    console.error("POST /api/settings error:", error);
    res.status(500).json({ error: "Failed to create device" });
  }
});

// PUT /api/settings/:id — update a device
router.put("/:id", authenticate, requireRole(["admin"]), async (req, res) => {
  try {
    await ensureSettingsTable();
    const { id } = req.params;
    const { deviceName, connectionType, ipAddress, port, enabled } = req.body;
    const userId = req.user?.id;

    const result = await pool.query(
      `UPDATE device_settings
       SET device_name = $1,
           connection_type = $2,
           ip_address = $3,
           port = $4,
           enabled = $5,
           updated_at = NOW(),
           updated_by = $6
       WHERE id = $7
       RETURNING *`,
      [deviceName, connectionType, ipAddress, port, enabled, userId, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Không tìm thấy thiết bị" });
      return;
    }

    res.json({ success: true, message: "Cập nhật thiết bị thành công" });
  } catch (error) {
    console.error("PUT /api/settings/:id error:", error);
    res.status(500).json({ error: "Failed to update device" });
  }
});

// DELETE /api/settings/:id — delete a device
router.delete("/:id", authenticate, requireRole(["admin"]), async (req, res) => {
  try {
    await ensureSettingsTable();
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM device_settings WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Không tìm thấy thiết bị để xóa" });
      return;
    }

    res.json({ success: true, message: "Đã xóa thiết bị thành công" });
  } catch (error) {
    console.error("DELETE /api/settings/:id error:", error);
    res.status(500).json({ error: "Failed to delete device" });
  }
});

// POST /api/settings/test-connection — test device connection
router.post(
  "/test-connection",
  authenticate,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { connectionType, ipAddress, port } = req.body;

      if (connectionType === "usb") {
        res.json({
          success: true,
          message: "USB: Thiết bị sẽ được kiểm tra khi sử dụng",
        });
        return;
      }

      if (connectionType === "bluetooth") {
        res.json({
          success: true,
          message: "Bluetooth: Thiết bị sẽ được kiểm tra khi ghép nối",
        });
        return;
      }

      if (!ipAddress || !port) {
        res.json({
          success: false,
          message: "Vui lòng nhập đầy đủ địa chỉ IP và cổng",
        });
        return;
      }

      const portNum = parseInt(port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        res.json({
          success: false,
          message: "Cổng không hợp lệ (1-65535)",
        });
        return;
      }

      const isReachable = await new Promise<boolean>((resolve) => {
        const socket = new net.Socket();
        const timeout = 3000;

        socket.setTimeout(timeout);

        socket.on("connect", () => {
          socket.destroy();
          resolve(true);
        });

        socket.on("timeout", () => {
          socket.destroy();
          resolve(false);
        });

        socket.on("error", () => {
          socket.destroy();
          resolve(false);
        });

        socket.connect(portNum, ipAddress);
      });

      if (isReachable) {
        res.json({
          success: true,
          message: `Kết nối thành công đến ${ipAddress}:${port}`,
        });
      } else {
        res.json({
          success: false,
          message: `Không thể kết nối đến ${ipAddress}:${port}. Kiểm tra lại IP, cổng và đảm bảo thiết bị đang bật.`,
        });
      }
    } catch (error) {
      console.error("POST /api/settings/test-connection error:", error);
      res.json({
        success: false,
        message: "Lỗi khi kiểm tra kết nối",
      });
    }
  }
);

export default router;

import pool from "../server/db";

async function test() {
  try {
    console.log("Testing PUT /api/settings/payment query execution...");

    const providers = [
      {
        provider: "vietqr",
        enabled: true,
        bank_name: "Vietcombank Test",
        account_number: "1111111",
        account_holder: "TEST OWNER",
        phone_number: "",
        merchant_id: "",
        secret_key: ""
      },
      {
        provider: "momo",
        enabled: false,
        bank_name: "",
        account_number: "",
        account_holder: "TEST MOMO",
        phone_number: "0999999999",
        merchant_id: "",
        secret_key: ""
      }
    ];

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const prov of providers) {
        console.log(`Saving provider: ${prov.provider}...`);
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
      console.log("SQL transaction executed successfully!");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("SQL transaction failed:", err);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await pool.end();
  }
}

test();

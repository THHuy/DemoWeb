import pool from "../server/db";

async function test() {
  try {
    console.log("Checking which tables exist in the database...");
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log("Tables found in database:");
    res.rows.forEach(r => console.log(`- ${r.table_name}`));
    
    // Check if restaurant_tables exists
    const hasTables = res.rows.some(r => r.table_name === 'restaurant_tables');
    if (!hasTables) {
      console.log("WARNING: restaurant_tables table does NOT exist!");
    } else {
      console.log("SUCCESS: restaurant_tables table exists.");
    }
  } catch (err) {
    console.error("DB check failed:", err);
  } finally {
    await pool.end();
  }
}

test();

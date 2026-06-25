const { Pool } = require('pg');
const dotenv = require('dotenv');
const { resolve } = require('path');

dotenv.config({ path: resolve(__dirname, ".env.local") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function test() {
  try {
    const dates = [
      '2026-06-29',
      '2026-06-29T00:00:00.000Z',
      '2026-06-29T17:00:00.000Z',
      '2026-06-29T07:00:00.000Z',
      new Date('2026-06-29')
    ];

    for (const d of dates) {
      const res = await pool.query(
        `SELECT id 
         FROM leave_requests 
         WHERE employee_id = 2 
           AND status != 'rejected' 
           AND $1 >= start_date 
           AND $1 <= end_date`,
        [d]
      );
      console.log(`Input: ${d} (${typeof d}) -> Matches: ${res.rows.length}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

test();

import { Pool, types } from "pg";
import dotenv from "dotenv";
import { resolve } from "path";

// Load .env.local from project root
dotenv.config({ path: resolve(__dirname, "..", ".env.local") });

// Parse PostgreSQL DATE type (OID 1082) as a raw string to avoid timezone shifting
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Unexpected PG pool error:", err);
});

export default pool;

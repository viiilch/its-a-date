// api/lib/db.js
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.DB_URL;

if (!connectionString) {
  console.error("DB_URL is not set");
  throw new Error("DB_URL is not set");
}

// один pool на всі виклики (Vercel це кешує між викликами)
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // для Neon ок
  },
});

export async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}
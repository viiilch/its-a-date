// api/lib/db.js
import pkg from "pg";

const { Pool } = pkg;

const connectionString = process.env.DB_URL;

if (!connectionString) {
  throw new Error("DB_URL is not set. Please configure it in .env.local and Vercel.");
}

// Пул підключень до Postgres (Neon)
export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // для Neon ок
  },
});

export async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      html_content TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      password TEXT,
      is_protected INTEGER DEFAULT 0,
      code_type TEXT DEFAULT 'html'
    )
  `);
  console.log('数据库初始化成功');
}

async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

async function get(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
}

async function run(sql, params = []) {
  const result = await pool.query(sql, params);
  return { changes: result.rowCount };
}

module.exports = { pool, initDatabase, query, get, run };

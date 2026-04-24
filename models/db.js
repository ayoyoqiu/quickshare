const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at BIGINT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      html_content TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      password TEXT,
      is_protected INTEGER DEFAULT 0,
      code_type TEXT DEFAULT 'html',
      owner_user_id BIGINT
    )
  `);

  await pool.query('ALTER TABLE pages ADD COLUMN IF NOT EXISTS owner_user_id BIGINT');
  await pool.query('ALTER TABLE pages ADD COLUMN IF NOT EXISTS display_name TEXT');
  await pool.query('DROP INDEX IF EXISTS idx_pages_owner_user_id');
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_pages_owner_user_id ON pages(owner_user_id)'
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS page_versions (
      id BIGSERIAL PRIMARY KEY,
      owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      version_number INT NOT NULL,
      html_content TEXT NOT NULL,
      code_type TEXT DEFAULT 'html',
      is_protected INTEGER DEFAULT 0,
      page_password TEXT,
      created_at BIGINT NOT NULL,
      page_id TEXT
    )
  `);
  await pool.query('ALTER TABLE page_versions ADD COLUMN IF NOT EXISTS page_id TEXT');

  await pool.query(`
    UPDATE page_versions pv
    SET page_id = sub.id
    FROM (
      SELECT DISTINCT ON (owner_user_id) owner_user_id, id
      FROM pages
      WHERE owner_user_id IS NOT NULL
      ORDER BY owner_user_id, created_at DESC
    ) AS sub
    WHERE pv.owner_user_id = sub.owner_user_id AND (pv.page_id IS NULL OR pv.page_id = '')
  `);

  await pool.query('DELETE FROM page_versions WHERE page_id IS NULL OR page_id = \'\'');

  await pool.query(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'page_versions' AND c.contype = 'u'
      LOOP
        EXECUTE format('ALTER TABLE page_versions DROP CONSTRAINT IF EXISTS %I', r.conname);
      END LOOP;
    END $$;
  `);

  await pool.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_page_versions_page_id_version ON page_versions(page_id, version_number)'
  );
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_page_versions_owner_created ON page_versions(owner_user_id, created_at DESC)'
  );
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_page_versions_page_id ON page_versions(page_id)'
  );

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
  return { changes: result.rowCount, row: result.rows?.[0] || null };
}

module.exports = { pool, initDatabase, query, get, run };

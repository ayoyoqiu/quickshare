const { run, get, query } = require('./db');
const CryptoJS = require('crypto-js');

function generateRandomPassword() {
  const chars = '0123456789';
  let password = '';
  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }
  return password;
}

/**
 * 创建新页面（匿名 / 旧逻辑）
 */
async function createPage(htmlContent, isProtected = false, codeType = 'html') {
  const timestamp = new Date().getTime().toString();
  const hash = CryptoJS.MD5(htmlContent + timestamp).toString();
  const urlId = hash.substring(0, 7);
  const password = generateRandomPassword();

  await run(
    'INSERT INTO pages (id, html_content, created_at, password, is_protected, code_type) VALUES ($1, $2, $3, $4, $5, $6)',
    [urlId, htmlContent, Date.now(), password, isProtected ? 1 : 0, codeType]
  );

  return { urlId, password };
}

async function generateUniquePageId() {
  for (let attempt = 0; attempt < 12; attempt++) {
    const urlId = CryptoJS.MD5(Date.now().toString() + Math.random().toString(36)).toString().substring(0, 7);
    const existing = await get('SELECT 1 AS x FROM pages WHERE id = $1', [urlId]);
    if (!existing) return urlId;
  }
  throw new Error('ID生成失败');
}

async function getNextVersionNumberForPage(pageId) {
  const row = await get(
    'SELECT COALESCE(MAX(version_number), 0) + 1 AS n FROM page_versions WHERE page_id = $1',
    [pageId]
  );
  return row ? Number(row.n) : 1;
}

async function appendPageVersion(pageId, ownerUserId, htmlContent, codeType, isProtected, password, now) {
  const versionNumber = await getNextVersionNumberForPage(pageId);
  await run(
    `INSERT INTO page_versions (page_id, owner_user_id, version_number, html_content, code_type, is_protected, page_password, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [pageId, ownerUserId, versionNumber, htmlContent, codeType, isProtected ? 1 : 0, password, now]
  );
  return versionNumber;
}

function resolvePasswordForSave(existing, isProtected) {
  if (isProtected) {
    if (existing && Number(existing.is_protected) === 1 && existing.password) {
      return existing.password;
    }
    return generateRandomPassword();
  }
  return existing?.password || generateRandomPassword();
}

/**
 * 新建项目（新独立分享链接）
 */
async function createUserProject(userId, htmlContent, isProtected = false, codeType = 'html') {
  const pageId = await generateUniquePageId();
  const password = resolvePasswordForSave(null, isProtected);
  const now = Date.now();

  await run(
    `INSERT INTO pages (id, html_content, created_at, password, is_protected, code_type, owner_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [pageId, htmlContent, now, password, isProtected ? 1 : 0, codeType, userId]
  );

  const versionNumber = await appendPageVersion(
    pageId,
    userId,
    htmlContent,
    codeType,
    isProtected,
    password,
    now
  );

  return {
    pageId,
    password: isProtected ? password : '',
    userId,
    versionNumber,
    isProtected: !!isProtected
  };
}

/**
 * 更新已有项目（链接 id 不变）
 */
async function updateUserProject(userId, pageId, htmlContent, isProtected = false, codeType = 'html') {
  const existing = await get(
    'SELECT id, password, is_protected FROM pages WHERE id = $1 AND owner_user_id = $2',
    [pageId, userId]
  );
  if (!existing) {
    const err = new Error('PAGE_NOT_FOUND');
    err.code = 'PAGE_NOT_FOUND';
    throw err;
  }

  const password = resolvePasswordForSave(existing, isProtected);
  const now = Date.now();

  await run(
    `UPDATE pages SET
       html_content = $1,
       created_at = $2,
       password = $3,
       is_protected = $4,
       code_type = $5
     WHERE id = $6 AND owner_user_id = $7`,
    [htmlContent, now, password, isProtected ? 1 : 0, codeType, pageId, userId]
  );

  const versionNumber = await appendPageVersion(
    pageId,
    userId,
    htmlContent,
    codeType,
    isProtected,
    password,
    now
  );

  return {
    pageId,
    password: isProtected ? password : '',
    userId,
    versionNumber,
    isProtected: !!isProtected
  };
}

/** 兼容旧版：单用户单页 u-{userId} */
async function upsertUserPage(userId, htmlContent, isProtected = false, codeType = 'html') {
  const legacyId = `u-${userId}`;
  const existing = await get('SELECT id FROM pages WHERE id = $1', [legacyId]);
  if (existing) {
    return updateUserProject(userId, legacyId, htmlContent, isProtected, codeType);
  }
  const pageId = legacyId;
  const password = resolvePasswordForSave(null, isProtected);
  const now = Date.now();

  await run(
    `INSERT INTO pages (id, html_content, created_at, password, is_protected, code_type, owner_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [pageId, htmlContent, now, password, isProtected ? 1 : 0, codeType, userId]
  );

  const versionNumber = await appendPageVersion(
    pageId,
    userId,
    htmlContent,
    codeType,
    isProtected,
    password,
    now
  );

  return {
    pageId,
    password: isProtected ? password : '',
    userId,
    versionNumber,
    isProtected: !!isProtected
  };
}

async function getPageById(id) {
  return get('SELECT * FROM pages WHERE id = $1', [id]);
}

async function getRecentPages(limit = 10) {
  return query(
    'SELECT id, created_at FROM pages ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
}

async function getPageByUserId(userId) {
  return get(
    'SELECT * FROM pages WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
}

async function listUserProjects(userId, limit = 50) {
  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  return query(
    `SELECT id, created_at, is_protected, display_name,
            SUBSTRING(html_content FROM 1 FOR 120) AS preview
     FROM pages
     WHERE owner_user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, lim]
  );
}

const DISPLAY_NAME_MAX = 80;

async function renameUserProject(userId, pageId, rawName) {
  const page = await getUserProject(userId, pageId);
  if (!page) {
    const err = new Error('PAGE_NOT_FOUND');
    err.code = 'PAGE_NOT_FOUND';
    throw err;
  }
  const trimmed = String(rawName ?? '').trim().slice(0, DISPLAY_NAME_MAX);
  const value = trimmed.length ? trimmed : null;
  await run(
    'UPDATE pages SET display_name = $1 WHERE id = $2 AND owner_user_id = $3',
    [value, pageId, userId]
  );
  return { pageId, displayName: trimmed };
}

async function getUserProject(userId, pageId) {
  return get(
    'SELECT * FROM pages WHERE id = $1 AND owner_user_id = $2',
    [pageId, userId]
  );
}

async function updateUserPageProtection(userId, pageId, isProtected) {
  const page = await getUserProject(userId, pageId);
  if (!page) {
    const err = new Error('PAGE_NOT_FOUND');
    err.code = 'PAGE_NOT_FOUND';
    throw err;
  }

  let password = page.password;
  if (isProtected) {
    if (!password || Number(page.is_protected) !== 1) {
      password = generateRandomPassword();
    }
  }

  await run(
    'UPDATE pages SET is_protected = $1, password = $2 WHERE id = $3 AND owner_user_id = $4',
    [isProtected ? 1 : 0, password, pageId, userId]
  );

  return {
    pageId,
    isProtected: !!isProtected,
    password: isProtected ? password : ''
  };
}

async function listPageVersions(userId, pageId, limit = 30) {
  const lim = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
  return query(
    `SELECT pv.version_number, pv.created_at, pv.is_protected,
            SUBSTRING(pv.html_content FROM 1 FOR 160) AS preview
     FROM page_versions pv
     INNER JOIN pages p ON p.id = pv.page_id
     WHERE p.owner_user_id = $1 AND pv.page_id = $2
     ORDER BY pv.version_number DESC
     LIMIT $3`,
    [userId, pageId, lim]
  );
}

async function getPageVersion(userId, pageId, versionNumber) {
  return get(
    `SELECT pv.version_number, pv.html_content, pv.code_type, pv.is_protected, pv.page_password, pv.created_at
     FROM page_versions pv
     INNER JOIN pages p ON p.id = pv.page_id
     WHERE p.owner_user_id = $1 AND pv.page_id = $2 AND pv.version_number = $3`,
    [userId, pageId, versionNumber]
  );
}

async function restorePageVersion(userId, pageId, versionNumber) {
  const v = await getPageVersion(userId, pageId, versionNumber);
  if (!v) {
    const err = new Error('VERSION_NOT_FOUND');
    err.code = 'VERSION_NOT_FOUND';
    throw err;
  }

  const now = Date.now();
  const pwd = v.page_password || generateRandomPassword();

  await run(
    `UPDATE pages SET
       html_content = $1,
       created_at = $2,
       password = $3,
       is_protected = $4,
       code_type = $5
     WHERE id = $6 AND owner_user_id = $7`,
    [v.html_content, now, pwd, v.is_protected, v.code_type || 'html', pageId, userId]
  );

  const newVersionNumber = await appendPageVersion(
    pageId,
    userId,
    v.html_content,
    v.code_type || 'html',
    v.is_protected,
    pwd,
    now
  );

  return { restoredFrom: versionNumber, newVersionNumber, userId, pageId };
}

async function countPageVersions(userId, pageId) {
  const row = await get(
    `SELECT COUNT(*)::int AS c
     FROM page_versions pv
     INNER JOIN pages p ON p.id = pv.page_id
     WHERE p.owner_user_id = $1 AND pv.page_id = $2`,
    [userId, pageId]
  );
  return row ? row.c : 0;
}

async function countUserProjects(userId) {
  const row = await get(
    'SELECT COUNT(*)::int AS c FROM pages WHERE owner_user_id = $1',
    [userId]
  );
  return row ? row.c : 0;
}

module.exports = {
  createPage,
  getPageById,
  getRecentPages,
  upsertUserPage,
  createUserProject,
  updateUserProject,
  getPageByUserId,
  listUserProjects,
  getUserProject,
  updateUserPageProtection,
  listPageVersions,
  getPageVersion,
  restorePageVersion,
  countPageVersions,
  countUserProjects,
  renameUserProject
};

const express = require('express');
const router = express.Router();
const {
  getPageById,
  getRecentPages,
  updateUserPageProtection,
  listPageVersions,
  getPageVersion,
  restorePageVersion,
  countPageVersions,
  listUserProjects,
  countUserProjects,
  getUserProject,
  renameUserProject
} = require('../models/pages');
const { isAuthenticated } = require('../middleware/auth');

/**
 * 当前用户的项目列表（每个项目一条独立分享链接）
 * GET /api/pages/me/projects
 */
router.get('/me/projects', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const limit = parseInt(req.query.limit, 10) || 50;
    const projects = await listUserProjects(userId, limit);

    res.json({
      success: true,
      projects
    });
  } catch (error) {
    console.error('获取项目列表API错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * 重命名项目（展示名，不影响分享链接 id）
 * PATCH /api/pages/me/project/:pageId/rename  body: { displayName }
 */
router.patch('/me/project/:pageId/rename', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { pageId } = req.params;
    const { displayName } = req.body || {};
    const result = await renameUserProject(userId, String(pageId).trim(), displayName);
    res.json({
      success: true,
      pageId: result.pageId,
      displayName: result.displayName
    });
  } catch (error) {
    if (error.code === 'PAGE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }
    console.error('重命名项目API错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * 单个项目详情（载入编辑器）
 * GET /api/pages/me/project/:pageId
 */
router.get('/me/project/:pageId', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { pageId } = req.params;
    const page = await getUserProject(userId, pageId);

    if (!page) {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }

    res.json({
      success: true,
      page: {
        id: page.id,
        htmlContent: page.html_content,
        codeType: page.code_type,
        isProtected: page.is_protected === 1,
        createdAt: page.created_at,
        displayName: page.display_name || ''
      }
    });
  } catch (error) {
    console.error('获取项目详情API错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * 资产摘要
 * GET /api/pages/me/asset
 */
router.get('/me/asset', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const projectCount = await countUserProjects(userId);

    res.json({
      success: true,
      asset: {
        userId,
        projectCount
      }
    });
  } catch (error) {
    console.error('获取资产摘要API错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * 版本历史列表（需 query: pageId）
 * GET /api/pages/me/versions?pageId=xxx
 */
router.get('/me/versions', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const pageId = req.query.pageId;
    if (!pageId || !String(pageId).trim()) {
      return res.status(400).json({ success: false, error: '请指定 pageId' });
    }

    const page = await getUserProject(userId, String(pageId).trim());
    if (!page) {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }

    const limit = parseInt(req.query.limit, 10) || 30;
    const versions = await listPageVersions(userId, String(pageId).trim(), limit);

    res.json({
      success: true,
      versions
    });
  } catch (error) {
    console.error('获取版本列表API错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * 某一版本的完整内容（载入编辑器）
 * GET /api/pages/me/versions/:versionNumber?pageId=xxx
 */
router.get('/me/versions/:versionNumber', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const pageId = req.query.pageId;
    const versionNumber = parseInt(req.params.versionNumber, 10);

    if (!pageId || !String(pageId).trim()) {
      return res.status(400).json({ success: false, error: '请指定 pageId' });
    }
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      return res.status(400).json({ success: false, error: '无效的版本号' });
    }

    const v = await getPageVersion(userId, String(pageId).trim(), versionNumber);
    if (!v) {
      return res.status(404).json({ success: false, error: '版本不存在' });
    }

    res.json({
      success: true,
      version: {
        versionNumber: v.version_number,
        htmlContent: v.html_content,
        codeType: v.code_type,
        isProtected: v.is_protected === 1,
        createdAt: v.created_at
      }
    });
  } catch (error) {
    console.error('获取版本详情API错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * 将历史版本恢复为当前线上内容（并记入新版本）
 * POST /api/pages/me/versions/:versionNumber/restore  body: { pageId }
 */
router.post('/me/versions/:versionNumber/restore', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { pageId } = req.body || {};
    const versionNumber = parseInt(req.params.versionNumber, 10);

    if (!pageId || !String(pageId).trim()) {
      return res.status(400).json({ success: false, error: '请指定 pageId' });
    }
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      return res.status(400).json({ success: false, error: '无效的版本号' });
    }

    const result = await restorePageVersion(userId, String(pageId).trim(), versionNumber);
    const shareUrl = `${req.protocol}://${req.get('host')}/view/${result.pageId}`;

    res.json({
      success: true,
      restoredFrom: result.restoredFrom,
      newVersionNumber: result.newVersionNumber,
      shareUrl,
      pageId: result.pageId
    });
  } catch (error) {
    if (error.code === 'VERSION_NOT_FOUND') {
      return res.status(404).json({ success: false, error: '版本不存在' });
    }
    console.error('恢复版本API错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * 最近页面（管理用）
 * GET /api/pages/list/recent
 */
router.get('/list/recent', isAuthenticated, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const pages = await getRecentPages(limit);

    res.json({
      success: true,
      pages
    });
  } catch (error) {
    console.error('获取最近页面API错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误',
      details: error.message
    });
  }
});

/**
 * 更新指定项目的访问保护
 * POST /api/pages/me/protect  body: { pageId, isProtected }
 */
router.post('/me/protect', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { pageId, isProtected } = req.body || {};

    if (!pageId || !String(pageId).trim()) {
      return res.status(400).json({ success: false, error: '请指定 pageId' });
    }

    await updateUserPageProtection(userId, String(pageId).trim(), !!isProtected);

    res.json({
      success: true,
      message: '保护状态更新成功'
    });
  } catch (error) {
    if (error.code === 'PAGE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }
    console.error('更新保护状态API错误:', error);
    res.status(500).json({
      success: false,
      error: '更新保护状态失败'
    });
  }
});

/**
 * 获取页面信息
 * GET /api/pages/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const page = await getPageById(id);

    if (!page) {
      return res.status(404).json({
        success: false,
        error: '页面不存在'
      });
    }

    res.json({
      success: true,
      page: {
        id: page.id,
        createdAt: page.created_at
      }
    });
  } catch (error) {
    console.error('获取页面API错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误',
      details: error.message
    });
  }
});

module.exports = router;

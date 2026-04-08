const express = require('express');
const router = express.Router();
const { createPage, getPageById, getRecentPages } = require('../models/pages');
const { run } = require('../models/db');

// 创建页面的路由已移至 app.js，并添加了认证中间件

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

/**
 * 获取最近页面列表
 * GET /api/pages/list/recent
 */
router.get('/list/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
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
 * 更新页面的保护状态
 * POST /api/pages/:id/protect
 */
router.post('/:id/protect', async (req, res) => {
  try {
    const { id } = req.params;
    const { isProtected } = req.body;

    // 检查页面是否存在
    const page = await getPageById(id);
    if (!page) {
      return res.status(404).json({
        success: false,
        error: '页面不存在'
      });
    }

    // 更新保护状态
    await run(
      'UPDATE pages SET is_protected = $1 WHERE id = $2',
      [isProtected ? 1 : 0, id]
    );

    res.json({
      success: true,
      message: '保护状态更新成功'
    });
  } catch (error) {
    console.error('更新保护状态API错误:', error);
    res.status(500).json({
      success: false,
      error: '更新保护状态失败'
    });
  }
});

module.exports = router;

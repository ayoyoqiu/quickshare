/**
 * 认证中间件
 * 用于保护需要登录才能访问的路由
 */

/**
 * 检查用户是否已认证
 * 如果未认证，重定向到登录页面
 */
function isAuthenticated(req, res, next) {
  if (!req.app.locals.config.authEnabled) {
    return next();
  }

  if (req.session && req.session.user && req.session.user.id) {
    return next();
  }

  if (req.path.startsWith('/api/')) {
    return res.status(401).json({
      success: false,
      error: '请先登录'
    });
  }

  res.redirect('/login');
}

module.exports = {
  isAuthenticated
};

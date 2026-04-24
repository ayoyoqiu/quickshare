// 加载环境变量（优先读取 .env.local，兼容本地与线上）
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local'), override: true });

const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { initDatabase, pool } = require('./models/db');

// 导入认证中间件
const { isAuthenticated } = require('./middleware/auth');
const { createUser, findUserByUsername, verifyPassword } = require('./models/users');

// 导入配置
const config = require('./config');

// 路由导入
const pagesRoutes = require('./routes/pages');

// 初始化应用
const app = express();
// Vercel/反向代理环境下，允许正确识别 HTTPS，以便设置 secure cookie
app.set('trust proxy', 1);
// 优先使用环境变量 PORT（Railway 会动态注入），其次用配置文件端口
const PORT = process.env.PORT || config.port;

// 将配置添加到应用本地变量中，便于在中间件中访问
app.locals.config = config;

// 中间件设置
app.use(morgan(config.logLevel)); // 使用配置文件中的日志级别
app.use(cors()); // 跨域支持
app.use(bodyParser.json({ limit: '15mb' })); // JSON 解析，增加限制为15MB
app.use(bodyParser.urlencoded({ extended: true, limit: '15mb' })); // 增加限制为15MB
app.use(cookieParser()); // 解析 Cookie
app.use(express.static(path.join(__dirname, 'public'))); // 静态文件

// 使用 PostgreSQL 存储会话（支持 Vercel 无状态环境）
app.use(session({
  store: new pgSession({
    pool,
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'html-go-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// 设置视图引擎
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 登录路由
app.get('/login', (req, res) => {
  // 如果认证功能未启用或已经登录，重定向到首页
  if (!config.authEnabled || (req.session && req.session.user?.id)) {
    return res.redirect('/');
  }

  res.render('login', {
    title: 'LinkPaste AI | 登录',
    error: null,
    mode: 'login'
  });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!config.authEnabled) {
    return res.redirect('/');
  }

  if (!username || !password) {
    res.render('login', {
      title: 'LinkPaste AI | 登录',
      error: '请输入用户名和密码',
      mode: 'login'
    });
    return;
  }

  try {
    const user = await findUserByUsername(username);
    if (!user || !verifyPassword(password, user.password_hash)) {
      res.render('login', {
        title: 'LinkPaste AI | 登录',
        error: '用户名或密码错误',
        mode: 'login'
      });
      return;
    }

    req.session.user = { id: user.id, username: user.username };
    return res.redirect('/');
  } catch (error) {
    console.error('登录错误:', error);
    res.render('login', {
      title: 'LinkPaste AI | 登录',
      error: '登录失败，请稍后重试',
      mode: 'login'
    });
  }
});

app.get('/register', (req, res) => {
  if (!config.authEnabled || (req.session && req.session.user?.id)) {
    return res.redirect('/');
  }

  res.render('login', {
    title: 'LinkPaste AI | 注册',
    error: null,
    mode: 'register'
  });
});

app.post('/register', async (req, res) => {
  if (!config.authEnabled) {
    return res.redirect('/');
  }

  const username = (req.body.username || '').trim().toLowerCase();
  const { password } = req.body;

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    res.render('login', {
      title: 'LinkPaste AI | 注册',
      error: '用户名需为 3-20 位，仅支持小写字母/数字/下划线',
      mode: 'register'
    });
    return;
  }

  if (!password || password.length < 8) {
    res.render('login', {
      title: 'LinkPaste AI | 注册',
      error: '密码至少 8 位',
      mode: 'register'
    });
    return;
  }

  try {
    const user = await createUser(username, password);
    req.session.user = { id: user.id, username: user.username };
    return res.redirect('/');
  } catch (error) {
    console.error('注册错误:', error);
    const duplicated = String(error.message || '').includes('duplicate key');
    res.render('login', {
      title: 'LinkPaste AI | 注册',
      error: duplicated ? '用户名已存在，请更换' : '注册失败，请稍后重试',
      mode: 'register'
    });
  }
});

// 退出登录路由
app.get('/logout', (req, res) => {
  // 清除会话
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// API 路由设置
// 将 API 路由分为两部分：需要认证的和不需要认证的

// 导入路由处理函数
const { createUserProject, updateUserProject, getPageById, getPageByUserId } = require('./models/pages');

// 创建 / 更新项目（有 pageId 则更新该链接对应项目，否则新建独立链接）
app.post('/api/pages/create', isAuthenticated, async (req, res) => {
  try {
    const { pageId: bodyPageId, htmlContent, isProtected, codeType } = req.body;
    const userId = req.session.user.id;

    if (!htmlContent) {
      return res.status(400).json({
        success: false,
        error: '请提供HTML内容'
      });
    }

    const ct = codeType || 'html';
    let result;
    if (bodyPageId && String(bodyPageId).trim()) {
      result = await updateUserProject(userId, String(bodyPageId).trim(), htmlContent, isProtected, ct);
    } else {
      result = await createUserProject(userId, htmlContent, isProtected, ct);
    }

    const shareUrl = `${req.protocol}://${req.get('host')}/view/${result.pageId}`;

    res.json({
      success: true,
      pageId: result.pageId,
      userId: result.userId,
      shareUrl,
      password: result.password,
      isProtected: result.isProtected,
      versionNumber: result.versionNumber
    });
  } catch (error) {
    if (error.code === 'PAGE_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: '项目不存在或无权编辑'
      });
    }
    console.error('创建页面API错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误',
      details: error.message
    });
  }
});

// 其他 API 不需要认证
app.use('/api/pages', pagesRoutes);

// 密码验证路由 - 用于AJAX验证
app.get('/validate-password/:id', async (req, res) => {
  try {
    const { getPageById } = require('./models/pages');
    const { id } = req.params;
    const { password } = req.query;

    if (!password) {
      return res.json({ valid: false });
    }

    const page = await getPageById(id);

    if (!page) {
      return res.json({ valid: false });
    }

    // 检查密码是否正确
    const isValid = page.is_protected === 1 && password === page.password;

    return res.json({ valid: isValid });
  } catch (error) {
    console.error('密码验证错误:', error);
    return res.status(500).json({ valid: false, error: '服务器错误' });
  }
});

// 首页路由 - 需要登录才能访问
app.get('/', isAuthenticated, (req, res) => {
  res.render('index', { title: 'LinkPaste AI | 粘贴 AI 灵感，分享无限可能' });
});

app.get('/projects', isAuthenticated, (req, res) => {
  res.render('projects', { title: 'LinkPaste AI | 我的项目' });
});

// 导入代码类型检测和内容渲染工具
const { detectCodeType, CODE_TYPES } = require('./utils/codeDetector');
const { renderContent } = require('./utils/contentRenderer');

async function renderSharedPage(req, res, page) {
  // 检查是否需要密码验证
  if (page.is_protected === 1) {
    const { password } = req.query;

    // 如果没有提供密码或密码不正确，显示密码输入页面
    if (!password || password !== page.password) {
      return res.render('password', {
        title: 'LinkPaste AI | 密码保护',
        id: req.params.id || req.params.userId,
        error: password ? '密码错误，请重试' : null
      });
    }
  }

  // 始终重新检测内容类型，确保正确渲染
  const validTypes = ['html', 'markdown', 'svg', 'mermaid'];

  // 打印原始内容的前100个字符，帮助调试
  console.log(`原始内容前100字符: ${page.html_content.substring(0, 100)}...`);

  // 先用类型检测判断内容类型
  let detectedType = detectCodeType(page.html_content);

  // 安全检查: 如果内容以 <!DOCTYPE html> 或 <html 开头，强制识别为 HTML
  if (page.html_content.trim().startsWith('<!DOCTYPE html>') ||
      page.html_content.trim().startsWith('<html')) {
    detectedType = 'html';
    console.log('[DEBUG] 强制识别为完整HTML文档');
  }

  let processedContent = page.html_content;

  // Markdown 内容直接渲染，不做代码块提取（否则文档里的代码块会被拆散）
  if (detectedType !== 'markdown') {
    // 导入代码块提取函数，仅对非 Markdown 内容处理
    const { extractCodeBlocks } = require('./utils/codeDetector');
    const codeBlocks = extractCodeBlocks(page.html_content);

    if (codeBlocks.length > 0) {
      console.log(`[DEBUG] 找到${codeBlocks.length}个代码块`);

      // 如果只有一个代码块且几乎占据全部内容，直接使用该代码块的内容和类型
      if (codeBlocks.length === 1 &&
          codeBlocks[0].content.length > page.html_content.length * 0.7) {
        processedContent = codeBlocks[0].content;
        detectedType = codeBlocks[0].type;
        console.log(`[DEBUG] 使用单个代码块内容，类型: ${detectedType}`);
      }
      // 多个代码块：检查是否是纯 Mermaid
      else if (codeBlocks.length > 1) {
        // 检查是否是纯 Mermaid 语法
        const mermaidPatterns = [
          /^\s*graph\s+[A-Za-z\s]/i,
          /^\s*flowchart\s+[A-Za-z\s]/i,
          /^\s*sequenceDiagram/i,
          /^\s*classDiagram/i,
          /^\s*gantt/i,
          /^\s*pie/i,
          /^\s*erDiagram/i,
          /^\s*journey/i,
          /^\s*stateDiagram/i,
          /^\s*gitGraph/i
        ];
        const trimmedContent = page.html_content.trim();
        const isPureMermaid = mermaidPatterns.some(p => p.test(trimmedContent));
        if (isPureMermaid) {
          detectedType = 'mermaid';
          console.log('[DEBUG] 检测到纯 Mermaid 语法');
        }
        // 其他多代码块情况保持原始内容，按原类型渲染
      }
    } else {
      // 检查是否是纯 Mermaid 语法
      const mermaidPatterns = [
        /^\s*graph\s+[A-Za-z\s]/i,
        /^\s*flowchart\s+[A-Za-z\s]/i,
        /^\s*sequenceDiagram/i,
        /^\s*classDiagram/i,
        /^\s*gantt/i,
        /^\s*pie/i,
        /^\s*erDiagram/i,
        /^\s*journey/i,
        /^\s*stateDiagram/i,
        /^\s*gitGraph/i
      ];
      const trimmedContent = page.html_content.trim();
      const isPureMermaid = mermaidPatterns.some(p => p.test(trimmedContent));
      if (isPureMermaid) {
        detectedType = 'mermaid';
        console.log('[DEBUG] 检测到纯 Mermaid 语法，强制设置为 mermaid 类型');
      }
    }
  }

  console.log(`检测到的内容类型: ${detectedType}`);
  console.log(`数据库中的内容类型: ${page.code_type}`);

  // 使用检测到的类型，确保正确渲染
  const contentType = validTypes.includes(detectedType) ? detectedType : 'html';

  // 根据不同的内容类型进行渲染
  const renderedContent = await renderContent(processedContent, contentType);

  // 在渲染内容中添加代码类型信息
  // 使用正则表达式在 head 标签结束前添加一个元数据标签
  const contentWithTypeInfo = renderedContent.replace(
    '</head>',
    `<meta name="code-type" content="${contentType}">
</head>`
  );

  // 返回渲染后的内容
  return res.send(contentWithTypeInfo);
}

// 查看页面路由 - 无需登录即可访问（兼容旧链接）
app.get('/view/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const page = await getPageById(id);

    if (!page) {
      return res.status(404).render('error', {
        title: '页面未找到',
        message: '您请求的页面不存在或已被删除'
      });
    }

    return await renderSharedPage(req, res, page);
  } catch (error) {
    console.error('查看页面错误:', error);
    res.status(500).render('error', {
      title: '服务器错误',
      message: '查看页面时发生错误，请稍后再试'
    });
  }
});

app.get('/u/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(404).render('error', {
        title: '页面未找到',
        message: '链接无效'
      });
    }

    const page = await getPageByUserId(userId);
    if (!page) {
      return res.status(404).render('error', {
        title: '页面未找到',
        message: '该用户尚未发布内容'
      });
    }

    return await renderSharedPage(req, res, page);
  } catch (error) {
    console.error('查看页面错误:', error);
    res.status(500).render('error', {
      title: '服务器错误',
      message: '查看页面时发生错误，请稍后再试'
    });
  }
});

// 错误处理
app.use((req, res) => {
  res.status(404).render('error', {
    title: '页面未找到',
    message: '您请求的页面不存在'
  });
});

// 数据库初始化（与 app.listen 解耦，Vercel 无服务器环境也能正常运行）
const dbReady = initDatabase()
  .then(() => {
    console.log('数据库初始化成功');
    console.log(`当前环境: ${process.env.NODE_ENV}`);
  })
  .catch(err => {
    console.error('数据库初始化失败:', err);
  });

// 非 Vercel 环境才启动 HTTP 监听
if (!process.env.VERCEL) {
  dbReady.then(() => {
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
      console.log('已注册的路由:');
      app._router.stack.forEach(middleware => {
        if (middleware.route) {
          console.log(`${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
        }
      });
    });
  });
}

module.exports = app;

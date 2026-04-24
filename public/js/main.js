// HTML-GO 主要JavaScript文件
// 处理所有用户交互和功能

// ============================================================
// Markdown 12种主题配置（首页选择器用）
// ============================================================
const MD_THEMES = [
  { id: 'bytedance', label: '科技蓝', colors: ['#1677ff', '#05d4cd'] },
  { id: 'lavender',  label: '梦幻紫', colors: ['#9B8EC7', '#BDA6CE', '#F2EAE0'] },
  { id: 'forest',    label: '自然绿', colors: ['#9AB17A', '#C3CC9B', '#FBE8CE'] },
  { id: 'aqua',      label: '清空蓝', colors: ['#71C9CE', '#A6E3E9', '#E3FDFD'] },
  { id: 'ocean',     label: '商务蓝', colors: ['#3F72AF', '#112D4E', '#DBE2EF'] },
  { id: 'sakura',    label: '樱花粉', colors: ['#e8709a', '#F2BED1', '#F9F5F6'] },
  { id: 'mist',      label: '海雾',   colors: ['#6096B4', '#93BFCF', '#EEE9DA'] },
  { id: 'midnight',  label: '星夜',   colors: ['#FF85BB', '#FFCEE3', '#021A54'] },
  { id: 'geek',      label: '极客黑', colors: ['#00ADB5', '#393E46', '#222831'] },
  { id: 'peach',     label: '蜜桃橙', colors: ['#FF9494', '#FFD1D1', '#FFF5E4'] },
  { id: 'rose',      label: '玫瑰紫', colors: ['#8785A2', '#FFC7C7', '#F6F6F6'] },
  { id: 'dream',     label: '梦境紫', colors: ['#424874', '#A6B1E1', '#F4EEFF'] },
];

// 当前首页选中的 Markdown 风格（默认 bytedance）
let selectedMdTheme = localStorage.getItem('md-theme') || 'bytedance';
if (!MD_THEMES.find(t => t.id === selectedMdTheme)) selectedMdTheme = 'bytedance';

function buildSwatchStyle(colors) {
  if (colors.length === 1) return 'background:' + colors[0];
  const stops = colors.map((c, i) => c + ' ' + Math.round(i * 100 / (colors.length - 1)) + '%').join(',');
  return 'background:linear-gradient(135deg,' + stops + ')';
}

function renderMdThemeSelector() {
  const container = document.getElementById('md-theme-swatches');
  if (!container) return;
  container.innerHTML = MD_THEMES.map(t => `
    <div class="md-swatch-item${t.id === selectedMdTheme ? ' active' : ''}" data-theme-id="${t.id}" title="${t.label}">
      <div class="md-swatch-circle" style="${buildSwatchStyle(t.colors)}"></div>
      <span class="md-swatch-name">${t.label}</span>
    </div>
  `).join('');

  container.querySelectorAll('.md-swatch-item').forEach(el => {
    el.addEventListener('click', () => {
      selectedMdTheme = el.dataset.themeId;
      localStorage.setItem('md-theme', selectedMdTheme);
      container.querySelectorAll('.md-swatch-item').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
    });
  });
}

// 错误提示功能
function showErrorToast(message) {
  const errorToast = document.getElementById('error-toast');
  const errorMessage = document.getElementById('error-message');
  if (errorToast && errorMessage) {
    errorMessage.textContent = message;
    errorToast.classList.add('show');
    
    setTimeout(() => {
      errorToast.classList.remove('show');
    }, 3000);
  } else {
    console.error('错误提示元素不存在:', message);
  }
}

// 成功提示功能
function showSuccessToast(message) {
  const successToast = document.getElementById('success-toast');
  const successMessage = document.getElementById('success-message');
  if (successToast && successMessage) {
    successMessage.textContent = message;
    successToast.classList.add('show');
    
    setTimeout(() => {
      successToast.classList.remove('show');
    }, 3000);
  } else {
    console.error('成功提示元素不存在:', message);
  }
}

// 使用延迟加载确保所有元素已经完全渲染好
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('generate-button')) {
    return;
  }

  console.log('DOM完全加载，初始化应用...');

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // DOM 元素
  const htmlInput = document.getElementById('html-input');
  const fileInput = document.getElementById('html-file');
  const codeInputContainer = document.getElementById('code-input-container');
  const fileName = document.getElementById('file-name');
  const clearButton = document.getElementById('clear-button');
  const generateButton = document.getElementById('generate-button');
  const resultSection = document.getElementById('result-section');
  const resultUrl = document.getElementById('result-url');
  const copyButton = document.getElementById('copy-button');
  const previewButton = document.getElementById('preview-button');
  const loadingIndicator = document.getElementById('loading-indicator');
  const passwordToggle = document.getElementById('password-toggle');
  const passwordInfo = document.getElementById('password-info');
  const generatedPassword = document.getElementById('generated-password');
  const copyPasswordOnly = document.getElementById('copy-password-button');
  const copyPasswordLink = document.getElementById('copy-password-link');
  const editorModeText = document.getElementById('editor-mode-text');
  const exitEditModeBtn = document.getElementById('exit-edit-mode-btn');
  
  // 创建代码编辑器
  let codeElement = null;
  let highlightEnabled = true;
  
  // 初始化代码编辑器 - 简化版本，不使用双层结构
  function initCodeEditor() {
    if (htmlInput && codeInputContainer) {
      console.log('初始化简化版代码编辑器');
      
      // 不创建额外的代码元素，直接使用 textarea
      htmlInput.style.fontFamily = 'monospace';
      htmlInput.style.fontSize = '14px';
      htmlInput.style.lineHeight = '1.5';
      htmlInput.style.color = 'var(--text-primary)';
      htmlInput.style.backgroundColor = 'var(--bg-input)';
      htmlInput.style.border = '1px solid var(--border-color)';
      htmlInput.style.borderRadius = '8px';
      htmlInput.style.padding = '15px';
      htmlInput.style.boxSizing = 'border-box';
      htmlInput.style.width = '100%';
      htmlInput.style.minHeight = '200px';
      htmlInput.style.maxHeight = '500px';
      htmlInput.style.overflow = 'auto';
      htmlInput.style.whiteSpace = 'pre-wrap';
      htmlInput.style.wordBreak = 'break-word';
      htmlInput.style.resize = 'vertical';
      htmlInput.style.outline = 'none';
      
      // 如果有初始内容，更新代码类型指示器
      if (htmlInput.value) {
        const codeType = detectCodeType(htmlInput.value);
        updateCodeTypeIndicator(codeType, htmlInput.value);
      }
    }
  }
  
  // 显示加载指示器
  function showLoading() {
    if (loadingIndicator) {
      loadingIndicator.style.display = 'flex';
    }
  }
  
  // 隐藏加载指示器
  function hideLoading() {
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  }
  
  // 同步内容 - 简化版本，只更新代码类型指示器
  function syncToTextarea() {
    if (htmlInput) {
      // 只更新代码类型指示器
      const codeType = detectCodeType(htmlInput.value);
      updateCodeTypeIndicator(codeType, htmlInput.value);
    }
  }
  
  // 更新语法高亮 - 简化版本
  function updateHighlighting() {
    // 简化版本不需要高亮功能
    console.log('简化版本不使用语法高亮');
  }
  
  // 切换高亮状态 - 简化版本
  function toggleHighlighting() {
    // 简化版本不需要高亮功能
    console.log('简化版本不使用语法高亮切换');
  }
  
  // 格式化 URL 显示
  function formatUrl(url) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const id = path.split('/').pop();
      
      // 创建带样式的 URL 显示
      const styledPath = path.startsWith('/u/')
        ? `<span style="color: var(--primary);">/u/</span><span style="color: var(--accent); font-weight: bold;">${id}</span>`
        : `<span style="color: var(--primary);">/view/</span><span style="color: var(--accent); font-weight: bold;">${id}</span>`;
      return `<span style="color: var(--text-secondary);">${urlObj.origin}</span>${styledPath}`;
    } catch (e) {
      return url; // 如果解析失败，返回原始 URL
    }
  }

  function formatVersionTime(ts) {
    if (ts == null || ts === '') return '';
    try {
      return new Date(Number(ts)).toLocaleString('zh-CN');
    } catch (e) {
      return String(ts);
    }
  }

  function buildShareUrl(pageId, password) {
    const base = `${window.location.origin}/view/${encodeURIComponent(pageId)}`;
    if (!password) return base;
    return `${base}?password=${encodeURIComponent(password)}`;
  }

  async function copyText(text, successMsg) {
    try {
      await navigator.clipboard.writeText(text);
      showSuccessToast(successMsg);
      return;
    } catch (e) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (ok) showSuccessToast(successMsg);
        else showErrorToast('复制失败');
      } catch (err) {
        showErrorToast('复制失败');
      }
    }
  }

  async function setProjectProtection(pageId, isProtected) {
    const r = await fetch('/api/pages/me/protect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId, isProtected })
    });
    const d = await r.json();
    if (!d.success) {
      throw new Error(d.error || '设置失败');
    }
    return d;
  }

  /** 当前选中的项目 pageId；null 表示下次保存会新建独立链接 */
  let currentPageId = null;
  let currentProjectDisplayName = '';
  let lastSavedSnapshot = '';
  let hasUnsavedChanges = false;

  function refreshUnsavedState() {
    const current = htmlInput ? htmlInput.value : '';
    hasUnsavedChanges = current !== lastSavedSnapshot;
  }

  function updateEditorModeUI() {
    const isEditing = !!currentPageId;
    const title = isEditing
      ? `编辑项目：${currentProjectDisplayName || `/view/${currentPageId}`}`
      : '新建项目';
    if (editorModeText) {
      editorModeText.textContent = title;
    }
    if (generateButton) {
      generateButton.innerHTML = isEditing
        ? '<i class="fas fa-save mr-1"></i>保存当前项目'
        : '<i class="fas fa-link mr-1"></i>生成新链接';
    }
    if (exitEditModeBtn) {
      exitEditModeBtn.style.display = isEditing ? 'inline-flex' : 'none';
    }
  }

  function confirmBeforeModeSwitch(targetLabel) {
    refreshUnsavedState();
    if (!hasUnsavedChanges) return true;
    return window.confirm(`当前内容有未保存修改，切换到「${targetLabel}」后仍会保留文本，但不会自动保存。是否继续？`);
  }

  function enterNewProjectMode(showToast) {
    currentPageId = null;
    currentProjectDisplayName = '';
    lastSavedSnapshot = htmlInput ? htmlInput.value : '';
    hasUnsavedChanges = false;
    updateEditorModeUI();
    refreshProjectsPanel();
    refreshVersionsPanel(null);
    if (showToast) {
      showSuccessToast('已切换到新建模式：当前内容保留，保存时会生成新项目');
    }
  }

  function applyProjectToEditor(pagePayload, shareUrl) {
    if (!pagePayload) return;
    if (htmlInput) {
      htmlInput.value = pagePayload.htmlContent || '';
      syncToTextarea();
    }
    if (passwordToggle) {
      passwordToggle.checked = !!pagePayload.isProtected;
    }
    if (resultUrl && shareUrl) {
      const detectedForUrl = detectCodeType(htmlInput ? htmlInput.value : '');
      const themeParam = (detectedForUrl === 'markdown' && selectedMdTheme && selectedMdTheme !== 'bytedance')
        ? `?theme=${selectedMdTheme}` : '';
      const url = `${shareUrl}${themeParam}`;
      resultUrl.innerHTML = formatUrl(url);
      resultUrl.dataset.originalUrl = url;
      resultUrl.dataset.pageId = pagePayload.id || currentPageId || '';
    }
    if (resultSection) {
      resultSection.style.display = 'block';
    }
    if (generatedPassword) {
      generatedPassword.textContent = '';
    }
    if (passwordInfo) passwordInfo.style.display = 'none';
    if (copyPasswordLink) copyPasswordLink.style.display = 'none';
    lastSavedSnapshot = htmlInput ? htmlInput.value : '';
    hasUnsavedChanges = false;
    currentProjectDisplayName = (pagePayload.displayName || '').trim();
    updateEditorModeUI();
  }

  async function selectProject(pageId) {
    if (!pageId) return;
    try {
      const r = await fetch(`/api/pages/me/project/${encodeURIComponent(pageId)}`);
      const d = await r.json();
      if (!d.success || !d.page) throw new Error('加载失败');
      currentPageId = pageId;
      const origin = window.location.origin;
      const shareUrl = `${origin}/view/${d.page.id}`;
      applyProjectToEditor({ ...d.page, id: d.page.id }, shareUrl);
      await refreshVersionsPanel(pageId);
      await refreshProjectsPanel();
    } catch (e) {
      showErrorToast('加载项目失败');
      if (!currentPageId) {
        updateEditorModeUI();
      }
    }
  }

  async function refreshVersionsPanel(pageId) {
    const versionsList = document.getElementById('versions-list');
    const versionsEmpty = document.getElementById('versions-empty');
    if (!versionsList) return;

    if (!pageId) {
      versionsList.innerHTML = '';
      if (versionsEmpty) versionsEmpty.style.display = 'block';
      return;
    }

    try {
      const vRes = await fetch(`/api/pages/me/versions?limit=25&pageId=${encodeURIComponent(pageId)}`);
      const v = await vRes.json();
      const versions = (v.success && v.versions) ? v.versions : [];
      if (versionsEmpty) {
        versionsEmpty.style.display = versions.length ? 'none' : 'block';
      }

      versionsList.innerHTML = versions.map((row) => {
        const raw = row.preview || '';
        const prev = raw.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const lock = row.is_protected ? '<i class="fas fa-lock" title="该快照含访问密码"></i> ' : '';
        return `
          <div class="version-row" style="border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 12px; margin-bottom: 8px;">
            <div style="display:flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap;">
              <div>
                <strong>v${row.version_number}</strong> ${lock}<span style="color: var(--text-secondary); font-size: 0.85rem;">${formatVersionTime(row.created_at)}</span>
                <div style="margin-top: 6px; font-size: 0.8rem; color: var(--text-secondary); max-height: 3em; overflow: hidden;">${prev || '（无预览）'}</div>
              </div>
              <div style="display:flex; gap: 6px; flex-shrink: 0;">
                <button type="button" class="cyber-btn cyber-btn-secondary version-load" data-v="${row.version_number}" style="padding: 4px 10px; font-size: 0.8rem;">载入编辑</button>
                <button type="button" class="cyber-btn cyber-btn-primary version-restore" data-v="${row.version_number}" style="padding: 4px 10px; font-size: 0.8rem;">恢复线上</button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      versionsList.querySelectorAll('.version-load').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const vn = btn.getAttribute('data-v');
          try {
            const r = await fetch(`/api/pages/me/versions/${vn}?pageId=${encodeURIComponent(pageId)}`);
            const d = await r.json();
            if (!d.success || !d.version) throw new Error('加载失败');
            if (htmlInput) {
              htmlInput.value = d.version.htmlContent;
              syncToTextarea();
              showSuccessToast(`已载入 v${vn} 到编辑器`);
            }
          } catch (e) {
            showErrorToast('载入版本失败');
          }
        });
      });

      versionsList.querySelectorAll('.version-restore').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const vn = btn.getAttribute('data-v');
          if (!confirm(`确定将 v${vn} 恢复为当前线上展示内容？\n该项目的分享链接不变，并会新增一条版本记录。`)) return;
          try {
            const r = await fetch(`/api/pages/me/versions/${vn}/restore`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pageId })
            });
            const d = await r.json();
            if (!d.success) throw new Error(d.error || '恢复失败');
            showSuccessToast(`已恢复为 v${vn}，新版本号为 v${d.newVersionNumber}`);
            await selectProject(pageId);
          } catch (e) {
            showErrorToast('恢复失败');
          }
        });
      });
    } catch (e) {
      console.error('刷新版本列表失败:', e);
    }
  }

  const RECENT_PROJECTS_LIMIT = 5;

  async function renameProjectQuick(pageId, currentName) {
    const msg = '项目显示名称（最长 80 字，留空则清除自定义名称）';
    const next = window.prompt(msg, currentName || '');
    if (next === null) return;
    try {
      const r = await fetch(`/api/pages/me/project/${encodeURIComponent(pageId)}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: next })
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || '重命名失败');
      showSuccessToast(d.displayName ? '已更新名称' : '已清除自定义名称');
      await refreshProjectsPanel();
    } catch (e) {
      showErrorToast(e.message || '重命名失败');
    }
  }

  async function refreshProjectsPanel() {
    const assetMeta = document.getElementById('asset-meta');
    const projectsList = document.getElementById('projects-list');
    const projectsEmpty = document.getElementById('projects-empty');
    if (!projectsList) return;

    try {
      const [aRes, pRes] = await Promise.all([
        fetch('/api/pages/me/asset'),
        fetch(`/api/pages/me/projects?limit=${RECENT_PROJECTS_LIMIT}`)
      ]);
      const a = await aRes.json();
      const p = await pRes.json();

      if (!a.success || !p.success) return;

      const total = a.asset.projectCount;
      if (assetMeta) {
        assetMeta.textContent =
          `共 ${total} 个项目 · 下方展示最近 ${RECENT_PROJECTS_LIMIT} 条（按更新时间）。选中后可编辑保存（链接不变）；点「我的项目列表」可浏览全部并重命名。`;
      }

      const projects = p.projects || [];
      if (projectsEmpty) {
        projectsEmpty.style.display = projects.length ? 'none' : 'block';
      }

      projectsList.innerHTML = projects.map((row) => {
        const raw = row.preview || '';
        const prev = raw.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const active = currentPageId && row.id === currentPageId;
        const border = active ? '2px solid var(--accent)' : '1px solid var(--border-color)';
        const lock = row.is_protected ? '<i class="fas fa-lock" style="margin-left:6px;" title="访问密码"></i>' : '';
        const dn = row.display_name && String(row.display_name).trim() ? String(row.display_name).trim() : '';
        const titleLine = dn
          ? `<strong>${escHtml(dn)}</strong><span style="color: var(--text-secondary); font-weight: normal; font-size: 0.85rem;"> · /view/${escHtml(row.id)}</span>`
          : `<strong>/view/${escHtml(row.id)}</strong>`;
        return `
          <div class="project-row" data-page-id="${escHtml(row.id)}" style="border: ${border}; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; cursor: pointer;">
            <div style="display:flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap;">
              <div style="flex: 1; min-width: 0;">
                <div>${titleLine}${lock}</div>
                <div style="margin-top: 4px; font-size: 0.85rem; color: var(--text-secondary);">${formatVersionTime(row.created_at)}</div>
                <div style="margin-top: 6px; font-size: 0.8rem; color: var(--text-secondary); max-height: 2.6em; overflow: hidden;">${prev || '（无预览）'}</div>
              </div>
              <div style="display:flex; gap: 6px; flex-shrink: 0; align-items: center;">
                <button type="button" class="cyber-btn cyber-btn-secondary project-copy-btn" data-page-id="${escHtml(row.id)}" style="padding: 4px 10px; font-size: 0.8rem;" title="复制链接">
                  <i class="fas fa-copy"></i>
                </button>
                <button type="button" class="cyber-btn cyber-btn-secondary project-share-btn" data-page-id="${escHtml(row.id)}" style="padding: 4px 10px; font-size: 0.8rem;" title="分享链接">
                  <i class="fas fa-share-alt"></i>
                </button>
                <button type="button" class="cyber-btn cyber-btn-secondary project-protect-btn" data-page-id="${escHtml(row.id)}" data-is-protected="${row.is_protected ? '1' : '0'}" style="padding: 4px 10px; font-size: 0.8rem;" title="密码保护">
                  <i class="fas fa-shield-alt"></i>
                </button>
                <button type="button" class="cyber-btn cyber-btn-secondary project-rename-btn" data-page-id="${escHtml(row.id)}" data-display-name="${escHtml(dn)}" style="padding: 4px 10px; font-size: 0.8rem;" title="重命名">
                  <i class="fas fa-pen"></i>
                </button>
                <span class="cyber-btn cyber-btn-secondary" style="padding: 4px 10px; font-size: 0.8rem; pointer-events: none;">打开编辑</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.error('刷新项目列表失败:', e);
    }
  }

  function onProjectsListClick(ev) {
    const copyBtn = ev.target.closest('.project-copy-btn');
    if (copyBtn) {
      ev.preventDefault();
      ev.stopPropagation();
      const pid = copyBtn.getAttribute('data-page-id');
      if (pid) copyText(buildShareUrl(pid), '链接已复制');
      return;
    }

    const shareBtn = ev.target.closest('.project-share-btn');
    if (shareBtn) {
      ev.preventDefault();
      ev.stopPropagation();
      const pid = shareBtn.getAttribute('data-page-id');
      if (!pid) return;
      const url = buildShareUrl(pid);
      (async () => {
        try {
          if (navigator.share) {
            await navigator.share({
              title: 'LinkPaste 分享',
              text: '这是我的 LinkPaste 项目链接',
              url
            });
          } else {
            await copyText(url, '当前浏览器不支持原生分享，已复制链接');
          }
        } catch (err) {
          if (String(err && err.message || '').toLowerCase().includes('abort')) return;
          showErrorToast('分享失败');
        }
      })();
      return;
    }

    const protectBtn = ev.target.closest('.project-protect-btn');
    if (protectBtn) {
      ev.preventDefault();
      ev.stopPropagation();
      const pid = protectBtn.getAttribute('data-page-id');
      const protectedNow = protectBtn.getAttribute('data-is-protected') === '1';
      if (!pid) return;
      if (protectedNow && !window.confirm('确定取消该项目的访问密码保护吗？')) return;
      (async () => {
        try {
          const d = await setProjectProtection(pid, !protectedNow);
          if (d.isProtected) {
            const pwd = d.password || '';
            const plain = buildShareUrl(pid);
            const withPwd = buildShareUrl(pid, pwd);
            const text = pwd
              ? `链接: ${plain}\n密码: ${pwd}\n直达链接: ${withPwd}`
              : `链接: ${plain}`;
            await copyText(text, '已开启密码保护，并复制链接与密码');
          } else {
            showSuccessToast('已取消密码保护');
          }
          await refreshProjectsPanel();
          if (currentPageId === pid) {
            await selectProject(pid);
          }
        } catch (err) {
          showErrorToast(err.message || '设置密码保护失败');
        }
      })();
      return;
    }

    const renameBtn = ev.target.closest('.project-rename-btn');
    if (renameBtn) {
      ev.preventDefault();
      ev.stopPropagation();
      const pid = renameBtn.getAttribute('data-page-id');
      const cur = renameBtn.getAttribute('data-display-name') || '';
      if (pid) renameProjectQuick(pid, cur);
      return;
    }
    const row = ev.target.closest('.project-row');
    if (!row) return;
    const id = row.getAttribute('data-page-id');
    if (!id) return;
    if (id === currentPageId) return;
    if (!confirmBeforeModeSwitch('编辑项目')) return;
    selectProject(id);
  }

  const projectsListRoot = document.getElementById('projects-list');
  if (projectsListRoot) {
    projectsListRoot.addEventListener('click', onProjectsListClick);
  }

  async function refreshAssetPanel() {
    await refreshProjectsPanel();
    await refreshVersionsPanel(currentPageId);
  }
  
  // 文件上传处理
  if (fileInput) {
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
        showErrorToast('请上传 HTML 文件');
        return;
      }
      
      showLoading();
      fileName.textContent = file.name;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        htmlInput.value = content;
        
        // 将光标移动到文本末尾
        htmlInput.selectionStart = htmlInput.selectionEnd = content.length;
        
        // 同步到高亮区域
        syncToTextarea();
        hideLoading();
      };
      reader.readAsText(file);
    });
  }
  
  // 清除按钮功能
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      console.log('清除按钮被点击');
      if (htmlInput) {
        htmlInput.value = '';
      }
      if (fileName) {
        fileName.textContent = '';
      }
      if (resultSection) {
        resultSection.style.display = 'none';
        resultSection.classList.remove('fade-in');
      }
      // 同步到高亮区域
      syncToTextarea();
      // 显示成功提示
      showSuccessToast('内容已清除');
    });
  }
  
  // 密码开关事件监听
  if (passwordToggle) {
    passwordToggle.addEventListener('change', async () => {
      // 如果没有生成链接，则不做任何操作
      if (!resultUrl || !resultUrl.dataset.originalUrl) {
        return;
      }
      
      if (passwordToggle.checked) {
        // 显示密码区域和复制按钮
        if (passwordInfo) passwordInfo.style.display = 'block';
        if (copyPasswordLink) copyPasswordLink.style.display = 'inline-block';
        
        // 更新数据库状态为需要密码才能访问
        const pid = resultUrl.dataset.pageId;
        if (!pid) {
          showErrorToast('请先保存或选择项目');
          passwordToggle.checked = false;
          return;
        }
        try {
          await fetch('/api/pages/me/protect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pageId: pid, isProtected: true }),
          });
        } catch (error) {
          console.error('更新保护状态错误:', error);
        }
      } else {
        // 隐藏密码区域和复制按钮
        if (passwordInfo) passwordInfo.style.display = 'none';
        if (copyPasswordLink) copyPasswordLink.style.display = 'none';
        
        const pidOff = resultUrl.dataset.pageId;
        if (!pidOff) {
          return;
        }
        try {
          await fetch('/api/pages/me/protect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pageId: pidOff, isProtected: false }),
          });
        } catch (error) {
          console.error('更新保护状态错误:', error);
        }
      }
    });
  }
  
  // 代码类型检测函数
  function detectCodeType(code) {
    if (!code || typeof code !== 'string') {
      return 'html'; // 默认返回HTML而不是Markdown
    }
    
    const trimmedCode = code.trim();
    console.log('检测代码类型，前50个字符:', trimmedCode.substring(0, 50) + '...');
    
    // 检测纯Mermaid - 优先检查，因为这是最明确的格式
    if ((trimmedCode.startsWith('graph ') || 
        trimmedCode.startsWith('sequenceDiagram') || 
        trimmedCode.startsWith('classDiagram') || 
        trimmedCode.startsWith('gantt') || 
        trimmedCode.startsWith('pie') || 
        trimmedCode.startsWith('flowchart'))) {
      console.log('检测到纯Mermaid图表');
      return 'mermaid';
    }
    
    // 检测HTML - 只有明确的HTML文档才识别为HTML
    if (trimmedCode.startsWith('<!DOCTYPE html>') || 
        trimmedCode.startsWith('<html')) {
      console.log('检测到完整HTML文档');
      return 'html';
    }
    
    // 检测纯SVG - 只有当它是一个完整的SVG标签时
    if (trimmedCode.startsWith('<svg') && 
        trimmedCode.includes('</svg>') && 
        trimmedCode.includes('xmlns="http://www.w3.org/2000/svg"')) {
      console.log('检测到纯SVG');
      return 'svg';
    }
    
    // 检查是否包含明确的Markdown特征
    // 计算Markdown特征的数量和权重
    let markdownScore = 0;
    
    // 标题 (权重高)
    if (trimmedCode.includes('# ')) markdownScore += 2;
    if (trimmedCode.includes('## ')) markdownScore += 2;
    if (trimmedCode.includes('### ')) markdownScore += 2;
    
    // 列表
    if (/^-\s.+/m.test(trimmedCode)) markdownScore += 1;
    if (/^\*\s.+/m.test(trimmedCode)) markdownScore += 1;
    if (/^\d+\.\s.+/m.test(trimmedCode)) markdownScore += 1;
    
    // 代码块 (权重高)
    if (trimmedCode.includes('```')) markdownScore += 3;
    
    // 链接和图片 (权重高)
    if (/\[.+\]\(.+\)/.test(trimmedCode)) markdownScore += 2;
    if (/!\[.+\]\(.+\)/.test(trimmedCode)) markdownScore += 2;
    
    // 引用
    if (/^>\s.+/m.test(trimmedCode)) markdownScore += 2;
    
    // 表格
    if (/\|.+\|/.test(trimmedCode)) markdownScore += 2;
    
    // 格式化文本
    if (/\*\*.+\*\*/.test(trimmedCode)) markdownScore += 1;
    if (/__.+__/.test(trimmedCode)) markdownScore += 1;
    
    console.log('Markdown特征分数:', markdownScore);
    
    // 如果Markdown分数足够高，则返回Markdown
    if (markdownScore >= 3) {
      console.log('检测到Markdown内容');
      return 'markdown';
    }
    
    // 检查是否包含Markdown代码块标记
    if (trimmedCode.includes('```svg') || 
        trimmedCode.includes('```mermaid') ||
        trimmedCode.includes('```javascript') ||
        trimmedCode.includes('```python') ||
        trimmedCode.includes('```java') ||
        trimmedCode.includes('```html') ||
        trimmedCode.includes('```css')) {
      console.log('检测到Markdown代码块');
      return 'markdown';
    }
    
    // 检测纯文本 - 没有HTML标签的纯文本内容可能是Markdown
    if (!trimmedCode.includes('<') && !trimmedCode.includes('>')) {
      // 如果内容很短且没有明显的Markdown特征，可能是普通文本
      if (trimmedCode.length < 50 && markdownScore < 2) {
        console.log('检测到短纯文本，可能是HTML');
        return 'html';
      }
      console.log('检测到纯文本，可能是Markdown');
      return 'markdown';
    }
    
    // 检测HTML片段
    if (trimmedCode.startsWith('<') && 
        (trimmedCode.includes('<div') || 
         trimmedCode.includes('<p') || 
         trimmedCode.includes('<span') || 
         trimmedCode.includes('<h1') || 
         trimmedCode.includes('<body') || 
         trimmedCode.includes('<head'))) {
      console.log('检测到HTML片段');
      return 'html';
    }
    
    // 更智能的类型检测 - 处理混合内容
    // 如果包含 HTML 标签，但不是完整的 HTML 文档，我们需要进一步判断
    if (trimmedCode.includes('<') && trimmedCode.includes('>')) {
      // 计算 HTML 标签的数量
      const htmlTagsCount = (trimmedCode.match(/<\/?[a-z][\s\S]*?>/gi) || []).length;
      console.log('HTML标签数量:', htmlTagsCount);
      
      // 如果HTML标签数量很少，而Markdown特征分数较高，则可能是Markdown中嵌入了少量HTML
      if (htmlTagsCount < 5 && markdownScore >= 3) {
        console.log('检测到Markdown中嵌入了少量HTML');
        return 'markdown';
      }
      
      // 如果是SVG标签但嵌入在Markdown中
      if (trimmedCode.includes('<svg') && 
          trimmedCode.includes('</svg>') && 
          trimmedCode.includes('xmlns="http://www.w3.org/2000/svg"') &&
          markdownScore >= 3) {
        console.log('检测到Markdown中嵌入了SVG');
        return 'markdown';
      }
      
      // 如果内容中有大量HTML标签，可能是HTML
      if (htmlTagsCount > 10) {
        console.log('检测到大量HTML标签，可能是HTML');
        return 'html';
      }
      
      // 如果Markdown特征分数明显高于HTML标签数量
      if (markdownScore > htmlTagsCount * 1.5) {
        console.log('Markdown特征明显多于HTML标签');
        return 'markdown';
      }
      
      // 默认返回HTML
      console.log('默认判断为HTML');
      return 'html';
    }
    
    // 如果没有明确的特征，默认返回HTML
    console.log('没有明确特征，默认返回HTML');
    return 'html';
  }

  // 显示代码类型标记
  function updateCodeTypeIndicator(codeType, content) {
    // 获取已存在的指示器
    const indicator = document.getElementById('code-type-indicator');
    const codeTypeText = document.getElementById('code-type-text');
    
    if (!indicator || !codeTypeText) {
      console.error('代码类型指示器元素不存在');
      return;
    }
    
    // 如果没有内容，隐藏指示器
    if (!content || content.trim() === '') {
      indicator.style.display = 'none';
      return;
    } else {
      indicator.style.display = 'flex';
    }
    
    // 根据代码类型设置样式和图标
    let iconClass = '';
    let label = '';
    let className = '';
    
    switch(codeType) {
      case 'html':
        iconClass = 'fas fa-code';
        label = 'HTML';
        className = 'html-type';
        break;
      case 'markdown':
        iconClass = 'fab fa-markdown';
        label = 'Markdown';
        className = 'markdown-type';
        break;
      case 'svg':
        iconClass = 'fas fa-bezier-curve';
        label = 'SVG';
        className = 'svg-type';
        break;
      case 'mermaid':
        iconClass = 'fas fa-project-diagram';
        label = 'Mermaid';
        className = 'mermaid-type';
        break;
      default:
        iconClass = 'fas fa-code';
        label = 'Code';
        className = 'default-type';
    }
    
    // 更新指示器类名
    indicator.className = `code-type-indicator ${className}`;
    
    // 更新图标和文本
    const iconElement = indicator.querySelector('i');
    if (iconElement) {
      iconElement.className = iconClass;
    }
    
    // 更新文本
    codeTypeText.textContent = label;

    // 显示/隐藏 Markdown 风格选择器
    const mdThemeSelector = document.getElementById('md-theme-selector');
    if (mdThemeSelector) {
      if (codeType === 'markdown') {
        mdThemeSelector.style.display = 'block';
        renderMdThemeSelector();
      } else {
        mdThemeSelector.style.display = 'none';
      }
    }
  }

  // 初始化代码编辑器
  initCodeEditor();
  
  // 在输入框内容变化时检测代码类型并更新高亮
  if (htmlInput) {
    htmlInput.addEventListener('input', () => {
      const content = htmlInput.value;
      const codeType = detectCodeType(content);
      updateCodeTypeIndicator(codeType, content);
      refreshUnsavedState();
      
      // 同步到高亮区域
      syncToTextarea();
    });
    
    // 页面加载时检测初始内容
    if (htmlInput.value) {
      const content = htmlInput.value;
      
      // 检查是否在编辑页面上
      const isEditPage = window.location.pathname.includes('/edit/') || window.location.pathname.includes('/view/');
      
      // 如果是编辑页面，尝试从多个来源获取代码类型
      let codeType = 'html';
      if (isEditPage) {
        // 1. 尝试从 meta 标签中获取代码类型
        const metaCodeType = document.querySelector('meta[name="code-type"]');
        if (metaCodeType && metaCodeType.getAttribute('content')) {
          const typeFromMeta = metaCodeType.getAttribute('content');
          if (['html', 'markdown', 'svg', 'mermaid'].includes(typeFromMeta)) {
            codeType = typeFromMeta;
            console.log(`从 meta 标签中获取代码类型: ${codeType}`);
          }
        } else {
          // 2. 尝试从 URL 参数中获取代码类型
          const urlParams = new URLSearchParams(window.location.search);
          const typeFromUrl = urlParams.get('type');
          
          if (typeFromUrl && ['html', 'markdown', 'svg', 'mermaid'].includes(typeFromUrl)) {
            codeType = typeFromUrl;
            console.log(`从 URL 参数中获取代码类型: ${codeType}`);
          } else {
            // 3. 如果以上方法都失败，则使用检测函数
            codeType = detectCodeType(content);
            console.log(`检测到的代码类型: ${codeType}`);
          }
        }
      } else {
        // 如果不是编辑页面，使用检测函数
        codeType = detectCodeType(content);
      }
      
      updateCodeTypeIndicator(codeType, content);
    } else {
      // 初始时如果没有内容，隐藏指示器
      updateCodeTypeIndicator('html', '');
    }
  }

  // 生成链接
  if (generateButton) {
    generateButton.addEventListener('click', async () => {
      console.log('生成链接按钮被点击');
      // 确保从编辑器同步到textarea
      syncToTextarea();
      
      if (!htmlInput) {
        showErrorToast('HTML输入元素不存在');
        return;
      }
      
      const htmlContent = htmlInput.value.trim();
      
      if (!htmlContent) {
        showErrorToast('请输入 HTML 内容');
        return;
      }
      
      try {
        // 显示加载指示器
        loadingIndicator.classList.add('show');
        
        // 添加按钮加载动画
        generateButton.innerHTML = '<i class="fas fa-spinner fa-spin loading-spinner"></i> 处理中...';
        generateButton.disabled = true;
        
        // 检查是否启用密码保护
        const isProtected = passwordToggle ? passwordToggle.checked : false;
        
        // 检测代码类型
        const codeType = detectCodeType(htmlContent);
        console.log('检测到的代码类型:', codeType);
        
        // 调用 API 生成链接
        const payload = { htmlContent, isProtected, codeType };
        if (currentPageId) {
          payload.pageId = currentPageId;
        }

        const response = await fetch('/api/pages/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        const data = await response.json();
        console.log('API响应数据:', data); // 调试输出
        
        if (data.success) {
          // 如果是 Markdown 且选了非默认风格，将风格附加到 URL 参数
          const detectedForUrl = detectCodeType(htmlContent);
          const themeParam = (detectedForUrl === 'markdown' && selectedMdTheme && selectedMdTheme !== 'bytedance')
            ? `?theme=${selectedMdTheme}` : '';
          const baseUrl = data.shareUrl || `${window.location.origin}/view/${data.pageId}`;
          const url = `${baseUrl}${themeParam}`;
          
          // 格式化 URL 显示
          const formattedUrl = formatUrl(url);
          if (resultUrl) {
            resultUrl.innerHTML = formattedUrl;
            
            // 保存原始 URL 用于复制和预览
            resultUrl.dataset.originalUrl = url;
            resultUrl.dataset.pageId = data.pageId || '';
          }

          if (currentPageId) {
            lastSavedSnapshot = htmlInput ? htmlInput.value : '';
            hasUnsavedChanges = false;
          } else {
            // 新建模式下每次都创建新项目，不自动绑定到编辑模式
            lastSavedSnapshot = htmlInput ? htmlInput.value : '';
            hasUnsavedChanges = false;
          }
          
          if (generatedPassword) {
            if (data.isProtected && data.password) {
              generatedPassword.textContent = data.password;
            } else {
              generatedPassword.textContent = '';
            }
          }
          console.log('生成的密码:', data.password); // 调试输出
          
          // 根据开关状态显示或隐藏密码区域
          if (passwordToggle && passwordToggle.checked) {
            if (passwordInfo) passwordInfo.style.display = 'block';
            if (copyPasswordLink) copyPasswordLink.style.display = 'inline-block';
          } else {
            if (passwordInfo) passwordInfo.style.display = 'none';
            if (copyPasswordLink) copyPasswordLink.style.display = 'none';
          }
          
          // 显示结果区域
          if (resultSection) {
            resultSection.style.display = 'block';
            
            // 使用 setTimeout 确保动画效果正确显示
            setTimeout(() => {
              resultSection.classList.add('fade-in');
              // 添加光影效果和流动效果，只出现一次
              // 先移除之前的类，确保动画可以重新触发
              resultSection.classList.remove('glow-effect');
              resultSection.classList.remove('flow-effect');
              
              // 使用 setTimeout 确保在下一个渲染周期添加类
              setTimeout(() => {
                resultSection.classList.add('glow-effect');
                resultSection.classList.add('flow-effect');
                
                // 动画结束后不需要手动移除类，因为 CSS 中设置了 forwards
                // 但为了确保下次点击时可以再次触发动画，我们在动画完成后移除类
                setTimeout(() => {
                  resultSection.classList.remove('glow-effect');
                  resultSection.classList.remove('flow-effect');
                }, 3000);
              }, 10);
            }, 10);
          }
          
          // 添加成功反馈
          generateButton.classList.add('success-pulse');
          setTimeout(() => {
            generateButton.classList.remove('success-pulse');
          }, 500);
          
          // 隐藏加载指示器
          loadingIndicator.classList.remove('show');

          await refreshAssetPanel();
          
          // 不需要显示生成链接的toast提示
        } else {
          throw new Error(data.error || '生成链接失败');
        }
        
        // 恢复按钮状态
        updateEditorModeUI();
        generateButton.disabled = false;
        
        // 隐藏加载指示器
        loadingIndicator.classList.remove('show');
      } catch (error) {
        console.error('生成链接错误:', error);
        showErrorToast('生成链接时发生错误');
        
        // 恢复按钮状态
        updateEditorModeUI();
        generateButton.disabled = false;
        
        // 隐藏加载指示器
        loadingIndicator.classList.remove('show');
      }
    });
  }
  
  // 复制链接按钮 - 只复制链接
  if (copyButton) {
    copyButton.addEventListener('click', () => {
      if (!resultUrl || !resultUrl.dataset.originalUrl) {
        showErrorToast('没有可复制的链接');
        return;
      }
      
      // 始终只复制链接，不复制密码
      const textToCopy = resultUrl.dataset.originalUrl;
      console.log('要复制的链接:', textToCopy);
      
      // 使用传统的复制方法
      try {
        // 创建一个临时文本区域
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';  // 避免滚动到视图中
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        // 执行复制命令
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          showSuccessToast('链接已复制到剪贴板');
          copyButton.classList.add('success-pulse');
          setTimeout(() => {
            copyButton.classList.remove('success-pulse');
          }, 500);
        } else {
          throw new Error('execCommand 复制失败');
        }
      } catch (error) {
        console.error('复制失败:', error);
        showErrorToast('复制链接失败');
      }
    });
  }
  
  // 预览按钮
  if (previewButton) {
    previewButton.addEventListener('click', () => {
      if (!resultUrl || !resultUrl.dataset.originalUrl) {
        showErrorToast('没有可预览的链接');
        return;
      }
      
      window.open(resultUrl.dataset.originalUrl, '_blank');
    });
  }
  
  // 密码区域点击复制功能
  if (generatedPassword) {
    generatedPassword.addEventListener('click', () => {
      if (!generatedPassword.textContent) {
        showErrorToast('没有可复制的密码');
        return;
      }
      
      const textToCopy = generatedPassword.textContent;
      console.log('要复制的密码:', textToCopy); // 调试输出
      
      // 使用传统的复制方法
      const copyToClipboard = (text) => {
        try {
          // 创建一个临时文本区域
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';  // 避免滚动到视图中
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          // 执行复制命令
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (successful) {
            showSuccessToast('密码已复制到剪贴板');
            
            // 添加视觉反馈
            generatedPassword.classList.add('copied');
            setTimeout(() => {
              generatedPassword.classList.remove('copied');
            }, 500);
            
            return true;
          } else {
            throw new Error('execCommand 复制失败');
          }
        } catch (err) {
          console.error('复制失败:', err);
          showErrorToast('复制失败');
          return false;
        }
      };
      
      copyToClipboard(textToCopy);
    });
  }
  
  // 复制密码和链接按钮
  if (copyPasswordLink) {
    copyPasswordLink.addEventListener('click', (e) => {
      e.preventDefault(); // 防止默认的锚点行为
      
      if (!resultUrl || !resultUrl.dataset.originalUrl || !generatedPassword || !generatedPassword.textContent) {
        showErrorToast('没有可复制的内容');
        return;
      }
      
      const textToCopy = `链接: ${resultUrl.dataset.originalUrl}\n密码: ${generatedPassword.textContent}`;
      console.log('要复制的内容:', textToCopy); // 调试输出
      
      // 使用传统的复制方法
      const copyToClipboard = (text) => {
        try {
          // 创建一个临时文本区域
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';  // 避免滚动到视图中
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          // 执行复制命令
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (successful) {
            showSuccessToast('链接和密码已复制到剪贴板');
            
            // 添加视觉反馈
            copyPasswordLink.classList.add('success-pulse');
            setTimeout(() => {
              copyPasswordLink.classList.remove('success-pulse');
            }, 500);
            
            return true;
          } else {
            throw new Error('execCommand 复制失败');
          }
        } catch (err) {
          console.error('复制失败:', err);
          showErrorToast('复制失败');
          return false;
        }
      };
      
      copyToClipboard(textToCopy);
    });
  }

  const refreshVersionsBtn = document.getElementById('refresh-versions-btn');
  if (refreshVersionsBtn) {
    refreshVersionsBtn.addEventListener('click', () => refreshVersionsPanel(currentPageId));
  }

  const refreshProjectsBtn = document.getElementById('refresh-projects-btn');
  if (refreshProjectsBtn) {
    refreshProjectsBtn.addEventListener('click', () => refreshProjectsPanel());
  }

  const newProjectBtn = document.getElementById('new-project-btn');
  if (newProjectBtn) {
    newProjectBtn.addEventListener('click', () => {
      if (!currentPageId) {
        showSuccessToast('当前已是新建模式');
        return;
      }
      if (!confirmBeforeModeSwitch('新建项目')) return;
      enterNewProjectMode(true);
    });
  }

  if (exitEditModeBtn) {
    exitEditModeBtn.addEventListener('click', () => {
      if (!currentPageId) return;
      if (!confirmBeforeModeSwitch('新建项目')) return;
      enterNewProjectMode(true);
    });
  }

  refreshAssetPanel();

  try {
    const openId = sessionStorage.getItem('quickshare-open-project');
    if (openId) {
      sessionStorage.removeItem('quickshare-open-project');
      selectProject(openId);
    } else {
      enterNewProjectMode(false);
    }
  } catch (e) {
    /* ignore */
    enterNewProjectMode(false);
  }

  // 初始化完成
  console.log('应用初始化完成');
});

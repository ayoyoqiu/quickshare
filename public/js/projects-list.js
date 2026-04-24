(function () {
  function showErrorToast(message) {
    const errorToast = document.getElementById('error-toast');
    const errorMessage = document.getElementById('error-message');
    if (errorToast && errorMessage) {
      errorMessage.textContent = message;
      errorToast.classList.add('show');
      setTimeout(() => errorToast.classList.remove('show'), 3000);
    } else {
      console.error(message);
    }
  }

  function showSuccessToast(message) {
    const successToast = document.getElementById('success-toast');
    const successMessage = document.getElementById('success-message');
    if (successToast && successMessage) {
      successMessage.textContent = message;
      successToast.classList.add('show');
      setTimeout(() => successToast.classList.remove('show'), 3000);
    } else {
      console.error(message);
    }
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatVersionTime(ts) {
    if (ts == null || ts === '') return '';
    try {
      return new Date(Number(ts)).toLocaleString('zh-CN');
    } catch (e) {
      return String(ts);
    }
  }

  async function patchRename(pageId, displayName) {
    const r = await fetch(`/api/pages/me/project/${encodeURIComponent(pageId)}/rename`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName })
    });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || '重命名失败');
    return d;
  }

  function buildShareUrl(pageId, password) {
    const base = `${window.location.origin}/view/${encodeURIComponent(pageId)}`;
    if (!password) return base;
    return `${base}?password=${encodeURIComponent(password)}`;
  }

  async function patchProtection(pageId, isProtected) {
    const r = await fetch('/api/pages/me/protect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId, isProtected })
    });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || '设置失败');
    return d;
  }

  async function copyText(text, successMsg) {
    try {
      await navigator.clipboard.writeText(text);
      showSuccessToast(successMsg);
      return;
    } catch (e) {
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
    }
  }

  function renderRow(row, editingId) {
    const raw = row.preview || '';
    const prev = escHtml(raw);
    const lock = row.is_protected ? '<i class="fas fa-lock" style="margin-left:6px;" title="访问密码"></i>' : '';
    const name = (row.display_name && String(row.display_name).trim()) ? String(row.display_name).trim() : '';
    const titleLine = name
      ? `<strong>${escHtml(name)}</strong><span style="color: var(--text-secondary); font-weight: normal; font-size: 0.85rem;"> · /view/${escHtml(row.id)}</span>`
      : `<strong>/view/${escHtml(row.id)}</strong>`;

    const isEditing = editingId === row.id;

    if (isEditing) {
      return `
        <div class="project-row project-row--editing" data-page-id="${escHtml(row.id)}" style="border: 2px solid var(--accent); border-radius: 8px; padding: 10px 12px; margin-bottom: 8px;">
          <div style="display:flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px;">
              <label style="font-size: 0.8rem; color: var(--text-secondary); display:block; margin-bottom: 4px;">显示名称（最长 80 字，可留空）</label>
              <input type="text" class="project-rename-input cyber-input" maxlength="80" value="${escHtml(name)}"
                style="width: 100%; padding: 8px 10px; font-size: 0.9rem; box-sizing: border-box;" />
              <div style="margin-top: 6px; font-size: 0.8rem; color: var(--text-secondary); max-height: 2.6em; overflow: hidden;">${prev || '（无预览）'}</div>
            </div>
            <div style="display:flex; gap: 6px; flex-shrink: 0; align-items: center;">
              <button type="button" class="cyber-btn cyber-btn-primary project-rename-save" style="padding: 6px 12px; font-size: 0.8rem;">保存</button>
              <button type="button" class="cyber-btn cyber-btn-secondary project-rename-cancel" style="padding: 6px 12px; font-size: 0.8rem;">取消</button>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="project-row" data-page-id="${escHtml(row.id)}" style="border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 12px; margin-bottom: 8px;">
        <div style="display:flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 0;">
            <div>${titleLine}${lock}</div>
            <div style="margin-top: 4px; font-size: 0.85rem; color: var(--text-secondary);">${formatVersionTime(row.created_at)}</div>
            <div style="margin-top: 6px; font-size: 0.8rem; color: var(--text-secondary); max-height: 2.6em; overflow: hidden;">${prev || '（无预览）'}</div>
          </div>
          <div style="display:flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap;">
            <button type="button" class="cyber-btn cyber-btn-secondary project-copy-link" data-page-id="${escHtml(row.id)}" style="padding: 4px 10px; font-size: 0.8rem;" title="复制链接">
              <i class="fas fa-copy"></i> 复制
            </button>
            <button type="button" class="cyber-btn cyber-btn-secondary project-share-link" data-page-id="${escHtml(row.id)}" style="padding: 4px 10px; font-size: 0.8rem;" title="分享链接">
              <i class="fas fa-share-alt"></i> 分享
            </button>
            <button type="button" class="cyber-btn cyber-btn-secondary project-toggle-protect" data-page-id="${escHtml(row.id)}" data-is-protected="${row.is_protected ? '1' : '0'}" style="padding: 4px 10px; font-size: 0.8rem;" title="密码保护">
              <i class="fas fa-shield-alt"></i> ${row.is_protected ? '取消密码' : '加密码'}
            </button>
            <button type="button" class="cyber-btn cyber-btn-secondary project-rename-open" style="padding: 4px 10px; font-size: 0.8rem;" title="重命名">
              <i class="fas fa-pen"></i> 重命名
            </button>
            <a href="/" class="cyber-btn cyber-btn-primary" style="padding: 4px 10px; font-size: 0.8rem; text-decoration: none;" data-open-project="${escHtml(row.id)}">打开编辑</a>
          </div>
        </div>
      </div>
    `;
  }

  let editingId = null;
  let rowsCache = [];

  async function load() {
    const meta = document.getElementById('projects-page-meta');
    const list = document.getElementById('projects-page-list');
    const empty = document.getElementById('projects-page-empty');
    if (!list) return;

    try {
      const [aRes, pRes] = await Promise.all([
        fetch('/api/pages/me/asset'),
        fetch('/api/pages/me/projects?limit=100')
      ]);
      const a = await aRes.json();
      const p = await pRes.json();
      if (!a.success || !p.success) {
        showErrorToast('加载失败');
        return;
      }

      rowsCache = p.projects || [];
      if (meta) {
        meta.textContent = `共 ${a.asset.projectCount} 个项目 · 按最近更新时间排序`;
      }
      if (empty) {
        empty.style.display = rowsCache.length ? 'none' : 'block';
      }

      list.innerHTML = rowsCache.map((row) => renderRow(row, editingId)).join('');

      list.querySelectorAll('a[data-open-project]').forEach((link) => {
        link.addEventListener('click', (e) => {
          const id = link.getAttribute('data-open-project');
          if (id) {
            try {
              sessionStorage.setItem('quickshare-open-project', id);
            } catch (err) { /* ignore */ }
          }
        });
      });

      list.querySelectorAll('.project-rename-open').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const rowEl = btn.closest('.project-row');
          const id = rowEl && rowEl.getAttribute('data-page-id');
          if (id) {
            editingId = id;
            load();
            setTimeout(() => {
              const inp = list.querySelector('.project-rename-input');
              if (inp) {
                inp.focus();
                inp.select();
              }
            }, 0);
          }
        });
      });

      list.querySelectorAll('.project-rename-cancel').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          editingId = null;
          load();
        });
      });

      list.querySelectorAll('.project-rename-save').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const rowEl = btn.closest('.project-row');
          const id = rowEl && rowEl.getAttribute('data-page-id');
          const inp = rowEl && rowEl.querySelector('.project-rename-input');
          if (!id || !inp) return;
          try {
            await patchRename(id, inp.value);
            showSuccessToast('已保存名称');
            editingId = null;
            await load();
          } catch (err) {
            showErrorToast(err.message || '保存失败');
          }
        });
      });

      list.querySelectorAll('.project-copy-link').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const pageId = btn.getAttribute('data-page-id');
          if (!pageId) return;
          await copyText(buildShareUrl(pageId), '链接已复制');
        });
      });

      list.querySelectorAll('.project-share-link').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const pageId = btn.getAttribute('data-page-id');
          if (!pageId) return;
          const url = buildShareUrl(pageId);
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
        });
      });

      list.querySelectorAll('.project-toggle-protect').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const pageId = btn.getAttribute('data-page-id');
          const protectedNow = btn.getAttribute('data-is-protected') === '1';
          if (!pageId) return;
          if (protectedNow && !window.confirm('确定取消该项目的访问密码保护吗？')) return;

          try {
            const d = await patchProtection(pageId, !protectedNow);
            if (d.isProtected) {
              const pwd = d.password || '';
              const plain = buildShareUrl(pageId);
              const withPwd = buildShareUrl(pageId, pwd);
              const text = pwd
                ? `链接: ${plain}\n密码: ${pwd}\n直达链接: ${withPwd}`
                : `链接: ${plain}`;
              await copyText(text, '已开启密码保护，并复制链接与密码');
            } else {
              showSuccessToast('已取消密码保护');
            }
            await load();
          } catch (err) {
            showErrorToast(err.message || '设置密码保护失败');
          }
        });
      });
    } catch (err) {
      console.error(err);
      showErrorToast('加载失败');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const goHomeBtn = document.getElementById('projects-go-home');
    if (goHomeBtn) {
      goHomeBtn.addEventListener('click', () => {
        window.location.href = '/';
      });
    }

    const logoutBtn = document.getElementById('projects-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        window.location.href = '/logout';
      });
    }

    const refresh = document.getElementById('projects-page-refresh');
    if (refresh) refresh.addEventListener('click', () => load());
    load();
  });
})();

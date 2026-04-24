(function () {
  function createProjectPanelModule(ctx) {
    const {
      escHtml,
      formatVersionTime,
      getCurrentPageId,
      confirmBeforeModeSwitch,
      selectProject,
      showErrorToast,
      showSuccessToast
    } = ctx;

    const RECENT_PROJECTS_LIMIT = 5;

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
          const active = getCurrentPageId() && row.id === getCurrentPageId();
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
            if (getCurrentPageId() === pid) {
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
      if (id === getCurrentPageId()) return;
      if (!confirmBeforeModeSwitch('编辑项目')) return;
      selectProject(id);
    }

    function mount() {
      const projectsListRoot = document.getElementById('projects-list');
      if (projectsListRoot) {
        projectsListRoot.addEventListener('click', onProjectsListClick);
      }
    }

    return {
      mount,
      refreshProjectsPanel
    };
  }

  window.createProjectPanelModule = createProjectPanelModule;
})();

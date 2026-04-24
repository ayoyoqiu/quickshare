(function () {
  function createVersionPanelModule(ctx) {
    const {
      htmlInput,
      syncToTextarea,
      formatVersionTime,
      showErrorToast,
      showSuccessToast,
      selectProject
    } = ctx;

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

    return { refreshVersionsPanel };
  }

  window.createVersionPanelModule = createVersionPanelModule;
})();

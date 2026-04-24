(function () {
  function createEditorModeModule(ctx) {
    const {
      htmlInput,
      generateButton,
      editorModeText,
      exitEditModeBtn,
      resultUrl,
      resultSection,
      passwordToggle,
      generatedPassword,
      passwordInfo,
      copyPasswordLink,
      detectCodeType,
      selectedMdTheme,
      formatUrl,
      showSuccessToast,
      getState,
      setState,
      refreshProjectsPanel,
      refreshVersionsPanel,
      syncToTextarea
    } = ctx;

    function refreshUnsavedState() {
      const current = htmlInput ? htmlInput.value : '';
      const st = getState();
      setState({ hasUnsavedChanges: current !== st.lastSavedSnapshot });
    }

    function updateEditorModeUI() {
      const st = getState();
      const isEditing = !!st.currentPageId;
      const title = isEditing
        ? `编辑项目：${st.currentProjectDisplayName || `/view/${st.currentPageId}`}`
        : '新建项目';
      if (editorModeText) editorModeText.textContent = title;
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
      const st = getState();
      if (!st.hasUnsavedChanges) return true;
      return window.confirm(`当前内容有未保存修改，切换到「${targetLabel}」后仍会保留文本，但不会自动保存。是否继续？`);
    }

    function enterNewProjectMode(showToast) {
      const current = htmlInput ? htmlInput.value : '';
      setState({
        currentPageId: null,
        currentProjectDisplayName: '',
        lastSavedSnapshot: current,
        hasUnsavedChanges: false
      });
      updateEditorModeUI();
      refreshProjectsPanel();
      refreshVersionsPanel(null);
      if (showToast) {
        showSuccessToast('已切换到新建模式：当前内容保留，保存时会生成新项目');
      }
    }

    function applyProjectToEditor(pagePayload, shareUrl) {
      if (!pagePayload) return;
      const st = getState();
      if (htmlInput) {
        htmlInput.value = pagePayload.htmlContent || '';
        syncToTextarea();
      }
      if (passwordToggle) passwordToggle.checked = !!pagePayload.isProtected;
      if (resultUrl && shareUrl) {
        const detectedForUrl = detectCodeType(htmlInput ? htmlInput.value : '');
        const themeParam = (detectedForUrl === 'markdown' && selectedMdTheme && selectedMdTheme !== 'bytedance')
          ? `?theme=${selectedMdTheme}` : '';
        const url = `${shareUrl}${themeParam}`;
        resultUrl.innerHTML = formatUrl(url);
        resultUrl.dataset.originalUrl = url;
        resultUrl.dataset.pageId = pagePayload.id || st.currentPageId || '';
      }
      if (resultSection) resultSection.style.display = 'block';
      if (generatedPassword) generatedPassword.textContent = '';
      if (passwordInfo) passwordInfo.style.display = 'none';
      if (copyPasswordLink) copyPasswordLink.style.display = 'none';

      setState({
        lastSavedSnapshot: htmlInput ? htmlInput.value : '',
        hasUnsavedChanges: false,
        currentProjectDisplayName: (pagePayload.displayName || '').trim()
      });
      updateEditorModeUI();
    }

    return {
      refreshUnsavedState,
      updateEditorModeUI,
      confirmBeforeModeSwitch,
      enterNewProjectMode,
      applyProjectToEditor
    };
  }

  window.createEditorModeModule = createEditorModeModule;
})();

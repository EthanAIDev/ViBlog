var START_ID = 10000001;
var ARTICLE_TYPES = ['教程', '随笔', '实地笔记', '构建日志', '行业观察'];

var articles = [
  { id: 10000001, type: '教程', date: '2026-05-06', displayDate: '2026.05.06', title: '【DeepSeek+LoRA+FastAPI】开发人员如何微调大模型并暴露接口给后端调用', summary: '详细介绍如何使用DeepSeek模型、LoRA微调算法和FastAPI框架，完成大模型微调并暴露接口给后端调用的全过程。', tags: ['模型微调', 'DeepSeek', 'FastAPI', 'LoRA'], content: '', status: 'published' },
  { id: 10000002, type: '随笔', date: '2026-04-08', displayDate: '2026.04.08', title: '从 Demo 到产品：RAG 项目最容易被忽略的三层设计', summary: '整理检索质量、回答约束与交互反馈之间的关系，避免项目停留在“能跑”阶段。', tags: ['RAG', '架构', '产品'], content: '', status: 'published' },
  { id: 10000003, type: '实地笔记', date: '2026-03-27', displayDate: '2026.03.27', title: '智能体工作流设计笔记：什么时候该让模型停下来', summary: '围绕工具调用、状态收敛和用户感知，讨论一个智能体如何更像同事，而不是失控脚本。', tags: ['智能体', '用户体验', '决策'], content: '', status: 'published' },
  { id: 10000004, type: '构建日志', date: '2026-02-18', displayDate: '2026.02.18', title: '做个人技术品牌主页时，我如何避免它看起来像标准模板', summary: '从文案、节奏、视觉语言到交互颗粒度，记录如何让页面更像“作品”，而不是“素材拼装”。', tags: ['设计', '前端', '品牌'], content: '', status: 'published' },
  { id: 10000005, type: '随笔', date: '2026-01-15', displayDate: '2026.01.15', title: '向量数据库选型指南：如何为你的 RAG 项目选择合适的存储方案', summary: '对比主流向量数据库的特性、性能和适用场景，帮你做出更明智的技术决策。', tags: ['数据库', 'RAG', '技术选型'], content: '', status: 'published' },
  { id: 10000006, type: '教程', date: '2025-12-20', displayDate: '2025.12.20', title: '从零开始构建 AI 知识库：完整的技术栈与实践指南', summary: '从文档处理、向量嵌入到检索问答，一步步搭建属于自己的 AI 知识库系统。', tags: ['教程', 'RAG', '实践'], content: '', status: 'published' },
  { id: 10000007, type: '行业观察', date: '2025-11-10', displayDate: '2025.11.10', title: 'AI 应用落地的关键挑战：从技术可行性到业务价值转化', summary: '探讨企业在引入 AI 技术时面临的实际问题，以及如何跨越从 Demo 到生产的鸿沟。', tags: ['行业', '产品', '策略'], content: '', status: 'published' }
];

var currentPage = 1;
var pageSize = 15;
var searchKeyword = '';
var editingArticle = null;
var deleteArticleId = null;
var easyMDE = null;
var toastTimer = null;
var projects = [];
var editingProject = null;
var projectGalleryItems = [];
var projectSearchKeyword = '';

var detectedImages = [];
var selectedImageFiles = [];
var importedMdFilename = '';
var uploadSessionId = '';
var referenceAssumeExisting = false;
var existingReferencePaths = {};
var manualMatchByPath = {};
var manualMatchByBasename = {};

function generateUploadSessionId() {
  return 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function init() {
  initPageSettings();
  loadArticles();
  setupProjectManagement();
  setupSidebarNavigation();
  setupTimeDisplay();
  setupSearch();
  setupAddArticle();
  setupModalHandlers();
  setupConfirmModal();
  setupPagination();
  setupMarkdownImport();
  setupImagePicker();
  setupImageRescan();
  initEasyMDE();
  renderArticles();
  loadProjects();
}

function initPageSettings() {
  setupPageSettingsTabs();
  setupSiteFaviconUpload();
  setupAboutAvatarUpload();
  setupAboutAvatarPreviewBinding();
  setupNotesEvents();
  setupSectionsEvents();
  setupSavePageSettings();
  loadPageSettingsFromServer();
}

function setupAboutAvatarUpload() {
  var uploadBtn = document.getElementById('about-avatar-upload-btn');
  var fileInput = document.getElementById('about-avatar-file-input');
  if (!uploadBtn || !fileInput) return;

  uploadBtn.addEventListener('click', function() {
    fileInput.click();
  });

  fileInput.addEventListener('change', function(e) {
    var file = (e.target.files || [])[0];
    if (!file) return;
    uploadAboutAvatar(file);
    fileInput.value = '';
  });
}

function uploadAboutAvatar(file) {
  var reader = new FileReader();

  reader.onload = function(ev) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/site-settings/upload-avatar', true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-filename', encodeURIComponent(file.name));

    xhr.onload = function() {
      if (xhr.status !== 200) {
        showToast('头像上传失败: HTTP ' + xhr.status, true);
        return;
      }
      var resp = {};
      try { resp = JSON.parse(xhr.responseText || '{}'); } catch (err) {}
      if (!resp.success || !resp.avatarSrc) {
        showToast(resp.message || '头像上传失败', true);
        return;
      }
      setInputValue('about-avatar-src', resp.avatarSrc);
      renderAboutAvatarPreview(resp.avatarSrc);
      showToast('头像上传成功，记得点击“保存页面设置”');
    };

    xhr.onerror = function() {
      showToast('头像上传失败：网络错误', true);
    };

    xhr.send(ev.target.result);
  };

  reader.onerror = function() {
    showToast('头像上传失败：文件读取失败', true);
  };

  reader.readAsArrayBuffer(file);
}

function setupAboutAvatarPreviewBinding() {
  var input = document.getElementById('about-avatar-src');
  if (!input) return;
  input.addEventListener('input', function() {
    renderAboutAvatarPreview(input.value);
  });
}

function renderAboutAvatarPreview(src) {
  var img = document.getElementById('about-avatar-preview');
  var empty = document.getElementById('about-avatar-preview-empty');
  if (!img || !empty) return;

  var value = String(src || '').trim();
  if (!value) {
    img.style.display = 'none';
    img.removeAttribute('src');
    empty.style.display = '';
    empty.textContent = '未选择头像';
    return;
  }

  var previewSrc = resolvePreviewAssetUrl(value);
  img.style.display = '';
  empty.style.display = 'none';
  img.onload = function() {
    empty.textContent = '未选择头像';
  };
  img.onerror = function() {
    img.style.display = 'none';
    empty.style.display = '';
    empty.textContent = '头像地址不可用，请检查路径或链接';
  };
  img.src = previewSrc;
}

function setupSiteFaviconUpload() {
  var uploadBtn = document.getElementById('site-favicon-upload-btn');
  var fileInput = document.getElementById('site-favicon-file-input');
  if (!uploadBtn || !fileInput) return;

  uploadBtn.addEventListener('click', function() {
    fileInput.click();
  });

  fileInput.addEventListener('change', function(e) {
    var file = (e.target.files || [])[0];
    if (!file) return;
    uploadSiteAsset(file, 'site-favicon', function(src) {
      setInputValue('site-favicon', src);
      showToast('图标上传成功，记得点击"保存页面设置"');
    });
    fileInput.value = '';
  });
}

function uploadSiteAsset(file, assetType, onSuccess) {
  var reader = new FileReader();

  reader.onload = function(ev) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/site-settings/upload-asset', true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-filename', encodeURIComponent(file.name));
    xhr.setRequestHeader('x-asset-type', assetType);

    xhr.onload = function() {
      if (xhr.status !== 200) {
        showToast('上传失败: HTTP ' + xhr.status, true);
        return;
      }
      var resp = {};
      try { resp = JSON.parse(xhr.responseText || '{}'); } catch (err) {}
      if (!resp.success || !resp.assetSrc) {
        showToast(resp.message || '上传失败', true);
        return;
      }
      if (onSuccess) onSuccess(resp.assetSrc);
    };

    xhr.onerror = function() {
      showToast('上传失败：网络错误', true);
    };

    xhr.send(ev.target.result);
  };

  reader.onerror = function() {
    showToast('上传失败：文件读取失败', true);
  };

  reader.readAsArrayBuffer(file);
}

function resolvePreviewAssetUrl(value) {
  var src = String(value || '').trim();
  if (!src) return '';
  if (/^(https?:\/\/|data:|\/\/)/i.test(src)) return src;
  if (src.charAt(0) === '/') return src;
  return '/' + src.replace(/^\.?\//, '');
}

function setupPageSettingsTabs() {
  var tabsWrap = document.getElementById('settings-tabs');
  if (!tabsWrap) return;

  tabsWrap.addEventListener('click', function(e) {
    var btn = e.target.closest('.settings-tab');
    if (!btn) return;
    var tab = btn.getAttribute('data-tab');
    if (!tab) return;

    document.querySelectorAll('.settings-tab').forEach(function(item) {
      item.classList.remove('active');
    });
    btn.classList.add('active');

    document.querySelectorAll('.settings-tab-content').forEach(function(panel) {
      panel.classList.remove('active');
    });
    var target = document.getElementById('settings-tab-' + tab);
    if (target) target.classList.add('active');
  });
}

function loadPageSettingsFromServer() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/site-settings?' + Date.now(), true);
  xhr.onload = function() {
    if (xhr.status !== 200) {
      showToast('加载页面设置失败：HTTP ' + xhr.status, true);
      return;
    }
    var resp = {};
    try { resp = JSON.parse(xhr.responseText || '{}'); } catch (e) {
      showToast('加载页面设置失败：返回内容不是 JSON', true);
      return;
    }
    if (!resp || resp.success !== true || !resp.settings || typeof resp.settings !== 'object') {
      showToast('加载页面设置失败：接口响应格式无效', true);
      return;
    }
    var settings = resp.settings || {};
    fillPageSettingsForm(settings);
  };
  xhr.onerror = function() {
    showToast('加载页面设置失败：网络错误', true);
  };
  xhr.send();
}

function fillPageSettingsForm(settings) {
  var site = settings.site || {};
  var home = settings.home || {};
  var terminal = home.terminal || {};
  var about = settings.about || {};
  var links = about.links || {};

  setInputValue('site-title', site.title);
  setInputValue('site-description', site.description);
  setInputValue('site-favicon', site.favicon);
  setInputValue('site-og-image', site.ogImage);
  setInputValue('site-header-brand-mark', site.headerBrandMark || 'E.');
  setInputValue('site-header-brand-name', site.headerBrandName || home.brandName || '');
  setInputValue('home-hero-eyebrow', home.heroEyebrow);
  setInputValue('home-hero-title', home.heroTitle);
  setInputValue('home-hero-text', home.heroText);

  setInputValue('home-terminal-role', terminal.role);
  setInputValue('home-terminal-focus', terminal.focus);
  setInputValue('home-terminal-location', terminal.location);
  setInputValue('home-terminal-mode', terminal.mode);
  setInputValue('home-terminal-command', terminal.command);

  fillNotesForm(home.notes || []);
  fillSectionsForm(home.sections || []);

  setInputValue('about-hero-eyebrow', about.heroEyebrow);
  setInputValue('about-hero-title', about.heroTitle);
  setInputValue('about-hero-text', about.heroText);
  setInputValue('about-profile-name', about.profileName);
  setInputValue('about-profile-role', about.profileRole);
  setInputValue('about-avatar-src', about.avatarSrc);
  renderAboutAvatarPreview(about.avatarSrc);
  setInputValue('about-link-bilibili', links.bilibili);
  setInputValue('about-link-github', links.github);
  setInputValue('about-link-qq', links.qq);
  setInputValue('about-link-wechat', links.wechat);
  setInputValue('about-link-email', links.email);

  fillSocialButtonsForm(about.socialButtons || []);
  fillAboutCardsForm(about.cards || []);
  fillAboutWorkflowForm(about.workflow || {});
  fillAboutTimelineForm(about.timeline || []);
  setupTimelineEvents();
}

function fillNotesForm(notes) {
  var container = document.getElementById('home-notes-container');
  if (!container) return;
  
  if (!Array.isArray(notes) || notes.length === 0) {
    notes = [
      { label: '正在构建', content: '面向中文场景的 AI 知识应用与个人品牌表达。' },
      { label: '写作视角', content: '偏实战、偏结构化，尽量把"怎么做"说清楚。' }
    ];
  }
  
  container.innerHTML = '';
  notes.forEach(function(note, index) {
    var item = document.createElement('div');
    item.className = 'note-item';
    item.setAttribute('data-index', index);
    item.innerHTML = `
      <div class="form-row">
        <div class="form-group">
          <label>标签</label>
          <input type="text" class="note-label" value="${escapeHtml(note.label || '')}" placeholder="例如：正在构建">
        </div>
        <div class="form-group">
          <label>内容</label>
          <input type="text" class="note-content" value="${escapeHtml(note.content || '')}" placeholder="笔记内容">
        </div>
        <button type="button" class="remove-note-btn">删除</button>
      </div>
    `;
    container.appendChild(item);
  });
  
  setupNotesEvents();
}

function fillSectionsForm(sections) {
  var container = document.getElementById('home-sections-container');
  if (!container) return;
  
  if (!Array.isArray(sections) || sections.length === 0) {
    sections = [
      { id: 'about', name: '关于我', eyebrow: '一个持续把复杂技术翻译成清晰体验的人。', enabled: true },
      { id: 'posts', name: '最新文章', eyebrow: '记录实现细节、踩坑过程与可复用方法。', enabled: true },
      { id: 'projects', name: '精选项目', eyebrow: '围绕检索增强、智能体协作与开发流程自动化的实践。', enabled: true }
    ];
  }
  
  container.innerHTML = '';
  sections.forEach(function(section, index) {
    var item = document.createElement('div');
    item.className = 'section-item';
    item.setAttribute('data-id', section.id);
    item.innerHTML = `
      <label>
        <input type="checkbox" class="section-enabled" ${section.enabled ? 'checked' : ''}>
        <span class="section-order">${index + 1}</span>. <input type="text" class="section-name" value="${escapeHtml(section.name || '')}">
      </label>
      <input type="text" class="section-eyebrow" placeholder="副标题" value="${escapeHtml(section.eyebrow || '')}">
      <button type="button" class="move-up-btn" ${index === 0 ? 'disabled' : ''}>↑</button>
      <button type="button" class="move-down-btn" ${index === sections.length - 1 ? 'disabled' : ''}>↓</button>
    `;
    container.appendChild(item);
  });
  
  setupSectionsEvents();
}

function fillSocialButtonsForm(buttons) {
  var container = document.getElementById('social-buttons-container');
  if (!container) return;

  var defaults = [
    { id: 'bilibili', enabled: true },
    { id: 'github', enabled: true },
    { id: 'qq', enabled: true },
    { id: 'wechat', enabled: true },
    { id: 'email', enabled: true }
  ];

  if (!Array.isArray(buttons) || buttons.length === 0) buttons = defaults;

  var names = { bilibili: 'B站', github: 'GitHub', qq: 'QQ', wechat: '微信', email: '邮箱' };

  container.innerHTML = '';
  buttons.forEach(function(btn) {
    var item = document.createElement('div');
    item.className = 'social-btn-item';
    item.setAttribute('data-id', btn.id);
    item.setAttribute('draggable', 'true');
    item.innerHTML =
      '<span class="drag-handle">&#9776;</span>' +
      '<input type="checkbox" class="social-btn-enabled"' + (btn.enabled ? ' checked' : '') + '>' +
      '<span class="social-btn-name">' + (names[btn.id] || btn.id) + '</span>';
    container.appendChild(item);
  });

  setupSocialDragEvents();
}

function setupSocialDragEvents() {
  var container = document.getElementById('social-buttons-container');
  if (!container) return;

  var draggedItem = null;

  container.addEventListener('dragstart', function(e) {
    var item = e.target.closest('.social-btn-item');
    if (!item) return;
    draggedItem = item;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }, true);

  container.addEventListener('dragend', function(e) {
    var item = e.target.closest('.social-btn-item');
    if (item) item.classList.remove('dragging');
    draggedItem = null;
  }, true);

  container.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    var target = e.target.closest('.social-btn-item');
    if (target && target !== draggedItem) {
      container.querySelectorAll('.drag-over').forEach(function(el) { el.classList.remove('drag-over'); });
      target.classList.add('drag-over');
    }
  }, true);

  container.addEventListener('dragleave', function(e) {
    var target = e.target.closest('.social-btn-item');
    if (target) target.classList.remove('drag-over');
  }, true);

  container.addEventListener('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
    var target = e.target.closest('.social-btn-item');
    if (!draggedItem || !target) return;
    if (draggedItem === target) return;

    var rect = target.getBoundingClientRect();
    var midY = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      container.insertBefore(draggedItem, target);
    } else {
      if (target.nextSibling) {
        container.insertBefore(draggedItem, target.nextSibling);
      } else {
        container.appendChild(draggedItem);
      }
    }
    draggedItem.classList.remove('dragging');
    draggedItem = null;
  }, true);
}

function collectSocialButtonsForm() {
  var buttons = [];
  var items = document.querySelectorAll('.social-btn-item');
  items.forEach(function(item) {
    var id = item.getAttribute('data-id');
    var checkbox = item.querySelector('.social-btn-enabled');
    buttons.push({
      id: id,
      enabled: checkbox ? checkbox.checked : true
    });
  });
  return buttons;
}

function fillAboutCardsForm(cards) {
  var container = document.getElementById('about-cards-container');
  if (!container) return;

  var defaults = [
    { title: '个人简介', content: '作为一名技术创作者，我相信好的技术不仅要能工作，还要能被理解。我致力于将复杂的技术概念转化为清晰的产品体验和可复用的方法论。' },
    { title: '擅长方向', content: '关注 RAG 工作流、智能体设计、提示词结构、前端展示体验，以及如何把技术产品讲得更有辨识度。' },
    { title: '工作方式', content: '先抓主线，再拆细节。偏好用简洁页面、原型和文章，把一个想法尽快做成可演示、可复用的成果。' }
  ];

  if (!Array.isArray(cards) || cards.length === 0) cards = defaults;

  container.innerHTML = '';
  cards.forEach(function(card, index) {
    var item = document.createElement('div');
    item.className = 'about-card-item';
    item.setAttribute('data-index', index);
    item.innerHTML =
      '<div class="form-group"><label>卡片' + (index + 1) + ' 标题</label>' +
      '<input type="text" class="about-card-title" value="' + escapeHtml(card.title || '') + '" placeholder="例如：个人简介"></div>' +
      '<div class="form-group"><label>卡片' + (index + 1) + ' 内容</label>' +
      '<textarea class="about-card-content" rows="3" placeholder="卡片内容">' + escapeHtml(card.content || '') + '</textarea></div>';
    container.appendChild(item);
  });
}

function fillAboutWorkflowForm(workflow) {
  setInputValue('about-workflow-eyebrow', workflow.eyebrow);
  setInputValue('about-workflow-title', workflow.title);
  setInputValue('about-workflow-commands', workflow.commands);
  setInputValue('about-workflow-stack1-title', workflow.stack1Title);
  setInputValue('about-workflow-stack2-title', workflow.stack2Title);
  setInputValue('about-workflow-stack1-items', workflow.stack1Items);
  setInputValue('about-workflow-stack2-items', workflow.stack2Items);
}

function fillAboutTimelineForm(timeline) {
  var container = document.getElementById('about-timeline-container');
  if (!container) return;

  setInputValue('about-timeline-eyebrow', timeline.eyebrow);
  setInputValue('about-timeline-title', timeline.title);

  var defaults = [
    { date: '2026 - 至今', title: '个人内容与项目体系化', desc: '持续迭代个人网站、项目库和文章方法论，将技术输出拆解为可复用模板与实践清单。' },
    { date: '2024 - 2025', title: 'AI 应用开发实践', desc: '围绕 RAG、Prompt 工程和前端展示体验完成多个原型与上线项目，强调可解释性与可维护性。' },
    { date: '2022 - 2023', title: '工程基础与表达能力沉淀', desc: '在技术实现之外强化文档与叙事能力，建立"能运行、能理解、能复盘"的完整交付方式。' }
  ];

  var items = Array.isArray(timeline.items) ? timeline.items : defaults;

  container.innerHTML = '';
  items.forEach(function(item, index) {
    addTimelineFormItem(index, item.date, item.title, item.desc);
  });
}

function addTimelineFormItem(index, date, title, desc) {
  var container = document.getElementById('about-timeline-container');
  if (!container) return;
  var formItem = document.createElement('div');
  formItem.className = 'timeline-item-form';
  formItem.setAttribute('data-index', index);
  formItem.innerHTML =
    '<div class="form-row">' +
      '<div class="form-group"><label>时间段</label><input type="text" class="timeline-date" value="' + escapeHtml(date || '') + '" placeholder="例如：2026 - 至今"></div>' +
      '<div class="form-group"><label>标题</label><input type="text" class="timeline-title" value="' + escapeHtml(title || '') + '" placeholder="标题"></div>' +
    '</div>' +
    '<div class="form-group"><label>描述</label><textarea class="timeline-desc" rows="2" placeholder="描述">' + escapeHtml(desc || '') + '</textarea></div>';
  container.appendChild(formItem);
}

function setupTimelineEvents() {
  var addBtn = document.getElementById('add-timeline-btn');
  if (addBtn) {
    addBtn.removeEventListener('click', addTimelineHandler);
    addBtn.addEventListener('click', addTimelineHandler);
  }

  var container = document.getElementById('about-timeline-container');
  if (!container) return;
  container.querySelectorAll('.timeline-item-form').forEach(function(item) {
    var removeBtn = item.querySelector('.remove-timeline-btn');
    if (removeBtn) {
      removeBtn.removeEventListener('click', removeTimelineHandler);
      removeBtn.addEventListener('click', removeTimelineHandler);
    } else {
      var label = item.querySelector('.form-group label');
      if (label && !item.querySelector('.remove-timeline-btn')) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'remove-note-btn remove-timeline-btn';
        btn.textContent = '删除';
        label.parentNode.appendChild(btn);
      }
    }
    var removeBtnNew = item.querySelector('.remove-timeline-btn');
    if (removeBtnNew) {
      removeBtnNew.removeEventListener('click', removeTimelineHandler);
      removeBtnNew.addEventListener('click', removeTimelineHandler);
    }
  });
}

function addTimelineHandler() {
  var container = document.getElementById('about-timeline-container');
  if (!container) return;
  var index = container.querySelectorAll('.timeline-item-form').length;
  addTimelineFormItem(index, '', '', '');
  setupTimelineEvents();
}

function removeTimelineHandler(e) {
  var btn = e.target;
  var item = btn.closest('.timeline-item-form');
  if (item) item.remove();
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setInputValue(id, value) {
  var el = document.getElementById(id);
  if (!el) return;
  el.value = typeof value === 'string' ? value : '';
}

function collectPageSettingsForm() {
  return {
    site: {
      title: getInputValue('site-title'),
      description: getInputValue('site-description'),
      favicon: getInputValue('site-favicon'),
      ogImage: getInputValue('site-og-image'),
      headerBrandMark: getInputValue('site-header-brand-mark'),
      headerBrandName: getInputValue('site-header-brand-name')
    },
    home: {
      heroEyebrow: getInputValue('home-hero-eyebrow'),
      heroTitle: getInputValue('home-hero-title'),
      heroText: getInputValue('home-hero-text'),
      terminal: {
        role: getInputValue('home-terminal-role'),
        focus: getInputValue('home-terminal-focus'),
        location: getInputValue('home-terminal-location'),
        mode: getInputValue('home-terminal-mode'),
        command: getInputValue('home-terminal-command')
      },
      notes: collectNotesForm(),
      sections: collectSectionsForm()
    },
    about: {
      heroEyebrow: getInputValue('about-hero-eyebrow'),
      heroTitle: getInputValue('about-hero-title'),
      heroText: getInputValue('about-hero-text'),
      profileName: getInputValue('about-profile-name'),
      profileRole: getInputValue('about-profile-role'),
      avatarSrc: getInputValue('about-avatar-src'),
      links: {
        bilibili: getInputValue('about-link-bilibili'),
        github: getInputValue('about-link-github'),
        qq: getInputValue('about-link-qq'),
        wechat: getInputValue('about-link-wechat'),
        email: getInputValue('about-link-email')
      },
      cards: collectAboutCardsForm(),
      workflow: collectAboutWorkflowForm(),
      timeline: collectAboutTimelineForm(),
      socialButtons: collectSocialButtonsForm()
    }
  };
}

function getInputValue(id) {
  var el = document.getElementById(id);
  return el ? String(el.value || '').trim() : '';
}

function collectNotesForm() {
  var notes = [];
  var items = document.querySelectorAll('.note-item');
  items.forEach(function(item) {
    var label = item.querySelector('.note-label');
    var content = item.querySelector('.note-content');
    if (label && content) {
      notes.push({
        label: String(label.value || '').trim(),
        content: String(content.value || '').trim()
      });
    }
  });
  return notes;
}

function collectSectionsForm() {
  var sections = [];
  var items = document.querySelectorAll('.section-item');
  items.forEach(function(item, index) {
    var id = item.getAttribute('data-id');
    var enabled = item.querySelector('.section-enabled').checked;
    var name = item.querySelector('.section-name');
    var eyebrow = item.querySelector('.section-eyebrow');
    if (id) {
      sections.push({
        id: id,
        name: String(name ? name.value : '').trim(),
        eyebrow: String(eyebrow ? eyebrow.value : '').trim(),
        enabled: enabled,
        order: index + 1
      });
    }
  });
  return sections;
}

function collectAboutCardsForm() {
  var cards = [];
  var items = document.querySelectorAll('.about-card-item');
  items.forEach(function(item) {
    var titleEl = item.querySelector('.about-card-title');
    var contentEl = item.querySelector('.about-card-content');
    cards.push({
      title: String(titleEl ? titleEl.value : '').trim(),
      content: String(contentEl ? contentEl.value : '').trim()
    });
  });
  return cards;
}

function collectAboutWorkflowForm() {
  return {
    eyebrow: getInputValue('about-workflow-eyebrow'),
    title: getInputValue('about-workflow-title'),
    commands: getInputValue('about-workflow-commands'),
    stack1Title: getInputValue('about-workflow-stack1-title'),
    stack2Title: getInputValue('about-workflow-stack2-title'),
    stack1Items: getInputValue('about-workflow-stack1-items'),
    stack2Items: getInputValue('about-workflow-stack2-items')
  };
}

function collectAboutTimelineForm() {
  var items = [];
  var formItems = document.querySelectorAll('.timeline-item-form');
  formItems.forEach(function(item) {
    var dateEl = item.querySelector('.timeline-date');
    var titleEl = item.querySelector('.timeline-title');
    var descEl = item.querySelector('.timeline-desc');
    if (dateEl && titleEl) {
      items.push({
        date: String(dateEl.value || '').trim(),
        title: String(titleEl.value || '').trim(),
        desc: String(descEl ? descEl.value : '').trim()
      });
    }
  });
  return {
    eyebrow: getInputValue('about-timeline-eyebrow'),
    title: getInputValue('about-timeline-title'),
    items: items
  };
}

function setupNotesEvents() {
  var container = document.getElementById('home-notes-container');
  if (!container) return;
  
  var addBtn = document.getElementById('add-note-btn');
  if (addBtn) {
    addBtn.removeEventListener('click', addNoteHandler);
    addBtn.addEventListener('click', addNoteHandler);
  }
  
  var removeBtns = container.querySelectorAll('.remove-note-btn');
  removeBtns.forEach(function(btn) {
    btn.removeEventListener('click', removeNoteHandler);
    btn.addEventListener('click', removeNoteHandler);
  });
}

function addNoteHandler() {
  var container = document.getElementById('home-notes-container');
  if (!container) return;
  
  var index = container.querySelectorAll('.note-item').length;
  var item = document.createElement('div');
  item.className = 'note-item';
  item.setAttribute('data-index', index);
  item.innerHTML = `
    <div class="form-row">
      <div class="form-group">
        <label>标签</label>
        <input type="text" class="note-label" placeholder="例如：正在构建">
      </div>
      <div class="form-group">
        <label>内容</label>
        <input type="text" class="note-content" placeholder="笔记内容">
      </div>
      <button type="button" class="remove-note-btn">删除</button>
    </div>
  `;
  container.appendChild(item);
  setupNotesEvents();
}

function removeNoteHandler(e) {
  var btn = e.target;
  var item = btn.closest('.note-item');
  if (item) {
    item.remove();
    updateNoteIndices();
  }
}

function updateNoteIndices() {
  var items = document.querySelectorAll('.note-item');
  items.forEach(function(item, index) {
    item.setAttribute('data-index', index);
  });
}

function setupSectionsEvents() {
  var container = document.getElementById('home-sections-container');
  if (!container) return;
  
  var upBtns = container.querySelectorAll('.move-up-btn');
  upBtns.forEach(function(btn) {
    btn.removeEventListener('click', moveSectionUpHandler);
    btn.addEventListener('click', moveSectionUpHandler);
  });
  
  var downBtns = container.querySelectorAll('.move-down-btn');
  downBtns.forEach(function(btn) {
    btn.removeEventListener('click', moveSectionDownHandler);
    btn.addEventListener('click', moveSectionDownHandler);
  });
}

function moveSectionUpHandler(e) {
  var btn = e.target;
  var item = btn.closest('.section-item');
  if (!item) return;
  
  var prev = item.previousElementSibling;
  if (prev && prev.classList.contains('section-item')) {
    item.parentNode.insertBefore(item, prev);
    updateSectionOrders();
    setupSectionsEvents();
  }
}

function moveSectionDownHandler(e) {
  var btn = e.target;
  var item = btn.closest('.section-item');
  if (!item) return;
  
  var next = item.nextElementSibling;
  if (next && next.classList.contains('section-item')) {
    item.parentNode.insertBefore(next, item);
    updateSectionOrders();
    setupSectionsEvents();
  }
}

function updateSectionOrders() {
  var items = document.querySelectorAll('.section-item');
  var total = items.length;
  items.forEach(function(item, index) {
    var orderEl = item.querySelector('.section-order');
    if (orderEl) orderEl.textContent = index + 1;
    var upBtn = item.querySelector('.move-up-btn');
    var downBtn = item.querySelector('.move-down-btn');
    if (upBtn) upBtn.disabled = index === 0;
    if (downBtn) downBtn.disabled = index === total - 1;
  });
}

function setupSavePageSettings() {
  var btn = document.getElementById('save-page-settings-btn');
  if (!btn) return;

  btn.addEventListener('click', function() {
    var payload = collectPageSettingsForm();
    var debugEl = document.getElementById('social-buttons-debug');
    if (debugEl) {
      debugEl.style.display = 'block';
      debugEl.textContent = '保存数据: ' + JSON.stringify(payload.about.socialButtons);
    }
    console.log('[DEBUG] socialButtons collected:', JSON.stringify(payload.about.socialButtons));
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/site-settings', true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
    xhr.onload = function() {
      console.log('[DEBUG] save response status:', xhr.status);
      console.log('[DEBUG] save response:', xhr.responseText.substring(0, 500));
      if (debugEl && xhr.status === 200) {
        try {
          var resp = JSON.parse(xhr.responseText);
          debugEl.textContent = '保存成功! 服务器返回: ' + JSON.stringify(resp.settings.about.socialButtons);
        } catch (e) {
          debugEl.textContent = '保存成功! 响应: ' + xhr.responseText.substring(0, 200);
        }
      } else if (debugEl) {
        debugEl.textContent = '保存失败! 状态: ' + xhr.status + ' 响应: ' + xhr.responseText.substring(0, 200);
      }
      if (xhr.status !== 200) {
        showToast('页面设置保存失败', true);
        return;
      }
      var resp = null;
      try {
        resp = JSON.parse(xhr.responseText || '{}');
      } catch (e) {
        showToast('页面设置保存失败：返回内容不是 JSON', true);
        return;
      }
      if (!resp || resp.success !== true) {
        showToast('页面设置保存失败：接口响应无效', true);
        return;
      }
      showToast('页面设置已保存');
    };
    xhr.onerror = function() {
      showToast('无法连接服务器', true);
    };
    xhr.send(JSON.stringify(payload));
  });
}

function loadArticles() {
  var saved = localStorage.getItem('articles');
  if (!saved) return;

  var data = [];
  try { data = JSON.parse(saved); }
  catch (err) { return; }

  var needsMigration = data.some(function(a) { return a.id < 10000000; });
  if (needsMigration) {
    data = data.map(function(a, idx) {
      return { ...a, id: START_ID + idx };
    });
  }

  data = data.map(function(a) {
    var status = a.status === 'draft' ? 'draft' : 'published';
    return {
      ...a,
      tags: Array.isArray(a.tags) ? a.tags : [],
      summary: typeof a.summary === 'string' ? a.summary : '',
      status: status
    };
  });

  articles = data;
  saveArticles();
}

function saveArticles() {
  localStorage.setItem('articles', JSON.stringify(articles));
}

function getNextArticleId() {
  var maxId = START_ID - 1;
  articles.forEach(function(a) {
    if (a.id > maxId) maxId = a.id;
  });
  return maxId + 1;
}

function setupSidebarNavigation() {
  var navItems = document.querySelectorAll('.nav-item');
  var sections = document.querySelectorAll('.content-section');
  var pageTitle = document.getElementById('page-title');

  navItems.forEach(function(item) {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      var sectionId = item.getAttribute('data-section');

      navItems.forEach(function(nav) { nav.classList.remove('active'); });
      item.classList.add('active');

      sections.forEach(function(section) { section.classList.remove('active'); });
      document.getElementById(sectionId + '-section').classList.add('active');

      pageTitle.textContent = sectionId === 'pages' ? '页面设置' : (sectionId === 'projects' ? '项目管理' : '文章管理');

      if (sectionId === 'articles') {
        currentPage = 1;
        renderArticles();
      } else if (sectionId === 'projects') {
        renderProjects();
      }
    });
  });
}

function setupProjectManagement() {
  setupProjectSearch();
  setupAddProject();
  setupProjectModalHandlers();
}

function setupProjectSearch() {
  var input = document.getElementById('project-search-input');
  if (!input) return;
  input.addEventListener('input', function(e) {
    projectSearchKeyword = String(e.target.value || '').trim().toLowerCase();
    renderProjects();
  });
}

function setupAddProject() {
  var btn = document.getElementById('add-project-btn');
  if (!btn) return;
  btn.addEventListener('click', function() {
    openProjectModal(null);
  });
}

function setupProjectModalHandlers() {
  var overlay = document.getElementById('project-modal-overlay');
  var closeBtn = document.getElementById('project-modal-close');
  var cancelBtn = document.getElementById('project-modal-cancel');
  var saveBtn = document.getElementById('project-modal-save');
  var importBtn = document.getElementById('import-project-md-btn');
  var imageBtn = document.getElementById('project-images-btn');
  var imageInput = document.getElementById('project-images-input');

  if (closeBtn) closeBtn.addEventListener('click', hideProjectModal);
  if (cancelBtn) cancelBtn.addEventListener('click', hideProjectModal);
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) hideProjectModal();
    });
  }
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      saveProject();
    });
  }
  if (importBtn) {
    importBtn.addEventListener('click', function() {
      importProjectMarkdown();
    });
  }
  if (imageBtn && imageInput) {
    imageBtn.addEventListener('click', function() {
      imageInput.click();
    });
    imageInput.addEventListener('change', function(e) {
      var files = Array.prototype.slice.call(e.target.files || []);
      if (files.length === 0) return;
      uploadProjectImages(files);
      imageInput.value = '';
    });
  }
}

function loadProjects() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/projects?' + Date.now(), true);
  xhr.onload = function() {
    if (xhr.status !== 200) return;
    var resp = {};
    try { resp = JSON.parse(xhr.responseText || '{}'); } catch (e) { return; }
    projects = Array.isArray(resp.projects) ? resp.projects : [];
    renderProjects();
  };
  xhr.send();
}

function renderProjects() {
  var tbody = document.getElementById('projects-table-body');
  if (!tbody) return;

  var filtered = projects.filter(function(project) {
    if (!projectSearchKeyword) return true;
    var text = [project.id, project.title, project.summary].join(' ').toLowerCase();
    return text.indexOf(projectSearchKeyword) !== -1;
  });

  tbody.innerHTML = '';
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;color:#655d53;">' + (projectSearchKeyword ? '没有找到匹配的项目' : '暂无项目') + '</td></tr>';
    return;
  }

  filtered.forEach(function(project) {
    var row = document.createElement('tr');
    row.innerHTML =
      '<td class="id-col">' + escapeHtml(project.id || '') + '</td>' +
      '<td class="title-col">' + escapeHtml(project.title || '') + '</td>' +
      '<td class="tags-col">' + escapeHtml((project.summary || '').slice(0, 60)) + '</td>' +
      '<td class="actions-col"><div class="action-btns">' +
      '<button class="action-btn edit project-edit" data-id="' + escapeHtml(project.id || '') + '">编辑</button>' +
      '<button class="action-btn delete project-delete" data-id="' + escapeHtml(project.id || '') + '">删除</button>' +
      '</div></td>';
    tbody.appendChild(row);
  });

  document.querySelectorAll('.project-edit').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = btn.getAttribute('data-id');
      openProjectModal(id);
    });
  });

  document.querySelectorAll('.project-delete').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = btn.getAttribute('data-id');
      if (confirm('确定要删除项目 "' + id + '" 吗？')) {
        deleteProject(id);
      }
    });
  });
}

function openProjectModal(projectId) {
  editingProject = projectId || null;
  projectGalleryItems = [];
  var title = document.getElementById('project-modal-title');
  var idInput = document.getElementById('project-id');
  var titleInput = document.getElementById('project-title');
  var overviewMdInput = document.getElementById('project-overview-md');
  var techMdInput = document.getElementById('project-tech-stack-md');
  var implMdInput = document.getElementById('project-implementation-md');
  var githubInput = document.getElementById('project-link-github');
  var docsInput = document.getElementById('project-link-docs');
  var mdInput = document.getElementById('project-md-input');

  if (title) title.textContent = projectId ? '编辑项目' : '添加项目';
  if (projectId) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/projects/' + projectId + '?' + Date.now(), true);
    xhr.onload = function() {
      if (xhr.status !== 200) {
        showToast('读取项目失败', true);
        return;
      }
      var resp = {};
      try { resp = JSON.parse(xhr.responseText || '{}'); } catch (e) { return; }
      var project = resp.project || {};
      if (idInput) { idInput.value = project.id || ''; idInput.disabled = true; }
      if (titleInput) titleInput.value = project.title || '';
      if (overviewMdInput) overviewMdInput.value = project.overviewMd || project.summary || '';
      if (techMdInput) techMdInput.value = project.techStackMd || (Array.isArray(project.techStack) ? project.techStack.map(function(item) { return '- ' + item; }).join('\n') : '');
      if (implMdInput) implMdInput.value = project.implementationMd || (Array.isArray(project.implementation) ? project.implementation.map(function(item) { return '- ' + item; }).join('\n') : '');
      if (githubInput) githubInput.value = project.links && project.links.github ? project.links.github : '';
      if (docsInput) docsInput.value = project.links && project.links.docs ? project.links.docs : '';
      projectGalleryItems = Array.isArray(project.gallery) ? project.gallery.slice() : [];
      if (mdInput) mdInput.value = '';
      renderProjectGalleryList();
      showProjectModal();
    };
    xhr.send();
  } else {
    if (idInput) { idInput.value = ''; idInput.disabled = false; }
    if (titleInput) titleInput.value = '';
    if (overviewMdInput) overviewMdInput.value = '';
    if (techMdInput) techMdInput.value = '';
    if (implMdInput) implMdInput.value = '';
    if (githubInput) githubInput.value = '';
    if (docsInput) docsInput.value = '';
    if (mdInput) mdInput.value = '';
    renderProjectGalleryList();
    showProjectModal();
  }
}

function showProjectModal() {
  var overlay = document.getElementById('project-modal-overlay');
  if (overlay) overlay.classList.add('show');
}

function hideProjectModal() {
  var overlay = document.getElementById('project-modal-overlay');
  if (overlay) overlay.classList.remove('show');
  editingProject = null;
  projectGalleryItems = [];
}

function renderProjectGalleryList() {
  var list = document.getElementById('project-gallery-list');
  if (!list) return;
  list.innerHTML = '';

  if (projectGalleryItems.length === 0) {
    list.innerHTML = '<div style="font-size:12px;color:#655d53;">暂无图片，上传后会自动生成 gallery</div>';
    return;
  }

  projectGalleryItems.forEach(function(item, idx) {
    var row = document.createElement('div');
    row.className = 'project-gallery-item';
    row.innerHTML =
      '<img src="/projects/' + escapeHtml(getProjectEditingId()) + '/' + escapeHtml(item.src || '') + '" alt="">' +
      '<input type="text" class="gallery-alt" data-idx="' + idx + '" placeholder="图片说明（alt）" value="' + escapeHtmlAttr(item.alt || '') + '">' +
      '<input type="text" class="gallery-caption" data-idx="' + idx + '" placeholder="图注" value="' + escapeHtmlAttr(item.caption || '') + '">' +
      '<button type="button" class="btn btn-danger gallery-remove" data-idx="' + idx + '">删除</button>';
    list.appendChild(row);
  });

  list.querySelectorAll('.gallery-alt').forEach(function(input) {
    input.addEventListener('input', function() {
      var idx = parseInt(input.getAttribute('data-idx'), 10);
      if (projectGalleryItems[idx]) projectGalleryItems[idx].alt = input.value;
    });
  });
  list.querySelectorAll('.gallery-caption').forEach(function(input) {
    input.addEventListener('input', function() {
      var idx = parseInt(input.getAttribute('data-idx'), 10);
      if (projectGalleryItems[idx]) projectGalleryItems[idx].caption = input.value;
    });
  });
  list.querySelectorAll('.gallery-remove').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var idx = parseInt(btn.getAttribute('data-idx'), 10);
      projectGalleryItems.splice(idx, 1);
      renderProjectGalleryList();
    });
  });
}

function getProjectEditingId() {
  return document.getElementById('project-id') ? String(document.getElementById('project-id').value || '').trim() : '';
}

function importProjectMarkdown() {
  var text = String(document.getElementById('project-md-input').value || '').trim();
  if (!text) {
    showToast('请先粘贴 Markdown 内容', true);
    return;
  }

  var parsed = parseProjectMarkdown(text);
  if (document.getElementById('project-title')) document.getElementById('project-title').value = parsed.title;
  if (document.getElementById('project-overview-md')) document.getElementById('project-overview-md').value = parsed.overviewMd;
  if (document.getElementById('project-tech-stack-md')) document.getElementById('project-tech-stack-md').value = parsed.techStackMd;
  if (document.getElementById('project-implementation-md')) document.getElementById('project-implementation-md').value = parsed.implementationMd;
}

function parseProjectMarkdown(mdText) {
  var lines = String(mdText || '').split(/\r?\n/);
  var title = '';
  var overviewLines = [];
  var techStackLines = [];
  var implementationLines = [];
  var section = '';
  var firstSectionSeen = false;

  lines.forEach(function(rawLine) {
    var line = String(rawLine || '');
    var trimmed = line.trim();
    if (!trimmed) {
      if (section === 'overview') overviewLines.push('');
      if (section === 'techStack') techStackLines.push('');
      if (section === 'implementation') implementationLines.push('');
      return;
    }
    if (!title) {
      var h1 = trimmed.match(/^#\s+(.+)$/);
      if (h1) {
        title = h1[1].trim();
        return;
      }
    }
    var h2 = trimmed.match(/^##\s+(.+)$/);
    if (h2) {
      firstSectionSeen = true;
      var sectionTitle = h2[1].trim();
      if (/技术栈/.test(sectionTitle)) section = 'techStack';
      else if (/实现方案/.test(sectionTitle) || /方案/.test(sectionTitle)) section = 'implementation';
      else if (/项目概述/.test(sectionTitle) || /概述/.test(sectionTitle)) section = 'overview';
      else section = '';
      return;
    }

    if (!firstSectionSeen && !section) {
      overviewLines.push(line);
      return;
    }

    if (section === 'overview') overviewLines.push(line);
    if (section === 'techStack') techStackLines.push(line);
    if (section === 'implementation') implementationLines.push(line);
  });

  function trimMarkdownBlock(text) {
    return String(text || '').replace(/^\s+|\s+$/g, '');
  }

  var overviewMd = trimMarkdownBlock(overviewLines.join('\n'));
  var techStackMd = trimMarkdownBlock(techStackLines.join('\n'));
  var implementationMd = trimMarkdownBlock(implementationLines.join('\n'));

  if (!techStackMd) techStackMd = '- ';
  if (!implementationMd) implementationMd = '- ';

  return {
    title: title,
    overviewMd: overviewMd,
    techStackMd: techStackMd,
    implementationMd: implementationMd
  };
}

function uploadProjectImages(files) {
  var projectId = getProjectEditingId();
  if (!projectId) {
    showToast('请先填写项目ID', true);
    return;
  }

  var pending = Array.prototype.slice.call(files || []);
  if (pending.length === 0) return;

  var index = 0;
  function next() {
    if (index >= pending.length) {
      renderProjectGalleryList();
      showToast('演示图片已上传');
      return;
    }
    var file = pending[index++];
    var reader = new FileReader();
    reader.onload = function(ev) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/projects/upload-image', true);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.setRequestHeader('x-filename', encodeURIComponent(file.name));
      xhr.setRequestHeader('x-project-id', projectId);
      xhr.onload = function() {
        if (xhr.status !== 200) {
          showToast('项目图片上传失败', true);
          return;
        }
        var resp = {};
        try { resp = JSON.parse(xhr.responseText || '{}'); } catch (e) {}
        if (resp.success && resp.imageSrc) {
          projectGalleryItems.push({ src: resp.imageSrc, alt: '', caption: '' });
          next();
        } else {
          showToast(resp.message || '项目图片上传失败', true);
        }
      };
      xhr.onerror = function() {
        showToast('项目图片上传失败：网络错误', true);
      };
      xhr.send(ev.target.result);
    };
    reader.readAsArrayBuffer(file);
  }
  next();
}

function saveProject() {
  var projectId = String(document.getElementById('project-id').value || '').trim();
  var title = String(document.getElementById('project-title').value || '').trim();
  var overviewMd = String(document.getElementById('project-overview-md').value || '').trim();
  var techStackMd = String(document.getElementById('project-tech-stack-md').value || '').trim();
  var implementationMd = String(document.getElementById('project-implementation-md').value || '').trim();
  var github = String(document.getElementById('project-link-github').value || '').trim();
  var docs = String(document.getElementById('project-link-docs').value || '').trim();

  if (!projectId || !title || !overviewMd || !techStackMd || !implementationMd) {
    showToast('请补全项目必填项', true);
    return;
  }

  var payload = {
    project: {
      id: projectId,
      title: title,
      overviewMd: overviewMd,
      techStackMd: techStackMd,
      implementationMd: implementationMd,
      links: { github: github, docs: docs },
      gallery: projectGalleryItems
    }
  };

  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/projects/save', true);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
  xhr.onload = function() {
    if (xhr.status === 200) {
      showToast('项目已保存');
      hideProjectModal();
      loadProjects();
    } else {
      showToast('项目保存失败', true);
    }
  };
  xhr.onerror = function() {
    showToast('无法连接服务器', true);
  };
  xhr.send(JSON.stringify(payload));
}

function deleteProject(projectId) {
  var xhr = new XMLHttpRequest();
  xhr.open('DELETE', '/api/projects/' + projectId, true);
  xhr.onload = function() {
    if (xhr.status === 200) {
      showToast('项目已删除');
      loadProjects();
    } else {
      showToast('项目删除失败', true);
    }
  };
  xhr.onerror = function() {
    showToast('无法连接服务器', true);
  };
  xhr.send();
}

function setupTimeDisplay() {
  function updateTime() {
    var now = new Date();
    var timeStr = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    document.getElementById('current-time').textContent = timeStr;
  }
  updateTime();
  setInterval(updateTime, 1000);
}

function setupSearch() {
  document.getElementById('search-input').addEventListener('input', function(e) {
    searchKeyword = e.target.value.trim();
    currentPage = 1;
    renderArticles();
  });
}

function setupAddArticle() {
  document.getElementById('add-article-btn').addEventListener('click', function() {
    editingArticle = null;
    resetEditorState();
    document.getElementById('modal-title').textContent = '添加文章';
    document.getElementById('article-form').reset();
    document.getElementById('article-id-display').textContent = '(新增)';
    document.getElementById('article-date').value = new Date().toISOString().split('T')[0];
    if (easyMDE) easyMDE.value('');
    else document.getElementById('article-content').value = '';
    updateSaveButtons();
    showModal();
  });
}

function setupModalHandlers() {
  document.getElementById('modal-close').addEventListener('click', hideModal);
  document.getElementById('modal-cancel').addEventListener('click', hideModal);
  document.getElementById('modal-save-draft').addEventListener('click', function() {
    saveArticle('draft');
  });
  document.getElementById('modal-publish').addEventListener('click', function() {
    saveArticle('published');
  });
  document.getElementById('modal-overlay').addEventListener('click', function(e) {
    if (e.target === document.getElementById('modal-overlay')) hideModal();
  });
}

function setupConfirmModal() {
  document.getElementById('confirm-cancel').addEventListener('click', hideConfirmModal);
  document.getElementById('confirm-ok').addEventListener('click', confirmDelete);
  document.getElementById('confirm-modal-overlay').addEventListener('click', function(e) {
    if (e.target === document.getElementById('confirm-modal-overlay')) hideConfirmModal();
  });
}

function setupPagination() {
  document.getElementById('prev-page').addEventListener('click', function() {
    if (currentPage > 1) {
      currentPage--;
      renderArticles();
    }
  });
  document.getElementById('next-page').addEventListener('click', function() {
    var totalPages = getTotalPages();
    if (currentPage < totalPages) {
      currentPage++;
      renderArticles();
    }
  });
}

function showModal() {
  document.getElementById('modal-overlay').classList.add('show');
  if (easyMDE) {
    setTimeout(function() { easyMDE.codemirror.refresh(); }, 50);
  }
}

function hideModal() {
  document.getElementById('modal-overlay').classList.remove('show');
  editingArticle = null;
  resetEditorState();
}

function showConfirmModal(articleId, title) {
  deleteArticleId = articleId;
  document.getElementById('confirm-message').textContent = '确定要删除「' + title + '」吗？此操作不可撤销。';
  document.getElementById('confirm-modal-overlay').classList.add('show');
}

function hideConfirmModal() {
  document.getElementById('confirm-modal-overlay').classList.remove('show');
  deleteArticleId = null;
}

function getTotalPages() {
  var f = filterArticles();
  return Math.ceil(f.length / pageSize);
}

function filterArticles() {
  if (!searchKeyword) return articles;
  var keyword = searchKeyword.toLowerCase();
  return articles.filter(function(article) {
    var summary = article.summary || '';
    var tags = Array.isArray(article.tags) ? article.tags : [];
    return article.title.toLowerCase().includes(keyword)
      || summary.toLowerCase().includes(keyword)
      || tags.some(function(tag) { return tag.toLowerCase().includes(keyword); });
  });
}

function renderArticles() {
  var filtered = filterArticles();
  var totalPages = Math.ceil(filtered.length / pageSize);
  var start = (currentPage - 1) * pageSize;
  var end = start + pageSize;
  var pageArticles = filtered.slice(start, end);
  var tbody = document.getElementById('articles-table-body');
  tbody.innerHTML = '';

  if (pageArticles.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#655d53;">' + (searchKeyword ? '没有找到匹配的文章' : '暂无文章') + '</td></tr>';
    document.getElementById('pagination').style.display = 'none';
    return;
  }

  document.getElementById('pagination').style.display = 'flex';
  document.getElementById('current-page').textContent = currentPage;
  document.getElementById('total-pages').textContent = totalPages;
  document.getElementById('prev-page').disabled = currentPage === 1;
  document.getElementById('next-page').disabled = currentPage >= totalPages;

  pageArticles.forEach(function(article) {
    var status = article.status === 'draft' ? 'draft' : 'published';
    var statusText = status === 'draft' ? '草稿' : '已发布';

    var row = document.createElement('tr');
    row.innerHTML =
      '<td class="checkbox-col"><input type="checkbox" class="article-checkbox" data-id="' + article.id + '"></td>' +
      '<td class="id-col">' + article.id + '</td>' +
      '<td class="title-col">' + escapeHtml(article.title) + '</td>' +
      '<td class="type-col">' + escapeHtml(article.type || '') + '</td>' +
      '<td class="tags-col">' + (article.tags || []).map(function(tag) { return '<span class="tag-badge">' + escapeHtml(tag) + '</span>'; }).join('') + '</td>' +
      '<td class="date-col">' + escapeHtml(article.displayDate || '') + '</td>' +
      '<td class="status-col"><span class="status-badge ' + status + '">' + statusText + '</span></td>' +
      '<td class="actions-col"><div class="action-btns">' +
      '<button class="action-btn edit" data-id="' + article.id + '">编辑</button>' +
      '<button class="action-btn delete" data-id="' + article.id + '">删除</button>' +
      '</div></td>';
    tbody.appendChild(row);
  });

  setupRowActions();
  setupSelectAll();
}

function setupRowActions() {
  document.querySelectorAll('.action-btn.edit').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = parseInt(btn.getAttribute('data-id'), 10);
      var article = articles.find(function(a) { return a.id === id; });
      if (!article) return;

      editingArticle = article;
      resetEditorState();
      referenceAssumeExisting = true;
      document.getElementById('modal-title').textContent = '编辑文章';

      document.getElementById('article-id-display').textContent = id;
      document.getElementById('article-title').value = '加载中...';
      document.getElementById('article-type').value = '';
      document.getElementById('article-summary').value = '加载中...';
      document.getElementById('article-tags').value = '';
      document.getElementById('article-date').value = '';
      if (easyMDE) easyMDE.value('加载中...');
      else document.getElementById('article-content').value = '加载中...';
      showModal();

      fetchArticleFromDisk(id);
    });
  });

  document.querySelectorAll('.action-btn.delete').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = parseInt(btn.getAttribute('data-id'), 10);
      var article = articles.find(function(a) { return a.id === id; });
      if (article) showConfirmModal(id, article.title);
    });
  });
}

function setupSelectAll() {
  document.getElementById('select-all').addEventListener('change', function(e) {
    document.querySelectorAll('.article-checkbox').forEach(function(cb) {
      cb.checked = e.target.checked;
    });
  });
}

function resetEditorState() {
  detectedImages = [];
  selectedImageFiles = [];
  importedMdFilename = '';
  uploadSessionId = generateUploadSessionId();
  referenceAssumeExisting = false;
  existingReferencePaths = {};
  manualMatchByPath = {};
  manualMatchByBasename = {};
  hideImageImportSection();
  updateImageSummary(0, 0, 0);
}

function setupMarkdownImport() {
  var importBtn = document.getElementById('import-md-btn');
  var fileInput = document.getElementById('md-file-input');
  if (!importBtn || !fileInput) return;

  importBtn.addEventListener('click', function() {
    fileInput.click();
  });

  fileInput.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(ev) {
      importedMdFilename = file.name || '';
      referenceAssumeExisting = false;

      var rawText = String(ev.target.result || '');
      var parsed = parseFrontMatterAndContent(rawText);
      applyFrontMatterToForm(parsed.frontMatter, importedMdFilename);

      if (easyMDE) easyMDE.value(parsed.content);
      else document.getElementById('article-content').value = parsed.content;

      rebuildImageReferencesFromContent();
      autoMatchImages();
      renderImageImportList();
      showToast('Markdown 导入完成');
      fileInput.value = '';
    };
    reader.readAsText(file, 'UTF-8');
  });
}

function setupImagePicker() {
  var btn = document.getElementById('import-images-btn');
  var input = document.getElementById('images-file-input');
  if (!btn || !input) return;

  btn.addEventListener('click', function() {
    input.click();
  });

  input.addEventListener('change', function(e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    if (files.length === 0) return;
    selectedImageFiles = files;
    referenceAssumeExisting = false;

    if (detectedImages.length === 0) {
      rebuildImageReferencesFromContent();
    }

    autoMatchImages();
    renderImageImportList();
    showToast('已选择 ' + files.length + ' 张图片');
    input.value = '';
  });
}

function setupImageRescan() {
  var btn = document.getElementById('btn-rescan-images');
  if (!btn) return;
  btn.addEventListener('click', function() {
    rebuildImageReferencesFromContent();
    autoMatchImages();
    renderImageImportList();
    showToast('已重新扫描正文中的图片引用');
  });
}

function extractImageSrc(rawSrc) {
  var src = String(rawSrc || '').trim();
  if (!src) return '';
  if (src.charAt(0) === '<' && src.charAt(src.length - 1) === '>') {
    src = src.slice(1, -1).trim();
  }
  var quotedTitle = src.match(/^(.+?)\s+["'].*["']\s*$/);
  if (quotedTitle) {
    src = quotedTitle[1].trim();
  }
  return src;
}

function parseMarkdownImageMatches(md) {
  var images = [];
  var standardRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  var obsidianRegex = /!\[\[([^\]]+)\]\]/g;
  var match;

  while ((match = standardRegex.exec(md)) !== null) {
    var src = extractImageSrc(match[2]);
    if (!src || isExternalOrDataImage(src)) continue;
    images.push({
      full: match[0],
      alt: match[1] || '',
      src: src,
      normalizedSrc: normalizeImagePath(src),
      basename: basenameFromPath(src),
      style: 'standard',
      position: match.index
    });
  }

  while ((match = obsidianRegex.exec(md)) !== null) {
    var obsidianSrc = extractImageSrc(match[1]);
    if (!obsidianSrc || isExternalOrDataImage(obsidianSrc)) continue;
    images.push({
      full: match[0],
      alt: '',
      src: obsidianSrc,
      normalizedSrc: normalizeImagePath(obsidianSrc),
      basename: basenameFromPath(obsidianSrc),
      style: 'obsidian',
      position: match.index
    });
  }

  images.sort(function(a, b) { return a.position - b.position; });
  return images;
}

function isExternalOrDataImage(src) {
  return /^(https?:\/\/|data:|\/\/)/i.test(String(src || '').trim());
}

function normalizeImagePath(p) {
  return String(p || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .toLowerCase();
}

function basenameFromPath(p) {
  var n = normalizeImagePath(p);
  var parts = n.split('/');
  return parts[parts.length - 1] || '';
}

function rebuildImageReferencesFromContent() {
  var content = easyMDE ? easyMDE.value() : document.getElementById('article-content').value;
  var matches = parseMarkdownImageMatches(content);

  detectedImages = matches.map(function(m) {
    return {
      mdPath: m.src,
      normalizedPath: m.normalizedSrc,
      basename: m.basename,
      style: m.style,
      alt: m.alt,
      full: m.full,
      position: m.position,
      status: referenceAssumeExisting ? 'existing' : 'missing',
      matchType: referenceAssumeExisting ? 'existing' : 'none',
      selectedFile: null,
      uploadedName: '',
      candidates: []
    };
  });
}

function buildImageFileIndex() {
  var byName = {};
  var byPath = {};

  selectedImageFiles.forEach(function(file) {
    var rel = normalizeImagePath(file.webkitRelativePath || file.name);
    var name = basenameFromPath(file.name);

    if (!byName[name]) byName[name] = [];
    byName[name].push(file);

    if (!byPath[rel]) byPath[rel] = [];
    byPath[rel].push(file);
  });

  return { byName: byName, byPath: byPath };
}

function autoMatchImages() {
  if (detectedImages.length === 0) {
    renderImageImportList();
    return;
  }

  var index = buildImageFileIndex();

  detectedImages.forEach(function(img) {
    img.selectedFile = null;
    img.uploadedName = '';
    img.candidates = [];

    if (referenceAssumeExisting && existingReferencePaths[img.normalizedPath]) {
      img.status = 'existing';
      img.matchType = 'existing';
      return;
    }

    var byPathCandidates = index.byPath[img.normalizedPath] || [];
    if (byPathCandidates.length === 1) {
      img.status = 'matched';
      img.matchType = 'path';
      img.selectedFile = byPathCandidates[0];
      return;
    }

    if (byPathCandidates.length > 1) {
      var preferredPathId = manualMatchByPath[img.normalizedPath];
      if (preferredPathId) {
        var preferredPathFile = byPathCandidates.find(function(f) { return getFileIdentity(f) === preferredPathId; });
        if (preferredPathFile) {
          img.status = 'matched';
          img.matchType = 'manual';
          img.selectedFile = preferredPathFile;
          return;
        }
      }
      img.status = 'conflict';
      img.matchType = 'path-conflict';
      img.candidates = byPathCandidates;
      return;
    }

    var byNameCandidates = index.byName[img.basename] || [];
    if (byNameCandidates.length === 1) {
      img.status = 'matched';
      img.matchType = 'name';
      img.selectedFile = byNameCandidates[0];
      return;
    }

    if (byNameCandidates.length > 1) {
      var preferredNameId = manualMatchByBasename[img.basename];
      if (preferredNameId) {
        var preferredNameFile = byNameCandidates.find(function(f) { return getFileIdentity(f) === preferredNameId; });
        if (preferredNameFile) {
          img.status = 'matched';
          img.matchType = 'manual';
          img.selectedFile = preferredNameFile;
          return;
        }
      }
      img.status = 'conflict';
      img.matchType = 'name-conflict';
      img.candidates = byNameCandidates;
      return;
    }

    img.status = 'missing';
    img.matchType = 'none';
  });
}

function setExistingReferencePathsFromContent(content) {
  existingReferencePaths = {};
  parseMarkdownImageMatches(content || '').forEach(function(m) {
    existingReferencePaths[m.normalizedSrc] = true;
  });
}

function handleConflictSelection(idx, selectedValue) {
  var item = detectedImages[idx];
  if (!item) return;

  var selected = item.candidates.find(function(file) {
    return getFileIdentity(file) === selectedValue;
  });

  if (!selected) {
    item.status = 'conflict';
    item.selectedFile = null;
    return;
  }

  item.selectedFile = selected;
  item.status = 'matched';
  item.matchType = 'manual';
  manualMatchByPath[item.normalizedPath] = selectedValue;
  manualMatchByBasename[item.basename] = selectedValue;
  renderImageImportList();
}

function getFileIdentity(file) {
  return [file.name, file.size, file.lastModified].join('::');
}

function renderImageImportList() {
  var section = document.getElementById('image-import-section');
  var listEl = document.getElementById('image-import-list');
  if (!section || !listEl) return;

  if (detectedImages.length === 0) {
    section.style.display = 'none';
    updateImageSummary(0, 0, 0);
    updateSaveButtons();
    return;
  }

  section.style.display = 'block';
  listEl.innerHTML = '';

  var counts = { matched: 0, missing: 0, conflict: 0 };

  detectedImages.forEach(function(img, idx) {
    if (img.status === 'matched' || img.status === 'existing') counts.matched++;
    if (img.status === 'missing') counts.missing++;
    if (img.status === 'conflict') counts.conflict++;

    var item = document.createElement('div');
    item.className = 'image-import-item';

    var pathSpan = document.createElement('span');
    pathSpan.className = 'image-import-path';
    pathSpan.textContent = img.mdPath;
    item.appendChild(pathSpan);

    if (img.status === 'matched') {
      var mapped = document.createElement('span');
      mapped.className = 'image-import-name';
      mapped.textContent = '→ ' + img.selectedFile.name;
      item.appendChild(mapped);

      var statusMatched = document.createElement('span');
      statusMatched.className = 'image-import-status';
      statusMatched.textContent = img.matchType === 'manual' ? '手动匹配' : '自动匹配';
      item.appendChild(statusMatched);
    } else if (img.status === 'existing') {
      var statusExisting = document.createElement('span');
      statusExisting.className = 'image-import-status';
      statusExisting.textContent = '已存在';
      item.appendChild(statusExisting);
    } else if (img.status === 'conflict') {
      var select = document.createElement('select');
      select.className = 'image-conflict-select';

      var defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '选择冲突文件...';
      select.appendChild(defaultOpt);

      img.candidates.forEach(function(file) {
        var opt = document.createElement('option');
        opt.value = getFileIdentity(file);
        opt.textContent = file.name + ' (' + formatFileSize(file.size) + ')';
        select.appendChild(opt);
      });

      select.addEventListener('change', function(e) {
        handleConflictSelection(idx, e.target.value);
      });
      item.appendChild(select);

      var statusConflict = document.createElement('span');
      statusConflict.className = 'image-import-status image-import-status-conflict';
      statusConflict.textContent = '同名冲突';
      item.appendChild(statusConflict);
    } else {
      var statusMissing = document.createElement('span');
      statusMissing.className = 'image-import-status image-import-status-missing';
      statusMissing.textContent = '未匹配';
      item.appendChild(statusMissing);
    }

    listEl.appendChild(item);
  });

  updateImageSummary(counts.matched, counts.missing, counts.conflict);
  updateSaveButtons();
}

function updateImageSummary(matched, missing, conflict) {
  var el = document.getElementById('image-summary');
  if (!el) return;
  el.textContent = '已匹配 ' + matched + ' / 未匹配 ' + missing + ' / 冲突 ' + conflict;
}

function hideImageImportSection() {
  var section = document.getElementById('image-import-section');
  if (section) section.style.display = 'none';
}

function formatFileSize(size) {
  if (size < 1024) return size + 'B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + 'KB';
  return (size / (1024 * 1024)).toFixed(1) + 'MB';
}

function parseFrontMatterAndContent(mdText) {
  var text = String(mdText || '');
  var fmPattern = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/;
  var match = text.match(fmPattern);

  if (!match) {
    return { frontMatter: {}, content: text };
  }

  var yamlBlock = match[1] || '';
  var content = text.slice(match[0].length);
  return {
    frontMatter: parseSimpleYaml(yamlBlock),
    content: content
  };
}

function parseSimpleYaml(yamlText) {
  var data = {};
  var lines = String(yamlText || '').split(/\r?\n/);
  var activeListKey = null;

  lines.forEach(function(rawLine) {
    var line = rawLine || '';
    if (!line.trim() || /^\s*#/.test(line)) return;

    var listMatch = line.match(/^\s*-\s*(.+)$/);
    if (listMatch && activeListKey) {
      if (!Array.isArray(data[activeListKey])) data[activeListKey] = [];
      data[activeListKey].push(cleanYamlScalar(listMatch[1]));
      return;
    }

    activeListKey = null;
    var kv = line.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!kv) return;

    var key = kv[1];
    var rawValue = kv[2] || '';

    if (!rawValue.trim()) {
      data[key] = [];
      activeListKey = key;
      return;
    }

    data[key] = cleanYamlScalar(rawValue);
  });

  return data;
}

function cleanYamlScalar(value) {
  var v = String(value || '').trim();

  if ((v.charAt(0) === '"' && v.charAt(v.length - 1) === '"') || (v.charAt(0) === '\'' && v.charAt(v.length - 1) === '\'')) {
    v = v.slice(1, -1);
  }

  var inlineArray = v.match(/^\[(.*)\]$/);
  if (inlineArray) {
    if (!inlineArray[1].trim()) return [];
    return inlineArray[1].split(',').map(function(part) {
      return cleanYamlScalar(part);
    }).filter(Boolean);
  }

  return v;
}

function applyFrontMatterToForm(frontMatter, mdFilename) {
  var fallbackTitle = mdFilename ? mdFilename.replace(/\.(md|markdown)$/i, '') : '';

  var title = String(frontMatter.title || '').trim();
  var type = normalizeType(frontMatter.type || frontMatter.category || extractCategory(frontMatter.categories));
  var summary = firstNonEmptyString(frontMatter.summary, frontMatter.description, frontMatter.excerpt);
  var date = normalizeDateString(firstNonEmptyString(frontMatter.date, frontMatter.published_at));
  var tags = normalizeTags(frontMatter.tags);

  document.getElementById('article-title').value = title || fallbackTitle;
  document.getElementById('article-type').value = type;
  document.getElementById('article-summary').value = summary;
  document.getElementById('article-tags').value = tags.join(', ');
  if (date) {
    document.getElementById('article-date').value = date;
  }
}

function firstNonEmptyString() {
  for (var i = 0; i < arguments.length; i++) {
    var v = arguments[i];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function normalizeType(typeValue) {
  var type = String(typeValue || '').trim();
  if (!type) return '';
  return ARTICLE_TYPES.indexOf(type) >= 0 ? type : '';
}

function extractCategory(categories) {
  if (Array.isArray(categories) && categories.length > 0) return categories[0];
  if (typeof categories === 'string') return categories;
  return '';
}

function normalizeTags(tagsValue) {
  if (Array.isArray(tagsValue)) {
    return tagsValue.map(function(tag) { return String(tag || '').trim(); }).filter(Boolean);
  }
  if (typeof tagsValue === 'string') {
    return tagsValue.split(',').map(function(tag) { return tag.trim(); }).filter(Boolean);
  }
  return [];
}

function normalizeDateString(dateString) {
  var s = String(dateString || '').trim();
  if (!s) return '';
  var m = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (!m) return '';
  var year = m[1];
  var month = m[2].padStart(2, '0');
  var day = m[3].padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function collectFormData() {
  var titleInput = document.getElementById('article-title').value.trim();
  var fallbackTitle = importedMdFilename ? importedMdFilename.replace(/\.(md|markdown)$/i, '').trim() : '';

  var data = {
    title: titleInput || fallbackTitle,
    type: document.getElementById('article-type').value,
    summary: document.getElementById('article-summary').value.trim(),
    tags: document.getElementById('article-tags').value.split(',').map(function(tag) { return tag.trim(); }).filter(Boolean),
    date: document.getElementById('article-date').value,
    content: (easyMDE ? easyMDE.value() : document.getElementById('article-content').value).trim()
  };

  return data;
}

function validateFormData(data) {
  var missing = [];
  if (!data.title) missing.push('标题');
  if (!data.type) missing.push('分类');
  if (!data.summary) missing.push('摘要');
  if (!data.tags || data.tags.length === 0) missing.push('标签');
  if (!data.date) missing.push('发布日期');
  if (!data.content) missing.push('正文');

  if (missing.length > 0) {
    showToast('请补全必填项：' + missing.join('、'), true);
    return false;
  }
  return true;
}

function getImageCounts() {
  return detectedImages.reduce(function(acc, item) {
    if (item.status === 'matched' || item.status === 'existing') acc.matched++;
    else if (item.status === 'conflict') acc.conflict++;
    else if (item.status === 'missing') acc.missing++;
    return acc;
  }, { matched: 0, conflict: 0, missing: 0 });
}

function updateSaveButtons() {
  var draftBtn = document.getElementById('modal-save-draft');
  var publishBtn = document.getElementById('modal-publish');
  if (!draftBtn || !publishBtn) return;

  var counts = getImageCounts();
  var canPublish = counts.missing === 0 && counts.conflict === 0;

  publishBtn.disabled = !canPublish;
  publishBtn.title = canPublish ? '' : '仍有未匹配或冲突图片，无法发布';
}

function uploadImageFile(file, callback, onError, sessionId) {
  var reader = new FileReader();
  reader.onload = function(ev) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/articles/upload-image', true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-filename', encodeURIComponent(file.name));
    xhr.setRequestHeader('x-upload-session', sessionId || uploadSessionId || 'default');

    xhr.onload = function() {
      if (xhr.status === 200) {
        var resp = JSON.parse(xhr.responseText || '{}');
        if (resp.success) callback(resp.filename);
        else if (onError) onError(new Error(resp.message || '上传失败'));
      } else {
        if (onError) onError(new Error('上传失败: HTTP ' + xhr.status));
      }
    };

    xhr.onerror = function() {
      if (onError) onError(new Error('网络错误'));
    };

    xhr.send(ev.target.result);
  };

  reader.onerror = function() {
    if (onError) onError(new Error('读取文件失败'));
  };

  reader.readAsArrayBuffer(file);
}

function uploadMatchedImages(sessionId, callback) {
  var identityToRefs = {};
  detectedImages.forEach(function(item) {
    if (!(item.status === 'matched' && item.selectedFile && !item.uploadedName)) return;
    var identity = getFileIdentity(item.selectedFile);
    if (!identityToRefs[identity]) identityToRefs[identity] = [];
    identityToRefs[identity].push(item);
  });

  var needUpload = Object.keys(identityToRefs).map(function(identity) {
    return {
      identity: identity,
      file: identityToRefs[identity][0].selectedFile,
      refs: identityToRefs[identity]
    };
  });

  if (needUpload.length === 0) {
    callback(null);
    return;
  }

  var index = 0;

  function next() {
    if (index >= needUpload.length) {
      callback(null);
      return;
    }

    var group = needUpload[index++];
    uploadImageFile(group.file, function(filename) {
      group.refs.forEach(function(ref) {
        ref.uploadedName = filename;
      });
      next();
    }, function(err) {
      callback(err || new Error('图片上传失败'));
    }, sessionId);
  }

  next();
}

function buildContentWithMappings(content, targetStatus) {
  var matches = parseMarkdownImageMatches(content);
  if (matches.length === 0) {
    return { content: content, rewrites: [], unresolved: 0 };
  }

  var rewrites = [];
  var unresolved = 0;

  for (var i = matches.length - 1; i >= 0; i--) {
    var match = matches[i];
    var ref = detectedImages[i];
    var replacement = match.full;

    if (ref && ref.status === 'matched' && ref.uploadedName) {
      if (ref.uploadedName !== match.src) {
        replacement = '![' + (match.alt || '') + '](' + ref.uploadedName + ')';
        rewrites.push({ from: match.src, to: ref.uploadedName });
      }
    } else if (ref && ref.status === 'existing') {
      replacement = match.full;
    } else {
      unresolved++;
      if (targetStatus === 'draft') {
        var placeholder = buildMissingImagePlaceholder(match.src);
        replacement = '![' + (match.alt || '') + '](' + placeholder + ')';
        rewrites.push({ from: match.src, to: '[未匹配占位图]' });
      }
    }

    if (replacement !== match.full) {
      content = content.slice(0, match.position) + replacement + content.slice(match.position + match.full.length);
    }
  }

  return {
    content: content,
    rewrites: rewrites.reverse(),
    unresolved: unresolved
  };
}

function showRewritePreview(rewrites) {
  return true;
}

function escapeAttr(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildMissingImagePlaceholder(src) {
  var safeSrc = escapeAttr(src || '未匹配图片');
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="220">' +
    '<rect width="640" height="220" fill="#f3efe8"/>' +
    '<text x="320" y="96" text-anchor="middle" fill="#9b8f7f" font-size="20">图片未匹配（草稿占位）</text>' +
    '<text x="320" y="132" text-anchor="middle" fill="#b1a698" font-size="14">' + safeSrc + '</text>' +
    '</svg>';
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function saveArticle(targetStatus) {
  var saveSessionId = uploadSessionId;
  var data = collectFormData();
  if (!validateFormData(data)) return;

  rebuildImageReferencesFromContent();
  autoMatchImages();
  renderImageImportList();

  var counts = getImageCounts();
  var hasImageIssue = counts.missing > 0 || counts.conflict > 0;

  if (editingArticle && editingArticle.status === 'published' && hasImageIssue) {
    showToast('已发布文章存在未匹配/冲突图片，禁止保存，请先完成匹配', true);
    return;
  }

  if (targetStatus === 'published' && hasImageIssue) {
    showToast('仍有 ' + (counts.missing + counts.conflict) + ' 项图片未完成匹配，无法发布', true);
    return;
  }

  uploadMatchedImages(saveSessionId, function(uploadErr) {
    if (uploadErr) {
      showToast(uploadErr.message || '图片上传失败', true);
      return;
    }

    var built = buildContentWithMappings(data.content, targetStatus);
    if (targetStatus === 'published' && built.unresolved > 0) {
      showToast('仍有 ' + built.unresolved + ' 张图片未匹配，无法发布', true);
      return;
    }
    if (targetStatus === 'draft' && built.unresolved > 0) {
      showToast('有 ' + built.unresolved + ' 张图片未匹配，已写入占位图', true);
    }

    if (!showRewritePreview(built.rewrites)) return;

    var finalContent = built.content;
    if (easyMDE) {
      var cursor = easyMDE.codemirror.getCursor();
      easyMDE.value(finalContent);
      easyMDE.codemirror.setCursor(cursor);
    } else {
      document.getElementById('article-content').value = finalContent;
    }

    var displayDate = data.date.replace(/-/g, '.');
    var article;
    var oldArticleId = null;

    if (editingArticle) {
      var index = articles.findIndex(function(a) { return a.id === editingArticle.id; });
      if (index !== -1) {
        oldArticleId = articles[index].id;
        articles[index] = {
          ...articles[index],
          title: data.title,
          type: data.type,
          summary: data.summary,
          content: finalContent,
          tags: data.tags,
          date: data.date,
          displayDate: displayDate,
          status: targetStatus
        };
        article = articles[index];
      }
    } else {
      var articleId = getNextArticleId();
      article = {
        id: articleId,
        title: data.title,
        type: data.type,
        summary: data.summary,
        content: finalContent,
        tags: data.tags,
        date: data.date,
        displayDate: displayDate,
        status: targetStatus
      };
      articles.push(article);
    }

    if (!article) {
      showToast('保存失败：文章对象异常', true);
      return;
    }

    articles.sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
    });

    saveArticles();
    hideModal();
    renderArticles();

    saveArticleToServer({
      articleId: article.id,
      title: data.title,
      type: data.type,
      displayDate: displayDate,
      tags: data.tags,
      summary: data.summary,
      content: finalContent,
      oldArticleId: oldArticleId,
      status: targetStatus,
      uploadSessionId: saveSessionId,
      mdOriginalFilename: importedMdFilename,
      rewrites: built.rewrites
    });
  });
}

function saveArticleToServer(payload) {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/articles/save', true);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');

  xhr.onload = function() {
    if (xhr.status === 200) {
      var resp = {};
      try { resp = JSON.parse(xhr.responseText || '{}'); } catch (e) {}
      if (resp && Array.isArray(resp.renamedImages) && resp.renamedImages.length > 0) {
        showToast((payload.status === 'published' ? '文章已发布' : '草稿已保存') + '（图片已规范命名）');
      } else {
        showToast(payload.status === 'published' ? '文章已发布' : '草稿已保存');
      }
    } else {
      console.error('[admin] 保存失败: ' + xhr.responseText);
      showToast('保存失败', true);
    }
  };

  xhr.onerror = function() {
    console.error('[admin] 无法连接服务器');
    showToast('无法连接服务器，请确认 server.js 已启动', true);
  };

  xhr.send(JSON.stringify(payload));
}

function confirmDelete() {
  if (deleteArticleId === null) return;

  var articleToDelete = articles.find(function(a) { return a.id === deleteArticleId; });
  var idToDelete = articleToDelete ? articleToDelete.id : null;

  articles = articles.filter(function(a) { return a.id !== deleteArticleId; });
  saveArticles();
  hideConfirmModal();

  if (idToDelete) deleteArticleFromServer(idToDelete);

  var totalPages = getTotalPages();
  if (currentPage > totalPages && currentPage > 1) currentPage--;
  renderArticles();
}

function deleteArticleFromServer(articleId) {
  var xhr = new XMLHttpRequest();
  xhr.open('DELETE', '/api/articles/' + articleId, true);
  xhr.onload = function() {
    if (xhr.status === 200) showToast('文章已删除');
    else console.error('[admin] 删除失败: ' + xhr.responseText);
  };
  xhr.onerror = function() {
    console.error('[admin] 无法连接服务器');
  };
  xhr.send();
}

function fetchArticleFromDisk(articleId) {
  var xhrMeta = new XMLHttpRequest();
  xhrMeta.open('GET', '/articles/' + articleId + '/meta.json?' + Date.now(), true);

  xhrMeta.onload = function() {
    if (xhrMeta.status !== 200) {
      console.error('[admin] 获取文章元数据失败: HTTP ' + xhrMeta.status);
      return;
    }

    var meta;
    try { meta = JSON.parse(xhrMeta.responseText); }
    catch (e) {
      console.error('[admin] 元数据解析失败');
      return;
    }

    document.getElementById('article-id-display').textContent = articleId;
    document.getElementById('article-title').value = meta.title || '';
    document.getElementById('article-type').value = meta.type || '';
    document.getElementById('article-summary').value = meta.summary || '';
    document.getElementById('article-tags').value = Array.isArray(meta.tags) ? meta.tags.join(', ') : '';
    document.getElementById('article-date').value = meta.date || '';

    if (editingArticle) {
      editingArticle.title = meta.title;
      editingArticle.type = meta.type;
      editingArticle.date = meta.date;
      editingArticle.displayDate = meta.displayDate;
      editingArticle.tags = meta.tags || [];
      editingArticle.summary = meta.summary || '';
      editingArticle.status = meta.status === 'draft' ? 'draft' : 'published';
    }

    if (easyMDE) easyMDE.value('加载中...');
    else document.getElementById('article-content').value = '加载中...';

    var xhrMd = new XMLHttpRequest();
    xhrMd.open('GET', '/articles/' + articleId + '/index.md?' + Date.now(), true);
    xhrMd.onload = function() {
      if (xhrMd.status === 200) {
        var mdText = xhrMd.responseText;
        setExistingReferencePathsFromContent(mdText);
        if (editingArticle) editingArticle.content = mdText;
        if (easyMDE) easyMDE.value(mdText);
        else document.getElementById('article-content').value = mdText;
      } else {
        setExistingReferencePathsFromContent('');
        if (easyMDE) easyMDE.value('');
        else document.getElementById('article-content').value = '';
      }

      rebuildImageReferencesFromContent();
      autoMatchImages();
      renderImageImportList();
    };

    xhrMd.onerror = function() {
      console.error('[admin] 无法获取文章正文');
    };

    xhrMd.send();
  };

  xhrMeta.onerror = function() {
    console.error('[admin] 无法获取文章元数据');
  };

  xhrMeta.send();
}

function showToast(message, isError) {
  var toast = document.getElementById('toast');
  if (!toast) return;

  if (toastTimer) clearTimeout(toastTimer);

  toast.textContent = message;
  toast.className = 'toast' + (isError ? ' error' : '');
  void toast.offsetWidth;
  toast.classList.add('show');

  toastTimer = setTimeout(function() {
    toast.classList.remove('show');
  }, 2600);
}

function escapeHtmlAttr(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function initEasyMDE() {
  var textarea = document.getElementById('article-content');
  if (!textarea || typeof EasyMDE === 'undefined') return;

  easyMDE = new EasyMDE({
    element: textarea,
    spellChecker: false,
    placeholder: '文章正文内容（支持 Markdown 格式）...',
    uploadImage: false,
    toolbar: ['bold', 'italic', 'heading', '|', 'quote', 'unordered-list', 'ordered-list', '|', 'link', 'image', '|', 'preview', 'side-by-side', 'fullscreen', '|', 'guide'],
    status: false,
    autoRefresh: { delay: 800 }
  });

  easyMDE.codemirror.on('change', function() {
    if (document.getElementById('modal-overlay').classList.contains('show')) {
      rebuildImageReferencesFromContent();
      autoMatchImages();
      renderImageImportList();
    }
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

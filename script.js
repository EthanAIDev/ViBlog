/**
 * ViBlog 前端脚本 — Dark AI Lab 主题
 * 纯静态：所有内容来自 articles/ 与 projects/ 目录下的 JSON/Markdown 文件，
 * 由 `npm run build-manifest` 生成索引。无后台、无写接口。
 */
(function () {
  "use strict";

  // ==========================================================
  //  工具函数
  // ==========================================================

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function loadJson(url) {
    return fetch(url + "?" + Date.now()).then(function (res) {
      if (!res.ok) throw new Error("加载失败: " + url);
      return res.json();
    });
  }

  function getUrlParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // ==========================================================
  //  全局数据
  // ==========================================================

  var posts = [];
  var projects = [];

  function loadPostsFromManifest() {
    return loadJson("./articles/manifest.json").then(function (manifest) {
      posts = Array.isArray(manifest) ? manifest : [];
    }).catch(function () { posts = []; });
  }

  function loadProjectsFromManifest() {
    return loadJson("./projects/manifest.json").then(function (manifest) {
      projects = Array.isArray(manifest) ? manifest : [];
    }).catch(function () { projects = []; });
  }

  // ==========================================================
  //  卡片构建
  // ==========================================================

  function buildTags(container, tags, interactive) {
    tags.forEach(function (tag) {
      var el = document.createElement(interactive ? "button" : "i");
      el.className = interactive ? "post-tag" : "";
      el.textContent = tag;
      if (interactive) el.setAttribute("data-tag", tag);
      container.appendChild(el);
    });
  }

  // 首页文章卡
  function createHomePostCard(post, index) {
    var card = document.createElement("article");
    card.className = "post glow-card reveal";
    card.style.setProperty("--d", (index % 3) * 80 + "ms");

    var meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = '<span class="type">' + escapeHtml(post.type || "文章") + "</span><time>" + escapeHtml(post.displayDate || post.date || "") + "</time>";

    var title = document.createElement("h3");
    var link = document.createElement("a");
    link.href = post.href || "#";
    link.textContent = post.title || "";
    title.appendChild(link);

    var summary = document.createElement("p");
    summary.textContent = post.summary || "";

    var tags = document.createElement("div");
    tags.className = "tags";
    buildTags(tags, post.tags || [], false);

    card.appendChild(meta);
    card.appendChild(title);
    card.appendChild(summary);
    card.appendChild(tags);
    return card;
  }

  // 首页/列表页项目卡
  function createProjectCard(project, index, featured) {
    var card = document.createElement("a");
    card.className = "proj tilt reveal" + (featured ? " wide" : "");
    card.href = project.href || "#";
    card.style.setProperty("--d", ((index % 2) * 80) + "ms");

    if (project.cover) {
      var cover = document.createElement("div");
      cover.className = "proj-cover";
      var img = document.createElement("img");
      img.src = "projects/" + project.id + "/" + project.cover;
      img.alt = project.title || "";
      img.loading = "lazy";
      cover.appendChild(img);
      card.appendChild(cover);
    }

    var body = document.createElement("div");
    body.className = "proj-body";

    if (featured) {
      var flag = document.createElement("span");
      flag.className = "flag";
      flag.textContent = "Featured · 0" + (index + 1);
      body.appendChild(flag);
    }

    var title = document.createElement("h3");
    title.textContent = project.title || "";

    var summary = document.createElement("p");
    summary.textContent = project.summary || "";

    var projLink = document.createElement("span");
    projLink.className = "proj-link";
    projLink.innerHTML = '查看案例 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>';

    body.appendChild(title);
    body.appendChild(summary);
    body.appendChild(projLink);
    card.appendChild(body);
    return card;
  }

  // 文章列表页卡片
  function createPostCard(post, index) {
    var card = document.createElement("article");
    card.className = "post-card glow-card reveal";
    card.style.setProperty("--d", (index % 4) * 70 + "ms");

    var topline = document.createElement("div");
    topline.className = "card-topline";
    topline.innerHTML = '<span class="card-type">' + escapeHtml(post.type || "文章") + '</span><time>' + escapeHtml(post.displayDate || post.date || "") + "</time>";
    card.appendChild(topline);

    if (post.thumbnail) {
      var thumb = document.createElement("div");
      thumb.className = "card-thumb";
      var thumbLink = document.createElement("a");
      thumbLink.href = post.href || "#";
      var thumbImg = document.createElement("img");
      thumbImg.src = "articles/" + post.id + "/" + post.thumbnail;
      thumbImg.alt = "";
      thumbImg.loading = "lazy";
      thumbLink.appendChild(thumbImg);
      thumb.appendChild(thumbLink);
      card.appendChild(thumb);
    }

    var title = document.createElement("h3");
    var link = document.createElement("a");
    link.href = post.href || "#";
    link.textContent = post.title || "";
    title.appendChild(link);

    var summary = document.createElement("p");
    summary.textContent = post.summary || "";

    var tags = document.createElement("div");
    tags.className = "tag-row tags";
    (post.tags || []).forEach(function (tag) {
      var tagBtn = document.createElement("button");
      tagBtn.className = "post-tag";
      tagBtn.textContent = tag;
      tagBtn.setAttribute("data-tag", tag);
      tagBtn.addEventListener("click", function () {
        var match = $('.tag-filter[data-tag="' + tag + '"]');
        if (match) match.click();
      });
      tags.appendChild(tagBtn);
    });

    card.appendChild(title);
    card.appendChild(summary);
    card.appendChild(tags);
    return card;
  }

  function renderCollection(targetId, items, builder) {
    var container = document.getElementById(targetId);
    if (!container) return;
    var fragment = document.createDocumentFragment();
    items.forEach(function (item, index) { fragment.appendChild(builder(item, index)); });
    container.replaceChildren(fragment);
    observeReveals(container);
  }

  // ==========================================================
  //  首页
  // ==========================================================

  function renderHomeSections() {
    if (!document.getElementById("posts-grid") && !document.getElementById("projects-grid")) return;

    var latestPosts = posts.slice(0, 3);
    renderCollection("posts-grid", latestPosts, createHomePostCard);

    var grid = document.getElementById("projects-grid");
    if (grid) {
      var fragment = document.createDocumentFragment();
      projects.slice(0, 3).forEach(function (project, index) {
        fragment.appendChild(createProjectCard(project, index, index === 0));
      });
      grid.replaceChildren(fragment);
      observeReveals(grid);
    }

    updateHomeStats();
  }

  function updateHomeStats() {
    var postsEl = document.getElementById("stat-posts");
    var projectsEl = document.getElementById("stat-projects");
    if (postsEl) startCounter(postsEl, posts.length, { pad: 2, suffix: "+" });
    if (projectsEl) startCounter(projectsEl, projects.length, { pad: 2 });
    var daysEl = document.getElementById("stat-days");
    if (daysEl) {
      var start = new Date("2025-07-01").getTime();
      var days = Math.max(1, Math.round((Date.now() - start) / 86400000));
      startCounter(daysEl, days, { suffix: "+" });
    }
  }

  // ==========================================================
  //  文章列表页：过滤 + 分页
  // ==========================================================

  var currentFilter = "all";
  var currentCategory = "all";
  var currentSearch = "";
  var currentPage = 1;
  var postsPerPage = 10;

  function setupPostFiltering() {
    var grid = document.getElementById("posts-grid");
    if (!grid || grid.dataset.filterBound === "1") return;
    grid.dataset.filterBound = "1";

    var categoryFilters = document.getElementById("category-filters");
    var tagFilters = document.getElementById("tag-filters");
    var searchInput = document.getElementById("search-input");

    var categories = [];
    posts.forEach(function (post) {
      if (post.type && categories.indexOf(post.type) === -1) categories.push(post.type);
    });
    categories.forEach(function (category) {
      var btn = document.createElement("button");
      btn.className = "category-filter";
      btn.setAttribute("data-category", category);
      btn.textContent = category;
      categoryFilters.appendChild(btn);
    });

    var tags = [];
    posts.forEach(function (post) {
      (post.tags || []).forEach(function (tag) {
        if (tags.indexOf(tag) === -1) tags.push(tag);
      });
    });
    tags.forEach(function (tag) {
      var btn = document.createElement("button");
      btn.className = "tag-filter";
      btn.setAttribute("data-tag", tag);
      btn.textContent = tag;
      tagFilters.appendChild(btn);
    });

    categoryFilters.addEventListener("click", function (e) {
      var btn = e.target.closest(".category-filter");
      if (!btn) return;
      $all(".category-filter").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      currentCategory = btn.getAttribute("data-category");
      currentPage = 1;
      filterPosts();
    });

    tagFilters.addEventListener("click", function (e) {
      var btn = e.target.closest(".tag-filter");
      if (!btn) return;
      var isActive = btn.classList.contains("active");
      $all(".tag-filter").forEach(function (b) { b.classList.remove("active"); });
      if (isActive) {
        tagFilters.querySelector('[data-tag="all"]').classList.add("active");
        currentFilter = "all";
      } else {
        btn.classList.add("active");
        currentFilter = btn.getAttribute("data-tag");
      }
      currentPage = 1;
      filterPosts();
    });

    if (searchInput) {
      searchInput.addEventListener("input", function (e) {
        currentSearch = e.target.value;
        currentPage = 1;
        filterPosts();
      });
    }

    filterPosts();
  }

  function resetPostFilteringState() {
    currentFilter = "all";
    currentCategory = "all";
    currentSearch = "";
    currentPage = 1;
  }

  function filterPosts() {
    var grid = document.getElementById("posts-grid");
    var noResults = document.getElementById("no-results");
    var controls = document.getElementById("pagination-controls");
    if (!grid) return;

    var filtered = posts.slice();
    if (currentCategory !== "all") {
      filtered = filtered.filter(function (p) { return p.type === currentCategory; });
    }
    if (currentFilter !== "all") {
      filtered = filtered.filter(function (p) { return (p.tags || []).indexOf(currentFilter) !== -1; });
    }
    if (currentSearch.trim() !== "") {
      var q = currentSearch.toLowerCase();
      filtered = filtered.filter(function (p) {
        return (p.title || "").toLowerCase().indexOf(q) !== -1 ||
               (p.summary || "").toLowerCase().indexOf(q) !== -1 ||
               (p.tags || []).some(function (t) { return t.toLowerCase().indexOf(q) !== -1; });
      });
    }

    if (filtered.length === 0) {
      grid.style.display = "none";
      if (noResults) noResults.style.display = "block";
      if (controls) { controls.style.display = "none"; controls.replaceChildren(); }
      return;
    }

    grid.style.display = "";
    if (noResults) noResults.style.display = "none";

    var totalPages = Math.max(1, Math.ceil(filtered.length / postsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;
    var pagePosts = filtered.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);

    var fragment = document.createDocumentFragment();
    pagePosts.forEach(function (post, index) { fragment.appendChild(createPostCard(post, index)); });
    grid.replaceChildren(fragment);
    observeReveals(grid);
    renderPagination(controls, currentPage, totalPages, function (page) {
      currentPage = page;
      filterPosts();
    });
  }

  // ==========================================================
  //  项目列表页：分页
  // ==========================================================

  var projectsPerPage = 6;
  var projectsCurrentPage = 1;

  function renderProjectsWithPagination() {
    var list = document.getElementById("projects-list");
    if (!list) return;

    var totalPages = Math.max(1, Math.ceil(projects.length / projectsPerPage));
    if (projectsCurrentPage > totalPages) projectsCurrentPage = totalPages;
    var pageProjects = projects.slice((projectsCurrentPage - 1) * projectsPerPage, projectsCurrentPage * projectsPerPage);

    var fragment = document.createDocumentFragment();
    pageProjects.forEach(function (project, index) {
      fragment.appendChild(createProjectCard(project, index, false));
    });
    list.replaceChildren(fragment);
    observeReveals(list);

    var controls = document.getElementById("projects-pagination-controls");
    renderPagination(controls, projectsCurrentPage, totalPages, function (page) {
      projectsCurrentPage = page;
      renderProjectsWithPagination();
    });
  }

  // ==========================================================
  //  通用分页控件
  // ==========================================================

  function renderPagination(controls, page, totalPages, onGo) {
    if (!controls) return;
    if (totalPages <= 1) { controls.style.display = "none"; controls.replaceChildren(); return; }
    controls.style.display = "flex";
    controls.replaceChildren();

    function makeBtn(label, cls, disabled, handler) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = cls;
      btn.textContent = label;
      btn.disabled = !!disabled;
      if (handler) btn.addEventListener("click", handler);
      return btn;
    }

    controls.appendChild(makeBtn("← 上一页", "pagination-btn pagination-nav-btn", page === 1, function () { onGo(page - 1); }));
    for (var i = 1; i <= totalPages; i++) {
      (function (i) {
        var btn = makeBtn(String(i), "pagination-btn" + (i === page ? " active" : ""), false, function () { onGo(i); });
        if (i === page) btn.setAttribute("aria-current", "page");
        controls.appendChild(btn);
      })(i);
    }
    controls.appendChild(makeBtn("下一页 →", "pagination-btn pagination-nav-btn", page === totalPages, function () { onGo(page + 1); }));
  }

  // ==========================================================
  //  文章详情页
  // ==========================================================

  var externalScriptPromises = {};
  var externalStyleApplied = {};
  var lightboxBound = false;

  var ARTICLE_DEPENDENCIES = {
    katexCss: "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css",
    katexJs: "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js",
    markedJs: "https://cdn.jsdelivr.net/npm/marked/marked.min.js",
    mermaidJs: "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js",
    hljsJs: "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js"
  };

  function loadExternalScriptOnce(src) {
    if (externalScriptPromises[src]) return externalScriptPromises[src];
    if (document.querySelector('script[src="' + src + '"]')) {
      externalScriptPromises[src] = Promise.resolve();
      return externalScriptPromises[src];
    }
    externalScriptPromises[src] = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error("脚本加载失败: " + src)); };
      document.head.appendChild(script);
    });
    return externalScriptPromises[src];
  }

  function loadExternalStyleOnce(href) {
    if (externalStyleApplied[href]) return;
    if (!document.querySelector('link[rel="stylesheet"][href="' + href + '"]')) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
    externalStyleApplied[href] = true;
  }

  function ensureArticleDependenciesLoaded() {
    loadExternalStyleOnce(ARTICLE_DEPENDENCIES.katexCss);
    return Promise.all([
      typeof marked === "undefined" ? loadExternalScriptOnce(ARTICLE_DEPENDENCIES.markedJs) : Promise.resolve(),
      typeof mermaid === "undefined" ? loadExternalScriptOnce(ARTICLE_DEPENDENCIES.mermaidJs) : Promise.resolve(),
      typeof katex === "undefined" ? loadExternalScriptOnce(ARTICLE_DEPENDENCIES.katexJs) : Promise.resolve(),
      typeof hljs === "undefined" ? loadExternalScriptOnce(ARTICLE_DEPENDENCIES.hljsJs) : Promise.resolve()
    ]).catch(function () {
      // CDN 失败时降级：正文仍以纯文本段落渲染
      return null;
    });
  }

  function ensureMarkedLoaded() {
    if (typeof marked !== "undefined") return Promise.resolve();
    return loadExternalScriptOnce(ARTICLE_DEPENDENCIES.markedJs).catch(function () { return null; });
  }

  function ensureLightboxElement() {
    var lightbox = document.getElementById("img-lightbox");
    if (lightbox) return lightbox;
    lightbox = document.createElement("div");
    lightbox.className = "img-lightbox";
    lightbox.id = "img-lightbox";
    var close = document.createElement("span");
    close.className = "img-lightbox-close";
    close.textContent = "×";
    var img = document.createElement("img");
    img.alt = "查看大图";
    lightbox.appendChild(close);
    lightbox.appendChild(img);
    document.body.appendChild(lightbox);
    return lightbox;
  }

  function bindLightboxForImages(containerSelector) {
    var lightbox = ensureLightboxElement();
    var lightboxImg = lightbox.querySelector("img");
    var closeBtn = lightbox.querySelector(".img-lightbox-close");
    var container = document.querySelector(containerSelector);
    if (!container || !lightboxImg || !closeBtn) return;

    function open(src) {
      lightboxImg.src = src;
      lightbox.classList.add("show");
      document.body.style.overflow = "hidden";
    }
    function close() {
      lightbox.classList.remove("show");
      document.body.style.overflow = "";
    }

    $all("img", container).forEach(function (img) {
      if (img.dataset.lightboxBound === "1") return;
      img.dataset.lightboxBound = "1";
      img.addEventListener("click", function () { open(img.src); });
    });

    if (lightboxBound) return;
    lightbox.addEventListener("click", function (e) { if (e.target === lightbox) close(); });
    closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lightbox.classList.contains("show")) close();
    });
    lightboxBound = true;
  }

  function setupAdmonitions() {
    $all(".article-body blockquote").forEach(function (block) {
      var firstP = block.querySelector("p");
      if (!firstP) return;
      var match = firstP.textContent.trim().match(/^\[!(NOTE|TIP|WARNING|IMPORTANT)\]\s*(.*)$/i);
      if (!match) return;
      var type = match[1].toLowerCase();
      block.classList.add("callout-" + type);
      var title = document.createElement("p");
      title.className = "callout-title";
      title.textContent = match[2].trim() || ({ note: "Note", tip: "Tip", warning: "Warning", important: "Important" })[type];
      firstP.remove();
      block.insertBefore(title, block.firstChild);
    });
  }

  function setupCodeBlocks() {
    $all(".article-body pre").forEach(function (pre) {
      if (pre.getAttribute("data-processed")) return;
      pre.setAttribute("data-processed", "true");

      var code = pre.querySelector("code");
      if (!code) return;
      var sourceText = code.textContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

      if (typeof hljs !== "undefined") {
        try { hljs.highlightElement(code); } catch (e) { /* 降级为无高亮 */ }
      }

      var lines = code.innerHTML.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
      if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
      if (lines.length === 0) lines = [""];
      code.innerHTML = lines.map(function (line, index) {
        return '<span class="code-line"><span class="code-line-number">' + (index + 1) +
          '</span><span class="code-line-text">' + (line === "" ? "&nbsp;" : line) + "</span></span>";
      }).join("");

      var lang = "";
      var match = (code.className || "").match(/language-(\w+)/);
      if (match) lang = match[1];

      var header = document.createElement("div");
      header.className = "code-header";
      var langSpan = document.createElement("span");
      langSpan.className = "code-lang";
      langSpan.textContent = lang || "code";
      header.appendChild(langSpan);

      var copyBtn = document.createElement("button");
      copyBtn.className = "code-copy-btn";
      copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>复制';
      copyBtn.addEventListener("click", function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(sourceText).then(function () {
            copyBtn.classList.add("copied");
            copyBtn.textContent = "已复制";
            setTimeout(function () {
              copyBtn.classList.remove("copied");
              copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>复制';
            }, 2000);
          });
        }
      });
      header.appendChild(copyBtn);

      var wrapper = document.createElement("div");
      wrapper.className = "code-block";
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);
    });
  }

  function renderMermaidCharts() {
    var els = $all(".mermaid");
    if (els.length === 0 || typeof mermaid === "undefined") return;
    try { mermaid.initialize({ startOnLoad: false, theme: "neutral" }); } catch (e) { return; }
    els.forEach(function (el) {
      if (el.getAttribute("data-processed")) return;
      el.setAttribute("data-processed", "true");
      var id = "mermaid-" + Math.random().toString(36).slice(2, 8);
      mermaid.render(id, el.textContent.trim()).then(function (result) {
        el.innerHTML = result.svg;
      }).catch(function () {
        el.innerHTML = '<pre>Mermaid 图表渲染失败</pre>';
      });
    });
  }

  function renderMathBlocks() {
    if (typeof katex === "undefined") return;
    $all(".math-inline").forEach(function (el) {
      if (el.getAttribute("data-rendered")) return;
      el.setAttribute("data-rendered", "true");
      try { katex.render(el.textContent, el, { throwOnError: false }); } catch (e) { /* 保留原文 */ }
    });
    $all(".math-block").forEach(function (el) {
      if (el.getAttribute("data-rendered")) return;
      el.setAttribute("data-rendered", "true");
      try { katex.render(el.textContent, el, { throwOnError: false, displayMode: true }); } catch (e) { /* 保留原文 */ }
    });
  }

  function getAdjacentArticles(manifest, articleId) {
    var index = -1;
    (manifest || []).forEach(function (item, i) { if (item && item.id === articleId) index = i; });
    if (index === -1) return { prevArticle: null, nextArticle: null };
    return {
      prevArticle: manifest[index + 1] || null,
      nextArticle: manifest[index - 1] || null
    };
  }

  function renderArticleNavigation(nav, prevArticle, nextArticle, prevLabel, nextLabel) {
    if (!nav) return;
    function buildNavItem(article, direction, label) {
      if (!article) return '<div class="article-post-nav-link is-empty" aria-hidden="true"></div>';
      return '<a class="article-post-nav-link ' + direction + '" href="' + escapeHtml(article.href || "#") + '">' +
        '<span class="article-post-nav-label">' + label + "</span>" +
        '<span class="article-post-nav-title">' + escapeHtml(article.title || "") + "</span></a>";
    }
    nav.innerHTML = buildNavItem(prevArticle, "prev", prevLabel) + buildNavItem(nextArticle, "next", nextLabel);
    nav.style.display = "flex";
  }

  function setupOutline(bodyEl, cardEl, navEl, stateKey) {
    if (!cardEl || !navEl || !bodyEl) return;

    var headings = $all("h1, h2, h3, h4", bodyEl);
    if (headings.length === 0) { cardEl.style.display = "none"; return; }

    cardEl.style.display = "block";
    navEl.innerHTML = "";

    headings.forEach(function (heading, index) {
      var id = (navEl.id || "outline") + "-h-" + index;
      heading.id = id;
      var link = document.createElement("a");
      link.href = "#" + id;
      link.className = "outline-link " + heading.tagName.toLowerCase();
      link.textContent = heading.textContent;
      link.addEventListener("click", function (e) {
        e.preventDefault();
        var target = document.getElementById(id);
        if (target) window.scrollTo({ top: target.offsetTop - 96, behavior: "smooth" });
      });
      navEl.appendChild(link);
    });

    if (!setupOutline.states) setupOutline.states = {};
    var st = setupOutline.states[stateKey] || (setupOutline.states[stateKey] = { activeId: "", handler: null });
    if (st.handler) window.removeEventListener("scroll", st.handler);
    st.activeId = "";

    function updateActive() {
      var currentId = null;
      var scrollTop = window.scrollY + 120;
      headings.forEach(function (heading) {
        if (heading.offsetTop <= scrollTop) currentId = heading.id;
      });
      if (!currentId) {
        // 滚回首个标题之上时清除残留高亮
        if (st.activeId) {
          $all(".outline-link.active", navEl).forEach(function (el) { el.classList.remove("active"); });
          st.activeId = "";
        }
        return;
      }
      if (currentId === st.activeId) return;
      $all(".outline-link.active", navEl).forEach(function (el) { el.classList.remove("active"); });
      var activeLink = navEl.querySelector('.outline-link[href="#' + currentId + '"]');
      if (activeLink) {
        activeLink.classList.add("active");
        // 仅滚动目录容器自身；严禁 scrollIntoView，否则会把整页拽向目录位置
        var linkTop = activeLink.getBoundingClientRect().top - navEl.getBoundingClientRect().top + navEl.scrollTop;
        if (linkTop < navEl.scrollTop + 10 || linkTop > navEl.scrollTop + navEl.clientHeight - 10 - activeLink.offsetHeight) {
          navEl.scrollTop = Math.max(0, linkTop - navEl.clientHeight / 2 + activeLink.offsetHeight / 2);
        }
        st.activeId = currentId;
      }
    }

    updateActive();
    st.handler = function () { updateActive(); };
    window.addEventListener("scroll", st.handler, { passive: true });
  }

  // 内容就绪：移除骨架屏，淡入真实内容
  function revealContent(skeletonId, ids) {
    var sk = document.getElementById(skeletonId);
    if (sk) sk.remove();
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.hidden = false;
        // 先强制 reflow 再挂动画类，确保从 display:none 恢复时动画可靠启动
        void el.offsetWidth;
        el.classList.add("fade-up");
      }
    });
  }

  function showArticleError(message) {
    revealContent("article-skeleton", ["article-body"]);
    var headerSection = $(".article-header-section");
    if (headerSection) {
      headerSection.hidden = false;
      headerSection.innerHTML = '<div class="article-not-found"><h2>文章未找到</h2><p>' + escapeHtml(message) +
        '</p><p><a href="posts.html">← 返回文章列表</a></p></div>';
    }
  }

  function renderArticleData(article) {
    var headerSection = $(".article-header-section");
    var body = document.getElementById("article-body");
    if (!headerSection || !body) return;

    document.title = article.title + " | Ethan ViBlog";

    headerSection.innerHTML =
      '<div class="article-header-content">' +
        '<h1 class="article-title">' + escapeHtml(article.title) + "</h1>" +
        '<div class="article-meta">' +
          '<span class="article-meta-item article-date"><span>' + escapeHtml(article.displayDate || article.date || "") + "</span></span>" +
          (article.readingTime ? '<span class="article-meta-divider" aria-hidden="true"></span><span class="article-meta-item"><span>约 ' + article.readingTime + " 分钟</span></span>" : "") +
          '<span class="article-meta-divider" aria-hidden="true"></span>' +
          '<div class="article-meta-item article-tag-group"><div class="article-tags">' +
            (article.tags || []).map(function (tag) { return "<span>" + escapeHtml(tag) + "</span>"; }).join("") +
          "</div></div>" +
        "</div>" +
        '<div class="article-header-divider" aria-hidden="true"></div>' +
      "</div>";

    body.innerHTML = article.content;
    setupAdmonitions();
    bindLightboxForImages("#article-body");
    setupCodeBlocks();
    renderArticleNavigation(document.getElementById("article-post-nav"), article.prevArticle, article.nextArticle, "< 上一篇", "下一篇 >");
    revealContent("article-skeleton", ["article-body"]);
    headerSection.hidden = false;
    headerSection.classList.add("fade-up");
    setupOutline(body, document.getElementById("article-outline"), document.getElementById("outline-nav"), "article");
    renderMermaidCharts();
    renderMathBlocks();
  }

  function loadArticlePage() {
    var articleRoot = document.getElementById("article-container");
    if (!articleRoot) return;

    var articleId = getUrlParam("id");
    if (!articleId) { showArticleError("未指定文章"); return; }

    ensureArticleDependenciesLoaded().then(function () {
      return Promise.all([
        fetch("./articles/" + articleId + "/meta.json?" + Date.now()),
        fetch("./articles/" + articleId + "/index.md?" + Date.now()),
        fetch("./articles/manifest.json?" + Date.now())
      ]);
    }).then(function (responses) {
      if (!responses[0].ok || !responses[1].ok) throw new Error("文章不存在");
      return Promise.all([
        responses[0].json(),
        responses[1].text(),
        responses[2].ok ? responses[2].json() : Promise.resolve([])
      ]);
    }).then(function (results) {
      var meta = results[0];
      var mdText = results[1];
      var manifest = results[2];
      var adjacent = getAdjacentArticles(manifest, articleId);

      var preprocessed = mdText.replace(/!\[\[([^\]]+)\]\]/g, "![]($1)");
      preprocessed = preprocessed.replace(/\$\$([\s\S]*?)\$\$/g, function (_, latex) {
        return '\n<div class="math-block">' + latex.trim() + "</div>\n";
      });
      preprocessed = preprocessed.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g, function (_, latex) {
        return '<span class="math-inline">' + latex.trim() + "</span>";
      });

      var contentHtml = "<p>" + escapeHtml(preprocessed).replace(/\n/g, "<br>") + "</p>";
      if (typeof marked !== "undefined") {
        marked.setOptions({ breaks: false });
        contentHtml = marked.parse(preprocessed);
      }

      contentHtml = contentHtml.replace(/<img src="([^"]+)"/g, '<img src="./articles/' + articleId + '/$1"');
      contentHtml = contentHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">\n$1\n</div>');
      contentHtml = contentHtml.replace(/<pre><code>mermaid\n([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">\n$1\n</div>');

      var readingTime = Math.max(1, Math.round(mdText.replace(/```[\s\S]*?```/g, "").length / 450));
      renderArticleData({
        title: meta.title,
        date: meta.date,
        displayDate: meta.displayDate,
        tags: meta.tags || [],
        readingTime: readingTime,
        content: contentHtml,
        prevArticle: adjacent.prevArticle,
        nextArticle: adjacent.nextArticle
      });
    }).catch(function (err) {
      showArticleError(err.message || "文章加载失败");
    });
  }

  // ==========================================================
  //  项目详情页
  // ==========================================================

  function markdownFallbackToHtml(text) {
    var escaped = escapeHtml(String(text || ""));
    var blocks = escaped.split(/\r?\n\r?\n/).map(function (item) { return item.trim(); }).filter(Boolean);
    return blocks.map(function (block) {
      if (/^[-*]\s+/m.test(block)) {
        var lines = block.split(/\r?\n/).filter(Boolean);
        return "<ul>" + lines.map(function (line) { return "<li>" + line.replace(/^[-*]\s+/, "") + "</li>"; }).join("") + "</ul>";
      }
      return "<p>" + block.replace(/\r?\n/g, "<br>") + "</p>";
    }).join("");
  }

  function projectMarkdownToHtml(mdText) {
    var text = String(mdText || "").trim();
    if (!text) return "";
    if (typeof marked !== "undefined") {
      marked.setOptions({ breaks: true });
      return marked.parse(text);
    }
    return markdownFallbackToHtml(text);
  }

  function galleryToHtml(items, projectId) {
    if (!Array.isArray(items) || items.length === 0) return "";
    return '<div class="project-gallery-grid">' + items.map(function (item) {
      return "<figure>" +
        '<img src="./projects/' + encodeURIComponent(projectId) + "/" + escapeHtml(item.src || "") + '" alt="' + escapeHtml(item.alt || "") + '" loading="lazy">' +
        "<figcaption>" + escapeHtml(item.caption || item.alt || "") + "</figcaption>" +
        "</figure>";
    }).join("") + "</div>";
  }

  function renderProjectPage(detail, manifest, currentIndex) {
    document.title = detail.title + " | 项目详情 | Ethan ViBlog";

    var header = document.getElementById("project-detail-header");
    var body = document.getElementById("project-detail-body");
    if (!header || !body) return;

    var links = detail.links || {};
    var githubLink = String(links.github || "").trim();
    var docsLink = String(links.docs || "").trim();

    header.innerHTML =
      '<p class="project-detail-flag">Project · 0' + (currentIndex + 1) + "</p>" +
      '<div class="project-detail-title-block"><h1 class="project-detail-title">' + escapeHtml(detail.title || "") + "</h1></div>";

    function section(title, contentHtml) {
      if (!contentHtml || !contentHtml.trim()) return "";
      return '<section class="project-detail-section"><h2>' + title + '</h2><div class="article-body project-markdown-body">' + contentHtml + "</div></section>";
    }

    body.innerHTML =
      section("项目概述", projectMarkdownToHtml(detail.overviewMd || detail.summary || "")) +
      section("技术栈", projectMarkdownToHtml(detail.techStackMd)) +
      section("实现方案", projectMarkdownToHtml(detail.implementationMd)) +
      (githubLink || docsLink
        ? '<section class="project-detail-section"><h2>链接</h2><div class="project-detail-links">' +
          (githubLink ? '<a class="btn btn-primary" href="' + escapeHtml(githubLink) + '" target="_blank" rel="noopener noreferrer">GitHub</a>' : "") +
          (docsLink ? '<a class="btn btn-ghost" href="' + escapeHtml(docsLink) + '" target="_blank" rel="noopener noreferrer">文档</a>' : "") +
          "</div></section>"
        : "") +
      ((detail.gallery || []).length
        ? '<section class="project-detail-section"><h2>演示图片</h2>' + galleryToHtml(detail.gallery, detail.id) + "</section>"
        : "");

    bindLightboxForImages("#project-detail-body .project-gallery-grid");

    var prev = manifest[currentIndex + 1] || null;
    var next = manifest[currentIndex - 1] || null;
    renderArticleNavigation(document.getElementById("project-detail-nav"), prev, next, "< 上一个项目", "下一个项目 >");
    revealContent("project-skeleton", ["project-detail-header", "project-detail-body"]);
    setupOutline(body, document.getElementById("project-outline"), document.getElementById("project-outline-nav"), "project");
  }

  function showProjectError(message) {
    revealContent("project-skeleton", ["project-detail-body"]);
    var header = document.getElementById("project-detail-header");
    if (header) {
      header.hidden = false;
      header.innerHTML = '<div class="project-not-found"><h1>项目未找到</h1><p>' + escapeHtml(message) +
        '</p><p><a href="projects.html">← 返回项目列表</a></p></div>';
    }
  }

  function loadProjectDetailPage() {
    var projectRoot = document.getElementById("project-detail-container");
    if (!projectRoot) return;

    var projectId = getUrlParam("id");
    if (!projectId) { showProjectError("未指定项目"); return; }

    ensureMarkedLoaded().then(function () {
      return loadJson("./projects/manifest.json");
    }).then(function (manifest) {
      var currentIndex = -1;
      (manifest || []).forEach(function (item, i) { if (item.id === projectId) currentIndex = i; });
      if (currentIndex === -1) { showProjectError("未找到对应项目"); return null; }
      return loadJson("./projects/" + projectId + "/detail.json").then(function (detail) {
        renderProjectPage(detail, manifest, currentIndex);
        observeReveals(projectRoot);
        return true;
      });
    }).catch(function () {
      showProjectError("项目详情加载失败");
    });
  }

  // ==========================================================
  //  动效引擎
  // ==========================================================

  var revealObserver = null;

  function observeReveals(root) {
    var elements = $all(".reveal:not(.in)", root || document);
    if (elements.length === 0) return;
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      elements.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -5% 0px" });
    }
    elements.forEach(function (el) { revealObserver.observe(el); });
  }

  // 数字滚动
  function startCounter(el, target, options) {
    options = options || {};
    var pad = options.pad || 0;
    var suffix = options.suffix || "";
    var formatted = function (v) {
      var s = String(Math.round(v));
      while (s.length < pad) s = "0" + s;
      return s;
    };
    if (prefersReducedMotion()) {
      el.innerHTML = "<em>" + formatted(target) + suffix + "</em>";
      return;
    }
    var duration = 1300;
    var startTime = null;
    function frame(now) {
      if (startTime === null) startTime = now;
      var progress = Math.min((now - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.innerHTML = "<em>" + formatted(target * eased) + suffix + "</em>";
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function initCounters() {
    var counters = $all(".stat b[data-count]");
    if (counters.length === 0 || !("IntersectionObserver" in window) || prefersReducedMotion()) {
      counters.forEach(function (el) {
        var target = parseInt(el.getAttribute("data-count"), 10) || 0;
        startCounter(el, target, {
          pad: parseInt(el.getAttribute("data-pad"), 10) || 0,
          suffix: el.getAttribute("data-suffix") || ""
        });
      });
      return;
    }
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        counterObserver.unobserve(el);
        startCounter(el, parseInt(el.getAttribute("data-count"), 10) || 0, {
          pad: parseInt(el.getAttribute("data-pad"), 10) || 0,
          suffix: el.getAttribute("data-suffix") || ""
        });
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { counterObserver.observe(el); });
  }

  // 终端打字机
  function initTyping() {
    var body = document.getElementById("term-body");
    if (!body || body.dataset.typingBound === "1") return;
    body.dataset.typingBound = "1";
    if (prefersReducedMotion()) {
      body.innerHTML =
        '<div><span class="p">$</span> <span class="c">whoami</span></div>' +
        '<div><span class="k">role</span>&nbsp;&nbsp;: <span class="v">AI Agent Engineer</span></div>' +
        '<div><span class="k">focus</span>&nbsp;: <span class="v">RAG · Workflow · Tool Calling</span></div>' +
        '<div><span class="k">stack</span>&nbsp;: <span class="v">Python / FastAPI / Next.js</span></div>' +
        '<div><span class="k">mode</span>&nbsp;&nbsp;: <span class="g">稳扎稳打，深度思考</span></div>' +
        '<div style="margin-top:6px"><span class="p">$</span> <span class="c">writing.next</span>() <span class="cursor"></span></div>';
      return;
    }

    var profileOut = [
      '<div><span class="k">role</span>&nbsp;&nbsp;: <span class="v">AI Agent Engineer</span></div>',
      '<div><span class="k">focus</span>&nbsp;: <span class="v">RAG · Workflow · Tool Calling</span></div>',
      '<div><span class="k">stack</span>&nbsp;: <span class="v">Python / FastAPI / Next.js</span></div>',
      '<div><span class="k">mode</span>&nbsp;&nbsp;: <span class="g">稳扎稳打，深度思考</span></div>'
    ];
    var loopCommands = ["writing.next()", "build --ship-it", "learn --daily"];

    var cursor = document.createElement("span");
    cursor.className = "cursor";

    function makeCmdLine() {
      var line = document.createElement("div");
      line.innerHTML = '<span class="p">$</span> ';
      var cmdSpan = document.createElement("span");
      cmdSpan.className = "c";
      line.appendChild(cmdSpan);
      line.appendChild(cursor);
      body.appendChild(line);
      return cmdSpan;
    }

    function typeText(span, text, speed) {
      return new Promise(function (resolve) {
        var i = 0;
        (function tick() {
          if (i < text.length) {
            span.textContent += text.charAt(i++);
            setTimeout(tick, speed + Math.random() * 50);
          } else {
            resolve();
          }
        })();
      });
    }

    function deleteText(span) {
      return new Promise(function (resolve) {
        (function tick() {
          if (span.textContent.length > 0) {
            span.textContent = span.textContent.slice(0, -1);
            setTimeout(tick, 28);
          } else {
            resolve();
          }
        })();
      });
    }

    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    (async function run() {
      await sleep(600);
      var firstCmd = makeCmdLine();
      await typeText(firstCmd, "whoami", 60);
      await sleep(320);
      cursor.remove();
      // 输出行逐行出现
      for (var i = 0; i < profileOut.length; i++) {
        body.insertAdjacentHTML("beforeend", '<div class="term-line-in">' + profileOut[i] + "</div>");
        await sleep(260);
      }
      await sleep(360);

      var index = 0;
      for (;;) {
        var line = document.createElement("div");
        line.style.marginTop = "6px";
        line.innerHTML = '<span class="p">$</span> ';
        var cmd = document.createElement("span");
        cmd.className = "c";
        line.appendChild(cmd);
        line.appendChild(cursor);
        body.appendChild(line);
        await typeText(cmd, loopCommands[index % loopCommands.length], 55);
        await sleep(2000);
        await deleteText(cmd);
        await sleep(240);
        line.remove();
        index++;
      }
    })();
  }

  // 全局指针交互：光斑跟随 / 3D tilt / 磁性按钮（事件委托，页面切换后依然生效）
  var currentTiltEl = null;
  var currentMagneticEl = null;
  var pointerRaf = false;
  var lastPointerEvent = null;

  function applyTilt(el, e) {
    var rect = el.getBoundingClientRect();
    var px = (e.clientX - rect.left) / rect.width - 0.5;
    var py = (e.clientY - rect.top) / rect.height - 0.5;
    var max = el.classList.contains("wide") ? 2.2 : 3.5;
    el.style.transform = "perspective(900px) rotateX(" + (-py * max).toFixed(2) + "deg) rotateY(" + (px * max).toFixed(2) + "deg) translateY(-5px)";
  }

  function resetTilt(el) {
    el.style.transform = "";
  }

  function handlePointerMove(e) {
    lastPointerEvent = e;
    if (pointerRaf) return;
    pointerRaf = true;
    requestAnimationFrame(function () {
      pointerRaf = false;
      if (!lastPointerEvent) return;
      var ev = lastPointerEvent;
      var target = ev.target;

      var glowCard = target.closest ? target.closest(".glow-card") : null;
      if (glowCard) {
        var rect = glowCard.getBoundingClientRect();
        glowCard.style.setProperty("--mx", (ev.clientX - rect.left) + "px");
        glowCard.style.setProperty("--my", (ev.clientY - rect.top) + "px");
      }

      if (!prefersReducedMotion()) {
        var tiltEl = target.closest ? target.closest(".tilt") : null;
        if (tiltEl !== currentTiltEl) {
          if (currentTiltEl) resetTilt(currentTiltEl);
          currentTiltEl = tiltEl;
        }
        if (tiltEl) applyTilt(tiltEl, ev);

        var magneticEl = target.closest ? target.closest(".magnetic") : null;
        if (magneticEl !== currentMagneticEl) {
          if (currentMagneticEl) currentMagneticEl.style.transform = "";
          currentMagneticEl = magneticEl;
        }
        if (magneticEl) {
          var mrect = magneticEl.getBoundingClientRect();
          var dx = ev.clientX - (mrect.left + mrect.width / 2);
          var dy = ev.clientY - (mrect.top + mrect.height / 2);
          magneticEl.style.transform = "translate(" + (dx * 0.14).toFixed(1) + "px," + (dy * 0.18).toFixed(1) + "px)";
        }
      }
    });
  }

  function initPointerEffects() {
    if (document.body.dataset.pointerBound === "1") return;
    document.body.dataset.pointerBound = "1";
    document.addEventListener("mousemove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", function () {
      if (currentTiltEl) { resetTilt(currentTiltEl); currentTiltEl = null; }
      if (currentMagneticEl) { currentMagneticEl.style.transform = ""; currentMagneticEl = null; }
    });
  }

  // 顶部阅读进度条
  var progressBar = null;

  function updateScrollProgress() {
    if (!progressBar) return;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    progressBar.style.transform = "scaleX(" + ratio + ")";
  }

  // Header 状态 + 返回顶部
  function setupChrome() {
    var topbar = $(".topbar");
    var backTop = $(".back-top");
    progressBar = $(".scroll-progress span");

    function onScroll() {
      if (topbar) topbar.classList.toggle("scrolled", window.scrollY > 8);
      if (backTop) backTop.classList.toggle("show", window.scrollY > 600);
      updateScrollProgress();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (backTop && backTop.dataset.bound !== "1") {
      backTop.dataset.bound = "1";
      backTop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }

  // ==========================================================
  //  导航状态
  // ==========================================================

  function normalizePageName(pathname) {
    var name = String(pathname || "").split("/").pop() || "index.html";
    return name.indexOf(".html") === -1 ? "index.html" : name;
  }

  function updateNavCurrentByPath(pathname) {
    var currentPage = normalizePageName(pathname);
    if (currentPage === "article.html") currentPage = "posts.html";
    else if (currentPage === "project.html") currentPage = "projects.html";
    $all(".nav a").forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#") { link.removeAttribute("aria-current"); return; }
      var target = normalizePageName(new URL(href, window.location.href).pathname);
      if (target === currentPage) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  var SHELL_PAGE_MAP = {
    "index.html": 1, "posts.html": 1, "article.html": 1,
    "projects.html": 1, "project.html": 1, "about.html": 1
  };

  function isShellNavigationTarget(urlObj) {
    if (!urlObj || urlObj.origin !== window.location.origin) return false;
    var pageName = normalizePageName(urlObj.pathname);
    if (!SHELL_PAGE_MAP[pageName]) return false;
    if (pageName === "article.html" || pageName === "project.html") return true;
    return !urlObj.search;
  }

  var navToken = 0;
  var hasSetupShellNavigation = false;

  function runShellNavigation(url, shouldPushState) {
    var targetUrl = new URL(url, window.location.href);
    if (!isShellNavigationTarget(targetUrl)) {
      window.location.href = targetUrl.toString();
      return;
    }

    var token = ++navToken;
    fetch(targetUrl.toString(), { credentials: "same-origin" }).then(function (res) {
      if (!res.ok) throw new Error("页面加载失败");
      return res.text();
    }).then(function (html) {
      if (token !== navToken) return;
      var nextDoc = new DOMParser().parseFromString(html, "text/html");
      var nextMain = nextDoc.querySelector("main");
      var currentMain = document.querySelector("main");
      if (!nextMain || !currentMain) {
        window.location.href = targetUrl.toString();
        return;
      }

      currentMain.replaceWith(nextMain);
      if (nextDoc.body) document.body.className = nextDoc.body.className || "";
      if (nextDoc.title) document.title = nextDoc.title;
      var currentFooter = $(".footer") || $("footer");
      var nextFooter = nextDoc.querySelector("footer");
      if (currentFooter && nextFooter) {
        currentFooter.innerHTML = nextFooter.innerHTML;
        currentFooter.className = nextFooter.className;
      }
      if (shouldPushState) history.pushState({ shellNav: true }, "", targetUrl.toString());
      window.scrollTo(0, 0);
      initPage();
    }).catch(function () {
      window.location.href = targetUrl.toString();
    });
  }

  function setupShellNavigation() {
    if (hasSetupShellNavigation) return;
    hasSetupShellNavigation = true;

    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var link = e.target.closest("a[href]");
      if (!link) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;
      var href = link.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#") return;
      if (/^(mailto:|tel:|javascript:)/i.test(href)) return;

      var targetUrl = new URL(href, window.location.href);
      if (!isShellNavigationTarget(targetUrl)) return;
      e.preventDefault();
      runShellNavigation(targetUrl.toString(), true);
    });

    window.addEventListener("popstate", function () {
      var targetUrl = new URL(window.location.href);
      if (!isShellNavigationTarget(targetUrl)) { window.location.reload(); return; }
      runShellNavigation(targetUrl.toString(), false);
    });
  }

  // ==========================================================
  //  剪贴板 / Toast（关于页使用）
  // ==========================================================

  function showToast(message) {
    var existing = $(".copy-toast");
    if (existing) existing.remove();
    var toast = document.createElement("div");
    toast.className = "copy-toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () { toast.classList.add("show"); }, 10);
    setTimeout(function () {
      toast.classList.remove("show");
      setTimeout(function () { toast.remove(); }, 300);
    }, 2000);
  }

  function copyToClipboard(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast(successMsg || "已复制到剪贴板");
      }).catch(function () { showToast("复制失败，请手动复制"); });
    } else {
      showToast("当前浏览器不支持一键复制");
    }
  }

  window.copyQQ = function () { copyToClipboard("208600679", "QQ 号已复制到剪贴板"); };
  window.copyWechat = function () { copyToClipboard("wechat", "微信号已复制到剪贴板"); };
  window.copyEmail = function () { copyToClipboard("ethandev@qq.com", "邮箱已复制到剪贴板"); };

  // ==========================================================
  //  主题切换
  // ==========================================================

  function initThemeToggle() {
    if (document.body.dataset.themeBound === "1") return;
    document.body.dataset.themeBound = "1";
    var btn = document.querySelector(".theme-toggle");
    if (btn) {
      btn.setAttribute("aria-checked", String(document.documentElement.getAttribute("data-theme") === "light"));
    }
    document.addEventListener("click", function (e) {
      var target = e.target.closest ? e.target.closest(".theme-toggle") : null;
      if (!target) return;
      var root = document.documentElement;
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      target.setAttribute("aria-checked", String(next === "light"));
      try { localStorage.setItem("viblog-theme", next); } catch (err) { /* 隐私模式忽略 */ }
    });
  }

  // ==========================================================
  //  页面初始化
  // ==========================================================

  function initPage() {
    var token = ++navToken;
    resetPostFilteringState();
    updateNavCurrentByPath(window.location.pathname);
    observeReveals();
    initTyping();
    initCounters();

    var dataReady = Promise.all([loadPostsFromManifest(), loadProjectsFromManifest()]);

    dataReady.then(function () {
      if (token !== navToken) return;
      renderHomeSections();
      setupPostFiltering();
      renderProjectsWithPagination();
    });

    if (document.getElementById("article-container")) {
      loadArticlePage();
    }
    if (document.getElementById("project-detail-container")) {
      loadProjectDetailPage();
    }
  }

  function initSiteShell() {
    initThemeToggle();
    setupChrome();
    initPointerEffects();
    setupShellNavigation();
    initPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSiteShell, { once: true });
  } else {
    initSiteShell();
  }
})();

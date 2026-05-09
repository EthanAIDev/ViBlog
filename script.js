var posts = [];
var projects = [];
var BLOG_START_DATE = "2025-06-18";
var siteSettings = null;
var siteSettingsPromise = null;
var hasSetupHeaderScrollEffect = false;
var hasSetupShellNavigation = false;
var currentPageInitToken = 0;
var currentShellNavigationToken = 0;

var SHELL_PAGE_MAP = {
  "index.html": true,
  "posts.html": true,
  "projects.html": true,
  "about.html": true,
  "article.html": true,
  "project.html": true
};

function parseSiteSettingsPayload(text) {
  if (typeof text !== "string" || !text.trim()) return null;
  try {
    var parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      if (parsed.settings && typeof parsed.settings === "object") return parsed.settings;
      if (parsed.site || parsed.home || parsed.about) return parsed;
    }
  } catch (e) {
    return null;
  }
  return null;
}

function requestSiteSettings(url) {
  return new Promise(function(resolve) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url + (url.indexOf("?") >= 0 ? "&" : "?") + Date.now(), true);
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(parseSiteSettingsPayload(xhr.responseText || ""));
      } else {
        resolve(null);
      }
    };
    xhr.onerror = function() {
      resolve(null);
    };
    xhr.send();
  });
}

function markAboutSettingsReady() {
  if (!document || !document.documentElement) return;
  var aboutRoot = document.getElementById("about");
  if (!aboutRoot) return;
  document.documentElement.classList.remove("about-pending-settings");
  document.documentElement.classList.add("about-settings-ready");
}

function markHeaderSettingsReady() {
  if (!document || !document.documentElement) return;
  var brandRoot = document.querySelector(".brand");
  if (!brandRoot) return;
  document.documentElement.classList.remove("header-pending-settings");
  document.documentElement.classList.add("header-settings-ready");
}

function formatMonthFromDate(dateString) {
  var d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  var year = d.getFullYear();
  var month = String(d.getMonth() + 1).padStart(2, "0");
  return year + "." + month;
}

function getLatestPostMonth() {
  if (!Array.isArray(posts) || posts.length === 0) return "";
  var valid = posts.filter(function(post) {
    return post && post.date && !Number.isNaN(new Date(post.date).getTime());
  });
  if (valid.length === 0) return "";
  valid.sort(function(a, b) {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  return formatMonthFromDate(valid[0].date);
}

function getBlogRunDays() {
  var start = new Date(BLOG_START_DATE + "T00:00:00");
  if (Number.isNaN(start.getTime())) return 1;

  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var diffMs = today.getTime() - start.getTime();
  var days = Math.floor(diffMs / 86400000) + 1; // 起始日为第 1 天
  return Math.max(days, 1);
}

function renderHeroStats() {
  var heroStats = document.getElementById("hero-stats");
  if (!heroStats) return;

  var runDays = getBlogRunDays();
  var latestMonth = getLatestPostMonth();
  var latestText = latestMonth ? ("最近更新 " + latestMonth) : "最近更新 --.--";

  heroStats.textContent = "博客已运行 " + runDays + " 天 · " + latestText;
}

function loadSiteSettings() {
  return requestSiteSettings("/api/site-settings").then(function(settings) {
    if (settings) {
      siteSettings = settings;
      return siteSettings;
    }
    return requestSiteSettings("./site-settings.json").then(function(fileSettings) {
      siteSettings = fileSettings;
      return siteSettings;
    });
  });
}

function ensureSiteSettingsLoaded() {
  if (siteSettings) {
    return Promise.resolve(siteSettings);
  }
  if (siteSettingsPromise) {
    return siteSettingsPromise;
  }
  siteSettingsPromise = loadSiteSettings().then(function(settings) {
    siteSettings = settings;
    return siteSettings;
  }).finally(function() {
    siteSettingsPromise = null;
  });
  return siteSettingsPromise;
}

function normalizePageName(pathname) {
  if (!pathname || pathname === "/") {
    return "index.html";
  }
  var parts = pathname.split("/");
  var last = parts[parts.length - 1];
  if (!last) {
    return "index.html";
  }
  return last.toLowerCase();
}

function applySiteSettings() {
  if (!siteSettings) return;
  var site = siteSettings.site || {};
  var home = siteSettings.home || {};
  var headerBrandMark = "";
  var headerBrandName = "";

  if (site.title) {
    document.title = site.title;
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', site.title);
  }
  if (site.description) {
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', site.description);
    var ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', site.description);
  }
  if (site.favicon) {
    var favicon = document.querySelector('link[rel="icon"]');
    if (favicon) favicon.setAttribute('href', site.favicon);
  }
  if (site.ogImage) {
    var ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute('content', site.ogImage);
  }

  if (typeof site.headerBrandMark === "string" && site.headerBrandMark.trim()) {
    headerBrandMark = site.headerBrandMark.trim();
  }
  if (typeof site.headerBrandName === "string" && site.headerBrandName.trim()) {
    headerBrandName = site.headerBrandName.trim();
  } else if (typeof home.brandName === "string" && home.brandName.trim()) {
    headerBrandName = home.brandName.trim();
  }

  var brandLink = document.querySelector('.brand');
  if (brandLink) {
    var existingIcon = brandLink.querySelector('.brand-icon-img');
    if (existingIcon && existingIcon.style) {
      existingIcon.style.display = "none";
    }
    if (headerBrandMark) {
      var brandMark = brandLink.querySelector('.brand-mark');
      if (brandMark && brandMark.textContent !== headerBrandMark) {
        brandMark.textContent = headerBrandMark;
      }
    }
    if (headerBrandName) {
      var brandText = brandLink.querySelector('.brand-text');
      if (brandText && brandText.textContent !== headerBrandName) {
        brandText.textContent = headerBrandName;
      }
    }
  }
}

function applyHomeSettings() {
  if (!siteSettings || !siteSettings.home) return;
  var home = siteSettings.home;
  var hero = document.querySelector("#home .hero-copy");
  if (!hero) return;

  var eyebrow = hero.querySelector(".eyebrow");
  var title = hero.querySelector("h1");
  var text = hero.querySelector(".hero-text");

  if (eyebrow && typeof home.heroEyebrow === "string" && home.heroEyebrow.trim()) eyebrow.textContent = home.heroEyebrow;
  if (title && typeof home.heroTitle === "string" && home.heroTitle.trim()) title.textContent = home.heroTitle;
  if (text && typeof home.heroText === "string" && home.heroText.trim()) text.textContent = home.heroText;

  applyTerminalSettings(home.terminal);
  applyNotesSettings(home.notes);
  applySectionsSettings(home.sections);
}

function applyTerminalSettings(terminal) {
  if (!terminal) return;
  
  var roleEl = document.querySelector('.terminal-body .role');
  var focusEl = document.querySelector('.terminal-body .focus');
  var locationEl = document.querySelector('.terminal-body .location');
  var modeEl = document.querySelector('.terminal-body .mode');
  var commandEl = document.querySelector('.terminal-body .command');

  if (roleEl && terminal.role) roleEl.textContent = terminal.role;
  if (focusEl && terminal.focus) focusEl.textContent = terminal.focus;
  if (locationEl && terminal.location) locationEl.textContent = terminal.location;
  if (modeEl && terminal.mode) modeEl.textContent = terminal.mode;
  if (commandEl && terminal.command) commandEl.textContent = terminal.command;
}

function applyNotesSettings(notes) {
  if (!Array.isArray(notes)) return;
  
  var container = document.querySelector('.hero-notes');
  if (!container) return;
  
  var noteCards = container.querySelectorAll('.note-card');
  noteCards.forEach(function(card, index) {
    if (notes[index]) {
      var label = card.querySelector('.note-label');
      var content = card.querySelector('p:not(.note-label)');
      if (label && notes[index].label) label.textContent = notes[index].label;
      if (content && notes[index].content) content.textContent = notes[index].content;
    }
  });
}

function applySectionsSettings(sections) {
  if (!Array.isArray(sections)) return;
  
  var home = document.getElementById('home');
  if (!home) return;
  
  var heroSection = home.querySelector('.hero');
  var sectionsList = Array.from(home.querySelectorAll('.section[id]'));
  
  sectionsList.forEach(function(sectionEl) {
    sectionEl.style.display = 'none';
  });
  
  var sortedSections = sections.filter(function(s) { return s.enabled; });
  sortedSections.sort(function(a, b) { return a.order - b.order; });
  
  var insertPoint = heroSection ? heroSection.nextElementSibling : null;
  
  sortedSections.forEach(function(section) {
    var sectionEl = document.getElementById(section.id);
    if (!sectionEl) return;
    
    var eyebrow = sectionEl.querySelector('.eyebrow');
    var title = sectionEl.querySelector('h2');
    
    if (eyebrow && section.name) eyebrow.textContent = section.name;
    if (title && section.eyebrow) title.textContent = section.eyebrow;
    
    sectionEl.style.display = '';
    
    if (sectionEl !== insertPoint) {
      home.insertBefore(sectionEl, insertPoint);
    }
    insertPoint = sectionEl.nextElementSibling;
  });
}

function applyAboutSettings() {
  if (!siteSettings || !siteSettings.about) return;
  var about = siteSettings.about;
  var hero = document.querySelector("#about .hero-copy");
  if (hero) {
    var eyebrow = hero.querySelector(".eyebrow");
    var title = hero.querySelector("h1");
    var text = hero.querySelector(".hero-text");
    if (eyebrow && typeof about.heroEyebrow === "string" && about.heroEyebrow.trim()) eyebrow.textContent = about.heroEyebrow;
    if (title && typeof about.heroTitle === "string" && about.heroTitle.trim()) title.textContent = about.heroTitle;
    if (text && typeof about.heroText === "string" && about.heroText.trim()) text.textContent = about.heroText;
  }

  var nameEl = document.querySelector(".about-profile-meta .about-name");
  var roleEl = document.querySelector(".about-profile-meta .about-role");
  if (nameEl && typeof about.profileName === "string" && about.profileName.trim()) nameEl.textContent = about.profileName;
  if (roleEl && typeof about.profileRole === "string" && about.profileRole.trim()) roleEl.textContent = about.profileRole;

  var avatarEl = document.querySelector(".about-avatar");
  if (avatarEl && typeof about.avatarSrc === "string" && about.avatarSrc.trim()) {
    avatarEl.src = about.avatarSrc.trim();
  }

  var links = about.links || {};
  var anchors = document.querySelectorAll(".about-profile-links a");
  var hrefByIndex = [
    links.bilibili,
    links.github,
    links.qq,
    links.wechat,
    links.email
  ];
  anchors.forEach(function(anchor, index) {
    if (index === 2 || index === 3 || index === 4) return;
    var href = hrefByIndex[index];
    if (typeof href === "string" && href.trim()) {
      anchor.setAttribute("href", href.trim());
    }
  });

  var emailBtn = document.getElementById("email-btn");
  if (emailBtn && typeof links.email === "string" && links.email.trim()) {
    var emailText = links.email.trim().replace(/^mailto:/i, "");
    emailBtn.setAttribute("data-email", emailText);
  }

  applyAboutCards(about.cards);
  applyAboutWorkflow(about.workflow);
  applyAboutTimeline(about.timeline);
  applySocialButtons(about.socialButtons);
}

function applyAboutCards(cards) {
  if (!Array.isArray(cards)) return;
  var cardEls = document.querySelectorAll(".about-card");
  cards.forEach(function(card, index) {
    if (!cardEls[index]) return;
    var h3 = cardEls[index].querySelector("h3");
    var p = cardEls[index].querySelector("p");
    if (h3 && card.title) h3.textContent = card.title;
    if (p && card.content) p.textContent = card.content;
  });
}

function applyAboutWorkflow(workflow) {
  if (!workflow) return;

  var wfSection = document.querySelector(".section-workflow");
  if (!wfSection) return;

  if (workflow.eyebrow) {
    var eyebrowEl = wfSection.querySelector(".eyebrow");
    if (eyebrowEl) eyebrowEl.textContent = workflow.eyebrow;
  }
  if (workflow.title) {
    var titleEl = wfSection.querySelector("h2");
    if (titleEl) titleEl.textContent = workflow.title;
  }

  if (workflow.commands) {
    var terminalContent = wfSection.querySelector(".terminal-content");
    if (terminalContent) {
      var lines = String(workflow.commands).split(/\r?\n/).filter(function(l) { return l.trim(); });
      terminalContent.innerHTML = "";
      lines.forEach(function(line) {
        var p = document.createElement("p");
        var promptSpan = document.createElement("span");
        promptSpan.className = "prompt";
        promptSpan.textContent = "$";
        p.appendChild(promptSpan);
        p.appendChild(document.createTextNode(" " + line));
        terminalContent.appendChild(p);
      });
    }
  }

  if (workflow.stack1Title) {
    var stack1H3 = wfSection.querySelector(".stack-card h3");
    if (stack1H3) stack1H3.textContent = workflow.stack1Title;
  }
  if (workflow.stack2Title) {
    var stackCards = wfSection.querySelectorAll(".stack-card h3");
    if (stackCards[1]) stackCards[1].textContent = workflow.stack2Title;
  }
  if (workflow.stack1Items) {
    var stack1Ul = wfSection.querySelector(".stack-card ul");
    if (stack1Ul) {
      var items1 = String(workflow.stack1Items).split(/\r?\n/).filter(function(l) { return l.trim(); });
      stack1Ul.innerHTML = "";
      items1.forEach(function(item) {
        var li = document.createElement("li");
        li.textContent = item;
        stack1Ul.appendChild(li);
      });
    }
  }
  if (workflow.stack2Items) {
    var stackUls = wfSection.querySelectorAll(".stack-card ul");
    if (stackUls[1]) {
      var items2 = String(workflow.stack2Items).split(/\r?\n/).filter(function(l) { return l.trim(); });
      stackUls[1].innerHTML = "";
      items2.forEach(function(item) {
        var li = document.createElement("li");
        li.textContent = item;
        stackUls[1].appendChild(li);
      });
    }
  }
}

function applyAboutTimeline(timeline) {
  if (!timeline || typeof timeline !== 'object') return;
  var tlSection = document.querySelector(".section-timeline");
  if (!tlSection) return;

  if (timeline.eyebrow) {
    var eyebrowEl = tlSection.querySelector(".eyebrow");
    if (eyebrowEl) eyebrowEl.textContent = timeline.eyebrow;
  }
  if (timeline.title) {
    var titleEl = tlSection.querySelector("h2");
    if (titleEl) titleEl.textContent = timeline.title;
  }

  var items = Array.isArray(timeline.items) ? timeline.items : [];
  var listEl = tlSection.querySelector(".timeline-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  items.forEach(function(item) {
    var article = document.createElement("article");
    article.className = "timeline-item";

    var dateP = document.createElement("p");
    dateP.className = "timeline-date";
    dateP.textContent = item.date || "";

    var cardDiv = document.createElement("div");
    cardDiv.className = "timeline-card";

    var h3 = document.createElement("h3");
    h3.textContent = item.title || "";

    var descP = document.createElement("p");
    descP.textContent = item.desc || "";

    cardDiv.appendChild(h3);
    cardDiv.appendChild(descP);

    article.appendChild(dateP);
    article.appendChild(cardDiv);
    listEl.appendChild(article);
  });
}

function applySocialButtons(socialButtons) {
  var defaults = [
    { id: 'bilibili', enabled: true },
    { id: 'github', enabled: true },
    { id: 'qq', enabled: true },
    { id: 'wechat', enabled: true },
    { id: 'email', enabled: true }
  ];

  var buttons = Array.isArray(socialButtons) && socialButtons.length > 0 ? socialButtons : defaults;
  var idToConfig = {};
  buttons.forEach(function(btn) {
    idToConfig[btn.id] = btn;
  });

  var container = document.querySelector(".about-profile-links");
  if (!container) return;
  var anchors = Array.from(container.querySelectorAll("a"));

  anchors.forEach(function(anchor) {
    var btnId = anchor.getAttribute("data-btn-id");
    if (!btnId) return;
    var config = idToConfig[btnId];
    if (!config) {
      anchor.style.display = "none";
    } else {
      anchor.style.display = config.enabled ? "" : "none";
    }
  });

  var orderedAnchors = [];
  buttons.forEach(function(btn) {
    var anchor = anchors.find(function(a) { return a.getAttribute("data-btn-id") === btn.id; });
    if (anchor) orderedAnchors.push(anchor);
  });
  var remainingAnchors = anchors.filter(function(a) { return !a.getAttribute("data-btn-id"); });
  orderedAnchors = orderedAnchors.concat(remainingAnchors);

  container.innerHTML = "";
  orderedAnchors.forEach(function(anchor) {
    container.appendChild(anchor);
  });
}

/**
 * 从 articles/manifest.json 加载文章列表
 * manifest 由 build-manifest.js 扫描 articles/*.html 自动生成
 */
function loadPostsFromManifest() {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    // 添加时间戳参数避免缓存
    xhr.open('GET', 'articles/manifest.json?' + Date.now(), true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          posts = JSON.parse(xhr.responseText);
          resolve(posts);
        } catch (e) {
          reject(new Error('Manifest 解析失败'));
        }
      } else {
        reject(new Error('Manifest 加载失败，状态码: ' + xhr.status));
      }
    };
    xhr.onerror = function() {
      reject(new Error('无法加载文章列表'));
    };
    xhr.send();
  });
}

function loadProjectsFromManifest() {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "projects/manifest.json?" + Date.now(), true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          projects = JSON.parse(xhr.responseText);
          resolve(projects);
        } catch (e) {
          reject(new Error("Projects manifest 解析失败"));
        }
      } else {
        reject(new Error("Projects manifest 加载失败，状态码: " + xhr.status));
      }
    };
    xhr.onerror = function() {
      reject(new Error("无法加载项目列表"));
    };
    xhr.send();
  });
}

function createPostCard(post, index) {
  var card = document.createElement("article");
  card.className = "content-card post-card reveal is-visible";
  card.style.transitionDelay = index * 70 + "ms";

  var topline = document.createElement("div");
  topline.className = "card-topline";
  topline.innerHTML = '<span class="card-type">' + post.type + '</span><time datetime="' + post.date + '">' + post.displayDate + '</time>';
  card.appendChild(topline);

  var contentRow = document.createElement("div");
  contentRow.className = "post-card-content";

  var body = document.createElement("div");
  body.className = "post-card-body";

  var title = document.createElement("h3");
  var link = document.createElement("a");
  link.href = post.href;
  link.textContent = post.title;
  title.appendChild(link);

  var summary = document.createElement("p");
  summary.textContent = post.summary;

  var tags = document.createElement("div");
  tags.className = "tag-row";
  post.tags.forEach(function(tag) {
    var tagBtn = document.createElement("button");
    tagBtn.className = "post-tag";
    tagBtn.textContent = tag;
    tagBtn.setAttribute("data-tag", tag);
    tagBtn.addEventListener("click", function() {
      var tagFilters = document.querySelectorAll(".tag-filter");
      tagFilters.forEach(function(btn) {
        btn.classList.remove("active");
      });
      var matchingFilter = document.querySelector('.tag-filter[data-tag="' + tag + '"]');
      if (matchingFilter) {
        matchingFilter.classList.add("active");
      }
      filterPosts(tag);
    });
    tags.appendChild(tagBtn);
  });

  body.appendChild(title);
  body.appendChild(summary);
  body.appendChild(tags);
  contentRow.appendChild(body);

  if (post.thumbnail) {
    var thumb = document.createElement("div");
    thumb.className = "card-thumb";
    var thumbLink = document.createElement("a");
    thumbLink.href = post.href;
    var thumbImg = document.createElement("img");
    thumbImg.src = 'articles/' + post.id + '/' + post.thumbnail;
    thumbImg.alt = '';
    thumbImg.loading = 'lazy';
    thumbLink.appendChild(thumbImg);
    thumb.appendChild(thumbLink);
    contentRow.appendChild(thumb);
  }

  card.appendChild(contentRow);
  return card;
}

function createProjectCard(project, index) {
  var card = document.createElement("article");
  card.className = "project-card reveal is-visible";
  card.style.transitionDelay = index * 90 + "ms";

  var projectTitle = project.title || "";
  var projectSummary = project.summary || "";
  var projectHref = project.href || "#";
  var projectCover = project.cover || "";

  card.innerHTML = '<div class="project-main"><h3><a href="' + projectHref + '">' + projectTitle + '</a></h3><p>' + projectSummary + '</p></div>';
  if (projectCover) {
    var thumb = document.createElement("div");
    thumb.className = "card-thumb";
    var thumbLink = document.createElement("a");
    thumbLink.href = projectHref;
    var thumbImg = document.createElement("img");
    thumbImg.src = 'projects/' + project.id + '/' + projectCover;
    thumbImg.alt = '';
    thumbImg.loading = 'lazy';
    thumbLink.appendChild(thumbImg);
    thumb.appendChild(thumbLink);
    card.appendChild(thumb);
  }

  if (projectHref && projectHref !== "#") {
    card.classList.add("is-clickable");
    card.tabIndex = 0;
    card.setAttribute("role", "link");
    card.addEventListener("click", function(e) {
      if (e.target.closest("a, button")) {
        return;
      }
      window.location.href = projectHref;
    });
    card.addEventListener("keydown", function(e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        window.location.href = projectHref;
      }
    });
  }

  return card;
}

function createHomePostCard(post) {
  var card = document.createElement("article");
  card.className = "content-card post-card";

  var topline = document.createElement("div");
  topline.className = "card-topline";
  topline.innerHTML = '<span class="card-type">' + post.type + '</span><time datetime="' + post.date + '">' + post.displayDate + '</time>';
  card.appendChild(topline);

  var title = document.createElement("h3");
  var link = document.createElement("a");
  link.href = post.href;
  link.textContent = post.title;
  title.appendChild(link);

  var summary = document.createElement("p");
  summary.textContent = post.summary;

  var tags = document.createElement("div");
  tags.className = "tag-row";
  post.tags.forEach(function(tag) {
    var tagItem = document.createElement("span");
    tagItem.textContent = tag;
    tags.appendChild(tagItem);
  });

  card.appendChild(title);
  card.appendChild(summary);
  card.appendChild(tags);

  return card;
}

function createHomeProjectCard(project) {
  var card = document.createElement("article");
  card.className = "content-card post-card";

  var projectTitle = project.title || "";
  var projectSummary = project.summary || "";
  var projectHref = project.href || "#";

  var topline = document.createElement("div");
  topline.className = "card-topline";
  topline.innerHTML = '<span class="card-type">项目</span><span>精选展示</span>';
  card.appendChild(topline);

  var title = document.createElement("h3");
  var link = document.createElement("a");
  link.href = projectHref;
  link.textContent = projectTitle;
  title.appendChild(link);

  var summary = document.createElement("p");
  summary.textContent = projectSummary;

  card.appendChild(title);
  card.appendChild(summary);

  return card;
}

function renderHomeLatestPosts() {
  var homePostsGrid = document.getElementById("posts-grid");
  if (!homePostsGrid) {
    return;
  }

  var latestPosts = posts
    .slice()
    .sort(function(a, b) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    })
    .slice(0, 3);

  renderCollection("posts-grid", latestPosts, createHomePostCard);
}

function renderCollection(targetId, items, builder) {
  var container = document.getElementById(targetId);
  if (!container) {
    return;
  }

  var fragment = document.createDocumentFragment();
  items.forEach(function(item, index) {
    fragment.appendChild(builder(item, index));
  });
  container.replaceChildren(fragment);
}

function setupRevealAnimation() {
  var reveals = document.querySelectorAll(".reveal");
  if (!reveals.length) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    reveals.forEach(function(element) {
      element.classList.add("is-visible");
    });
    return;
  }

  var observer = new IntersectionObserver(
    function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -40px 0px"
    }
  );

  reveals.forEach(function(element) {
    observer.observe(element);
  });
}

function highlightCurrentSection() {
  var navLinks = Array.from(document.querySelectorAll(".nav a"));
  var sections = navLinks
    .map(function(link) {
      var href = link.getAttribute("href") || "";
      if (!href || href.charAt(0) !== "#") {
        return null;
      }
      var section = document.querySelector(href);
      return section ? { link: link, section: section } : null;
    })
    .filter(function(item) {
      return item !== null;
    });

  if (!sections.length || !("IntersectionObserver" in window)) {
    return;
  }

  var observer = new IntersectionObserver(
    function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) {
          return;
        }

        sections.forEach(function(item) {
          var isActive = item.section === entry.target;
          if (isActive) {
            item.link.setAttribute("aria-current", "true");
          } else {
            item.link.removeAttribute("aria-current");
          }
        });
      });
    },
    {
      threshold: 0.35
    }
  );

  sections.forEach(function(item) {
    observer.observe(item.section);
  });
}

function setupHeaderScrollEffect() {
  if (hasSetupHeaderScrollEffect) {
    return;
  }
  var topbar = document.querySelector(".topbar");
  if (!topbar) {
    return;
  }

  function updateHeaderStyle() {
    var scrollY = window.scrollY;
    var threshold = 20;

    if (scrollY > threshold) {
      topbar.classList.add("scrolled");
    } else {
      topbar.classList.remove("scrolled");
    }
  }

  requestAnimationFrame(function() {
    updateHeaderStyle();
    window.addEventListener("scroll", updateHeaderStyle, { passive: true });
  });
  hasSetupHeaderScrollEffect = true;
}

var currentFilter = "all";
var currentCategory = "all";
var currentSearch = "";
var currentPage = 1;
var postsPerPage = 10;
var postsGridRef = null;
var noResultsRef = null;
var paginationControlsRef = null;

function resetPostFilteringState() {
  currentFilter = "all";
  currentCategory = "all";
  currentSearch = "";
  currentPage = 1;
  postsGridRef = null;
  noResultsRef = null;
  paginationControlsRef = null;
}

function setupPostFiltering() {
  postsGridRef = document.getElementById("posts-grid");
  var tagFilters = document.getElementById("tag-filters");
  var categoryFilters = document.getElementById("category-filters");
  var searchInput = document.getElementById("search-input");
  noResultsRef = document.getElementById("no-results");
  paginationControlsRef = document.getElementById("pagination-controls");

  if (!postsGridRef) {
    return;
  }

  var allCategories = [];
  posts.forEach(function(post) {
    if (allCategories.indexOf(post.type) === -1) {
      allCategories.push(post.type);
    }
  });

  allCategories.forEach(function(category) {
    var button = document.createElement("button");
    button.className = "category-filter";
    button.setAttribute("data-category", category);
    button.textContent = category;
    categoryFilters.appendChild(button);
  });

  var allTags = [];
  posts.forEach(function(post) {
    post.tags.forEach(function(tag) {
      if (allTags.indexOf(tag) === -1) {
        allTags.push(tag);
      }
    });
  });

  allTags.forEach(function(tag) {
    var button = document.createElement("button");
    button.className = "tag-filter";
    button.setAttribute("data-tag", tag);
    button.textContent = tag;
    tagFilters.appendChild(button);
  });

  filterPosts();

  categoryFilters.addEventListener("click", function(e) {
    if (e.target.classList.contains("category-filter")) {
      document.querySelectorAll(".category-filter").forEach(function(btn) {
        btn.classList.remove("active");
      });
      e.target.classList.add("active");
      currentCategory = e.target.getAttribute("data-category");
      currentPage = 1;
      filterPosts();
    }
  });

  tagFilters.addEventListener("click", function(e) {
    if (e.target.classList.contains("tag-filter")) {
      document.querySelectorAll(".tag-filter").forEach(function(btn) {
        btn.classList.remove("active");
      });
      e.target.classList.add("active");
      currentFilter = e.target.getAttribute("data-tag");
      currentPage = 1;
      filterPosts();
    }
  });

  if (searchInput) {
    searchInput.addEventListener("input", function(e) {
      currentSearch = e.target.value;
      currentPage = 1;
      filterPosts();
    });
  }
}

function filterPosts(filterTag) {
  if (!postsGridRef) {
    return;
  }

  if (filterTag !== undefined) {
    currentFilter = filterTag;
    currentPage = 1;
  }

  var filteredPosts = posts.slice();

  if (currentCategory !== "all") {
    filteredPosts = filteredPosts.filter(function(post) {
      return post.type === currentCategory;
    });
  }

  if (currentFilter !== "all") {
    filteredPosts = filteredPosts.filter(function(post) {
      return post.tags.indexOf(currentFilter) !== -1;
    });
  }

  if (currentSearch.trim() !== "") {
    var searchLower = currentSearch.toLowerCase();
    filteredPosts = filteredPosts.filter(function(post) {
      return post.title.toLowerCase().indexOf(searchLower) !== -1 ||
             post.summary.toLowerCase().indexOf(searchLower) !== -1 ||
             post.tags.some(function(tag) {
               return tag.toLowerCase().indexOf(searchLower) !== -1;
             });
    });
  }

  if (filteredPosts.length === 0) {
    postsGridRef.style.display = "none";
    if (noResultsRef) {
      noResultsRef.style.display = "block";
    }
    if (paginationControlsRef) {
      paginationControlsRef.style.display = "none";
      paginationControlsRef.replaceChildren();
    }
    return;
  }

  postsGridRef.style.display = "flex";
  if (noResultsRef) {
    noResultsRef.style.display = "none";
  }

  var totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }
  var startIndex = (currentPage - 1) * postsPerPage;
  var endIndex = startIndex + postsPerPage;
  var pagePosts = filteredPosts.slice(startIndex, endIndex);

  var fragment = document.createDocumentFragment();
  pagePosts.forEach(function(post, index) {
    fragment.appendChild(createPostCard(post, index));
  });
  postsGridRef.replaceChildren(fragment);
  renderPaginationControls(totalPages);
}

function renderPaginationControls(totalPages) {
  if (!paginationControlsRef) {
    return;
  }

  if (totalPages < 1) {
    totalPages = 1;
  }

  paginationControlsRef.style.display = "flex";
  var fragment = document.createDocumentFragment();

  var prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "pagination-btn pagination-nav-btn";
  prevBtn.textContent = "上一页";
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener("click", function() {
    if (currentPage > 1) {
      currentPage -= 1;
      filterPosts();
    }
  });
  fragment.appendChild(prevBtn);

  for (var i = 1; i <= totalPages; i += 1) {
    var pageBtn = document.createElement("button");
    pageBtn.type = "button";
    pageBtn.className = "pagination-btn";
    if (i === currentPage) {
      pageBtn.classList.add("active");
    }
    pageBtn.textContent = String(i);
    if (i === currentPage) {
      pageBtn.setAttribute("aria-current", "page");
    }
    pageBtn.addEventListener("click", function(e) {
      var targetPage = parseInt(e.currentTarget.textContent, 10);
      if (!Number.isNaN(targetPage) && targetPage !== currentPage) {
        currentPage = targetPage;
        filterPosts();
      }
    });
    fragment.appendChild(pageBtn);
  }

  var nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "pagination-btn pagination-nav-btn";
  nextBtn.textContent = "下一页";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener("click", function() {
    if (currentPage < totalPages) {
      currentPage += 1;
      filterPosts();
    }
  });
  fragment.appendChild(nextBtn);

  paginationControlsRef.replaceChildren(fragment);
}

var externalScriptPromises = {};
var externalStyleApplied = {};
var articleLightboxBound = false;
var articleOutlineScrollHandler = null;
var articleOutlineActiveId = "";
var pageScrollHideTimer = null;
var hasBoundPageScrollIndicator = false;
var outlineScrollHideTimer = null;
var currentOutlineContainer = null;
var currentOutlineNav = null;
var hasBoundOutlineOverflowResize = false;
var outlineOverflowRafId = null;

var ARTICLE_DEPENDENCIES = {
  katexCss: "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css",
  highlightCss: "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/atom-one-light.min.css",
  katexJs: "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js",
  markedJs: "https://cdn.jsdelivr.net/npm/marked/marked.min.js",
  mermaidJs: "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js",
  hljsJs: "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js"
};

function loadExternalScriptOnce(src) {
  if (externalScriptPromises[src]) {
    return externalScriptPromises[src];
  }

  var existing = document.querySelector('script[src="' + src + '"]');
  if (existing) {
    externalScriptPromises[src] = Promise.resolve();
    return externalScriptPromises[src];
  }

  externalScriptPromises[src] = new Promise(function(resolve, reject) {
    var script = document.createElement("script");
    script.src = src;
    script.onload = function() { resolve(); };
    script.onerror = function() { reject(new Error("脚本加载失败")); };
    document.head.appendChild(script);
  });
  return externalScriptPromises[src];
}

function loadExternalStyleOnce(href) {
  if (externalStyleApplied[href]) {
    return;
  }
  if (document.querySelector('link[rel="stylesheet"][href="' + href + '"]')) {
    externalStyleApplied[href] = true;
    return;
  }
  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
  externalStyleApplied[href] = true;
}

function ensureArticleDependenciesLoaded() {
  loadExternalStyleOnce(ARTICLE_DEPENDENCIES.katexCss);
  loadExternalStyleOnce(ARTICLE_DEPENDENCIES.highlightCss);

  return Promise.all([
    typeof marked !== "undefined" ? Promise.resolve() : loadExternalScriptOnce(ARTICLE_DEPENDENCIES.markedJs),
    typeof mermaid !== "undefined" ? Promise.resolve() : loadExternalScriptOnce(ARTICLE_DEPENDENCIES.mermaidJs),
    typeof katex !== "undefined" ? Promise.resolve() : loadExternalScriptOnce(ARTICLE_DEPENDENCIES.katexJs),
    typeof hljs !== "undefined" ? Promise.resolve() : loadExternalScriptOnce(ARTICLE_DEPENDENCIES.hljsJs)
  ]);
}

function ensureArticleLightboxElement() {
  var lightbox = document.getElementById("img-lightbox");
  if (lightbox) {
    return lightbox;
  }
  lightbox = document.createElement("div");
  lightbox.className = "img-lightbox";
  lightbox.id = "img-lightbox";

  var close = document.createElement("span");
  close.className = "img-lightbox-close";
  close.textContent = "×";

  var img = document.createElement("img");
  img.src = "";
  img.alt = "查看大图";

  lightbox.appendChild(close);
  lightbox.appendChild(img);
  document.body.appendChild(lightbox);
  return lightbox;
}

function getUrlParam(name) {
  var urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

function getAdjacentArticles(manifest, articleId) {
  if (!Array.isArray(manifest) || manifest.length === 0) {
    return { prevArticle: null, nextArticle: null };
  }

  var currentIndex = manifest.findIndex(function(item) {
    return item && item.id === articleId;
  });

  if (currentIndex === -1) {
    return { prevArticle: null, nextArticle: null };
  }

  var prevArticle = manifest[currentIndex + 1] || null;
  var nextArticle = manifest[currentIndex - 1] || null;

  return {
    prevArticle: prevArticle,
    nextArticle: nextArticle
  };
}

function showArticleError(message) {
  var headerSection = document.querySelector(".article-header-section");
  if (!headerSection) return;
  headerSection.innerHTML = '<div class="article-not-found"><h2>文章未找到</h2><p>' + message + '</p><p><a href="posts.html">返回文章列表</a></p></div>';
}

function renderArticleNavigation(prevArticle, nextArticle) {
  var nav = document.getElementById("article-post-nav");
  if (!nav) return;

  function buildNavItem(article, direction) {
    if (!article) {
      return '<div class="article-post-nav-link is-empty" aria-hidden="true"></div>';
    }

    var label = direction === "prev" ? "< 上一篇" : "下一篇 >";
    return (
      '<a class="article-post-nav-link ' + direction + '" href="' + article.href + '">' +
        '<span class="article-post-nav-label">' + label + "</span>" +
        '<span class="article-post-nav-title">' + article.title + "</span>" +
      "</a>"
    );
  }

  nav.innerHTML = buildNavItem(prevArticle, "prev") + buildNavItem(nextArticle, "next");
  nav.style.display = "flex";
}

function setupImageLightbox() {
  var lightbox = ensureArticleLightboxElement();
  var lightboxImg = lightbox.querySelector("img");
  var closeBtn = lightbox.querySelector(".img-lightbox-close");
  var articleBody = document.getElementById("article-body");

  if (!articleBody || !lightboxImg || !closeBtn) return;

  function open(src) {
    lightboxImg.src = src;
    lightbox.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function close() {
    lightbox.classList.remove("show");
    document.body.style.overflow = "";
  }

  articleBody.querySelectorAll("img").forEach(function(img) {
    img.addEventListener("click", function() {
      open(img.src);
    });
  });

  if (!articleLightboxBound) {
    lightbox.addEventListener("click", function(e) {
      if (e.target === lightbox) close();
    });
    closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape" && lightbox.classList.contains("show")) {
        close();
      }
    });
    articleLightboxBound = true;
  }
}

function setupAdmonitions() {
  var blocks = document.querySelectorAll(".article-body blockquote");
  blocks.forEach(function(block) {
    var firstP = block.querySelector("p");
    if (!firstP) return;

    var raw = firstP.textContent.trim();
    var match = raw.match(/^\[!(NOTE|TIP|WARNING|IMPORTANT)\]\s*(.*)$/i);
    if (!match) return;

    var type = match[1].toLowerCase();
    var titleText = match[2].trim();
    block.classList.add("callout-" + type);

    var title = document.createElement("p");
    title.className = "callout-title";
    title.textContent = titleText || ({
      note: "Note",
      tip: "Tip",
      warning: "Warning",
      important: "Important"
    })[type];

    firstP.remove();
    block.insertBefore(title, block.firstChild);
  });
}

function setupCodeBlocks() {
  function applyLineNumbers(codeEl) {
    var highlighted = codeEl.innerHTML.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    var lines = highlighted.split("\n");
    if (lines.length > 1 && lines[lines.length - 1] === "") {
      lines.pop();
    }
    if (lines.length === 0) {
      lines = [""];
    }

    var numberedHtml = lines.map(function(line, index) {
      return (
        '<span class="code-line">' +
          '<span class="code-line-number">' + (index + 1) + "</span>" +
          '<span class="code-line-text">' + (line === "" ? "&nbsp;" : line) + "</span>" +
        "</span>"
      );
    }).join("");

    codeEl.innerHTML = numberedHtml;
  }

  var pres = document.querySelectorAll(".article-body pre");
  pres.forEach(function(pre) {
    if (pre.getAttribute("data-processed")) return;
    pre.setAttribute("data-processed", "true");

    var code = pre.querySelector("code");
    if (!code) return;
    var sourceText = code.textContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    if (typeof hljs !== "undefined") {
      hljs.highlightElement(code);
    }
    applyLineNumbers(code);

    var lang = "";
    if (code.className) {
      var match = code.className.match(/language-(\w+)/);
      if (match) lang = match[1];
    }

    var header = document.createElement("div");
    header.className = "code-header";

    var langSpan = document.createElement("span");
    langSpan.className = "code-lang";
    langSpan.textContent = lang || "code";
    header.appendChild(langSpan);

    var copyBtn = document.createElement("button");
    copyBtn.className = "code-copy-btn";
    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
    copyBtn.appendChild(document.createTextNode("复制"));
    copyBtn.addEventListener("click", function() {
      navigator.clipboard.writeText(sourceText).then(function() {
        copyBtn.classList.add("copied");
        copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
        copyBtn.appendChild(document.createTextNode("已复制"));
        setTimeout(function() {
          copyBtn.classList.remove("copied");
          copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
          copyBtn.appendChild(document.createTextNode("复制"));
        }, 2000);
      });
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
  var mermaidEls = document.querySelectorAll(".mermaid");
  if (mermaidEls.length === 0 || typeof mermaid === "undefined") return;

  mermaid.initialize({ startOnLoad: false, theme: "neutral" });
  mermaidEls.forEach(function(el) {
    if (el.getAttribute("data-processed")) return;
    el.setAttribute("data-processed", "true");
    var id = "mermaid-" + Math.random().toString(36).slice(2, 8);
    mermaid.render(id, el.textContent.trim()).then(function(result) {
      el.innerHTML = result.svg;
    }).catch(function(err) {
      el.innerHTML = '<pre style="color:#c62828;background:rgba(198,40,40,0.06);padding:1rem;border-radius:8px;">Mermaid 图表渲染失败: ' + err.message + '\n\n原始代码:\n' + el.textContent.trim() + "</pre>";
    });
  });
}

function renderMathBlocks() {
  if (typeof katex === "undefined") return;

  document.querySelectorAll(".math-inline").forEach(function(el) {
    if (el.getAttribute("data-rendered")) return;
    el.setAttribute("data-rendered", "true");
    try {
      katex.render(el.textContent, el, { throwOnError: false });
    } catch (e) {
      el.innerHTML = '<code style="color:#c62828">' + el.textContent + "</code>";
    }
  });

  document.querySelectorAll(".math-block").forEach(function(el) {
    if (el.getAttribute("data-rendered")) return;
    el.setAttribute("data-rendered", "true");
    try {
      katex.render(el.textContent, el, { throwOnError: false, displayMode: true });
    } catch (e) {
      el.innerHTML = '<code style="color:#c62828">' + el.textContent + "</code>";
    }
  });
}

function markPageScrollbarActive() {
  if (!document || !document.documentElement) return;
  document.documentElement.classList.add("is-scrolling-page");
  if (pageScrollHideTimer) {
    clearTimeout(pageScrollHideTimer);
  }
  pageScrollHideTimer = setTimeout(function() {
    document.documentElement.classList.remove("is-scrolling-page");
  }, 700);
}

function setupPageScrollbarIndicator() {
  if (hasBoundPageScrollIndicator) return;
  window.addEventListener("scroll", markPageScrollbarActive, { passive: true });
  window.addEventListener("wheel", markPageScrollbarActive, { passive: true });
  window.addEventListener("touchmove", markPageScrollbarActive, { passive: true });
  hasBoundPageScrollIndicator = true;
}

function refreshOutlineOverflowState() {
  if (!currentOutlineContainer || !currentOutlineNav) return;
  var hasOverflow = (currentOutlineNav.scrollHeight - currentOutlineNav.clientHeight) > 1;
  currentOutlineContainer.classList.toggle("has-overflow", hasOverflow);
  if (!hasOverflow) {
    currentOutlineContainer.classList.remove("is-scrolling-outline");
  }
}

function scheduleOutlineOverflowStateRefresh() {
  if (outlineOverflowRafId) {
    cancelAnimationFrame(outlineOverflowRafId);
  }
  outlineOverflowRafId = requestAnimationFrame(function() {
    outlineOverflowRafId = null;
    refreshOutlineOverflowState();
  });
}

function setupOutlineOverflowResizeHandler() {
  if (hasBoundOutlineOverflowResize) return;
  window.addEventListener("resize", scheduleOutlineOverflowStateRefresh, { passive: true });
  hasBoundOutlineOverflowResize = true;
}

function bindOutlineScrollbarIndicator(outlineContainer, outlineNav) {
  if (!outlineContainer || !outlineNav) return;
  if (outlineNav.dataset.scrollIndicatorBound === "1") return;

  function markOutlineScrollbarActive() {
    if (!outlineContainer.classList.contains("has-overflow")) return;
    outlineContainer.classList.add("is-scrolling-outline");
    if (outlineScrollHideTimer) {
      clearTimeout(outlineScrollHideTimer);
    }
    outlineScrollHideTimer = setTimeout(function() {
      outlineContainer.classList.remove("is-scrolling-outline");
    }, 700);
  }

  outlineNav.addEventListener("scroll", markOutlineScrollbarActive, { passive: true });
  outlineNav.addEventListener("wheel", markOutlineScrollbarActive, { passive: true });
  outlineNav.addEventListener("touchmove", markOutlineScrollbarActive, { passive: true });
  outlineNav.dataset.scrollIndicatorBound = "1";
}

function generateArticleOutline() {
  var outlineContainer = document.getElementById("article-outline");
  var outlineNav = document.getElementById("outline-nav");
  var articleBody = document.getElementById("article-body");

  if (!outlineContainer || !outlineNav || !articleBody) return;

  var headings = articleBody.querySelectorAll("h1, h2, h3, h4");
  if (headings.length === 0) {
    outlineContainer.style.display = "none";
    return;
  }

  outlineContainer.style.display = "block";
  var fragment = document.createDocumentFragment();
  outlineNav.innerHTML = "";

  headings.forEach(function(heading, index) {
    var id = "heading-" + index;
    heading.id = id;

    var link = document.createElement("a");
    link.href = "#" + id;
    link.className = "outline-link " + heading.tagName.toLowerCase();
    var text = document.createElement("span");
    text.className = "outline-link-text";
    text.textContent = heading.textContent;
    link.appendChild(text);
    link.setAttribute("aria-label", "跳转到 " + heading.textContent);

    link.addEventListener("click", function(e) {
      e.preventDefault();
      var targetHeading = document.getElementById(id);
      if (targetHeading) {
        var offsetTop = targetHeading.offsetTop - 100;
        window.scrollTo({ top: offsetTop, behavior: "smooth" });
      }
    });

    fragment.appendChild(link);
  });

  outlineNav.appendChild(fragment);
  articleOutlineActiveId = "";
  currentOutlineContainer = outlineContainer;
  currentOutlineNav = outlineNav;
  bindOutlineScrollbarIndicator(outlineContainer, outlineNav);
  setupOutlineOverflowResizeHandler();
  scheduleOutlineOverflowStateRefresh();
  setTimeout(scheduleOutlineOverflowStateRefresh, 120);

  function ensureActiveOutlineLinkVisible(activeLink) {
    if (!activeLink || !outlineNav) return;
    var navRect = outlineNav.getBoundingClientRect();
    var linkRect = activeLink.getBoundingClientRect();
    var padding = 10;

    if (linkRect.top < navRect.top + padding || linkRect.bottom > navRect.bottom - padding) {
      activeLink.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  function updateActiveHeading() {
    var currentId = null;
    var scrollTop = window.scrollY + 120;

    headings.forEach(function(heading) {
      if (heading.offsetTop <= scrollTop) {
        currentId = heading.id;
      }
    });

    if (!currentId || currentId === articleOutlineActiveId) return;

    document.querySelectorAll(".outline-link.active").forEach(function(el) {
      el.classList.remove("active");
    });

    var activeLink = document.querySelector('.outline-link[href="#' + currentId + '"]');
    if (activeLink) {
      activeLink.classList.add("active");
      ensureActiveOutlineLinkVisible(activeLink);
      articleOutlineActiveId = currentId;
    }
  }

  updateActiveHeading();
  if (articleOutlineScrollHandler) {
    window.removeEventListener("scroll", articleOutlineScrollHandler);
  }
  articleOutlineScrollHandler = function() {
    updateActiveHeading();
  };
  window.addEventListener("scroll", articleOutlineScrollHandler);
}

function renderArticleData(article) {
  var headerSection = document.querySelector(".article-header-section");
  var body = document.getElementById("article-body");
  if (!headerSection || !body) return;

  document.title = article.title + " | Lin Archive";

  headerSection.innerHTML =
    '<div class="article-header-content">' +
      '<h1 class="article-title">' + article.title + "</h1>" +
      '<div class="article-meta">' +
        '<span class="article-meta-item article-date">' +
          '<svg class="article-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
            '<rect x="3" y="4" width="18" height="18" rx="2"></rect>' +
            '<line x1="16" y1="2" x2="16" y2="6"></line>' +
            '<line x1="8" y1="2" x2="8" y2="6"></line>' +
            '<line x1="3" y1="10" x2="21" y2="10"></line>' +
          "</svg>" +
          "<span>" + article.displayDate + "</span>" +
        "</span>" +
        '<span class="article-meta-divider" aria-hidden="true"></span>' +
        '<div class="article-meta-item article-tag-group">' +
          '<svg class="article-meta-icon article-meta-icon-tags" viewBox="4 4 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' +
            '<path d="M7 4.5h10A1.5 1.5 0 0 1 18.5 6v13.2a.6.6 0 0 1-.96.48L12 15.4l-5.54 4.28a.6.6 0 0 1-.96-.48V6A1.5 1.5 0 0 1 7 4.5Z"></path>' +
            '<line x1="9.2" y1="8.3" x2="14.8" y2="8.3"></line>' +
          "</svg>" +
          '<div class="article-tags">' +
            article.tags.map(function(tag) { return "<span>" + tag + "</span>"; }).join("") +
          "</div>" +
        "</div>" +
      "</div>" +
      '<div class="article-header-divider" aria-hidden="true"></div>' +
    "</div>";

  body.innerHTML = article.content;
  setupAdmonitions();
  setupImageLightbox();
  setupCodeBlocks();
  renderArticleNavigation(article.prevArticle, article.nextArticle);
  generateArticleOutline();
  renderMermaidCharts();
  renderMathBlocks();
}

function loadArticlePage() {
  var articleRoot = document.getElementById("article-container");
  if (!articleRoot) return;

  var articleId = getUrlParam("id");
  if (!articleId) {
    showArticleError("未指定文章");
    return;
  }

  ensureArticleDependenciesLoaded().then(function() {
    return Promise.all([
      fetch("./articles/" + articleId + "/meta.json?" + Date.now()),
      fetch("./articles/" + articleId + "/index.md?" + Date.now()),
      fetch("./articles/manifest.json?" + Date.now())
    ]);
  }).then(function(responses) {
    var metaRes = responses[0];
    var mdRes = responses[1];
    var manifestRes = responses[2];

    if (!metaRes.ok || !mdRes.ok) {
      throw new Error("文章不存在");
    }

    return Promise.all([
      metaRes.json(),
      mdRes.text(),
      manifestRes.ok ? manifestRes.json() : Promise.resolve([])
    ]);
  }).then(function(results) {
    var meta = results[0];
    var mdText = results[1];
    var manifest = results[2];
    var adjacent = getAdjacentArticles(manifest, articleId);

    var preprocessed = mdText.replace(/!\[\[([^\]]+)\]\]/g, "![]($1)");
    preprocessed = preprocessed.replace(/\$\$([\s\S]*?)\$\$/g, function(_, latex) {
      return "\n<div class=\"math-block\">" + latex.trim() + "</div>\n";
    });
    preprocessed = preprocessed.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g, function(_, latex) {
      return '<span class="math-inline">' + latex.trim() + "</span>";
    });

    var contentHtml = preprocessed;
    if (typeof marked !== "undefined") {
      marked.setOptions({ breaks: false });
      contentHtml = marked.parse(preprocessed);
    }

    contentHtml = contentHtml.replace(/<img src="([^"]+)"/g, '<img src="./articles/' + articleId + '/$1"');
    contentHtml = contentHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">\n$1\n</div>');
    contentHtml = contentHtml.replace(/<pre><code>mermaid\n([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">\n$1\n</div>');

    renderArticleData({
      type: meta.type,
      title: meta.title,
      date: meta.date,
      displayDate: meta.displayDate,
      tags: meta.tags || [],
      summary: meta.summary,
      content: contentHtml,
      prevArticle: adjacent.prevArticle,
      nextArticle: adjacent.nextArticle
    });
  }).catch(function(err) {
    showArticleError(err.message || "文章加载失败");
  });
}

function loadJson(url) {
  return fetch(url + "?" + Date.now()).then(function(res) {
    if (!res.ok) {
      throw new Error("加载失败");
    }
    return res.json();
  });
}

function showProjectError(message) {
  var header = document.getElementById("project-detail-header");
  var body = document.getElementById("project-detail-body");
  if (!header || !body) return;
  header.innerHTML = '<div class="project-not-found"><h1>项目未找到</h1><p>' + message + '</p><p><a href="projects.html">返回项目列表</a></p></div>';
  body.innerHTML = "";
}

function listToHtml(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }
  return "<ul>" + items.map(function(item) {
    return "<li>" + item + "</li>";
  }).join("") + "</ul>";
}

function galleryToHtml(items, projectId) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }
  return (
    '<div class="project-gallery-grid">' +
    items.map(function(item) {
      return (
        "<figure>" +
          '<img src="./projects/' + projectId + "/" + item.src + '" alt="' + (item.alt || "") + '" loading="lazy">' +
          "<figcaption>" + (item.caption || "") + "</figcaption>" +
        "</figure>"
      );
    }).join("") +
    "</div>"
  );
}

function renderProjectNavigation(manifest, currentIndex) {
  var nav = document.getElementById("project-detail-nav");
  if (!nav) return;

  var prev = manifest[currentIndex + 1] || null;
  var next = manifest[currentIndex - 1] || null;

  function navItem(item, label, direction) {
    if (!item) {
      return '<div class="article-post-nav-link is-empty" aria-hidden="true"></div>';
    }
    return (
      '<a class="article-post-nav-link ' + direction + '" href="' + item.href + '">' +
        '<span class="article-post-nav-label">' + label + "</span>" +
        '<span class="article-post-nav-title">' + item.title + "</span>" +
      "</a>"
    );
  }

  nav.innerHTML = navItem(prev, "上一个项目", "prev") + navItem(next, "下一个项目", "next");
  nav.style.display = "flex";
}

function renderProjectPage(detail, manifest, currentIndex) {
  document.title = detail.title + " | 项目详情 | Lin Archive";

  var header = document.getElementById("project-detail-header");
  var body = document.getElementById("project-detail-body");
  if (!header || !body) return;
  var links = detail.links || {};

  header.innerHTML =
    '<div class="project-detail-title-block">' +
      '<h1 class="project-detail-title">' + detail.title + "</h1>" +
    "</div>";

  body.innerHTML =
    '<section class="project-detail-section">' +
      "<h2>项目概述</h2>" +
      "<p>" + (detail.summary || "") + "</p>" +
    "</section>" +
    '<section class="project-detail-section">' +
      "<h2>技术栈</h2>" +
      listToHtml(detail.techStack) +
    "</section>" +
    '<section class="project-detail-section">' +
      "<h2>实现方案</h2>" +
      listToHtml(detail.implementation) +
    "</section>" +
    '<section class="project-detail-section">' +
      "<h2>链接</h2>" +
      '<div class="project-detail-links">' +
        '<a class="button button-primary" href="' + (links.github || "#") + '" target="_blank" rel="noopener noreferrer">GitHub</a>' +
        '<a class="button button-secondary" href="' + (links.docs || "#") + '" target="_blank" rel="noopener noreferrer">文档</a>' +
      "</div>" +
    "</section>" +
    '<section class="project-detail-section">' +
      "<h2>演示图片</h2>" +
      galleryToHtml(detail.gallery, detail.id) +
    "</section>";

  renderProjectNavigation(manifest, currentIndex);
}

function loadProjectDetailPage() {
  var projectRoot = document.getElementById("project-detail-container");
  if (!projectRoot) return;

  var projectId = getUrlParam("id");
  if (!projectId) {
    showProjectError("未指定项目");
    return;
  }

  loadJson("./projects/manifest.json").then(function(manifest) {
    var currentIndex = manifest.findIndex(function(item) {
      return item.id === projectId;
    });
    if (currentIndex === -1) {
      showProjectError("未找到对应项目");
      return null;
    }
    return loadJson("./projects/" + projectId + "/detail.json").then(function(detail) {
      renderProjectPage(detail, manifest, currentIndex);
      return true;
    });
  }).catch(function() {
    showProjectError("项目详情加载失败");
  });
}

function updateNavCurrentByPath(pathname) {
  var currentPage = normalizePageName(pathname);
  if (currentPage === "article.html") {
    currentPage = "posts.html";
  } else if (currentPage === "project.html") {
    currentPage = "projects.html";
  }
  var links = document.querySelectorAll(".nav a");
  links.forEach(function(link) {
    var href = link.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#") {
      link.removeAttribute("aria-current");
      return;
    }
    var target = normalizePageName(new URL(href, window.location.href).pathname);
    if (target === currentPage) {
      link.setAttribute("aria-current", "true");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function syncPersistentHeaderState() {
  var brand = document.querySelector(".brand");
  if (brand) {
    brand.setAttribute("href", "index.html");
  }
  updateNavCurrentByPath(window.location.pathname);
}

function syncFooterFromDocument(nextDoc) {
  var currentFooter = document.querySelector(".footer");
  var nextFooter = nextDoc.querySelector(".footer");
  if (!currentFooter || !nextFooter) {
    return;
  }
  currentFooter.innerHTML = nextFooter.innerHTML;
  currentFooter.className = nextFooter.className;
  currentFooter.classList.add("is-visible");
}

function syncHeadFromDocument(nextDoc) {
  if (nextDoc.title) {
    document.title = nextDoc.title;
  }
  var metaPairs = [
    ['meta[name="description"]', 'meta[name="description"]'],
    ['meta[property="og:title"]', 'meta[property="og:title"]'],
    ['meta[property="og:description"]', 'meta[property="og:description"]'],
    ['meta[property="og:type"]', 'meta[property="og:type"]']
  ];
  metaPairs.forEach(function(pair) {
    var currentMeta = document.querySelector(pair[0]);
    var nextMeta = nextDoc.querySelector(pair[1]);
    if (currentMeta && nextMeta) {
      currentMeta.setAttribute("content", nextMeta.getAttribute("content") || "");
    }
  });
}

function syncBodyClassFromDocument(nextDoc) {
  if (!nextDoc || !nextDoc.body || !document.body) {
    return;
  }
  document.body.className = nextDoc.body.className || "";
}

function isShellNavigationTarget(urlObj) {
  if (!urlObj || urlObj.origin !== window.location.origin) {
    return false;
  }
  var pageName = normalizePageName(urlObj.pathname);
  if (!SHELL_PAGE_MAP[pageName]) {
    return false;
  }
  if (pageName === "article.html" || pageName === "project.html") {
    return true;
  }
  return !urlObj.search;
}

function runShellNavigation(url, shouldPushState) {
  var targetUrl = new URL(url, window.location.href);
  if (!isShellNavigationTarget(targetUrl)) {
    window.location.href = targetUrl.toString();
    return;
  }

  var navToken = ++currentShellNavigationToken;
  fetch(targetUrl.toString(), { credentials: "same-origin" }).then(function(res) {
    if (!res.ok) {
      throw new Error("页面加载失败");
    }
    return res.text();
  }).then(function(html) {
    if (navToken !== currentShellNavigationToken) {
      return;
    }
    var parser = new DOMParser();
    var nextDoc = parser.parseFromString(html, "text/html");
    var nextMain = nextDoc.querySelector("main");
    var currentMain = document.querySelector("main");
    if (!nextMain || !currentMain) {
      window.location.href = targetUrl.toString();
      return;
    }

    currentMain.replaceWith(nextMain);
    syncBodyClassFromDocument(nextDoc);
    syncHeadFromDocument(nextDoc);
    syncFooterFromDocument(nextDoc);
    if (shouldPushState) {
      history.pushState({ shellNav: true }, "", targetUrl.toString());
    }
    window.scrollTo(0, 0);
    initPage();
  }).catch(function() {
    window.location.href = targetUrl.toString();
  });
}

function setupShellNavigation() {
  if (hasSetupShellNavigation) {
    return;
  }
  document.addEventListener("click", function(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    var link = e.target.closest("a[href]");
    if (!link) {
      return;
    }
    if (link.target && link.target !== "_self") {
      return;
    }
    if (link.hasAttribute("download")) {
      return;
    }
    var href = link.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#") {
      return;
    }
    if (/^(mailto:|tel:|javascript:)/i.test(href)) {
      return;
    }

    var targetUrl = new URL(href, window.location.href);
    if (!isShellNavigationTarget(targetUrl)) {
      return;
    }

    e.preventDefault();
    runShellNavigation(targetUrl.toString(), true);
  });

  window.addEventListener("popstate", function() {
    var targetUrl = new URL(window.location.href);
    if (!isShellNavigationTarget(targetUrl)) {
      window.location.reload();
      return;
    }
    runShellNavigation(targetUrl.toString(), false);
  });
  hasSetupShellNavigation = true;
}

function initPage() {
  var token = ++currentPageInitToken;
  resetPostFilteringState();
  syncPersistentHeaderState();
  setupRevealAnimation();
  highlightCurrentSection();

  ensureSiteSettingsLoaded().then(function() {
    if (token !== currentPageInitToken) {
      return;
    }
    applySiteSettings();
    applyHomeSettings();
    applyAboutSettings();
  }).finally(function() {
    if (token !== currentPageInitToken) {
      return;
    }
    markHeaderSettingsReady();
    markAboutSettingsReady();
  });

  var postsGrid = document.getElementById("posts-grid");
  var projectsList = document.getElementById("projects-list");
  var projectsGrid = document.getElementById("projects-grid");
  var articleContainer = document.getElementById("article-container");
  var projectDetailContainer = document.getElementById("project-detail-container");

  if (articleContainer) {
    loadArticlePage();
  }
  if (projectDetailContainer) {
    loadProjectDetailPage();
  }

  if (postsGrid) {
    var isPostsListPage = !!document.getElementById("category-filters") && !!document.getElementById("tag-filters");

    loadPostsFromManifest().then(function() {
      if (token !== currentPageInitToken) {
        return;
      }
      renderHeroStats();
      if (isPostsListPage) {
        setupPostFiltering();
      } else {
        renderHomeLatestPosts();
      }
    }).catch(function() {
      if (token !== currentPageInitToken) {
        return;
      }
      renderHeroStats();
      if (isPostsListPage) {
        if (noResultsRef) {
          noResultsRef.style.display = "block";
          postsGrid.style.display = "none";
        }
      }
    });
  }

  if (projectsList || projectsGrid) {
    loadProjectsFromManifest().then(function() {
      if (token !== currentPageInitToken) {
        return;
      }
      renderHeroStats();
      if (projectsList) {
        renderCollection("projects-list", projects, createProjectCard);
      }
      if (projectsGrid) {
        renderCollection("projects-grid", projects.slice(0, 3), createHomeProjectCard);
      }
    }).catch(function() {
      if (token !== currentPageInitToken) {
        return;
      }
      renderHeroStats();
    });
  }
}

function initSiteShell() {
  setupPageScrollbarIndicator();
  setupHeaderScrollEffect();
  setupShellNavigation();
  initPage();
}

function copyToClipboard(text, successMsg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      showToast(successMsg || "已复制到剪贴板");
    }).catch(function() {
      fallbackCopy(text, successMsg);
    });
  } else {
    fallbackCopy(text, successMsg);
  }
}

function fallbackCopy(text, successMsg) {
  var textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    showToast(successMsg || "已复制到剪贴板");
  } catch (err) {
    showToast("复制失败，请手动复制");
  }
  document.body.removeChild(textarea);
}

function showToast(message) {
  var existing = document.querySelector(".copy-toast");
  if (existing) existing.remove();
  var toast = document.createElement("div");
  toast.className = "copy-toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function() {
    toast.classList.add("show");
  }, 10);
  setTimeout(function() {
    toast.classList.remove("show");
    setTimeout(function() {
      toast.remove();
    }, 300);
  }, 2000);
}

function copyQQ() {
  var qqNumber = (siteSettings && siteSettings.about && siteSettings.about.links && siteSettings.about.links.qq) || "208600679";
  copyToClipboard(qqNumber, "QQ号已复制到剪贴板");
}

function copyWechat() {
  var wechatId = (siteSettings && siteSettings.about && siteSettings.about.links && siteSettings.about.links.wechat) || "";
  if (wechatId && wechatId !== "#") {
    copyToClipboard(wechatId, "微信号已复制到剪贴板");
  } else {
    showToast("未配置微信号");
  }
}

function copyEmail() {
  var emailEl = document.getElementById("email-btn");
  var email = emailEl ? emailEl.getAttribute("data-email") : "";
  if (email) {
    copyToClipboard(email, "邮箱已复制到剪贴板");
  } else {
    showToast("未配置邮箱");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSiteShell, { once: true });
} else {
  initSiteShell();
}

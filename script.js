var posts = [];
var projects = [];
var BLOG_START_DATE = "2025-06-18";
var siteSettings = null;

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

function applySiteSettings() {
  if (!siteSettings) return;
  var site = siteSettings.site || {};
  var home = siteSettings.home || {};

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

  var brandLink = document.querySelector('.brand');
  if (brandLink) {
    if (home.brandIcon) {
      var existingIcon = brandLink.querySelector('.brand-icon-img');
      if (existingIcon) {
        existingIcon.src = home.brandIcon;
      } else {
        var iconImg = document.createElement('img');
        iconImg.className = 'brand-icon-img';
        iconImg.src = home.brandIcon;
        iconImg.alt = '';
        var mark = brandLink.querySelector('.brand-mark');
        if (mark) {
          brandLink.insertBefore(iconImg, mark);
        } else {
          brandLink.insertBefore(iconImg, brandLink.firstChild);
        }
      }
    }
    if (home.brandName) {
      var brandText = brandLink.querySelector('.brand-text');
      if (brandText) brandText.textContent = home.brandName;
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
}

var currentFilter = "all";
var currentCategory = "all";
var currentSearch = "";
var currentPage = 1;
var postsPerPage = 10;
var postsGridRef = null;
var noResultsRef = null;
var paginationControlsRef = null;

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

function init() {
  loadSiteSettings().then(function() {
    applySiteSettings();
    applyHomeSettings();
    applyAboutSettings();
  }).finally(function() {
    markAboutSettingsReady();
  });

  setupRevealAnimation();
  highlightCurrentSection();
  setupHeaderScrollEffect();

  var postsGrid = document.getElementById("posts-grid");
  var projectsList = document.getElementById("projects-list");
  var projectsGrid = document.getElementById("projects-grid");

  if (projectsList) {
    // load via manifest below
  }
  if (projectsGrid) {
    // load via manifest below
  }

  if (postsGrid) {
    var isPostsListPage = !!document.getElementById("category-filters") && !!document.getElementById("tag-filters");

    loadPostsFromManifest().then(function() {
      renderHeroStats();
      if (isPostsListPage) {
        setupPostFiltering();
      } else {
        renderHomeLatestPosts();
      }
    }).catch(function(err) {
      console.error('文章列表加载失败:', err.message);
      renderHeroStats();
      if (isPostsListPage) {
        if (noResultsRef) {
          noResultsRef.style.display = 'block';
          postsGrid.style.display = 'none';
        }
      }
    });
  }

  if (projectsList || projectsGrid) {
    loadProjectsFromManifest().then(function() {
      renderHeroStats();
      if (projectsList) {
        renderCollection("projects-list", projects, createProjectCard);
      }
      if (projectsGrid) {
        renderCollection("projects-grid", projects.slice(0, 3), createHomeProjectCard);
      }
    }).catch(function(err) {
      console.error("项目列表加载失败:", err.message);
      renderHeroStats();
    });
  }
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
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}

export {};

type ThemeMode = 'dark' | 'light';
type ThemePref = 'dark' | 'system' | 'light';

const THEME_STORAGE_KEY = 'viblog-theme';

let pageScope: AbortController | undefined;
let diagramSequence = 0;
let initializedDocument: HTMLElement | undefined;
let globalsInitialized = false;

function currentPref(): ThemePref {
  const pref = document.documentElement.dataset.themePref;
  return pref === 'dark' || pref === 'light' || pref === 'system' ? pref : 'system';
}

function resolveTheme(pref: ThemePref): ThemeMode {
  if (pref === 'system') {
    return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return pref;
}

function currentTheme(): ThemeMode {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function syncThemeUi(pref: ThemePref, resolved: ThemeMode) {
  document.documentElement.dataset.themePref = pref;
  document.documentElement.dataset.theme = resolved;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'light' ? '#f6f8fb' : '#070a10');

  document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]').forEach((btn) => {
    const selected = btn.dataset.themeChoice === pref;
    btn.setAttribute('aria-checked', String(selected));
    btn.tabIndex = selected ? 0 : -1;
  });
}

function applyThemePref(pref: ThemePref, persist = true) {
  const prevResolved = currentTheme();
  const resolved = resolveTheme(pref);
  syncThemeUi(pref, resolved);
  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch {
      /* Storage may be unavailable in restricted contexts. */
    }
  }
  if (resolved !== prevResolved && pageScope) {
    void rerenderMermaidForTheme(pageScope.signal);
  }
}

/**
 * One-time global setup:
 * 1. Persistent borderless cursor optical light + coordinate grid spotlight
 * 2. 3-state sliding segmented theme switch (Dark / System / Light) + OS auto-tracking
 */
function ensureGlobalControllers() {
  if (globalsInitialized) return;
  globalsInitialized = true;

  const order: ThemePref[] = ['dark', 'system', 'light'];

  // Click on any segment of the 3-state sliding switch
  document.addEventListener('click', (e) => {
    const btn = (e.target as Element | null)?.closest<HTMLButtonElement>('[data-theme-choice]');
    if (!btn) return;
    const choice = btn.dataset.themeChoice as ThemePref | undefined;
    if (choice && order.includes(choice)) {
      applyThemePref(choice, true);
    }
  });

  // Keyboard arrow navigation inside the radiogroup switch
  document.addEventListener('keydown', (e) => {
    const group = (e.target as Element | null)?.closest<HTMLElement>('[data-theme-switch]');
    if (!group || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    const curIdx = order.indexOf(currentPref());
    const nextPref = order[(curIdx + (e.key === 'ArrowRight' ? 1 : 2)) % order.length];
    applyThemePref(nextPref, true);
    group.querySelector<HTMLButtonElement>(`[data-theme-choice="${nextPref}"]`)?.focus();
  });

  // Live OS preference tracking whenever user is on "system"
  const osQuery = matchMedia('(prefers-color-scheme: light)');
  osQuery.addEventListener('change', () => {
    if (currentPref() === 'system') {
      applyThemePref('system', false);
    }
  });

  // Global keyboard shortcut: press "/" on /posts/ to jump straight to search
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (document.activeElement?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    const search = document.querySelector<HTMLInputElement>('#article-search');
    if (search) {
      e.preventDefault();
      search.focus();
    }
  });

  // Borderless cursor optical light + coordinate grid spotlight
  const root = document.documentElement;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let targetX = innerWidth * 0.65;
  let targetY = innerHeight * 0.4;
  let curX = targetX;
  let curY = targetY;
  let active = 0;
  let targetActive = 0;
  let raf = 0;

  const tick = () => {
    curX += (targetX - curX) * 0.16;
    curY += (targetY - curY) * 0.16;
    active += (targetActive - active) * 0.12;
    root.style.setProperty('--cursor-x', `${curX.toFixed(1)}px`);
    root.style.setProperty('--cursor-y', `${curY.toFixed(1)}px`);
    root.style.setProperty('--cursor-active', active.toFixed(3));

    const moving =
      Math.abs(targetX - curX) > 0.35 ||
      Math.abs(targetY - curY) > 0.35 ||
      Math.abs(targetActive - active) > 0.005;
    raf = moving ? requestAnimationFrame(tick) : 0;
  };

  const kick = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      targetX = e.clientX;
      targetY = e.clientY;
      targetActive = 1;
      kick();
    },
    { passive: true },
  );

  document.addEventListener('pointerleave', () => {
    targetActive = 0;
    kick();
  });

  window.addEventListener('blur', () => {
    targetActive = 0;
    kick();
  });
}

/**
 * Unified, deterministic scroll-spy for sticky section/TOC navigation.
 * Supports smooth scrolling in both directions, bottom-of-page focus,
 * instant interruptible click feedback, and optional gliding vertical indicator.
 */
function bindScrollSpy(
  container: HTMLElement,
  options: { indicatorSelector?: string; scrollLinkIntoView?: boolean },
  signal: AbortSignal,
) {
  const links = [...container.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
  if (!links.length) return;

  const pairs = links
    .map((link) => {
      const id = decodeURIComponent(link.getAttribute('href')!.slice(1));
      const target = document.getElementById(id);
      return target ? { id, link, target } : null;
    })
    .filter((item): item is { id: string; link: HTMLAnchorElement; target: HTMLElement } => Boolean(item));

  if (!pairs.length) return;

  const indicator = options.indicatorSelector
    ? container.querySelector<HTMLElement>(options.indicatorSelector)
    : null;

  let activeLink: HTMLAnchorElement | null = null;
  let indicatorInitialized = false;
  let clickLockTimer = 0;
  let clickLocked = false;
  let frame = 0;

  const positionIndicator = (link: HTMLAnchorElement, immediate = false) => {
    if (!indicator) return;
    const inset = 6;
    const top = link.offsetTop + inset;
    const height = Math.max(14, link.offsetHeight - inset * 2);

    if (immediate || !indicatorInitialized) {
      indicator.style.transition = 'none';
      indicator.style.transform = `translate3d(0, ${top}px, 0)`;
      indicator.style.height = `${height}px`;
      indicator.classList.add('is-ready');
      // Force style commit before restoring transitions
      void indicator.offsetHeight;
      indicator.style.transition = '';
      indicatorInitialized = true;
      return;
    }

    indicator.style.transform = `translate3d(0, ${top}px, 0)`;
    indicator.style.height = `${height}px`;
    indicator.classList.add('is-ready');
  };

  const setCurrent = (link: HTMLAnchorElement, immediate = false) => {
    if (activeLink === link) {
      if (immediate) positionIndicator(link, true);
      return;
    }
    for (const pair of pairs) {
      if (pair.link === link) pair.link.setAttribute('aria-current', 'location');
      else pair.link.removeAttribute('aria-current');
    }
    activeLink = link;
    positionIndicator(link, immediate);
    if (options.scrollLinkIntoView && !immediate) {
      link.scrollIntoView({ block: 'nearest' });
    }
  };

  const resolveActive = (): HTMLAnchorElement => {
    const doc = document.documentElement;
    const atBottom = scrollY + innerHeight >= doc.scrollHeight - 24;
    if (atBottom) return pairs[pairs.length - 1].link;

    const triggerY = Math.max(120, Math.min(240, innerHeight * 0.25));
    let chosen = pairs[0].link;
    for (const pair of pairs) {
      if (pair.target.getBoundingClientRect().top <= triggerY) {
        chosen = pair.link;
      } else {
        break;
      }
    }
    return chosen;
  };

  const syncFromScroll = (immediate = false) => {
    frame = 0;
    if (clickLocked && !immediate) return;
    setCurrent(resolveActive(), immediate);
  };

  const scheduleSync = () => {
    if (!frame) frame = requestAnimationFrame(() => syncFromScroll(false));
  };

  const releaseClickLock = () => {
    if (!clickLocked) return;
    clickLocked = false;
    window.clearTimeout(clickLockTimer);
    scheduleSync();
  };

  for (const pair of pairs) {
    pair.link.addEventListener(
      'click',
      () => {
        clickLocked = true;
        window.clearTimeout(clickLockTimer);
        setCurrent(pair.link);
        clickLockTimer = window.setTimeout(() => {
          clickLocked = false;
          scheduleSync();
        }, 650);
      },
      { signal },
    );
  }

  window.addEventListener('scroll', scheduleSync, { passive: true, signal });
  window.addEventListener('wheel', releaseClickLock, { passive: true, signal });
  window.addEventListener('touchstart', releaseClickLock, { passive: true, signal });
  window.addEventListener(
    'resize',
    () => {
      if (activeLink) positionIndicator(activeLink, true);
      scheduleSync();
    },
    { passive: true, signal },
  );
  window.addEventListener(
    'hashchange',
    () => {
      const hashId = decodeURIComponent(location.hash.replace(/^#/, ''));
      const matched = pairs.find((p) => p.id === hashId);
      if (matched) setCurrent(matched.link);
    },
    { signal },
  );

  signal.addEventListener(
    'abort',
    () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(clickLockTimer);
    },
    { once: true },
  );

  // Initial focus: honor URL hash if scrolled to it or near it, else current scroll position
  const initialHash = decodeURIComponent(location.hash.replace(/^#/, ''));
  const hashMatch = initialHash ? pairs.find((p) => p.id === initialHash) : undefined;
  setCurrent(hashMatch ? hashMatch.link : resolveActive(), true);
}

/** Unified, interruptible copy feedback for both code blocks and contact snippets */
function bindCopyButton(
  button: HTMLButtonElement,
  getValue: () => string,
  idleLabel: string,
  copiedLabel: string,
  fallbackLabel: (val: string) => string,
  signal: AbortSignal,
) {
  let resetTimer = 0;
  signal.addEventListener('abort', () => window.clearTimeout(resetTimer), { once: true });

  button.addEventListener(
    'click',
    async () => {
      const value = getValue();
      window.clearTimeout(resetTimer);
      try {
        await navigator.clipboard.writeText(value);
        button.dataset.copied = 'true';
        button.textContent = copiedLabel;
        resetTimer = window.setTimeout(() => {
          if (signal.aborted) return;
          delete button.dataset.copied;
          button.textContent = idleLabel;
        }, 1800);
      } catch {
        delete button.dataset.copied;
        button.textContent = fallbackLabel(value);
      }
    },
    { signal },
  );
}

function initializePage() {
  ensureGlobalControllers();
  syncThemeUi(currentPref(), currentTheme());

  if (initializedDocument === document.body) return;
  initializedDocument = document.body;

  pageScope?.abort();
  const scope = new AbortController();
  const { signal } = scope;
  pageScope = scope;

  // Sync active navigation indicator on persisted header
  const pageClass = document.body.className;
  document.querySelectorAll<HTMLAnchorElement>('.primary-nav a').forEach((link) => {
    const active =
      link.pathname === '/posts/'
        ? /page-(posts|article)\b/.test(pageClass)
        : link.pathname === '/projects/'
          ? /page-(projects|project)\b/.test(pageClass)
          : pageClass.includes('page-about');
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  // Header scroll state + reading progress bar + contextual floating back-to-top
  const progressBar = document.querySelector<HTMLElement>('.reading-progress');
  const floatingTop = document.querySelector<HTMLButtonElement>('[data-back-to-top]');
  if (floatingTop) {
    floatingTop.addEventListener(
      'click',
      () => {
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      },
      { signal },
    );
  }

  let scrollFrame = 0;
  const updateScroll = () => {
    scrollFrame = 0;
    const scrolled = String(scrollY > 24);
    if (document.documentElement.dataset.scrolled !== scrolled) {
      document.documentElement.dataset.scrolled = scrolled;
    }
    if (floatingTop) {
      const showTop = scrollY > 420;
      floatingTop.classList.toggle('is-visible', showTop);
      floatingTop.setAttribute('aria-hidden', String(!showTop));
      floatingTop.tabIndex = showTop ? 0 : -1;
    }
    if (progressBar) {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const ratio = Math.min(1, Math.max(0, scrollY / maxScroll));
      progressBar.style.transform = `scaleX(${ratio.toFixed(4)})`;
    }
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
    },
    { passive: true, signal },
  );
  signal.addEventListener('abort', () => cancelAnimationFrame(scrollFrame), { once: true });
  updateScroll();

  // Scroll-Reveal animation for content blocks
  const revealNodes = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  if (revealNodes.length) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      revealNodes.forEach((el) => el.classList.add('is-revealed'));
    } else {
      const revealObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-revealed');
              revealObserver.unobserve(entry.target);
            }
          }
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
      );
      revealNodes.forEach((el) => revealObserver.observe(el));
      signal.addEventListener('abort', () => revealObserver.disconnect(), { once: true });
    }
  }

  // Article Sticky Sidebar TOC + Project Case Nav Scroll Spy
  const tocSidebar = document.querySelector<HTMLElement>('.toc-sidebar');
  if (tocSidebar) {
    bindScrollSpy(tocSidebar, { scrollLinkIntoView: true }, signal);
  }
  const caseNav = document.querySelector<HTMLElement>('.case-nav nav[data-scroll-spy]');
  if (caseNav) {
    bindScrollSpy(caseNav, { indicatorSelector: '.case-nav-indicator' }, signal);
  }

  // QR channel popovers (touch/click toggle + outside-click / Escape dismiss; desktop hover works via CSS)
  const qrChannels = [...document.querySelectorAll<HTMLElement>('[data-qr-channel]')];
  if (qrChannels.length) {
    const closeAllQr = (except?: HTMLElement) => {
      for (const channel of qrChannels) {
        if (channel === except) continue;
        channel.classList.remove('is-open');
        channel.querySelector<HTMLButtonElement>('[data-qr-trigger]')?.setAttribute('aria-expanded', 'false');
      }
    };

    for (const channel of qrChannels) {
      const trigger = channel.querySelector<HTMLButtonElement>('[data-qr-trigger]');
      if (!trigger) continue;
      trigger.addEventListener(
        'click',
        (event) => {
          event.stopPropagation();
          const willOpen = !channel.classList.contains('is-open');
          closeAllQr(willOpen ? channel : undefined);
          channel.classList.toggle('is-open', willOpen);
          trigger.setAttribute('aria-expanded', String(willOpen));
        },
        { signal },
      );
    }

    document.addEventListener(
      'click',
      (event) => {
        if (!(event.target as Element | null)?.closest('[data-qr-channel]')) {
          closeAllQr();
        }
      },
      { signal },
    );

    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          closeAllQr();
          const active = document.activeElement as HTMLElement | null;
          if (active?.closest('[data-qr-channel]')) active.blur();
        }
      },
      { signal },
    );
  }

  // Unified copy feedback on QQ / contact buttons
  document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((button) => {
    const idleLabel = button.textContent?.trim() || '复制';
    bindCopyButton(
      button,
      () => button.dataset.copy || '',
      idleLabel,
      '✓ 已复制 QQ 号',
      (val) => `QQ：${val}`,
      signal,
    );
  });

  // Code block language label + unified copy button
  document.querySelectorAll<HTMLElement>('.prose pre').forEach((pre) => {
    if (pre.querySelector('.language-mermaid')) return;
    const code = pre.querySelector('code');
    if (!code) return;

    const langMatch = code.className.match(/language-([a-z0-9+#-]+)/i);
    if (langMatch && !pre.querySelector('.code-lang')) {
      const badge = document.createElement('span');
      badge.className = 'code-lang';
      badge.textContent = langMatch[1].toUpperCase();
      pre.append(badge);
    }

    const button = pre.querySelector<HTMLButtonElement>('.copy-code') || document.createElement('button');
    button.type = 'button';
    button.className = 'copy-code';
    button.textContent = '复制';
    button.setAttribute('aria-label', '复制这段代码');
    bindCopyButton(button, () => code.textContent || '', '复制', '✓ 已复制', () => '请选中代码复制', signal);
    if (!button.isConnected) pre.append(button);
  });

  // Article image zoom wrapper
  document.querySelectorAll<HTMLImageElement>('.prose img').forEach((image) => {
    if (image.closest('button,a')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'article-image-button';
    button.dataset.galleryImage = image.dataset.original || image.src;
    button.dataset.caption = image.alt || '文章配图';
    button.setAttribute('aria-label', `放大查看：${image.alt || '文章配图'}`);
    image.replaceWith(button);
    button.append(image);
  });

  // Lightbox modal dialog
  const lightbox = document.querySelector<HTMLDialogElement>('#gallery-dialog');
  if (lightbox) {
    let image = lightbox.querySelector<HTMLImageElement>('.dialog-image img');
    const caption = lightbox.querySelector<HTMLElement>('figcaption')!;
    let trigger: HTMLElement | null = null;
    document.querySelectorAll<HTMLButtonElement>('[data-gallery-image]').forEach((button) =>
      button.addEventListener(
        'click',
        () => {
          trigger = button;
          if (!image) {
            image = document.createElement('img');
            lightbox.querySelector('.dialog-image')!.append(image);
          }
          image.src = button.dataset.galleryImage || '';
          image.alt = button.dataset.caption || '项目截图';
          caption.textContent = image.alt;
          if (!lightbox.open) lightbox.showModal();
        },
        { signal },
      ),
    );
    lightbox.querySelector('button')?.addEventListener('click', () => lightbox.close(), { signal });
    lightbox.addEventListener(
      'click',
      (event) => {
        if (event.target === lightbox) lightbox.close();
      },
      { signal },
    );
    lightbox.addEventListener('close', () => trigger?.focus(), { signal });
  }

  void renderDiagrams(signal).catch(() => {
    /* Keep readable source if diagram loading fails. */
  });
}

function getMermaidThemeConfig(theme: ThemeMode) {
  if (theme === 'light') {
    return {
      darkMode: false,
      background: '#ffffff',
      primaryColor: '#eef4ff',
      primaryTextColor: '#0f1726',
      primaryBorderColor: '#3b6fc2',
      lineColor: '#3b5b8c',
      secondaryColor: '#f3f7fc',
      secondaryTextColor: '#1e2f4a',
      secondaryBorderColor: '#9fb6d8',
      tertiaryColor: '#f8fafd',
      tertiaryTextColor: '#27344a',
      clusterBkg: '#f4f7fc',
      clusterBorder: '#b7c7de',
      edgeLabelBackground: '#ffffff',
      fontFamily: '"Manrope Variable", "PingFang SC", "Microsoft YaHei", sans-serif',
    };
  }
  return {
    darkMode: true,
    background: '#0b1220',
    primaryColor: '#132036',
    primaryTextColor: '#e8effa',
    primaryBorderColor: '#4c70a6',
    lineColor: '#7ea6df',
    secondaryColor: '#182740',
    secondaryTextColor: '#dbe7fa',
    secondaryBorderColor: '#3f5b85',
    tertiaryColor: '#101a2b',
    tertiaryTextColor: '#d0dcf0',
    clusterBkg: '#0e1726',
    clusterBorder: '#334866',
    edgeLabelBackground: '#0d1524',
    fontFamily: '"Manrope Variable", "PingFang SC", "Microsoft YaHei", sans-serif',
  };
}

async function renderDiagrams(signal: AbortSignal) {
  const diagrams = [...document.querySelectorAll<HTMLElement>('.prose code.language-mermaid:not([data-rendering])')];
  if (!diagrams.length) return;
  diagrams.forEach((code) => {
    code.dataset.rendering = 'true';
  });
  const { default: mermaid } = await import('mermaid');
  if (signal.aborted) {
    diagrams.forEach((code) => delete code.dataset.rendering);
    return;
  }
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    themeVariables: getMermaidThemeConfig(currentTheme()),
  });
  for (const code of diagrams) {
    if (signal.aborted || !code.isConnected) {
      delete code.dataset.rendering;
      continue;
    }
    const source = code.textContent || '';
    try {
      const { svg } = await mermaid.render(`diagram-${diagramSequence++}`, source);
      if (signal.aborted || !code.isConnected) {
        delete code.dataset.rendering;
        continue;
      }
      const container = document.createElement('div');
      container.className = 'mermaid-diagram';
      container.dataset.mermaidSrc = source;
      container.setAttribute('aria-label', '流程图');
      container.innerHTML = svg;
      code.closest('pre')?.replaceWith(container);
    } catch {
      delete code.dataset.rendering;
    }
  }
}

async function rerenderMermaidForTheme(signal: AbortSignal) {
  const containers = [...document.querySelectorAll<HTMLElement>('.mermaid-diagram[data-mermaid-src]')];
  if (!containers.length) return;
  const { default: mermaid } = await import('mermaid');
  if (signal.aborted) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    themeVariables: getMermaidThemeConfig(currentTheme()),
  });
  for (const container of containers) {
    if (signal.aborted || !container.isConnected) continue;
    const source = container.dataset.mermaidSrc || '';
    try {
      const { svg } = await mermaid.render(`diagram-${diagramSequence++}`, source);
      if (!signal.aborted && container.isConnected) {
        container.innerHTML = svg;
      }
    } catch {
      /* Keep previous SVG if re-render fails. */
    }
  }
}

// Preserve active theme & preference cleanly across Astro ClientRouter swaps (zero flash)
document.addEventListener('astro:before-swap', (event) => {
  event.newDocument.documentElement.dataset.themePref = currentPref();
  event.newDocument.documentElement.dataset.theme = currentTheme();
  const nextMeta = event.newDocument.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (nextMeta) nextMeta.setAttribute('content', currentTheme() === 'light' ? '#f6f8fb' : '#070a10');
  pageScope?.abort();
  void event.viewTransition.ready.catch((error: DOMException) => {
    const cancelled =
      error.name === 'AbortError' ||
      (error.name === 'InvalidStateError' && /viewport.*chang/i.test(error.message));
    if (!cancelled) throw error;
  });
});

document.addEventListener('astro:page-load', initializePage);
initializePage();

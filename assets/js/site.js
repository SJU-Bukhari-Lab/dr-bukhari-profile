(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector('[data-theme-toggle]');
  const menuButton = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-site-nav]');

  const savedTheme = localStorage.getItem('sacb-theme');
  const preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = savedTheme || (preferredDark ? 'dark' : 'light');

  const updateThemeLabel = () => {
    if (!themeButton) return;
    const dark = root.dataset.theme === 'dark';
    themeButton.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');

    const label = themeButton.querySelector('[data-theme-label]');
    const icon = themeButton.querySelector('[data-theme-icon]');
    if (label) label.textContent = dark ? 'Light mode' : 'Dark mode';
    if (icon) icon.textContent = dark ? '☀' : '◐';
  };

  const closeMenu = () => {
    nav?.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    if (menuButton) menuButton.textContent = '☰';
  };

  const updateActiveNavigation = (page) => {
    document.body.dataset.page = page || '';
    nav?.querySelectorAll('[data-nav-page]').forEach(link => {
      const active = link.dataset.navPage === page;
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  };

  const hydrateScholarMetrics = async () => {
    const nodes = [...document.querySelectorAll('[data-scholar-metric]')];
    if (!nodes.length) return;

    try {
      const response = await fetch('assets/data/scholar-metrics.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const metrics = await response.json();
      nodes.forEach(node => {
        const key = node.dataset.scholarMetric;
        if (metrics[key]) node.textContent = metrics[key];
      });
      const status = document.querySelector('[data-scholar-status]');
      if (status && metrics.status) status.textContent = metrics.status;
    } catch (error) {
      console.info('Using embedded Scholar metric fallbacks.', error);
    }
  };

  const initializeTalksPage = () => {
    const page = document.querySelector('[data-talks-page]');
    if (!page || page.dataset.talksInitialized === 'true') return;
    page.dataset.talksInitialized = 'true';

    const cards = [...page.querySelectorAll('[data-talk-card]')];
    const filterButtons = [...page.querySelectorAll('[data-talk-filter]')];
    const search = page.querySelector('[data-talk-search]');
    const count = page.querySelector('[data-talk-count]');
    const emptyState = page.querySelector('[data-talk-empty]');
    const resetButton = page.querySelector('[data-talk-reset]');
    let activeFilter = 'all';

    // Start every expandable item in its compact state on each page visit.
    page.querySelectorAll('details[open]').forEach(details => details.removeAttribute('open'));

    const applyTalkFilters = () => {
      const query = (search?.value || '').trim().toLowerCase();
      let visibleCount = 0;

      cards.forEach(card => {
        const category = card.dataset.category || '';
        const searchableText = (card.dataset.search || card.textContent || '').toLowerCase();
        const categoryMatch = activeFilter === 'all' || category === activeFilter;
        const queryMatch = !query || searchableText.includes(query);
        const visible = categoryMatch && queryMatch;

        card.hidden = !visible;
        if (visible) visibleCount += 1;
      });

      if (count) count.textContent = String(visibleCount);
      if (emptyState) emptyState.hidden = visibleCount !== 0;
    };

    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        activeFilter = button.dataset.talkFilter || 'all';
        filterButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        applyTalkFilters();
      });
    });

    search?.addEventListener('input', applyTalkFilters);

    resetButton?.addEventListener('click', () => {
      activeFilter = 'all';
      if (search) search.value = '';
      filterButtons.forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.talkFilter === 'all'));
      });
      applyTalkFilters();
      search?.focus();
    });

    const dialog = page.querySelector('[data-talk-lightbox]');
    const dialogImage = dialog?.querySelector('[data-gallery-image]');
    const dialogCaption = dialog?.querySelector('[data-gallery-caption]');
    const closeButton = dialog?.querySelector('[data-gallery-close]');

    page.querySelectorAll('[data-gallery-src]').forEach(trigger => {
      trigger.addEventListener('click', () => {
        if (!dialog || !dialogImage || typeof dialog.showModal !== 'function') return;

        dialogImage.src = trigger.dataset.gallerySrc || '';
        dialogImage.alt = trigger.dataset.galleryAlt || '';
        if (dialogCaption) dialogCaption.textContent = trigger.dataset.galleryCaption || '';
        dialog.showModal();
        closeButton?.focus();
      });
    });

    closeButton?.addEventListener('click', () => dialog?.close());
    dialog?.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });

    applyTalkFilters();
  };

  const initializeMediaPage = () => {
    const page = document.querySelector('[data-media-page]');
    if (!page || page.dataset.mediaInitialized === 'true') return;
    page.dataset.mediaInitialized = 'true';

    const cards = [...page.querySelectorAll('[data-media-card]')];
    const filterButtons = [...page.querySelectorAll('[data-media-filter]')];
    const search = page.querySelector('[data-media-search]');
    const count = page.querySelector('[data-media-count]');
    const emptyState = page.querySelector('[data-media-empty]');
    const resetButton = page.querySelector('[data-media-reset]');
    let activeFilter = 'all';

    const applyMediaFilters = () => {
      const query = (search?.value || '').trim().toLowerCase();
      let visibleCount = 0;

      cards.forEach(card => {
        const category = card.dataset.category || '';
        const searchableText = (card.dataset.search || card.textContent || '').toLowerCase();
        const categoryMatch = activeFilter === 'all' || category === activeFilter;
        const queryMatch = !query || searchableText.includes(query);
        const visible = categoryMatch && queryMatch;

        card.hidden = !visible;
        if (visible) visibleCount += 1;
      });

      if (count) count.textContent = String(visibleCount);
      if (emptyState) emptyState.hidden = visibleCount !== 0;
    };

    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        activeFilter = button.dataset.mediaFilter || 'all';
        filterButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        applyMediaFilters();
      });
    });

    search?.addEventListener('input', applyMediaFilters);

    resetButton?.addEventListener('click', () => {
      activeFilter = 'all';
      if (search) search.value = '';
      filterButtons.forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.mediaFilter === 'all'));
      });
      applyMediaFilters();
      search?.focus();
    });

    applyMediaFilters();
  };

  const getPageStyles = (documentNode, baseUrl = window.location.href) => (
    [...documentNode.querySelectorAll('link[rel="stylesheet"]')]
      .filter(link => !/\/site\.css(?:\?|$)/i.test(link.getAttribute('href') || ''))
      .map(link => new URL(link.getAttribute('href'), baseUrl).href)
  );

  const markInitialPageStyles = () => {
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      if (!/\/site\.css(?:\?|$)/i.test(link.href)) link.dataset.pageStyle = 'true';
    });
  };

  const syncPageStyles = async (parsed, targetUrl) => {
    const desiredStyles = new Set(getPageStyles(parsed, targetUrl.href));
    const existingStyles = [...document.querySelectorAll('link[data-page-style]')];
    const existingHrefs = new Set(existingStyles.map(link => link.href));
    const loads = [];

    desiredStyles.forEach(href => {
      if (existingHrefs.has(href)) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.pageStyle = 'true';
      loads.push(new Promise(resolve => {
        link.addEventListener('load', resolve, { once: true });
        link.addEventListener('error', resolve, { once: true });
      }));
      document.head.append(link);
    });

    if (loads.length) await Promise.all(loads);

    existingStyles.forEach(link => {
      if (!desiredStyles.has(link.href)) link.remove();
    });
  };

  const initializePageFeatures = () => {
    const filterButtons = [...document.querySelectorAll('[data-filter]')];
    const publicationCards = [...document.querySelectorAll('[data-publication]')];
    const search = document.querySelector('[data-publication-search]');
    let activeFilter = 'all';

    const applyFilters = () => {
      const query = (search?.value || '').trim().toLowerCase();
      publicationCards.forEach(card => {
        const categoryMatch = activeFilter === 'all' || card.dataset.category === activeFilter;
        const textMatch = !query || card.textContent.toLowerCase().includes(query);
        card.dataset.hidden = String(!(categoryMatch && textMatch));
      });
    };

    filterButtons.forEach(button => button.addEventListener('click', () => {
      activeFilter = button.dataset.filter || 'all';
      filterButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      applyFilters();
    }));

    search?.addEventListener('input', applyFilters);
    hydrateScholarMetrics();
    initializeTalksPage();
    initializeMediaPage();
  };

  const isInternalPageLink = (link) => {
    if (!link || link.target || link.hasAttribute('download')) return false;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    return /\.html$/i.test(url.pathname) || url.pathname.endsWith('/');
  };

  let navigating = false;

  const loadPage = async (url, options = {}) => {
    if (navigating) return;
    navigating = true;

    try {
      const response = await fetch(url.href, {
        headers: { 'X-Requested-With': 'partial-navigation' },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const nextMain = parsed.querySelector('main');
      const nextPage = parsed.body?.dataset.page || '';
      if (!nextMain) throw new Error('Target page has no <main> element.');

      await syncPageStyles(parsed, url);

      const currentMain = document.querySelector('main');
      currentMain.replaceWith(nextMain);
      document.title = parsed.title || document.title;
      updateActiveNavigation(nextPage);
      closeMenu();
      initializePageFeatures();

      if (options.history !== false) {
        history.pushState({ url: url.href }, '', url.href);
      }

      if (url.hash) {
        requestAnimationFrame(() => {
          document.querySelector(url.hash)?.scrollIntoView({ block: 'start' });
        });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }

      document.querySelector('main')?.focus({ preventScroll: true });
    } catch (error) {
      console.error('Partial navigation failed; using normal navigation.', error);
      window.location.assign(url.href);
    } finally {
      navigating = false;
    }
  };

  themeButton?.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('sacb-theme', root.dataset.theme);
    updateThemeLabel();
  });

  menuButton?.addEventListener('click', () => {
    const open = nav?.classList.toggle('is-open') || false;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.textContent = open ? '×' : '☰';
  });

  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || !isInternalPageLink(link)) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const url = new URL(link.href, window.location.href);

    // Let same-page hash links behave normally.
    if (url.pathname === window.location.pathname && url.search === window.location.search) {
      closeMenu();
      return;
    }

    event.preventDefault();
    loadPage(url);
  });

  window.addEventListener('popstate', () => {
    loadPage(new URL(window.location.href), { history: false });
  });

  markInitialPageStyles();
  updateThemeLabel();
  initializePageFeatures();
})();

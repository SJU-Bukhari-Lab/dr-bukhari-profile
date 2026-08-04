(() => {
  const root = document.documentElement;
  const body = document.body;
  const themeButton = document.querySelector('[data-theme-toggle]');
  const menuButton = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-site-nav]');

  const safeStorage = {
    get(key) {
      try { return window.localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, value); } catch { /* Theme still applies for this visit. */ }
    },
  };

  const savedTheme = safeStorage.get('sacb-theme');
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

  const setMenuOpen = (open, { restoreFocus = false } = {}) => {
    if (!nav || !menuButton) return;
    nav.classList.toggle('is-open', open);
    body.classList.toggle('menu-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuButton.textContent = open ? '×' : '☰';

    if (open) {
      requestAnimationFrame(() => nav.querySelector('a[aria-current="page"], a')?.focus());
    } else if (restoreFocus) {
      menuButton.focus();
    }
  };

  const updateUrlParameters = (changes) => {
    const url = new URL(window.location.href);
    Object.entries(changes).forEach(([key, value]) => {
      const normalized = String(value || '').trim();
      if (!normalized || normalized === 'all') url.searchParams.delete(key);
      else url.searchParams.set(key, normalized);
    });
    history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const hydrateScholarMetrics = async () => {
    const nodes = [...document.querySelectorAll('[data-scholar-metric]')];
    if (!nodes.length) return;

    try {
      const response = await fetch('assets/data/scholar-metrics.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const metrics = await response.json();

      nodes.forEach(node => {
        const key = node.dataset.scholarMetric;
        if (metrics[key] !== undefined && metrics[key] !== null) node.textContent = metrics[key];
      });

      document.querySelectorAll('[data-scholar-status]').forEach(node => {
        if (metrics.status) node.textContent = metrics.status;
      });

      document.querySelectorAll('[data-scholar-updated]').forEach(node => {
        if (!metrics.updated_at) return;
        const date = new Date(`${metrics.updated_at}T12:00:00`);
        node.textContent = Number.isNaN(date.valueOf())
          ? metrics.updated_at
          : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      });
    } catch (error) {
      console.info('Using embedded Scholar metric fallbacks.', error);
    }
  };

  const initializePublicationFilters = () => {
    const filterButtons = [...document.querySelectorAll('[data-filter]')];
    const publicationCards = [...document.querySelectorAll('[data-publication]')];
    const search = document.querySelector('[data-publication-search]');
    if (!filterButtons.length || !publicationCards.length) return;

    const params = new URLSearchParams(window.location.search);
    const allowedFilters = new Set(filterButtons.map(button => button.dataset.filter || 'all'));
    let activeFilter = allowedFilters.has(params.get('topic')) ? params.get('topic') : 'all';
    if (search) search.value = params.get('query') || '';

    const applyFilters = () => {
      const query = (search?.value || '').trim().toLowerCase();
      publicationCards.forEach(card => {
        const categoryMatch = activeFilter === 'all' || card.dataset.category === activeFilter;
        const textMatch = !query || card.textContent.toLowerCase().includes(query);
        card.dataset.hidden = String(!(categoryMatch && textMatch));
      });
      filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === activeFilter)));
      updateUrlParameters({ topic: activeFilter, query: search?.value || '' });
    };

    filterButtons.forEach(button => button.addEventListener('click', () => {
      activeFilter = button.dataset.filter || 'all';
      applyFilters();
    }));
    search?.addEventListener('input', applyFilters);
    applyFilters();
  };

  const initializeTalksPage = () => {
    const page = document.querySelector('[data-talks-page]');
    if (!page) return;

    const cards = [...page.querySelectorAll('[data-talk-card]')];
    const filterButtons = [...page.querySelectorAll('[data-talk-filter]')];
    const search = page.querySelector('[data-talk-search]');
    const count = page.querySelector('[data-talk-count]');
    const emptyState = page.querySelector('[data-talk-empty]');
    const resetButton = page.querySelector('[data-talk-reset]');
    const params = new URLSearchParams(window.location.search);
    const allowedFilters = new Set(filterButtons.map(button => button.dataset.talkFilter || 'all'));
    let activeFilter = allowedFilters.has(params.get('format')) ? params.get('format') : 'all';

    if (search) search.value = params.get('query') || '';
    page.querySelectorAll('details[open]').forEach(details => details.removeAttribute('open'));

    const applyTalkFilters = () => {
      const query = (search?.value || '').trim().toLowerCase();
      let visibleCount = 0;

      cards.forEach(card => {
        const category = card.dataset.category || '';
        const searchableText = (card.dataset.search || card.textContent || '').toLowerCase();
        const visible = (activeFilter === 'all' || category === activeFilter)
          && (!query || searchableText.includes(query));
        card.hidden = !visible;
        if (visible) visibleCount += 1;
      });

      filterButtons.forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.talkFilter === activeFilter));
      });
      if (count) count.textContent = String(visibleCount);
      if (emptyState) emptyState.hidden = visibleCount !== 0;
      updateUrlParameters({ format: activeFilter, query: search?.value || '' });
    };

    filterButtons.forEach(button => button.addEventListener('click', () => {
      activeFilter = button.dataset.talkFilter || 'all';
      applyTalkFilters();
    }));
    search?.addEventListener('input', applyTalkFilters);
    resetButton?.addEventListener('click', () => {
      activeFilter = 'all';
      if (search) search.value = '';
      applyTalkFilters();
      search?.focus();
    });

    const dialog = page.querySelector('[data-talk-lightbox]');
    const dialogImage = dialog?.querySelector('[data-gallery-image]');
    const dialogCaption = dialog?.querySelector('[data-gallery-caption]');
    const dialogCounter = dialog?.querySelector('[data-gallery-counter]');
    const closeButton = dialog?.querySelector('[data-gallery-close]');
    const previousButton = dialog?.querySelector('[data-gallery-previous]');
    const nextButton = dialog?.querySelector('[data-gallery-next]');
    const galleryTriggers = [...page.querySelectorAll('[data-gallery-src]')];
    let activeGalleryIndex = 0;
    let lastGalleryTrigger = null;

    const renderGalleryItem = index => {
      if (!galleryTriggers.length || !dialogImage) return;
      activeGalleryIndex = (index + galleryTriggers.length) % galleryTriggers.length;
      const trigger = galleryTriggers[activeGalleryIndex];
      dialogImage.src = trigger.dataset.gallerySrc || '';
      dialogImage.alt = trigger.dataset.galleryAlt || '';
      if (dialogCaption) dialogCaption.textContent = trigger.dataset.galleryCaption || '';
      if (dialogCounter) dialogCounter.textContent = `${activeGalleryIndex + 1} of ${galleryTriggers.length}`;
    };

    galleryTriggers.forEach((trigger, index) => {
      trigger.addEventListener('click', () => {
        if (!dialog || !dialogImage || typeof dialog.showModal !== 'function') {
          window.open(trigger.dataset.gallerySrc || '', '_blank', 'noopener');
          return;
        }
        lastGalleryTrigger = trigger;
        renderGalleryItem(index);
        dialog.showModal();
        closeButton?.focus();
      });
    });

    previousButton?.addEventListener('click', () => renderGalleryItem(activeGalleryIndex - 1));
    nextButton?.addEventListener('click', () => renderGalleryItem(activeGalleryIndex + 1));
    closeButton?.addEventListener('click', () => dialog?.close());
    dialog?.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
    dialog?.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        renderGalleryItem(activeGalleryIndex - 1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        renderGalleryItem(activeGalleryIndex + 1);
      }
    });
    dialog?.addEventListener('close', () => {
      dialogImage?.removeAttribute('src');
      lastGalleryTrigger?.focus();
    });

    applyTalkFilters();
  };

  const initializeMediaPage = () => {
    const page = document.querySelector('[data-media-page]');
    if (!page) return;

    const cards = [...page.querySelectorAll('[data-media-card]')];
    const filterButtons = [...page.querySelectorAll('[data-media-filter]')];
    const search = page.querySelector('[data-media-search]');
    const count = page.querySelector('[data-media-count]');
    const emptyState = page.querySelector('[data-media-empty]');
    const resetButton = page.querySelector('[data-media-reset]');
    const params = new URLSearchParams(window.location.search);
    const allowedFilters = new Set(filterButtons.map(button => button.dataset.mediaFilter || 'all'));
    let activeFilter = allowedFilters.has(params.get('category')) ? params.get('category') : 'all';

    if (search) search.value = params.get('query') || '';

    const applyMediaFilters = () => {
      const query = (search?.value || '').trim().toLowerCase();
      let visibleCount = 0;

      cards.forEach(card => {
        const category = card.dataset.category || '';
        const searchableText = (card.dataset.search || card.textContent || '').toLowerCase();
        const visible = (activeFilter === 'all' || category === activeFilter)
          && (!query || searchableText.includes(query));
        card.hidden = !visible;
        if (visible) visibleCount += 1;
      });

      filterButtons.forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.mediaFilter === activeFilter));
      });
      if (count) count.textContent = String(visibleCount);
      if (emptyState) emptyState.hidden = visibleCount !== 0;
      updateUrlParameters({ category: activeFilter, query: search?.value || '' });
    };

    filterButtons.forEach(button => button.addEventListener('click', () => {
      activeFilter = button.dataset.mediaFilter || 'all';
      applyMediaFilters();
    }));
    search?.addEventListener('input', applyMediaFilters);
    resetButton?.addEventListener('click', () => {
      activeFilter = 'all';
      if (search) search.value = '';
      applyMediaFilters();
      search?.focus();
    });

    applyMediaFilters();
  };

  themeButton?.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    safeStorage.set('sacb-theme', root.dataset.theme);
    updateThemeLabel();
  });

  menuButton?.addEventListener('click', event => {
    event.stopPropagation();
    setMenuOpen(!nav?.classList.contains('is-open'));
  });

  nav?.addEventListener('click', event => {
    if (event.target.closest('a')) setMenuOpen(false);
  });

  document.addEventListener('click', event => {
    if (!nav?.classList.contains('is-open')) return;
    if (nav.contains(event.target) || menuButton?.contains(event.target)) return;
    setMenuOpen(false);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav?.classList.contains('is-open')) {
      setMenuOpen(false, { restoreFocus: true });
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1020 && nav?.classList.contains('is-open')) setMenuOpen(false);
  });

  updateThemeLabel();
  hydrateScholarMetrics();
  initializePublicationFilters();
  initializeTalksPage();
  initializeMediaPage();
})();

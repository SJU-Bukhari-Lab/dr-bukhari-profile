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

  updateThemeLabel();
  initializePageFeatures();
})();

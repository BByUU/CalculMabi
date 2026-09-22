// Set the theme before the page paints; the preference is shared by all pages.
(() => {
  const key = 'mabi-theme';
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = value => value === 'dark' || value === 'light';
  let preference;
  try { preference = localStorage.getItem(key); } catch { /* Storage may be unavailable. */ }

  function applyTheme() {
    const theme = valid(preference) ? preference : system.matches ? 'dark' : 'light';
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0d1e26' : '#16333e');
    const button = document.querySelector('#theme-toggle');
    if (button) {
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      button.title = theme === 'dark' ? '切換為淺色模式' : '切換為黑暗模式';
    }
  }

  applyTheme();
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    document.querySelector('#theme-toggle')?.addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, preference); } catch { /* Keep the current page usable. */ }
      applyTheme();
    });
  });
  system.addEventListener('change', () => { if (!valid(preference)) applyTheme(); });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      preference = event.newValue;
      applyTheme();
    }
  });
})();

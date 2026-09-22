// Shared page controls; calculations and material state stay in their own modules.
(() => {
  // Warm only the same-site page the user points to or focuses.
  const prefetched = new Set();
  const navLink = event => event.target.closest('.category-nav a[href], .skill-mode-nav a[href]');
  const prefetch = event => {
    const link = navLink(event);
    if (!link || navigator.connection?.saveData) return;
    const target = new URL(link.href);
    if (target.origin !== location.origin || target.pathname === location.pathname || prefetched.has(target.href)) return;
    prefetched.add(target.href);
    const hint = document.createElement('link');
    hint.rel = 'prefetch'; hint.as = 'document'; hint.href = target.href;
    document.head.append(hint);
  };
  document.addEventListener('pointerover', prefetch, {passive:true});
  document.addEventListener('focusin', prefetch);
  document.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = navLink(event);
    if (link?.hasAttribute('aria-current') && new URL(link.href).pathname === location.pathname) event.preventDefault();
  });
  const button = document.querySelector('#back-to-top');
  if (!button) return;
  const updateVisibility = () => { button.hidden = window.scrollY < 300; };
  window.addEventListener('scroll', updateVisibility, { passive: true });
  window.addEventListener('pageshow', updateVisibility);
  updateVisibility();
  button.addEventListener('click', () => {
    document.querySelector('.category-nav a')?.focus({ preventScroll: true });
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  });
})();

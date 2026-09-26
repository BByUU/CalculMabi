// Keep the concise table visible; only question-mark buttons open details on hover, focus or tap.
(() => {
  let active = null, pinned = false, closeTimer;
  const panelFor = button => document.getElementById(button.getAttribute('aria-describedby'));
  function close() {
    clearTimeout(closeTimer);
    if (!active) return;
    active.setAttribute('aria-expanded', 'false');
    panelFor(active).hidden = true;
    active = null;
    pinned = false;
  }
  function position(button, panel) {
    const anchor = button.getBoundingClientRect();
    const box = panel.getBoundingClientRect();
    const width = Math.min(document.documentElement.clientWidth, document.body.clientWidth), height = window.innerHeight;
    const left = Math.max(10, Math.min(width - box.width - 10, anchor.left + (anchor.width - box.width) / 2));
    const below = anchor.bottom + 5;
    const top = below + box.height <= height - 10 ? below : Math.max(10, anchor.top - box.height - 5);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }
  function show(button) {
    clearTimeout(closeTimer);
    if (active !== button) { close(); active = button; }
    const panel = panelFor(button);
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    position(button, panel);
  }
  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      if (!active || pinned || document.activeElement === active || panelFor(active).contains(document.activeElement)) return;
      close();
    }, 140);
  }
  document.querySelectorAll('.reading-help').forEach(button => {
    const panel = panelFor(button);
    button.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') show(button); });
    button.addEventListener('pointerleave', scheduleClose);
    button.addEventListener('focus', () => show(button));
    button.addEventListener('blur', scheduleClose);
    button.addEventListener('click', () => {
      if (active === button && pinned) close();
      else { show(button); pinned = true; }
    });
    panel.addEventListener('pointerenter', () => clearTimeout(closeTimer));
    panel.addEventListener('pointerleave', scheduleClose);
  });
  document.addEventListener('pointerdown', event => {
    if (active && !active.contains(event.target) && !panelFor(active).contains(event.target)) close();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  document.addEventListener('scroll', event => {
    if (active && !panelFor(active).contains(event.target)) close();
  }, {capture: true, passive: true});
  window.addEventListener('resize', close);
})();

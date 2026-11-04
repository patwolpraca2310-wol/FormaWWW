/* Standalone approval prototype. No forms, transport, third-party scripts or storage. */
(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.add('js');
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#navigation');
  if (menu) menu.hidden = false;
  const close = (focus = false) => { if (!menu || !nav) return; nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); if (focus) menu.focus(); };
  menu?.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; nav.classList.toggle('open', open); menu.setAttribute('aria-expanded', String(open)); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav?.classList.contains('open')) close(true); });
  document.addEventListener('click', e => { if (!e.target.closest('.header')) close(); });
  nav?.addEventListener('click', e => { if (e.target.closest('a')) close(); });
  nav?.addEventListener('focusout', e => { if (e.relatedTarget && !nav.contains(e.relatedTarget) && e.relatedTarget !== menu) close(); });
  const narrow = matchMedia('(max-width: 600px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const journey = document.querySelector('.journey');
  const scene = document.querySelector('.scene');
  const toggle = document.querySelector('.shape-toggle');
  const status = document.querySelector('#shape-status');
  if (!journey || !scene || !toggle) return;
  toggle.hidden = false;
  let frame = 0, manual = false, start = 0, distance = 600, active = true;
  const clamp = n => Math.max(0, Math.min(1, n));
  const apply = p => {
    journey.style.setProperty('--p', p.toFixed(4));
    journey.style.setProperty('--detail', clamp((p - .6) / .3).toFixed(4));
    const scrolly = root.classList.contains('motion-ready');
    journey.style.setProperty('--hero', scrolly ? clamp(1 - p * 2.3) : 1);
    journey.style.setProperty('--story', scrolly ? clamp((p - .4) / .35) : 1);
  };
  const draw = () => { frame = 0; if (!active) return; apply(manual ? 1 : root.classList.contains('motion-ready') ? clamp((scrollY - start) / distance) : 0); };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };
  const configure = () => {
    close();
    root.classList.toggle('motion-ready', !narrow.matches && !reduced.matches);
    start = journey.getBoundingClientRect().top + scrollY;
    distance = Math.max(1, journey.offsetHeight - scene.offsetHeight);
    schedule();
  };
  toggle.addEventListener('click', () => {
    manual = !manual;
    toggle.setAttribute('aria-pressed', String(manual));
    toggle.innerHTML = '<span aria-hidden="true">↔</span> ' + (manual ? 'Pokaż znak F' : 'Zmień formę');
    journey.dataset.manual = String(manual);
    status.textContent = manual ? 'Przestrzenny znak zmienił się w abstrakcyjny układ strony.' : 'Pokazuję przestrzenny znak FormaWWW.';
    journey.classList.remove('scrolling');
    schedule();
  });
  window.addEventListener('scroll', () => { if (!active || !root.classList.contains('motion-ready') || manual) return; journey.classList.add('scrolling'); schedule(); }, {passive:true});
  window.addEventListener('resize', configure, {passive:true});
  narrow.addEventListener('change', configure);
  reduced.addEventListener('change', () => { journey.style.setProperty('--rx','0deg'); journey.style.setProperty('--ry','0deg'); configure(); });
  // Only respond to an actual mouse gesture. No perpetual animation loop.
  let pointerFrame = 0;
  scene.addEventListener('pointermove', e => {
    if (reduced.matches || narrow.matches || !pointer.matches || e.pointerType !== 'mouse') return;
    cancelAnimationFrame(pointerFrame);
    const r = scene.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5;
    const y = (e.clientY - r.top) / r.height - .5;
    pointerFrame = requestAnimationFrame(() => { journey.style.setProperty('--ry', (x * 5).toFixed(2) + 'deg'); journey.style.setProperty('--rx', (-y * 3).toFixed(2) + 'deg'); });
  }, {passive:true});
  scene.addEventListener('pointerleave', () => { cancelAnimationFrame(pointerFrame); journey.style.setProperty('--rx','0deg'); journey.style.setProperty('--ry','0deg'); });
  if ('IntersectionObserver' in window) {
    const visibility = new IntersectionObserver(entries => { active = entries[0].isIntersecting; if (active) schedule(); }, {rootMargin:'100px'});
    visibility.observe(journey);
    if (!reduced.matches) {
      const reveals = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('reveal-in'); reveals.unobserve(entry.target); } }, {threshold:.25});
      document.querySelectorAll('.type-object,.craft-poster,.care-ribbon').forEach(e => reveals.observe(e));
      reduced.addEventListener('change', () => { if (reduced.matches) reveals.disconnect(); });
    }
  }
  configure();
  // Local, passive QA only. Metrics stay in this tab and are never transmitted.
  const metrics = {lcp:0,cls:0,longTasks:0};
  const publishMetrics = () => {
    if (new URLSearchParams(location.search).has('qa')) {
      root.dataset.qaMetrics = JSON.stringify(metrics);
      root.dataset.qaResources = JSON.stringify(performance.getEntriesByType('resource').map(e => ({name:e.name.split('/').pop(),duration:Math.round(e.duration),bytes:e.transferSize})));
    }
  };
  const observe = (type, cb) => { try { new PerformanceObserver(list => list.getEntries().forEach(cb)).observe({type,buffered:true}); } catch { /* Unsupported browser: no effect on page. */ } };
  observe('largest-contentful-paint', e => { metrics.lcp = Math.round(e.startTime); publishMetrics(); });
  observe('layout-shift', e => { if (!e.hadRecentInput) metrics.cls += e.value; publishMetrics(); });
  observe('longtask', e => { metrics.longTasks += 1; publishMetrics(); });
  window.addEventListener('load', publishMetrics, {once:true});
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { cancelAnimationFrame(frame); cancelAnimationFrame(pointerFrame); frame = 0; } });
  Object.defineProperty(window, 'formaPreviewMetrics', {value:metrics});
})();

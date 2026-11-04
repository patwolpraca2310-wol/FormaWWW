/* Progressive enhancements for common page components. No network calls. */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 900px)');
  const index = document.querySelector('.legal-index details');
  if (index && mobile.matches) index.open = false;
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#navigation');
  mobile.addEventListener('change', () => {
    if (menu && nav) { nav.classList.remove('open'); menu.setAttribute('aria-expanded','false'); }
  });
  if ('IntersectionObserver' in window && !reduce.matches) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('reveal-in'); observer.unobserve(entry.target);
      }
    }, {threshold:.2});
    document.querySelectorAll('.new-poster,.purpose-form,.principle-art,.thank-symbol').forEach(el => observer.observe(el));
    reduce.addEventListener('change', () => { if (reduce.matches) observer.disconnect(); });
  }
})();

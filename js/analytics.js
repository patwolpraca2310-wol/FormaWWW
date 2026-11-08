/* Basic consent mode: no Google resources exist in the page before opt-in.
   The Google tag runs in a separate, form-free document. Only allowlisted page
   metadata and outbound hostnames are passed to it; never DOM fields, link text,
   URL paths, queries, hashes or referrers. */
(() => {
  'use strict';
  const ID = 'G-095R4W93FR';
  const scriptURL = new URL(document.currentScript.src);
  const frameURL = new URL('../assets/analytics/frame.html', scriptURL);
  const validPaths = new Set(['/', '/oferta.html', '/o-formawww.html', '/kontakt.html',
    '/polityka-prywatnosci.html', '/regulamin.html', '/dziekujemy.html', '/404.html']);
  const canonical = document.querySelector('link[rel="canonical"]')?.href;
  let metadata = null;
  try {
    const url = new URL(canonical);
    if (url.origin === 'https://formawww.pl' && validPaths.has(url.pathname) && !url.search && !url.hash) {
      metadata = Object.freeze({page_location: url.href, page_title: document.title.slice(0, 180), page_referrer: ''});
    }
  } catch { /* Invalid metadata fails closed. */ }
  let frame = null;
  let enabled = false;
  let pageViewSent = false;
  window['ga-disable-' + ID] = true;

  function clearCookies() {
    const names = document.cookie.split(';').map(item => item.split('=')[0].trim())
      .filter(name => /^(_ga(?:_|$)|_gid$|_gat(?:_|$))/.test(name));
    const domains = new Set(['', location.hostname, '.' + location.hostname]);
    if (location.hostname === 'formawww.pl' || location.hostname.endsWith('.formawww.pl')) {
      domains.add('formawww.pl'); domains.add('.formawww.pl');
    }
    const paths = new Set(['/']);
    const parts = location.pathname.split('/').filter(Boolean);
    for (let i = 1; i <= parts.length; i++) {
      const path = '/' + parts.slice(0, i).join('/'); paths.add(path); paths.add(path + '/');
    }
    for (const name of names) for (const domain of domains) for (const path of paths) {
      document.cookie = name + '=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=' + path +
        (domain ? '; domain=' + domain : '') + '; SameSite=Lax';
    }
  }

  function stop() {
    enabled = false;
    window['ga-disable-' + ID] = true;
    // Stop synchronously, then destroy Google's timers/listeners and DOM context.
    try { frame?.contentWindow?.FormaWWWStopAnalytics?.(); } catch { /* Loading frame. */ }
    frame?.remove(); frame = null;
    clearCookies();
  }

  function start() {
    if (enabled || !metadata) return;
    enabled = true;
    window['ga-disable-' + ID] = false;
    frame = document.createElement('iframe');
    frame.hidden = true;
    frame.title = 'Analityka po wyrażeniu zgody';
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    frame.referrerPolicy = 'no-referrer';
    frame.src = frameURL.href;
    document.body.append(frame);
  }

  window.addEventListener('message', event => {
    if (!enabled || !frame || event.source !== frame.contentWindow || event.origin !== frameURL.origin) return;
    if (event.data?.type === 'formawww:analytics-started') { pageViewSent = true; return; }
    if (event.data?.type !== 'formawww:analytics-ready') return;
    frame.contentWindow.postMessage({type:'formawww:analytics-start', metadata, sendPageView:!pageViewSent}, frameURL.origin);
  });
  // One delegated listener; native navigation is never cancelled or delayed.
  // The tag's isolated document has no links, so automatic outbound measurement
  // cannot duplicate this explicit event. The synchronous bridge also handles
  // ordinary same-tab navigation without waiting for a postMessage round trip.
  document.addEventListener('click', event => {
    if (!enabled || !frame || event.defaultPrevented || !event.isTrusted || event.button !== 0) return;
    const link = event.target?.closest?.('a[href]');
    if (!link || link.closest('form') || link.hasAttribute('download')) return;
    let url;
    try { url = new URL(link.href); } catch { return; }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return;
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (host === location.hostname.toLowerCase() || host === 'formawww.pl' || host.endsWith('.formawww.pl')) return;
    try { frame.contentWindow.FormaWWWTrackOutbound?.(host); } catch { /* Analytics must not affect navigation. */ }
  });
  window.FormaWWWAnalytics = Object.freeze({start, stop});
})();

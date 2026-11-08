/* Technical Google-tag document. It contains no forms or user-entered content.
   One explicit page_view per document; only sanitized outbound domains, no conversion. */
(() => {
  'use strict';
  const ID = 'G-095R4W93FR';
  const allowed = new Set(['/', '/oferta.html', '/o-formawww.html', '/kontakt.html',
    '/polityka-prywatnosci.html', '/regulamin.html', '/dziekujemy.html', '/404.html']);
  let started = false;
  let stopped = false;
  let tag = null;
  window['ga-disable-' + ID] = true;
  window.dataLayer = [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  window.FormaWWWTrackOutbound = host => {
    if (!started || stopped || window['ga-disable-' + ID] || typeof host !== 'string' || host.length > 253) return;
    // Accept a DNS hostname only. Never accept a URL, path, query or link text.
    if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host) ||
        host === 'formawww.pl' || host.endsWith('.formawww.pl') || host === location.hostname) return;
    gtag('event', 'click', {send_to:ID, outbound:true, link_domain:host, transport_type:'beacon'});
  };
  const denied = {analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'};
  gtag('consent', 'default', denied);
  window.FormaWWWStopAnalytics = () => {
    stopped = true;
    window['ga-disable-' + ID] = true;
    gtag('consent', 'update', denied);
    tag?.remove();
    // The parent immediately removes this document. Do not queue any other hit.
  };
  window.addEventListener('message', event => {
    if (started || stopped || window.parent === window || event.source !== window.parent || event.origin !== location.origin) return;
    if (event.data?.type !== 'formawww:analytics-start') return;
    const input = event.data.metadata;
    let url;
    try { url = new URL(input?.page_location); } catch { return; }
    if (url.origin !== 'https://formawww.pl' || !allowed.has(url.pathname) || url.search || url.hash ||
        typeof input.page_title !== 'string' || input.page_title.length > 180) return;
    started = true;
    window['ga-disable-' + ID] = false;
    gtag('consent', 'update', {...denied, analytics_storage:'granted'});
    const metadata = {page_location:url.href, page_title:input.page_title, page_referrer:''};
    const cookies = {cookie_domain:location.hostname, cookie_path:'/', cookie_expires:5184000,
      cookie_update:false, cookie_flags:'SameSite=Lax;Secure'};
    // Global defaults precede Google's initialization as well as destination config.
    // This also covers automatic tag initialization from the remote stream settings.
    gtag('set', {...metadata, ...cookies, send_page_view:false, allow_google_signals:false,
      allow_ad_personalization_signals:false, allow_user_provided_data:false});
    gtag('js', new Date());
    gtag('config', ID, {...metadata, ...cookies, send_page_view:false, allow_google_signals:false,
      allow_ad_personalization_signals:false, allow_user_provided_data:false});
    if (event.data.sendPageView === true) gtag('event', 'page_view', {...metadata, send_to:ID});
    tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID + '&l=dataLayer';
    tag.referrerPolicy = 'no-referrer';
    tag.addEventListener('load', () => {
      if (!stopped) window.parent.postMessage({type:'formawww:analytics-started'}, location.origin);
    }, {once:true});
    document.head.append(tag);
  });
  if (window.parent !== window) window.parent.postMessage({type:'formawww:analytics-ready'}, location.origin);
})();

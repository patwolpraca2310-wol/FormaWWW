/* Versioned, first-party consent. A refusal has the same cost as an acceptance. */
(() => {
  'use strict';
  const KEY = 'formawww.consent';
  const VERSION = 1;
  const TTL = 180 * 24 * 60 * 60 * 1000;
  const banner = document.querySelector('[data-consent-banner]');
  const dialog = document.querySelector('[data-consent-dialog]');
  const checkbox = document.querySelector('[data-consent-analytics]');
  const status = document.querySelector('[data-consent-status]');
  if (!banner || !dialog || !checkbox) return;
  let current = null;
  let returnFocus = null;
  let memoryOnly = false;

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY));
      if (value?.version === VERSION && typeof value.analytics === 'boolean' &&
          Number.isFinite(value.updatedAt) && value.updatedAt <= Date.now() &&
          Number.isFinite(value.expiresAt) && value.expiresAt > Date.now() &&
          value.expiresAt - value.updatedAt <= TTL) return value;
    } catch { /* Storage unavailable, corrupt or absent: no consent. */ }
    return null;
  }
  function apply(value) {
    current = value;
    checkbox.checked = value?.analytics === true;
    banner.hidden = value !== null;
    if (value?.analytics === true) window.FormaWWWAnalytics?.start();
    else window.FormaWWWAnalytics?.stop();
  }
  function close() {
    if (!dialog.open) return;
    dialog.close();
    if (returnFocus?.isConnected && !returnFocus.closest('[hidden]')) returnFocus.focus({preventScroll:true});
    else document.querySelector('[data-consent-open]')?.focus({preventScroll:true});
  }
  function choose(analytics) {
    const now = Date.now();
    const value = {version:VERSION, analytics, updatedAt:now, expiresAt:now + TTL};
    let saved = true;
    try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { saved = false; }
    memoryOnly = !saved;
    apply(value);
    close();
    if (document.activeElement?.closest('[hidden]')) document.querySelector('main')?.focus({preventScroll:true});
    status.textContent = (analytics ? 'Analityka włączona za Twoją zgodą.' : 'Analityka wyłączona.') +
      (saved ? ' Decyzję możesz zmienić w ustawieniach cookies.' : ' Przeglądarka nie pozwala zapamiętać wyboru. Obowiązuje on tylko na tej stronie.');
  }
  function open(event) {
    event?.preventDefault();
    returnFocus = document.activeElement;
    checkbox.checked = current?.analytics === true;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('[data-consent-close]').focus();
  }
  document.querySelectorAll('[data-consent-open]').forEach(button => button.addEventListener('click', open));
  document.querySelectorAll('[data-consent-accept]').forEach(button => button.addEventListener('click', () => choose(true)));
  document.querySelectorAll('[data-consent-reject]').forEach(button => button.addEventListener('click', () => choose(false)));
  document.querySelector('[data-consent-save]').addEventListener('click', () => choose(checkbox.checked));
  document.querySelector('[data-consent-close]').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  const refresh = () => {
    if (memoryOnly && current?.expiresAt > Date.now()) return;
    apply(read());
  };
  window.addEventListener('storage', event => {
    if (event.key === KEY || event.key === null) { memoryOnly = false; apply(read()); }
  });
  window.addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });
  apply(read());
})();

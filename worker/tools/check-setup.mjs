// Read-only, offline configuration checks. Never reads secrets or calls Cloudflare.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export function checkSetup(config, html, mode = 'local') {
  const errors = [], pending = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const requireLater = (condition, message) => { if (!condition) pending.push(message); };
  const vars = config.vars || {};
  check(config.main === 'src/index.mjs', 'Niepoprawny plik wejściowy Workera.');
  check(config.workers_dev === true, 'Ta instrukcja wymaga endpointu workers.dev.');
  check(config.preview_urls === false, 'Automatyczne adresy preview powinny być wyłączone.');
  check(!config.routes?.length && !config.route, 'Nie kieruj serwisu GitHub Pages na ten Worker.');
  check(['true', 'false'].includes(vars.FORM_ENABLED), 'FORM_ENABLED musi być tekstem true lub false.');
  check(!Object.keys(vars).some(key => /secret|token|password|api.?key/i.test(key)), 'Sekret nie może być wpisany w vars.');
  const origins = String(vars.ALLOWED_ORIGINS || '').split(',').map(value => value.trim());
  check(origins.includes('https://formawww.pl'), 'Brak dozwolonego originu https://formawww.pl.');
  check(origins.every(value => {
    try { const url = new URL(value); return url.origin === value && url.protocol === 'https:' && !url.username && !url.password; }
    catch { return false; }
  }), 'Originy produkcyjne muszą być dokładnymi adresami HTTPS bez ścieżki i wildcard.');
  check(!Object.hasOwn(config,'send_email'), 'Usuń send_email: pocztę wysyła Resend API, bez bindingu EMAIL.');
  const databases = config.d1_databases || [];
  check(databases.length === 1 && databases[0].binding === 'CONTACT_DB' && databases[0].database_name === 'formawww-contact', 'Sprawdź binding CONTACT_DB.');
  requireLater(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(databases[0]?.database_id || ''), 'Wpisz rzeczywisty database_id D1.');
  check(vars.FROM_EMAIL === 'formularz@send.formawww.pl', 'Nadawca musi być formularz@send.formawww.pl; weryfikacja domeny odbywa się w Resend.');
  const limits = config.ratelimits || [];
  check(limits.length === 2, 'Wymagane dwa bindingi limitów.');
  for (const name of ['REQUEST_LIMITER', 'SITE_LIMITER']) {
    const item = limits.find(limit => limit.name === name);
    check(item && /^[1-9]\d*$/.test(item.namespace_id) && Number.isInteger(item.simple?.limit) && item.simple.limit > 0 && [10, 60].includes(item.simple?.period), 'Niepoprawny limiter: ' + name);
  }
  check(new Set(limits.map(item => item.namespace_id)).size === limits.length, 'Limity muszą mieć różne namespace_id.');
  check(config.triggers?.crons?.includes('17 * * * *'), 'Brak harmonogramu czyszczenia D1.');
  const endpoint = html.match(/data-contact-endpoint="([^"]+)"/)?.[1];
  check(Boolean(endpoint), 'Brak data-contact-endpoint w kontakt.html.');
  let endpointReady = false;
  try {
    const url = new URL(endpoint);
    endpointReady = url.protocol === 'https:' && url.pathname === '/contact' && !url.username && !url.password && !url.search && !url.hash && !/replace|placeholder|\.invalid$/i.test(url.hostname);
    check(endpointReady || endpoint === 'https://REPLACE-ME.invalid/contact', 'Endpoint musi być bezpiecznym HTTPS /contact lub uzgodnionym placeholderem.');
  } catch { check(false, 'Niepoprawny URL endpointu.'); }
  check(html.indexOf('js/contact-transport.js') >= 0 && html.indexOf('js/contact-transport.js') < html.indexOf('js/main.js'), 'Transport musi ładować się przed main.js.');
  if (mode !== 'local') errors.push(...pending);
  if (mode === 'activation') {
    check(vars.FORM_ENABLED === 'true', 'Aktywacja wymaga FORM_ENABLED=true.');
    check(endpointReady, 'Wpisz końcowy URL Workera w kontakt.html.');
  }
  return {errors, pending, endpointReady, enabled: vars.FORM_ENABLED === 'true'};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const flag = process.argv[2];
  if (process.argv.length > 3 || (flag && !['--deployment', '--activation'].includes(flag))) {
    console.error('Użycie: node tools/check-setup.mjs [--deployment|--activation]');
    process.exitCode = 1;
  } else {
    const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
    const html = readFileSync(new URL('../../kontakt.html', import.meta.url), 'utf8');
    const result = checkSetup(config, html, flag?.slice(2) || 'local');
    for (const item of result.errors) console.error('BŁĄD: ' + item);
    if (!flag) for (const item of result.pending) console.log('DO USTAWIENIA: ' + item);
    console.log(`Konfiguracja lokalna: ${result.errors.length ? 'BŁĘDY' : 'OK'}; wysyłka: ${result.enabled ? 'włączona w pliku' : 'wyłączona'}; endpoint: ${result.endpointReady ? 'ustawiony' : 'placeholder'}.`);
    console.log('RĘCZNIE: sprawdź sekrety ABUSE_SECRET i RESEND_API_KEY oraz weryfikację send.formawww.pl w Resend. Test NIE sprawdza konta, DNS ani dostarczalności.');
    process.exitCode = result.errors.length ? 1 : 0;
  }
}

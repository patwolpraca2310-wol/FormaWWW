// Explicit manual network diagnostic. No valid message payload, no email sending.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

export async function probeEndpoint(endpoint, {disabled = false, fetchImpl = fetch} = {}) {
  const url = new URL(endpoint);
  assert(url.protocol === 'https:' && url.pathname === '/contact' && !url.username && !url.password && !url.search && !url.hash && !/replace|placeholder|\.invalid$/i.test(url.hostname), 'Podaj prawdziwy adres HTTPS Workera zakończony /contact.');
  const origin = 'https://formawww.pl';
  const common = {redirect: 'error', credentials: 'omit'};
  const preflight = await fetchImpl(url.href, {...common, method: 'OPTIONS', signal: AbortSignal.timeout(15000), headers: {Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type'}});
  assert.equal(preflight.status, 204, 'Preflight powinien zwrócić 204.');
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin, 'Niepoprawny CORS.');
  // Empty JSON always fails required-field validation in the prepared Worker.
  const response = await fetchImpl(url.href, {...common, method: 'POST', signal: AbortSignal.timeout(20000), headers: {Origin: origin, 'Content-Type': 'application/json'}, body: '{}'});
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin, 'Brak CORS w odpowiedzi POST.');
  assert.equal(response.status, disabled ? 503 : 422, 'Nieoczekiwany status POST; sprawdź konfigurację, limity i logi.');
  const result = await response.json();
  assert.equal(result.accepted, false, 'Pusty formularz nie może być przyjęty.');
  assert.equal(result.code, disabled ? 'not_configured' : 'validation_failed', 'Niepoprawna odpowiedź backendu.');
  return {preflight: 204, post: response.status};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    assert(process.argv.length >= 3 && process.argv.length <= 4 && (!process.argv[3] || process.argv[3] === '--disabled'), 'Użycie: node tools/check-endpoint.mjs https://WORKER.workers.dev/contact [--disabled]');
    const result = await probeEndpoint(process.argv[2], {disabled: process.argv[3] === '--disabled'});
    console.log(`OK: OPTIONS ${result.preflight}, POST ${result.post}. Nie wysłano poprawnego zgłoszenia. To NIE jest test dostarczenia poczty.`);
  } catch (error) {
    console.error('Test endpointu nie przeszedł: ' + error.message);
    process.exitCode = 1;
  }
}

// Server-only transport. No SDK, dynamic API URL, logging, or automatic retry.
const API_URL = 'https://api.resend.com/emails';
const DEFINITE_REJECTIONS = new Set([400, 401, 403, 404, 405, 413, 422, 429]);

export class MailDeliveryError extends Error {
  constructor(definite = false) {
    super(definite ? 'delivery_failed' : 'delivery_unknown');
    this.definite = definite;
  }
}

export function validResendKey(value) {
  return typeof value === 'string' && /^re_[A-Za-z0-9_-]{10,}$/.test(value) &&
    !/replace|placeholder|xxxxxxxx/i.test(value);
}

export async function sendViaResend(mail, apiKey, fingerprint, {fetchImpl = fetch, timeoutMs = 15000} = {}) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new MailDeliveryError());
    }, timeoutMs);
  });
  try {
    return await Promise.race([timeout, (async () => {
      const response = await fetchImpl(API_URL, {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: {
          Authorization: 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
          'Idempotency-Key': 'formawww-' + fingerprint,
        },
        body: JSON.stringify(mail),
      });
      if (!response.ok) {
        // Never expose/log provider error bodies, which may contain account details.
        void response.body?.cancel().catch(() => {});
        throw new MailDeliveryError(DEFINITE_REJECTIONS.has(response.status));
      }
      const result = await response.json();
      if (!result || typeof result.id !== 'string' || !result.id.trim()) throw new MailDeliveryError();
      return {messageId: result.id};
    })()]);
  } catch (error) {
    // Network errors, 408/409/5xx, malformed responses and aborts are ambiguous.
    throw error instanceof MailDeliveryError ? error : new MailDeliveryError();
  } finally {
    clearTimeout(timer);
  }
}

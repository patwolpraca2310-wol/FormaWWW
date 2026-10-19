// Server-only transport. Diagnostics contain only fixed labels and HTTP status.
// Never log inputs, provider bodies, headers, message IDs or caught exceptions.
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
  let stage = 'request', httpStatus, failureType = 'fetch_error', finished = false;
  const diagnostic = (event, type) => {
    if (finished) return;
    const record = {event: 'resend_transport', outcome: event, stage};
    if (type) record.type = type;
    if (Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599) record.http_status = httpStatus;
    // Logging must never change delivery, retries or the D1 state machine.
    try { console.info(JSON.stringify(record)); } catch {}
  };
  diagnostic('started');
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new MailDeliveryError());
      controller.abort();
    }, timeoutMs);
  });
  try {
    return await Promise.race([timeout, (async () => {
      const response = await fetchImpl(API_URL, {
        // Workers rejects redirect:'error' before sending. Never follow redirects:
        // keep the API key on this fixed origin and reject 3xx via !response.ok.
        method: 'POST', redirect: 'manual', signal: controller.signal,
        headers: {
          Authorization: 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
          'Idempotency-Key': 'formawww-' + fingerprint,
        },
        body: JSON.stringify(mail),
      });
      // A timed-out request may settle later. Do not emit a late success log.
      if (finished) throw new MailDeliveryError();
      stage = 'response';
      httpStatus = response.status;
      diagnostic('http_response');
      if (!response.ok) {
        // Never expose/log provider error bodies, which may contain account details.
        void response.body?.cancel().catch(() => {});
        failureType = 'http_error';
        throw new MailDeliveryError(DEFINITE_REJECTIONS.has(response.status));
      }
      stage = 'response_body';
      let result;
      try { result = await response.json(); }
      catch (error) {
        failureType = error instanceof SyntaxError ? 'invalid_json' : 'response_body_error';
        throw new MailDeliveryError();
      }
      if (finished) throw new MailDeliveryError();
      stage = 'response_validation';
      if (!result || typeof result.id !== 'string' || !result.id.trim()) {
        failureType = 'missing_message_id';
        throw new MailDeliveryError();
      }
      diagnostic('accepted');
      return {messageId: result.id};
    })()]);
  } catch (error) {
    diagnostic('failed', controller.signal.aborted ? 'timeout' : failureType);
    // Network errors, 408/409/5xx, malformed responses and aborts are ambiguous.
    throw error instanceof MailDeliveryError ? error : new MailDeliveryError();
  } finally {
    finished = true;
    clearTimeout(timer);
  }
}

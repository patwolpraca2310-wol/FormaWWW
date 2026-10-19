// No runtime dependencies. Cloudflare supplies D1/rate limits; Resend sends email.
import {MailDeliveryError, sendViaResend, validResendKey} from './resend.mjs';
export const RECIPIENT = 'patryk.woloszyn@formawww.pl';
export const MAX_BODY_BYTES = 32768;
const RETENTION_MS = 24 * 60 * 60 * 1000;
const SERVICES = Object.freeze({
  'new-website': 'Nowa strona internetowa', redesign: 'Modernizacja strony',
  maintenance: 'Opieka i rozwój', seo: 'SEO i optymalizacja',
  content: 'Treści i blog', unsure: 'Nie wiem jeszcze czego potrzebuję',
});
const LIMITS = {service: 32, website: 2048, name: 100, company: 160, email: 254, phone: 50, message: 5000, fax_number: 100};
const EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/;
const UNSAFE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/u;

export class HttpError extends Error {
  constructor(status, code, errors) { super(code); this.status=status; this.code=code; this.errors=errors; }
}

export function validate(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new HttpError(400,'invalid_json');
  if (Object.keys(payload).some(key => !Object.hasOwn(LIMITS,key))) throw new HttpError(400,'unexpected_fields');
  const data={}, errors={};
  for (const [key,max] of Object.entries(LIMITS)) {
    const value=Object.hasOwn(payload,key) ? payload[key] : '';
    if (typeof value !== 'string') throw new HttpError(400,'invalid_field_type');
    data[key]=value.trim().normalize('NFC');
    if (value.length>max || UNSAFE.test(value) || (key!=='message' && /[\r\n\t]/.test(value))) errors[key]='Sprawdź treść i długość tego pola.';
  }
  if (data.fax_number || errors.fax_number) throw new HttpError(400,'spam_rejected');
  for (const key of ['service','name','company','email','message']) if (!data[key]) errors[key]='Uzupełnij wymagane pole.';
  if (!Object.hasOwn(SERVICES,data.service)) errors.service='Wybierz usługę z listy.';
  if (!/\p{L}/u.test(data.name)) errors.name='Podaj poprawne imię.';
  if (!EMAIL_PATTERN.test(data.email) || data.email.includes('..')) errors.email='Podaj poprawny adres e-mail.';
  if (data.message.length<10) errors.message='Napisz co najmniej 10 znaków o swoim zgłoszeniu.';
  if (data.website) {
    try {
      const url=new URL(data.website);
      if (!['https:','http:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error();
    } catch { errors.website='Podaj pełny adres http:// lub https://, bez loginu i hasła.'; }
  }
  if (data.phone && (!/^[+()\d .-]+$/.test(data.phone) || data.phone.replace(/\D/g,'').length<7 || data.phone.replace(/\D/g,'').length>20)) errors.phone='Sprawdź numer telefonu.';
  if (Object.keys(errors).length) throw new HttpError(422,'validation_failed',errors);
  return data;
}

function allowedOrigin(request, env) {
  const origin=request.headers.get('Origin');
  const allowed=String(env.ALLOWED_ORIGINS || '').split(',').map(s=>s.trim()).filter(Boolean);
  return origin && origin !== 'null' && allowed.includes(origin) ? origin : null;
}

function reply(status, data, origin, extra={}) {
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin',...extra};
  if (origin) {
    headers['Access-Control-Allow-Origin']=origin;
    headers['Access-Control-Expose-Headers']='Retry-After';
  }
  return new Response(status===204 ? null : JSON.stringify(data),{status,headers});
}

async function readBody(request, timeoutMs) {
  if (!request.body) throw new HttpError(400,'invalid_json');
  const length=request.headers.get('Content-Length');
  if (length && (!/^\d+$/.test(length) || Number(length)>MAX_BODY_BYTES)) throw new HttpError(413,'payload_too_large');
  const reader=request.body.getReader();
  let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new HttpError(408,'request_timeout')),timeoutMs);});
  try {
    const raw=await Promise.race([timeout,(async()=>{
      const decoder=new TextDecoder('utf-8',{fatal:true});
      let total=0, text='';
      while (true) {
        const {value,done}=await reader.read();
        if (done) break;
        total+=value.byteLength;
        if (total>MAX_BODY_BYTES) throw new HttpError(413,'payload_too_large');
        text+=decoder.decode(value,{stream:true});
      }
      return text+decoder.decode();
    })()]);
    try {return JSON.parse(raw);} catch {throw new HttpError(400,'invalid_json');}
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400,'invalid_json');
  } finally {clearTimeout(timer); void reader.cancel().catch(()=>{});}
}

async function digest(secret, value) {
  const encoder=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=await crypto.subtle.sign('HMAC',key,encoder.encode(value));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}

function configured(env) {
  const validSecret = typeof env.ABUSE_SECRET === 'string' &&
    env.ABUSE_SECRET.length >= 32 && !/replace|placeholder/i.test(env.ABUSE_SECRET);
  const validSender = env.FROM_EMAIL === 'formularz@send.formawww.pl';
  const bindingsPresent = typeof env.CONTACT_DB?.prepare === 'function' &&
    typeof env.REQUEST_LIMITER?.limit === 'function' &&
    typeof env.SITE_LIMITER?.limit === 'function';
  return env.FORM_ENABLED === 'true' && validSecret && validSender &&
    validResendKey(env.RESEND_API_KEY) && bindingsPresent;
}

// Resend REST fields; receiving mail and the existing MX records stay with OVH.
function buildEmail(data, sender) {
  return {
    to: [RECIPIENT],
    from: `FormaWWW <${sender}>`,
    reply_to: data.email,
    subject: 'FormaWWW: ' + SERVICES[data.service],
    text: [
      `Usługa: ${SERVICES[data.service]}`,
      `Imię: ${data.name}`,
      `Firma: ${data.company}`,
      `E-mail: ${data.email}`,
      `Telefon: ${data.phone || 'Nie podano'}`,
      `Obecna strona: ${data.website || 'Nie podano'}`,
      '', 'Wiadomość:', data.message,
    ].join('\n'),
  };
}

export const CLAIM_SQL = `INSERT INTO contact_submissions (fingerprint,status,owner,expires_at)
VALUES (?1,'pending',?2,?3)
ON CONFLICT(fingerprint) DO UPDATE SET status='pending',owner=excluded.owner,expires_at=excluded.expires_at
WHERE contact_submissions.expires_at<=?4 OR contact_submissions.status='failed'
RETURNING fingerprint`;

// The options below are dependency injection for offline tests, never request/env input.
export function createWorker({emailTimeoutMs=10000,bodyTimeoutMs=5000,now=()=>Date.now(),fetchImpl=fetch}={}) {
  return {
    async fetch(request,env,ctx) {
      let origin=null;
      try {
        if (new URL(request.url).pathname!=='/contact') return reply(404,{accepted:false,code:'not_found'},null);
        origin=allowedOrigin(request,env);
        if (!origin) return reply(403,{accepted:false,code:'origin_rejected'},null);
        if (request.method==='OPTIONS') {
          const headers=(request.headers.get('Access-Control-Request-Headers') || '').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
          if (request.headers.get('Access-Control-Request-Method')!=='POST' || headers.some(h=>h!=='content-type')) throw new HttpError(403,'preflight_rejected');
          return reply(204,null,origin,{'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'});
        }
        if (request.method!=='POST') return reply(405,{accepted:false,code:'method_not_allowed'},origin,{Allow:'POST, OPTIONS'});
        if (!configured(env)) throw new HttpError(503,'not_configured');
        if ((request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase()!=='application/json') throw new HttpError(415,'unsupported_media_type');
        if (request.headers.has('Content-Encoding')) throw new HttpError(415,'unsupported_encoding');
        // CF sets this header on production requests; never use user-supplied forwarded-for.
        const ip=request.headers.get('CF-Connecting-IP');
        if (!ip) throw new HttpError(503,'client_ip_unavailable');
        const ipKey=await digest(env.ABUSE_SECRET,'ip:'+ip);
        const siteLimit=await env.SITE_LIMITER.limit({key:'contact'});
        const ipLimit=await env.REQUEST_LIMITER.limit({key:'ip:'+ipKey});
        if (!siteLimit.success || !ipLimit.success) throw new HttpError(429,'rate_limited');
        const data=validate(await readBody(request,bodyTimeoutMs));
        const emailKey=await digest(env.ABUSE_SECRET,'email:'+data.email.toLowerCase());
        if (!(await env.REQUEST_LIMITER.limit({key:'email:'+emailKey})).success) throw new HttpError(429,'rate_limited');
        // Canonical field order comes from validate(), independent of input JSON order.
        const fingerprint=await digest(env.ABUSE_SECRET,'submission:'+JSON.stringify(data));
        const owner=crypto.randomUUID();
        const claimed=await env.CONTACT_DB.prepare(CLAIM_SQL).bind(fingerprint,owner,now()+RETENTION_MS,now()).first();
        if (!claimed) {
          const prior=await env.CONTACT_DB.prepare('SELECT status FROM contact_submissions WHERE fingerprint=?').bind(fingerprint).first();
          if (prior?.status==='sent') return reply(200,{accepted:true},origin);
          throw new HttpError(409,prior?.status==='uncertain' ? 'delivery_unknown' : 'pending');
        }
        const setStatus=async status=>{
          const result=await env.CONTACT_DB.prepare('UPDATE contact_submissions SET status=? WHERE fingerprint=? AND owner=?').bind(status,fingerprint,owner).run();
          if (!result.success || result.meta.changes!==1) throw new Error('state_update_failed');
        };
        const deliver=(async()=>{
          let sent;
          try {
            sent=await sendViaResend(buildEmail(data, env.FROM_EMAIL), env.RESEND_API_KEY, fingerprint, {fetchImpl});
          } catch (error) {
            const definite = error instanceof MailDeliveryError && error.definite;
            await setStatus(definite ? 'failed' : 'uncertain');
            return {status:502,code:definite ? 'delivery_failed' : 'delivery_unknown'};
          }
          if (!sent || typeof sent.messageId!=='string' || !sent.messageId) {
            await setStatus('uncertain'); return {status:502,code:'delivery_unknown'};
          }
          await setStatus('sent');
          return {status:200,accepted:true};
        })().catch(()=>({status:503,code:'delivery_unknown'}));
        // Continue recording late acceptance after the HTTP timeout; never send twice automatically.
        ctx.waitUntil(deliver);
        let timer;
        const timedOut=new Promise(resolve=>{timer=setTimeout(()=>resolve({status:504,code:'delivery_unknown'}),emailTimeoutMs);});
        let outcome;
        try {outcome=await Promise.race([deliver,timedOut]);} finally {clearTimeout(timer);}
        return reply(outcome.status,{accepted:outcome.accepted===true,...(outcome.code ? {code:outcome.code} : {})},origin);
      } catch (error) {
        const status=error instanceof HttpError ? error.status : 500;
        return reply(status,{accepted:false,code:error instanceof HttpError ? error.code : 'server_error',...(error instanceof HttpError && error.errors ? {errors:error.errors} : {})},origin,status===429 ? {'Retry-After':'60'} : {});
      }
    },
    async scheduled(_event,env,ctx) {
      ctx.waitUntil(env.CONTACT_DB.prepare('DELETE FROM contact_submissions WHERE expires_at<=?').bind(now()).run());
    },
  };
}
export default createWorker();

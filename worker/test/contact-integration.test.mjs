import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createWorker} from '../src/index.mjs';

// Actual controller -> actual transport -> actual Worker -> in-memory SQLite.
// All network access is replaced; this suite cannot send production mail.
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const markup = read('../../kontakt.html');
const values = {service:'new-website', website:'', name:'Anna', company:'',
  email:'anna@example.com', phone:'', message:'Proszę o kontakt w sprawie nowej strony.', fax_number:''};
const origin = 'https://formawww.pl';
const endpoint = 'https://formawww-contact.kontakt-patrykwoloszyn.workers.dev/contact';

function backend() {
  const db = new DatabaseSync(':memory:');
  db.exec(read('../schema.sql'));
  const deliveries = [], requests = [], limitKeys = [], tasks = [];
  const worker = createWorker({fetchImpl:async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    deliveries.push(JSON.parse(options.body));
    return Response.json({id:'offline-integration-test'});
  }});
  const env = {FORM_ENABLED:'true', ALLOWED_ORIGINS:origin, FROM_EMAIL:'formularz@send.formawww.pl',
    ABUSE_SECRET:'offline-integration-secret-not-for-production', RESEND_API_KEY:'re_OFFLINE_TEST_NOT_A_REAL_KEY',
    REQUEST_LIMITER:{limit:async ({key}) => {limitKeys.push(key); return {success:true};}},
    SITE_LIMITER:{limit:async () => ({success:true})},
    CONTACT_DB:{prepare(sql) {return {bind(...args) {return {
      first:async () => db.prepare(sql).get(...args) || null,
      run:async () => ({success:true,meta:{changes:Number(db.prepare(sql).run(...args).changes)}})
    };}};}}
  };
  const fetch = async (url, options) => {
    assert.equal(url, endpoint);
    const response = await worker.fetch(new Request(url, {...options,
      headers:{...options.headers, Origin:origin, 'CF-Connecting-IP':'192.0.2.1'}}), env,
      {waitUntil:promise => tasks.push(promise)});
    requests.push({payload:JSON.parse(options.body), status:response.status});
    return response;
  };
  return {db, deliveries, requests, limitKeys, fetch};
}

function frontend(server, overrides={}) {
  const element = () => ({hidden:true, attrs:{}, children:[], dataset:{}, events:{}, textContent:'',
    setAttribute(k,v){this.attrs[k]=v;}, removeAttribute(k){delete this.attrs[k];}, getAttribute(k){return this.attrs[k]??null;},
    addEventListener(k,v){this.events[k]=v;}, focus(){this.focused=true;}, append(x){this.children.push(x);},
    replaceChildren(){this.children=[];}, get childElementCount(){return this.children.length;}});
  const hints = new Map(), redirects = [];
  const fields = Object.fromEntries(Object.entries({...values,...overrides}).map(([name,value]) => {
    const tag = markup.match(new RegExp('<(?:input|select|textarea)\\b[^>]*\\bname="'+name+'"[^>]*>'))?.[0];
    assert.ok(tag, 'Field exists in actual kontakt.html: '+name);
    const id = tag.match(/\bid="([^"]+)"/)[1];
    const field = Object.assign(element(), {id,name,value,required:/\srequired(?:\s|>|=)/.test(tag),
      maxLength:Number(tag.match(/maxlength="(\d+)"/)?.[1]||-1),
      minLength:Number(tag.match(/minlength="(\d+)"/)?.[1]||-1), validity:{typeMismatch:false}});
    hints.set(id+'-error',element());
    return [name,field];
  }));
  const button=element(), label=element(), status=element(), summary=element(), list=element(), note=element();
  const nodes={'[data-contact-submit]':button,'[data-submit-label]':label,'[data-form-status]':status,
    '[data-error-summary]':summary,'[data-error-list]':list};
  const form=Object.assign(element(), {dataset:{contactEndpoint:endpoint},elements:{namedItem:name=>fields[name]},querySelector:s=>nodes[s]});
  const document={querySelector:s=>s==='[data-contact-form]'?form:null,
    getElementById:id=>id==='ct-preview-note'?note:hints.get(id), createElement:element};
  const window={setTimeout,clearTimeout,location:{assign:url=>redirects.push(url)}};
  const context=vm.createContext({window,document,URL,AbortController,fetch:server.fetch});
  vm.runInContext(read('../../js/contact-transport.js'),context);
  vm.runInContext(read('../../js/contact-form.js'),context);
  return {fields,redirects,summary,button,transport:window.FormaWWWContactTransport,
    submit:()=>form.events.submit({preventDefault(){}})};
}

for (const company of ['', '   ', 'Firma testowa']) test('full offline form accepts company '+JSON.stringify(company), async t => {
  const server=backend();t.after(()=>server.db.close());
  const client=frontend(server,{company});
  assert.equal(client.fields.company.required,false);
  await client.submit();
  assert.equal(server.requests[0].status,200);
  assert.equal(server.requests[0].payload.company,company.trim());
  assert.equal(server.deliveries.length,1);
  assert.equal(server.deliveries[0].to[0],'patryk.woloszyn@formawww.pl');
  assert.equal(server.deliveries[0].reply_to,values.email);
  assert.equal(server.db.prepare('SELECT status FROM contact_submissions').get().status,'sent');
  assert.deepEqual(client.redirects,['dziekujemy.html']);
  assert.ok(server.limitKeys.some(key=>key.startsWith('ip:')));
  assert.ok(server.limitKeys.some(key=>key.startsWith('email:')));
});

for (const field of ['service','name','email','message']) {
  test('frontend still requires '+field+' with blank company', async t => {
    const server=backend();t.after(()=>server.db.close());const client=frontend(server,{[field]:''});
    await client.submit();assert.equal(server.requests.length,0);assert.equal(server.deliveries.length,0);
    assert.equal(client.fields[field].getAttribute('aria-invalid'),'true');
    assert.equal(client.fields.company.getAttribute('aria-invalid'),null);
    assert.deepEqual(client.redirects,[]);
  });
  test('Worker still requires '+field+' when frontend validation is bypassed', async t => {
    const server=backend();t.after(()=>server.db.close());const client=frontend(server);
    const result=await client.transport.submit({...values,[field]:''},{endpoint});
    assert.equal(server.requests[0].status,422);assert.equal(result.mode,'invalid');
    assert.ok(result.errors[field]);assert.equal(result.errors.company,undefined);
    assert.equal(server.deliveries.length,0);
  });
}

test('blank company remains deduplicated across separate form documents', async t => {
  const server=backend();t.after(()=>server.db.close());
  const first=frontend(server,{company:'   '});await first.submit();
  const second=frontend(server,{company:''});await second.submit();
  assert.deepEqual(server.requests.map(x=>x.status),[200,200]);
  assert.equal(server.deliveries.length,1);
  assert.deepEqual(first.redirects,['dziekujemy.html']);assert.deepEqual(second.redirects,['dziekujemy.html']);
});

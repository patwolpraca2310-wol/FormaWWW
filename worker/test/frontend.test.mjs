import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const transportSource=readFileSync(new URL('../../js/contact-transport.js',import.meta.url),'utf8');
const mainSource=readFileSync(new URL('../../js/main.js',import.meta.url),'utf8');
const endpoint='https://formawww-contact.example.workers.dev/contact';
function transport(fetch) {
  const window={setTimeout,clearTimeout};
  vm.runInNewContext(transportSource,{window,URL,AbortController,fetch});
  return window.FormaWWWContactTransport;
}
test('placeholder is never requested',async()=>{
  let calls=0;const t=transport(()=>{calls++;});
  await assert.rejects(t.submit({},{endpoint:'https://REPLACE-ME.invalid/contact'}),e=>e.code==='not_configured');assert.equal(calls,0);
});
test('transport uses cross-origin JSON without credentials and trusts only explicit acceptance',async()=>{
  const t=transport(async(url,init)=>{
    assert.equal(url,endpoint);assert.equal(init.credentials,'omit');assert.equal(init.mode,'cors');assert.equal(init.redirect,'error');
    assert.deepEqual(JSON.parse(init.body),{message:'test'});return Response.json({accepted:true});
  });
  assert.equal((await t.submit({message:'test'},{endpoint})).mode,'accepted');
});
test('configuration refuses insecure, credential-bearing and query endpoints',()=>{
  const t=transport(()=>{});
  for (const value of ['', '/contact','http://example.com/contact','https://u:p@example.com/contact','https://example.com/contact?secret=x','https://example.com/wrong']) assert.equal(t.isConfigured(value),false);
  assert.equal(t.isConfigured(endpoint),true);
});
for (const [status,body,code] of [[429,{code:'rate_limited'},'rate_limited'],[500,{},'server_error'],[502,{code:'delivery_failed'},'delivery_failed'],[504,{code:'delivery_unknown'},'delivery_unknown'],[409,{code:'pending'},'pending'],[200,{accepted:false},'invalid_request'],[503,{code:'not_configured'},'not_configured']]) {
  test('transport HTTP '+status+' '+code,async()=>{
    const t=transport(async()=>Response.json(body,{status}));await assert.rejects(t.submit({},{endpoint}),e=>e.code===code);
  });
}
test('field errors are passed to the existing accessible summary',async()=>{
  const t=transport(async()=>Response.json({errors:{email:'Popraw adres'}},{status:422}));
  assert.equal((await t.submit({},{endpoint})).mode,'invalid');
});
test('non-JSON error response and network failure remain errors',async()=>{
  await assert.rejects(transport(async()=>new Response('HTML failure',{status:500})).submit({},{endpoint}),e=>e.code==='server_error');
  await assert.rejects(transport(async()=>{throw new TypeError('offline');}).submit({},{endpoint}),e=>e.code==='network_error');
});
test('client timeout aborts request',async()=>{
  const t=transport((_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Timeout','AbortError')))));
  await assert.rejects(t.submit({},{endpoint,timeoutMs:5}),e=>e.code==='request_timeout');
});

// A small DOM fixture exercises the unchanged form controller without a browser dependency.
function controller(send) {
  const listeners=new Map(),hints=new Map(),redirects=[];
  const el=()=>({hidden:true,textContent:'',attrs:{},children:[],dataset:{},
    setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},getAttribute(k){return this.attrs[k]??null;},
    addEventListener(k,v){(this.events??={})[k]=v;},focus(){this.focused=true;},append(x){this.children.push(x);},replaceChildren(){this.children=[];},get childElementCount(){return this.children.length;}});
  const values={service:'new-website',website:'',name:'Anna',company:'Firma',email:'anna@example.com',phone:'',message:'Proszę o kontakt w sprawie strony.',fax_number:''};
  const fields=Object.fromEntries(Object.entries(values).map(([name,value])=>{
    const field=Object.assign(el(),{id:'ct-'+name,name,value,required:!['phone','website','fax_number'].includes(name),maxLength:5000,minLength:name==='message'?10:0,validity:{typeMismatch:false}});
    hints.set(field.id+'-error',el());return [name,field];
  }));
  const button=el(),label=el(),status=el(),summary=el(),list=el(),note=el();
  const elements={'[data-contact-submit]':button,'[data-submit-label]':label,'[data-form-status]':status,'[data-error-summary]':summary,'[data-error-list]':list};
  const form=Object.assign(el(),{dataset:{contactEndpoint:endpoint},elements:{namedItem:name=>fields[name]},querySelector:s=>elements[s],addEventListener:(key,fn)=>listeners.set(key,fn)});
  const window={matchMedia:()=>({matches:false}),location:{assign:url=>redirects.push(url)},FormaWWWContactTransport:{submit:send,isConfigured:()=>true,errorMessage:e=>'Błąd: '+e.code}};
  const document={querySelector:s=>s==='[data-contact-form]'?form:null,getElementById:id=>id==='ct-preview-note'?note:hints.get(id),createElement:el};
  vm.runInNewContext(mainSource,{window,document,URL});
  return {fields,button,status,summary,list,redirects,submit:()=>listeners.get('submit')({preventDefault(){}}),values:()=>Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.value]))};
}
test('controller blocks double submit and redirects only after confirmed acceptance',async()=>{
  let resolve,calls=0;const c=controller(()=>{calls++;return new Promise(r=>{resolve=r;});});
  const first=c.submit();assert.equal(c.button.disabled,true);await c.submit();assert.equal(calls,1);assert.deepEqual(c.redirects,[]);
  resolve({mode:'accepted'});await first;assert.deepEqual(c.redirects,['dziekujemy.html']);assert.equal(c.button.disabled,true);
});
test('controller preserves every field and re-enables retry on network/server/timeout errors',async()=>{
  for (const code of ['network_error','server_error','request_timeout','rate_limited','delivery_unknown']) {
    const c=controller(async()=>{throw {code};});const before=c.values();await c.submit();
    assert.deepEqual(c.values(),before);assert.deepEqual(c.redirects,[]);assert.equal(c.button.disabled,false);assert.equal(c.status.focused,true);
  }
});
test('controller renders server validation errors with focus and no data loss',async()=>{
  const c=controller(async()=>({mode:'invalid',errors:{email:'Popraw adres'}}));const before=c.values();await c.submit();
  assert.equal(c.fields.email.getAttribute('aria-invalid'),'true');assert.equal(c.summary.focused,true);assert.equal(c.list.childElementCount,1);assert.deepEqual(c.values(),before);assert.deepEqual(c.redirects,[]);
});
test('short message and honeypot are stopped by the frontend',async()=>{
  let calls=0;const c=controller(async()=>{calls++;});c.fields.message.value='abc';await c.submit();assert.equal(calls,0);
  c.fields.message.value='Prawidłowa wiadomość';c.fields.fax_number.value='spam';await c.submit();assert.equal(calls,0);
});

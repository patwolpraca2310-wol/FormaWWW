import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createWorker,RECIPIENT,MAX_BODY_BYTES} from '../src/index.mjs';

const valid={service:'new-website',website:'https://example.com',name:'Anna',company:'Firma testowa',email:'anna@example.com',phone:'+48 123 456 789',message:'Test formularza kontaktowego. Proszę o kontakt.',fax_number:''};
const origin='https://formawww.pl';
function fixture(options={}) {
  const db=new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
  const calls=[], tasks=[], keys=[];
  const provider={fetch:async(_url,init)=>{calls.push(JSON.parse(init.body));return Response.json({id:'offline-only'});}};
  const env={FORM_ENABLED:'true',ALLOWED_ORIGINS:origin,FROM_EMAIL:'formularz@send.formawww.pl',ABUSE_SECRET:'offline-test-secret-not-for-production-123456',RESEND_API_KEY:'re_OFFLINE_TEST_NOT_A_REAL_KEY',
    REQUEST_LIMITER:{limit:async ({key})=>{keys.push(key);return {success:true};}},
    SITE_LIMITER:{limit:async()=>({success:true})},
    CONTACT_DB:{prepare(sql) {return {bind(...values) {return {
      first:async()=>db.prepare(sql).get(...values) || null,
      run:async()=>({success:true,meta:{changes:Number(db.prepare(sql).run(...values).changes)}}),
    };}};}},
  };
  const worker=createWorker({...options,fetchImpl:(...args)=>provider.fetch(...args)}),ctx={waitUntil:p=>tasks.push(p)};
  const request=(body=valid,init={})=>new Request('https://form.example/contact',{
    method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...init.headers},
    body:typeof body==='string' ? body : JSON.stringify(body),...Object.fromEntries(Object.entries(init).filter(([key])=>key!=='headers')),
  });
  return {db,env,provider,calls,tasks,keys,worker,ctx,request,send:(body,init)=>worker.fetch(request(body,init),env,ctx)};
}

test('valid request -> fixed recipient, safe reply-to, plain text, accepted only after email',async()=>{
  const f=fixture();const response=await f.send();
  assert.equal(response.status,200);assert.equal((await response.json()).accepted,true);
  assert.equal(f.calls.length,1);assert.deepEqual(f.calls[0].to,[RECIPIENT]);assert.equal(f.calls[0].reply_to,valid.email);
  assert.equal(f.calls[0].from,'FormaWWW <formularz@send.formawww.pl>');assert.equal(f.calls[0].html,undefined);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
  const rows=f.db.prepare('SELECT * FROM contact_submissions').all();
  assert.equal(rows[0].status,'sent');assert.equal(rows[0].fingerprint.length,64);
  assert.ok(!JSON.stringify(rows).includes(valid.email));assert.ok(!JSON.stringify(f.keys).includes('192.0.2.1'));
});
test('optional phone and URL can be empty',async()=>assert.equal((await fixture().send({...valid,website:'',phone:''})).status,200));
test('same normalized content and reordered keys are not sent twice',async()=>{
  const f=fixture();await f.send();
  const again=Object.fromEntries(Object.entries({...valid,name:' Anna '}).reverse());
  assert.equal((await f.send(again)).status,200);assert.equal(f.calls.length,1);
});
test('concurrent submissions acquire only one durable claim',async()=>{
  const f=fixture();let release;
  f.provider.fetch=(_url,init)=>{f.calls.push(JSON.parse(init.body));return new Promise(resolve=>{release=resolve;});};
  const first=f.send();while (!release) await new Promise(resolve=>setImmediate(resolve));
  const second=await f.send();assert.equal(second.status,409);assert.equal((await second.json()).code,'pending');
  release(Response.json({id:'accepted'}));assert.equal((await first).status,200);assert.equal(f.calls.length,1);
});
test('timeout retains claim and late email completion is recorded',async()=>{
  const f=fixture({emailTimeoutMs:5});let release;
  f.provider.fetch=(_url,init)=>{f.calls.push(JSON.parse(init.body));return new Promise(resolve=>{release=resolve;});};
  const response=await f.send();assert.equal(response.status,504);
  assert.equal((await f.send()).status,409);assert.equal(f.calls.length,1);
  release(Response.json({id:'late'}));await Promise.all(f.tasks);
  assert.equal((await f.send()).status,200);assert.equal(f.calls.length,1);
});
test('definite delivery failure preserves retry possibility',async()=>{
  const f=fixture();f.provider.fetch=async()=>Response.json({message:'private details'},{status:422});
  const response=await f.send();assert.equal(response.status,502);assert.equal((await response.json()).code,'delivery_failed');
  assert.equal(f.db.prepare('SELECT status FROM contact_submissions').get().status,'failed');
  f.provider.fetch=async()=>Response.json({id:'retry'});assert.equal((await f.send()).status,200);
});
test('ambiguous provider error blocks automatic resending',async()=>{
  const f=fixture();let calls=0;f.provider.fetch=async()=>{calls++;throw new Error('Unknown network outcome');};
  assert.equal((await f.send()).status,502);assert.equal((await f.send()).status,409);assert.equal(calls,1);
});
test('missing Resend id is not a success',async()=>{
  const f=fixture();f.provider.fetch=async()=>Response.json({});assert.equal((await f.send()).status,502);
});
test('D1 failure before send fails closed',async()=>{
  const f=fixture();f.env.CONTACT_DB.prepare=()=>{throw Error('db unavailable');};
  assert.equal((await f.send()).status,500);assert.equal(f.calls.length,0);
});
test('D1 failure after provider acceptance does not trigger another email',async()=>{
  const f=fixture();const prepare=f.env.CONTACT_DB.prepare;
  f.env.CONTACT_DB.prepare=sql=>{if (sql.startsWith('UPDATE')) throw Error('db offline');return prepare(sql);};
  assert.equal((await f.send()).status,503);assert.equal((await f.send()).status,409);assert.equal(f.calls.length,1);
});
test('deduplication expires after 24h and cron removes old metadata',async()=>{
  let now=1_000_000;const f=fixture({now:()=>now});await f.send();now+=24*3600*1000+1;
  assert.equal((await f.send()).status,200);assert.equal(f.calls.length,2);
  now+=24*3600*1000+1;await f.worker.scheduled({},f.env,f.ctx);await Promise.all(f.tasks);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM contact_submissions').get().n,0);
});
for (const [name,body,status] of [
  ['missing required',{},422],['invalid service',{...valid,service:'constructor'},422],
  ['wrong field type',{...valid,name:123},400],['unknown recipient field',{...valid,to:'attacker@example.com'},400],
  ['null optional field',{...valid,phone:null},400],
  ['email injection',{...valid,email:'a@example.com\r\nBcc: b@example.com'},422],
  ['invalid email',{...valid,email:'wrong'},422],['script URL',{...valid,website:'javascript:alert(1)'},422],
  ['URL credentials',{...valid,website:'https://user:password@example.com'},422],
  ['bad phone',{...valid,phone:'abc'},422],['oversized field',{...valid,name:'x'.repeat(101)},422],
  ['short message',{...valid,message:'abc'},422],['honeypot',{...valid,fax_number:'bot'},400],
  ['control characters',{...valid,message:'Text with \u0000 invalid bytes'},422],['malformed JSON','{bad',400],
  ['array',[],400],['null','null',400],['body size','x'.repeat(MAX_BODY_BYTES+1),413],
]) test(name,async()=>{const f=fixture();const r=await f.send(body);assert.equal(r.status,status);assert.equal(f.calls.length,0);});
test('body stream timeout returns 408',async()=>{
  const f=fixture({bodyTimeoutMs:5});
  const req=new Request('https://form.example/contact',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:new ReadableStream({start(){}}),duplex:'half'});
  assert.equal((await f.worker.fetch(req,f.env,f.ctx)).status,408);assert.equal(f.calls.length,0);
});
test('malformed UTF-8 returns 400',async()=>{
  const f=fixture();assert.equal((await f.send('',{body:new Uint8Array([0xff,0xfe])})).status,400);
});
test('rate limits return 429 and Retry-After before email',async()=>{
  for (const binding of ['REQUEST_LIMITER','SITE_LIMITER']) {
    const f=fixture();f.env[binding].limit=async()=>({success:false});
    const r=await f.send();assert.equal(r.status,429);assert.equal(r.headers.get('Retry-After'),'60');assert.equal(f.calls.length,0);
  }
});
test('per-email limiter also enforced',async()=>{
  const f=fixture();f.env.REQUEST_LIMITER.limit=async({key})=>({success:!key.startsWith('email:')});
  assert.equal((await f.send()).status,429);assert.equal(f.calls.length,0);
});
test('missing rate binding, secret, email or disabled configuration fails closed',async()=>{
  for (const key of ['ABUSE_SECRET','REQUEST_LIMITER','SITE_LIMITER','RESEND_API_KEY','CONTACT_DB','FROM_EMAIL']) {
    const f=fixture();delete f.env[key];assert.equal((await f.send()).status,503);assert.equal(f.calls.length,0);
  }
  const f=fixture();f.env.FORM_ENABLED='false';assert.equal((await f.send()).status,503);
});
test('origin is exact and never wildcard, null or suffix match',async()=>{
  for (const Origin of ['https://formawww.pl.attacker.test','null','https://other.test','']) {
    const f=fixture(),r=await f.send(valid,{headers:{Origin}});assert.equal(r.status,403);assert.equal(r.headers.get('Access-Control-Allow-Origin'),null);assert.equal(f.calls.length,0);
  }
});
test('POST content type, method and path are restricted',async()=>{
  const f=fixture();assert.equal((await f.send(valid,{headers:{'Content-Type':'text/plain'}})).status,415);
  assert.equal((await f.send(valid,{headers:{'CF-Connecting-IP':''}})).status,503);
  assert.equal((await f.send(valid,{headers:{'Content-Encoding':'gzip'}})).status,415);
  const r=await f.worker.fetch(new Request('https://form.example/contact',{headers:{Origin:origin}}),f.env,f.ctx);
  assert.equal(r.status,405);
  assert.equal((await f.worker.fetch(new Request('https://form.example/wrong'),f.env,f.ctx)).status,404);
});
test('CORS preflight permits only POST and Content-Type',async()=>{
  const f=fixture();
  for (const [method,headers,status] of [['POST','content-type',204],['DELETE','content-type',403],['POST','authorization',403]]) {
    const r=await f.worker.fetch(new Request('https://form.example/contact',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':method,'Access-Control-Request-Headers':headers}}),f.env,f.ctx);
    assert.equal(r.status,status);assert.equal(r.headers.get('Access-Control-Allow-Credentials'),null);
  }
});

test('unexpected infrastructure errors never expose provider details',async()=>{
  const f=fixture();
  f.env.CONTACT_DB.prepare=()=>{throw Object.assign(new Error('private detail'),{errors:{email:'private provider detail'}});};
  const response=await f.send();
  assert.deepEqual(await response.json(),{accepted:false,code:'server_error'});
  assert.equal(f.calls.length,0);
});
test('invalid binding functions and lowercase placeholder secrets fail closed',async()=>{
  const f=fixture(); f.env.REQUEST_LIMITER.limit='not a function';
  assert.equal((await f.send()).status,503);
  const g=fixture(); g.env.ABUSE_SECRET='replace-with-real-secret-at-least-32-characters';
  assert.equal((await g.send()).status,503); assert.equal(g.calls.length,0);
});
test('schema can be applied again without losing reservations',async()=>{
  const f=fixture(); await f.send();
  f.db.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
  assert.equal((await f.send()).status,200); assert.equal(f.calls.length,1);
});

for (const status of [401,403,429,409,500]) {
  test('Resend HTTP '+status+' preserves correct D1 reservation state',async()=>{
    const f=fixture();let calls=0;
    f.provider.fetch=async()=>{calls++;return Response.json({message:'private provider details'},{status});};
    const response=await f.send();assert.equal(response.status,502);
    const uncertain=[409,500].includes(status);
    assert.equal(f.db.prepare('SELECT status FROM contact_submissions').get().status,uncertain?'uncertain':'failed');
    assert.deepEqual(await response.json(),{accepted:false,code:uncertain?'delivery_unknown':'delivery_failed'});
    if (uncertain) {assert.equal((await f.send()).status,409);assert.equal(calls,1);}
  });
}
test('invalid Resend key blocks before D1 and any network request',async()=>{
  for (const value of ['',null,'REPLACE_WITH_RESEND_API_KEY','re_xxxxxxxxx','re_bad\r\nheader']) {
    const f=fixture();f.env.RESEND_API_KEY=value;
    assert.equal((await f.send()).status,503);assert.equal(f.calls.length,0);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM contact_submissions').get().n,0);
  }
});
test('retry after definite rejection preserves exact Resend idempotency key and body',async()=>{
  const f=fixture(),requests=[];
  f.provider.fetch=async(_url,init)=>{requests.push(init);return requests.length===1?Response.json({},{status:429}):Response.json({id:'accepted'});};
  assert.equal((await f.send()).status,502);assert.equal((await f.send()).status,200);
  assert.equal(requests[0].headers['Idempotency-Key'],requests[1].headers['Idempotency-Key']);
  assert.equal(requests[0].body,requests[1].body);
});

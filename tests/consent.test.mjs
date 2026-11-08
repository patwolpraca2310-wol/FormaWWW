import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source = name => readFileSync(new URL('../js/'+name,import.meta.url),'utf8');
const NOW=Date.now();
const record = analytics => ({version:1,analytics,updatedAt:NOW-100,expiresAt:NOW+100000});
const eventTarget = () => ({events:{},addEventListener(t,f){(this.events[t]??=[]).push(f);},fire(t,e={}){for(const f of this.events[t]??[])f(e);}});
function consent(initial=null,blocked=false){
  const el=()=>Object.assign(eventTarget(),{hidden:true,checked:false,open:false,isConnected:true,focus(){this.focused=true;},closest(){return null;}});
  const banner=el(),dialog=el(),check=el(),status=el(),accept=el(),reject=el(),open=el(),save=el(),close=el();
  dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;};dialog.querySelector=()=>close;
  const nodes={'[data-consent-banner]':banner,'[data-consent-dialog]':dialog,'[data-consent-analytics]':check,'[data-consent-status]':status,'[data-consent-accept]':accept,'[data-consent-reject]':reject,'[data-consent-open]':open,'[data-consent-save]':save,'[data-consent-close]':close};
  const storage=new Map(initial===null?[]:[['formawww.consent',typeof initial==='string'?initial:JSON.stringify(initial)]]);
  const actions=[];
  const window=Object.assign(eventTarget(),{FormaWWWAnalytics:{start:()=>actions.push('start'),stop:()=>actions.push('stop')}});
  const document=Object.assign(eventTarget(),{querySelector:s=>nodes[s],querySelectorAll:s=>[nodes[s]],activeElement:open,visibilityState:'visible'});
  const localStorage={getItem:k=>{if(blocked)throw Error('denied');return storage.get(k)??null;},setItem:(k,v)=>{if(blocked)throw Error('denied');storage.set(k,v);}};
  vm.runInNewContext(source('consent.js'),{window,document,localStorage,Date,JSON});
  return {banner,dialog,check,status,accept,reject,open,save,close,storage,actions,window,document};
}
test('no stored consent: no analytics, unchecked category and visible banner',()=>{
  const c=consent();assert.deepEqual(c.actions,['stop']);assert.equal(c.banner.hidden,false);assert.equal(c.check.checked,false);
});
test('refusal is stored with version and expiry and never starts analytics',()=>{
  const c=consent();c.reject.fire('click');const v=JSON.parse(c.storage.get('formawww.consent'));
  assert.equal(v.version,1);assert.equal(v.analytics,false);assert.equal(v.expiresAt-v.updatedAt,180*86400000);assert.ok(!c.actions.includes('start'));assert.equal(c.banner.hidden,true);
});
test('acceptance, settings, withdrawal and restored refusal',()=>{
  const c=consent();c.accept.fire('click');assert.equal(c.actions.at(-1),'start');
  c.open.fire('click',{preventDefault(){}});assert.equal(c.dialog.open,true);assert.equal(c.check.checked,true);
  c.check.checked=false;c.save.fire('click');assert.equal(c.actions.at(-1),'stop');assert.equal(c.dialog.open,false);
  assert.equal(consent(c.storage.get('formawww.consent')).actions.at(-1),'stop');
});
test('Escape does not silently grant consent',()=>{
  const c=consent();c.open.fire('click',{preventDefault(){}});c.dialog.fire('cancel',{preventDefault(){}});
  assert.equal(c.dialog.open,false);assert.equal(c.storage.size,0);assert.ok(!c.actions.includes('start'));
});
for(const bad of ['{broken', {...record(true),version:0},{...record(true),expiresAt:1},{...record(true),analytics:'true'},{...record(true),updatedAt:Date.now()+999999}]){
  test('invalid/outdated/expired consent fails closed: '+JSON.stringify(bad),()=>{const c=consent(bad);assert.deepEqual(c.actions,['stop']);assert.equal(c.banner.hidden,false);});
}
test('blocked storage does not crash and keeps explicit choice only in current document',()=>{
  const c=consent(null,true);c.accept.fire('click');c.document.fire('visibilitychange');assert.equal(c.actions.at(-1),'start');
  assert.match(c.status.textContent,/tylko na tej stronie/);assert.equal(consent(null,true).actions[0],'stop');
});
test('cross-tab revocation and storage clearing stop analytics',()=>{
  const c=consent(record(true));c.storage.set('formawww.consent',JSON.stringify(record(false)));c.window.fire('storage',{key:'formawww.consent'});assert.equal(c.actions.at(-1),'stop');
  c.storage.clear();c.window.fire('storage',{key:null});assert.equal(c.banner.hidden,false);
});

function parentAnalytics(canonical='https://formawww.pl/kontakt.html'){
  const children=[],cookieWrites=[];
  const window=eventTarget();
  const document=Object.assign(eventTarget(),{currentScript:{src:'https://formawww.pl/js/analytics.js?v=1'},title:'Kontakt | FormaWWW',
    querySelector:()=>({href:canonical}),createElement:()=>({attrs:{},setAttribute(k,v){this.attrs[k]=v;},contentWindow:{sent:[],clicks:[],postMessage(m,o){this.sent.push({m,o});},FormaWWWTrackOutbound(host){this.clicks.push(host);},FormaWWWStopAnalytics(){this.stopped=true;}},remove(){this.removed=true;}}),body:{append:x=>children.push(x)}});
  Object.defineProperty(document,'cookie',{get:()=> '_ga=one; _ga_095R4W93FR=two; essential=keep',set:v=>cookieWrites.push(v)});
  const location={hostname:'formawww.pl',pathname:'/kontakt.html'};
  vm.runInNewContext(source('analytics.js'),{window,document,location,URL});
  const click=(href,options={})=>document.fire('click',{isTrusted:true,button:0,defaultPrevented:false,
    target:{closest:()=>({href,closest:()=>options.form?{}:null,hasAttribute:()=>!!options.download})},...options});
  return {api:window.FormaWWWAnalytics,window,document,click,children,cookieWrites};
}
test('no iframe/no tag before start; repeated start creates only one frame',()=>{
  const p=parentAnalytics();assert.equal(p.children.length,0);p.api.start();p.api.start();assert.equal(p.children.length,1);
  assert.equal(p.children[0].src,'https://formawww.pl/assets/analytics/frame.html');assert.equal(p.children[0].referrerPolicy,'no-referrer');
});
test('only canonical metadata crosses into the form-free document',()=>{
  const p=parentAnalytics();p.api.start();const f=p.children[0];
  p.window.fire('message',{origin:'https://evil.test',source:f.contentWindow,data:{type:'formawww:analytics-ready'}});assert.equal(f.contentWindow.sent.length,0);
  p.window.fire('message',{origin:'https://formawww.pl',source:f.contentWindow,data:{type:'formawww:analytics-ready'}});
  const payload=JSON.parse(JSON.stringify(f.contentWindow.sent[0].m));
  assert.deepEqual(Object.keys(payload.metadata).sort(),['page_location','page_referrer','page_title']);assert.equal(payload.metadata.page_referrer,'');
});
test('invalid canonical fails closed',()=>{for(const url of ['https://evil.test/','https://formawww.pl/?email=private','https://formawww.pl/private/name']){const p=parentAnalytics(url);p.api.start();assert.equal(p.children.length,0);}});
test('withdrawal disables, destroys frame, expires only GA cookies, rejects stale messages',()=>{
  const p=parentAnalytics();p.api.start();const f=p.children[0];p.api.stop();assert.ok(f.removed);assert.ok(f.contentWindow.stopped);assert.equal(p.window['ga-disable-G-095R4W93FR'],true);
  assert.ok(p.cookieWrites.length>0);assert.ok(p.cookieWrites.every(s=>s.startsWith('_ga')));assert.ok(p.cookieWrites.every(s=>s.includes('Max-Age=0')));
  p.window.fire('message',{origin:'https://formawww.pl',source:f.contentWindow,data:{type:'formawww:analytics-ready'}});assert.equal(f.contentWindow.sent.length,0);
});
test('regrant in same document does not request another page_view',()=>{
  const p=parentAnalytics();p.api.start();let f=p.children[0];p.window.fire('message',{origin:'https://formawww.pl',source:f.contentWindow,data:{type:'formawww:analytics-started'}});
  p.api.stop();p.api.start();f=p.children[1];p.window.fire('message',{origin:'https://formawww.pl',source:f.contentWindow,data:{type:'formawww:analytics-ready'}});assert.equal(f.contentWindow.sent[0].m.sendPageView,false);
});

function tagFrame(){
  const scripts=[],messages=[],parent={postMessage:(...x)=>messages.push(x)};
  const window=Object.assign(eventTarget(),{parent});
  const document={createElement:()=>Object.assign(eventTarget(),{remove(){this.removed=true;}}),head:{append:s=>scripts.push(s)}};
  vm.runInNewContext(source('analytics-frame.js'),{window,document,location:{origin:'https://formawww.pl',hostname:'formawww.pl'},URL,Date});
  const send=(data={},origin='https://formawww.pl')=>window.fire('message',{source:parent,origin,data:{type:'formawww:analytics-start',sendPageView:true,metadata:{page_location:'https://formawww.pl/kontakt.html',page_title:'Kontakt',email:'PRIVATE',message:'PRIVATE',page_referrer:'PRIVATE'},...data}});
  return {window,scripts,messages,send,commands:()=>window.dataLayer.map(args=>Array.from(args))};
}
test('all four defaults denied; script only loaded after a valid consent message',()=>{
  const t=tagFrame();assert.equal(t.scripts.length,0);assert.ok(Object.values(t.commands()[0][2]).every(x=>x==='denied'));
  t.send({},'https://evil.test');assert.equal(t.scripts.length,0);t.send();assert.equal(t.scripts.length,1);assert.equal(t.scripts[0].src,'https://www.googletagmanager.com/gtag/js?id=G-095R4W93FR&l=dataLayer');
});
test('single explicit page_view, ads denied, no PII, no automatic initial view',()=>{
  const t=tagFrame();t.send();t.send();const commands=t.commands();
  assert.equal(commands.filter(x=>x[0]==='event'&&x[1]==='page_view').length,1);
  assert.equal(commands.find(x=>x[0]==='config')[2].send_page_view,false);
  const globalConfig=commands.findIndex(x=>x[0]==='set'&&x[1]?.send_page_view===false);
  assert.ok(globalConfig>=0 && globalConfig<commands.findIndex(x=>x[0]==='js'),'global send_page_view=false must precede js initialization');
  const grant=commands.find(x=>x[0]==='consent'&&x[1]==='update')[2];assert.equal(grant.analytics_storage,'granted');assert.equal(grant.ad_user_data,'denied');assert.equal(grant.ad_storage,'denied');assert.equal(grant.ad_personalization,'denied');
  assert.ok(!JSON.stringify(commands).includes('PRIVATE'));assert.equal(commands.find(x=>x[0]==='config')[2].allow_user_provided_data,false);
});
test('early withdrawal never loads Google; later withdrawal sets disable first',()=>{
  const t=tagFrame();t.window.FormaWWWStopAnalytics();t.send();assert.equal(t.scripts.length,0);
  const u=tagFrame();u.send();u.window.FormaWWWStopAnalytics();assert.equal(u.window['ga-disable-G-095R4W93FR'],true);assert.ok(u.scripts[0].removed);
});

test('outbound clicks require consent, send only hostname and stop immediately on withdrawal',()=>{
  const p=parentAnalytics();p.click('https://docs.github.com/private?email=PRIVATE#PRIVATE');assert.equal(p.children.length,0);
  p.api.stop();p.click('https://docs.github.com');assert.equal(p.children.length,0);
  p.api.start();p.api.start();p.click('https://docs.github.com/private?email=PRIVATE#PRIVATE');
  assert.deepEqual(p.children[0].contentWindow.clicks,['docs.github.com']);
  p.api.stop();p.click('https://docs.github.com');assert.equal(p.children[0].contentWindow.clicks.length,1);
  p.api.start();p.click('https://docs.github.com');assert.deepEqual(p.children[1].contentWindow.clicks,['docs.github.com']);
  assert.equal(p.document.events.click.length,1);
});

test('internal links, anchors, non-http schemes, downloads and form content are ignored',()=>{
  const p=parentAnalytics();p.api.start();
  for(const href of ['https://formawww.pl/oferta.html','https://formawww.pl/#main','https://www.formawww.pl/',
    'https://formawww.pl./','mailto:private@example.com','tel:+48123456789','javascript:alert(1)','data:text/plain,PRIVATE',
    'https://user:password@external.test/','not a url'])p.click(href);
  for(const options of [{form:true},{download:true},{isTrusted:false},{defaultPrevented:true},{button:1}])p.click('https://external.test/',options);
  assert.deepEqual(p.children[0].contentWindow.clicks,[]);
});

test('outbound bridge failures do not prevent or delay native link navigation',()=>{
  const p=parentAnalytics();p.api.start();p.children[0].contentWindow.FormaWWWTrackOutbound=()=>{throw Error('loading');};
  assert.doesNotThrow(()=>p.click('https://external.test/'));
  delete p.children[0].contentWindow.FormaWWWTrackOutbound;assert.doesNotThrow(()=>p.click('https://external.test/'));
});

test('frame emits exactly one minimal click and never another page_view',()=>{
  const t=tagFrame();t.window.FormaWWWTrackOutbound('docs.github.com');assert.equal(t.commands().filter(x=>x[0]==='event').length,0);
  t.send();t.window.FormaWWWTrackOutbound('docs.github.com');
  const clicks=t.commands().filter(x=>x[0]==='event'&&x[1]==='click');assert.equal(clicks.length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(clicks[0][2])),{send_to:'G-095R4W93FR',outbound:true,link_domain:'docs.github.com',transport_type:'beacon'});
  assert.equal(t.commands().filter(x=>x[0]==='event'&&x[1]==='page_view').length,1);
  t.window.FormaWWWStopAnalytics();t.window.FormaWWWTrackOutbound('docs.github.com');
  assert.equal(t.commands().filter(x=>x[0]==='event'&&x[1]==='click').length,1);
});

test('frame rejects unsanitized, internal and malformed destinations',()=>{
  const t=tagFrame();t.send();
  for(const host of [null,{},'formawww.pl','www.formawww.pl','https://docs.github.com/','docs.github.com/private',
    'docs.github.com?email=PRIVATE','private@example.com','bad host.test','-bad.test','a'.repeat(254)])t.window.FormaWWWTrackOutbound(host);
  assert.equal(t.commands().filter(x=>x[0]==='event'&&x[1]==='click').length,0);
});

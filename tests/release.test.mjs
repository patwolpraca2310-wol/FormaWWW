import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=file=>readFileSync(new URL(file,root),'utf8');
const pages=['index.html','oferta.html','kontakt.html','o-formawww.html','polityka-prywatnosci.html','regulamin.html','dziekujemy.html','404.html'];
test('indexation and sitemap have exactly six canonical URLs',()=>{
  const xml=read('sitemap.xml');assert.equal((xml.match(/<loc>/g)||[]).length,6);assert.ok(!xml.includes('<!--'));
  for(const file of pages){const expected=['dziekujemy.html','404.html'].includes(file)?'noindex, follow':'index, follow';assert.ok(read(file).includes('name="robots" content="'+expected+'"'));}
  assert.equal(read('robots.txt').replaceAll('\r\n','\n'),'User-agent: *\nAllow: /\n\nSitemap: https://formawww.pl/sitemap.xml\n');
  assert.ok(!xml.includes('404.html'));assert.ok(!xml.includes('dziekujemy.html'));assert.ok(!xml.includes('analytics/'));
});
test('every public page has valid share metadata, local scripts and a cookie-settings link',()=>{
  for(const file of pages){const src=read(file);
    for(const property of ['og:image','og:image:width','og:image:height','og:image:alt'])assert.equal((src.match(new RegExp('property="'+property+'"','g'))||[]).length,1,file+': '+property);
    for(const name of ['twitter:card','twitter:title','twitter:description','twitter:image'])assert.equal((src.match(new RegExp('name="'+name+'"','g'))||[]).length,1,file+': '+name);
    assert.ok(src.includes('https://formawww.pl/assets/images/formawww-og.png'));
    assert.ok(src.includes('summary_large_image'));assert.ok(src.includes('data-consent-open'));
    assert.ok(src.includes('js/analytics.js?v=1'));assert.ok(src.includes('js/consent.js?v=1'));assert.ok(!src.includes('googletagmanager.com'));
    assert.ok(!/on(click|load|submit)=/.test(src));
  }
});
test('404 has same-document anchors, no base and root-relative resources at nested paths',()=>{
  const src=read('404.html');assert.ok(!/<base\b/.test(src));
  for(const path of ['/missing','/missing/deeper/example']){
    const url='https://formawww.pl'+path;
    for(const id of ['main','top','arrow']) assert.equal(new URL('#'+id,url).pathname,path);
    for(const match of src.matchAll(/(?:href|src)="([^"]+)"/g)){
      if(match[1].startsWith('#')||/^[a-z]+:/.test(match[1]))continue;
      assert.ok(match[1].startsWith('/'),match[1]);
      assert.ok(existsSync(new URL(match[1].split(/[?#]/)[0].slice(1),root)));
    }
  }
});
test('SVG favicon exists and only the empty root draft remains ignored',()=>{
  assert.ok(read('assets/icons/favicon.svg').startsWith('<svg'));
  assert.match(read('.gitignore'),/^\/favicon\.svg$/m);assert.doesNotMatch(read('.gitignore'),/^favicon\.svg$/m);
});
test('OG is a real 1200x630 PNG',()=>{
  const b=readFileSync(new URL('assets/images/formawww-og.png',root));assert.equal(b.readUInt32BE(16),1200);assert.equal(b.readUInt32BE(20),630);
});
test('Google policy is isolated to technical frame and never adds unsafe script allowances',()=>{
  const frame=read('assets/analytics/frame.html');assert.ok(frame.includes('noindex, follow'));
  assert.ok(!frame.includes('unsafe-inline'));assert.ok(!frame.includes('unsafe-eval'));assert.ok(!frame.includes('*.'));
  for(const file of pages){const src=read(file);assert.ok(src.includes("script-src 'self';"));assert.ok(src.includes("frame-src 'self'"));}
  assert.ok(!/<form\b|<input\b|<textarea\b/.test(frame));
});
test('contact fields and transport remain intact, company optional',()=>{
  const src=read('kontakt.html');const form=src.match(/<form\b[\s\S]*?<\/form>/)[0];
  assert.ok(form.includes('https://formawww-contact.kontakt-patrykwoloszyn.workers.dev/contact'));
  assert.ok(form.includes('name="fax_number"'));assert.ok(!/name="company"[^>]*required/.test(form));
  assert.ok(!/analytics|gtag|dataLayer/.test(read('js/contact-form.js')));assert.ok(!/analytics|gtag|dataLayer/.test(read('js/contact-transport.js')));
});

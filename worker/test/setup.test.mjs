import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkSetup} from '../tools/check-setup.mjs';
import {probeEndpoint} from '../tools/check-endpoint.mjs';
const actualConfig=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
const actualHtml=readFileSync(new URL('../../kontakt.html',import.meta.url),'utf8');
// Isolate placeholder scenarios from future legitimate deployment edits.
const config=structuredClone(actualConfig);
config.vars.FORM_ENABLED='false';
config.vars.FROM_EMAIL='formularz@send.formawww.pl';
config.d1_databases[0].database_id='REPLACE_WITH_D1_DATABASE_ID';
const html=actualHtml.replace(/data-contact-endpoint="[^"]*"/, 'data-contact-endpoint="https://REPLACE-ME.invalid/contact"');
const endpoint='https://formawww-contact.example.workers.dev/contact';
const ready=()=>{
  const value=structuredClone(config);
  value.vars.FROM_EMAIL='formularz@send.formawww.pl';
  value.d1_databases[0].database_id='12345678-1234-1234-1234-123456789abc';
  return value;
};
test('repository configuration has valid structure; placeholder fixture stays disabled',()=>{
  assert.deepEqual(checkSetup(actualConfig,actualHtml).errors,[]);
  const result=checkSetup(config,html);
  assert.deepEqual(result.errors,[]); assert.equal(result.enabled,false); assert.equal(result.endpointReady,false);
  assert.equal(result.pending.length,1);
});
test('deployment readiness refuses placeholders',()=>{
  assert.equal(checkSetup(config,html,'deployment').errors.length,1);
  assert.deepEqual(checkSetup(ready(),html,'deployment').errors,[]);
});
test('activation requires enabled backend and actual frontend endpoint',()=>{
  const value=ready(); assert.equal(checkSetup(value,html,'activation').errors.length,2);
  value.vars.FORM_ENABLED='true';
  assert.deepEqual(checkSetup(value,html.replace('https://REPLACE-ME.invalid/contact',endpoint),'activation').errors,[]);
});
test('configuration rejects exposed secrets, old email binding and incorrect sender',()=>{
  for (const mutate of [c=>c.vars.ABUSE_SECRET='never-store-secrets-here', c=>c.vars.RESEND_API_KEY='never-store-secrets-here', c=>c.ratelimits[1].namespace_id=c.ratelimits[0].namespace_id, c=>c.send_email=[{name:'EMAIL'}], c=>c.vars.FROM_EMAIL='other@example.com', c=>c.vars.ALLOWED_ORIGINS='*', c=>c.routes=['formawww.pl/*']]) {
    const value=ready();mutate(value);assert.ok(checkSetup(value,html).errors.length>0);
  }
});
test('endpoint probe only sends OPTIONS and empty JSON, with mocked network',async()=>{
  for (const disabled of [true,false]) {
    const calls=[];
    const result=await probeEndpoint(endpoint,{disabled,fetchImpl:async(url,init)=>{
      calls.push(init);assert.equal(url,endpoint);assert.equal(init.redirect,'error');
      const headers={'Access-Control-Allow-Origin':'https://formawww.pl'};
      return init.method==='OPTIONS' ? new Response(null,{status:204,headers}) : Response.json({accepted:false,code:disabled?'not_configured':'validation_failed'},{status:disabled?503:422,headers});
    }});
    assert.equal(result.post,disabled?503:422);assert.equal(calls.length,2);assert.equal(calls[1].body,'{}');
  }
});
test('endpoint probe refuses placeholder and unexpected acceptance',async()=>{
  let calls=0;
  await assert.rejects(probeEndpoint('https://REPLACE-ME.invalid/contact',{fetchImpl:()=>{calls++;}}));assert.equal(calls,0);
  await assert.rejects(probeEndpoint(endpoint,{fetchImpl:async(_url,init)=>new Response(null,{status:init.method==='OPTIONS'?204:200,headers:{'Access-Control-Allow-Origin':'https://formawww.pl'}})}));
});

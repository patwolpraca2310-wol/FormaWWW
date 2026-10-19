import test from 'node:test';
import assert from 'node:assert/strict';
import {sendViaResend,validResendKey,MailDeliveryError} from '../src/resend.mjs';
const key='re_OFFLINE_TEST_NOT_A_REAL_KEY';
const fingerprint='a'.repeat(64);
const mail={from:'FormaWWW <formularz@send.formawww.pl>',to:['patryk.woloszyn@formawww.pl'],reply_to:'anna@example.com',subject:'FormaWWW: test',text:'Wiadomość testowa'};

function captureDiagnostics(t) {
  const records=[];
  t.mock.method(console,'info',(...args)=>{
    try { records.push(args.length===1 ? JSON.parse(args[0]) : {invalidLogArguments:args}); }
    catch { records.push({invalidLogArguments:args}); }
  });
  // Keep assertions outside console.info: production deliberately ignores logger errors.
  return records;
}

function assertPrivate(records) {
  for (const record of records) {
    assert.equal(record.event,'resend_transport');
    assert.ok(['started','http_response','accepted','failed'].includes(record.outcome));
    assert.ok(['request','response','response_body','response_validation'].includes(record.stage));
    assert.ok(Object.keys(record).every(key=>['event','outcome','stage','type','http_status'].includes(key)));
  }
  const serialized=JSON.stringify(records);
  for (const privateValue of [key,fingerprint,...Object.values(mail).flat(),'PRIVATE_PROVIDER_DETAIL','PRIVATE_MESSAGE_ID']) {
    assert.ok(!serialized.includes(privateValue),'Diagnostics must not include private values');
  }
}

test('Resend request uses fixed HTTPS URL, server secret, idempotency and exact REST fields',async()=>{
  const result=await sendViaResend(mail,key,fingerprint,{fetchImpl:async(url,init)=>{
    assert.equal(url,'https://api.resend.com/emails');assert.equal(init.method,'POST');assert.equal(init.redirect,'manual');
    assert.equal(init.headers.Authorization,'Bearer '+key);assert.equal(init.headers['Idempotency-Key'],'formawww-'+fingerprint);
    assert.deepEqual(JSON.parse(init.body),mail);assert.equal(init.headers['Content-Type'],'application/json');
    return Response.json({id:'accepted-resend-id'});
  }});
  assert.deepEqual(result,{messageId:'accepted-resend-id'});
});
for (const status of [301,302,303,307,308,400,401,403,404,405,413,422,429,408,409,500,502,503,504]) {
  test('Resend HTTP '+status+' is classified without exposing response details',async t=>{
    const records=captureDiagnostics(t);
    let calls=0;
    await assert.rejects(sendViaResend(mail,key,fingerprint,{fetchImpl:async()=>{calls++;return Response.json({message:'private '+key},{status});}}),error=>{
      assert(error instanceof MailDeliveryError);
      assert.equal(error.definite,[400,401,403,404,405,413,422,429].includes(status));
      assert(!error.message.includes(key));return true;
    });
    assert.equal(calls,1);
    assert.deepEqual(records.map(record=>record.outcome),['started','http_response','failed']);
    assert.equal(records[1].http_status,status);
    assert.deepEqual(records[2],{event:'resend_transport',outcome:'failed',stage:'response',type:'http_error',http_status:status});
    assertPrivate(records);
  });
}
test('Resend network, malformed JSON and missing/empty id remain uncertain',async()=>{
  for (const fetchImpl of [async()=>{throw Error('secret '+key);},async()=>new Response('not JSON'),async()=>Response.json({}),async()=>Response.json({id:' '})]) {
    await assert.rejects(sendViaResend(mail,key,fingerprint,{fetchImpl}),error=>error instanceof MailDeliveryError && error.definite===false && !error.message.includes(key));
  }
});
test('Resend timeout covers response body and aborts without retry',async()=>{
  let signal,calls=0;
  await assert.rejects(sendViaResend(mail,key,fingerprint,{timeoutMs:5,fetchImpl:async(_url,init)=>{
    signal=init.signal;calls++;return {ok:true,json:()=>new Promise(()=>{})};
  }}),error=>error instanceof MailDeliveryError && !error.definite);
  assert.equal(signal.aborted,true);assert.equal(calls,1);
});
test('Resend API key validation rejects missing, whitespace and placeholders',()=>{
  for (const candidate of [undefined,null,'','REPLACE_WITH_RESEND_API_KEY','re_xxxxxxxxx','re_PLACEHOLDER_LONG_VALUE','re_short','re_invalid\r\nheader',' re_123456789abcdef']) assert.equal(validResendKey(candidate),false);
  assert.equal(validResendKey(key),true);
});

for (const [type,stage,fetchImpl,status] of [
  ['fetch_error','request',()=>{throw new TypeError('PRIVATE_PROVIDER_DETAIL '+key);}],
  ['fetch_error','request',async()=>{throw new Error(JSON.stringify(mail));}],
  ['invalid_json','response_body',async()=>new Response('PRIVATE_PROVIDER_DETAIL '+key),200],
  ['response_body_error','response_body',async()=>({ok:true,status:200,json:async()=>{throw new TypeError('PRIVATE_PROVIDER_DETAIL');}}),200],
  ['missing_message_id','response_validation',async()=>Response.json({detail:'PRIVATE_PROVIDER_DETAIL'}),200],
  ['missing_message_id','response_validation',async()=>Response.json({id:' '}),200],
]) test('safe diagnostic '+type+' at '+stage,async t=>{
  const records=captureDiagnostics(t);
  await assert.rejects(sendViaResend(mail,key,fingerprint,{fetchImpl}),error=>error instanceof MailDeliveryError && !error.definite);
  assert.equal(records.filter(record=>record.outcome==='failed').length,1);
  assert.deepEqual(records.at(-1),{event:'resend_transport',outcome:'failed',stage,type,...(status?{http_status:status}:{})});
  assertPrivate(records);
});

for (const bodyTimeout of [false,true]) test('timeout diagnostic at '+(bodyTimeout?'response body':'fetch')+' emits once despite abort rejection',async t=>{
  const records=captureDiagnostics(t);
  let calls=0;
  await assert.rejects(sendViaResend(mail,key,fingerprint,{timeoutMs:5,fetchImpl:async(_url,{signal})=>{
    calls++;
    const blocked=new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('PRIVATE_PROVIDER_DETAIL '+key)),{once:true}));
    return bodyTimeout?{ok:true,status:200,json:()=>blocked}:blocked;
  }}),error=>error instanceof MailDeliveryError && !error.definite);
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(calls,1);
  assert.equal(records.filter(record=>record.outcome==='failed').length,1);
  assert.equal(records.at(-1).type,'timeout');
  assert.equal(records.at(-1).stage,bodyTimeout?'response_body':'request');
  assertPrivate(records);
});

test('late fetch completion after timeout cannot log accepted or response',async t=>{
  const records=captureDiagnostics(t);
  let release;
  await assert.rejects(sendViaResend(mail,key,fingerprint,{timeoutMs:5,fetchImpl:()=>new Promise(resolve=>{release=resolve;})}));
  release(Response.json({id:'PRIVATE_MESSAGE_ID'}));
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.deepEqual(records.map(record=>record.outcome),['started','failed']);
  assert.equal(records[1].type,'timeout');
  assertPrivate(records);
});

test('successful response logs status but not message ID or payload',async t=>{
  const records=captureDiagnostics(t);
  assert.deepEqual(await sendViaResend(mail,key,fingerprint,{fetchImpl:async()=>Response.json({id:'PRIVATE_MESSAGE_ID'})}),{messageId:'PRIVATE_MESSAGE_ID'});
  assert.deepEqual(records.map(record=>record.outcome),['started','http_response','accepted']);
  assert.equal(records.at(-1).http_status,200);
  assertPrivate(records);
});

test('logging failure cannot change successful or rejected delivery',async t=>{
  t.mock.method(console,'info',()=>{throw new Error('logger unavailable');});
  assert.deepEqual(await sendViaResend(mail,key,fingerprint,{fetchImpl:async()=>Response.json({id:'ok'})}),{messageId:'ok'});
  await assert.rejects(sendViaResend(mail,key,fingerprint,{fetchImpl:async()=>new Response('',{status:403})}),error=>error instanceof MailDeliveryError && error.definite);
});

test('regression: transport uses Workers-compatible request options, not redirect:error',async t=>{
  const records=captureDiagnostics(t);
  let calls=0;
  const result=await sendViaResend(mail,key,fingerprint,{fetchImpl:async(url,init)=>{
    // Model the Workers restriction that Node's Request constructor does not enforce.
    if (!['manual','follow'].includes(init.redirect)) throw new TypeError('Unsupported redirect mode');
    assert.equal(init.redirect,'manual');
    assert.deepEqual(Object.keys(init).sort(),['body','headers','method','redirect','signal']);
    const request=new Request(url,init);
    assert.equal(request.url,'https://api.resend.com/emails');
    assert.equal(request.method,'POST');
    assert.equal(request.headers.get('Authorization'),'Bearer '+key);
    assert.equal(request.headers.get('Content-Type'),'application/json');
    assert.equal(request.headers.get('Idempotency-Key'),'formawww-'+fingerprint);
    assert.deepEqual(await request.json(),mail);
    assert.ok(init.signal instanceof AbortSignal);
    assert.equal(init.signal.aborted,false);
    calls++;
    return Response.json({id:'offline-only'});
  }});
  assert.equal(calls,1);
  assert.equal(result.messageId,'offline-only');
  assert.equal(records.at(-1).outcome,'accepted');
  assertPrivate(records);
});

test('redirect response is rejected without following Location or retrying',async t=>{
  const records=captureDiagnostics(t);
  let calls=0;
  await assert.rejects(sendViaResend(mail,key,fingerprint,{fetchImpl:async(url,init)=>{
    calls++;
    assert.equal(url,'https://api.resend.com/emails');
    assert.equal(init.redirect,'manual');
    return new Response(null,{status:302,headers:{Location:'https://never-follow.invalid/PRIVATE_PROVIDER_DETAIL'}});
  }}),error=>error instanceof MailDeliveryError && !error.definite);
  assert.equal(calls,1);
  assert.equal(records.at(-1).type,'http_error');
  assert.equal(records.at(-1).http_status,302);
  assertPrivate(records);
});

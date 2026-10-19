import test from 'node:test';
import assert from 'node:assert/strict';
import {sendViaResend,validResendKey,MailDeliveryError} from '../src/resend.mjs';
const key='re_OFFLINE_TEST_NOT_A_REAL_KEY';
const fingerprint='a'.repeat(64);
const mail={from:'FormaWWW <formularz@send.formawww.pl>',to:['patryk.woloszyn@formawww.pl'],reply_to:'anna@example.com',subject:'FormaWWW: test',text:'Wiadomość testowa'};

test('Resend request uses fixed HTTPS URL, server secret, idempotency and exact REST fields',async()=>{
  const result=await sendViaResend(mail,key,fingerprint,{fetchImpl:async(url,init)=>{
    assert.equal(url,'https://api.resend.com/emails');assert.equal(init.method,'POST');assert.equal(init.redirect,'error');
    assert.equal(init.headers.Authorization,'Bearer '+key);assert.equal(init.headers['Idempotency-Key'],'formawww-'+fingerprint);
    assert.deepEqual(JSON.parse(init.body),mail);assert.equal(init.headers['Content-Type'],'application/json');
    return Response.json({id:'accepted-resend-id'});
  }});
  assert.deepEqual(result,{messageId:'accepted-resend-id'});
});
for (const status of [400,401,403,404,405,413,422,429,408,409,500,502,503,504]) {
  test('Resend HTTP '+status+' is classified without exposing response details',async()=>{
    let calls=0;
    await assert.rejects(sendViaResend(mail,key,fingerprint,{fetchImpl:async()=>{calls++;return Response.json({message:'private '+key},{status});}}),error=>{
      assert(error instanceof MailDeliveryError);
      assert.equal(error.definite,[400,401,403,404,405,413,422,429].includes(status));
      assert(!error.message.includes(key));return true;
    });
    assert.equal(calls,1);
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

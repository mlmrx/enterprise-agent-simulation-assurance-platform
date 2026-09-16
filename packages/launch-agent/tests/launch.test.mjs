import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepare, approve, run, verify, recordReceipt, withLock, loadState } from '../src/engine.mjs';
import { buildPlan, contentProblems, digest, safeFile } from '../src/plan.mjs';
import { publisher, PublicationError } from '../src/publishers.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const credentials = { GH_TOKEN:'test-token', DEVTO_API_KEY:'test-devto', X_ACCESS_TOKEN:'test-x', LINKEDIN_ACCESS_TOKEN:'test-li' };
const healthy = async()=>new Response('ok', { status:200 });
function job(id='post', channel='devto') {
  return { id, channel, title:'Launch', body:'Real source-backed launch content', payload:{ article:{ title:'Launch', body_markdown:'Real source-backed launch content', published:true } },
    account:{ username:'maker' }, assets:[], mode:'api', dueAt:'2026-01-01T00:00:00Z', dependsOn:[], problems:[], digest:digest(id) };
}
async function fixture(t, jobs=[job()]) {
  const dir = await mkdtemp(join(tmpdir(),'easap-launch-test-'));
  t.after(()=>rm(dir,{ recursive:true, force:true }));
  const ctx = { root:dir, dir, config:{ id:'test', startsAt:'2026-01-01T00:00:00Z', maxPerRun:10, site:'https://easap.dev', healthPaths:['/assess'], channels:Object.fromEntries(jobs.map(j=>[j.channel,{...j.account,enabled:true}])) },
    plan:{ id:'test', name:'Test launch', startsAt:'2026-01-01T00:00:00Z', jobs }, state:{ version:1, campaign:'test', jobs:{}, events:[] } };
  await prepare(ctx);
  return ctx;
}
function fakeAdapter() {
  let posts=0;
  return { get posts(){ return posts; }, async publish(j){ posts++; return { id:`${posts}`, url:`https://dev.to/maker/${j.id}` }; }, async verify(){ return { matches:true, metrics:{ comments:0 } }; } };
}
const options = adapter=>({ publish:true, adapter, env:credentials, fetchFn:healthy, clock:Date.parse('2026-09-16T00:00:00Z') });

test('real launch package produces all eleven channels and six full articles', async()=> {
  const config = JSON.parse(await readFile(resolve(root,'launch/agent/campaign.json'),'utf8'));
  const plan = await buildPlan(root, config);
  assert.equal(new Set(plan.jobs.map(j=>j.channel)).size,11);
  assert.equal(plan.jobs.length,18);
  assert.equal(plan.jobs.filter(j=>j.channel==='devto').length,6);
  assert(plan.jobs.filter(j=>j.mode==='api').every(j=>!j.problems.length));
  assert(plan.jobs.filter(j=>j.channel==='devto').every(j=>j.body.length>2000 && !j.body.includes('canonical_url:')));
  assert.deepEqual(plan.jobs.find(j=>j.id==='x-launch-2').dependsOn,['x-launch-1']);
});
test('dry-run and missing approvals cannot send posts', async t=> {
  const ctx=await fixture(t), adapter=fakeAdapter();
  await run(ctx,{...options(adapter),publish:false});
  await run(ctx,options(adapter));
  assert.equal(adapter.posts,0);
});
test('approved publication is verified and never duplicated on repeated runs',async t=>{
  const ctx=await fixture(t), adapter=fakeAdapter();
  await approve(ctx,'post','owner','Explicitly approved this test');
  await run(ctx,options(adapter)); await run(ctx,options(adapter));
  assert.equal(adapter.posts,1); assert.equal(ctx.state.jobs.post.status,'published');
  assert.equal((await loadState(ctx.dir)).jobs.post.receipt.id,'1');
});
test('approval becomes invalid when content fingerprint changes',async t=>{
  const ctx=await fixture(t), adapter=fakeAdapter();
  await approve(ctx,'post','owner','approved'); ctx.plan.jobs[0].digest=digest('edited');
  await run(ctx,options(adapter)); assert.equal(adapter.posts,0);
});
test('changed schedule and account change the real plan fingerprint',async()=>{
  const config=JSON.parse(await readFile(resolve(root,'launch/agent/campaign.json'),'utf8'));
  const first=await buildPlan(root,config);
  config.startsAt='2026-10-01T16:00:00Z'; config.channels.devto.username='a-different-account';
  const second=await buildPlan(root,config);
  assert.notEqual(first.jobs.find(j=>j.channel==='devto').digest,second.jobs.find(j=>j.channel==='devto').digest);
});
test('uncertain remote write is not retried',async t=>{
  const ctx=await fixture(t); let calls=0;
  const adapter={async publish(){ calls++; throw new PublicationError('Timed out',{ambiguous:true}); }};
  await approve(ctx,'post','owner','approved');
  await run(ctx,options(adapter)); await run(ctx,options(adapter));
  assert.equal(calls,1); assert.equal(ctx.state.jobs.post.status,'needs_reconciliation');
});
test('receipt survives a verification failure and verify finishes without a new POST',async t=>{
  const ctx=await fixture(t), adapter=fakeAdapter();
  await approve(ctx,'post','owner','approved');
  await run(ctx,options({...adapter,publish:adapter.publish,verify:async()=>{throw new Error('read permission');}}));
  assert.equal(ctx.state.jobs.post.status,'submitted');
  await run(ctx,options(adapter)); assert.equal(adapter.posts,1);
  await verify(ctx,adapter); assert.equal(ctx.state.jobs.post.status,'published');
});
test('interrupted intent is recovered as uncertain, without posting',async t=>{
  const ctx=await fixture(t), adapter=fakeAdapter();
  await approve(ctx,'post','owner','approved'); ctx.state.jobs.post.status='publishing';
  await prepare(ctx); await run(ctx,options(adapter));
  assert.equal(adapter.posts,0); assert.equal(ctx.state.jobs.post.status,'needs_reconciliation');
});
test('future dates, pause switch, and unhealthy product stop publication',async t=>{
  const ctx=await fixture(t), adapter=fakeAdapter();
  await approve(ctx,'post','owner','approved');
  await run(ctx,{...options(adapter),clock:0}); assert.equal(adapter.posts,0);
  await assert.rejects(run(ctx,{...options(adapter),env:{...credentials,LAUNCH_AGENT_PAUSE:'1'}}),/paused/);
  await assert.rejects(run(ctx,{...options(adapter),fetchFn:async()=>new Response('',{status:503})}),/health/);
  assert.equal(adapter.posts,0);
});
test('rate limit retry respects retryAt',async t=>{
  const ctx=await fixture(t); let calls=0;
  const adapter={async publish(){ calls++; throw new PublicationError('rate limited',{retryAt:'2099-01-01T00:00:00Z'}); }};
  await approve(ctx,'post','owner','approved');
  await run(ctx,options(adapter)); await run(ctx,options(adapter));
  assert.equal(calls,1); assert.equal(ctx.state.jobs.post.status,'retry_wait');
});
test('unverified thread parent prevents publishing the child',async t=>{
  const a=job('a'), b=job('b'); b.dependsOn=['a'];
  const ctx=await fixture(t,[a,b]); const adapter=fakeAdapter();
  await approve(ctx,'all','owner','approved');
  await run(ctx,options({...adapter,publish:adapter.publish,verify:async()=>{throw new Error('not readable');}}));
  assert.equal(adapter.posts,1); assert.equal(ctx.state.jobs.b.status,'draft');
});
test('exclusive lock prevents competing worker',async t=>{
  const ctx=await fixture(t);
  await withLock(ctx.dir,async()=>assert.rejects(withLock(ctx.dir,async()=>{}),/holds the lock/));
});
test('manual receipts need the approved fingerprint and correct channel host',async t=>{
  const j=job('manual','producthunt'); j.mode='browser-or-connector'; j.account={destination:'https://www.producthunt.com/posts/new'};
  const ctx=await fixture(t,[j]);
  await assert.rejects(recordReceipt(ctx,'manual','https://www.producthunt.com/posts/easap','1','visible'),/Approve/);
  await approve(ctx,'manual','owner','approved');
  await assert.rejects(recordReceipt(ctx,'manual','https://evil.example/post','1','visible'),/does not match/);
  await recordReceipt(ctx,'manual','https://www.producthunt.com/posts/easap','1','visible in maker account');
  assert.equal(ctx.state.jobs.manual.verification.method,'operator-attested');
});
test('source paths cannot escape the repository and HTML escapes source text',async t=>{
  const ctx=await fixture(t); await writeFile(join(ctx.dir,'source.md'),'hello');
  await assert.rejects(safeFile(ctx.dir,'../not-present.md'));
  ctx.plan.jobs[0].body='<script>alert(1)</script>'; await prepare(ctx);
  const html=await readFile(join(ctx.dir,'review.html'),'utf8');
  assert(!html.includes('<script>')); assert(html.includes('&lt;script&gt;'));
});
test('placeholders and excessive social text fail content gates',()=>{
  assert(contentProblems({...job(),payload:{text:'[CONTACT EMAIL]'}}).length);
  assert(contentProblems({...job('x','x'),payload:{text:'a'.repeat(281)}}).length);
});
test('Dev.to adapter validates identity, sends published article, and verifies it',async()=>{
  const seen=[]; const j=job();
  const adapter=publisher({env:credentials,fetchFn:async(url,opts)=>{
    seen.push([url,opts]);
    if(url.endsWith('/users/me')) return Response.json({username:'maker'});
    return Response.json({id:123,url:'https://dev.to/maker/launch',title:'Launch',body_markdown:j.payload.article.body_markdown,user:{username:'maker'}});
  }});
  const receipt=await adapter.publish(j,{jobs:{}}); await adapter.verify(j,receipt);
  assert.equal(seen[1][1].method,'POST');
  assert.equal(JSON.parse(seen[1][1].body).article.published,true);
  assert.equal(receipt.id,'123');
});
test('X replies use parent receipt and require matching user account',async()=>{
  const j={...job('x','x'),account:{userId:'42'},payload:{text:'launch'},dependsOn:['parent']}; let posted;
  const adapter=publisher({env:credentials,fetchFn:async(url,opts)=>{
    if(url.endsWith('/users/me')) return Response.json({data:{id:'42'}});
    posted=JSON.parse(opts.body); return Response.json({data:{id:'123'}});
  }});
  await adapter.publish(j,{jobs:{parent:{receipt:{id:'100'}}}});
  assert.equal(posted.reply.in_reply_to_tweet_id,'100');
  j.account.userId='43'; await assert.rejects(adapter.publish(j,{}),/different userId/);
});
test('publisher does not persist server bodies or credentials in errors',async()=>{
  const j=job('li','linkedin'); j.account={author:'urn:li:person:maker',apiVersion:'202608'}; j.payload={commentary:'launch'};
  const adapter=publisher({env:credentials,fetchFn:async()=>new Response('secret test-li',{status:500})});
  await assert.rejects(adapter.publish(j,{}), e=>e.ambiguous && !e.message.includes('test-li'));
});

test('GitHub reuses an identical existing public release without another POST',async()=>{
  const j=job('release','github'); j.account={repository:'maker/project',tag:'v1',target:'main'};
  j.payload={name:'Launch',body:'Release notes',draft:false}; let posts=0;
  const adapter=publisher({env:credentials,fetchFn:async(url,opts)=>{
    if(opts.method==='POST') posts++;
    return Response.json({id:7,html_url:'https://github.com/maker/project/releases/tag/v1',body:'Release notes',name:'Launch',draft:false});
  }});
  const receipt=await adapter.publish(j,{}); assert.equal(receipt.id,'7'); assert.equal(posts,0);
  j.payload.body='Different notes'; await assert.rejects(adapter.publish(j,{}),/different content/);
});
test('LinkedIn empty success body captures header receipt and correct request',async()=>{
  const j=job('li','linkedin'); j.account={author:'urn:li:person:maker',apiVersion:'202608'}; j.payload={commentary:'launch'}; let sent;
  const adapter=publisher({env:credentials,fetchFn:async(url,opts)=>{
    sent=JSON.parse(opts.body);
    return new Response('',{status:201,headers:{'x-restli-id':'urn:li:share:123'}});
  }});
  const receipt=await adapter.publish(j,{});
  assert.equal(receipt.id,'urn:li:share:123'); assert.equal(sent.author,j.account.author); assert.equal(sent.lifecycleState,'PUBLISHED');
});
test('X verification expands shortened links and rejects a different text',async()=>{
  const j=job('x','x'); j.account={userId:'42'}; j.payload={text:'Try https://easap.dev/developers'};
  const adapter=publisher({env:credentials,fetchFn:async()=>Response.json({data:{id:'12',author_id:'42',text:'Try https://t.co/example',entities:{urls:[{url:'https://t.co/example',expanded_url:'https://easap.dev/developers'}]},public_metrics:{like_count:2}}})});
  assert.equal((await adapter.verify(j,{id:'12'})).metrics.like_count,2);
  j.payload.text='Different'; await assert.rejects(adapter.verify(j,{id:'12'}),/does not match/);
});
test('verification must explicitly establish a match',async t=>{
  const ctx=await fixture(t), adapter=fakeAdapter();
  await approve(ctx,'post','owner','approved');
  await run(ctx,options({...adapter,publish:adapter.publish,verify:async()=>({matches:false})}));
  assert.equal(ctx.state.jobs.post.status,'submitted');
});

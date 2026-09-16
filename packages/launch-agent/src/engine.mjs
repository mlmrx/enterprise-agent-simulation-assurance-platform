import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { buildPlan } from './plan.mjs';
import { publisher, requirements, githubToken } from './publishers.mjs';

export const now = () => new Date().toISOString();
export async function atomicJson(path, data) {
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
  await rename(temp, path);
}
export async function withLock(dir, task) {
  await mkdir(dir, { recursive: true });
  const lock = resolve(dir, '.lock');
  try { await mkdir(lock); } catch (error) {
    if (error.code === 'EEXIST') throw new Error('Another launch command holds the lock. If its process stopped, inspect state before removing the lock.');
    throw error;
  }
  try { return await task(); } finally { await rm(lock, { recursive: true, force: true }); }
}
export async function loadState(dir) {
  try { return JSON.parse(await readFile(resolve(dir, 'state.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return { version: 1, jobs: {}, events: [] }; throw error; }
}
export function event(state, type, id, detail = '') {
  state.events.push({ at: now(), type, id, detail });
}
const html = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

export function summarize(plan, state) {
  return plan.jobs.map(job => {
    const record = state.jobs[job.id] || {};
    return { id: job.id, channel: job.channel, status: record.status || 'draft', title: job.title,
      dueAt: job.dueAt, mode: job.mode, approved: record.approval?.digest === job.digest,
      problems: job.problems, url: record.receipt?.url || null, error: record.error || null };
  });
}
export async function renderReport(dir, plan, state) {
  const rows = summarize(plan, state);
  let checks = null;
  try { checks = JSON.parse(await readFile(resolve(dir,'doctor.json'),'utf8')); } catch { /* No doctor run yet. */ }
  const published = rows.filter(j => j.status === 'published').length;
  const document = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EASAP Launch Agent</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f2f6fb;color:#10243e;font:16px/1.6 system-ui,sans-serif}main{max-width:1180px;margin:50px auto;padding:0 28px}header{display:flex;justify-content:space-between;gap:24px;align-items:start}h1{font-size:42px;line-height:1.15;letter-spacing:-1.5px;margin:12px 0}small{color:#506781}b.eyebrow{color:#3266cb;font-size:13px;letter-spacing:2px}.stats{display:flex;gap:18px;margin:30px 0}.stats div{background:#0c2440;color:white;border-radius:14px;padding:20px 26px;flex:1}.stats strong{font-size:32px;display:block;color:#8de6b1}article{background:white;border:1px solid #d8e1ee;border-radius:14px;margin:14px 0;padding:23px}summary{cursor:pointer;display:flex;gap:16px;align-items:center;justify-content:space-between}h2{font-size:18px;margin:0}code,pre{font:14px/1.65 ui-monospace,Consolas,monospace}pre{white-space:pre-wrap;overflow-wrap:anywhere;padding:20px;background:#f3f6fa;border-radius:8px}a{color:#2458b5}p{margin:10px 0}.pill{font-size:12px;border-radius:30px;background:#e9eff8;padding:5px 12px;white-space:nowrap}.blocked{color:#984623}footer{padding:30px 0;color:#526780}@media(max-width:650px){header,.stats{display:block}.stats div{margin:10px 0}summary{display:block}h1{font-size:32px}}</style><main>
  <header><div><b class="eyebrow">EASAP / LAUNCH AGENT</b><h1>A launch with receipts.</h1><p>${html(plan.name)}</p></div><div><small>Updated ${html(now())}<br>${plan.startsAt ? `Starts ${html(plan.startsAt)}` : 'Launch date not set'}</small></div></header>
  <div class="stats"><div><strong>${rows.length}</strong>prepared actions</div><div><strong>${published}</strong>verified publications</div><div><strong>${rows.filter(j=>j.approved).length}</strong>approved actions</div></div>
  <p>Review exact content below. API channels publish through configured accounts. Browser and connector channels keep their prepared copy, destinations, and media together.</p>
  ${checks ? `<article><details><summary><h2>Accounts and product health</h2><span class="pill">${checks.health.filter(h=>h.ok).length}/${checks.health.length} product pages reachable</span></summary><small>Checked ${html(checks.checkedAt)}</small>${checks.channels.map(c=>`<p><strong>${html(c.channel)}</strong> · ${c.ready ? 'Configuration present' : html(c.missing.join(' · '))}</p>`).join('')}<p>Configuration presence does not confirm publishing permission. Browser connections require inspection in the selected account.</p></details></article>` : ''}
  ${plan.jobs.map((job,i) => `<article><details><summary><div><small>${html(job.channel.toUpperCase())} · ${html(job.id)} · ${html(job.dueAt || 'unscheduled')}</small><h2>${html(job.title)}</h2></div><span class="pill">${html(rows[i].status)}${rows[i].approved ? ' · approved' : ''}</span></summary><p>Mode: ${html(job.mode)}</p>${rows[i].url ? `<p><a href="${html(rows[i].url)}" rel="noreferrer">View publication</a></p>` : ''}<p class="blocked">${html([...job.problems, rows[i].error].filter(Boolean).join(' · '))}</p><pre>${html(job.body)}</pre><p>Media: ${html(job.assets.map(a=>a.path).join(', '))}</p><small>Content fingerprint: ${html(job.digest)}</small></details></article>`).join('')}
  <footer>Metrics are collected from publisher responses when available. Missing measurements remain unknown.<br>State and review files stay on your machine. No account keys are written here.</footer></main></html>`;
  await writeFile(resolve(dir, 'review.html'), document);
  await atomicJson(resolve(dir, 'report.json'), { generatedAt: now(), campaign: plan.id, jobs: rows });
  await writeFile(resolve(dir, 'report.md'), `# ${plan.name}\n\nUpdated ${now()}\n\n${rows.map(j=>`- **${j.id}** — ${j.status}${j.url ? ` — ${j.url}` : ''}${j.error ? ` — ${j.error}` : ''}`).join('\n')}\n`);
}

export async function context(root, configPath, statePath) {
  const config = JSON.parse(await readFile(resolve(root, configPath), 'utf8'));
  const dir = resolve(root, statePath);
  const plan = await buildPlan(root, config);
  const state = await loadState(dir);
  if (state.campaign && state.campaign !== config.id) throw new Error('This state directory belongs to a different campaign.');
  state.campaign = config.id;
  return { root, config, dir, plan, state };
}
export async function save(ctx) {
  await atomicJson(resolve(ctx.dir, 'state.json'), ctx.state);
  await renderReport(ctx.dir, ctx.plan, ctx.state);
}
export async function prepare(ctx) {
  await mkdir(resolve(ctx.dir, 'outbox'), { recursive: true });
  for (const job of ctx.plan.jobs) {
    const record = ctx.state.jobs[job.id] ||= { status: 'draft' };
    if (record.status === 'publishing') {
      record.status = 'needs_reconciliation'; record.error = 'Previous process stopped during publication. Check the account before another attempt.';
    }
    await atomicJson(resolve(ctx.dir, 'outbox', `${job.id}.json`), job);
    await writeFile(resolve(ctx.dir, 'outbox', `${job.id}.md`), `# ${job.title}\n\nChannel: ${job.channel}\nDestination: ${job.account.destination || job.account.repository || job.account.username || job.account.author || job.account.userId || '(not configured)'}\n\n${job.body}\n\n## Media\n${job.assets.map(a=>`- ${a.path}\n  Alt: ${a.alt}`).join('\n')}\n`);
  }
  event(ctx.state, 'prepared', ctx.plan.id, `${ctx.plan.jobs.length} actions`);
  await save(ctx);
  return summarize(ctx.plan, ctx.state);
}
export async function approve(ctx, ids, by, note) {
  if (!by || !note) throw new Error('Approval requires --by and --note identifying the user authorization.');
  const chosen = ids === 'all' ? ctx.plan.jobs : ctx.plan.jobs.filter(j=>ids.split(',').includes(j.id));
  if (!chosen.length) throw new Error('No matching jobs.');
  if (ids !== 'all' && chosen.length !== new Set(ids.split(',')).size) throw new Error('Unknown job id.');
  for (const job of chosen) if (job.problems.length) throw new Error(`${job.id}: ${job.problems.join(', ')}`);
  for (const job of chosen) {
    const record = ctx.state.jobs[job.id] ||= { status: 'draft' };
    record.approval = { digest: job.digest, by, note, at: now() };
    event(ctx.state, 'approved', job.id, job.digest);
  }
  await save(ctx);
}

export async function doctor(ctx, { live = false, env = process.env, fetchFn = globalThis.fetch } = {}) {
  const channels = [];
  for (const [channel, account] of Object.entries(ctx.config.channels).filter(([,v])=>v.enabled)) {
    const mode = ['github','devto','x','linkedin'].includes(channel) && account.delivery !== 'browser' ? 'api' : 'browser-or-connector';
    const missing = mode === 'api' ? requirements(channel, account, env) : ['authenticated browser/connector and exact destination'];
    if (channel === 'github' && mode === 'api') { try { await githubToken(env); } catch { missing.push('gh login or GH_TOKEN'); } }
    channels.push({ channel, mode, ready: missing.length === 0, missing,
      note: 'Credential presence is not a test of publisher access.' });
  }
  const health = [];
  if (live) for (const path of ctx.config.healthPaths) {
    const url = new URL(path, ctx.config.site).href;
    try {
      const response = await fetchFn(url, { signal: AbortSignal.timeout(15000), redirect: 'follow' });
      health.push({ url, ok: response.ok, status: response.status });
      await response.body?.cancel();
    } catch { health.push({ url, ok: false, error: 'unreachable' }); }
  }
  const result = { checkedAt: now(), channels, health, scheduled: !!ctx.config.startsAt,
    contentProblems: ctx.plan.jobs.filter(j=>j.problems.length).map(j=>({ id:j.id, problems:j.problems })) };
  await atomicJson(resolve(ctx.dir, 'doctor.json'), result);
  await renderReport(ctx.dir, ctx.plan, ctx.state);
  return result;
}

export async function run(ctx, { publish = false, adapter = publisher(), env = process.env, clock = Date.now(), fetchFn = globalThis.fetch } = {}) {
  if (!publish) return summarize(ctx.plan, ctx.state);
  if (env.LAUNCH_AGENT_PAUSE === '1') throw new Error('Launch paused by LAUNCH_AGENT_PAUSE.');
  if (!ctx.config.startsAt) throw new Error('Set startsAt before publishing scheduled content.');
  const health = await doctor(ctx, { live:true, env, fetchFn });
  if (health.health.some(h=>!h.ok)) throw new Error('Product health check failed. See doctor.json.');
  let attempts = 0;
  const max = Math.max(1, Math.min(10, ctx.config.maxPerRun || 4));
  for (const job of ctx.plan.jobs) {
    const record = ctx.state.jobs[job.id] ||= { status: 'draft' };
    if (record.status === 'publishing') { record.status = 'needs_reconciliation'; record.error = 'Previous publication was interrupted.'; }
    if (['published','needs_reconciliation','submitted'].includes(record.status)) continue;
    if (record.receipt) continue;
    if (record.approval?.digest !== job.digest) { record.error = 'Review and approve the current content, schedule, and account.'; continue; }
    if (job.problems.length) { record.error = job.problems.join(', '); continue; }
    if (Date.parse(job.dueAt) > clock || (record.retryAt && Date.parse(record.retryAt) > clock)) continue;
    if (job.dependsOn.some(id=>ctx.state.jobs[id]?.status !== 'published')) { record.error = 'Waiting for previous thread post to be verified.'; continue; }
    if (job.mode !== 'api') { record.status = 'needs_browser'; record.error = 'Use the prepared outbox with an authenticated browser/connector, then record the publication receipt.'; continue; }
    const missing = health.channels.find(c=>c.channel === job.channel)?.missing || [];
    if (missing.length) { record.status = 'blocked'; record.error = `Missing: ${missing.join(', ')}`; continue; }
    if (attempts >= max) break;
    attempts++;
    record.status = 'publishing'; record.attempt = { id:randomUUID(), at:now(), digest:job.digest };
    delete record.error; delete record.retryAt;
    event(ctx.state, 'publishing', job.id, record.attempt.id);
    await save(ctx); // Persist intent before crossing the remote-write boundary.
    try {
      const receipt = await adapter.publish(job, ctx.state);
      if (!receipt?.id || !receipt?.url || !String(receipt.url).startsWith('https://')) throw Object.assign(new Error('Publication response lacks a usable receipt.'), { ambiguous:true });
      record.receipt = { ...receipt, at:now(), digest:job.digest };
      record.status = 'submitted';
      event(ctx.state, 'submitted', job.id, receipt.url);
      await save(ctx); // A failed verification must never cause another POST.
      try {
        record.verification = await adapter.verify(job, receipt);
        if (record.verification?.matches !== true) throw new Error('Publication verification did not establish a match.');
        record.status = 'published';
        event(ctx.state, 'verified', job.id, receipt.url);
      } catch { record.error = 'Publisher accepted the post; verification is pending. Use verify, not another publish.'; }
    } catch (error) {
      record.status = error.ambiguous ? 'needs_reconciliation' : error.retryAt ? 'retry_wait' : 'blocked';
      record.error = error.message;
      if (error.retryAt) record.retryAt = error.retryAt;
      event(ctx.state, record.status, job.id, error.message);
    }
    await save(ctx);
  }
  await save(ctx);
  return summarize(ctx.plan, ctx.state);
}

export async function verify(ctx, adapter = publisher()) {
  for (const job of ctx.plan.jobs) {
    const record = ctx.state.jobs[job.id];
    if (!record?.receipt || job.mode !== 'api') continue;
    try {
      if (record.receipt.digest !== job.digest) throw new Error('Current content differs from the published snapshot. Preserve the receipt and review changes.');
      record.verification = await adapter.verify(job, record.receipt);
      if (record.verification?.matches !== true) throw new Error('Publication verification did not establish a match.');
      record.status = 'published'; delete record.error;
    } catch (error) { record.error = error.message; }
  }
  await save(ctx);
  return summarize(ctx.plan, ctx.state);
}

export async function recordReceipt(ctx, id, url, remoteId, note) {
  const job = ctx.plan.jobs.find(j=>j.id === id);
  if (!job || !note || !remoteId) throw new Error('Receipt requires an existing job, --remote-id, and --note with verification evidence.');
  const parsed = new URL(url);
  const allowed = { github:['github.com'], devto:['dev.to'], x:['x.com','twitter.com'], linkedin:['www.linkedin.com','linkedin.com'], producthunt:['www.producthunt.com','producthunt.com'], hackernews:['news.ycombinator.com'], reddit:['www.reddit.com','reddit.com'], hashnode:['hashnode.com'], youtube:['www.youtube.com','youtube.com','youtu.be'] };
  const extra = job.account.destination ? new URL(job.account.destination).hostname : null;
  if (parsed.protocol !== 'https:' || ![...(allowed[job.channel]||[]),extra].includes(parsed.hostname)) throw new Error('Receipt URL does not match the selected publication channel/destination.');
  const record = ctx.state.jobs[id] ||= { status:'draft' };
  if (record.approval?.digest !== job.digest) throw new Error('Approve the current job before recording its external publication.');
  record.receipt = { id:remoteId, url, at:now(), digest:job.digest, note };
  record.status = job.mode === 'api' ? 'submitted' : 'published';
  record.verification = job.mode === 'api' ? null : { method:'operator-attested', note, checkedAt:now() };
  delete record.error;
  event(ctx.state, 'receipt-recorded', id, url);
  await save(ctx);
}

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
export class PublicationError extends Error {
  constructor(message, { ambiguous = false, retryAt = null } = {}) {
    super(message); this.ambiguous = ambiguous; this.retryAt = retryAt;
  }
}

export function requirements(channel, account, env = process.env) {
  const missing = [];
  const need = (name) => { if (!env[name]) missing.push(name); };
  if (channel === 'github') {
    if (!/^[\w.-]+\/[\w.-]+$/.test(account.repository || '')) missing.push('repository owner/name');
    if (!account.tag || !account.target) missing.push('release tag and target');
    // An existing gh login is checked separately without displaying its token.
  } else if (channel === 'devto') {
    need('DEVTO_API_KEY'); if (!account.username) missing.push('Dev.to username');
  } else if (channel === 'x') {
    need('X_ACCESS_TOKEN'); if (!/^\d+$/.test(account.userId || '')) missing.push('X numeric userId');
  } else if (channel === 'linkedin') {
    need('LINKEDIN_ACCESS_TOKEN');
    if (!/^urn:li:(person|organization):[\w-]+$/.test(account.author || '')) missing.push('LinkedIn author URN');
    if (!/^\d{6}$/.test(account.apiVersion || '')) missing.push('supported LinkedIn apiVersion (YYYYMM)');
  } else missing.push('authenticated browser/connector and exact destination');
  return missing;
}

export async function githubToken(env = process.env) {
  if (env.GH_TOKEN || env.GITHUB_TOKEN) return env.GH_TOKEN || env.GITHUB_TOKEN;
  try {
    const { stdout } = await exec('gh', ['auth', 'token', '--hostname', 'github.com'], { timeout: 10000, windowsHide: true });
    if (stdout.trim()) return stdout.trim();
  } catch { /* Report presence only. */ }
  throw new Error('GitHub login missing. Use gh auth login or GH_TOKEN.');
}

export function publisher({ env = process.env, fetchFn = globalThis.fetch } = {}) {
  async function request(url, { method = 'GET', headers = {}, body, allow404 = false } = {}) {
    let res;
    try {
      res = await fetchFn(url, { method, headers: { 'Content-Type': 'application/json', ...headers },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'error', signal: AbortSignal.timeout(25000) });
    } catch {
      throw new PublicationError(`${method} request did not return a definitive response.`, { ambiguous: method !== 'GET' });
    }
    if (res.status === 404 && allow404) return null;
    if (!res.ok) {
      const seconds = Number(res.headers.get('retry-after'));
      throw new PublicationError(`Publisher returned HTTP ${res.status}.`, {
        ambiguous: method !== 'GET' && (res.status >= 500 || res.status === 408),
        retryAt: res.status === 429 ? new Date(Date.now() + (seconds > 0 ? seconds : 900) * 1000).toISOString() : null,
      });
    }
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch {
      throw new PublicationError('Publisher response was not valid JSON.', { ambiguous: method !== 'GET' });
    }
    return { data, headers: res.headers };
  }
  async function headers(job) {
    if (job.channel === 'github') return { Authorization: `Bearer ${await githubToken(env)}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (job.channel === 'devto') return { 'api-key': env.DEVTO_API_KEY, Accept: 'application/vnd.forem.api-v1+json' };
    if (job.channel === 'linkedin') return { Authorization: `Bearer ${env.LINKEDIN_ACCESS_TOKEN}`, 'Linkedin-Version': job.account.apiVersion, 'X-Restli-Protocol-Version': '2.0.0' };
    return { Authorization: `Bearer ${env.X_ACCESS_TOKEN}` };
  }
  return {
    async publish(job, state) {
      const missing = requirements(job.channel, job.account, env);
      if (missing.length) throw new Error(`Missing configuration: ${missing.join(', ')}`);
      const h = await headers(job);
      let result;
      if (job.channel === 'github') {
        const endpoint = `https://api.github.com/repos/${job.account.repository}/releases`;
        const existing = await request(`${endpoint}/tags/${encodeURIComponent(job.account.tag)}`, { headers: h, allow404: true });
        if (existing) {
          if (existing.data.body !== job.payload.body || existing.data.draft || existing.data.name !== job.payload.name) throw new Error('Release tag already exists with different content. Choose a new tag or reconcile the existing release.');
          result = existing;
        } else result = await request(endpoint, { method: 'POST', headers: h, body: job.payload });
        if (!result.data.id || !result.data.html_url) throw new PublicationError('GitHub response omitted the publication receipt.', { ambiguous:true });
        return { id: String(result.data.id), url: result.data.html_url, channel: job.channel };
      }
      if (job.channel === 'devto') {
        const identity = await request('https://dev.to/api/users/me', { headers: h });
        if (identity.data.username?.toLowerCase() !== job.account.username.toLowerCase()) throw new Error('Dev.to API key belongs to a different username.');
        result = await request('https://dev.to/api/articles', { method: 'POST', headers: h, body: job.payload });
        if (!result.data.id || !result.data.url) throw new PublicationError('Dev.to response omitted the publication receipt.', { ambiguous:true });
        return { id: String(result.data.id), url: result.data.url, channel: job.channel };
      }
      if (job.channel === 'x') {
        const identity = await request('https://api.x.com/2/users/me', { headers: h });
        if (identity.data.data?.id !== job.account.userId) throw new Error('X access token belongs to a different userId.');
        const body = { ...job.payload };
        const parent = job.dependsOn.at(-1);
        if (parent) body.reply = { in_reply_to_tweet_id: state.jobs[parent].receipt.id };
        result = await request('https://api.x.com/2/tweets', { method: 'POST', headers: h, body });
        const id = result.data.data?.id;
        if (!id) throw new PublicationError('X response omitted the publication id.', { ambiguous: true });
        return { id, url: `https://x.com/i/web/status/${id}`, channel: job.channel };
      }
      if (job.channel === 'linkedin') {
        result = await request('https://api.linkedin.com/rest/posts', { method: 'POST', headers: h,
          body: { author: job.account.author, commentary: job.payload.commentary, visibility: 'PUBLIC',
            distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
            lifecycleState: 'PUBLISHED', isReshareDisabledByAuthor: false } });
        const id = result.headers.get('x-restli-id');
        if (!id) throw new PublicationError('LinkedIn response omitted the publication id.', { ambiguous: true });
        return { id, url: `https://www.linkedin.com/feed/update/${id}/`, channel: job.channel };
      }
      throw new Error('This channel needs an authenticated browser or connector.');
    },
    async verify(job, receipt) {
      const h = await headers(job);
      let url;
      if (job.channel === 'github') url = `https://api.github.com/repos/${job.account.repository}/releases/${encodeURIComponent(receipt.id)}`;
      if (job.channel === 'devto') url = `https://dev.to/api/articles/${encodeURIComponent(receipt.id)}`;
      if (job.channel === 'x') url = `https://api.x.com/2/tweets/${encodeURIComponent(receipt.id)}?tweet.fields=public_metrics,author_id,entities`;
      if (job.channel === 'linkedin') url = `https://api.linkedin.com/rest/posts/${encodeURIComponent(receipt.id)}`;
      if (!url) throw new Error('Verify this publication through its authenticated browser or connector.');
      const result = await request(url, { headers: h });
      const data = result.data;
      let matches = false, metrics = {};
      if (job.channel === 'github') matches = String(data.id) === receipt.id && data.body === job.payload.body && data.draft === false;
      if (job.channel === 'devto') {
        matches = String(data.id) === receipt.id && data.title === job.payload.article.title && data.body_markdown === job.payload.article.body_markdown && data.user?.username?.toLowerCase() === job.account.username.toLowerCase();
        metrics = { reactions: data.public_reactions_count, comments: data.comments_count, views: data.page_views_count };
      }
      if (job.channel === 'x') {
        let expanded = data.data?.text || '';
        for (const link of data.data?.entities?.urls || []) expanded = expanded.replaceAll(link.url, link.expanded_url);
        matches = data.data?.id === receipt.id && data.data?.author_id === job.account.userId && expanded === job.payload.text;
        metrics = data.data?.public_metrics || {};
      }
      if (job.channel === 'linkedin') matches = data.author === job.account.author && data.commentary === job.payload.commentary && data.lifecycleState === 'PUBLISHED';
      if (!matches) throw new Error('Publication exists but does not match the expected account/content.');
      return { checkedAt: new Date().toISOString(), matches, metrics };
    },
  };
}

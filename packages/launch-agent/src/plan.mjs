import { readFile, readdir, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';

export const digest = (value) => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
export const apiChannels = new Set(['github', 'devto', 'linkedin', 'x']);

export async function safeFile(root, path) {
  const base = await realpath(root);
  const full = await realpath(resolve(base, path));
  const rel = relative(base, full);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('Source must stay inside the workspace.');
  return full;
}

export function section(md, heading, level = 2) {
  const lines = md.replace(/\r/g, '').split('\n');
  const marker = '#'.repeat(level) + ' ' + heading;
  const start = lines.indexOf(marker);
  if (start < 0) throw new Error(`Missing source section: ${heading}`);
  const tail = lines.slice(start + 1);
  const end = tail.findIndex(line => new RegExp(`^#{1,${level}} `).test(line));
  return tail.slice(0, end < 0 ? undefined : end).join('\n').trim();
}

function track(text, campaign, channel) {
  return text.replace(/https:\/\/easap\.dev(?:\/[a-zA-Z0-9/-]*)?/g, raw => {
    const url = new URL(raw);
    url.searchParams.set('utm_source', channel);
    url.searchParams.set('utm_medium', channel === 'devto' ? 'article' : 'launch');
    url.searchParams.set('utm_campaign', campaign);
    return url.href;
  });
}

export function contentProblems(job) {
  const text = JSON.stringify(job.payload);
  const issues = [];
  if (/\[(?:FIRST NAME|FOUNDER NAME|LAUNCH DATE|CONTACT EMAIL|PUBLISHED ARTICLE URL|TODO[^\]]*)\]/i.test(text)) issues.push('unresolved placeholder');
  if (!job.title || !job.payload || !job.body.trim()) issues.push('missing content');
  if (job.channel === 'x') {
    // Conservative count: URLs use X's shortened length, other codepoints use 2.
    const urls = job.payload.text.match(/https?:\/\/\S+/g) || [];
    const plain = job.payload.text.replace(/https?:\/\/\S+/g, '');
    const count = [...plain].reduce((n, c) => n + (c.codePointAt(0) <= 0x10ff ? 1 : 2), 0) + urls.length * 23;
    if (count > 280) issues.push(`X post exceeds 280 weighted characters (${count})`);
  }
  if (job.channel === 'linkedin' && job.payload.commentary.length > 3000) issues.push('LinkedIn post exceeds 3000 characters');
  return issues;
}

export async function buildPlan(root, config) {
  if (!/^[a-z0-9-]+$/.test(config.id)) throw new Error('Campaign id must use lowercase letters, digits, and hyphens.');
  if (config.startsAt !== null && !Number.isFinite(Date.parse(config.startsAt))) throw new Error('startsAt must be an ISO timestamp or null.');
  const packagePath = config.sourcePackage;
  const source = await readFile(await safeFile(root, `${packagePath}/02-platform-posts.md`), 'utf8');
  const jobs = [];
  const mediaPath = `${packagePath}/assets/easap-developer-tools.gif`;
  const mediaByChannel = {};
  const mediaNames = {
    linkedin:['easap-launch-hero.mp4'], youtube:['easap-launch-hero.mp4'],
    producthunt:['easap-thumbnail-240.gif','readiness-planner-poster.png','public-agent-connector-poster.png','live-assurance-campaign-poster.png','role-guides-poster.png'],
    hackernews:['live-assurance-campaign.gif'], devto:['easap-developer-tools-poster.png'],
  };
  for (const channel of Object.keys(config.channels)) {
    mediaByChannel[channel] = [];
    for (const name of mediaNames[channel] || ['easap-developer-tools.gif']) {
      const path = `${packagePath}/assets/${name}`;
      mediaByChannel[channel].push({ path, sha256:digest(await readFile(await safeFile(root,path))), alt:`EASAP product workflow: ${name.replace(/\.(gif|mp4|png)$/, '').replaceAll('-', ' ')}. Reference evidence, not production certification.` });
    }
  }
  function add(id, channel, title, body, payload, day = 0, dependsOn = []) {
    const account = config.channels[channel];
    if (!account?.enabled) return;
    const job = { id, channel, title, body, payload, day, dependsOn, account,
      assets: mediaByChannel[channel],
      mode: apiChannels.has(channel) && account.delivery !== 'browser' ? 'api' : 'browser-or-connector',
      dueAt: config.startsAt ? new Date(Date.parse(config.startsAt) + day * 86400000).toISOString() : null };
    job.problems = contentProblems(job);
    job.digest = digest({ campaign: config.id, ...job });
    jobs.push(job);
  }
  const release = `# EASAP developer tools\n\nRun an executable enterprise-agent assurance reference campaign:\n\n\`\`\`bash\nnpx @mlmrx/easap\n\`\`\`\n\nIncludes a JavaScript SDK, readiness planning, authorized public-agent checks, and a Codex developer plugin.\n\n[Developer guide](https://easap.dev/developers) · [npm](https://www.npmjs.com/package/@mlmrx/easap)\n\n![Developer workflow](https://raw.githubusercontent.com/${config.repository}/main/${mediaPath})\n\nThis is STANDARD reference evidence. It is not production safety certification. The public connector requires ownership verification and supports unauthenticated public HTTPS JSON endpoints.\n`;
  add('github-release', 'github', 'EASAP developer launch: CLI, SDK, and Codex plugin', release,
    { tag_name: config.channels.github.tag, target_commitish: config.channels.github.target, name: 'EASAP developer launch: CLI, SDK, and Codex plugin', body: release, draft: false, prerelease: false });
  const linkedin = track(section(section(source, 'LinkedIn'), 'Founder launch post', 3).replace(/\*\*/g, ''), config.id, 'linkedin');
  add('linkedin-launch', 'linkedin', 'Founder launch post', linkedin, { commentary: linkedin });
  const tweets = [
    'EASAP developer tools are live. Run: npx @mlmrx/easap\n\nGet an executable reference campaign and JSON evidence. Includes a JavaScript SDK and Codex plugin.\n\nhttps://easap.dev/developers',
    'Start with an agent readiness plan, or verify ownership of a public HTTPS JSON endpoint and run four bounded checks.\n\nhttps://easap.dev/assess',
    'The boundary matters: reference campaigns and public probes provide scoped evidence. They are not production safety certification.\n\nRun locally or point the CLI at your preferred EASAP host.\n\nhttps://easap.dev/developers',
  ];
  tweets.forEach((body, i) => {
    body = track(body, config.id, 'x');
    add(`x-launch-${i+1}`, 'x', `Developer launch thread ${i+1}/3`, body, { text: body }, 0, i ? [`x-launch-${i}`] : []);
  });
  const articleDir = await safeFile(root, `${packagePath}/articles`);
  for (const [index, filename] of (await readdir(articleDir)).filter(f => /^\d.*\.md$/.test(f)).sort().entries()) {
    const raw = await readFile(await safeFile(root, `${packagePath}/articles/${filename}`), 'utf8');
    const title = raw.match(/^title:\s*"(.+)"/m)?.[1];
    const description = raw.match(/^description:\s*"(.+)"/m)?.[1];
    const body = track(raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').replace(/^\s*# .+\r?\n/, '').trim(), config.id, 'devto');
    add(`devto-article-${index+1}`, 'devto', title, body,
      { article: { title, description, body_markdown: body, published: true, tags: ['ai', 'opensource', 'security', 'devtools'] } }, index * 3);
  }
  for (const [channel, heading, day] of [['producthunt', 'Product Hunt', 0], ['hackernews', 'Hacker News', 0], ['reddit', 'Reddit', 1], ['hashnode', 'Dev.to / Hashnode', 2], ['email', 'Launch email', 1], ['communities', 'Slack / Teams community post', 1], ['youtube', 'YouTube / demo page', 0]]) {
    let body = section(source, heading);
    if (channel === 'hashnode') body = jobs.find(j=>j.id === 'devto-article-1')?.body || body;
    if (channel === 'youtube') body = `Title: EASAP product preview: evidence before authority\n\nUpload: ${packagePath}/assets/easap-launch-hero.mp4\n\nAn overview of the readiness planner, verified public-agent connector, reference campaign, and role guides.\n\nTry it: https://easap.dev/assess\nDeveloper tools: https://easap.dev/developers\nSource: https://github.com/${config.repository}\n\nEASAP is a STANDARD reference implementation. Reference evidence is not production certification.\n\nNo chapter timestamps are claimed for this short product preview.`;
    add(`${channel}-launch`, channel, `${heading} launch`, body, { text: body, destination: config.channels[channel]?.destination || '' }, day);
  }
  return { id: config.id, name: config.name, generatedAt: new Date().toISOString(), startsAt: config.startsAt, jobs };
}

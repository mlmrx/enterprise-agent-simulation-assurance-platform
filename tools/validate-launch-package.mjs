import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "launch", "2026-09");
const assets = join(root, "assets");
const articles = join(root, "articles");
const failures = [];

const required = [
  "README.md",
  "01-positioning-and-messaging.md",
  "02-platform-posts.md",
  "03-launch-calendar.md",
  "04-demo-faq-and-sales-enablement.md",
  "05-press-and-analyst-brief.md",
  "articles/README.md",
  "assets/README.md",
];

for (const path of required) {
  try {
    if (!statSync(join(root, path)).isFile()) failures.push(`${path} is not a file`);
  } catch {
    failures.push(`${path} is missing`);
  }
}

const articleFiles = readdirSync(articles).filter((name) => /^\d\d-.*\.md$/.test(name));
if (articleFiles.length !== 6) failures.push(`expected 6 launch articles; found ${articleFiles.length}`);
for (const name of articleFiles) {
  const text = readFileSync(join(articles, name), "utf8");
  for (const key of ["title:", "description:", "audience:", "canonical_url:", "feature_media:", "primary_cta:"]) {
    if (!text.includes(key)) failures.push(`${name} is missing front-matter field ${key}`);
  }
  if (!/not (?:a certification|certify|proof)|does not (?:certify|prove)/i.test(text)) {
    failures.push(`${name} is missing an explicit assurance boundary`);
  }
}

function gifDimensions(path) {
  const value = readFileSync(path);
  if (value.subarray(0, 3).toString("ascii") !== "GIF") throw new Error("not a GIF");
  return [value.readUInt16LE(6), value.readUInt16LE(8)];
}

function pngDimensions(path) {
  const value = readFileSync(path);
  const signature = value.subarray(1, 4).toString("ascii");
  if (signature !== "PNG") throw new Error("not a PNG");
  return [value.readUInt32BE(16), value.readUInt32BE(20)];
}

const featureSlugs = ["easap-launch-hero", "readiness-planner", "public-agent-connector", "live-assurance-campaign", "role-guides"];
for (const slug of featureSlugs) {
  const gif = join(assets, `${slug}.gif`);
  const mp4 = join(assets, `${slug}.mp4`);
  try {
    const [width, height] = gifDimensions(gif);
    if (width !== 960 || height !== 576) failures.push(`${slug}.gif must be 960x576; found ${width}x${height}`);
    if (statSync(gif).size > 5 * 1024 * 1024) failures.push(`${slug}.gif exceeds the 5 MB portable target`);
    if (!statSync(mp4).isFile() || statSync(mp4).size === 0) failures.push(`${slug}.mp4 is missing or empty`);
  } catch (error) {
    failures.push(`${slug}: ${error.message}`);
  }
}

for (const slug of featureSlugs.filter((slug) => slug !== "easap-launch-hero")) {
  try {
    const [width, height] = pngDimensions(join(assets, `${slug}-poster.png`));
    if (width !== 1270 || height !== 760) failures.push(`${slug}-poster.png must be 1270x760; found ${width}x${height}`);
  } catch (error) {
    failures.push(`${slug}-poster.png: ${error.message}`);
  }
}

try {
  const thumbnail = join(assets, "easap-thumbnail-240.gif");
  const [width, height] = gifDimensions(thumbnail);
  if (width !== 240 || height !== 240) failures.push(`thumbnail must be 240x240; found ${width}x${height}`);
  if (statSync(thumbnail).size > 3 * 1024 * 1024) failures.push("thumbnail exceeds 3 MB");
} catch (error) {
  failures.push(`thumbnail: ${error.message}`);
}

const platformCopy = readFileSync(join(root, "02-platform-posts.md"), "utf8");
const productHuntDescription = platformCopy.match(/\*\*Description:\*\* ([^\n]+)/)?.[1] ?? "";
if (!productHuntDescription) failures.push("Product Hunt description was not found");
if (productHuntDescription.length > 260) failures.push(`Product Hunt description is ${productHuntDescription.length} characters; maximum is 260`);

for (const link of ["https://easap.dev/assess", "https://easap.dev/connect", "https://easap.dev/platform", "https://github.com/mlmrx/enterprise-agent-simulation-assurance-platform"]) {
  if (!platformCopy.includes(link)) failures.push(`platform copy is missing primary link ${link}`);
}

if (failures.length) {
  console.error("Launch package validation failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Launch package validated: ${articleFiles.length} articles, ${featureSlugs.length} GIF/MP4 pairs, 4 gallery posters, and 1 square thumbnail.`);


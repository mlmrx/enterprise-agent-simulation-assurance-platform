import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const publicDir = new URL("../public/", import.meta.url);
const mark = await readFile(new URL("brand/easap-mark.svg", publicDir), "utf8");
await writeFile(new URL("favicon.svg", publicDir), mark);

// Outlined lettering keeps the downloadable lockup independent of installed fonts.
const letters = `<path fill-rule="evenodd" d="M88 15H115V22H96V28H113V35H96V42H115V49H88Z M123 49L136 15H146L159 49H150L148 42H134L132 49Z M136 35H146L141 22Z M193 15V22H175V28H186Q196 28 196 38V39Q196 49 186 49H166V42H185Q188 42 188 39V38Q188 35 185 35H176Q166 35 166 25Q166 15 176 15Z M204 49L217 15H227L240 49H231L229 42H215L213 49Z M217 35H227L222 22Z M248 15H266Q279 15 279 27Q279 39 266 39H256V49H248Z M256 22V32H265Q271 32 271 27Q271 22 265 22Z"/>`;
const markBody = mark.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
for (const [name, color] of [["easap-logo", "#081A33"], ["easap-logo-light", "#F5F8FC"]]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="64" viewBox="0 0 280 64" role="img" aria-label="EASAP">${markBody}<g fill="${color}">${letters}</g></svg>\n`;
  await writeFile(new URL(`brand/${name}.svg`, publicDir), svg);
  await writeFile(new URL(`brand/${name}.png`, publicDir), await sharp(Buffer.from(svg)).resize(1120, 256).png().toBuffer());
}

for (const [file, size] of [["favicon-16.png", 16], ["favicon-32.png", 32], ["apple-touch-icon.png", 180], ["brand/easap-mark-192.png", 192], ["brand/easap-mark-512.png", 512]]) {
  await writeFile(new URL(file, publicDir), await sharp(Buffer.from(mark)).resize(size, size).png().toBuffer());
}

// ICO embeds PNG frames so Windows and older browsers have a native fallback.
const sizes = [16, 32, 48, 256];
const frames = await Promise.all(sizes.map((size) => sharp(Buffer.from(mark)).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * frames.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach((frame, i) => {
  const entry = 6 + 16 * i;
  header[entry] = sizes[i] % 256;
  header[entry + 1] = sizes[i] % 256;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frame.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await writeFile(new URL("favicon.ico", publicDir), Buffer.concat([header, ...frames]));
console.log("Generated EASAP vector lockups, PNG icons, Apple touch icon, and multi-size ICO.");

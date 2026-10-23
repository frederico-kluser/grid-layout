import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const url = process.argv[2];
const outDir = process.argv[3] ?? '.';
const width = Number(process.argv[4] ?? 1024);
const height = Number(process.argv[5] ?? 768);
if (!url) {
  console.error('usage: node shot.mjs <url> <outDir> [width] [height]');
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error' && !/favicon/i.test(msg.text()) && !/status of 404|File not found/i.test(msg.text())) errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(String(err)));
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}' });
await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
await page.screenshot({ path: path.join(outDir, `desktop-${width}x${height}.png`), fullPage: true });
console.log(`${width}x${height} page=${scrollHeight}px errors=${errors.length}`);
if (errors.length) console.log(errors.join('\n'));
await context.close();
await browser.close();

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const url = process.argv[2];
const outDir = process.argv[3] ?? 'out';
if (!url) {
  console.error('usage: node shot.mjs <url> <outDir>');
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];

async function capture(name, viewport, isMobile = false) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile,
    hasTouch: isMobile,
  });
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: '*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}',
  });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
  console.log(`${name}: viewport ${viewport.width}x${viewport.height}, page ${height}px, errors ${errors.length}`);
  await context.close();
  return height;
}

await capture('desktop', { width: 1440, height: 1340 });
await capture('mobile', { width: 390, height: 844 }, true);
await browser.close();
if (errors.length) {
  console.log('--- console errors ---');
  for (const error of errors) console.log(error);
}

import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [, , label, url, outDirArg] = process.argv;
if (!label || !url) {
  console.error('usage: node measure.mjs <label> <url> <outDir>');
  process.exit(2);
}
const outDir = path.resolve(outDirArg ?? 'out');
mkdirSync(outDir, { recursive: true });
const axeSource = readFileSync(new URL('./node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');

const DESKTOP = { width: 1440, height: 1340 };
const MOBILE = { width: 390, height: 844 };

const TEXT_KEYS = [
  'Financial overview',
  'Track revenue, churn and cash flow across all entities.',
  'Total revenue',
  'Active customers',
  'Conversion rate',
  'Churn rate',
  '$128,430',
  '8,942',
  '4.86%',
  '1.9%',
  'Revenue',
  '$1.24M',
  'Traffic sources',
  '48.2k',
  'Recent transactions',
  'Team activity',
  'Documentation',
  'Orbit',
  'Acme Corp',
  'New report',
  'Export',
];

const browser = await chromium.launch({ channel: 'chrome' });
const result = { label, url, capturedAt: new Date().toISOString(), desktop: {}, mobile: {}, consoleErrors: [] };

async function openPage(viewport, isMobile = false) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile,
    hasTouch: isMobile,
    colorScheme: 'light',
    locale: 'en-US',
  });
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/favicon/i.test(msg.text()) && !/status of 404|File not found/i.test(msg.text())) result.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => result.consoleErrors.push(`pageerror: ${err.message}`));
  await page.addInitScript(() => {
    window.__lcp = 0;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__lcp = entry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      /* ignore */
    }
  });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content:
      '*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}',
  });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  return { context, page };
}

async function collectPerf(page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paints = performance.getEntriesByType('paint');
    const fcp = paints.find((p) => p.name === 'first-contentful-paint');
    const resources = performance.getEntriesByType('resource');
    const transferBytes =
      resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0) + (nav?.transferSize || 0);
    const h1 = [...document.querySelectorAll('h1')].map((el) => el.textContent?.trim()).slice(0, 5);
    const h2 = [...document.querySelectorAll('h2')].map((el) => el.textContent?.trim()).slice(0, 8);
    return {
      fcp: fcp ? Math.round(fcp.startTime) : null,
      lcp: window.__lcp ? Math.round(window.__lcp) : null,
      domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      load: nav ? Math.round(nav.loadEventEnd) : null,
      transferBytes,
      resourceCount: resources.length,
      domNodes: document.querySelectorAll('*').length,
      muiNodes: document.querySelectorAll('[class*="Mui"]').length,
      h1,
      h2,
      title: document.title,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      fontFamily: getComputedStyle(document.querySelector('h1') || document.body).fontFamily,
      robotoLoaded: document.fonts.check('16px Roboto'),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      bodyScrollWidth: document.body.scrollWidth,
      bodyScrollHeight: document.body.scrollHeight,
    };
  });
}

async function collectBoxes(page) {
  const boxes = {};
  for (const key of TEXT_KEYS) {
    let locator = page.getByText(key, { exact: true });
    let partial = false;
    let count = await locator.count();
    if (count === 0) {
      locator = page.getByText(key);
      count = await locator.count();
      partial = count > 0;
    }
    if (count === 0) {
      boxes[key] = null;
      continue;
    }
    let box = null;
    try {
      box = await locator.first().evaluate((node) => {
        const range = document.createRange();
        range.selectNodeContents(node);
        const rect = range.getBoundingClientRect();
        if (!rect.width && !rect.height) return null;
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      });
    } catch {
      box = null;
    }
    if (!box) {
      try {
        box = await locator.first().boundingBox();
      } catch {
        box = null;
      }
    }
    boxes[key] = box
      ? {
          x: Math.round(box.x),
          y: Math.round(box.y),
          w: Math.round(box.width),
          h: Math.round(box.height),
          matches: count,
          partial,
        }
      : null;
  }
  return boxes;
}

async function runAxe(page) {
  try {
    await page.addScriptTag({ content: axeSource });
    const report = await page.evaluate(async () => {
      const r = await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      });
      return {
        violations: r.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
          help: v.help,
        })),
        passes: r.passes.length,
        incomplete: r.incomplete.length,
      };
    });
    return { ...report, violationCount: report.violations.length, nodeCount: report.violations.reduce((s, v) => s + v.nodes, 0) };
  } catch (error) {
    return { error: String(error) };
  }
}

async function themeTest(page) {
  const button = page
    .locator('[aria-label*="dark" i], [aria-label*="light" i], [aria-label*="theme" i], [aria-label*="color mode" i]')
    .first();
  const count = await button.count();
  if (!count) return { found: false };
  const readTheme = () =>
    page.evaluate(() => ({
      body: getComputedStyle(document.body).backgroundColor,
      html: document.documentElement.className,
      attr: document.documentElement.getAttribute('data-mui-color-scheme'),
      colorScheme: getComputedStyle(document.documentElement).colorScheme,
    }));
  const before = await readTheme();
  try {
    await button.click({ timeout: 2500 });
  } catch (error) {
    return { found: true, clickError: String(error), before };
  }
  await page.waitForTimeout(500);
  const after = await readTheme();
  return {
    found: true,
    before,
    after,
    changed: before.body !== after.body || before.html !== after.html || before.attr !== after.attr,
    ariaLabel: await button.getAttribute('aria-label').catch(() => null),
  };
}

async function drawerTest(page) {
  const button = page.locator('button[aria-label*="menu" i], button[aria-label*="navigation" i], button[aria-label*="drawer" i]').first();
  if (!(await button.count())) return { found: false };
  try {
    await button.click({ timeout: 2500 });
  } catch (error) {
    return { found: true, clickError: String(error) };
  }
  await page.waitForTimeout(500);
  const papers = await page.evaluate(() =>
    [...document.querySelectorAll('.MuiDrawer-paper')].map((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        visible: style.visibility !== 'hidden' && style.display !== 'none',
      };
    }),
  );
  const opened = papers.some((paper) => paper.visible && paper.width > 50 && paper.height > 50);
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);
  return { found: true, opened, papers };
}

// ---------------- desktop ----------------
try {
  const { context, page } = await openPage(DESKTOP, false);
  result.desktop.perf = await collectPerf(page);
  result.desktop.boxes = await collectBoxes(page);
  await page.screenshot({ path: path.join(outDir, `${label}-desktop.png`), fullPage: true });
  result.desktop.axe = await runAxe(page);
  const theme = await themeTest(page);
  result.desktop.theme = theme;
  if (theme.found && theme.changed) {
    await page.screenshot({ path: path.join(outDir, `${label}-dark.png`), fullPage: true });
  }
  result.desktop.finalScrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  await context.close();
} catch (error) {
  result.desktop.error = String(error);
}

// ---------------- mobile ----------------
try {
  const { context, page } = await openPage(MOBILE, true);
  result.mobile.perf = await collectPerf(page);
  result.mobile.boxes = await collectBoxes(page);
  result.mobile.overflowX = (result.mobile.perf.scrollWidth ?? 0) > (result.mobile.perf.clientWidth ?? 0);
  await page.screenshot({ path: path.join(outDir, `${label}-mobile.png`), fullPage: true });
  await page.screenshot({ path: path.join(outDir, `${label}-mobile-fold.png`), fullPage: false });
  result.mobile.drawer = await drawerTest(page);
  result.mobile.axe = await runAxe(page);
  result.mobile.finalScrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  await context.close();
} catch (error) {
  result.mobile.error = String(error);
}

await browser.close();
writeFileSync(path.join(outDir, `${label}.json`), JSON.stringify(result, null, 2));
console.log(
  JSON.stringify(
    {
      label,
      desktopError: result.desktop.error,
      mobileError: result.mobile.error,
      desktopHeight: result.desktop.finalScrollHeight,
      mobileHeight: result.mobile.finalScrollHeight,
      overflowX: result.mobile.overflowX,
      axeDesktop: result.desktop.axe?.violationCount,
      axeMobile: result.mobile.axe?.violationCount,
      themeChanged: result.desktop.theme?.changed,
      drawerOpened: result.mobile.drawer?.opened,
      consoleErrors: result.consoleErrors.length,
    },
    null,
    2,
  ),
);

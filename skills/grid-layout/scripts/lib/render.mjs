// lib/render.mjs — capturas determinísticas com Chromium (playwright-core).
//
// Determinismo imposto: viewport+DPR fixos, animações/transições mortas,
// caret oculto, fonts.ready + decode() de todas as imagens antes do clique,
// rede externa bloqueada (fontes/CDNs quebram o paralelismo e a reprodutibilidade).
//
// Cadeia de browser: $GL_BROWSER → chromium do Playwright → chrome/msedge do
// sistema → caminhos conhecidos. `gl doctor` mostra o que foi encontrado.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fail, note, EXIT } from './util.mjs';

const KILL_ANIMATIONS = '*{animation:none!important;transition:none!important;scroll-behavior:auto!important}html{caret-color:transparent!important}';

const SYSTEM_BROWSERS = [
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];

export async function launchBrowser() {
  const { chromium } = await import('playwright-core');
  const attempts = [];

  const envPath = process.env.GL_BROWSER;
  if (envPath) {
    try {
      const b = await chromium.launch({ executablePath: envPath, args: ['--force-color-profile=srgb'] });
      return { browser: b, via: `GL_BROWSER=${envPath}`, attempts };
    } catch (e) {
      attempts.push(`GL_BROWSER (${envPath}): ${e.message.split('\n')[0]}`);
    }
  }

  try {
    const b = await chromium.launch({ args: ['--force-color-profile=srgb'] });
    return { browser: b, via: 'chromium do Playwright', attempts };
  } catch (e) {
    attempts.push(`playwright-core: ${e.message.split('\n')[0]}`);
  }

  for (const channel of ['chrome', 'msedge']) {
    try {
      const b = await chromium.launch({ channel, args: ['--force-color-profile=srgb'] });
      return { browser: b, via: `channel ${channel}`, attempts };
    } catch (e) {
      attempts.push(`channel ${channel}: ${e.message.split('\n')[0]}`);
    }
  }

  for (const exe of SYSTEM_BROWSERS) {
    if (!fs.existsSync(exe)) continue;
    try {
      const b = await chromium.launch({ executablePath: exe, args: ['--force-color-profile=srgb'] });
      return { browser: b, via: exe, attempts };
    } catch (e) {
      attempts.push(`${exe}: ${e.message.split('\n')[0]}`);
    }
  }

  fail(
    'nenhum browser Chromium/Chrome disponível para capturas',
    'instale o Chrome OU corra `node scripts/gl.mjs doctor --install` (baixa o Chromium do Playwright) OU defina GL_BROWSER=/caminho/para/chrome',
    EXIT.TOOL,
  );
}

export async function withBrowser(fn) {
  const { browser, via, attempts } = await launchBrowser();
  note(`browser: ${via}`);
  try {
    return await fn(browser, via);
  } finally {
    await browser.close();
  }
}

function targetUrl(fileOrUrl) {
  if (/^(https?|file|data|about):/.test(fileOrUrl)) return fileOrUrl;
  return pathToFileURL(path.resolve(fileOrUrl)).href;
}

// Captura determinística de um ficheiro/URL.
// opts: {out, cssW, cssH, dpr, selector, measure, allowNet, full}
export async function shot(browser, opts) {
  const {
    out, cssW = 1440, cssH = 900, dpr = 1, selector = null,
    measure = null, allowNet = false, full = false, file, url,
  } = opts;
  const blocked = [];
  const context = await browser.newContext({
    viewport: { width: Math.round(cssW), height: Math.round(cssH) },
    deviceScaleFactor: dpr,
    reducedMotion: 'reduce',
  });
  if (!allowNet) {
    await context.route('**/*', (route) => {
      const u = route.request().url();
      const local = /^(file:|data:|about:|blob:)/.test(u) || /^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(u);
      if (local) return route.continue();
      blocked.push(u);
      return route.abort();
    });
  }
  const page = await context.newPage();
  const target = targetUrl(url || file);
  try {
    await page.goto(target, { waitUntil: 'load', timeout: 30000 });
  } catch (e) {
    await context.close();
    fail(`não abriu ${target}: ${e.message.split('\n')[0]}`, 'confirme o caminho/URL e que a página carrega sozinha', EXIT.INPUT);
  }
  await page.addStyleTag({ content: KILL_ANIMATIONS }).catch(() => {});
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((img) => (img.complete ? null : img.decode().catch(() => {}))));
  });

  let measurements = null;
  const probeSel = measure || selector;
  if (probeSel) {
    measurements = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      const stage = document.getElementById('gl-stage') || document.body;
      const r = el ? el.getBoundingClientRect() : null;
      return {
        selector: sel,
        found: Boolean(el),
        rect: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null,
        stage: {
          clientW: stage.clientWidth, clientH: stage.clientHeight,
          scrollW: stage.scrollWidth, scrollH: stage.scrollHeight,
        },
        doc: {
          scrollW: document.documentElement.scrollWidth,
          scrollH: document.documentElement.scrollHeight,
        },
      };
    }, probeSel);
  }

  const shotOpts = {
    path: out,
    animations: 'disabled',
    caret: 'hide',
    scale: 'device',
  };
  if (selector) {
    const el = await page.$(selector);
    if (!el) {
      await context.close();
      fail(`seletor não encontrado: ${selector}`, 'o elemento raiz do componente tem de existir no preview', EXIT.INPUT);
    }
    const rect = measurements && measurements.rect ? measurements.rect : await el.boundingBox();
    if (!rect || rect.width < 1 || rect.height < 1) {
      await context.close();
      fail(
        `elemento ${selector} tem tamanho ${rect ? `${rect.width}×${rect.height}` : 'zero'} — captura impossível`,
        'o root tem de preencher a caixa do componente (width:100%;height:100%)',
        EXIT.FAIL,
      );
    }
    try {
      await el.screenshot(shotOpts);
    } catch (e) {
      await context.close();
      fail(`captura de ${selector} falhou: ${e.message.split('\n')[0]}`, 'confirme que o elemento é visível e está dentro do preview', EXIT.FAIL);
    }
  } else if (full) {
    await page.screenshot({ ...shotOpts, fullPage: true });
  } else {
    await page.screenshot({ ...shotOpts, clip: { x: 0, y: 0, width: Math.round(cssW), height: Math.round(cssH) } });
  }
  await context.close();

  const outPath = path.resolve(out);
  return {
    out: outPath,
    width: Math.round(cssW * dpr),
    height: Math.round(cssH * dpr),
    dpr,
    target,
    measurements,
    blockedRequests: blocked,
    warnings: blocked.length
      ? [`${blocked.length} pedido(s) externo(s) bloqueado(s) — use fontes/ativos locais`]
      : [],
  };
}

// Normaliza qualquer formato para PNG através do canvas do browser.
// `drawImage` de <img> aplica o EXIF orientation — exatamente o que se quer.
export async function normalizeImageToPng(srcFile, outFile) {
  const { chromium } = await import('playwright-core');
  const { browser } = await launchBrowser();
  try {
    const page = await browser.newPage();
    const srcUrl = targetUrl(srcFile);
    const dataUrl = await page.evaluate(async (u) => {
      const img = new Image();
      img.src = u;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      return c.toDataURL('image/png');
    }, srcUrl);
    const b64 = dataUrl.split(',')[1];
    fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    fs.writeFileSync(outFile, Buffer.from(b64, 'base64'));
    return path.resolve(outFile);
  } finally {
    await browser.close();
  }
}

#!/usr/bin/env node
// gl.mjs — motor determinístico da skill grid-layout.
//
// Contrato de saída: dados em stdout (JSON), narração em stderr,
// erros no formato `Erro: <o quê> — Solução: <o que fazer>` (exit ≠ 0).
// Uso: node scripts/gl.mjs <comando> [subcomando] [--flags]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fail, note, jsonOut, parseArgs, need, num, bool, readJson, writeJson,
  ensureDir, listFiles, parseBox, parseHex, toHex, colorDist, sha256File, EXIT,
} from './lib/util.mjs';
import {
  makeImage, readImage, writeImage, crop as cropImg, resizeNearest,
  pixel, fillRect, strokeRect, drawLine, toGray, cloneImage,
} from './lib/imgio.mjs';
import { drawText, textSize } from './lib/font.mjs';
import {
  drawCellGrid, drawRulerGrid, dimOutside, drawChip, drawIdentity, labelScaleFor,
} from './lib/overlay.mjs';
import {
  resolveCellPath, toLogical, logicalBox, boxFromArr, boxToArr, clampBox,
} from './lib/geom.mjs';
import { diffImages, compare, sceneMetrics, thresholdsFor, DEFAULT_THRESHOLDS } from './lib/metrics.mjs';
import {
  PLAN_VERSION, skeletonPlan, loadPlan, savePlan, validatePlan, leavesOf, findLeaf,
  nodeBox, prepOne, prepAll, leafNeighbors, detectBackdrop, GL_MJS,
} from './lib/plan.mjs';
import { writePreview, assemblePage, readFragment, rewriteFragmentAssets } from './lib/assemble.mjs';
import { writeReport } from './lib/report.mjs';
import { segmentImage } from './lib/segment.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(HERE, '..');

const HELP = `gl — motor determinístico da skill grid-layout

  gl doctor [--install]                  ambiente pronto? (--install instala deps)
  gl init --image REF [--ws DIR] [--dpr N | --css-width N]
                                         prepara o workspace (reference/ + plan.json)
  gl grid --image REF --out P [--cols N --rows N | --step N] [--region x,y,w,h]
                                         sobreposição de grelha rotulada
  gl zoom --image REF --out P (--cell B2.C1 | --crop x,y,w,h)
                                         zoom contextual com contexto escurecido
  gl probe colors --image REF --at nome=x,y,...
  gl probe palette --image REF [--region x,y,w,h] [--k N] [--bbox]
  gl probe box --image REF --color #hex [--tol N] [--region x,y,w,h]
  gl probe bbox --image REF [--region x,y,w,h] [--bg auto|#hex] [--tol N]
  gl probe runs --image REF (--row N | --col N) [--tol N] [--min N] [--color #hex]
  gl probe bands --image REF [--region x,y,w,h] --direction row|col [--min-gap N]
  gl segment --image REF [--out-seg P] [--out-overlay P] [--min-gap N] [--depth N]
  gl plan check [--ws DIR]                valida a partição do plan.json
  gl plan skeleton [--ws DIR]             recria plan.json a partir da referência
  gl prep [--ws DIR] [--id ID]            gera pacotes de trabalho por componente
  gl shot (--file F | --url U) --out P [--w N --h N --dpr N] [--selector S]
  gl verify [--ws DIR] (--id ID | --all)  preview + captura + diff por componente
  gl diff --ref A --cand B [--out-dir D]  paridade de duas imagens
  gl assemble [--ws DIR] [--out DIR]      monta page/index.html a partir da árvore
  gl status [--ws DIR]                    estado de todos os componentes
  gl report [--ws DIR]                    report/index.html + summary.md
  gl crop --image REF --box x,y,w,h --out P   extrai ativo de imagem

Saída: JSON em stdout · narração em stderr · erros "Erro: … — Solução: …".`;

const cmd = process.argv[2];
const { flags, positional } = parseArgs(process.argv.slice(3));

function wsDir() {
  return path.resolve(flags.ws || '.');
}

function planPath(ws) {
  return flags.plan ? path.resolve(flags.plan) : path.join(ws, 'plan.json');
}

// --------------------------------------------------------------------------
// doctor
// --------------------------------------------------------------------------
async function cmdDoctor() {
  const checks = [];
  const nodeOk = Number(process.versions.node.split('.')[0]) >= 20;
  checks.push({ check: 'node >= 20', ok: nodeOk, detail: process.version });

  if (bool(flags.install, false)) {
    note('a instalar dependências (npm install)…');
    const { execSync } = await import('node:child_process');
    execSync('npm install --no-audit --no-fund', { cwd: SKILL_DIR, stdio: 'inherit' });
  }
  let depsOk = true;
  let depsDetail = '';
  try {
    await import('playwright-core');
    await import('pngjs');
    await import('pixelmatch');
    depsDetail = 'playwright-core · pngjs · pixelmatch';
  } catch (e) {
    depsOk = false;
    depsDetail = `${e.message.split('\n')[0]} — corra: node scripts/gl.mjs doctor --install`;
  }
  checks.push({ check: 'dependências', ok: depsOk, detail: depsDetail });

  let browserOk = false;
  let browserDetail = 'não testado';
  if (depsOk) {
    try {
      const { launchBrowser } = await import('./lib/render.mjs');
      const { browser, via } = await launchBrowser();
      await browser.close();
      browserOk = true;
      browserDetail = via;
    } catch (e) {
      browserDetail = e.message.split('\n')[0];
    }
  }
  checks.push({ check: 'browser', ok: browserOk, detail: browserDetail });

  let skillOk = true;
  let skillDetail = 'SKILL.md válido';
  try {
    const { validateSkillFile } = await import('./validate-skill.mjs');
    const res = validateSkillFile(path.join(SKILL_DIR, 'SKILL.md'));
    skillOk = res.errors.length === 0;
    skillDetail = res.errors.join('; ') || `name=${res.name} · body ${res.lines} linhas`;
  } catch (e) {
    skillDetail = `${e.message.split('\n')[0]} (SKILL.md ainda não existe?)`;
  }
  checks.push({ check: 'skill', ok: skillOk, detail: skillDetail });

  const ok = checks.every((c) => c.ok);
  jsonOut({ ok, checks });
  if (!ok) process.exit(EXIT.TOOL);
}

// --------------------------------------------------------------------------
// init
// --------------------------------------------------------------------------
async function cmdInit() {
  const image = need(flags, 'image', 'gl init --image print.png --ws work --css-width 1440');
  const ws = wsDir();
  ensureDir(ws);
  ensureDir(path.join(ws, 'reference'));
  ensureDir(path.join(ws, 'work'));
  ensureDir(path.join(ws, 'components'));

  const src = path.resolve(image);
  const refDest = path.join(ws, 'reference', 'ref.png');
  const img = await readImage(src); // normaliza para PNG quando necessário
  writeImage(refDest, img);

  const dpr = flags.dpr
    ? num(flags.dpr, 1, { min: 0.5, max: 4 })
    : flags['css-width']
      ? img.width / num(flags['css-width'], img.width, { min: 1 })
      : 1;

  // candidatos de dpr quando nada foi especificado
  const candidates = [];
  if (!flags.dpr && !flags['css-width']) {
    for (const d of [1, 2, 3]) {
      if (img.width % d !== 0) continue;
      const cssW = img.width / d;
      const known = [360, 375, 390, 412, 414, 768, 834, 1024, 1280, 1366, 1440, 1536, 1680, 1728, 1920, 2560];
      candidates.push({ dpr: d, cssWidth: cssW, cssHeight: img.height / d, plausible: known.includes(cssW) });
    }
    note('dpr não especificado — candidatos na saída; recrie o plan.json com --dpr ou --css-width se necessário');
  }

  const plan = skeletonPlan({
    image: path.relative(ws, refDest).split(path.sep).join('/'),
    width: img.width, height: img.height, dpr,
  });
  const pPath = planPath(ws);
  if (fs.existsSync(pPath) && !bool(flags.force, false)) {
    note(`plan.json já existe (${pPath}) — mantido (use --force para recriar)`);
  } else {
    savePlan(pPath, plan);
  }
  const wsIgnore = path.join(ws, '.gitignore');
  if (!fs.existsSync(wsIgnore)) {
    fs.writeFileSync(wsIgnore, ['cand.png', 'diff.png', 'side-by-side.png', 'preview.html', 'work/', 'report/', 'page/', '*.normalize.png', ''].join('\n'));
  }

  jsonOut({
    ws,
    reference: { image: path.relative(ws, refDest).split(path.sep).join('/'), width: img.width, height: img.height, dpr },
    viewport: plan.viewport,
    plan: pPath,
    candidates,
  });
}

// --------------------------------------------------------------------------
// grid
// --------------------------------------------------------------------------
async function cmdGrid() {
  const image = need(flags, 'image', 'gl grid --image ref.png --cols 12 --rows 8 --out work/grid.png');
  const out = need(flags, 'out', 'gl grid --image ref.png --out work/grid.png');
  const img = await readImage(path.resolve(image));
  const region = flags.region ? parseBox(flags.region, '--region') : { x: 0, y: 0, w: img.width, h: img.height };
  const result = { image, out: path.resolve(out), region, mode: null };

  if (flags.step || (!flags.cols && !flags.rows)) {
    const step = num(flags.step, Math.max(8, Math.round(Math.min(region.w, region.h) / 8 / 8) * 8), { min: 1, int: true });
    drawRulerGrid(img, {
      region,
      step,
      labelScale: num(flags['label-scale'], labelScaleFor(img), { min: 1, int: true }),
      coordOffset: flags.origin ? parseBox(`${flags.origin},1,1`, '--origin') : { x: 0, y: 0 },
    });
    result.mode = 'ruler';
    result.step = step;
  } else {
    const cols = num(flags.cols, 12, { min: 1, int: true });
    const rows = num(flags.rows, 8, { min: 1, int: true });
    drawCellGrid(img, {
      region,
      cols,
      rows,
      crosshair: bool(flags.crosshair, true),
      labels: bool(flags.labels, true),
      showCoords: flags.units === 'logical' || bool(flags.coords, false),
      labelScale: num(flags['label-scale'], labelScaleFor(img), { min: 1, int: true }),
    });
    result.mode = 'cells';
    result.cols = cols;
    result.rows = rows;
  }
  writeImage(path.resolve(out), img);
  jsonOut(result);
}

// --------------------------------------------------------------------------
// zoom
// --------------------------------------------------------------------------
async function cmdZoom() {
  const image = need(flags, 'image', 'gl zoom --image ref.png --cell B2 --out work/zoom_B2.png');
  const out = need(flags, 'out', 'gl zoom --image ref.png --cell B2 --out work/zoom_B2.png');
  const img = await readImage(path.resolve(image));
  const full = { x: 0, y: 0, w: img.width, h: img.height };

  let target;
  let addressing = null;
  if (flags.cell) {
    const cols = num(flags.cols, 12, { min: 1, int: true });
    const rows = num(flags.rows, 8, { min: 1, int: true });
    const sub = num(flags.sub, 4, { min: 2, int: true });
    const resolved = resolveCellPath(flags.cell, full, { cols, rows, sub }, flags.units);
    target = resolved.rect;
    addressing = { cell: flags.cell, labels: resolved.labels, cols, rows, sub };
  } else if (flags.crop) {
    target = parseBox(flags.crop, '--crop');
  } else {
    fail('falta --cell ou --crop', 'ex.: --cell B2.C1  ·  --crop 240,160,408,96', EXIT.USAGE);
  }

  const context = num(flags.context, 0.35, { min: 0, max: 2 });
  const padX = Math.round(target.w * context);
  const padY = Math.round(target.h * context);
  const ext = clampBox({
    x: target.x - padX, y: target.y - padY,
    w: target.w + 2 * padX, h: target.h + 2 * padY,
  }, img.width, img.height);

  const maxEdge = num(flags['max-edge'], 1568, { min: 64, int: true });
  let zoom = flags.zoom ? num(flags.zoom, 3, { min: 1, max: 16 }) : Math.max(1, Math.floor(maxEdge / Math.max(ext.w, ext.h)));
  zoom = Math.max(1, Math.min(zoom, 16));
  while (Math.max(ext.w, ext.h) * zoom > maxEdge && zoom > 1) zoom--;

  let canvas = cropImg(img, ext);
  if (bool(flags.dim, true)) {
    dimOutside(canvas, { x: target.x - ext.x, y: target.y - ext.y, w: target.w, h: target.h });
  }
  const step = num(flags.step, Math.max(4, Math.round(target.w / num(flags.sub, 4, { min: 2, int: true }) / 4) * 4), { min: 1, int: true });
  drawRulerGrid(canvas, {
    region: { x: target.x - ext.x, y: target.y - ext.y, w: target.w, h: target.h },
    step,
    labelScale: num(flags['label-scale'], labelScaleFor(canvas), { min: 1, int: true }),
    coordOffset: { x: target.x, y: target.y },
    crosshairAt: { x: target.x - ext.x, y: target.y - ext.y },
  });

  if (zoom > 1) canvas = resizeNearest(canvas, canvas.width * zoom, canvas.height * zoom);
  writeImage(path.resolve(out), canvas);

  const result = {
    image, out: path.resolve(out), addressing,
    target: boxToArr(target),
    expanded: boxToArr(ext),
    zoomFactor: zoom,
    stepPx: step,
    outputSize: [canvas.width, canvas.height],
  };
  if (flags.units === 'logical') {
    result.targetLogical = logicalBox(target, full);
  }
  jsonOut(result);
}

// --------------------------------------------------------------------------
// probe
// --------------------------------------------------------------------------
async function cmdProbe() {
  const sub = positional[0];
  const image = need(flags, 'image', `gl probe ${sub || 'colors'} --image ref.png …`);
  const img = await readImage(path.resolve(image));
  const region = flags.region ? parseBox(flags.region, '--region') : { x: 0, y: 0, w: img.width, h: img.height };
  const full = { x: 0, y: 0, w: img.width, h: img.height };

  if (sub === 'colors') {
    const spec = need(flags, 'at', 'gl probe colors --image ref.png --at bg=8,8,cor=40,52');
    const samples = {};
    for (const pair of spec.split(',')) {
      const [name, coords] = pair.split('=');
      if (!name || !coords) fail(`amostra inválida: "${pair}"`, 'formato: nome=x,y[,raio] (raio=2 → 5×5 px)', EXIT.USAGE);
      const [lx, ly, radius = 2] = coords.split(':').map(Number);
      const r = Math.max(0, Math.min(12, radius));
      let sum = [0, 0, 0];
      const values = [];
      let count = 0;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const p = pixel(img, lx + dx, ly + dy);
          values.push(p);
          sum = [sum[0] + p[0], sum[1] + p[1], sum[2] + p[2]];
          count++;
        }
      }
      const mean = sum.map((s) => Math.round(s / count));
      const variance = values.reduce((acc, p) => acc + ((p[0] - mean[0]) ** 2 + (p[1] - mean[1]) ** 2 + (p[2] - mean[2]) ** 2), 0) / count;
      const stddev = Math.sqrt(variance);
      samples[name.trim()] = {
        hex: toHex(mean), mean, stddev: Number(stddev.toFixed(2)),
        at: [lx, ly], patch: `${2 * r + 1}x${2 * r + 1}`,
        stable: stddev < 12,
        note: stddev >= 12 ? 'instável — amostra cruza borda/gradiente; escolha outro ponto' : undefined,
      };
    }
    jsonOut({ probe: 'colors', samples });
    return;
  }

  if (sub === 'palette') {
    const k = num(flags.k, 8, { min: 1, max: 24, int: true });
    const hist = new Map();
    const total = region.w * region.h;
    for (let y = region.y; y < region.y + region.h; y++) {
      for (let x = region.x; x < region.x + region.w; x++) {
        const p = pixel(img, x, y);
        const key = `${p[0] >> 3},${p[1] >> 3},${p[2] >> 3}`;
        const entry = hist.get(key) || { count: 0, sum: [0, 0, 0], box: [x, y, x, y] };
        entry.count++;
        entry.sum = [entry.sum[0] + p[0], entry.sum[1] + p[1], entry.sum[2] + p[2]];
        entry.box = [Math.min(entry.box[0], x), Math.min(entry.box[1], y), Math.max(entry.box[2], x), Math.max(entry.box[3], y)];
        hist.set(key, entry);
      }
    }
    const colors = [...hist.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, k)
      .map((e) => ({
        hex: toHex(e.sum.map((s) => Math.round(s / e.count))),
        share: Number((e.count / total).toFixed(4)),
        ...(bool(flags.bbox, false) ? { bbox: [e.box[0], e.box[1], e.box[2] - e.box[0] + 1, e.box[3] - e.box[1] + 1] } : {}),
      }));
    jsonOut({ probe: 'palette', region: boxToArr(region), k, colors });
    return;
  }

  if (sub === 'box') {
    const target = parseHex(need(flags, 'color', 'gl probe box --image ref.png --color #1a73e8'));
    const tol = num(flags.tolerance, num(flags.tol, 25, { min: 0 }), { min: 0, max: 441 });
    const xs = [];
    const ys = [];
    for (let y = region.y; y < region.y + region.h; y++) {
      for (let x = region.x; x < region.x + region.w; x++) {
        const p = pixel(img, x, y);
        if (colorDist([p[0], p[1], p[2]], target) <= tol) { xs.push(x); ys.push(y); }
      }
    }
    if (!xs.length) {
      jsonOut({ probe: 'box', color: toHex(target), tol, found: false, region: boxToArr(region) });
      return;
    }
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const box = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    jsonOut({
      probe: 'box', color: toHex(target), tol, found: true,
      box: boxToArr(box), logical: logicalBox(box, full), pixels: xs.length,
    });
    return;
  }

  if (sub === 'bbox') {
    const tol = num(flags.tolerance, num(flags.tol, 24, { min: 0 }), { min: 0, max: 441 });
    let bg;
    if (flags.bg && flags.bg !== 'auto') {
      bg = parseHex(flags.bg);
    } else {
      // fundo = cor modal das bordas da região
      const counts = new Map();
      for (let x = region.x; x < region.x + region.w; x += 2) {
        for (const y of [region.y, region.y + region.h - 1]) {
          const p = pixel(img, x, y);
          const key = `${p[0] >> 3},${p[1] >> 3},${p[2] >> 3}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      }
      for (let y = region.y; y < region.y + region.h; y += 2) {
        for (const x of [region.x, region.x + region.w - 1]) {
          const p = pixel(img, x, y);
          const key = `${p[0] >> 3},${p[1] >> 3},${p[2] >> 3}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      }
      let top = null;
      let topN = 0;
      for (const [key, c] of counts) if (c > topN) { topN = c; top = key; }
      const [qr, qg, qb] = top.split(',').map(Number);
      const acc = [0, 0, 0];
      let n = 0;
      for (let y = region.y; y < region.y + region.h; y += 2) {
        for (let x = region.x; x < region.x + region.w; x += 2) {
          const p = pixel(img, x, y);
          if ((p[0] >> 3) === qr && (p[1] >> 3) === qg && (p[2] >> 3) === qb) {
            acc[0] += p[0]; acc[1] += p[1]; acc[2] += p[2]; n++;
          }
        }
      }
      bg = n ? acc.map((a) => Math.round(a / n)) : [255, 255, 255];
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let ink = 0;
    for (let y = region.y; y < region.y + region.h; y++) {
      for (let x = region.x; x < region.x + region.w; x++) {
        const p = pixel(img, x, y);
        if (colorDist([p[0], p[1], p[2]], bg) > tol) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          ink++;
        }
      }
    }
    if (!ink) {
      jsonOut({ probe: 'bbox', bg: toHex(bg), tol, found: false, region: boxToArr(region) });
      return;
    }
    const box = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    jsonOut({
      probe: 'bbox', bg: toHex(bg), tol, found: true, inkPixels: ink,
      box: boxToArr(box), logical: logicalBox(box, full),
      size: { w: box.w, h: box.h },
      ...(flags.dpr ? { cssSize: { w: box.w / num(flags.dpr, 1), h: box.h / num(flags.dpr, 1) } } : {}),
    });
    return;
  }

  if (sub === 'runs') {
    const isRow = flags.row !== undefined;
    const isCol = flags.col !== undefined;
    if (!isRow && !isCol) fail('falta --row N ou --col N', 'ex.: gl probe runs --image ref.png --row 350', EXIT.USAGE);
    const pos = num(isRow ? flags.row : flags.col, 0, { min: 0 });
    const tol = num(flags.tolerance, num(flags.tol, 6, { min: 0 }), { min: 0, max: 441 });
    const minLen = num(flags.min, 3, { min: 1, int: true });
    const fixedPx = isRow ? pos : pos;
    const limit = isRow ? img.width : img.height;
    const segments = [];
    let current = null;
    let start = 0;
    for (let i = 0; i < limit; i++) {
      const p = isRow ? pixel(img, i, fixedPx) : pixel(img, fixedPx, i);
      const rgb = [p[0], p[1], p[2]];
      if (!current || colorDist(rgb, current) > tol) {
        if (current) segments.push({ color: toHex(current), start, end: i - 1, length: i - start });
        current = rgb;
        start = i;
      }
    }
    segments.push({ color: toHex(current), start, end: limit - 1, length: limit - start });

    let out = segments.filter((s) => s.length >= minLen);
    if (flags.color) {
      const target = parseHex(flags.color);
      const matchTol = num(flags['match-tol'], 32, { min: 0 });
      out = out.filter((s) => colorDist(parseHex(s.color), target) <= matchTol);
    }
    const withLogical = out.map((s) => ({
      ...s,
      startLogical: Math.round((s.start / limit) * 1000),
      endLogical: Math.round((s.end / limit) * 1000),
    }));
    jsonOut({
      probe: isRow ? 'runs_row' : 'runs_col',
      axis: isRow ? 'row' : 'col',
      at: fixedPx,
      tol,
      segments: withLogical,
    });
    return;
  }

  if (sub === 'bands') {
    const direction = need(flags, 'direction', 'gl probe bands --image ref.png --direction row');
    if (!['row', 'col'].includes(direction)) fail(`direction inválida: ${direction}`, 'use row ou col', EXIT.USAGE);
    const gapFrac = num(flags['gap-frac'], 0.01, { min: 0, max: 1 });
    const minGap = num(flags['min-gap'], 3, { min: 1, int: true });
    const tol = num(flags.tolerance, num(flags.tol, 12, { min: 0 }), { min: 0 });

    // fundo modal da região
    const counts = new Map();
    for (let y = region.y; y < region.y + region.h; y += 2) {
      for (let x = region.x; x < region.x + region.w; x += 2) {
        const p = pixel(img, x, y);
        const key = `${p[0] >> 3},${p[1] >> 3},${p[2] >> 3}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    let top = null;
    let topN = 0;
    for (const [key, c] of counts) if (c > topN) { topN = c; top = key; }
    const [qr, qg, qb] = top.split(',').map(Number);
    const bgRef = [qr << 3, qg << 3, qb << 3];

    const count = direction === 'row' ? region.h : region.w;
    const len = direction === 'row' ? region.w : region.h;
    const gapFlags = [];
    for (let i = 0; i < count; i++) {
      let ink = 0;
      for (let j = 0; j < len; j++) {
        const x = direction === 'row' ? region.x + j : region.x + i;
        const y = direction === 'row' ? region.y + i : region.y + j;
        const p = pixel(img, x, y);
        if (colorDist([p[0], p[1], p[2]], bgRef) > tol) ink++;
      }
      gapFlags.push(ink / len <= gapFrac);
    }
    const toBands = (want) => {
      const out = [];
      let start = -1;
      gapFlags.forEach((isGap, i) => {
        const hit = want === 'gap' ? isGap : !isGap;
        if (hit && start < 0) start = i;
        if ((!hit || i === gapFlags.length - 1) && start >= 0) {
          const end = hit ? i + 1 : i;
          if (end - start >= minGap) {
            out.push({
              start: direction === 'row' ? region.y + start : region.x + start,
              end: direction === 'row' ? region.y + end : region.x + end,
              length: end - start,
            });
          }
          start = -1;
        }
      });
      return out;
    };
    jsonOut({
      probe: 'bands', direction, region: boxToArr(region),
      bg: toHex(bgRef), gapFrac, tol,
      gaps: toBands('gap'),
      content: toBands('content'),
    });
    return;
  }

  fail(`subcomando desconhecido: gl probe ${sub || ''}`, 'use: colors | palette | box | bbox | runs | bands', EXIT.USAGE);
}

// --------------------------------------------------------------------------
// segment
// --------------------------------------------------------------------------
async function cmdSegment() {
  const image = need(flags, 'image', 'gl segment --image ref.png --out-seg work/seg.json --out-overlay work/seg.png');
  const img = await readImage(path.resolve(image));
  const { tree, leaves } = segmentImage(img, {
    flatTol: num(flags['flat-tol'], 10, { min: 0 }),
    minGap: num(flags['min-gap'], 12, { min: 2, int: true }),
    minLeaf: num(flags['min-leaf'], 64, { min: 8, int: true }),
    depth: num(flags.depth, 6, { min: 1, int: true }),
    maxLeaf: num(flags['max-leaf'], 40, { min: 1, int: true }),
  });

  let segFile = null;
  if (flags['out-seg']) {
    segFile = path.resolve(flags['out-seg']);
    writeJson(segFile, { image, tree, leaves });
  }
  let overlayFile = null;
  if (flags['out-overlay']) {
    overlayFile = path.resolve(flags['out-overlay']);
    const overlay = cloneImage(img);
    const s = labelScaleFor(overlay);
    for (const leaf of leaves) {
      const [x, y, w, h] = leaf.box;
      strokeRect(overlay, x, y, w, h, [255, 255, 0, 255], 2);
      drawChip(overlay, x + 3 * s, y + 3 * s, `${leaf.id} ${w}X${h}`, { scale: s, color: [255, 255, 0, 255] });
    }
    writeImage(overlayFile, overlay);
  }

  jsonOut({
    image,
    leaves: leaves.map((l) => ({ id: l.id, box: l.box })),
    tree,
    segFile,
    overlayFile,
  });
}

// --------------------------------------------------------------------------
// plan
// --------------------------------------------------------------------------
function cmdPlan() {
  const sub = positional[0];
  const ws = wsDir();
  if (sub === 'check') {
    const p = planPath(ws);
    const plan = loadPlan(p);
    const { errors, warnings } = validatePlan(plan);
    jsonOut({ plan: p, ok: errors.length === 0, errors, warnings });
    if (errors.length) process.exit(EXIT.FAIL);
    return;
  }
  if (sub === 'skeleton') {
    const p = planPath(ws);
    const refImgPath = path.join(ws, 'reference', 'ref.png');
    if (!fs.existsSync(refImgPath)) fail(`referência em falta: ${refImgPath}`, 'corra `gl init --image …` primeiro', EXIT.INPUT);
    const meta = readJson(path.join(ws, 'reference', 'ref.json')) || {};
    // dimensões do PNG sem descodificar tudo: usa readImage rápida via pngjs
    const img = readPngHeader(refImgPath);
    const plan = skeletonPlan({
      image: 'reference/ref.png',
      width: img.width,
      height: img.height,
      dpr: meta.dpr || planDprOrDefault(p),
    });
    savePlan(p, plan);
    jsonOut({ plan: p, recreated: true, reference: plan.reference });
    return;
  }
  fail(`subcomando desconhecido: gl plan ${sub || ''}`, 'use: check | skeleton', EXIT.USAGE);
}

function planDprOrDefault(p) {
  try {
    return loadPlan(p).reference.dpr || 1;
  } catch {
    return 1;
  }
}

function readPngHeader(file) {
  const buf = fs.readFileSync(file);
  if (buf.length < 24 || buf[0] !== 0x89) {
    fail(`não é PNG: ${file}`, 'a referência normalizada tem de ser PNG (corra `gl init`)', EXIT.INPUT);
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// --------------------------------------------------------------------------
// prep
// --------------------------------------------------------------------------
async function cmdPrep() {
  const ws = wsDir();
  const plan = loadPlan(planPath(ws));
  const { errors } = validatePlan(plan);
  if (errors.length) {
    note('plan.json inválido:');
    errors.forEach((e) => note(`  - ${e}`));
    fail('plan.json tem erros', 'corrija as caixas e corra `gl plan check`', EXIT.FAIL);
  }
  const metas = await prepAll(plan, { ws, only: flags.id ? String(flags.id) : null });
  jsonOut({ ws, components: metas.map((m) => ({ id: m.id, box: m.box, cssSize: m.cssSize, rootClass: m.rootClass })) });
}

// --------------------------------------------------------------------------
// shot
// --------------------------------------------------------------------------
async function cmdShot() {
  const out = need(flags, 'out', 'gl shot --file preview.html --out cand.png');
  if (!flags.file && !flags.url) fail('falta --file ou --url', 'gl shot --file page.html --out cand.png', EXIT.USAGE);
  const { withBrowser, shot } = await import('./lib/render.mjs');
  const result = await withBrowser((browser) => shot(browser, {
    file: flags.file ? path.resolve(flags.file) : null,
    url: flags.url || null,
    out: path.resolve(out),
    cssW: num(flags.w, 1440, { min: 1 }),
    cssH: num(flags.h, 900, { min: 1 }),
    dpr: num(flags.dpr, 1, { min: 0.5, max: 4 }),
    selector: flags.selector ? String(flags.selector) : null,
    measure: flags.measure ? String(flags.measure) : null,
    allowNet: bool(flags['allow-net'], false),
    full: bool(flags.full, false),
  }));
  jsonOut(result);
}

// --------------------------------------------------------------------------
// artefactos de diff
// --------------------------------------------------------------------------
function blit(dst, src, dx, dy) {
  for (let y = 0; y < src.height; y++) {
    const di = ((dy + y) * dst.width + dx) << 2;
    const si = (y * src.width) << 2;
    src.data.copy(dst.data, di, si, si + (src.width << 2));
  }
}

function buildArtifacts(ref, cand, metrics, outDir, id) {
  ensureDir(outDir);
  writeImage(path.join(outDir, 'cand.png'), cand);

  const { width: W, height: H } = ref;
  const heat = cloneImage(ref);
  const gray = toGray(ref);
  for (let i = 0; i < W * H; i++) {
    const j = i << 2;
    const g = Math.round(gray[i] * 0.45 + 20);
    if (metrics.diffMask[i]) {
      heat.data[j] = 255;
      heat.data[j + 1] = Math.max(0, 120 - Math.round(gray[i] / 4));
      heat.data[j + 2] = 0;
    } else {
      heat.data[j] = g;
      heat.data[j + 1] = g;
      heat.data[j + 2] = g;
    }
  }
  for (const hs of metrics.hotspots || []) {
    strokeRect(heat, hs.box[0], hs.box[1], hs.box[2], hs.box[3], [255, 255, 0, 255], 2);
  }
  writeImage(path.join(outDir, 'diff.png'), heat);

  // side-by-side: ref | cand | heat (redimensionado para ≤ 1200px de largura)
  const labelH = 14;
  const gap = 6;
  let side = makeImage(W * 3 + gap * 2, H + labelH, [24, 24, 24, 255]);
  const label = (x, text) => drawText(side, x + 4, 2, text, { scale: 2, color: [255, 255, 255, 255] });
  blit(side, ref, 0, labelH);
  label(0, 'REF');
  blit(side, cand, W + gap, labelH);
  label(W + gap, 'CAND');
  blit(side, heat, 2 * (W + gap), labelH);
  label(2 * (W + gap), 'DIFF');
  if (side.width > 1200) {
    const f = 1200 / side.width;
    side = resizeNearest(side, Math.round(side.width * f), Math.round(side.height * f));
  }
  writeImage(path.join(outDir, 'side-by-side.png'), side);
}

// lint anti-batota + âmbito de CSS
function lintComponent(compDir, meta) {
  const problems = [];
  const warnings = [];
  const fragPath = path.join(compDir, 'component.html');
  const cssPath = path.join(compDir, 'component.css');
  const frag = fs.existsSync(fragPath) ? fs.readFileSync(fragPath, 'utf8') : '';
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

  if (/ref(-grid|-zoom)?\.png/.test(frag + css)) {
    problems.push('BATOTA: a referência (ref.png/ref-grid.png/ref-zoom.png) é usada no código — remova-a');
  }
  if (/https?:\/\//.test(frag.replace(/<!--[\s\S]*?-->/g, '')) || /url\(\s*['"]?https?:/.test(css)) {
    problems.push('rede externa detetada (http/https) — use apenas ativos locais em assets/');
  }
  if (/position\s*:\s*fixed/i.test(css)) problems.push('position:fixed proibido — quebra o isolamento do componente');
  if (/\d\s*(vw|vh|vmin|vmax)\b/i.test(css)) problems.push('unidades de viewport (vw/vh/vmin/vmax) proibidas — a caixa é fixa');
  if (/!important/i.test(css)) problems.push('!important proibido');

  const rootClass = meta.rootClass;
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = noComments.split('}').map((b) => b.trim()).filter(Boolean);
  for (const block of blocks) {
    const braceIdx = block.indexOf('{');
    if (braceIdx < 0) continue;
    const selectors = block.slice(0, braceIdx).split(',').map((s) => s.trim()).filter(Boolean);
    const atRule = selectors[0] && selectors[0].startsWith('@');
    if (atRule) {
      const decls = block.slice(braceIdx + 1);
      if (/^@keyframes/i.test(selectors[0])) {
        const name = selectors[0].split(/\s+/)[1] || '';
        if (!name.startsWith(rootClass)) warnings.push(`@keyframes "${name}" não é escopado (prefira ${rootClass}-… )`);
      }
      // @media/@supports: os seletores interiores verificam-se nas próximas iterações
      // (simplificação: extraem-se aqui como blocos próprios)
      for (const inner of decls.split('}').map((s) => s.trim()).filter(Boolean)) {
        const b2 = inner.indexOf('{');
        if (b2 < 0) continue;
        for (const sel of inner.slice(0, b2).split(',').map((s) => s.trim()).filter(Boolean)) {
          if (sel.startsWith('@')) continue;
          if (!sel.includes(rootClass)) warnings.push(`seletor "${sel}" fora do âmbito .${rootClass}`);
        }
      }
      continue;
    }
    for (const sel of selectors) {
      if (sel === 'from' || sel === 'to' || /^\d+%$/.test(sel)) continue;
      if (!sel.includes(rootClass)) warnings.push(`seletor "${sel}" fora do âmbito .${rootClass}`);
    }
  }
  return { problems, warnings };
}

// --------------------------------------------------------------------------
// verify
// --------------------------------------------------------------------------
async function cmdVerify() {
  const ws = wsDir();
  const plan = loadPlan(planPath(ws));
  const { errors } = validatePlan(plan);
  if (errors.length) {
    errors.forEach((e) => note(`plan: ${e}`));
    fail('plan.json tem erros', 'corrija as caixas e corra `gl plan check`', EXIT.FAIL);
  }
  const allIds = leavesOf(plan.tree).map((l) => l.id);
  const ids = flags.all ? allIds : flags.id ? [String(flags.id)] : [];
  if (!ids.length) fail('falta --id ID ou --all', `folhas: ${allIds.join(', ')}`, EXIT.USAGE);
  for (const id of ids) {
    if (!allIds.includes(id)) fail(`componente "${id}" não está no plan.json`, `folhas: ${allIds.join(', ')}`, EXIT.INPUT);
  }

  const refPath = path.resolve(ws, plan.reference.image);
  const refImg = await readImage(refPath);
  const { withBrowser, shot } = await import('./lib/render.mjs');

  const results = await withBrowser(async (browser) => {
    const out = [];
    for (const id of ids) {
      out.push(await verifyOne(browser, ws, plan, id, refImg, shot));
    }
    return out;
  });

  const ok = results.every((r) => r.pass);
  jsonOut({ ok, results });
  if (!ok) process.exit(EXIT.FAIL);
}

async function verifyOne(browser, ws, plan, id, refImg, shot) {
  const compDir = path.join(ws, 'components', id);
  if (!fs.existsSync(path.join(compDir, 'meta.json'))) {
    note(`prep automático de ${id}`);
    await prepOne(plan, id, { ws, refImg });
  }
  const meta = readJson(path.join(compDir, 'meta.json'));
  writePreview(compDir, meta, plan);

  let shotRes;
  try {
    shotRes = await shot(browser, {
      file: path.join(compDir, 'preview.html'),
      out: path.join(compDir, 'cand-raw.png'),
      cssW: Math.ceil(meta.cssSize.w),
      cssH: Math.ceil(meta.cssSize.h),
      dpr: meta.dpr,
      selector: `.${meta.rootClass}`,
      measure: `.${meta.rootClass}`,
      allowNet: bool(flags['allow-net'], false),
    });
  } catch (e) {
    // captura impossível (root sem tamanho, seletor em falta…) → reprova com o motivo
    const report = {
      id,
      pass: false,
      checkedAt: new Date().toISOString(),
      metrics: {},
      boxCheck: { ok: false, error: e.oQue || e.message },
      lint: { problems: [], warnings: [] },
      problems: [`caixa do root inválida — capture impossível: ${e.oQue || e.message}`],
      artifacts: null,
    };
    writeJson(path.join(compDir, 'report.json'), report);
    note(`${id}: FAIL · ${report.problems[0]}`);
    return report;
  }

  // caixa: o root tem de preencher exatamente a caixa do componente
  const m = shotRes.measurements;
  const boxCheck = {
    selectorFound: Boolean(m && m.found),
    rect: m ? m.rect : null,
    expected: { width: meta.cssSize.w, height: meta.cssSize.h },
    overflow: m ? {
      x: Math.max(0, m.stage.scrollW - m.stage.clientW),
      y: Math.max(0, m.stage.scrollH - m.stage.clientH),
    } : null,
    ok: false,
  };
  if (boxCheck.selectorFound) {
    const dw = Math.abs(boxCheck.rect.width - meta.cssSize.w);
    const dh = Math.abs(boxCheck.rect.height - meta.cssSize.h);
    boxCheck.ok = dw <= 0.5 && dh <= 0.5;
    boxCheck.delta = { w: Number(dw.toFixed(2)), h: Number(dh.toFixed(2)) };
  }

  // alinhar dimensões ao recorte de referência (arredondamento de captura)
  let cand = await readImage(path.join(compDir, 'cand-raw.png'));
  const refCrop = cropImg(refImg, meta.box);
  if (cand.width !== refCrop.width || cand.height !== refCrop.height) {
    const fixed = makeImage(refCrop.width, refCrop.height, parseHex(meta.backdrop.hex).concat(255));
    for (let y = 0; y < Math.min(cand.height, refCrop.height); y++) {
      for (let x = 0; x < Math.min(cand.width, refCrop.width); x++) {
        const p = pixel(cand, x, y);
        fixed.data[(y * refCrop.width + x) << 2] = p[0];
        fixed.data[((y * refCrop.width + x) << 2) + 1] = p[1];
        fixed.data[((y * refCrop.width + x) << 2) + 2] = p[2];
        fixed.data[((y * refCrop.width + x) << 2) + 3] = 255;
      }
    }
    cand = fixed;
    note(`${id}: captura ${shotRes.width}×${shotRes.height} alinhada para ${refCrop.width}×${refCrop.height}`);
  }

  const cmp = compare(refCrop, cand, { thresholds: meta.thresholds, tier: meta.tier, trivial: Boolean(meta.trivial) });
  const lint = lintComponent(compDir, meta);
  const problems = [...(cmp.problems || [])];
  if (!boxCheck.ok) problems.push(`caixa do root errada: ${JSON.stringify(boxCheck.rect)} vs ${JSON.stringify(boxCheck.expected)}`);
  if (boxCheck.overflow && (boxCheck.overflow.x > 0 || boxCheck.overflow.y > 0)) {
    problems.push(`conteúdo transborda a caixa em ${boxCheck.overflow.x}×${boxCheck.overflow.y} px`);
  }
  problems.push(...lint.problems);
  if (cmp.sizeMismatch) problems.push(`dimensões diferentes: ${JSON.stringify(cmp.refSize)} vs ${JSON.stringify(cmp.candSize)}`);

  const pass = cmp.pass && boxCheck.ok && lint.problems.length === 0
    && !(boxCheck.overflow && (boxCheck.overflow.x > 0 || boxCheck.overflow.y > 0));

  buildArtifacts(refCrop, cand, cmp.sizeMismatch ? { hotspots: [], diffMask: new Uint8Array(refCrop.width * refCrop.height) } : cmp, compDir, id);

  const { diffMask, ...metrics } = cmp;
  const report = {
    id,
    pass,
    checkedAt: new Date().toISOString(),
    metrics,
    boxCheck,
    lint,
    problems,
    blockedRequests: shotRes.blockedRequests,
    artifacts: { ref: 'ref.png', cand: 'cand.png', diff: 'diff.png', side: 'side-by-side.png' },
  };
  writeJson(path.join(compDir, 'report.json'), report);
  note(`${id}: ${pass ? 'PASS' : 'FAIL'} · sd=${metrics.structuralDistance ?? '—'} · worst=${metrics.worstCell ? `${metrics.worstCell.diffRatio}@${metrics.worstCell.cell}` : '—'}`);
  return report;
}

// --------------------------------------------------------------------------
// diff
// --------------------------------------------------------------------------
async function cmdDiff() {
  const refFile = need(flags, 'ref', 'gl diff --ref a.png --cand b.png');
  const candFile = need(flags, 'cand', 'gl diff --ref a.png --cand b.png');
  const ref = await readImage(path.resolve(refFile));
  const cand = await readImage(path.resolve(candFile));
  const cmp = compare(ref, cand, { tier: flags.tier ? String(flags.tier) : 'standard' });
  const outDir = path.resolve(flags['out-dir'] || path.dirname(path.resolve(candFile)));
  const { diffMask, ...metrics } = cmp;
  if (!cmp.sizeMismatch) {
    buildArtifacts(ref, cand, cmp, outDir, 'diff');
  } else {
    jsonOut({ ...metrics, artifacts: null });
    process.exit(EXIT.FAIL);
  }
  jsonOut({ ...metrics, artifacts: { dir: outDir, side: 'side-by-side.png', diff: 'diff.png' } });
  if (!cmp.pass) process.exit(EXIT.FAIL);
}

// --------------------------------------------------------------------------
// assemble
// --------------------------------------------------------------------------
async function cmdAssemble() {
  const ws = wsDir();
  const plan = loadPlan(planPath(ws));
  const { errors } = validatePlan(plan);
  if (errors.length) {
    errors.forEach((e) => note(`plan: ${e}`));
    fail('plan.json tem erros', 'corrija as caixas e corra `gl plan check`', EXIT.FAIL);
  }
  // fundo da página = cor modal da borda da referência
  const refImg = await readImage(path.resolve(ws, plan.reference.image));
  const pageBg = flags['page-bg']
    ? String(flags['page-bg'])
    : detectBackdrop(refImg, { x: 2, y: 2, w: refImg.width - 4, h: refImg.height - 4 }).hex;
  const outFile = assemblePage(ws, plan, { out: flags.out, pageBg });
  jsonOut({ out: outFile, pageBg, viewport: plan.viewport, dpr: plan.reference.dpr });
}

// --------------------------------------------------------------------------
// status
// --------------------------------------------------------------------------
function cmdStatus() {
  const ws = wsDir();
  let plan;
  try {
    plan = loadPlan(planPath(ws));
  } catch {
    plan = null;
  }
  const ids = plan ? leavesOf(plan.tree).map((l) => l.id) : [];
  const rows = ids.map((id) => {
    const reportFile = path.join(ws, 'components', id, 'report.json');
    const frag = path.join(ws, 'components', id, 'component.html');
    const r = fs.existsSync(reportFile) ? readJson(reportFile) : null;
    return {
      id,
      built: fs.existsSync(frag),
      verified: Boolean(r),
      pass: r ? r.pass : null,
      structuralDistance: r && r.metrics ? r.metrics.structuralDistance : null,
      worstCell: r && r.metrics && r.metrics.worstCell ? r.metrics.worstCell : null,
      problems: r ? r.problems : [],
    };
  });
  jsonOut({
    ws,
    totals: {
      components: rows.length,
      built: rows.filter((r) => r.built).length,
      passing: rows.filter((r) => r.pass).length,
      failing: rows.filter((r) => r.pass === false).length,
      pending: rows.filter((r) => !r.verified).length,
    },
    rows,
  });
}

// --------------------------------------------------------------------------
// report
// --------------------------------------------------------------------------
function cmdReport() {
  const ws = wsDir();
  const plan = loadPlan(planPath(ws));
  const entries = [];
  for (const leaf of leavesOf(plan.tree)) {
    const reportFile = path.join(ws, 'components', leaf.id, 'report.json');
    if (fs.existsSync(reportFile)) entries.push(readJson(reportFile));
    else entries.push({ id: leaf.id, pass: false, problems: ['nunca verificado'], metrics: {} });
  }
  const pageReportFile = path.join(ws, 'page', 'report.json');
  const pageMetrics = fs.existsSync(pageReportFile) ? readJson(pageReportFile) : null;
  const outDir = writeReport(ws, plan, entries, { pageMetrics });
  jsonOut({ outDir, entries: entries.map((e) => ({ id: e.id, pass: e.pass })) });
}

// --------------------------------------------------------------------------
// crop
// --------------------------------------------------------------------------
async function cmdCrop() {
  const image = need(flags, 'image', 'gl crop --image ref.png --box x,y,w,h --out assets/x.png');
  const out = need(flags, 'out', 'gl crop --image ref.png --box x,y,w,h --out assets/x.png');
  const box = parseBox(need(flags, 'box', 'gl crop --image ref.png --box x,y,w,h --out assets/x.png'));
  const img = await readImage(path.resolve(image));
  const cut = cropImg(img, box);
  writeImage(path.resolve(out), cut);
  const share = (box.w * box.h) / (img.width * img.height);
  jsonOut({
    image,
    out: path.resolve(out),
    box: boxToArr(box),
    size: [cut.width, cut.height],
    pageShare: Number(share.toFixed(4)),
    note: share > 0.35
      ? 'recorte cobre >35% da página — confirme que é mesmo um ativo fotográfico e não UI recriável'
      : 'ativo extraído; documente-o em notes.md',
  });
}

// --------------------------------------------------------------------------
// dispatch
// --------------------------------------------------------------------------
const COMMANDS = {
  doctor: cmdDoctor,
  init: cmdInit,
  grid: cmdGrid,
  zoom: cmdZoom,
  probe: cmdProbe,
  segment: cmdSegment,
  plan: cmdPlan,
  prep: cmdPrep,
  shot: cmdShot,
  verify: cmdVerify,
  diff: cmdDiff,
  assemble: cmdAssemble,
  status: cmdStatus,
  report: cmdReport,
  crop: cmdCrop,
};

if (!cmd || cmd === 'help' || flags.help) {
  process.stdout.write(`${HELP}\n`);
  process.exit(cmd ? EXIT.OK : EXIT.USAGE);
}
const handler = COMMANDS[cmd];
if (!handler) {
  fail(`comando desconhecido: ${cmd}`, 'veja `gl --help` para a lista de comandos', EXIT.USAGE);
}
Promise.resolve()
  .then(handler)
  .catch((e) => {
    if (e && e.oQue !== undefined) {
      process.stderr.write(`${e.message}\n`);
      process.exit(e.code ?? EXIT.FAIL);
    }
    fail(`falha inesperada em \`gl ${cmd}\`: ${e && e.message}`, 'reproduza com --help e reporte o erro com o comando exato', EXIT.FAIL);
  });

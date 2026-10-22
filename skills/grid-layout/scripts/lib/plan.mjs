// lib/plan.mjs — manifesto do layout (plan.json): esquema, validação, vizinhos,
// fundo imediato e preparação dos pacotes de trabalho por componente.
//
// O plan.json é a FONTE ÚNICA da decomposição: a árvore tem de particionar a
// página EXATAMENTE (sem sobreposições nem buracos) — é isso que garante que o
// trabalho paralelo cobre todos os píxeis e que o assemble é determinístico.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fail, note, readJson, writeJson, ensureDir, parseBox, toHex, num, EXIT } from './util.mjs';
import { readImage, writeImage, crop as cropImg, resizeNearest, pixel } from './imgio.mjs';
import { drawCellGrid, drawRulerGrid, drawIdentity, labelScaleFor } from './overlay.mjs';
import { thresholdsFor } from './metrics.mjs';

export const PLAN_VERSION = 1;
export const ID_RE = /^[a-z][a-z0-9-]{0,31}$/;
export const KINDS = ['ui', 'text', 'photo', 'chart', 'icon', 'svg', 'mixed'];
export const TIERS = ['strict', 'standard', 'loose'];
export const STACKS = ['html', 'react', 'vue', 'svelte', 'solid', 'other'];

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const GL_MJS = path.resolve(HERE, '..', 'gl.mjs');
export const SKILL_DIR = path.resolve(HERE, '..', '..');

export function nodeBox(node) {
  return { x: node.box[0], y: node.box[1], w: node.box[2], h: node.box[3] };
}

export function walkNodes(node, fn, depth = 0, index = 0) {
  fn(node, depth, index);
  (node.children || []).forEach((child, i) => walkNodes(child, fn, depth + 1, i));
}

export function leavesOf(tree) {
  const out = [];
  walkNodes(tree, (n) => {
    if (n.type === 'leaf' || !n.children || n.children.length === 0) out.push(n);
  });
  return out;
}

export function findLeaf(plan, id) {
  return leavesOf(plan.tree).find((l) => l.id === id) || null;
}

export function loadPlan(file) {
  const plan = readJson(file);
  if (plan.version !== PLAN_VERSION) {
    fail(`versão de plan.json não suportada: ${plan.version}`, `use "version": ${PLAN_VERSION}`, EXIT.INPUT);
  }
  return plan;
}

export function savePlan(file, plan) {
  writeJson(file, plan);
}

export function skeletonPlan(ref) {
  return {
    version: PLAN_VERSION,
    reference: { image: ref.image, width: ref.width, height: ref.height, dpr: ref.dpr },
    viewport: { width: Math.round(ref.width / ref.dpr), height: Math.round(ref.height / ref.dpr) },
    stack: 'html',
    tokens: 'tokens.css',
    thresholds: thresholdsFor('standard'),
    tree: {
      id: 'page',
      type: 'col',
      box: [0, 0, ref.width, ref.height],
      children: [
        {
          id: 'page-body',
          type: 'leaf',
          kind: 'ui',
          tier: 'standard',
          box: [0, 0, ref.width, ref.height],
          notes: 'substitua por uma árvore de decomposição (ver `gl segment`)',
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Validação — erros bloqueiam (exit 1), avisos são informativos.
// ---------------------------------------------------------------------------
export function validatePlan(plan) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  const ref = plan.reference || {};
  const W = Number(ref.width);
  const H = Number(ref.height);
  const dpr = Number(ref.dpr || 1);
  if (!(W > 0 && H > 0)) err('reference.width/height têm de ser > 0');
  if (!(dpr >= 0.5 && dpr <= 4)) err('reference.dpr fora de [0.5, 4]');
  if (plan.stack && !STACKS.includes(plan.stack)) err(`stack inválido: ${plan.stack} (use ${STACKS.join('|')})`);

  const seen = new Set();
  const checkId = (node, ctxPath) => {
    if (node.type !== 'leaf' && !node.id) return;
    if (!node.id || !ID_RE.test(node.id)) {
      err(`id inválido em ${ctxPath}: "${node.id || ''}" (use minúsculas/dígitos/hífens, começa por letra)`);
      return;
    }
    if (seen.has(node.id)) err(`id duplicado: ${node.id}`);
    seen.add(node.id);
  };

  const checkBox = (node, parent, ctxPath) => {
    if (!Array.isArray(node.box) || node.box.length !== 4 || node.box.some((v) => !Number.isInteger(v))) {
      err(`box inválido em ${ctxPath}: ${JSON.stringify(node.box)} (use inteiros [x,y,w,h])`);
      return false;
    }
    const [x, y, w, h] = node.box;
    if (w <= 0 || h <= 0) { err(`box sem área em ${ctxPath}: ${JSON.stringify(node.box)}`); return false; }
    if (parent) {
      const [px, py, pw, ph] = parent.box;
      if (x < px || y < py || x + w > px + pw || y + h > py + ph) {
        err(`box de ${ctxPath} (${node.box}) sai do pai ${parent.id || parent.type} (${parent.box})`);
        return false;
      }
    } else if (x !== 0 || y !== 0 || w !== W || h !== H) {
      err(`a raiz da árvore tem de ser [0,0,${W},${H}] — veio ${JSON.stringify(node.box)}`);
      return false;
    }
    return true;
  };

  const walk = (node, parent, ctxPath) => {
    checkId(node, ctxPath);
    if (!checkBox(node, parent, ctxPath)) return;
    const type = node.type || (node.children ? 'row' : 'leaf');
    const kids = node.children || [];
    if (type === 'leaf' || kids.length === 0) {
      if (node.type === 'leaf' || kids.length === 0) {
        const kind = node.kind || 'ui';
        if (!KINDS.includes(kind)) err(`kind inválido em ${ctxPath}: ${kind}`);
        const tier = node.tier || 'standard';
        if (!TIERS.includes(tier)) err(`tier inválido em ${ctxPath}: ${tier}`);
        const [, , w, h] = node.box;
        if (w < 32 || h < 24) warn(`folha minúscula ${ctxPath} (${w}×${h} px) — considere agrupá-la com a vizinha`);
        if (dpr > 1 && (w % Math.round(dpr) !== 0 || h % Math.round(dpr) !== 0)) {
          warn(`${ctxPath}: caixa ${w}×${h} não é múltipla de dpr=${dpr} — será cortada no capture (CSS px teria de ser inteiro)`);
        }
      }
      return;
    }
    if (!['row', 'col', 'abs'].includes(type)) {
      err(`type inválido em ${ctxPath}: ${node.type}`);
      return;
    }
    if (type === 'abs') {
      for (const child of kids) {
        const [cx, cy, cw, ch] = child.box || [0, 0, 0, 0];
        const [px, py, pw, ph] = node.box;
        if (cx < px || cy < py || cx + cw > px + pw || cy + ch > py + ph) {
          warn(`nó absoluto ${ctxPath}: filho ${child.id || '?'} sai do pai`);
        }
      }
      warn(`nó absoluto ${ctxPath}: sobreposições são permitidas — confirme que é intencional`);
    } else {
      const axis = type === 'row' ? 0 : 1; // 0=x, 1=y
      const main = kids.map((c) => (axis === 0 ? c.box[0] : c.box[1]));
      const order = main.map((v, i) => i).sort((a, b) => main[a] - main[b]);
      const [px, py, pw, ph] = node.box;
      let cursor = axis === 0 ? px : py;
      for (const i of order) {
        const [cx, cy, cw, ch] = kids[i].box;
        const start = axis === 0 ? cx : cy;
        const size = axis === 0 ? cw : ch;
        const crossA = axis === 0 ? cy : cx;
        const crossSize = axis === 0 ? ch : cw;
        const crossParentA = axis === 0 ? py : px;
        const crossParentSize = axis === 0 ? ph : pw;
        if (crossA !== crossParentA || crossSize !== crossParentSize) {
          err(`${ctxPath} (${type}): filho ${kids[i].id || i} não cobre o eixo transversal (${crossA}+${crossSize} vs ${crossParentA}+${crossParentSize})`);
        }
        if (start !== cursor) {
          const from = Math.min(start, cursor);
          const to = Math.max(start, cursor);
          err(`${ctxPath} (${type}): ${start > cursor ? `buraco de ${to - from} px` : `sobreposição de ${to - from} px`} no eixo [${from}..${to}) — as caixas dos filhos têm de se encostar`);
        }
        cursor = start + size;
      }
      const end = axis === 0 ? px + pw : py + ph;
      if (cursor !== end) {
        err(`${ctxPath} (${type}): filhos cobrem até ${cursor}, o pai vai até ${end} — ${cursor < end ? 'faltam' : 'sobram'} ${Math.abs(end - cursor)} px`);
      }
    }
    kids.forEach((child, i) => walk(child, node, `${ctxPath}/${child.id || `${type}${i}`}`));
  };

  walk(plan.tree, null, plan.tree.id || 'page');
  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Vizinhos e fundo imediato
// ---------------------------------------------------------------------------
export function leafNeighbors(plan, leafId) {
  const leaves = leavesOf(plan.tree);
  const me = leaves.find((l) => l.id === leafId);
  if (!me) return {};
  const b = nodeBox(me);
  const out = { left: null, right: null, top: null, bottom: null };
  let best = { left: Infinity, right: Infinity, top: Infinity, bottom: Infinity };
  for (const other of leaves) {
    if (other.id === leafId) continue;
    const o = nodeBox(other);
    const overlapsX = o.x < b.x + b.w && o.x + o.w > b.x;
    const overlapsY = o.y < b.y + b.h && o.y + o.h > b.y;
    if (overlapsY && o.x + o.w <= b.x) {
      const d = b.x - (o.x + o.w);
      if (d < best.left) { best.left = d; out.left = other.id; }
    }
    if (overlapsY && o.x >= b.x + b.w) {
      const d = o.x - (b.x + b.w);
      if (d < best.right) { best.right = d; out.right = other.id; }
    }
    if (overlapsX && o.y + o.h <= b.y) {
      const d = b.y - (o.y + o.h);
      if (d < best.top) { best.top = d; out.top = other.id; }
    }
    if (overlapsX && o.y >= b.y + b.h) {
      const d = o.y - (b.y + b.h);
      if (d < best.bottom) { best.bottom = d; out.bottom = other.id; }
    }
  }
  for (const k of Object.keys(out)) {
    if (out[k] === null) best[k] = null;
  }
  return { neighbors: out, gutters: best };
}

export function detectBackdrop(refImg, box) {
  const ring = [];
  const r = 8;
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= refImg.width || y >= refImg.height) return;
    ring.push(pixel(refImg, x, y));
  };
  for (let x = box.x - r; x < box.x + box.w + r; x += 2) {
    for (let k = 1; k <= r; k += 2) { push(x, box.y - k); push(x, box.y + box.h + k - 1); }
  }
  for (let y = box.y - r; y < box.y + box.h + r; y += 2) {
    for (let k = 1; k <= r; k += 2) { push(box.x - k, y); push(box.x + box.w + k - 1, y); }
  }
  if (ring.length === 0) return { hex: '#ffffff', flat: true };
  const counts = new Map();
  for (const [rr, gg, bb] of ring) {
    const key = `${rr >> 3},${gg >> 3},${bb >> 3}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let topKey = null;
  let topCount = 0;
  for (const [k, c] of counts) if (c > topCount) { topCount = c; topKey = k; }
  const [qr, qg, qb] = topKey.split(',').map(Number);
  const reps = ring.filter(([rr, gg, bb]) => (rr >> 3) === qr && (gg >> 3) === qg && (bb >> 3) === qb);
  const mean = [0, 1, 2].map((i) => Math.round(reps.reduce((s, p) => s + p[i], 0) / reps.length));
  return { hex: toHex(mean), flat: topCount / ring.length >= 0.8 };
}

// ---------------------------------------------------------------------------
// Preparação dos pacotes de trabalho (por componente)
// ---------------------------------------------------------------------------
export async function prepOne(plan, id, opts = {}) {
  const ws = opts.ws;
  const refPath = path.resolve(ws, plan.reference.image);
  const refImg = opts.refImg || (await readImage(refPath));
  const leaf = findLeaf(plan, id);
  if (!leaf) {
    fail(`componente "${id}" não existe no plan.json`, `folhas disponíveis: ${leavesOf(plan.tree).map((l) => l.id).join(', ')}`, EXIT.INPUT);
  }
  const box = nodeBox(leaf);
  const dpr = Number(plan.reference.dpr || 1);
  const compDir = path.join(ws, 'components', id);
  ensureDir(compDir);
  ensureDir(path.join(compDir, 'assets'));

  // 1. ref.png — o recorte exato da caixa (coordenadas LOCAIS a partir daqui)
  const refCrop = cropImg(refImg, box);
  writeImage(path.join(compDir, 'ref.png'), refCrop);

  // 2. ref-grid.png — réguas locais + identidade (para o subagente medir)
  const { drawChip, drawIdentity: ident } = await import('./overlay.mjs');
  const gridImg = cropImg(refImg, box);
  const step = Math.max(4, Math.round(Math.min(box.w, box.h) / 6 / 4) * 4);
  drawRulerGrid(gridImg, {
    step,
    labelScale: labelScaleFor(gridImg),
    coordOffset: { x: 0, y: 0 },
    crosshairAt: { x: 0, y: 0 },
  });
  ident(gridImg, `${id} ${box.w}X${box.h}PX @${dpr}X`);
  writeImage(path.join(compDir, 'ref-grid.png'), gridImg);

  // 3. ref-zoom.png — ampliação nearest para ler texto/ícones pequenos
  const zoomFactor = Math.max(1, Math.min(4, Math.ceil(640 / Math.max(box.w, box.h))));
  writeImage(path.join(compDir, 'ref-zoom.png'), resizeNearest(refCrop, box.w * zoomFactor, box.h * zoomFactor));

  // 3.5. componente trivial (fundo chapado sem conteúdo) → gerado pelo motor
  const trivial = isTrivialCrop(refCrop);

  // 4. meta.json — contrato medido
  const backdrop = detectBackdrop(refImg, box);
  const { neighbors, gutters } = leafNeighbors(plan, id);
  const tier = leaf.tier || 'standard';
  const th = leaf.thresholds || plan.thresholds || thresholdsFor(tier);
  const meta = {
    id,
    kind: leaf.kind || 'ui',
    tier,
    trivial,
    box,
    cssBox: { x: box.x / dpr, y: box.y / dpr, w: box.w / dpr, h: box.h / dpr },
    dpr,
    cssSize: { w: box.w / dpr, h: box.h / dpr },
    rootClass: `gl-${id}`,
    backdrop,
    thresholds: th,
    neighbors,
    gutters,
    notes: leaf.notes || '',
    gridStepPx: step,
    zoomFactor,
    files: { ref: 'ref.png', refGrid: 'ref-grid.png', refZoom: 'ref-zoom.png' },
    gl: GL_MJS,
    ws,
  };
  writeJson(path.join(compDir, 'meta.json'), meta);

  // 5. BRIEF.md — instruções auto-contidas para o subagente
  const brief = renderBrief(meta, plan);
  fs.writeFileSync(path.join(compDir, 'BRIEF.md'), brief);

  // 6. stubs (nunca sobrescrever trabalho do subagente; triviais saem prontos)
  const fragPath = path.join(compDir, 'component.html');
  const cssPath = path.join(compDir, 'component.css');
  if (trivial) {
    const bgOwn = toHex(pixel(refCrop, Math.floor(refCrop.width / 2), Math.floor(refCrop.height / 2)));
    fs.writeFileSync(fragPath, `<!-- componente ${id} — trivial (fundo), gerado por gl prep -->\n<section class="gl-${id}" data-gl-id="${id}"></section>\n`);
    fs.writeFileSync(cssPath, `/* componente ${id} — trivial (fundo) */\n.gl-${id} {\n  width: 100%;\n  height: 100%;\n  box-sizing: border-box;\n  background: ${bgOwn};\n}\n`);
  } else {
    if (!fs.existsSync(fragPath)) {
      fs.writeFileSync(fragPath, `<!-- componente ${id} — edita APENAS este ficheiro e component.css -->\n<section class="gl-${id}" data-gl-id="${id}">\n  <!-- TODO: reproduzir ref.png -->\n</section>\n`);
    }
    if (!fs.existsSync(cssPath)) {
      fs.writeFileSync(cssPath, `/* componente ${id} — todos os seletores sob .gl-${id} */\n.gl-${id} {\n  width: 100%;\n  height: 100%;\n  box-sizing: border-box;\n}\n`);
    }
  }

  // 7. preview.html gerado (harness isolado) — sempre regenerado por `gl verify`
  const { writePreview } = await import('./assemble.mjs');
  writePreview(compDir, meta, plan);

  return meta;
}

export async function prepAll(plan, opts = {}) {
  const ids = leavesOf(plan.tree).map((l) => l.id);
  const only = opts.only ? ids.filter((i) => i === opts.only) : ids;
  if (opts.only && only.length === 0) {
    fail(`componente "${opts.only}" não existe no plan.json`, `folhas: ${ids.join(', ')}`, EXIT.INPUT);
  }
  const refPath = path.resolve(opts.ws, plan.reference.image);
  const refImg = await readImage(refPath);
  const results = [];
  for (const id of only) {
    results.push(await prepOne(plan, id, { ...opts, refImg }));
    note(`prep: ${id} pronto`);
  }
  return results;
}

// ---------------------------------------------------------------------------
// BRIEF.md — template em assets/brief.template.md com substituição simples.
// ---------------------------------------------------------------------------
export function renderBrief(meta, plan) {
  const tplPath = path.join(SKILL_DIR, 'assets', 'brief.template.md');
  if (!fs.existsSync(tplPath)) {
    fail(`template em falta: ${tplPath}`, 'reinstale a skill (assets/brief.template.md)', EXIT.TOOL);
  }
  const tpl = fs.readFileSync(tplPath, 'utf8');
  const th = meta.thresholds || thresholdsFor(meta.tier);
  const [eLo, eHi] = th.edgeEnergyRatio;
  const neigh = meta.neighbors || {};
  const gutter = meta.gutters || {};
  const neighLine = ['esquerda', 'direita', 'topo', 'baixo'].map((dir, i) => {
    const key = ['left', 'right', 'top', 'bottom'][i];
    const id = neigh[key];
    return `${dir}: ${id ? `${id} (a ${gutter[key]} px)` : 'nada (borda do layout)'}`;
  }).join(' · ');

  const values = {
    id: meta.id,
    kind: meta.kind,
    tier: meta.tier,
    dpr: meta.dpr,
    box_x: meta.box.x, box_y: meta.box.y, box_w: meta.box.w, box_h: meta.box.h,
    css_w: meta.cssSize.w, css_h: meta.cssSize.h,
    css_x: meta.cssBox.x, css_y: meta.cssBox.y,
    backdrop: meta.backdrop.hex,
    backdrop_note: meta.backdrop.flat ? 'plano' : 'NÃO plano — cuidado com a mistura nas bordas',
    notes: meta.notes || '(sem notas do orquestrador)',
    neighbors: neighLine,
    step: meta.gridStepPx,
    zoom: meta.zoomFactor,
    sd: th.structuralDistance,
    e_lo: eLo, e_hi: eHi,
    wc: th.worstCell,
    gl: meta.gl,
    ws: meta.ws,
    stack: plan.stack || 'html',
  };
  return tpl.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in values ? String(values[key]) : m));
}

export function parseBoxArg(str) {
  return parseBox(str);
}

// Um recorte é "trivial" quando não tem conteúdo: >99.7% dos píxeis na cor modal.
function isTrivialCrop(img) {
  const counts = new Map();
  const total = img.width * img.height;
  for (let i = 0; i < total; i++) {
    const j = i << 2;
    const key = `${img.data[j] >> 3},${img.data[j + 1] >> 3},${img.data[j + 2] >> 3}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let topN = 0;
  for (const c of counts.values()) topN = Math.max(topN, c);
  return topN / total >= 0.997;
}

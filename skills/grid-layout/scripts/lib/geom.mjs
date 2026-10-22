// lib/geom.mjs — espaço de células rotuladas, unidades lógicas e caixas.
//
// Endereço de célula em estilo folha de cálculo: linhas = letras (A, B, … Z, AA),
// colunas = números (1, 2, …). Níveis recursivos separados por ponto:
//   B2        → célula B2 da grelha raiz
//   B2.C1     → sub-célula C1 dentro de B2 (grelha fina dentro do zoom)
//   A1+A2     → união de células adjacentes (fronteira partilhada)
//   B2.C1+C2  → combináveis em qualquer nível
import { fail, EXIT } from './util.mjs';

// Converte índice de linha em rótulo tipo folha de cálculo: 0→A, 25→Z, 26→AA.
export function rowLabel(index) {
  let n = index;
  let out = '';
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

export function rowIndex(label) {
  const s = String(label).toUpperCase();
  if (!/^[A-Z]+$/.test(s)) return -1;
  let n = 0;
  for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

// Níveis de grelha: o raiz usa {cols, rows}; níveis seguintes usam `sub` (NxN).
export function levelDims(level, opts) {
  if (level === 0) return { cols: opts.cols, rows: opts.rows };
  return { cols: opts.sub, rows: opts.sub };
}

// Resolve um token "B2" ou "D3+E3" dentro de um retângulo-pai → retângulo px.
export function cellRect(parent, token, dims, level, units) {
  const m = String(token).trim().toUpperCase().match(/^([A-Z]+)(\d+)(?:\+([A-Z]+)(\d+))?$/);
  if (!m) {
    fail(`célula inválida: "${token}"`, 'formato: B2, D3+E3 (letras de linha + número de coluna)', EXIT.USAGE);
  }
  const r1 = rowIndex(m[1]);
  const c1 = Number(m[2]) - 1;
  const cellW = parent.w / dims.cols;
  const cellH = parent.h / dims.rows;
  const check = (r, c, tok) => {
    if (r < 0 || r >= dims.rows || c < 0 || c >= dims.cols) {
      fail(`célula "${tok}" fora da grelha ${dims.cols}×${dims.rows} (nível ${level})`,
        `use letras A..${rowLabel(dims.rows - 1)} e números 1..${dims.cols}`, EXIT.USAGE);
    }
  };
  check(r1, c1, token);
  let x0 = parent.x + c1 * cellW;
  let y0 = parent.y + r1 * cellH;
  let x1 = x0 + cellW;
  let y1 = y0 + cellH;
  if (m[3]) {
    const r2 = rowIndex(m[3]);
    const c2 = Number(m[4]) - 1;
    check(r2, c2, token);
    const ax0 = parent.x + c2 * cellW;
    const ay0 = parent.y + r2 * cellH;
    x0 = Math.min(x0, ax0);
    y0 = Math.min(y0, ay0);
    x1 = Math.max(x1, ax0 + cellW);
    y1 = Math.max(y1, ay0 + cellH);
  }
  const rect = {
    x: Math.round(x0), y: Math.round(y0),
    w: Math.round(x1 - x0), h: Math.round(y1 - y0),
  };
  if (units === 'logical') return { ...rect, logical: toLogical(rect, parent) };
  return rect;
}

// Caminho completo "B2.C1+A2" → { rect, labels } dentro de `root` (px da imagem).
export function resolveCellPath(path, root, opts, units) {
  const tokens = String(path).trim().split('.').map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) {
    fail('caminho de célula vazio', 'ex.: --cell B2  ·  --cell B2.C1  ·  --cell D3+E3', EXIT.USAGE);
  }
  let rect = { x: root.x, y: root.y, w: root.w, h: root.h };
  const labels = [];
  tokens.forEach((token, level) => {
    const dims = levelDims(level, opts);
    const label = token.split('+')[0];
    labels.push({ level, label, dims: `${dims.cols}x${dims.rows}` });
    rect = cellRect(rect, token, dims, level, units === 'logical' ? null : null);
    if (units === 'logical') rect = { ...rect, logical: toLogical(rect, root) };
  });
  return { rect, labels };
}

// Unidades lógicas: por eixo 0..1000 (espaço viewBox de ilustração).
// NOTA: em imagens não-quadradas os eixos têm escalas diferentes; para UI
// trabalhe sempre em píxeis — o lógico serve para modelação SVG.
export function toLogical(rect, root) {
  return {
    x0: Math.round((rect.x / root.w) * 1000),
    y0: Math.round((rect.y / root.h) * 1000),
    x1: Math.round(((rect.x + rect.w) / root.w) * 1000),
    y1: Math.round(((rect.y + rect.h) / root.h) * 1000),
    w: Math.round((rect.w / root.w) * 1000),
    h: Math.round((rect.h / root.h) * 1000),
  };
}

export function logicalBox(rect, root) {
  return toLogical(rect, root);
}

// --- caixas ---

export function clampBox(box, w, h) {
  const x = Math.max(0, Math.min(w, Math.round(box.x)));
  const y = Math.max(0, Math.min(h, Math.round(box.y)));
  return {
    x,
    y,
    w: Math.max(0, Math.min(w - x, Math.round(box.w))),
    h: Math.max(0, Math.min(h - y, Math.round(box.h))),
  };
}

export function expandBox(box, pad, maxW, maxH) {
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  return {
    x,
    y,
    w: Math.min(maxW - x, box.w + (box.x - x) + pad),
    h: Math.min(maxH - y, box.h + (box.y - y) + pad),
  };
}

export function boxArea(box) {
  return Math.max(0, box.w) * Math.max(0, box.h);
}

export function boxIntersect(a, b) {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.w, b.x + b.w);
  const y1 = Math.min(a.y + a.h, b.y + b.h);
  if (x1 <= x0 || y1 <= y0) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function boxUnion(a, b) {
  const x0 = Math.min(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const x1 = Math.max(a.x + a.w, b.x + b.w);
  const y1 = Math.max(a.y + a.h, b.y + b.h);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function boxFromArr(arr) {
  return { x: arr[0], y: arr[1], w: arr[2], h: arr[3] };
}

export function boxToArr(box) {
  return [box.x, box.y, box.w, box.h];
}

// Arruma uma caixa para múltiplos de `dpr` píxeis (CSS px inteiros quando dpr>1).
export function roundBoxToDpr(box, dpr) {
  if (dpr <= 1) return { ...box };
  const x = Math.round(box.x / dpr) * dpr;
  const y = Math.round(box.y / dpr) * dpr;
  const x1 = Math.round((box.x + box.w) / dpr) * dpr;
  const y1 = Math.round((box.y + box.h) / dpr) * dpr;
  return { x, y, w: x1 - x, h: y1 - y };
}

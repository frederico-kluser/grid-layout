// lib/segment.mjs — decomposição XY-cut assistida: propõe uma árvore de caixas.
//
// O que é um "vão" (candidato a corte):
//   1. a linha/coluna é PLANA ao longo de si (máx−min de canal ≤ flatTol);
//   2. a faixa inteira é de UMA cor (≤ bandTol entre linhas — um gradiente
//      suave NÃO é vão);
//   3. essa cor é a cor de FUNDO da região (≤ bgTol do histograma modal) —
//      um bloco sólido de cartão não é vão;
//   4. o vão está LIMITADO por conteúdo dos dois lados (não encosta às bordas
//      da região — as margens ficam coladas ao bloco dono);
//   5. comprimento ≥ minGap.
// O corte faz-se no FIM do vão (o vão inteiro fica do lado superior/esquerdo).
//
// Sem vão válido, tenta-se uma ARESTA FORTE (descontinuidade reta que atravessa
// ≥ 85% da região — caso sidebar/conteúdo, sem vão entre fundos diferentes).
// Região sem corte → folha. Fotografias densas caem numa folha grande: o
// orquestrador decide (asset extraído ou subdivisão manual).
import { note } from './util.mjs';

function modalColor(img, region) {
  const counts = new Map();
  for (let y = region.y; y < region.y + region.h; y += 2) {
    for (let x = region.x; x < region.x + region.w; x += 2) {
      const idx = (y * img.width + x) << 2;
      const key = `${img.data[idx] >> 3},${img.data[idx + 1] >> 3},${img.data[idx + 2] >> 3}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  let top = [255, 255, 255];
  let topN = -1;
  for (const [key, c] of counts) {
    if (c > topN) {
      topN = c;
      top = key.split(',').map((v) => Number(v) << 3);
    }
  }
  return top;
}

function lineSample(img, region, axis, i) {
  const len = axis === 'row' ? region.w : region.h;
  const at = (j) => {
    const x = axis === 'row' ? region.x + j : region.x + i;
    const y = axis === 'row' ? region.y + i : region.y + j;
    const idx = (y * img.width + x) << 2;
    return [img.data[idx], img.data[idx + 1], img.data[idx + 2]];
  };
  const first = at(0);
  let flat = true;
  for (let j = 1; j < len; j++) {
    const p = at(j);
    const d = Math.max(Math.abs(p[0] - first[0]), Math.abs(p[1] - first[1]), Math.abs(p[2] - first[2]));
    if (d > 10) { flat = false; break; }
  }
  return { color: first, flat };
}

function gapFlags(img, region, axis, bg, { flatTol, bandTol, bgTol }) {
  const count = axis === 'row' ? region.h : region.w;
  const flags = [];
  let bandColor = null;
  for (let i = 0; i < count; i++) {
    const { color, flat } = lineSample(img, region, axis, i);
    const dBg = Math.max(Math.abs(color[0] - bg[0]), Math.abs(color[1] - bg[1]), Math.abs(color[2] - bg[2]));
    const sameBand = bandColor
      ? Math.max(Math.abs(color[0] - bandColor[0]), Math.abs(color[1] - bandColor[1]), Math.abs(color[2] - bandColor[2])) <= bandTol
      : true;
    const isGap = flat && sameBand && dBg <= bgTol;
    if (isGap && bandColor === null) bandColor = color;
    if (!isGap) bandColor = null;
    flags.push(isGap);
  }
  return flags;
}

function boundedGapRuns(flags, minGap) {
  const runs = [];
  let start = -1;
  flags.forEach((f, i) => {
    if (f && start < 0) start = i;
    if ((!f || i === flags.length - 1) && start >= 0) {
      const end = f ? i + 1 : i;
      const before = start > 0 ? flags[start - 1] : true; // borda conta como "não limitado"
      const after = end < flags.length ? flags[end] : true;
      if (end - start >= minGap && !before && !after) runs.push({ start, end, len: end - start });
      start = -1;
    }
  });
  return runs;
}

function edgeCuts(img, region, axis, { tol = 14, minSpan = 0.85, minGap = 24 } = {}) {
  const cross = axis === 'row' ? region.w : region.h;
  const main = axis === 'row' ? region.h : region.w;
  const step = Math.max(1, Math.floor(cross / 256)); // amostragem determinística
  const sampled = Math.ceil(cross / step);
  const need = sampled * minSpan;
  const flags = [];
  for (let i = 0; i < main - 1; i++) {
    let strong = 0;
    for (let j = 0; j < cross; j += step) {
      const x0 = axis === 'row' ? region.x + j : region.x + i;
      const y0 = axis === 'row' ? region.y + i : region.y + j;
      const x1 = axis === 'row' ? region.x + j : region.x + i + 1;
      const y1 = axis === 'row' ? region.y + i + 1 : region.y + j;
      const a = (y0 * img.width + x0) << 2;
      const b = (y1 * img.width + x1) << 2;
      const d = Math.max(
        Math.abs(img.data[a] - img.data[b]),
        Math.abs(img.data[a + 1] - img.data[b + 1]),
        Math.abs(img.data[a + 2] - img.data[b + 2]),
      );
      if (d > tol) strong++;
    }
    flags.push(strong >= need);
  }
  const cuts = [];
  let start = -1;
  flags.forEach((f, i) => {
    if (f && start < 0) start = i;
    if ((!f || i === flags.length - 1) && start >= 0) {
      const end = f ? i + 1 : i;
      cuts.push(Math.round((start + end) / 2) + 1);
      start = -1;
    }
  });
  return cuts.filter((c, i) => i === 0 || c - cuts[i - 1] >= minGap);
}

export function segmentImage(img, opts = {}) {
  const flatTol = Number(opts.flatTol ?? 10);
  const bandTol = Number(opts.bandTol ?? 4);
  const bgTol = Number(opts.bgTol ?? 12);
  const minGap = Number(opts.minGap ?? 12);
  const minLeaf = Number(opts.minLeaf ?? 64);
  const maxDepth = Number(opts.depth ?? 6);
  const maxLeaf = Number(opts.maxLeaf ?? 40);
  const root = { x: 0, y: 0, w: img.width, h: img.height };
  let leafCount = 0;

  const leafOf = (region) => ({
    type: 'leaf',
    id: `seg-${++leafCount}`,
    box: [region.x, region.y, region.w, region.h],
    kind: 'ui',
  });

  const recurse = (region, depth) => {
    if (depth >= maxDepth || leafCount >= maxLeaf
      || (region.w < minLeaf * 2 && region.h < minLeaf * 2)) {
      return leafOf(region);
    }

    const bg = modalColor(img, region);
    const candidates = [];
    for (const axis of ['row', 'col']) {
      const flags = gapFlags(img, region, axis, bg, { flatTol, bandTol, bgTol });
      for (const run of boundedGapRuns(flags, minGap)) {
        const at = axis === 'row' ? region.y + run.end : region.x + run.end;
        candidates.push({ axis, kind: 'gap', at, thick: run.len });
      }
      for (const at of edgeCuts(img, region, axis, { minGap })) {
        const abs = axis === 'row' ? region.y + at : region.x + at;
        const mainSize = axis === 'row' ? region.h : region.w;
        const rel = abs - (axis === 'row' ? region.y : region.x);
        if (rel >= minLeaf / 2 && rel <= mainSize - minLeaf / 2) {
          candidates.push({ axis, kind: 'edge', at: abs, thick: 0 });
        }
      }
    }
    if (candidates.length === 0) return leafOf(region);
    candidates.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'gap' ? -1 : 1;
      if (b.thick !== a.thick) return b.thick - a.thick;
      return a.axis === 'row' ? -1 : 1;
    });
    const cut = candidates[0];
    const first = cut.axis === 'row'
      ? { ...region, h: cut.at - region.y }
      : { ...region, w: cut.at - region.x };
    const second = cut.axis === 'row'
      ? { x: region.x, y: cut.at, w: region.w, h: region.y + region.h - cut.at }
      : { x: cut.at, y: region.y, w: region.x + region.w - cut.at, h: region.h };
    if (first.w <= 0 || first.h <= 0 || second.w <= 0 || second.h <= 0) return leafOf(region);

    const nodeType = cut.axis === 'row' ? 'col' : 'row'; // corte em linhas → empilha
    return {
      type: nodeType,
      box: [region.x, region.y, region.w, region.h],
      cut: { axis: cut.axis, at: cut.at, kind: cut.kind },
      children: [recurse(first, depth + 1), recurse(second, depth + 1)],
    };
  };

  const tree = recurse(root, 0);
  const leaves = [];
  const walk = (n) => {
    if (!n.children) leaves.push(n);
    else n.children.forEach(walk);
  };
  walk(tree);
  note(`segment: ${leaves.length} folhas propostas`);
  return { tree, leaves };
}

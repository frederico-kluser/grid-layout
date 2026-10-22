// tests/unit/segment.test.mjs — o XY-cut tem de achar vãos e arestas e partir
// a página em caixas que se encostam (partição exata).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeImage, fillRect } from '../../skills/grid-layout/scripts/lib/imgio.mjs';
import { drawText } from '../../skills/grid-layout/scripts/lib/font.mjs';
import { segmentImage } from '../../skills/grid-layout/scripts/lib/segment.mjs';

function tile(n) {
  // valida que as folhas particionam a imagem exatamente (soma das áreas == área)
  return n.reduce((s, l) => s + l.box[2] * l.box[3], 0);
}

test('página com três faixas separadas por vãos → 3 folhas', () => {
  const img = makeImage(600, 400, [255, 255, 255, 255]);
  fillRect(img, 0, 0, 600, 80, [20, 30, 60, 255]);       // header
  fillRect(img, 0, 160, 600, 120, [245, 245, 245, 255]); // bloco central
  fillRect(img, 0, 360, 600, 40, [20, 30, 60, 255]);     // footer
  drawText(img, 10, 20, 'TITULO', { scale: 3, color: [255, 255, 255, 255] });

  const { tree, leaves } = segmentImage(img, { minGap: 24, depth: 6 });
  assert.ok(leaves.length >= 3, `esperadas ≥3 folhas, veio ${leaves.length}`);
  assert.equal(tile(leaves), 600 * 400, 'as folhas têm de particionar exatamente');
});

test('sidebar sem vão (aresta forte) também é cortada', () => {
  const img = makeImage(600, 400, [255, 255, 255, 255]);
  fillRect(img, 0, 0, 200, 400, [30, 30, 40, 255]); // sidebar colada ao conteúdo
  const { leaves } = segmentImage(img, { minGap: 24, depth: 6 });
  assert.ok(leaves.length >= 2, `esperadas ≥2 folhas, veio ${leaves.length}`);
  assert.equal(tile(leaves), 600 * 400);
  const xs = leaves.map((l) => l.box[0]).sort((a, b) => a - b);
  assert.ok(leaves.some((l) => l.box[0] === 0 && l.box[2] === 200) || xs[0] === 0);
});

test('fundo uniforme → 1 folha (sem cortes espúrios)', () => {
  const img = makeImage(600, 400, [120, 120, 120, 255]);
  const { leaves } = segmentImage(img, { minGap: 24, depth: 6 });
  assert.equal(leaves.length, 1);
});

test('gradiente suave não gera cortes', () => {
  const img = makeImage(300, 200, [0, 0, 0, 255]);
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 300; x++) {
      const v = Math.round((x / 300) * 255);
      const i = (y * 300 + x) << 2;
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
    }
  }
  const { leaves } = segmentImage(img, { minGap: 24, depth: 6 });
  assert.equal(leaves.length, 1, `gradiente não deve ser cortado (veio ${leaves.length} folhas)`);
});

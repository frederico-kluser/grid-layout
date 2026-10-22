// tests/unit/geom.test.mjs — rótulos de célula, caminhos recursivos, caixas.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rowLabel, rowIndex, resolveCellPath, toLogical, clampBox, expandBox,
  boxIntersect, roundBoxToDpr,
} from '../../skills/grid-layout/scripts/lib/geom.mjs';

test('rótulos de linha estilo folha de cálculo', () => {
  assert.equal(rowLabel(0), 'A');
  assert.equal(rowLabel(25), 'Z');
  assert.equal(rowLabel(26), 'AA');
  assert.equal(rowLabel(27), 'AB');
  assert.equal(rowIndex('A'), 0);
  assert.equal(rowIndex('AA'), 26);
  assert.equal(rowIndex('zz'), 701);
});

test('célula simples resolve para o retângulo exato', () => {
  const root = { x: 0, y: 0, w: 1200, h: 800 };
  const { rect } = resolveCellPath('B2', root, { cols: 12, rows: 8, sub: 4 });
  assert.deepEqual(rect, { x: 100, y: 100, w: 100, h: 100 });
});

test('união de células (fronteira partilhada) cobre as duas', () => {
  const root = { x: 0, y: 0, w: 1200, h: 800 };
  const { rect } = resolveCellPath('D3+E3', root, { cols: 12, rows: 8, sub: 4 });
  // linhas são letras, colunas são números: D3 = linha D(3), coluna 3
  // → x 200..300, y 300..400; E3 = y 400..500 → união vertical 200..300 × 300..500
  assert.deepEqual(rect, { x: 200, y: 300, w: 100, h: 200 });
});

test('caminho recursivo B2.C1 desce para a sub-grelha', () => {
  const root = { x: 0, y: 0, w: 1200, h: 800 };
  const { rect, labels } = resolveCellPath('B2.C1', root, { cols: 12, rows: 8, sub: 4 });
  // B2 = 100,100,100,100 → sub 4×4 → C1 = linha C(2), coluna 1 → 25px cada
  assert.deepEqual(rect, { x: 100, y: 150, w: 25, h: 25 });
  assert.equal(labels.length, 2);
  assert.deepEqual(labels[1], { level: 1, label: 'C1', dims: '4x4' });
});

test('célula fora da grelha é erro claro', () => {
  const root = { x: 0, y: 0, w: 100, h: 100 };
  assert.throws(() => resolveCellPath('Z9', root, { cols: 12, rows: 8, sub: 4 }), /fora da grelha/);
  assert.throws(() => resolveCellPath('3B', root, { cols: 12, rows: 8, sub: 4 }), /célula inválida/);
});

test('unidades lógicas por eixo 0..1000', () => {
  const root = { x: 0, y: 0, w: 1000, h: 500 };
  const l = toLogical({ x: 250, y: 125, w: 500, h: 250 }, root);
  assert.deepEqual(l, { x0: 250, y0: 250, x1: 750, y1: 750, w: 500, h: 500 });
});

test('caixas: clamp, expansão, interseção e arrumo por dpr', () => {
  assert.deepEqual(clampBox({ x: -5, y: -5, w: 20, h: 20 }, 10, 10), { x: 0, y: 0, w: 10, h: 10 });
  assert.deepEqual(expandBox({ x: 10, y: 10, w: 10, h: 10 }, 5, 100, 100), { x: 5, y: 5, w: 20, h: 20 });
  assert.equal(boxIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }).w, 5);
  assert.equal(boxIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 0, w: 5, h: 5 }), null);
  assert.deepEqual(roundBoxToDpr({ x: 1, y: 3, w: 413, h: 97 }, 2), { x: 2, y: 4, w: 412, h: 96 });
});

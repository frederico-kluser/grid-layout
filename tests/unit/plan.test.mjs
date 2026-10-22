// tests/unit/plan.test.mjs — partição exata, validação, vizinhos, BRIEF.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  skeletonPlan, validatePlan, leavesOf, leafNeighbors, renderBrief, detectBackdrop,
} from '../../skills/grid-layout/scripts/lib/plan.mjs';
import { makeImage, fillRect, writeImage } from '../../skills/grid-layout/scripts/lib/imgio.mjs';

function planWith(tree) {
  return {
    version: 1,
    reference: { image: 'reference/ref.png', width: 1440, height: 900, dpr: 1 },
    viewport: { width: 1440, height: 900 },
    stack: 'html',
    tokens: 'tokens.css',
    tree,
  };
}

const GOOD_TREE = {
  id: 'page', type: 'col', box: [0, 0, 1440, 900],
  children: [
    { id: 'header', type: 'leaf', kind: 'ui', box: [0, 0, 1440, 72] },
    {
      id: 'main', type: 'row', box: [0, 72, 1440, 748],
      children: [
        { id: 'sidebar', type: 'leaf', kind: 'ui', box: [0, 72, 240, 748] },
        { id: 'content', type: 'leaf', kind: 'ui', box: [240, 72, 1200, 748] },
      ],
    },
    { id: 'footer', type: 'leaf', kind: 'ui', box: [0, 820, 1440, 80] },
  ],
};

test('árvore que particiona exatamente → sem erros', () => {
  const { errors, warnings } = validatePlan(planWith(GOOD_TREE));
  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 0);
});

test('buraco entre filhos é erro com coordenadas', () => {
  const tree = structuredClone(GOOD_TREE);
  tree.children[1].children[1].box = [300, 72, 1140, 748]; // 60px de buraco
  const { errors } = validatePlan(planWith(tree));
  assert.ok(errors.some((e) => e.includes('buraco') && e.includes('60')));
});

test('sobreposição entre filhos é erro', () => {
  const tree = structuredClone(GOOD_TREE);
  tree.children[1].children[1].box = [200, 72, 1240, 748];
  const { errors } = validatePlan(planWith(tree));
  assert.ok(errors.some((e) => e.includes('sobreposição')));
});

test('id duplicado é erro; id inválido é erro', () => {
  const tree = structuredClone(GOOD_TREE);
  tree.children[0].id = 'footer';
  assert.ok(validatePlan(planWith(tree)).errors.some((e) => e.includes('duplicado')));
  const tree2 = structuredClone(GOOD_TREE);
  tree2.children[0].id = 'Header!';
  assert.ok(validatePlan(planWith(tree2)).errors.some((e) => e.includes('id inválido')));
});

test('box fora dos limites do pai é erro', () => {
  const tree = structuredClone(GOOD_TREE);
  tree.children[0].box = [0, 0, 1500, 72];
  assert.ok(validatePlan(planWith(tree)).errors.length > 0);
});

test('folhas minúsculas geram aviso; caixas não múltiplas de dpr geram aviso', () => {
  const tree = structuredClone(GOOD_TREE);
  tree.children[0].box = [0, 0, 1440, 20];
  const { warnings } = validatePlan(planWith(tree));
  assert.ok(warnings.some((w) => w.includes('minúscula')));

  const odd = planWith({
    id: 'page', type: 'col', box: [0, 0, 101, 100],
    children: [{ id: 'only', type: 'leaf', kind: 'ui', box: [0, 0, 101, 100] }],
  });
  odd.reference.width = 101;
  odd.reference.height = 100;
  odd.reference.dpr = 2;
  assert.ok(validatePlan(odd).warnings.some((w) => w.includes('dpr')));
});

test('leavesOf devolve só as folhas', () => {
  const plan = planWith(GOOD_TREE);
  assert.deepEqual(leavesOf(plan.tree).map((l) => l.id), ['header', 'sidebar', 'content', 'footer']);
});

test('vizinhos e vãos são calculados', () => {
  const plan = planWith(GOOD_TREE);
  const { neighbors, gutters } = leafNeighbors(plan, 'sidebar');
  assert.equal(neighbors.right, 'content');
  assert.equal(gutters.right, 0);
  const top = leafNeighbors(plan, 'content');
  assert.equal(top.neighbors.top, 'header');
});

test('BRIEF renderiza sem placeholders órfãos e com os números certos', () => {
  const plan = planWith(GOOD_TREE);
  const meta = {
    id: 'content', kind: 'ui', tier: 'standard', dpr: 1,
    box: { x: 240, y: 72, w: 1200, h: 748 },
    cssBox: { x: 240, y: 72, w: 1200, h: 748 },
    cssSize: { w: 1200, h: 748 },
    backdrop: { hex: '#ffffff', flat: true },
    thresholds: { structuralDistance: 0.02, edgeEnergyRatio: [0.95, 1.05], worstCell: 0.02 },
    neighbors: { left: 'sidebar', right: null, top: 'header', bottom: 'footer' },
    gutters: { left: 0, right: null, top: 0, bottom: 0 },
    notes: 'zona principal',
    gridStepPx: 16, zoomFactor: 1, gl: '/tmp/x/gl.mjs', ws: '/tmp/ws',
  };
  const brief = renderBrief(meta, plan);
  assert.ok(!brief.includes('{{'), `placeholder órfão: ${brief.match(/\{\{\w+\}\}/g)}`);
  assert.ok(brief.includes('1200×748 px'));
  assert.ok(brief.includes('structuralDistance ≤ 0.02'));
  assert.ok(brief.includes('sidebar'));
});

test('detectBackdrop devolve a cor do anel e deteta fundo não plano', () => {
  const img = makeImage(100, 100, [10, 20, 30, 255]);
  fillRect(img, 30, 30, 40, 40, [200, 10, 10, 255]);
  const b = detectBackdrop(img, { x: 30, y: 30, w: 40, h: 40 });
  assert.equal(b.hex.toLowerCase(), '#0a141e');
  assert.equal(b.flat, true);
});

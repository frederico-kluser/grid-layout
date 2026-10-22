// tests/unit/metrics.test.mjs — a porta de qualidade: o que passa, o que reprova,
// e se os hotspots apontam para o local certo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeImage, fillRect } from '../../skills/grid-layout/scripts/lib/imgio.mjs';
import { drawText } from '../../skills/grid-layout/scripts/lib/font.mjs';
import { diffImages, compare, sceneMetrics, thresholdsFor } from '../../skills/grid-layout/scripts/lib/metrics.mjs';

function fixture(w = 200, h = 120) {
  const img = makeImage(w, h, [240, 240, 240, 255]);
  fillRect(img, 10, 10, 80, 40, [20, 40, 120, 255]);
  fillRect(img, 110, 20, 60, 20, [220, 60, 60, 255]);
  drawText(img, 12, 70, 'HELLO GRID', { scale: 2, color: [10, 10, 10, 255] });
  return img;
}

test('imagens idênticas → structuralDistance 0 e PASS', () => {
  const a = fixture();
  const b = fixture();
  const r = diffImages(a, b);
  assert.equal(r.sizeMismatch, false);
  assert.equal(r.structuralDistance, 0);
  assert.equal(r.pass, true);
  assert.equal(r.worstCell.diffRatio, 0);
  assert.equal(r.shiftHint, null);
});

test('deslocação de 1px é detetada e o shiftHint aponta a direção', () => {
  const ref = fixture();
  const cand = fixture();
  // desloca o bloco vermelho 1px para a direita
  fillRect(cand, 110, 20, 60, 20, [240, 240, 240, 255]);
  fillRect(cand, 111, 20, 60, 20, [220, 60, 60, 255]);
  const r = diffImages(ref, cand);
  assert.ok(r.structuralDistance > 0, 'erro de 1px não pode passar despercebido');
  assert.ok(r.pass === false, 'deslocação estrutural tem de reprovar');
  if (r.shiftHint) {
    assert.equal(Math.abs(r.shiftHint.dx), 1);
  }
});

test('bloco removido → hotspot na célula certa', () => {
  const ref = fixture();
  const cand = fixture();
  fillRect(cand, 110, 20, 60, 20, [240, 240, 240, 255]); // remove o bloco vermelho
  const r = diffImages(ref, cand);
  assert.equal(r.pass, false);
  const [hsX, hsY, hsW, hsH] = r.worstCell.box;
  // bloco vermelho está em x 110..170, y 20..40
  const inter = !(hsX + hsW < 110 || hsX > 170 || hsY + hsH < 20 || hsY > 40);
  assert.ok(inter, `hotspot ${r.worstCell.cell} ${JSON.stringify(r.worstCell.box)} não cobre o bloco removido`);
  assert.ok(r.edgeEnergyRatio < 0.95, 'energia de bordas cai quando falta geometria');
});

test('alteração de cor local reprova pelos limiares standard', () => {
  const ref = fixture();
  const cand = fixture();
  fillRect(cand, 10, 10, 80, 40, [20, 40, 121, 255]); // 1 de delta no azul
  const r = diffImages(ref, cand);
  // 1/255 de delta é ruído → tem de PASSAR (não cair no limiar de 32)
  assert.equal(r.diffRatio32, 0);
  assert.equal(r.pass, true);
  // mas uma cor claramente diferente reprova
  const cand2 = fixture();
  fillRect(cand2, 10, 10, 80, 40, [20, 140, 120, 255]);
  assert.equal(diffImages(ref, cand2).pass, false);
});

test('dimensões diferentes → sizeMismatch claro, sem crash', () => {
  const a = fixture(200, 120);
  const b = fixture(180, 120);
  const r = diffImages(a, b);
  assert.equal(r.sizeMismatch, true);
  assert.equal(r.pass, false);
  assert.deepEqual(r.refSize, [200, 120]);
  assert.deepEqual(r.candSize, [180, 120]);
  assert.ok(r.reason.includes('dimensões diferentes'));
});

test('cena vazia é detetada (capture quebrada não passa)', () => {
  const blank = makeImage(300, 200, [255, 255, 255, 255]);
  const s = sceneMetrics(blank);
  assert.equal(s.looksBlank, true);
  assert.ok(s.reasons.length >= 2);
  const real = fixture();
  assert.equal(sceneMetrics(real).looksBlank, false);
});

test('compare() reprovado quando o candidato parece vazio', () => {
  const ref = fixture();
  const blank = makeImage(200, 120, [255, 255, 255, 255]);
  const r = compare(ref, blank);
  assert.equal(r.pass, false);
  assert.ok(r.problems.some((p) => p.includes('vazio')));
});

test('limiares por tier são estritos/standard/loose', () => {
  assert.ok(thresholdsFor('strict').structuralDistance < thresholdsFor('standard').structuralDistance);
  assert.ok(thresholdsFor('loose').structuralDistance > thresholdsFor('standard').structuralDistance);
});

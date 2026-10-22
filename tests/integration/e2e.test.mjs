// tests/integration/e2e.test.mjs — pipeline completa com browser real.
// truth.html é renderizado como referência; os componentes reproduzem-no a
// partir das MESMAS primitivas (testa o maquinário: croppings, dpr, preview,
// montagem). Os casos negativos provam que o verify REPROVA erros reais e
// apanha batota (referência usada como imagem).
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GL = path.resolve(HERE, '../../skills/grid-layout/scripts/gl.mjs');

const W = 1440;
const H = 480;

function gl(args, { expectFail = false } = {}) {
  const res = spawnSync('node', [GL, ...args], { encoding: 'utf8', timeout: 120000 });
  if (res.status !== 0 && !expectFail) {
    throw new Error(`gl ${args.join(' ')} falhou (${res.status}):\n${res.stderr}\n${res.stdout}`);
  }
  let json = null;
  try { json = JSON.parse(res.stdout); } catch { /* pode não ser JSON */ }
  return { status: res.status, stdout: res.stdout, stderr: res.stderr, json };
}

// ---- primitivas partilhadas entre truth.html e os componentes -------------
const CSS = {
  header: `.gl-header { position: relative; width: 100%; height: 100%; box-sizing: border-box; background: #101828; font-family: Arial, sans-serif; }
.gl-header .title { position: absolute; left: 24px; top: 22px; color: #ffffff; font-size: 22px; font-weight: 700; }
.gl-header .btn { position: absolute; right: 24px; top: 18px; width: 104px; height: 36px; background: #2563eb; border-radius: 8px; }
.gl-header .btn span { position: absolute; left: 34px; top: 10px; color: #ffffff; font-size: 13px; font-weight: 700; }`,
  sidebar: `.gl-sidebar { position: relative; width: 100%; height: 100%; box-sizing: border-box; background: #1d2939; font-family: Arial, sans-serif; }
.gl-sidebar .item { position: absolute; left: 24px; color: #d0d5dd; font-size: 14px; }
.gl-sidebar .i1 { top: 24px; } .gl-sidebar .i2 { top: 64px; } .gl-sidebar .i3 { top: 104px; }`,
  content: `.gl-content { position: relative; width: 100%; height: 100%; box-sizing: border-box; background: #f2f4f7; font-family: Arial, sans-serif; }
.gl-content .card { position: absolute; top: 24px; width: 368px; height: 288px; background: #ffffff; border-radius: 12px; }
.gl-content .c1 { left: 24px; } .gl-content .c2 { left: 416px; } .gl-content .c3 { left: 808px; }
.gl-content .sq { position: absolute; left: 24px; top: 24px; width: 48px; height: 48px; background: #2563eb; border-radius: 10px; }
.gl-content .t1 { position: absolute; left: 24px; top: 88px; color: #101828; font-size: 16px; font-weight: 700; }
.gl-content .t2 { position: absolute; left: 24px; top: 112px; color: #475467; font-size: 13px; }`,
  footer: `.gl-footer { position: relative; width: 100%; height: 100%; box-sizing: border-box; background: #101828; font-family: Arial, sans-serif; }
.gl-footer .copy { position: absolute; left: 620px; top: 28px; color: #98a2b3; font-size: 13px; }`,
};

const FRAG = {
  header: `<section class="gl-header" data-gl-id="header">
  <div class="title">GRID LAYOUT</div>
  <div class="btn"><span>NOVO</span></div>
</section>`,
  sidebar: `<section class="gl-sidebar" data-gl-id="sidebar">
  <div class="item i1">Visao geral</div>
  <div class="item i2">Metricas</div>
  <div class="item i3">Definicoes</div>
</section>`,
  content: `<section class="gl-content" data-gl-id="content">
  <div class="card c1"><div class="sq"></div><div class="t1">Metrica 01</div><div class="t2">valor medido</div></div>
  <div class="card c2"><div class="sq"></div><div class="t1">Metrica 02</div><div class="t2">valor medido</div></div>
  <div class="card c3"><div class="sq"></div><div class="t1">Metrica 03</div><div class="t2">valor medido</div></div>
</section>`,
  footer: `<section class="gl-footer" data-gl-id="footer">
  <div class="copy">(C) 2026 GRID LAYOUT</div>
</section>`,
};

function truthHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; padding: 0; }
  .page { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; }
  .abs { position: absolute; }
  ${Object.values(CSS).join('\n')}
  </style></head><body><div class="page">
  <div class="abs" style="left:0;top:0;width:1440px;height:72px">${FRAG.header}</div>
  <div class="abs" style="left:0;top:72px;width:240px;height:336px">${FRAG.sidebar}</div>
  <div class="abs" style="left:240px;top:72px;width:1200px;height:336px">${FRAG.content}</div>
  <div class="abs" style="left:0;top:408px;width:1440px;height:72px">${FRAG.footer}</div>
  </div></body></html>`;
}

const PLAN = {
  version: 1,
  reference: { image: 'reference/ref.png', width: W, height: H, dpr: 1 },
  viewport: { width: W, height: H },
  stack: 'html',
  tokens: 'tokens.css',
  thresholds: { structuralDistance: 0.02, edgeEnergyRatio: [0.95, 1.05], worstCell: 0.02 },
  tree: {
    id: 'page', type: 'col', box: [0, 0, W, H],
    children: [
      { id: 'header', type: 'leaf', kind: 'ui', tier: 'standard', box: [0, 0, 1440, 72], notes: 'barra superior escura' },
      {
        id: 'main', type: 'row', box: [0, 72, 1440, 336],
        children: [
          { id: 'sidebar', type: 'leaf', kind: 'ui', tier: 'standard', box: [0, 72, 240, 336], notes: 'navegacao lateral' },
          { id: 'content', type: 'leaf', kind: 'ui', tier: 'standard', box: [240, 72, 1200, 336], notes: 'tres cartoes' },
        ],
      },
      { id: 'footer', type: 'leaf', kind: 'ui', tier: 'standard', box: [0, 408, 1440, 72], notes: 'rodape' },
    ],
  },
};

test('pipeline E2E: init → plan → prep → verify → assemble → diff → status → report', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gl-e2e-'));
  const ws = path.join(dir, 'ws');
  const truth = path.join(dir, 'truth.html');
  fs.writeFileSync(truth, truthHtml());

  // 1. render da verdade
  const shot = gl(['shot', '--file', truth, '--out', path.join(dir, 'ref-src.png'), '--w', String(W), '--h', String(H)]);
  assert.equal(shot.status, 0);

  // 2. init
  const init = gl(['init', '--image', path.join(dir, 'ref-src.png'), '--ws', ws, '--dpr', '1']);
  assert.equal(init.json.reference.width, W);
  assert.equal(init.json.reference.height, H);

  // 3. plan.json (decomposição conhecida) + validação
  fs.writeFileSync(path.join(ws, 'plan.json'), `${JSON.stringify(PLAN, null, 2)}\n`);
  const check = gl(['plan', 'check', '--ws', ws]);
  assert.equal(check.json.ok, true, JSON.stringify(check.json.errors));

  // 4. prep
  const prep = gl(['prep', '--ws', ws]);
  assert.equal(prep.json.components.length, 4);
  for (const id of ['header', 'sidebar', 'content', 'footer']) {
    const dirId = path.join(ws, 'components', id);
    for (const f of ['ref.png', 'ref-grid.png', 'ref-zoom.png', 'meta.json', 'BRIEF.md', 'preview.html', 'component.html', 'component.css']) {
      assert.ok(fs.existsSync(path.join(dirId, f)), `${id}/${f} em falta`);
    }
    assert.ok(fs.readFileSync(path.join(dirId, 'BRIEF.md'), 'utf8').includes('structuralDistance'));
  }

  // 5. componentes (as mesmas primitivas do truth)
  for (const [id, css] of Object.entries(CSS)) {
    const dirId = path.join(ws, 'components', id);
    fs.writeFileSync(path.join(dirId, 'component.css'), css);
    fs.writeFileSync(path.join(dirId, 'component.html'), FRAG[id]);
  }

  // 6. verify --all → todos PASS
  const verify = gl(['verify', '--ws', ws, '--all']);
  assert.equal(verify.status, 0, verify.stderr);
  for (const r of verify.json.results) {
    assert.equal(r.pass, true, `${r.id} falhou: ${JSON.stringify(r.problems)}`);
    assert.ok(r.metrics.structuralDistance <= 0.005, `${r.id} sd=${r.metrics.structuralDistance}`);
  }

  // 7. assemble + diff da página completa
  const assembled = gl(['assemble', '--ws', ws]);
  assert.ok(fs.existsSync(assembled.json.out));
  const pageShot = gl(['shot', '--file', assembled.json.out, '--out', path.join(ws, 'page', 'shot.png'), '--w', String(W), '--h', String(H)]);
  assert.equal(pageShot.status, 0);
  const diff = gl(['diff', '--ref', path.join(ws, 'reference', 'ref.png'), '--cand', path.join(ws, 'page', 'shot.png'), '--out-dir', path.join(ws, 'page')]);
  assert.equal(diff.json.pass, true, `página diffa mal: ${JSON.stringify(diff.json)}`);
  assert.ok(diff.json.structuralDistance <= 0.005);

  // 8. status + report
  const status = gl(['status', '--ws', ws]);
  assert.equal(status.json.totals.passing, 4);
  const report = gl(['report', '--ws', ws]);
  assert.ok(fs.existsSync(path.join(report.json.outDir, 'index.html')));
  assert.ok(fs.existsSync(path.join(report.json.outDir, 'summary.md')));

  // ---- NEGATIVO 1: erro real tem de reprovar com hotspot ----------------
  const contentDir = path.join(ws, 'components', 'content');
  fs.writeFileSync(path.join(contentDir, 'component.css'), CSS.content.replace('top: 24px;', 'top: 64px;'));
  const bad = gl(['verify', '--ws', ws, '--id', 'content'], { expectFail: true });
  assert.equal(bad.status, 1);
  assert.equal(bad.json.results[0].pass, false);
  assert.ok(bad.json.results[0].metrics.structuralDistance > 0.01, 'erro de 40px não foi medido');

  // ---- NEGATIVO 2: batota (referência como imagem) é apanhada ----------
  fs.writeFileSync(path.join(contentDir, 'component.css'), CSS.content);
  fs.writeFileSync(path.join(contentDir, 'component.html'),
    `<section class="gl-content" data-gl-id="content"><img src="ref.png" style="width:100%;height:100%"></section>`);
  const cheat = gl(['verify', '--ws', ws, '--id', 'content'], { expectFail: true });
  assert.equal(cheat.json.results[0].pass, false);
  assert.ok(cheat.json.results[0].lint.problems.some((p) => p.includes('BATOTA')), JSON.stringify(cheat.json.results[0].lint));

  fs.rmSync(dir, { recursive: true, force: true });
});

test('caixa errada (root não preenche) é reportada com medidas', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gl-box-'));
  const ws = path.join(dir, 'ws');
  const truth = path.join(dir, 'truth.html');
  fs.writeFileSync(truth, truthHtml());
  gl(['shot', '--file', truth, '--out', path.join(dir, 'ref-src.png'), '--w', String(W), '--h', String(H)]);
  gl(['init', '--image', path.join(dir, 'ref-src.png'), '--ws', ws, '--dpr', '1']);
  fs.writeFileSync(path.join(ws, 'plan.json'), `${JSON.stringify(PLAN, null, 2)}\n`);
  gl(['prep', '--ws', ws, '--id', 'footer']);
  const dirId = path.join(ws, 'components', 'footer');
  fs.writeFileSync(path.join(dirId, 'component.html'), FRAG.footer);
  fs.writeFileSync(path.join(dirId, 'component.css'), CSS.footer.replace('width: 100%; height: 100%; ', ''));

  const res = gl(['verify', '--ws', ws, '--id', 'footer'], { expectFail: true });
  assert.equal(res.json.results[0].pass, false);
  assert.equal(res.json.results[0].boxCheck.ok, false);
  assert.ok(res.json.results[0].problems.some((p) => p.includes('caixa do root')));
  fs.rmSync(dir, { recursive: true, force: true });
});

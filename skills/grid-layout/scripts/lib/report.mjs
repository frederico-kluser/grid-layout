// lib/report.mjs — relatório agregado para humanos (report/index.html) e para
// agentes (report/summary.md + summary.json).
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, note } from './util.mjs';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function writeReport(ws, plan, entries, opts = {}) {
  const outDir = path.resolve(ws, opts.out || 'report');
  ensureDir(outDir);

  const rows = entries.map((e) => {
    const m = e.metrics || {};
    const badge = e.pass
      ? '<span class="ok">PASS</span>'
      : '<span class="bad">FAIL</span>';
    return `<tr>
      <td><code>${esc(e.id)}</code></td>
      <td>${badge}</td>
      <td>${m.structuralDistance ?? '—'}</td>
      <td>${m.worstCell ? `${m.worstCell.diffRatio} (${m.worstCell.cell})` : '—'}</td>
      <td>${m.edgeEnergyRatio ?? '—'}</td>
      <td>${esc((e.problems || []).join('; ') || '—')}</td>
    </tr>`;
  }).join('\n');

  const cards = entries.map((e) => {
    const base = `../components/${e.id}`;
    return `<section class="card">
      <h2>${esc(e.id)} · ${e.pass ? 'PASS' : 'FAIL'}</h2>
      <div class="imgs">
        <figure><img src="${base}/ref.png" alt="ref"><figcaption>ref</figcaption></figure>
        <figure><img src="${base}/cand.png" alt="cand"><figcaption>cand</figcaption></figure>
        <figure><img src="${base}/diff.png" alt="diff"><figcaption>diff</figcaption></figure>
        <figure><img src="${base}/side-by-side.png" alt="side"><figcaption>side-by-side</figcaption></figure>
      </div>
    </section>`;
  }).join('\n');

  const pageBlock = opts.pageMetrics ? `<section class="card">
      <h2>página completa · ${opts.pageMetrics.pass ? 'PASS' : 'FAIL'}</h2>
      <pre>${esc(JSON.stringify(opts.pageMetrics, null, 2))}</pre>
    </section>` : '';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>gl report</title>
<style>
  body { font: 14px/1.5 system-ui, sans-serif; margin: 24px; background: #111; color: #eee; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 24px; }
  th, td { border: 1px solid #333; padding: 6px 10px; text-align: left; }
  .ok { color: #37d67a; font-weight: 700; }
  .bad { color: #ff5c5c; font-weight: 700; }
  .card { margin-bottom: 32px; }
  .imgs { display: flex; gap: 12px; flex-wrap: wrap; }
  figure { margin: 0; }
  img { max-width: 320px; border: 1px solid #333; background: #fff; image-rendering: auto; }
  figcaption { text-align: center; color: #999; }
  pre { background: #1b1b1b; padding: 12px; overflow: auto; }
</style>
</head>
<body>
<h1>gl report — ${esc(plan.reference?.image || '')}</h1>
<table>
  <tr><th>componente</th><th>estado</th><th>structuralDistance</th><th>worstCell</th><th>edgeEnergyRatio</th><th>problemas</th></tr>
  ${rows}
</table>
${pageBlock}
${cards}
</body>
</html>
`;
  fs.writeFileSync(path.join(outDir, 'index.html'), html);

  const md = [
    '# gl report — resumo',
    '',
    `| componente | estado | structuralDistance | worstCell | edgeEnergyRatio | problemas |`,
    `|---|---|---|---|---|---|`,
    ...entries.map((e) => {
      const m = e.metrics || {};
      return `| \`${e.id}\` | ${e.pass ? 'PASS' : 'FAIL'} | ${m.structuralDistance ?? '—'} | ${
        m.worstCell ? `${m.worstCell.diffRatio} (${m.worstCell.cell})` : '—'} | ${m.edgeEnergyRatio ?? '—'} | ${
        (e.problems || []).join('; ') || '—'} |`;
    }),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(outDir, 'summary.md'), md);
  fs.writeFileSync(path.join(outDir, 'summary.json'), `${JSON.stringify({ entries, page: opts.pageMetrics || null }, null, 2)}\n`);
  note(`relatório: ${path.join(outDir, 'index.html')}`);
  return outDir;
}

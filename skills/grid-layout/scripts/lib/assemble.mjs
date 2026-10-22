// lib/assemble.mjs — preview isolado por componente e montagem da página final.
//
// preview.html  : harness do componente (gerado — nunca editar à mão). Mostra
//                 SÓ o componente na sua caixa exata, sobre o fundo imediato.
// page/index.html: página final montada pela árvore do plan.json (row/col/abs),
//                 com os fragmentos de cada componente inline e o CSS linkado.
import fs from 'node:fs';
import path from 'node:path';
import { fail, note, ensureDir, EXIT } from './util.mjs';

export function readFragment(compDir) {
  const fragPath = path.join(compDir, 'component.html');
  if (!fs.existsSync(fragPath)) {
    fail(`component.html em falta em ${compDir}`, 'corra `gl prep` e construa o componente', EXIT.INPUT);
  }
  return fs.readFileSync(fragPath, 'utf8');
}

// Reescreve caminhos `assets/...` num fragmento inline (o CSS linkado não precisa:
// url() resolve relativamente ao próprio ficheiro CSS).
export function rewriteFragmentAssets(html, prefix) {
  return html
    .replace(/(src|href|poster)="assets\//g, `$1="${prefix}assets/`)
    .replace(/(src|href|poster)='assets\//g, `$1='${prefix}assets/`)
    .replace(/srcset="([^"]*)"/g, (m, value) => `srcset="${value.replace(/(^|,\s*)assets\//g, `$1${prefix}assets/`)}"`);
}

export function previewHtml(meta, plan, fragment) {
  const { cssSize, backdrop, rootClass, id } = meta;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>preview ${id}</title>
<link rel="stylesheet" href="../../tokens.css">
<link rel="stylesheet" href="component.css">
<style>
  html, body { margin: 0; padding: 0; }
  body { width: ${cssSize.w}px; height: ${cssSize.h}px; overflow: hidden; background: ${backdrop.hex}; }
  #gl-stage { width: ${cssSize.w}px; height: ${cssSize.h}px; overflow: hidden; position: relative; }
</style>
</head>
<body>
<div id="gl-stage">
${fragment}
</div>
</body>
</html>
`;
}

export function writePreview(compDir, meta, plan) {
  const fragment = readFragment(compDir);
  fs.writeFileSync(path.join(compDir, 'preview.html'), previewHtml(meta, plan, fragment));
  return path.join(compDir, 'preview.html');
}

// ---------------------------------------------------------------------------
// Página final
// ---------------------------------------------------------------------------
function slotHtml(node, plan, ws) {
  const [x, y, w, h] = node.box;
  const dpr = Number(plan.reference.dpr || 1);
  const cssW = w / dpr;
  const cssH = h / dpr;
  const isLeaf = node.type === 'leaf' || !node.children || node.children.length === 0;
  if (isLeaf) {
    const compDir = path.join(ws, 'components', node.id);
    const fragment = rewriteFragmentAssets(readFragment(compDir), `../components/${node.id}/`);
    return `<div class="gl-slot gl-slot-${node.id}" style="width:${cssW}px;height:${cssH}px">\n${fragment}\n</div>`;
  }
  const type = node.type || 'row';
  const inner = node.children.map((child) => slotHtml(child, plan, ws)).join('\n');
  if (type === 'abs') {
    const absKids = node.children.map((child) => {
      const [cx, cy, cw, ch] = child.box;
      return `<div class="gl-slot gl-slot-${child.id || 'x'}" style="left:${(cx - x) / dpr}px;top:${(cy - y) / dpr}px;width:${cw / dpr}px;height:${ch / dpr}px">\n${
        child.type === 'leaf' || !child.children || child.children.length === 0
          ? rewriteFragmentAssets(readFragment(path.join(ws, 'components', child.id)), `../components/${child.id}/`)
          : slotHtml(child, plan, ws)
      }\n</div>`;
    }).join('\n');
    return `<div class="gl-node gl-abs" style="width:${cssW}px;height:${cssH}px">\n${absKids}\n</div>`;
  }
  return `<div class="gl-node ${type === 'row' ? 'gl-row' : 'gl-col'}" style="width:${cssW}px;height:${cssH}px">\n${inner}\n</div>`;
}

export function layoutCss(pageCssW, pageCssH, pageBg) {
  return `/* layout gerado por gl assemble — não editar */
html, body { margin: 0; padding: 0; }
body { background: ${pageBg}; }
.gl-page { position: relative; width: ${pageCssW}px; height: ${pageCssH}px; overflow: hidden; }
.gl-row { display: flex; flex-direction: row; align-items: stretch; }
.gl-col { display: flex; flex-direction: column; align-items: stretch; }
.gl-abs { position: relative; }
.gl-slot { flex: none; position: relative; }
.gl-abs > .gl-slot { position: absolute; }
`;
}

export function assemblePage(ws, plan, opts = {}) {
  const outDir = path.resolve(ws, opts.out || 'page');
  ensureDir(outDir);
  const [W, H] = [plan.tree.box[2], plan.tree.box[3]];
  const dpr = Number(plan.reference.dpr || 1);
  const pageCssW = W / dpr;
  const pageCssH = H / dpr;
  const pageBg = opts.pageBg || plan.pageBackground || '#ffffff';

  const root = slotHtml(plan.tree.type ? plan.tree : { ...plan.tree, type: 'col' }, plan, ws);
  // a raiz da árvore NÃO é slot: é a própria .gl-page
  const inner = plan.tree.children
    ? plan.tree.children.map((child) => slotHtml(child, plan, ws)).join('\n')
    : root;

  const cssLinks = [...new Set(leavesOfLocal(plan.tree).map((l) => l.id))]
    .map((id) => `<link rel="stylesheet" href="../components/${id}/component.css">`)
    .join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>gl-assembled</title>
<link rel="stylesheet" href="../tokens.css">
${cssLinks}
<style>
${layoutCss(pageCssW, pageCssH, pageBg)}
</style>
</head>
<body>
<div class="gl-page">
${inner}
</div>
</body>
</html>
`;
  const outFile = path.join(outDir, 'index.html');
  fs.writeFileSync(outFile, html);
  note(`página montada: ${outFile}`);
  return outFile;
}

function leavesOfLocal(tree) {
  const out = [];
  const walk = (n) => {
    if (!n.children || n.children.length === 0) out.push(n);
    else n.children.forEach(walk);
  };
  walk(tree);
  return out;
}

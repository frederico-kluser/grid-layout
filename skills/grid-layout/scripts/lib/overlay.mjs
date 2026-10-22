// lib/overlay.mjs — sobreposições desenhadas sobre os píxeis: grelha rotulada,
// miras, réguas de coordenadas, contexto escurecido do zoom, chips de rótulo.
// Tudo em píxeis puros + fonte bitmap (ver font.mjs): funciona em qualquer máquina.
import { fillRect, strokeRect, drawLine, drawCross } from './imgio.mjs';
import { drawText, textSize } from './font.mjs';

const CYAN = [0, 255, 255, 255];
const CYAN_DIM = [0, 255, 255, 120];
const YELLOW = [255, 255, 0, 255];
const CHIP_BG = [0, 0, 0, 190];

export function drawChip(img, x, y, text, { scale = 1, color = CYAN, bg = CHIP_BG } = {}) {
  return drawText(img, x, y, text, { scale, color, bg, pad: 2 * scale });
}

// Escala de rótulo legível mesmo depois de o harness reduzir a imagem:
// ~3% do lado curto, mínimo 2.
export function labelScaleFor(img, override) {
  if (override) return Math.max(1, Math.round(override));
  const short = Math.min(img.width, img.height);
  return Math.max(2, Math.min(6, Math.round(short * 0.028)));
}

// Grelha de células A1.. com mira central e rótulo por célula.
// opts: {cols, rows, region:{x,y,w,h}, labelScale, crosshair, showCoords, coordOffset}
export function drawCellGrid(img, opts) {
  const region = opts.region || { x: 0, y: 0, w: img.width, h: img.height };
  const { cols, rows } = opts;
  const s = opts.labelScale || labelScaleFor(img);
  const cellW = region.w / cols;
  const cellH = region.h / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = region.x + c * cellW;
      const y = region.y + r * cellH;
      strokeRect(img, x, y, cellW, cellH, CYAN_DIM, 1);
      const cx = x + cellW / 2;
      const cy = y + cellH / 2;
      if (opts.crosshair !== false) drawCross(img, cx, cy, Math.min(12, cellW * 0.15), CYAN, 1);
      if (opts.labels !== false) {
        const label = `${rowLabelLocal(r)}${c + 1}`;
        const extra = opts.showCoords
          ? ` ${Math.round(x - (opts.coordOffset?.x || 0))},${Math.round(y - (opts.coordOffset?.y || 0))}`
          : '';
        drawChip(img, x + 2 * s, y + 2 * s, `${label}${extra}`, { scale: s });
      }
    }
  }
  return { region, cols, rows, cellW, cellH };
}

function rowLabelLocal(index) {
  let n = index;
  let out = '';
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

// Régua: linhas a cada `step` px (principais a cada 5 passos) com coordenadas
// numéricas nas bordas. O `coordOffset` soma-se às etiquetas (coordenadas
// globais da imagem de origem para que o zoom se mapeie de volta).
// opts: {step, region, labelScale, coordOffset, crosshairAt}
export function drawRulerGrid(img, opts) {
  const region = opts.region || { x: 0, y: 0, w: img.width, h: img.height };
  const step = Math.max(1, Math.round(opts.step || 16));
  const s = opts.labelScale || labelScaleFor(img);
  const off = opts.coordOffset || { x: 0, y: 0 };

  for (let x = 0; x <= region.w; x += step) {
    const px = region.x + x;
    const major = (x / step) % 5 === 0;
    drawLine(img, px, region.y, px, region.y + region.h, major ? CYAN_DIM : [0, 255, 255, 60], 1);
    if (major && x > 0) {
      drawChip(img, px + 2 * s, region.y + 2 * s, String(Math.round(off.x + x)), { scale: s });
    }
  }
  for (let y = 0; y <= region.h; y += step) {
    const py = region.y + y;
    const major = (y / step) % 5 === 0;
    drawLine(img, region.x, py, region.x + region.w, py, major ? CYAN_DIM : [0, 255, 255, 60], 1);
    if (major && y > 0) {
      drawChip(img, region.x + 2 * s, py + 2 * s, String(Math.round(off.y + y)), { scale: s });
    }
  }
  if (opts.crosshairAt) {
    drawCross(img, opts.crosshairAt.x, opts.crosshairAt.y, 16, YELLOW, 2);
  }
  return { region, step };
}

// Escurece tudo FORA do alvo (zoom contextual: o alvo em detalhe, arredores
// visíveis mas escurecidos — o VLM mantém a orientação global).
export function dimOutside(img, target, alpha = 115) {
  const t = {
    x: Math.round(target.x), y: Math.round(target.y),
    w: Math.round(target.w), h: Math.round(target.h),
  };
  fillRect(img, 0, 0, img.width, t.y, [0, 0, 0, alpha]);
  fillRect(img, 0, t.y + t.h, img.width, img.height - (t.y + t.h), [0, 0, 0, alpha]);
  fillRect(img, 0, t.y, t.x, t.h, [0, 0, 0, alpha]);
  fillRect(img, t.x + t.w, t.y, img.width - (t.x + t.w), t.h, [0, 0, 0, alpha]);
  strokeRect(img, t.x, t.y, t.w, t.h, CYAN, 2);
}

// Moldura + chip de identidade (usado em ref.png de componentes).
export function drawIdentity(img, text, { scale = null } = {}) {
  const s = scale || labelScaleFor(img);
  strokeRect(img, 0, 0, img.width, img.height, CYAN, 2);
  drawChip(img, 4 * s, img.height - 9 * s, text, { scale: s });
}

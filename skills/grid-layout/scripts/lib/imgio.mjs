// lib/imgio.mjs — imagem RGBA em memória: ler, escrever, recortar, escalar e desenhar.
// Formatos: PNG lido/escrito nativamente (pngjs); JPEG/WebP/GIF/AVIF/SVG
// normalizados via Chromium (o browser é dependência dura da skill de qualquer
// modo, e `drawImage` respeita o EXIF orientation — determinístico).
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { fail, note, EXIT } from './util.mjs';

export function makeImage(width, height, fill = [255, 255, 255, 255]) {
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fill[0]; data[i * 4 + 1] = fill[1]; data[i * 4 + 2] = fill[2]; data[i * 4 + 3] = fill[3];
  }
  return { width, height, data };
}

export function fromPng(png) {
  return { width: png.width, height: png.height, data: png.data };
}

export function toPng(img) {
  const png = new PNG({ width: img.width, height: img.height });
  png.data = Buffer.from(img.data);
  return png;
}

const NON_PNG = /\.(jpe?g|webp|gif|avif|bmp|svg)$/i;

export async function readImage(file) {
  if (!fs.existsSync(file)) {
    fail(`imagem não encontrada: ${file}`, 'confirme o caminho do ficheiro', EXIT.INPUT);
  }
  const buf = fs.readFileSync(file);
  const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (isPng) return fromPng(PNG.sync.read(buf));
  if (NON_PNG.test(file) || !isPng) {
    // normalização via browser (lazy import: render.mjs puxa playwright-core)
    const { normalizeImageToPng } = await import('./render.mjs');
    note(`a normalizar ${path.basename(file)} para PNG via Chromium…`);
    const tmp = `${file}.normalize.png`;
    await normalizeImageToPng(file, tmp);
    const img = fromPng(PNG.sync.read(fs.readFileSync(tmp)));
    try { fs.unlinkSync(tmp); } catch { /* sem problema */ }
    return img;
  }
  return fromPng(PNG.sync.read(buf));
}

export function writeImage(file, img) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(toPng(img)));
}

export function cloneImage(img) {
  return { width: img.width, height: img.height, data: Buffer.from(img.data) };
}

export function pixel(img, x, y) {
  const ix = Math.max(0, Math.min(img.width - 1, Math.round(x)));
  const iy = Math.max(0, Math.min(img.height - 1, Math.round(y)));
  const i = (iy * img.width + ix) << 2;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
}

export function crop(img, box) {
  const x = Math.round(box.x);
  const y = Math.round(box.y);
  const w = Math.round(box.w);
  const h = Math.round(box.h);
  if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > img.width || y + h > img.height) {
    fail(`recorte fora da imagem: ${x},${y},${w},${h} em ${img.width}×${img.height}`,
      'ajuste a caixa para dentro dos limites da imagem', EXIT.INPUT);
  }
  const out = makeImage(w, h, [0, 0, 0, 0]);
  for (let yy = 0; yy < h; yy++) {
    const srcStart = ((y + yy) * img.width + x) << 2;
    img.data.copy(out.data, yy * w * 4, srcStart, srcStart + w * 4);
  }
  return out;
}

export function resizeNearest(img, newW, newH) {
  const out = makeImage(newW, newH, [0, 0, 0, 0]);
  for (let y = 0; y < newH; y++) {
    const sy = Math.min(img.height - 1, Math.floor((y * img.height) / newH));
    for (let x = 0; x < newW; x++) {
      const sx = Math.min(img.width - 1, Math.floor((x * img.width) / newW));
      const si = (sy * img.width + sx) << 2;
      const di = (y * newW + x) << 2;
      out.data[di] = img.data[si];
      out.data[di + 1] = img.data[si + 1];
      out.data[di + 2] = img.data[si + 2];
      out.data[di + 3] = img.data[si + 3];
    }
  }
  return out;
}

export function blend(img, x, y, [r, g, b, a = 255]) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= img.width || iy >= img.height) return;
  const i = (iy * img.width + ix) << 2;
  if (a >= 255) {
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
  } else {
    const t = a / 255;
    img.data[i] = Math.round(img.data[i] * (1 - t) + r * t);
    img.data[i + 1] = Math.round(img.data[i + 1] * (1 - t) + g * t);
    img.data[i + 2] = Math.round(img.data[i + 2] * (1 - t) + b * t);
    img.data[i + 3] = 255;
  }
}

export function fillRect(img, x, y, w, h, color) {
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(img.width, Math.round(x) + Math.round(w));
  const y1 = Math.min(img.height, Math.round(y) + Math.round(h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) blend(img, xx, yy, color);
  }
}

export function strokeRect(img, x, y, w, h, color, thickness = 1) {
  const t = Math.max(1, Math.round(thickness));
  fillRect(img, x, y, w, t, color);
  fillRect(img, x, y + h - t, w, t, color);
  fillRect(img, x, y, t, h, color);
  fillRect(img, x + w - t, y, t, h, color);
}

// Linha com pincel quadrado de `thickness` (Bresenham).
export function drawLine(img, x0, y0, x1, y1, color, thickness = 1) {
  const t = Math.max(1, Math.round(thickness));
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = Math.round(x0);
  let y = Math.round(y0);
  const half = Math.floor(t / 2);
  for (;;) {
    fillRect(img, x - half, y - half, t, t, color);
    if (x === Math.round(x1) && y === Math.round(y1)) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

export function drawCross(img, cx, cy, len, color, thickness = 1) {
  const r = Math.round(len / 2);
  drawLine(img, cx - r, cy, cx + r, cy, color, thickness);
  drawLine(img, cx, cy - r, cx, cy + r, color, thickness);
}

// Escala de cinza 0..255 (luma Rec.601 — igual à usada nas métricas).
export function toGray(img) {
  const n = img.width * img.height;
  const gray = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const j = i << 2;
    gray[i] = 0.299 * img.data[j] + 0.587 * img.data[j + 1] + 0.114 * img.data[j + 2];
  }
  return gray;
}

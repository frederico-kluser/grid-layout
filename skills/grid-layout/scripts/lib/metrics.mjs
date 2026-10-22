// lib/metrics.mjs — paridade visual determinística.
//
// Princípio (da técnica de grelha+zoom): médias de página inteira escondem
// defeitos locais; por isso cada dif devolve, além das métricas globais, os
// PIORES blocos (hotspots) com a caixa em píxeis — o agente zooma EXATAMENTE
// aí em vez de procurar a olho.
//
// structuralDistance = 0.35*diffRatio32 + 0.25*pixelmatchRatio
//                    + 0.25*edgeDiffRatio32 + 0.15*min(1, |log2(edgeEnergyRatio)|)
// (definida por esta skill — pesos explícitos e testados em tests/metrics.test.mjs)
import pixelmatchLib from 'pixelmatch';
import { toGray } from './imgio.mjs';

const pixelmatch = typeof pixelmatchLib === 'function' ? pixelmatchLib : pixelmatchLib.default;

export const DEFAULT_THRESHOLDS = {
  structuralDistance: 0.02,
  edgeEnergyRatio: [0.95, 1.05],
  worstCell: 0.02,
};

export function thresholdsFor(tier) {
  if (tier === 'strict') return { structuralDistance: 0.008, edgeEnergyRatio: [0.98, 1.02], worstCell: 0.008 };
  if (tier === 'loose') return { structuralDistance: 0.06, edgeEnergyRatio: [0.85, 1.15], worstCell: 0.08 };
  return { ...DEFAULT_THRESHOLDS };
}

// magnitude de bordas Sobel + energia média
function sobel(gray, W, H) {
  const mag = new Float32Array(W * H);
  let sum = 0;
  let count = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const gx = -gray[i - W - 1] + gray[i - W + 1] - 2 * gray[i - 1] + 2 * gray[i + 1] - gray[i + W - 1] + gray[i + W + 1];
      const gy = -gray[i - W - 1] - 2 * gray[i - W] - gray[i - W + 1] + gray[i + W - 1] + 2 * gray[i + W] + gray[i + W + 1];
      const m = Math.min(255, Math.hypot(gx, gy));
      mag[i] = m;
      sum += m;
      count++;
    }
  }
  return { mag, avgEnergy: count ? sum / count : 0 };
}

function percentile(sorted, q) {
  if (!sorted.length) return 0;
  return sorted[Math.floor((sorted.length - 1) * q)];
}

// hotspots numa grelha ~96px por bloco (2..6 por eixo)
function hotspots(diffMask, W, H) {
  const cols = Math.max(2, Math.min(6, Math.round(W / 96)));
  const rows = Math.max(2, Math.min(6, Math.round(H / 96)));
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = Math.floor((c * W) / cols);
      const y0 = Math.floor((r * H) / rows);
      const x1 = Math.floor(((c + 1) * W) / cols);
      const y1 = Math.floor(((r + 1) * H) / rows);
      let bad = 0;
      let total = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          total++;
          if (diffMask[y * W + x]) bad++;
        }
      }
      out.push({
        cell: `${String.fromCharCode(65 + r)}${c + 1}`,
        box: [x0, y0, x1 - x0, y1 - y0],
        diffRatio: total ? Number((bad / total).toFixed(4)) : 0,
      });
    }
  }
  out.sort((a, b) => b.diffRatio - a.diffRatio);
  return out;
}

// Dica de deslocação: procura offset (dx,dy) que minimiza a diferença nas
// bordas fortes do candidato → corrige erros de 1-2px sem adivinhação.
function shiftHint(gray1, gray2, mag1, W, H) {
  const pts = [];
  for (let y = 2; y < H - 2; y += 2) {
    for (let x = 2; x < W - 2; x += 2) {
      if (mag1[y * W + x] > 60) pts.push([x, y]);
      if (pts.length >= 20000) break;
    }
    if (pts.length >= 20000) break;
  }
  if (pts.length < 200) return null;
  const cost = (dx, dy) => {
    let sum = 0;
    for (const [x, y] of pts) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) { sum += 64; continue; }
      sum += Math.abs(gray1[y * W + x] - gray2[yy * W + xx]);
    }
    return sum / pts.length;
  };
  const zero = cost(0, 0);
  let best = { dx: 0, dy: 0, cost: zero };
  for (let dy = -6; dy <= 6; dy++) {
    for (let dx = -6; dx <= 6; dx++) {
      if (dx === 0 && dy === 0) continue;
      const c = cost(dx, dy);
      if (c < best.cost) best = { dx, dy, cost: c };
    }
  }
  if ((best.dx !== 0 || best.dy !== 0) && best.cost < zero * 0.85) {
    return { dx: best.dx, dy: best.dy, reduction: Number((1 - best.cost / Math.max(1e-6, zero)).toFixed(3)) };
  }
  return null;
}

export function diffImages(ref, cand, opts = {}) {
  const { width: W, height: H } = ref;
  if (ref.width !== cand.width || ref.height !== cand.height) {
    return {
      sizeMismatch: true,
      pass: false,
      refSize: [ref.width, ref.height],
      candSize: [cand.width, cand.height],
      reason: `dimensões diferentes: referência ${ref.width}×${ref.height} vs candidato ${cand.width}×cand.height`,
      scene: { ref: sceneMetrics(ref), cand: sceneMetrics(cand) },
    };
  }

  const gray1 = toGray(ref);
  const gray2 = toGray(cand);
  const N = W * H;

  // erro absoluto + delta > 32
  let maeSum = 0;
  let sqSum = 0;
  let diff32 = 0;
  const diffMask = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const d = Math.abs(gray1[i] - gray2[i]);
    maeSum += d;
    sqSum += d * d;
    if (d > 32) { diff32++; diffMask[i] = 1; }
  }

  // pixelmatch (perceptual, AA detetado e não contado como erro)
  const mismatch = pixelmatch(ref.data, cand.data, null, W, H, {
    threshold: Number(opts.pixelmatchThreshold ?? 0.1),
    includeAA: false,
  });

  // bordas Sobel
  const s1 = sobel(gray1, W, H);
  const s2 = sobel(gray2, W, H);
  let edgeDiff32 = 0;
  for (let i = 0; i < N; i++) {
    if (Math.abs(s1.mag[i] - s2.mag[i]) > 32) edgeDiff32++;
    if (Math.abs(s1.mag[i] - s2.mag[i]) > 32) diffMask[i] = 1;
  }

  const diffRatio32 = diff32 / N;
  const pixelmatchRatio = mismatch / N;
  const edgeDiffRatio32 = edgeDiff32 / N;
  const edgeEnergyRatio = s2.avgEnergy / Math.max(0.0001, s1.avgEnergy);
  const structuralDistance = 0.35 * diffRatio32 + 0.25 * pixelmatchRatio
    + 0.25 * edgeDiffRatio32 + 0.15 * Math.min(1, Math.abs(Math.log2(edgeEnergyRatio)));

  const cells = hotspots(diffMask, W, H);
  const worst = cells[0];
  const tier = opts.tier || 'standard';
  const th = opts.thresholds || thresholdsFor(tier);
  const [eLo, eHi] = th.edgeEnergyRatio;

  return {
    sizeMismatch: false,
    size: [W, H],
    mae: Number((maeSum / N).toFixed(3)),
    rmse: Number(Math.sqrt(sqSum / N).toFixed(3)),
    diffRatio32: Number(diffRatio32.toFixed(4)),
    pixelmatchRatio: Number(pixelmatchRatio.toFixed(4)),
    edgeDiffRatio32: Number(edgeDiffRatio32.toFixed(4)),
    edgeEnergyRef: Number(s1.avgEnergy.toFixed(2)),
    edgeEnergyCand: Number(s2.avgEnergy.toFixed(2)),
    edgeEnergyRatio: Number(edgeEnergyRatio.toFixed(3)),
    structuralDistance: Number(structuralDistance.toFixed(4)),
    worstCell: { cell: worst.cell, box: worst.box, diffRatio: worst.diffRatio },
    hotspots: cells.slice(0, 3).filter((c) => c.diffRatio > 0),
    shiftHint: shiftHint(gray1, gray2, s1.mag, W, H),
    diffMask,
    thresholds: th,
    pass: structuralDistance <= th.structuralDistance
      && edgeEnergyRatio >= eLo && edgeEnergyRatio <= eHi
      && worst.diffRatio <= th.worstCell,
  };
}

// Métricas de UMA imagem: interceta captures vazias/quebradas antes de comparar.
export function sceneMetrics(img) {
  const { width: W, height: H, data } = img;
  const N = W * H;
  const hist = new Uint32Array(4096); // 4 bits por canal
  let transparent = 0;
  const gray = toGray(img);
  for (let i = 0; i < N; i++) {
    const j = i << 2;
    const bin = ((data[j] >> 4) << 8) | ((data[j + 1] >> 4) << 4) | (data[j + 2] >> 4);
    hist[bin]++;
    if (data[j + 3] < 8) transparent++;
  }
  let entropy = 0;
  let dominant = 0;
  for (const c of hist) {
    if (!c) continue;
    const p = c / N;
    entropy -= p * Math.log2(p);
    dominant = Math.max(dominant, p);
  }
  const graySorted = Float32Array.from(gray).sort();
  const contrast = (percentile(graySorted, 0.95) - percentile(graySorted, 0.05)) / 255;
  const { mag, avgEnergy } = sobel(gray, W, H);
  let edgePixels = 0;
  for (let i = 0; i < mag.length; i++) if (mag[i] > 48) edgePixels++;

  const reasons = [];
  if (edgePixels / N < 0.002) {
    reasons.push('densidade de bordas mínima — sem formas visíveis');
    if (entropy < 0.6) reasons.push(`entropia de cor baixa (${entropy.toFixed(2)} bits)`);
    if (dominant > 0.99) reasons.push(`cor dominante a ${(dominant * 100).toFixed(1)}%`);
    if (contrast < 0.02) reasons.push(`contraste de luminância baixo (${contrast.toFixed(3)})`);
  }

  return {
    colorEntropyBits: Number(entropy.toFixed(3)),
    dominantColorShare: Number(dominant.toFixed(4)),
    edgeDensity: Number((edgePixels / N).toFixed(5)),
    edgeEnergy: Number(avgEnergy.toFixed(2)),
    luminanceContrast: Number(contrast.toFixed(4)),
    transparentShare: Number((transparent / N).toFixed(4)),
    looksBlank: reasons.length >= 2,
    reasons,
  };
}

// compara duas imagens e decide pass/fail com limiares — usado por `gl diff`
export function compare(ref, cand, opts = {}) {
  const base = diffImages(ref, cand, opts);
  if (base.sizeMismatch) {
    return { ...base, reason: base.reason.replace('×cand.height', `${cand.height}`) };
  }
  const scene = { ref: sceneMetrics(ref), cand: sceneMetrics(cand) };
  const problems = [];
  if (!base.pass) problems.push('paridade abaixo do limiar');
  // componentes triviais (fundo chapado) são vazios por definição — não reprovar
  if (scene.cand.looksBlank && !opts.trivial) {
    problems.push(`candidato parece vazio: ${scene.cand.reasons.join('; ')}`);
  }
  return {
    ...base,
    scene,
    pass: base.pass && (opts.trivial || !scene.cand.looksBlank),
    problems,
  };
}

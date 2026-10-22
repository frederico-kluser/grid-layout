// lib/util.mjs — contrato de saída, argumentos, ficheiros, erros.
// Regra da skill: dados em stdout (JSON), narração em stderr, erros no formato
// `Erro: <o quê> — Solução: <o que fazer>` com exit code ≠ 0.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const EXIT = { OK: 0, FAIL: 1, USAGE: 2, TOOL: 3, INPUT: 4 };

export class GlError extends Error {
  constructor(oQue, solucao, code = EXIT.FAIL) {
    super(`Erro: ${oQue} — Solução: ${solucao}`);
    this.oQue = oQue;
    this.solucao = solucao;
    this.code = code;
  }
}

// Lança (não sai do processo): as libs ficam testáveis e o CLI converte em
// exit code + mensagem no contrato `Erro: … — Solução: …`.
export function fail(oQue, solucao, code = EXIT.FAIL) {
  throw new GlError(oQue, solucao, code);
}

export function note(msg) {
  process.stderr.write(`${msg}\n`);
}

export function jsonOut(obj) {
  process.stdout.write(`${JSON.stringify(obj, null, 2)}\n`);
}

// --flag value | --flag=value | --flag (boolean) | --no-flag (boolean false)
export function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const body = a.slice(2);
      const eq = body.indexOf('=');
      if (eq >= 0) {
        flags[body.slice(0, eq)] = body.slice(eq + 1);
      } else if (body.startsWith('no-')) {
        flags[body.slice(3)] = false;
      } else {
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('--')) {
          flags[body] = next;
          i++;
        } else {
          flags[body] = true;
        }
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

export function need(flags, name, hint) {
  const v = flags[name];
  if (v === undefined || v === true) {
    fail(`falta o valor de --${name}`, hint, EXIT.USAGE);
  }
  return String(v);
}

export function num(value, fallback, { min = -Infinity, max = Infinity, int = false } = {}) {
  if (value === undefined || value === true || value === false || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) fail(`valor numérico inválido: ${value}`, 'use um número (ex.: 12, 0.35)', EXIT.USAGE);
  const v = int ? Math.round(n) : n;
  if (v < min || v > max) fail(`valor fora do intervalo [${min}, ${max}]: ${value}`, 'ajuste o valor', EXIT.USAGE);
  return v;
}

export function bool(value, fallback) {
  if (value === undefined) return fallback;
  if (value === false) return false;
  if (value === true) return true;
  const s = String(value).toLowerCase();
  return !(s === '0' || s === 'false' || s === 'no');
}

export function readJson(file) {
  if (!fs.existsSync(file)) fail(`ficheiro não encontrado: ${file}`, 'confirme o caminho ou gere-o primeiro (ver `gl --help`)', EXIT.INPUT);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    fail(`JSON inválido em ${file}: ${e.message}`, 'corrija a sintaxe do ficheiro', EXIT.INPUT);
  }
}

export function writeJson(file, obj) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(obj, null, 2)}\n`);
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
}

export function listFiles(dir, filter) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && (!filter || filter(e.name)))
    .map((e) => path.join(dir, e.name))
    .sort();
}

export function relFrom(base, target) {
  const r = path.relative(base, target);
  return r.split(path.sep).join('/');
}

// Parser de `x,y,w,h` em píxeis da imagem (inteiros ≥ 0).
export function parseBox(str, what = '--box/--region') {
  const parts = String(str).split(',').map((s) => Number(s.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    fail(`${what} inválido: "${str}"`, 'formato: x,y,w,h em píxeis (ex.: 240,160,408,96)', EXIT.USAGE);
  }
  const [x, y, w, h] = parts.map((n) => Math.round(n));
  if (w <= 0 || h <= 0 || x < 0 || y < 0) {
    fail(`${what} inválido: "${str}"`, 'x,y ≥ 0 e w,h > 0', EXIT.USAGE);
  }
  return { x, y, w, h };
}

export function parseHex(str) {
  const s = String(str).trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    return [0, 1, 2].map((i) => parseInt(s[i] + s[i], 16));
  }
  if (/^[0-9a-fA-F]{6}$/.test(s)) {
    return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  }
  fail(`cor hex inválida: "${str}"`, 'use #rgb ou #rrggbb (ex.: #1a73e8)', EXIT.USAGE);
}

export function toHex([r, g, b]) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

export function colorDist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

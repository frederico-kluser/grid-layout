#!/usr/bin/env node
// validate-skill.mjs — validação do SKILL.md contra o padrão Agent Skills:
//   · frontmatter com name/description obrigatórios; name = nome do diretório
//   · name ≤ 64 chars, minúsculas/dígitos/hífens, sem `--` nas pontas
//   · description ≤ 1024 chars, sem XML tags, com gatilhos "quando usar"
//   · body < 500 linhas (disclosure progressiva: regras no topo)
//   · referências relativas a 1 nível (references/, assets/, scripts/)
// Uso: node scripts/validate-skill.mjs [caminho/para/SKILL.md] [--json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export function validateSkillFile(file) {
  const errors = [];
  const warnings = [];
  const raw = fs.readFileSync(file, 'utf8');
  const dirName = path.basename(path.dirname(file));

  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) {
    errors.push('frontmatter YAML ausente (--- na 1.ª linha)');
    return { errors, warnings, name: null, lines: 0 };
  }
  const [, yaml, body] = m;

  const field = (key) => {
    const re = new RegExp(`^${key}:\\s*(.*)$`, 'm');
    const hit = yaml.match(re);
    return hit ? hit[1].trim().replace(/^["']|["']$/g, '') : null;
  };

  const name = field('name');
  const description = field('description');
  const license = field('license');
  const compatibility = field('compatibility');

  if (!name) errors.push('name é obrigatório');
  else {
    if (name.length > 64) errors.push(`name tem ${name.length} chars (máx. 64)`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) errors.push(`name "${name}" fora de [a-z0-9-] ou com hífens nas pontas/--`);
    if (/^(claude|anthropic)/.test(name)) errors.push('name não pode começar por claude/anthropic');
    if (name !== dirName) errors.push(`name "${name}" ≠ diretório "${dirName}"`);
  }

  if (!description || !description.trim()) errors.push('description é obrigatória');
  else {
    if (description.length > 1024) errors.push(`description tem ${description.length} chars (máx. 1024)`);
    if (/<[a-zA-Z/]/.test(description)) errors.push('description não pode conter XML tags');
    if (!/(when|use|quando|usa|para)/i.test(description)) warnings.push('description sem palavras-gatilho de "quando usar"');
  }

  if (compatibility && compatibility.length > 500) errors.push(`compatibility tem ${compatibility.length} chars (máx. 500)`);

  const bodyLines = body.split('\n').length;
  if (bodyLines > 500) errors.push(`body tem ${bodyLines} linhas (máx. 500 — disclosure progressiva)`);

  // referências profundas em cadeia (uma referência a apontar para outra)
  const deepRefs = body.match(/\]\((references|assets)\/[^)]*\/[^)]*\)/g) || [];
  if (deepRefs.length) warnings.push(`referências aninhadas (>1 nível): ${deepRefs.join(', ')}`);

  return { errors, warnings, name, description, license, compatibility, lines: bodyLines };
}

function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const asJson = process.argv.includes('--json');
  const file = path.resolve(args[0] || path.join(HERE, '..', 'SKILL.md'));
  if (!fs.existsSync(file)) {
    process.stderr.write(`Erro: SKILL.md não encontrado em ${file} — Solução: crie o ficheiro ou passe o caminho\n`);
    process.exit(4);
  }
  const res = validateSkillFile(file);
  if (asJson) {
    process.stdout.write(`${JSON.stringify(res, null, 2)}\n`);
  } else {
    for (const e of res.errors) process.stderr.write(`ERRO : ${e}\n`);
    for (const w of res.warnings) process.stderr.write(`AVISO: ${w}\n`);
    process.stderr.write(`${file}: ${res.errors.length} erro(s), ${res.warnings.length} aviso(s), body ${res.lines} linhas\n`);
  }
  process.exit(res.errors.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}

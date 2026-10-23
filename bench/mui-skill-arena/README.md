# Arena do benchmark — `mui-agent-skill`

- `reference-app/` — app de referência (Vite + React 19 + MUI 9.5), construído com a skill.
- `screenshot/` — prints da referência (1440×1340 e 390×844).
- Os clones A/B foram **removidos após a medição**; capturas dos dois lados em `metrics/captures/`.
- `metrics/report.html` — relatório visual completo com métricas, diffs e imagens.
- `metrics/results.json` / `metrics/summary.json` — dados brutos.
- `RELATORIO.md` — resumo em Markdown.
- `logs/b-skill-evidence.txt` — prova da remoção/restauração do symlink no caso B.
- `tools/` — captura Playwright, métricas SSIM e auditoria de sessão/build.

Abrir o relatório: `open metrics/report.html`.

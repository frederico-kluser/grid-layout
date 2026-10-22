# notes.md · componente `stats`

## Texto visível (transcrito na íntegra)
- Coluna 1: `12.4k` / `utilizadores ativos`
- Coluna 2: `99,99%` / `uptime`
- Coluna 3: `180 ms` / `latencia p95`

## Medições-chave (px CSS; imagem @2x ÷ 2)
| Elemento | Medida (ref.png) |
|---|---|
| Faixa | 1440×160, fundo `#ffffff` plano (paleta: 97.8% `#ffffff`) |
| Colunas (caixa de texto) | x = 80 / 560 / 1040 (passo 480) |
| Divisores | 1 px `#e2e8f0` em x = 520 e x = 1000; y = 32→128 (96 px, centrado em 160) |
| Valor (tinta) | col1 x 82–170.5 · col2 561–681.5 · col3 1042–1161; topo cap ≈ 44, baseline ≈ 69 |
| Rótulo (tinta) | col1 x 80.5–191 · col2 560.5–601.5 · col3 1040.5–1115; topo asc. ≈ 90.5, baseline ≈ 101 |
| Glyphs (imagem) | '9' altura 50 px; 'k' 52 px (asc.); 'l'/'d' rótulo 21 px; 'm' x-height 15 px |

## Decisões de tipografia
- Fonte: `var(--gl-font-sans)` = `Arial, sans-serif` → nesta máquina resolve para
  **Liberation Sans** (fc-match). Métricas usadas no cálculo: ascent 1854/2048,
  descent 434/2048, cap 1409/2048, x-height 1071/2048.
- Valor: 700 · 36 px · line-height 41 px → baseline em y ≈ 69.0 (medido 68.5–69).
- Rótulo: 400 · 14 px · line-height 22 px → baseline em y ≈ 100.9 (medido 100.5–101).
  (14 px confirmado pela largura de avanço: "uptime" 3.001 em = 84 px imagem ≈ 82 px
  de tinta medidos; "utilizadores ativos" 7.947 em = 222.5 px ≈ 221 px.)
- Espaçamento vertical: padding-top 36 px + gap 8 px (`--gl-space-1`) entre valor e rótulo.
- Cores via tokens: `--gl-color-surface`, `--gl-color-ink`, `--gl-color-muted`,
  `--gl-color-border` — todos com equivalente exato medido.
- Estrutura: flex com `padding-left: 40px` + itens de 480 px com `padding-left: 40px`;
  o divisor é `::before` (1 px × 96 px, `top: 32px`) nos itens 2 e 3 — a borda não
  desloca o conteúdo (mantém texto em 560/1040).

## Desvios
- Nenhum. `report.json`: `pass: true` · structuralDistance = 0 · worstCell = 0 (A1) ·
  edgeEnergyRatio = 1.000 · mae = 0 · rmse = 0 · hotspots [] · shiftHint null.
  `cand.png` é idêntico bit-a-bit a `ref.png` (sha256 `460390f0…3174e`).
- Observação de contexto: o BRIEF §2 indica fundo `#f8fafc`, mas a região mede-se
  100% `#ffffff` (faixa branca, cf. meta.json `backdrop` que é a cor FORA da faixa).
  Fidelidade à imagem: usei `--gl-color-surface` (`#ffffff`).
- Ativos de imagem: **nenhum** — todo o conteúdo é texto real + formas CSS.

## Pedidos de partilhado
- Nenhum valor novo partilhável: tudo mapeia para tokens existentes.

## Artefactos de medição (fora do contrato, não são entrega)
- `work/zoom1.png`, `work/zoom2.png`, `work/cand-zoom.png` (recortes `gl zoom` do §5).
- Artefactos regenerados pelo `gl verify`: `cand.png`, `cand-raw.png`, `diff.png`,
  `side-by-side.png`, `report.json`, `preview.html`.
- Ferramenta: `gl probe colors --at` rejeita o formato documentado `nome=x,y`
  ("amostra inválida"); as cores foram obtidas via `probe palette`/`probe runs`.

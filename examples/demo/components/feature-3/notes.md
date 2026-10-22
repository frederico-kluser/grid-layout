# notes.md — feature-3 (cartão "Observabilidade")

## Resultado
`gl verify --ws ../.. --id feature-3` → **pass: true** (2ª verificação; 1ª falhou
com desvio vertical de 2 device px no texto, corrigido para +1 CSS px).
`structuralDistance=0.0004` · `worstCell=0.0024@D1` · `edgeEnergyRatio=1.002` ·
`mae=0.002` · lint limpo · boxCheck 500×280 exato, sem overflow.

## Medições-chave (device px @ dpr 2 → CSS = ÷2)
| Elemento | Medido (device) | CSS |
|---|---|---|
| Cartão (caixa) | (40,64) 804×444 | (20,32) 402×222 |
| Borda do cartão | 2 px `#e2e8f0` | 1px |
| Raio exterior do cartão | 32 (ajuste circular em 13 linhas, erro ≤0.5 px) | 16px |
| Padding do cartão | 48 (ícone a 50 da borda exterior = 1+24) | 24px `--gl-space-3` |
| Ícone | (90,114) 96×96, sólido `#f59e0b`, sem glifo | (45,57) 48×48, raio 12px |
| Raio do ícone | 24 (mesma técnica) | 12px |
| Título baseline | 283.5 | 141.75 |
| Corpo baselines | 347.5 / 391.5 (Δ44) | 173.75 / 195.75 (Δ22) |
| Fundo da região | `#f8fafc` **plano** (4 amostras stddev 0 + runs tol 1) | `--gl-color-bg` |

Cores: todas mapeadas para `tokens.css` — `--gl-color-bg`, `--gl-color-surface`,
`--gl-color-ink` (#0f172a), `--gl-color-muted` (#64748b), `--gl-color-border`,
`--gl-color-warn` (#f59e0b). Sem valores locais de cor.

## Tipografia
- Família `var(--gl-font-sans)` (Arial, sans-serif) — avanços calçam a referência:
  título Arial Bold 7.781em × 20px = 311 device vs. 309 medido; corpo
  "Métricas,…" 13.56em × 14px = 378 vs. 377 medido.
- Título "Observabilidade": 20px / 700 / line-height 28px.
- Corpo "Métricas, logs e traces num so / lugar, sem agentes extra.": 14px / 400 /
  line-height 22px (Δbaseline medido 44 device = 22 CSS exatos).
- Texto integral transcrito da imagem; tudo é texto real (sem imagens de texto).

## Decisões e desvios declarados
1. **Fundo**: o brief indica `#fdfdfe` "não plano"; a medição diz `#f8fafc` plano
   (idêntico a `--gl-color-bg`). Fidelidade acima da premissa: usado o medido.
2. **Quebra de linha** após "num so": a frase completa cabe numa linha nos 352px de
   conteúdo (avanço total ≈351.7px), logo a quebra do original vem de uma coluna de
   texto mais estreita ou de `<br>` manual — não inferível da imagem. Usei `<br>`
   explícito para garantir a quebra idêntica em qualquer render.
3. **Gap ícone→título = 17px** (medido); não quantizado para 16px porque esse 1px
   desloca o texto 2 device px e rebenta o `worstCell` (0.1656 na 1ª verificação).
   Restantes espaçamentos na escala: 24 (`--gl-space-3`) e 8 (`--gl-space-1`).
4. **Sem ativos em `assets/`**: o ícone é um quadrado arredondado sólido (a paleta
   confirma a área 96²−(4−π)·24² ≈ 8722 px de `#f59e0b`), recriado em CSS — nada
   fotográfico/ilustrativo nesta região.
5. Hotspot residual D1 (diffRatio 0.0024, muito abaixo de 0.02): ruído de
   anti-aliasing na tipografia; sem erro estrutural no `side-by-side.png`.

## Pedidos partilhados (para o orquestrador)
- Candidatos a tokens: `--gl-radius-card: 16px` e `--gl-radius-icon: 12px`
  (padrão repetido nos cartões feature) e `--gl-line-tight: 22px`/`28px` se o
  padrão do feature-1 confirmar o mesmo ritmo.
- Bug do motor: `gl probe colors --at` documenta `nome=x,y,...` mas o parser
  (`gl.mjs:313-316`) divide as amostras por `,` e as coordenadas por `:` — a
  sintaxe real é `nome=x:y,nome2=x:y`. A ajuda e o exemplo do BRIEF estão errados.

## Artefactos do motor neste diretório (não são entregáveis autoriais)
`report.json`, `cand.png`, `cand-raw.png`, `diff.png`, `side-by-side.png`
(saidas de `gl verify`) e `work/*.png` (zooms com régua do ciclo de medição).

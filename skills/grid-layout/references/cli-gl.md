# Referência do CLI `gl`

> Quando usar: para saber flags/JSON exatos de um comando. Invocação:
> `node <instalação-da-skill>/scripts/gl.mjs <comando> [sub] [--flags]`.
> Saída universal: JSON em stdout · narração em stderr · erros
> `Erro: … — Solução: …` com exit ≠ 0 (0 ok · 1 reprovação/validação · 2 uso ·
> 3 ferramenta em falta · 4 entrada inválida).

Índice: doctor · init · grid · zoom · probe · segment · plan · prep · shot ·
verify · diff · assemble · status · report · crop.

## Convenções

- `--ws DIR` = workspace (predef. `.`); `--plan FILE` = plano alternativo.
- Caixas/`--region` = `x,y,w,h` em píxeis da imagem. Cores = `#rgb`/`#rrggbb`.
- `--no-<flag>` desliga booleanos (ex.: `--no-dim`).

## gl doctor [--install]

Verifica node ≥ 20, dependências, browser e SKILL.md. `--install` corre
`npm install` na pasta da skill. Exit 3 se algo faltar.

## gl init --image REF [--ws DIR] [--dpr N | --css-width N] [--force]

Cria `<ws>/reference/ref.png` (normaliza JPEG/WebP/… para PNG via browser),
`plan.json` (esqueleto com uma folha), `work/`, `components/` e `.gitignore`.
Sem `--dpr`/`--css-width`, devolve `candidates` (dpr × larguras CSS plausíveis).
JSON: `{ws, reference:{image,width,height,dpr}, viewport, plan, candidates}`.

## gl grid --image REF --out P [--cols N --rows N | --step N] [--region x,y,w,h]
### [--crosshair] [--labels] [--coords] [--units logical] [--label-scale N]

Grelha rotulada (células `A1..` com miras) ou régua de píxeis (`--step`).
`--coords`/`--units logical` acrescentam coordenadas aos rótulos.
JSON: `{region, mode: "cells"|"ruler", cols/rows|step}`.

## gl zoom --image REF --out P (--cell CAMINHO | --crop x,y,w,h)
### [--cols N --rows N] [--sub N] [--context 0.35] [--zoom N] [--max-edge 1568]
### [--step N] [--no-dim] [--units logical]

Zoom contextual: alvo ampliado (nearest) + sub-grelha de píxeis com coordenadas
globais + arredores escurecidos. `--cell` aceita `B2`, `D3+E3`, `B2.C1`, `A1.A1+B2`.
JSON: `{target:[x,y,w,h], expanded:[…], zoomFactor, stepPx, outputSize, addressing}`.

## gl probe colors --image REF --at nome=x,y[:raio],…

Média (2r+1)², `stddev` e `stable` por amostra (raio predef. 2 → 5×5).
JSON: `{probe:"colors", samples:{nome:{hex, mean, stddev, at, patch, stable}}}`.

## gl probe palette --image REF [--region x,y,w,h] [--k N] [--bbox]

Top-k cores quantizadas com quotas. JSON: `{colors:[{hex, share, bbox?}]}`.

## gl probe box --image REF --color #hex [--tol N] [--region x,y,w,h]

Caixa dos píxeis da cor (tol. euclidiana RGB, predef. 25).
JSON: `{found, box:[x,y,w,h], logical, pixels}`.

## gl probe bbox --image REF [--region x,y,w,h] [--bg auto|#hex] [--tol N] [--dpr N]

Caixa exata do conteúdo face ao fundo. JSON:
`{found, box, logical, size:{w,h}, cssSize?, inkPixels, bg}`.

## gl probe runs --image REF (--row N | --col N) [--tol N] [--min N] [--color #hex]

Segmentos de cor ao longo da linha/coluna. JSON:
`{axis, at, segments:[{color, start, end, length, startLogical, endLogical}]}`.

## gl probe bands --image REF [--region x,y,w,h] --direction row|col
### [--gap-frac 0.01] [--min-gap N] [--tol N]

Bandas de conteúdo/vazio (linhas de texto, separadores). JSON:
`{bg, gaps:[{start,end,length}], content:[…]}`.

## gl segment --image REF [--out-seg P] [--out-overlay P]
### [--flat-tol N] [--band-tol N] [--bg-tol N] [--min-gap N] [--min-leaf N] [--depth N] [--max-leaf N]

XY-cut assistido: propõe árvore de caixas (vãos limitados por conteúdo; arestas
fortes para sidebar/conteúdo). JSON: `{tree, leaves:[{id, box}], segFile, overlayFile}`.
As folhas vêm com ids `seg-N` — renomeia-as ao escrever o `plan.json`.

## gl plan check [--ws DIR]

Valida o `plan.json`: ids únicos, caixas nos pais, partição EXATA (row/col),
avisos (folhas minúsculas, dpr). JSON: `{ok, errors[], warnings[]}`. Exit 1 com erros.

## gl plan skeleton [--ws DIR]

Recria `plan.json` a partir de `reference/ref.png` (uma folha inteira).

## gl prep [--ws DIR] [--id ID | --all]

Gera os pacotes de trabalho (ref.png, ref-grid.png, ref-zoom.png, meta.json,
BRIEF.md, stubs, preview.html). Triviais saem prontos. JSON: `{components:[…]}`.

## gl shot (--file F | --url U) --out P [--w N --h N --dpr N]
### [--selector S] [--measure S] [--allow-net] [--full]

Captura determinística (animações mortas, fontes prontas, rede externa bloqueada).
`--selector` captura o elemento; `--measure` devolve `rect`/`stage`/`doc`.
JSON: `{out, width, height, dpr, measurements, blockedRequests}`.

## gl verify [--ws DIR] (--id ID | --all) [--allow-net]

Por componente: recria preview → captura → `boxCheck` → lint anti-batota → diff →
`report.json` + `cand.png`/`diff.png`/`side-by-side.png`. JSON:
`{ok, results:[{id, pass, metrics, boxCheck, lint, problems}]}`. Exit 1 se reprovar.

## gl diff --ref A --cand B [--out-dir D] [--tier X]

Paridade de duas imagens completas (as mesmas métricas do verify).
JSON: métricas + `{artifacts:{dir, side, diff}}`. Exit 1 se reprovar.

## gl assemble [--ws DIR] [--out DIR] [--page-bg #hex]

Monta `page/index.html` (row/col/abs pela árvore, fragmentos inline, CSS ligado,
caminhos `assets/` reescritos). JSON: `{out, pageBg, viewport, dpr}`.

## gl status [--ws DIR]

Estado agregado. JSON: `{totals:{components, built, passing, failing, pending}, rows:[…]}`.

## gl report [--ws DIR]

`report/index.html` (galeria) + `report/summary.md` + `report/summary.json`.

## gl crop --image REF --box x,y,w,h --out P

Extrai ativo de imagem. JSON: `{box, size, pageShare, note}` (avisa >35% da página).

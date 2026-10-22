# notes · componente `hero`

## Verificação (ciclo gl — 3 verificações)
- v1: `structuralDistance=0.0128` · `edgeEnergyRatio=1.00` · `worstCell=0.1482@C2` · `shiftHint dy=-4`
  → correções: título +2px CSS, texto do botão alinhado à esquerda (não centrado).
- v2: `structuralDistance=0.002` · `edgeEnergyRatio=1.00` · `worstCell=0.0617@D1/E1`
  → correção: linha de ações −1px CSS (o botão estava exato; só a linha desceu).
- v3 (final): **PASS** · `structuralDistance=0` · `edgeEnergyRatio=1.00` · `worstCell=0@A1`
  · `mae=0` · `rmse=0.005` (ruído residual de anti-serrilhado). `side-by-side.png` sem erros estruturais.

## Medições-chave (px da imagem @2x → CSS px = ÷2 · coords locais ao componente 1440×320)
| Elemento | Ink/rect medido (img px) | CSS | Valor no código |
|---|---|---|---|
| Fundo | `#f8fafc` plano (stddev 0 em 8 amostras; linhas 2 e 637 uniformes) | — | `var(--gl-color-bg)` |
| Título | ink x166–1612, y152–241 (w1447×h90) | x83–806, cap-top y76 | Arial 700 · 48px · `#0f172a` |
| Subtítulo | ink x163–1101, y289–323 (w939×h35) | x81.5–551, y144.5–162 | Arial 400 · 18px · `#475569` |
| Botão | rect x160–519, y376–471 (360×96) | x80, y188, 180×48 | raio 10 · `#2563eb` |
| Texto botão | ink x209–439, y408–438 (w231) | x104.5–219.5 | Arial 700 · 16px · `#fff` |
| Link | ink x584–726, y410–434 (w143×h25) | x292–363.5, baseline y217.5 | Arial 700 · 16px · `#2563eb` |

## Decisões de tipografia
- Fonte: `var(--gl-font-sans)` (Arial, sans-serif). Larguras de ink batem certo com
  as métricas Arial (título 723.5px ≈ 15.04em·48; subtítulo 469.5px ≈ 26.0em·18;
  botão/link 16px bold) — sem substituição nem desvio de fonte.
- Pesos: título/botão/link **700**, subtítulo 400 (medidos pela espessura dos
  traços: 13px@2x no título a 48px bold; 3px@2x no subtítulo a 18px regular).
- **Texto do botão NÃO é centrado**: alinhado à esquerda com `padding-left: 24px`
  (gap medido 49px@2x à esquerda vs 80px@2x à direita; centrar punha o ink em x224
  vs 209 medido).
- **Link assenta 1px CSS abaixo** da baseline do texto do botão (ink 410 vs 408@2x
  na ref) — reproduzido com `padding-top: 2px` no link.
- Transcrição literal (sem acentos, como na ref): "Escale o seu produto sem atrito" ·
  "Infraestrutura pronta para o proximo milhao de utilizadores." · "Comecar gratis" ·
  "Ver demo".

## Valores locais (fora da escala de 8px — medidos, não estimados)
- `padding-top: 67px` (topo do título) · `margin-top: 13.6px` (subtítulo) ·
  `margin-top: 21.8px` (linha de ações) · `padding-left: 24px` no botão.
- Não quantizados: cada um desvia >1px da escala de 8px; o critério foi fidelidade
  acima da pureza (§5.3 do BRIEF).
- Gap botão→link: 32px = `var(--gl-space-4)` ✓ tokens.

## Ativos
- `assets/` vazio — nada fotográfico/ilustrado na região; tudo recriado em HTML+CSS
  com texto real (nenhum `gl crop` necessário, zero uso de ref.png no código).

## Desvios
- Nenhum. Paridade atingida nas 3 métricas do tier `standard` (v3: valores zero).
- Limite conhecido (não verificável): apenas o estado estático @dpr 2 existe na ref;
  hover/foco do botão e link não são inferíveis.

## Pedidos de partilhado
- Nenhum novo token: todos os valores comuns usados existem em `tokens.css`
  (`--gl-color-bg/ink/body/primary/surface`, `--gl-font-sans`, `--gl-space-4`).

## Artefactos de motor (gerados por `gl`, não são entregáveis de código)
- `report.json`, `cand.png`, `cand-raw.png`, `diff.png`, `side-by-side.png`,
  `preview.html` (regenerado pelo `gl verify`) e `work/` (crops de medição do ciclo §5).

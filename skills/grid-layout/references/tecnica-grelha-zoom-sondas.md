# Técnica: grelha rotulada · zoom contextual · sondas determinísticas

> Quando usar: para aplicar a técnica em si (F1/F4) e para explicar a um
> construtor PORQUE mede em vez de estimar.

Índice: 1. Porquê · 2. Grelha e endereço de células · 3. Zoom contextual ·
4. Sondas · 5. Ciclo de auto-calibração · 6. Tipografia · 7. SVG · 8. Fontes.

## 1. Porquê medir (e nunca estimar)

Dois efeitos sabotam a clonagem "a olho":

1. **Perda de detalhe pequeno.** Um VLM que vê a página inteira numa passagem
   perde micro-tipografia, espessuras e alinhamentos sub-píxel — e imagens grandes
   são reduzidas antes de chegar ao modelo, diluindo ainda mais (Shi, Gan & Jiang,
   *Why VLMs Miss Small Objects, and When Zooming In Is Safe*, arXiv:2610.09313).
2. **Falha de transposição.** Modelos identificam bem o que há dentro de um recorte
   ampliado, mas re-mapear posições do recorte para a vista geral falha — daí a
   grelha de coordenadas ser obrigatória (mesmo trabalho, e o raciocínio de
   sobreposição de vistas do zoom seguro).

A resposta desta skill: endereçar por células, zoom com contexto, medir com sondas
de píxeis e fechar o ciclo com captura própria + diff — transformar estimativa em
leitura de números.

## 2. Grelha e endereço de células

```bash
node <gl> grid --image ref.png --cols 12 --rows 8 --out work/grid.png   # células A1..
node <gl> grid --image ref.png --step 40 --out work/regua.png           # régua de px
```

- Linhas = letras (`A`, `B`, … `Z`, `AA`), colunas = números (`1..N`) — estilo
  folha de cálculo, escalável a páginas altas.
- Cada célula traz mira no centro e rótulo; o modo `--step` desenha uma régua de
  píxeis (linhas a cada `step`, principais a cada 5) para leitura de coordenadas.
- Endereço em `gl zoom`: `B2` (uma célula), `D3+E3` (fronteira entre células
  adjacentes — união), `B2.C1` (sub-célula dentro do zoom: sub-grelha recursiva).
- O rótulo liga sempre à imagem: o JSON do zoom devolve `target`, `expanded` e os
  limites — as medições seguem daí em píxeis reais.

## 3. Zoom contextual (com os arredores escurecidos)

```bash
node <gl> zoom --image ref.png --cell B2.C1 --sub 4 --step 8 --out work/zoom.png
node <gl> zoom --image ref.png --crop 240,160,408,96 --context 0.35 --out work/zoom.png
```

- O alvo amplia-se (nearest, sem suavizar — píxeis são píxeis) e ganha sub-grelha
  de píxeis com coordenadas GLOBAIS impressas.
- Os arredores ficam **escurecidos, não cortados**: mantém-se a orientação global
  e evita-se a ilusão de recorte isolado (sombras e transições veem-se completas).
- `--context 0.35` reserva 35% do tamanho do alvo como margem de contexto;
  `--no-dim` desliga o escurecimento; `--max-edge 1568` mantém a saída legível
  para a visão do modelo (imagens maiores são reduzidas pelo harness).

## 4. Sondas determinísticas (`gl probe`)

| Sonda | Devolve | Serve para |
|---|---|---|
| `colors --at nome=x,y` | hex (média 5×5), `stddev`, `stable` | cor exata de superfícies/texto/bordas |
| `palette [--region] [--k]` | k cores + quotas (+`bbox`) | tokens, deteção de fundo/secções |
| `box --color #hex` | caixa (2%–98%) da cor | tamanho/posição de elementos de cor conhecida |
| `bbox [--bg auto]` | caixa exata do conteúdo | padding, tamanho de caixas, caixa de texto |
| `runs --row N / --col N` | segmentos de cor com limites | margens, gutters, espessuras de borda |
| `bands --direction row` | bandas conteúdo/vazio | linhas de texto, ritmo vertical, separadores |

Regras de uso:
- `stddev` alto numa amostra `colors` significa borda/gradiente no ponto — escolhe
  outro ponto (`stable:false` marca isto).
- `runs` devolve cada transição com limites em px e unidades lógicas; a diferença
  entre limites consecutivos É o padding/gutter — não se estima por olho.
- `bbox` com `--bg auto` detecta o fundo pelas bordas da região; para texto sobre
  fundo complexo, passa `--bg` explícito.
- Todas as sondas aceitam `--region x,y,w,h` para medir dentro de um recorte local.

## 5. Ciclo de auto-calibração (o loop que dá a paridade)

1. Mede a referência (`probe`/`zoom`) → escreve o CSS a partir dos números.
2. `gl verify --id <id>` → captura o PRÓPRIO resultado e mede-o contra a referência.
3. Lê o `report.json`: `shiftHint` corrige deslocamentos; `edgeEnergyRatio` denuncia
   geometria em falta (< 0.95) ou ruído (> 1.05); `worstCell` localiza o defeito.
4. Para o pior hotspot, abre o MESMO recorte nas duas imagens e mede ambos com a
   mesma sonda — a correção é uma razão numérica (ex.: a caixa mede 212 px na
   referência e 198 no candidato → `width`/`padding` × 1.0707).
5. Repete até `pass:true`. Isto substitui "achar que está igual" por números.

## 6. Tipografia (medir cap-height, calibrar a fonte)

- Tamanho de corpo ≈ altura de caixa de maiúsculas ÷ 0.7 (depende da fonte; mede
  sempre a caixa real com `bbox` sobre uma linha de texto isolada).
- `bands --direction row` devolve as linhas de texto (alturas e entrelinhas) e
  `runs` devolve a largura das palavras — comparam-se com o candidato para ajustar
  `font-size`, `line-height` e `letter-spacing`.
- Identifica a família a olho a partir de `ref-zoom.png`; usa a mais próxima das
  instaladas (sem rede!). Se a fonte real não existir, a paridade tipográfica é um
  desvio DECLARADO — vê `references/fidelidade-e-limiares.md`.
- Sempre que possível, testa no mesmo sistema/browser que produziu a referência.

## 7. SVG e ilustrações (modelação vetorial)

Para ícones/ilustrações a desenhar em SVG:
- `viewBox` = dimensões CSS do recorte (mapeamento 1:1 com as caixas medidas);
- arestas retas horizontais/verticais em coordenadas inteiras (evita desfoque de
  sub-píxel); curvas livres, mas pontos de início/fim sobre interseções inteiras;
- mede tudo com as mesmas sondas (`box`/`bbox`/`runs` sobre o recorte) e valida com
  `gl verify` como qualquer componente (o diff apanha meio-píxel de desfoque).

## 8. Fontes (de onde vem a técnica)

- Shi, Gan & Jiang — *Why VLMs Miss Small Objects, and When Zooming In Is Safe*,
  arXiv:2610.09313 (2026): limites de resolução de objetos pequenos, regra de zoom
  seguro e decomposição por vistas sobrepostas.
  <https://arxiv.org/abs/2610.09313>
- `illodev/drawn-by-code` (skill `replicate`): portão de detalhe e sondas de
  referência (`engine/reference.mjs`) sobre espaço lógico.
  <https://github.com/illodev/drawn-by-code>
- `dzhng/jevgrep` (skill `compare-screenshots`): fluxo de paridade com marcos de
  referência e diff visual (pixelmatch + Sobel).
  <https://github.com/dzhng/jevgrep>
- `ZachRouan/gridhand`: sobreposição de grelha rotulada com miras e zoom recursivo
  por célula (`C7.F3`) sobre aplicações reais.
  <https://github.com/ZachRouan/gridhand>
- `P233/pixel-mirror`: sobreposição de mockup sobre a página real com opacidade
  ajustável (útil para conferência manual).
  <https://github.com/P233/pixel-mirror>

Esta skill combina essas ideias num motor próprio (sem dependências nativas) e
acrescenta o que lhes falta para o caso de uso: **decomposição em componentes
testáveis em isolamento e construção em paralelo por subagentes**.

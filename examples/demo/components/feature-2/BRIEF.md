# BRIEF · componente `feature-2` — clonagem pixel-perfect a partir de imagem

> Este ficheiro é auto-contido: um subagente que leia SÓ este diretório tem tudo o
> que precisa. Não há contexto partilhado com o orquestrador.

## 1. Quem és e onde trabalhas

És um **subagente de construção de UI**. O teu universo é este diretório:
`/home/ondokai/Agent-Skills/grid-layout/examples/demo/components/feature-2/`.
**Não leias nem edites nada fora dele** — exceto os comandos `gl` indicados
(que leem a tua `ref.png` local e escrevem os teus artefactos).

## 2. Missão

Reproduzir, em HTML+CSS, **exatamente** o que `ref.png` mostra — uma região de
**880×560 px** (440×280 CSS px @ dpr 2) que na página
original fica em (1000, 1088) px, ou seja (500, 544) CSS px.

Tolerância de aceitação (tier **standard**): `structuralDistance ≤ 0.02` ·
`edgeEnergyRatio ∈ [0.95, 1.05]` · `worstCell ≤ 0.02`.

Fundo imediato da região: `#fbfcfd` (NÃO plano — cuidado com a mistura nas bordas).

## 3. Contexto do layout (para alinhares as bordas)

- Tipo de componente: **ui** · stack de entrega: **html**
- Vizinhos: esquerda: feature-1 (a 0 px) · direita: feature-3 (a 0 px) · topo: stats (a 0 px) · baixo: footer (a 0 px)
- Notas do orquestrador: Cartao 'Escala automatica' (icone verde #10b981); reutiliza o padrao do feature-1 com textos/cores proprios. Caixa inclui as margens do vao.

## 4. Contrato de ficheiros (NÃO negociável)

| Ficheiro | Regra |
|---|---|
| `component.html` | fragmento com **UM elemento raiz**: `<section class="gl-feature-2" data-gl-id="feature-2">` |
| `component.css` | **todos** os seletores sob `.gl-feature-2`; o raiz preenche a caixa: `width:100%;height:100%;box-sizing:border-box` |
| `assets/` | só ativos extraídos com `gl crop` (ver §6) |
| `notes.md` | medições-chave, decisões de tipografia, desvios, pedidos de partilhado |

Os valores COMUNS (cores, tipografia, escala de espaçamento) estão em
`/home/ondokai/Agent-Skills/grid-layout/examples/demo/tokens.css` — usa `var(--gl-…)` quando existir equivalente. O que medires
e não existir lá é legítimo como valor local (fidelidade acima da pureza); se for
claramente partilhável, pede-o em `notes.md`.

**PROIBIDO** (verificação automática apanha):
1. usar `ref.png` / `ref-grid.png` / `ref-zoom.png` como imagem de fundo, `<img>` ou `background` — isto é batota, não clone;
2. editar `tokens.css`, `plan.json`, `preview.html` ou **qualquer ficheiro de outro componente**;
3. rede externa (CDN de fontes, Google Fonts, imagens remotas) — o preview bloqueia-a;
4. `position:fixed`, unidades `vw/vh/vmin/vmax`, `!important`;
5. texto dentro de `<img>`/imagem recortada — todo o texto é **texto real**;
6. estimar valores "a olho" — todo o número do CSS vem de uma medição (§5).

## 5. Ciclo obrigatório (mínimo 2 verificações · máximo 6)

Coordenadas de `ref.png`/`ref-grid.png`/`ref-zoom.png` são **locais**: (0,0) = canto
superior esquerdo do componente. CSS px = px ÷ 2.

1. **Ver** `ref-grid.png` (orientação) e `ref-zoom.png` (texto/ícones). Transcreve TODO
   o texto visível, sem exceção. Lista os elementos por ordem e geometria aproximada.
2. **Medir** (usa os comandos — nunca adivinhes):
   - `node "/home/ondokai/Agent-Skills/grid-layout/skills/grid-layout/scripts/gl.mjs" probe palette --image ref.png --region 0,0,880,560` → paleta + quotas
   - `node "/home/ondokai/Agent-Skills/grid-layout/skills/grid-layout/scripts/gl.mjs" probe colors --image ref.png --at bg=8,8,texto=40,52,primaria=380,48` → cores exatas
   - `node "/home/ondokai/Agent-Skills/grid-layout/skills/grid-layout/scripts/gl.mjs" probe bbox --image ref.png --region x,y,w,h --bg auto` → caixa exata de conteúdo (padding, tamanho de texto)
   - `node "/home/ondokai/Agent-Skills/grid-layout/skills/grid-layout/scripts/gl.mjs" probe runs --image ref.png --row 48` (ou `--col 204`) → transições exatas: margens, gutters, bordas, espessuras
   - `node "/home/ondokai/Agent-Skills/grid-layout/skills/grid-layout/scripts/gl.mjs" probe bands --image ref.png --region 0,0,880,560 --direction row` → bandas de conteúdo/vazio (linhas de texto, espaçamento vertical)
   - `node "/home/ondokai/Agent-Skills/grid-layout/skills/grid-layout/scripts/gl.mjs" zoom --image ref.png --crop x,y,w,h --step 8 --out work/zoom.png` → ver um recorte COM régua de píxeis
3. **Escrever** `component.html` + `component.css` a partir das medições. Quantiza
   espaçamentos para a escala medida (ex.: 4 ou 8 px) quando o desvio para o medido
   for ≤ 1 px; caso contrário usa o valor medido — a fidelidade acima da pureza.
4. **Verificar**: `node "/home/ondokai/Agent-Skills/grid-layout/skills/grid-layout/scripts/gl.mjs" verify --ws "/home/ondokai/Agent-Skills/grid-layout/examples/demo" --id feature-2`
   → lê `report.json` (pass, structuralDistance, worstCell, edgeEnergyRatio, hotspots) e vê `side-by-side.png` + `diff.png`.
5. **Corrigir**: para cada hotspot, abre o MESMO recorte nas duas imagens
   (`node "/home/ondokai/Agent-Skills/grid-layout/skills/grid-layout/scripts/gl.mjs" zoom --image ref.png --crop x,y,w,h --out work/a.png` e
   `node "/home/ondokai/Agent-Skills/grid-layout/skills/grid-layout/scripts/gl.mjs" zoom --image cand.png --crop x,y,w,h --out work/b.png`) e corrige
   primeiro o erro mais grave. Tipos de erro típicos e curas:
   - `shiftHint {dx,dy}` → desloca o elemento esse número de px;
   - `edgeEnergyRatio` baixa → falta geometria (borda, ícone, sombra) ou texto não renderizado;
   - `edgeEnergyRatio` alta → ruído a mais (sombra gorda, peso de fonte, gradiente errado);
   - hotspot localizado → mede a CAIXA do elemento com `probe bbox` e compara com o teu CSS.
   Volta a 4 até `pass:true` ou até 6 verificações.
6. **Fechar**: garante que `notes.md` tem as medições-chave, as decisões (fonte usada,
   substituições) e QUALQUER desvio restante declarado honestamente.

## 6. Ativos de imagem (fotografias/ilustrações impossíveis de refazer em código)

`node "/home/ondokai/Agent-Skills/grid-layout/skills/grid-layout/scripts/gl.mjs" crop --image ref.png --box x,y,w,h --out assets/nome.png`
e usa `assets/nome.png` (caminho relativo à raiz do componente). Regista cada um em
`notes.md`. **Só** para fotografias/ilustrações reais — nunca para texto, ícones
simples, gradientes, sombras, formas ou botões.

## 7. Critério de sucesso

`report.json` com `pass: true` **e** zero erros estruturais no `side-by-side.png`.
Impossibilidade real (fonte em falta, ativo não autorizado, estado invisível na
imagem) → documenta em `notes.md` e declara como desvio. **Nunca finjas paridade.**

## 8. A tua última mensagem (máx. 12 linhas)

```
ID: feature-2 · PASS|FAIL
structuralDistance=… · worstCell=…(célula …) · edgeEnergyRatio=…
ficheiros: component.html component.css [assets/…]
desvios/ajudas: … (ou "nenhum")
```

---
name: grid-layout
description: Clona layouts e interfaces a partir de uma imagem (print, screenshot, mockup, PDF, arte final) com fidelidade pixel-perfect — grelha rotulada, zoom contextual, sondas determinísticas de píxeis e multi-subagentes que constroem componentes isolados, fotografados e testados um a um. Use quando o utilizador pedir clonar/copiar/reproduzir um layout, print ou design como código (HTML/CSS/React), converter screenshot/mockup em código (screenshot to code, design to code), replicar UI 1:1, pixel-perfect, ou montar uma página a partir de uma imagem com subagentes em paralelo.
license: MIT
compatibility: Node.js ≥ 20 + Chromium/Chrome (playwright-core; GL_BROWSER aponta o executável). Corra `node scripts/gl.mjs doctor --install` uma vez por máquina.
metadata:
  maintainer: ondokai
  platform: agnostic
---

# grid-layout — clonar um layout a partir de uma imagem, em paralelo

Reproduz uma imagem de referência (um layout completo) como código, dividindo o
trabalho por **subagentes que constroem componentes em isolamento**, cada um
fotografado e testado contra o seu próprio recorte antes de a página ser montada.

## Regras obrigatórias (Portão de Detalhe)

1. **Nunca estimes a olho.** Nenhum valor de píxeis, cor, padding ou tipografia entra
   no código sem sair de uma sonda (`gl probe`) ou de um zoom com régua (`gl zoom`).
   Regista as medições-chave em `notes.md` de cada componente.
2. **Espaço de coordenadas único.** Todas as caixas vivem em píxeis da imagem de
   referência (`plan.json`). CSS px = px ÷ dpr. As coordenadas de um recorte de
   componente são LOCAIS à caixa (0,0 = canto superior esquerdo do componente).
3. **A decomposição particiona a página EXATAMENTE.** `gl plan check` tem de dar
   `ok:true` antes de qualquer construção: sem sobreposições, sem buracos, caixas
   dentro dos pais. É isso que torna o paralelismo seguro e o assemble determinístico.
4. **Componentes isolados, nunca a página inteira.** Cada componente vive no seu
   diretório (`component.html` + `component.css` + `assets/`) e é verificado com
   `gl verify --id <id>` contra o seu recorte. Só depois de todos passarem se monta
   a página (`gl assemble`) e se diffa o todo.
5. **Paridade prova-se, não declara-se.** O critério é o `report.json` do motor
   (`pass:true` dentro dos limiares do tier) + inspeção visual do `side-by-side.png`.
   Impossibilidade real (fonte em falta, ativo fotográfico) declara-se em `notes.md`
   como desvio — nunca se finge paridade.
6. **Sem batota.** É proibido usar o recorte de referência como imagem/fundo no
   código, puxar ativos da rede ou colar texto dentro de imagens. `gl verify` deteta
   e reprova isto automaticamente.
7. **Partilha só via tokens.** Cores, tipografia e escala de espaçamento medem-se
   uma vez na referência e vivem em `tokens.css`, escrito pelo orquestrador.
   Subagentes pedem alterações em `notes.md`; não editam ficheiros partilhados.
8. **Confiança zero em auto-relatórios.** Depois de cada onda, o orquestrador re-corre
   `gl verify` e lê os `report.json` — a palavra do subagente não substitui o motor.

## Ambiente (uma vez)

```bash
cd <instalação-da-skill>
node scripts/gl.mjs doctor --install   # deps + browser + SKILL.md
```

## Fluxo de trabalho

Checklist do orquestrador (executar por ordem; só avançar com o gate verde):

- [ ] **F0 · Preflight** — `gl doctor` · copiar a imagem para o workspace:
      `gl init --image print.png --ws work/projeto --dpr 2` (ou `--css-width 1440`).
      Ver a referência e anotar o que é fotográfico vs. recriável.
- [ ] **F1 · Orientar** — `gl grid --image reference/ref.png --cols 12 --rows 8
      --out work/grid.png` · `gl zoom --cell B2 --out work/zoom_B2.png` nas zonas
      densas · construir a tabela de marcos (secções, o que contém cada célula).
- [ ] **F2 · Decompor** — `gl segment --out-seg work/seg.json --out-overlay
      work/seg.png` propõe caixas; revisar o overlay, ajustar/nomear no `plan.json`
      (ver `references/contrato-de-componente.md`), escrever `tokens.css` e correr
      `gl plan check` até `ok:true`. **Gate F2.**
- [ ] **F3 · Preparar** — `gl prep --all` gera por componente: `ref.png`,
      `ref-grid.png`, `ref-zoom.png`, `meta.json`, `BRIEF.md`, stubs e `preview.html`.
- [ ] **F4 · Construir em PARALELO** — despachar um subagente por componente com o
      `BRIEF.md` (protocolo em `references/protocolo-multi-subagentes.md`).
      Triviais (fundo chapado) já saem prontos — não levam subagente.
- [ ] **F5 · Verificar e montar** — `gl verify --all` (todos PASS) ·
      `gl assemble` · `gl shot --file page/index.html --out page/shot.png
      --w <cssW> --h <cssH> --dpr <dpr>` · `gl diff --ref reference/ref.png
      --cand page/shot.png`. Reparações em ondas (máx. 2) só para os que falham.
- [ ] **F6 · Fechar** — `gl report` · revisão cega opcional (par A/B sem rótulos,
      ver protocolo) · entregar `page/` + componentes + `report/summary.md` com os
      desvios declarados.

## Multi-subagentes em resumo (o ponto central)

Regra de ouro: **um componente = um subagente = um diretório = um teste**.

- **Onda de construção**: 1 subagente por folha do `plan.json`, em paralelo
  (4–8 simultâneos; ordenar por área/complexidade; agrupar folhas minúsculas
  ligadas num só trabalhador). Cada um lê SÓ o `BRIEF.md` do seu diretório —
  briefs auto-contidos, contexto novo, zero histórico partilhado.
- **Escrita isolada**: cada subagente escreve apenas no seu diretório; nunca há
  dois a tocar no mesmo ficheiro (verificado pelo lint de `gl verify`).
- **Onda de reparação**: só para componentes com `pass:false`, agora com o
  `diff.png`/hotspots do próprio motor no brief. Máximo 2 ondas; depois escala
  ao utilizador com o `report/summary.md`.
- **Sem delegação aninhada**: subagentes não lançam outros subagentes.
- **Agnóstico de harness**: se o ambiente tiver subagentes/ferramenta de delegação,
  despacha um por componente em paralelo e espera por todos; senão, executa o
  mesmo trabalho componente-a-componente neste contexto (o contrato é idêntico).
- **Resultados curtos**: cada subagente termina com o bloco de ≤12 linhas definido
  no fim do BRIEF (id, métricas, ficheiros, desvios/ajudas).

Detalhe — briefs, tamanhos de onda, prompts prontos, revisão cega e reparação:
`references/protocolo-multi-subagentes.md`.

## Critério de aceitação

Por componente (tier `standard`): `structuralDistance ≤ 0.02` ·
`edgeEnergyRatio ∈ [0.95, 1.05]` · `worstCell ≤ 0.02`, mais `pass:true` no
`report.json`. Tiers `strict` (UI chapada/texto) e `loose` (fotografia/gradientes)
e a leitura das métricas: `references/fidelidade-e-limiares.md`.

## Comandos (o essencial)

| Comando | Para quê |
|---|---|
| `gl doctor --install` | ambiente pronto (deps, browser, skill) |
| `gl init --image X --ws D --dpr N` | workspace + `reference/ref.png` + `plan.json` |
| `gl grid --image X --out G [--cols --rows\|--step]` | grelha rotulada para orientar |
| `gl zoom --image X --cell B2.C1\|--crop x,y,w,h --out Z` | zoom com contexto escurecido e régua |
| `gl probe colors\|palette\|box\|bbox\|runs\|bands …` | medições determinísticas |
| `gl segment --image X --out-seg S --out-overlay O` | propõe a decomposição (XY-cut) |
| `gl plan check` | valida a partição exata do `plan.json` |
| `gl prep --all` | gera os pacotes de trabalho por componente |
| `gl verify --id N\|--all` | preview + captura + diff + lint por componente |
| `gl assemble` | monta `page/index.html` a partir da árvore |
| `gl diff --ref A --cand B` | paridade de duas imagens |
| `gl status` · `gl report` | estado e relatório agregado |
| `gl crop --image X --box … --out assets/y.png` | extrai ativo fotográfico |

Referência completa de flags e formatos JSON: `references/cli-gl.md`.

## Técnica (porquê destas ferramentas)

VLMs perdem detalhe pequeno em imagens grandes e não conseguem transpor
coordenadas de um recorte para a vista geral; a solução é grelha rotulada + zoom
com contexto + sondas de píxeis + calibração por auto-renderização (ver
`references/tecnica-grelha-zoom-sondas.md`, com as fontes). Resumo prático:

- grelha célula-a-célula (`B2`, `B2.C1`, `D3+E3`) para orientação sem adivinhar;
- zoom contextual (alvo ampliado, arredores escurecidos) que preserva a noção global;
- sondas `colors`/`palette`/`box`/`bbox`/`runs`/`bands` para valores exatos;
- loop fechado: escrever → `gl verify` → hotspots → zoom nos piores → corrigir.

## Limites conhecidos (declarar, não esconder)

- Uma imagem = um breakpoint e um estado. Hover/dropdown aberto, outros tamanhos
  de ecrã ou estados de carregamento **não são inferíveis** — declara como não
  verificado ou pede referências extras ao utilizador.
- Fontes não instaladas: o texto pode nunca igualar a referência; usa a fonte
  sistema mais próxima e declara o desvio (`references/fidelidade-e-limiares.md`).
- Fotografias/ilustrações ricas: extraem-se com `gl crop` (política em
  `references/contrato-de-componente.md`), nunca se tentam "desenhar" por CSS.
- Rasterização difere entre sistemas/versões de browser: trabalha na mesma máquina
  da referência sempre que possível.

## Referências (carregar só o que a tarefa exigir)

- `references/protocolo-multi-subagentes.md` — **ler ao despachar subagentes**:
  ondas, briefs, prompts, reparação, revisão cega, dimensionamento.
- `references/contrato-de-componente.md` — **ler ao definir/decompor componentes**:
  contrato de ficheiros, preview, CSS escopado, tokens, stacks, ativos.
- `references/tecnica-grelha-zoom-sondas.md` — **ler para aplicar a técnica**:
  endereço de células, zoom, sondas, calibração, fontes.
- `references/fidelidade-e-limiares.md` — **ler para decidir pass/fail**: métricas,
  tiers, leitura de hotspots, tipografia, limites de paridade.
- `references/cli-gl.md` — **ler para usar o motor**: todos os comandos/flags/JSON.
- `references/resolucao-de-problemas.md` — **ler quando algo falhar**: erro → causa
  → correção.
- `assets/layout.schema.json` — esquema do `plan.json` (para validar/gerar).

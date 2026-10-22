# examples/demo — execução dogfooded com subagentes reais

Este diretório é o resultado de uma execução COMPLETA do fluxo da skill
`grid-layout` — do zero à página montada — com **7 subagentes reais em paralelo**,
cada um recebendo apenas o `BRIEF.md` do seu componente como instrução.

## A referência

`reference/ref.png` — dashboard "Nimbus" **2880×1800 px (viewport 1440×900 CSS @
DPR 2)** gerada a partir do fixture [`tests/fixtures/demo-source.html`](../../tests/fixtures/demo-source.html)
(HTML escrito de raiz para este teste — sem conteúdo alheio de terceiros). Os
construtores viram apenas os seus recortes; o HTML de origem não lhes foi dado.

## A decomposição (`plan.json`)

Partição EXATA validada por `gl plan check` — 7 folhas em 5 zonas:

| componente | caixa (px ref) | notas do orquestrador |
|---|---|---|
| `topbar` | 0,0,2880,128 | barra escura com marca, navegação, avatar |
| `hero` | 0,128,2880,640 | título 48px, subtítulo, botão primário, link |
| `stats` | 0,768,2880,320 | 3 estatísticas + separadores 1px |
| `feature-1` | 0,1088,1000,560 | cartão azul (padrão canónico da família) |
| `feature-2` | 1000,1088,880,560 | cartão verde (`reuse: feature-1`) |
| `feature-3` | 1880,1088,1000,560 | cartão âmbar (`reuse: feature-1`) |
| `footer` | 0,1648,2880,152 | rodapé escuro com copyright + links |

`tokens.css` concentra as cores/tipografia/espaçamento medidos por `gl probe` — a
única partilha entre trabalhadores.

## Resultados

Veredito do motor (`gl verify --all` re-corrido pelo orquestrador — nunca os
auto-relatórios):

| componente | verificações | structuralDistance | worstCell | edgeEnergyRatio | nota |
|---|---|---|---|---|---|
| `topbar` | 3 | 0.0004 | 0.005 (B5) | 1.001 | residual AA nas curvas dos glifos da nav |
| `hero` | 3 | **0** | 0 | 1.000 | `cand.png` byte-idêntico a `ref.png` |
| `stats` | 2 | **0** | 0 | 1.000 | `cand.png` byte-idêntico a `ref.png` |
| `feature-1` | 2 | **0** | 0 | 1.000 | `cand.png` byte-idêntico a `ref.png` |
| `feature-2` | 2 | **0** | 0 | 1.000 | `cand.png` byte-idêntico a `ref.png` |
| `feature-3` | 2 | 0.0004 | 0.0024 (D1) | 1.002 | gap ícone→título de 17px medido |
| `footer` | 2 | 0.0008 | 0.0088 (B6) | 1.002 | fonte calibrada (Liberation Sans 13px) |
| **página montada** | — | **0.0001** | 0.0034 (F6) | 1.000 | `pixelmatch=0` · `mae=0.003` |

Limiares do tier `standard`: `sd ≤ 0.02` · `worstCell ≤ 0.02` · `edgeEnergyRatio ∈
[0.95, 1.05]` — todos os 7 componentes passaram, 4 deles com paridade **byte a
byte**. Detalhe por componente em [`report/summary.md`](report/summary.md) e nos
`report.json` de cada diretório.

### O que os subagentes encontraram (e mudou a skill)

Os briefs pedem "ajudas para o orquestrador" — e renderam:

1. **`gl probe colors --at`**: a sintaxe documentada (`nome=x,y`) não passava pelo
   parser (que pedia `nome=x:y`) → o parser passou a aceitar as duas formas.
2. **Lint de batota por menção textual**: comentários que mencionavam `ref.png`
   disparavam o aviso → o lint passa a ignorar comentários.
3. **`backdrop` do `meta.json`**: mostrava a cor do anel EXTERIOR do recorte
   (vizinhos) em vez do fundo local → passou a medir as quinas do próprio recorte.
4. **`tokens.css` fora do alcance**: o "não leias nada fora do diretório" bloqueava
   a leitura do ficheiro partilhado → o brief passa a permitir explicitamente a
   leitura de `tokens.css` (e a dizer que a medição manda sobre o backdrop).

### Pedidos de partilha feitos pelos trabalhadores (`notes.md`)

`--gl-radius-card:16px` · `--gl-radius-icon:12px` · `--gl-color-bg-inverse:#0f172a`
· `--gl-color-text-muted:#94a3b8` — registados em `tokens.css` como resposta do
orquestrador ao ciclo de pedidos.

## Como reproduzir

```bash
cd skills/grid-layout
node scripts/gl.mjs plan check --ws ../../examples/demo
node scripts/gl.mjs verify --ws ../../examples/demo --all
node scripts/gl.mjs assemble --ws ../../examples/demo
node scripts/gl.mjs report --ws ../../examples/demo
```

Os artefactos por componente (`cand.png`, `diff.png`, `side-by-side.png`,
`report.json`) regeneram-se com `gl verify` e ficam fora do git por omissão;
o que se comete aqui é o material documental: recortes de referência, briefs,
código dos componentes, notas dos trabalhadores e o resumo de métricas.

## O que este demo prova

1. **Briefs auto-contidos bastam**: nenhum construtor recebeu a conversa do
   orquestrador nem o SKILL.md — apenas `components/<id>/BRIEF.md`.
2. **Escrita isolada sem conflitos**: 7 trabalhadores em paralelo, cada um só no
   seu diretório.
3. **O motor julga, não os relatórios**: o veredito é sempre o `report.json` do
   `gl verify` (re-corrido pelo orquestrador), com limiares por tier.
4. **Componentes testáveis um a um**: `gl verify --id <id>` reproduz qualquer
   componente isolado, na caixa exata, sobre o fundo imediato.
5. **Reparação dirigida**: falhas voltam aos construtores com o `diff.png` e os
   hotspots do próprio motor — nunca às cegas.

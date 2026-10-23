# Relatório forense — houve “cola” no benchmark?

**Pergunta:** os agentes copiaram o código-fonte da referência ou receberam o layout por
injeção de contexto?
**Resposta:** não encontrei evidência de cópia nem de injeção do layout/fonte. Encontrei
**engenharia reversa pixel a pixel do PNG** — e **uma falha de isolamento minha** (o B viu
os *nomes* dos meus scripts de medição em `../tools`; não leu o conteúdo nem os usou).

## 1. O que cada agente recebeu

| Item | Caso A | Caso B |
|---|---|---|
| Prompt da tarefa | stack, regras e “use a skill” | stack, regras e “não use skill” |
| System prompt | 5.647 chars, **idêntico** ao B; instruções gerais/DSH | 5.647 chars, **idêntico** ao A |
| Skill | `mui-agent-skill` (genérica de MUI v9) | nenhuma (0 chamadas/leituras) |
| Imagens | `reference-desktop.png` 1440×1340 + `reference-mobile.png` 390×844 | as mesmas |
| Código-fonte da referência | **não** (movido para `/tmp` antes do A) | **não** |
| Transcrição da sessão-mãe | **não** | **não** |
| Servidor da referência (4180) | sem requisições | sem requisições |
| Pasta do outro caso | só viu o nome em `ls`; não leu | só viu o nome em `ls`; não leu |
| `../screenshot`, `../metrics`, `../logs` | 0 acessos | 0 acessos |
| `../tools` | usou venv/Playwright e `shot.mjs` | idem; **viu nomes** dos meus scripts, não leu |

O system prompt do A e do B é **byte a byte igual** (5.647 chars) e não contém “Orbit”,
“Financial overview”, “Acme”, “128,430”, “recent transactions”, “reference-app”, “4180”
nem qualquer trecho do layout. A única diferença de contexto entre os casos é a cláusula
da skill.

## 2. Vetores de vazamento testados

| Vetor | Como verifiquei | Resultado |
|---|---|---|
| Fonte em `/tmp/orbit-reference-src` | busca em todas as 1.240/1.300+ eventos das sessões; comandos; resultados | **0** menções a `orbit-reference-src`, `reference-app`; 0 às constantes do fonte (`REVENUE = [62`, `MAX = 140`, `orbit-revenue-area`, `AVATAR_TONES`, `SidebarNav`) |
| Servidor 4180 | log do `http.server` + timestamps da sessão-mãe | só **2 rajadas**, ambas minhas: 15:34:02 (comando-mãe 15:34:00) e 16:07:11 (comando-mãe 16:07:10); nenhuma do A/B |
| Sessão-mãe (`~/.dsh/sessions`) | busca por `.dsh/sessions`, `session.v4`, `zstd` | **0** |
| Caso irmão | busca por leituras/`read_image`/`bash` com `../caso-a`/`../caso-b` | **0**; apenas nomes em `ls ..` |
| `../screenshot` | busca no texto das ferramentas | **0** |
| `../metrics/captures/referencia.json` | busca por `captures`, `referencia.json`, `TEXT_KEYS`, `GEOMETRY_KEYS`, `ZONES`, `pixel_match_16` | **0** |
| `../tools/measure.mjs` / `metrics.py` / `audit.py` / `report.py` | comandos + resultados | **0 leituras/execuções**; B viu os nomes no `ls`, não abriu |
| `../tools/debug-dark.png` / `debug-drawer.png` | `read_image`/comandos | **0**; B viu só os nomes no `ls` |
| `../tools/debug.mjs` (contém a URL 4180) | busca por `4180` | **0** comandos; as ocorrências de “4180” nas sessões são **UUIDs** (`...-4180-...`), não porta |
| `../../` / repo | `git status`, comandos | só o próprio caso; nenhuma alteração fora |

No B, `measure.mjs` (5), `metrics.py` (2), `audit.py` (16) e `report.py` (1) aparecem
**apenas no `ls -la ../tools`** e no raciocínio sobre não usá-los. Não há `TEXT_KEYS`,
`GEOMETRY_KEYS`, `ZONES` nem o conteúdo dos scripts em nenhuma sessão.

## 3. Como replicaram: perícia de imagem

- **A:** 39 `read_image`, 133 comandos `bash`, 7 `read` (TASK + 6 subskills da skill).
- **B:** 63 `read_image`, 140 comandos `bash`, 1 `read` (TASK).
- Os dois geraram **recortes e ampliações**: A `.crops/word-title-8x.png`,
  `.crops/traffic2x.png`, `.crops/fontrender-crop.png`; B `.ref/type_title.png`,
  `.ref/amount_zoom.png`, `.ref/kpival_zoom.png`, `.ref/chart_zoom.png`,
  `.ref/top_ref.png`, `.ref/top_our.png`.
- **A** comparou **Inter × Roboto** renderizando as duas fontes em canvas/Playwright
  (`.crops/fontcheck.mjs`, `fontrender.mjs`) e escolheu Roboto.
- **B** fez o mesmo tipo de teste e depois mediu **linhas de borda e caixas de texto**
  no PNG da referência e no próprio print, com Python/PIL:
  ```
  == refD (1340, 1440, 3)   border rows [67, 180, 375, 396, ...]
  == ourD (1340, 1440, 3)   border rows [67, 113, 180, 375, ...]
  ```
  e recortou o topbar/sidebar/KPIs em 2× para comparar lado a lado.
- Não é “uma olhada”: foram ~30 min por caso, 39/63 leituras de imagem e 100+ comandos
  de análise. O texto de 11–13 px do PNG é **legível** — a prova é o recorte
  [`reference-table-2x.png`](reference-table-2x.png): nomes, e-mails, datas, bandeiras,
  valores e status estão todos lá, sem ambiguidade.

## 4. Provas negativas (o que um copiador não faria)

### 4.1 Os dados dos gráficos não são os da referência

O fonte da referência tem `REVENUE = [62,68,61,74,81,79,88,92,86,98,104,124]` e
`MAX = 140`. Nenhum dos dois usou esses valores:

| Série | 12 pontos |
|---|---|
| Referência (fonte) | 62, 68, 61, 74, 81, 79, 88, 92, 86, 98, 104, 124 |
| A (`revenueSeries`, fonte) | 56.0, 52.9, 57.2, 48.1, 43.2, 44.4, 37.7, 35.2, 38.9, 31.6, 26.7, 12.2 |
| B (`revenueSeries`, fonte) | 0.4455, 0.4818, 0.4424, 0.5303, 0.5788, 0.5667, 0.6273, 0.6576, 0.6152, 0.7, 0.7424, 0.8848 |

- A codificou **coordenadas Y de pixel** (de cima para baixo; por isso decrescem).
- B codificou **posições normalizadas 0..1 lidas do print** (comentário no próprio
  `data.ts`: “Normalised 0..1 coordinates, read from the reference chart”).
- Os valores do B ficam perto de `valor/140` porque essa é a posição visual da linha no
  gráfico da referência — é exatamente o que uma amostragem de píxeis devolve. O código
  do B **não contém `140`**; ele normalizou no viewBox 0..100, não leu a escala do fonte.
- Se tivessem lido o fonte, o caminho mais simples seria usar 62..124; nenhum usou.

### 4.2 Código, tema e ícones são independentes

| Item | Referência | A | B |
|---|---|---|---|
| Tema claro/escuro | `cssVariables` + `colorSchemes` + `colorSchemeSelector: 'data'` | `cssVariables: { colorSchemeSelector: 'class' }` + `colorSchemes` | `palette.mode` + estado/localStorage (legado) |
| Componentes | `Surface`, `SidebarNav`, `TopBar`, `KpiCard`, `RevenueChart`, `TransactionsTable`, `ActivityCard` | `RevenueCard`, `KpiGrid`, `PageHeader`, `Topbar`, `ui.tsx` | `RevenueChart`, `KpiCard`, `TeamActivity`, `Logo`, `Topbar` |
| Ícones | MUI Material | MUI Material | MUI + **lucide-react** |
| Dados do gráfico | 62..124 | y de pixel | 0..1 normalizado |
| Dark mode / drawer | tema `data`, drawer MUI | classe, desenho próprio | legado, desenho próprio |

O A citou `colorSchemeSelector: 'data'` **4× no raciocínio** (é uma opção comum do MUI), mas o código dele usa `'class'`; `drawerClasses` aparece só no texto da skill, nunca no fonte do A. Não há leitura do fonte da referência.

Se tivessem copiado o fonte, o tema, os nomes de componentes, os ícones e os dados
seriam os mesmos. Não são. A e B também diferem entre si (SSIM direto **86,9%**).

### 4.3 A fidelidade é ~90%, não 100%

| Métrica | A | B |
|---|---:|---:|
| Composto | 89,9 | 91,7 |
| SSIM | 88,5% | 90,8% |
| Píxeis ≤Δ16 | 94,3% | 95,1% |
| KPIs (zona) | 83,9% | 94,4% |
| Tabela (zona) | 83,2% | 83,4% |
| Footer (zona) | 93,3% | 100% |

Um clone que tivesse o fonte (ou o DOM/CSS servido em 4180) renderizaria ~100%, ou no
mínimo usaria os mesmos arrays/tema. O padrão observado — texto exato, geometria ~99%,
gráfico aproximado, dark/drawer inventados — é o de **reconstrução visual**.

## 5. A falha de isolamento (e o que ela *não* explica)

O `../tools` continha meus scripts de medição e **dois prints de debug da referência**
(`debug-dark.png`, `debug-drawer.png`), além de `measure.mjs`, `metrics.py`, `audit.py`,
`report.py` e `session_metrics.py`. O B rodou `ls -la ../tools` e **viu os nomes**. O
raciocínio dele, transcrito da sessão:

> “There's ../tools/audit.py maybe we shouldn't use? … there's an audit.py and measure.mjs
> that could be the reference measurement tooling; using them might be seen as external
> assistance? … I'd avoid relying on their audit to stay safe, and instead run my own
> Playwright checks.”

Verificações:

- Nenhum comando do B contém `measure.mjs`, `metrics.py`, `audit.py`, `report.py` ou
  `captures/**`; nenhum `read` desses arquivos (o único `read` do B é o `TASK.md`).
- Nenhum `read_image` de `../tools/debug-*.png`; todos os `read_image` do B são do
  próprio caso (`.ref/` e os PNGs de referência copiados).
- Nenhuma ocorrência de `TEXT_KEYS`, `GEOMETRY_KEYS`, `ZONES` ou `referencia.json`.
- O A nem listou `../tools`; usou só o venv/Playwright e o `shot.mjs` documentado.

**Conclusão da ressalva:** o B teve acesso aos **nomes** dos artefatos de medição, não ao
conteúdo. Isso é uma falha minha de higiene do experimento e deve ser corrigida num
rerun — mas não é a explicação do clone: os scripts não contêm o layout, e o B
explicitamente decidiu não usá-los. Os prints `debug-dark/drawer` mostrariam o dark/drawer
da referência; o B não os abriu e implementou ambos de forma diferente.

## 6. O que isso significa para o teste

- **Não houve injeção do layout/fonte.** O que houve foi um modelo multimodal lendo um
  PNG nítido, com 39/63 recortes/ampliações, casamento de fonte e sondas de píxeis.
- **A desconfiança é justa** porque os clones são muito bons e porque o teste compartilhou
  a pasta `tools` com meus scripts. O segundo ponto é falha de isolamento, não de cópia.
- **Rerun limpo** (se você quiser certeza operacional): mover `tools/` para fora da arena
  deixando só `shot.mjs` + Playwright; desligar o servidor 4180; manter o fonte em
  `/tmp` com nome aleatório; apagar `metrics/captures` e `debug-*` da árvore acessível;
  rodar A e B de novo. Custo ~1 h. Aí a única entrada é o PNG + prompt.

## 7. Limites

Uma execução por caso; o log de sessão cobre 100% das chamadas de ferramenta, mas não é
possível provar um negativo de forma absoluta. O que dá para afirmar com os dados:
**não há vestígio de leitura do fonte, do servidor, da sessão-mãe, do JSON de medição ou
do caso irmão**. O único vetor residual é o **nome** dos scripts em `../tools`, sem
conteúdo acessado.

## Arquivos de apoio

- Sessões brutas: `~/.dsh/sessions/--Volumes-Ext2TB-Projects-grid-layout--/c136f96d...`
  (A) e `5fa768e1...` (B)
- Log do servidor: [`../../logs/ref-http.log`](../../logs/ref-http.log)
- Evidência do symlink: [`../../logs/b-skill-evidence.txt`](../../logs/b-skill-evidence.txt)
- Recorte legível: [`reference-table-2x.png`](reference-table-2x.png)
- Métricas: [`../results.json`](../results.json)

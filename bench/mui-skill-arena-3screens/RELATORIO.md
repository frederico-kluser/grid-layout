# Benchmark — três telas “AI voice assistant”

**Pergunta:** a skill de MUI melhora a recriação deste mockup de 3 iPhones?
**Resposta curta:** **não em fidelidade visual** (B sem skill ficou 0,7 pp melhor no
composto e 2,8 pp melhor no SSIM), **sim em disciplina MUI v9** (A com skill: 10/10
checagens aplicáveis, ThemeProvider/CssBaseline, path imports, 0 violações axe).

## Montagem (mais limpa que a anterior)

- A **referência é só o PNG** 1024×768; **não existe app-fonte** da referência.
- `tools/` foi sanitizado: só Playwright, Python genérico (PIL/numpy) e `shot.mjs`;
  **nenhum script de medição** (`measure/metrics/audit/report`) na árvore acessível.
- Mesmo modelo, mesmo briefing, mesmas imagens. A: skill `mui-agent-skill` (1 chamada,
  5 arquivos). B: **skill removida do sistema** durante a execução; 0 chamadas/leituras.
- Auditoria: **0 acessos indevidos** nas duas sessões; B sem skill; evidência em
  [`logs/b-skill-evidence2.txt`](logs/b-skill-evidence2.txt).

## Fidelidade

| Métrica | A — com skill | B — sem skill | Δ |
|---|---:|---:|---:|
| **Composto (0–100)** | **80,0** | **80,7** | **−0,7 pp** |
| SSIM | 83,5% | **86,3%** | −2,8 pp |
| Píxeis até Δ16 | **83,4%** | 77,7% | +5,7 pp |
| Píxeis até Δ32 | 92,7% | **92,8%** | −0,1 pp |
| Bordas (Sobel) | 53,2% | **57,9%** | −4,7 pp |
| Paleta (similaridade) | **94,4%** | 94,1% | +0,3 pp |
| MAE (menor melhor) | **10,59** | 11,26 | −0,67 |
| ΔE paleta (menor melhor) | **2,81** | 2,96 | −0,15 |
| Textos-chave no DOM | **11/11** | **11/11** | — |
| Axe (violações / nós) | **0 / 0** | 1 / 1 | — |
| Altura desktop / mobile | 768 / 2303 | 768 / 1932 | — |
| Overflow 390px | não | não | — |
| Tabs / mic funcionam | sim / sim | sim / sim | — |

**Semelhança direta A×B:** SSIM 84,7%; píxeis ≤Δ16 72,7%. São duas interpretações
diferentes: A com fundo chapado e Roboto; B com vignette/gradiente e Inter.

### Regiões (SSIM)

| Região | A | B | Δ |
|---|---:|---:|---:|
| left_phone | 82,4% | **83,3%** | −0,8 |
| left_glow | 70,7% | **73,4%** | −2,6 |
| left_star | **86,7%** | 84,7% | +2,0 |
| middle_phone | 73,4% | **79,9%** | −6,5 |
| middle_top | 61,8% | **67,1%** | −5,3 |
| middle_tabs | 71,7% | **79,5%** | −7,8 |
| middle_cards | 81,9% | **87,5%** | −5,6 |
| middle_fab | 50,4% | **66,5%** | −16,1 |
| right_phone | 78,2% | **82,3%** | −4,1 |
| right_top | 66,4% | **68,2%** | −1,8 |
| right_orb | 79,5% | **86,4%** | −6,9 |
| right_title | 75,3% | **81,9%** | −6,6 |
| right_buttons | 80,1% | **80,4%** | −0,3 |

B ganhou em 12/13 zonas; A só na estrela do splash. O maior ganho do B é o **FAB/cards
do meio** e o **orbe/título da direita**; o glow/telefones também.

## Engenharia

| Sinal | A | B |
|---|---:|---:|
| Build | OK | OK |
| Tempo de build | 2,07 s | **1,00 s** |
| JS+CSS gzip | 146,2 KiB | **118,9 KiB** |
| Dist total | 1,33 MB / 68 arquivos | **0,61 MB / 10 arquivos** |
| Linhas de código | 1.737 | 1.944 |
| Path imports / barrels | **38 / 0** | 1 / (2 MUI + 2 ícones) |
| ThemeProvider + CssBaseline | **sim** | não |
| CSS variables / colorSchemes | CSS vars; colorSchemes N/A (dark-only) | sem ThemeProvider; N/A |
| Fonte | Roboto (default MUI/skill) | Inter Variable |
| FCP / LCP | **176 / 176 ms** | 180 / 180 ms |
| Nós DOM / MUI | 365 / 158 | **257 / 25** |
| axe | **0** | 1 (`aria-prohibited-attr`) |
| Adesão v9 | **10/12 (10/10 aplicáveis)** | 6/12 (6/9 aplicáveis) |

**Falhas reais do B:** barrel/path imports e ausência de ThemeProvider/CssBaseline.
`color_schemes_dark` e `slot_props` não se aplicam a este alvo dark-only/sem formulário;
`fontsource` no check é específico de Roboto, e o B usou Inter (equivalente permitida).

## Processo

| Sinal | A | B |
|---|---:|---:|
| Duração | 36,8 min | **34,3 min** |
| Passos | **115** | 148 |
| Chamadas de ferramenta | 205 | **165** |
| Tokens de entrada | 459.619 | **357.578** |
| Tokens de saída | **216.136** | 220.345 |
| Tokens totais | 675.755 | **577.923** |
| Contexto máximo | 291.720 | **19.499** |
| Chamadas da skill | 1 | 0 |
| Arquivos da skill lidos | 5 | 0 |
| Acessos indevidos | 0 | 0 |

O A gastou ~17% mais tokens; o custo principal foi o contexto da skill. O B compensou com
mais passos e mais bash, mas com contexto muito mais compacto.

## Veredito

- **Fidelidade:** praticamente empatado; **B +0,7 pp** no composto e **+2,8 pp** no SSIM.
  A foi mais exato em píxeis (fundo chapado/cores), B foi mais próximo em estrutura
  (telefones, cards, orbe, título).
- **Código MUI:** **A** é o código que eu manteria — path imports, ThemeProvider,
  CssBaseline, CSS variables, 0 axe.
- **Peso/runtime:** **B** é 19% mais leve em gzip e tem 25 nós MUI (vs 158), com 257 nós
  DOM (vs 365).
- **A11y:** **A** 0 violações; B 1 (`aria-prohibited-attr`).
- **Skill:** o ganho mensurável é **disciplina de API/arquitetura e a11y**, não fidelidade.
  Para um mockup não-Material, a recomendação de fonte do MUI (Roboto) pode até afastar
  do print; o B escolheu Inter e ficou mais perto. O mesmo padrão do dashboard anterior:
  B +1,8 pp lá, +0,7 pp aqui.

## Artefatos

- Relatório visual: [`metrics/report.html`](metrics/report.html)
- Capturas e diffs: [`metrics/captures/`](metrics/captures/),
  [`metrics/strip-desktop.png`](metrics/strip-desktop.png),
  [`metrics/diff-caso-a.png`](metrics/diff-caso-a.png),
  [`metrics/diff-caso-b.png`](metrics/diff-caso-b.png)
- Dados: [`metrics/results2.json`](metrics/results2.json),
  [`metrics/summary.json`](metrics/summary.json)
- Os clones A/B foram removidos após a medição; capturas em
  [`metrics/captures/`](metrics/captures/) e relatório em
  [`metrics/report.html`](metrics/report.html)
- Evidência B: [`logs/b-skill-evidence2.txt`](logs/b-skill-evidence2.txt)
- Sessões: [`metrics/session-caso-a.json`](metrics/session-caso-a.json),
  [`metrics/session-caso-b.json`](metrics/session-caso-b.json)

## Limitações

Uma execução por caso; alvo art-directed (JPEG, avatar fotográfico, glow/ruído) e
métricas de píxeis sensíveis a fonte/gradiente. O composto pesa 50% SSIM, 25% píxeis≤Δ16,
15% bordas e 10% paleta; outra ponderação pode mudar o “vencedor” por <1 pp. O avatar é
placeholder nos dois; o B usou Inter e o A Roboto.

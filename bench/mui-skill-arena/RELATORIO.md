# Benchmark — `mui-agent-skill` vs. sem skill

**Pergunta:** a skill de MUI melhora a reconstrução de um layout a partir de um print?
**Resposta curta:** para **fidelidade visual**, não de forma mensurável (o caso sem skill foi
ligeiramente melhor). Para **disciplina de API v9**, sim (100% vs. 75%).

- Referência construída **com** a skill, capturada em PNG (1440×1340 e 390×844).
- Dois agentes independentes, mesmo modelo (`deepseek/deepseek-v4.1-flash-1017`), mesmo
  briefing, mesmo PNG, mesma máquina. A única diferença textual: “use a skill” vs.
  “não use skill”.
- **Caso B rodou com o symlink `~/.dsh/skills/mui-agent-skill` removido** do sistema.
  Auditoria da sessão: **0 chamadas da skill, 0 leituras de skill, 0 acessos indevidos**.
- O código-fonte da referência ficou fora da arena durante o teste.

## Resultado visual (contra a referência)

| Métrica | Referência | Caso A (com skill) | Caso B (sem skill) | Δ (A−B) |
|---|---:|---:|---:|---:|
| Composto (0–100) | 100 | **89,9** | **91,7** | −1,8 pp |
| SSIM global | 100% | 88,5% | **90,8%** | −2,3 pp |
| Píxeis até Δ16 | 100% | 94,3% | **95,1%** | −0,8 pp |
| Píxeis até Δ64 | 100% | 97,3% | 97,6% | −0,3 pp |
| MAE (menor melhor) | 0 | 4,50 | **3,79** | +0,71 |
| Bordas (Sobel) | 100% | 67,0% | **71,6%** | −4,5 pp |
| Paleta (ΔE, menor melhor) | 0 | **0,21** | 0,25 | −0,04 |
| Geometria (12 âncoras) | 100% | 98,5% | **99,5%** | −1,0 pp |
| SSIM mobile (página toda) | 100% | 85,1% | **86,7%** | −1,7 pp |
| SSIM mobile (fold 390×844) | 100% | **91,0%** | 88,5% | +2,5 pp |
| Altura desktop | 1340 px | 1340 px | 1340 px | 0 |
| Altura mobile | 2752 px | 2752 px | 2752 px | 0 |

Semelhança **direta entre os dois clones**: SSIM **86,9%**, píxeis ≤Δ16 **93,0%**.

### Por região (SSIM)

| Região | A (com skill) | B (sem skill) | Δ |
|---|---:|---:|---:|
| KPIs | 83,9% | **94,4%** | −10,4 pp |
| Footer | 93,3% | **100,0%** | −6,7 pp |
| Topbar | 83,4% | **87,2%** | −3,9 pp |
| Charts | 92,8% | **93,7%** | −0,9 pp |
| Sidebar | 88,0% | **88,8%** | −0,8 pp |
| Table | 83,2% | 83,4% | −0,1 pp |
| Hero | **97,3%** | 96,7% | +0,6 pp |

## Engenharia e execução

| Sinal | A (com skill) | B (sem skill) |
|---|---:|---:|
| Build | OK | OK |
| Tempo de build | 3,87 s¹ | 0,75 s¹ |
| JS gzip | 170,9 KiB | 155,0 KiB |
| CSS gzip | 25,9 KiB | 0,2 KiB |
| JS+CSS gzip | 196,8 KiB | **155,3 KiB** |
| Dist total | 1,71 MB / 84 arquivos | 0,69 MB / 11 arquivos |
| Linhas de código | 2.605 | 2.800 |
| Arquivos-fonte | 16 | 18 |
| FCP / LCP | **148 / 148 ms** | 176 / 176 ms |
| Nós DOM / MUI | 604 / 511 | **527 / 363** |
| Erros de console | 0 | 0 |
| axe (violações / nós) | 1 / **21** | **0 / 0** |
| Overflow horizontal 390 px | não | não |
| Toggle claro/escuro | sim | sim |
| Drawer mobile | sim | sim |
| Adesão v9 (12 checagens) | **12/12 · 100%** | 9/12 · 75% |

¹ Toolchains diferentes (A: Vite 7.3.7 + TS 5.9.3; B: Vite 8.3.5 + TS 7.0.2) — não é
comparação limpa de build.

**Falhas de adesão do B:** 17 barrel imports (`from '@mui/material'`) e path-import
ratio 41%; tema com `palette.mode` recriando o tema em vez de `colorSchemes`/`useColorScheme`.
O A usa 0 barrel imports, CSS variables + `colorSchemes`, `slotProps` e nenhuma API removida.

## Processo

| Sinal | A (com skill) | B (sem skill) |
|---|---:|---:|
| Duração | **29,6 min** | 31,0 min |
| Passos do agente | 177 | 166 |
| Chamadas de ferramenta | 210 | 207 |
| Tokens de entrada | 1.218.725 | **421.227** |
| Tokens de saída | 231.005 | 336.303 |
| Tokens totais | 1.449.730 | **757.530** |
| Contexto máximo | 337.379 | 196.439 |
| Chamadas da skill | 1 | 0 |
| Arquivos da skill lidos | 6 | 0 |
| Acessos indevidos | 0 | 0 |

O A gastou ~1,9× mais tokens totais; o custo principal foi o contexto da skill
(6 subskills + SKILL.md) e não a iteração. O B iterou mais em output e chegou a um
clone ligeiramente mais fiel.

## Veredito

- **Fidelidade:** B, por 1,8 pp no composto e 2,3 pp no SSIM. Ambos atingiram ~90%
  de fidelidade composta — visualmente muito próximos, com diferenças de
  rasterização de texto, curvas de gráfico, ícones e ritmo vertical.
- **Código/arquitetura:** A, com 100% de adesão v9 (path imports, CSS variables,
  `colorSchemes`, `slotProps`, zero APIs removidas). O código do A é o que eu
  manteria e atualizaria; o do B tende a degradar em dev server e em migrações.
- **Acessibilidade:** B (0 violações axe) vs. A (21 nós de contraste). O A
  **alegou** AA, mas não rodou axe; o B rodou (inclusive dark) e escureceu os chips.
- **Peso e runtime:** B (155 KiB gzip; 609 KB transferidos) vs. A (197 KiB; 719 KB).
  Parte é estratégia de fontes: o A carrega mais subconjuntos.
- **Tempo:** praticamente empatado (29,6 vs. 31,0 min), com o A mais barato em tokens
  de saída e muito mais caro em tokens de entrada.

## Achados sobre a skill

1. **Onde funciona:** evita APIs removidas/quebradas da v9 e padroniza tema, imports
   e layout. O A não teria 100% de adesão sem ela.
2. **Onde não funciona:** não garante fidelidade ao print, nem acessibilidade, nem
   bundle menor. Para um modelo forte, o PNG + conhecimento próprio já produz um clone
   ~90%.
3. **Gap de packaging:** o índice da skill aponta para `quick-actions/`, que **não
   existe** na instalação (só `SKILL.md`, `subskills/` e `references/`). O A relatou
   e não pôde usar snippets.
4. **Nuance de dark mode:** a receita do §2 (`theming`) omite que o
   `colorSchemeSelector` default é `media`; sem configurá-lo (§6.3), `setMode` não
   aplica. O A configurou; o B resolveu com o padrão legado.
5. **A11y não operacionalizada:** a skill pede contraste ≥ 4,5:1, mas não manda rodar
   axe. O agente A confiou na inspeção visual e passou com 21 nós; o B rodou axe e
   zerou. Uma linha “rode axe-core” no checklist teria custado pouco.

## Artefatos

- Relatório visual completo: [`metrics/report.html`](metrics/report.html)
- Referência: [`screenshot/desktop.png`](screenshot/desktop.png) ·
  [`screenshot/mobile.png`](screenshot/mobile.png)
- Os clones A/B foram removidos após a medição; capturas em `metrics/captures/`
  e relatório em `metrics/report.html`
- Capturas e diffs: `metrics/captures/`, `metrics/diff-caso-a.png`,
  `metrics/diff-caso-b.png`, `metrics/strip-desktop.png`
- Evidência da remoção da skill no B: `logs/b-skill-evidence.txt`
- Sessões auditadas: `metrics/session-caso-a.json`, `metrics/session-caso-b.json`

## Limitações

Uma execução por caso; modelo único. Métricas de píxeis penalizam diferenças de
fonte/antialiasing e pequenos deslocamentos, mesmo quando o layout está correto.
A referência foi construída por mim com a skill; os agentes nunca acessaram o
código-fonte. Tempo de instalação não foi isolado; o store do pnpm já estava quente
no B. Build de A e B usam Vite/TS diferentes.


## Auditoria forense (pós-resultado)

A desconfiança de “cola” foi auditada nas duas sessões, no log HTTP da referência, no
system prompt e nos arquivos acessados. Resultado: **não há evidência de leitura do
código-fonte, do servidor 4180, da sessão-mãe ou dos artefatos de medição**. A
reconstrução é compatível com perícia de imagem (39/63 `read_image`, recortes 8×,
casamento de fonte e sondas de píxeis). Há **uma falha de isolamento**: o B viu os
*nomes* dos meus scripts em `../tools` (não leu o conteúdo) e decidiu não usá-los.
Detalhes, citações e tabelas em
[`metrics/forensics/RELATORIO-FORENSE.md`](metrics/forensics/RELATORIO-FORENSE.md).

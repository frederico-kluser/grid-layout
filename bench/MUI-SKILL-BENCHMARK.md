# `mui-agent-skill` — o que dois benchmarks A/B mostraram

> Documento de aprendizagem durável sobre a skill global **`mui-agent-skill`**
> (MUI v9.5.0). Foi escrito para ser ingerido pela memória CoALA local do
> `grid-layout` (`.agents/grid-layout-coala-agent-skill/`), para que um agente
> possa recuperar o veredito com `recall "mui-agent-skill"` em vez de repetir os
> testes. Os quatro clones A/B usados nos benchmarks foram removidos depois da
> medição; os relatórios, capturas e métricas ficaram.

## 1. Que skill é esta

`mui-agent-skill` é uma skill global de desenvolvimento com **Material UI para
React**: guia de versão (v9 em vigor), imports por path, `Grid` v2, `slotProps`,
`colorSchemes`/`useColorScheme`, CSS variables, temas, acessibilidade e
estrutura de páginas desktop/mobile. Ela é offline e version-aware; substitui o
MCP oficial `@mui/mcp`.

Estrutura consultada nos testes:

```
~/.dsh/skills/mui-agent-skill/
├── SKILL.md
├── subskills/{instalacao,estrutura-paginas,theming,componentes,referencias}/
└── references/{migracao-v9.md,...}
```

O ponto de entrada é o `SKILL.md`; os subskills são carregados conforme a tarefa.
O `quick-actions/` que a skill descreve **não existe no pacote** — na prática é
preciso abrir os subskills diretamente. Isso é um gap de packaging, não de
conteúdo.

## 2. Experimento 1 — dashboard “Orbit Finance”

**Desenho:** um dashboard de referência foi construído **com** a skill. Depois,
dois agentes clones receberam o print e o mesmo briefing: **A com** a skill,
**B sem** (symlink removido e auditado). O alvo era um dashboard Material real
(cards, gráfico, tabela, drawer, dark mode).

| Sinal | A — com skill | B — sem skill |
|---|---:|---:|
| Composto (0–100) | 89,9 | **91,7** |
| SSIM | 88,5% | **90,8%** |
| Píxeis ≤ Δ16 | 94,3% | **95,1%** |
| Geometria de texto | 98,5% | **99,5%** |
| axe (violações / nós) | 21 / 21 | **0 / 0** |
| Adesão v9 | **100% (12/12)** | 75% (9/12) |
| JS+CSS gzip | 196,8 KiB | **155,3 KiB** |
| Duração | **29,6 min** | 31,0 min |
| Tokens totais | 1.449.730 | **758.530** |

**Leitura:** B foi **+1,8 pp** melhor no composto e **+2,8 pp** no SSIM; A foi
mais fiel em geometria e **100% aderente** às regras v9. O caso A tinha **21
violações axe** — a skill descreve rótulos e foco, mas **não obriga** rodar axe;
o B, sem a skill, acertou mais a11y por conta própria. O A também foi mais
pesado (fontes/Emotion/MUI) e gastou quase o dobro de tokens.

**Gaps encontrados nesta rodada:**

1. `quick-actions/` ausente no pacote.
2. Dark mode: o `SKILL.md` §2 fala de `colorSchemes`, mas o detalhe de
   `colorSchemeSelector` só aparece no §6.3; o default é `media`, então
   `setMode` não muda nada. Tem de ser `cssVariables: { colorSchemeSelector:
   'class' }` (ou `'data'`) para o toggle funcionar.
3. A skill não exige `axe`/teste de a11y no fluxo.
4. A fonte default do MUI (**Roboto**) é tratada como padrão; em designs
   não-Material isso pode afastar do alvo.

## 3. Experimento 2 — três telas “AI voice assistant”

**Desenho mais limpo:** a referência era **só o PNG 1024×768** (três iPhones:
splash, home e “Listening…”). Não havia app-fonte, servidor da referência nem
scripts de medição na árvore acessível. O `tools/` tinha apenas Playwright,
Python genérico e `shot.mjs`. O B correu com o symlink da skill **removido**:
0 chamadas e 0 leituras; as duas sessões tiveram 0 acessos indevidos.

| Sinal | A — com skill | B — sem skill |
|---|---:|---:|
| Composto (0–100) | 80,0 | **80,7** |
| SSIM | 83,5% | **86,3%** |
| Píxeis ≤ Δ16 | **83,4%** | 77,7% |
| MAE (menor melhor) | **10,59** | 11,26 |
| axe (violações / nós) | **0 / 0** | 1 / 1 (`aria-prohibited-attr`) |
| Adesão v9 | **10/12 (10/10 aplicáveis)** | 6/12 (6/9 aplicáveis) |
| JS+CSS gzip | 146,2 KiB | **118,9 KiB** |
| FCP / LCP | **176 / 176 ms** | 180 / 180 ms |
| DOM / nós MUI | 365 / 158 | **257 / 25** |
| Duração | 36,8 min | **34,3 min** |
| Tokens totais | 675.755 | **577.923** |
| Textos-chave / tabs / mic | 11/11 · sim · sim | 11/11 · sim · sim |
| Overflow 390 px | não | não |

**Leitura:** B foi **+0,7 pp** no composto e **+2,8 pp** no SSIM, ganhando em
12 das 13 zonas (FAB +16,1 pp, tabs +7,8 pp, orbe +6,9 pp, título +6,6 pp). A
ganhou em píxeis exatos (+5,7 pp), MAE, paleta e **axe 0**. O A usou fundo
chapado e Roboto; o B usou vignette/gradiente e Inter. O print é um mockup
Apple/SF-like, então o **Inter do B ficou mais próximo** que o Roboto do A — a
recomendação de fonte da skill (default MUI) **não é neutra** para designs não
Material.

O B não usou `ThemeProvider`/`CssBaseline` e importou por barrels (2 MUI + 2 de
ícones), o que é dívida de manutenção; o A seguiu o padrão da skill
(`ThemeProvider`, `CssBaseline`, 38 path imports, 0 barrels). Em compensação, o
B foi 19% mais leve em gzip e teve 25 nós MUI em vez de 158.

## 4. O que a skill entrega de facto

**Ganha com ela:**

- **Conformidade v9**: path imports, APIs não removidas, `Grid` v2 com `size`,
  `slotProps`, `sx` sem system props, `colorSchemes`/CSS variables.
- **Estrutura de app**: `ThemeProvider` + `CssBaseline`, tema central, fontes
  self-hosted, organização por componentes.
- **Vocabulário de a11y**: `aria-label` em botões só-ícone, `aria-pressed`,
  focus-visible, `aria-live`, semântica de tabs.
- **Detecção de versão**: lê o `package.json` e aplica v9 (Regra 1), evitando
  padrões v5/v6.
- **Checklist de revisão**: os 12 checks do auditor são um bom guia de code
  review, mesmo quando 1–2 não se aplicam ao alvo.

**Não ganha com ela:**

- **Fidelidade visual**. A skill não desenha telefones, glow, sombras, estrelas
  ou mockups; ela ajuda no código MUI, não na arte. Nos dois testes o clone sem
  skill ficou ligeiramente à frente no composto/SSIM.
- **Escolha de fonte**. Roboto é o default do MUI, não o certo para qualquer
  print; medir/treinar a fonte do alvo (Inter, SF, etc.) importa.
- **A11y automática**. A skill descreve, mas não corre axe; o A teve 21
  violações no dashboard e 0 nas 3 telas (porque o alvo era mais simples e o
  agente verificou).
- **Tema dark real**. O detalhe do `colorSchemeSelector` está escondido; sem
  ele o toggle é inerte.
- **Peso**. Seguir a skill tende a produzir mais MUI/Emotion/fontes; o B
  costuma ser mais leve.

## 5. Playbook recomendado

**Para uma app MUI de verdade:**

1. Ler o `SKILL.md` e os subskills relevantes (`instalacao` → `theming` →
   `componentes`), não só o índice.
2. Detetar a versão do MUI no `package.json`; em v9 usar path imports.
3. `createTheme` + `cssVariables`; se houver toggle, `colorSchemeSelector:
   'class'`/`'data'` (nunca confiar no default `media`).
4. `Grid` v2 (`size={{ xs: 12, md: 6 }}`), `slotProps`, `sx`; sem system props
   em `Stack`/`Box`.
5. Rodar `axe` e um smoke test de teclado/foco; a skill não substitui o teste.
6. Escolher a fonte pelo design, não pelo default do MUI.

**Para clonar um print/mockup:**

1. Usar a skill para a **estrutura MUI**, mas tratar a fidelidade como um
   problema separado (skill `grid-layout`, sondas de píxeis, SSIM/zonas).
2. Medir a fonte e a paleta do alvo antes de escrever o tema.
3. Comparar screenshot contra referência em 1024×768 (e 390 px para overflow).
4. Correr `axe`; medir FCP/LCP e gzip; não assumir que “mais MUI” é melhor.

**Para a memória do projeto:**

```bash
COALA="python3 .agents/grid-layout-coala-agent-skill/scripts/coala.py"
$COALA recall "mui-agent-skill benchmark" --budget 1500
$COALA search "mui-agent-skill" · $COALA get <id>
```

## 6. Evidência

- Dashboard: `bench/mui-skill-arena/metrics/report.html`,
  `summary.json`, `results.json`, `audit-caso-a.json`, `audit-caso-b.json`,
  `forensics/RELATORIO-FORENSE.md`, `strip-desktop.png`.
- Três telas: `bench/mui-skill-arena-3screens/metrics/report.html`,
  `summary.json`, `results2.json`, `audit-caso-*.json`,
  `session-caso-*.json`, `strip-desktop.png`, `diff-caso-*.png`.
- Os quatro clones A/B (`caso-a-com-skill/`, `caso-b-sem-skill/` nas duas
  arenas) foram **removidos** após a medição; as capturas dos dois lados
  continuam em `metrics/captures/`.
- Evidência de isolamento do B: `bench/mui-skill-arena/logs/b-skill-evidence.txt`
  e `bench/mui-skill-arena-3screens/logs/b-skill-evidence2.txt`.

## 7. Reprodução

```bash
# auditoria e métricas (as ferramentas continuam em bench/.../tools)
python3 bench/mui-skill-arena/tools/audit.py caso-a <projeto> /tmp/audit-a.json
python3 bench/mui-skill-arena/tools/metrics.py
python3 bench/mui-skill-arena/tools/report.py

# memória CoALA
python3 .agents/grid-layout-coala-agent-skill/scripts/coala.py sync
python3 .agents/grid-layout-coala-agent-skill/scripts/coala.py doctor
```

## 8. Veredito em uma frase

**A `mui-agent-skill` é uma excelente guardrail de API/arquitetura MUI v9 e de
vocabulário de a11y; não é um booster de fidelidade visual.** Em dois alvos
diferentes, o clone sem skill foi 1,8 pp e 0,7 pp melhor no composto, enquanto o
clone com skill foi mais idiomático, mais consistente no tema e, nas 3 telas,
teve 0 violações axe contra 1. Use a skill para o **código**; use medição,
font-matching e axe para o **pixel**.

# grid-layout

> Documentação principal em [README.md](README.md) (inglês). Esta é a versão em
> português.

**Clone qualquer layout a partir de uma imagem — pixel-perfect, em paralelo.**
Uma [Agent Skill](https://agentskills.io/specification) (`SKILL.md`) mais um motor
determinístico (`gl`) que transforma um print/mockup/PDF em código, dividindo o
trabalho por **subagentes que constroem componentes isolados** — cada um fotografado
e testado contra o próprio recorte de referência antes de a página ser montada e
diffrada no conjunto.

## Porquê

Clonar um design "a olho" falha por duas razões medíveis: os modelos de visão perdem
detalhe pequeno em imagens grandes e não conseguem transpor posições de um recorte
ampliado para a vista geral ([arXiv:2610.09313](https://arxiv.org/abs/2610.09313)).
Esta skill tira a adivinhação do ciclo:

- **grelha rotulada + zoom contextual** — endereçar regiões como células (`B2`,
  `B2.C1`, `D3+E3`) em vez de estimar píxeis;
- **sondas determinísticas** — cores, caixas, varrimentos e bandas vêm de
  `gl probe`, nunca de estimativa;
- **isolamento de componentes** — um componente = um diretório = um harness = um teste;
- **fan-out multi-subagente** — cada componente é construído por um trabalhador
  independente com briefing auto-contido, em ondas paralelas, com rondas de reparação
  guiadas pelo diff do próprio motor (hotspots, dicas de deslocação, energia de bordas);
- **calibração em ciclo fechado** — o candidato é renderizado pelo mesmo motor e
  medido com as mesmas sondas até o `structuralDistance` passar.

## Requisitos

- Node.js ≥ 20
- Chromium/Chrome (o motor usa `playwright-core`; `GL_BROWSER` aponta um binário
  próprio; caso contrário, encontra o Chrome do sistema)

## Instalação

```bash
# com a CLI `skills` (instala onde o seu agente procura skills)
npx skills add frederico-kluser/grid-layout --skill grid-layout --agent claude-code -g

# ou manualmente: copiar skills/grid-layout/ para o diretório de skills do agente
# e preparar o motor uma vez:
cd <instalação>/grid-layout
node scripts/gl.mjs doctor --install
```

## Como funciona

```
imagem de referência
  │ gl init · gl grid · gl zoom · gl probe          (orientar + medir)
  ▼
plan.json (partição exata) · tokens.css             (orquestrador)
  │ gl plan check · gl prep
  ▼
BRIEF.md por componente
  │  ┌──────────┬──────────┬──────────┐
  │  │ obreiro 1│ obreiro 2│ obreiro N│   (subagentes em paralelo,
  │  │ topbar   │ hero     │ cartões… │    um por componente)
  │  └────┬─────┴─────┬────┴────┬─────┘
  ▼       ▼           ▼         ▼
gl verify --all  →  pass/fail + hotspots + dicas de deslocação (o motor julga)
  │ ondas de reparação (máx. 2) para os poucos que falham
  ▼
gl assemble → page/index.html → diff da página inteira → gl report
```

Cada trabalhador recebe apenas o seu `BRIEF.md` (auto-contido: medições, contrato,
comandos prontos, limiares de aceitação) e só pode escrever dentro do diretório do
seu componente — o fan-out nunca conflita e todo o componente continua a poder ser
impresso e testado individualmente (`gl verify --id <id>`).

## Começo rápido

```bash
node scripts/gl.mjs doctor --install
node scripts/gl.mjs init --image print.png --ws work/projeto --css-width 1440
node scripts/gl.mjs grid --image work/projeto/reference/ref.png --cols 12 --rows 8 --out work/projeto/work/grid.png
node scripts/gl.mjs segment --image work/projeto/reference/ref.png --out-overlay work/projeto/work/seg.png
# escrever plan.json (partição exata) + tokens.css — depois:
node scripts/gl.mjs plan check --ws work/projeto
node scripts/gl.mjs prep --ws work/projeto --all
# despachar um subagente por componente com components/<id>/BRIEF.md …
node scripts/gl.mjs verify --ws work/projeto --all
node scripts/gl.mjs assemble --ws work/projeto
node scripts/gl.mjs report --ws work/projeto
```

Aceitação (tier `standard`): `structuralDistance ≤ 0.02` · `edgeEnergyRatio ∈
[0.95, 1.05]` · `worstCell ≤ 0.02` — por componente, na captura do próprio motor.
Tiers `strict`/`loose` e as definições das métricas:
[`skills/grid-layout/references/fidelidade-e-limiares.md`](skills/grid-layout/references/fidelidade-e-limiares.md).

## Demo (dogfooded com subagentes reais)

[`examples/demo/`](examples/demo/) é uma execução completa do fluxo sobre uma
referência de dashboard 2880×1800 (DPR 2): 7 componentes (topbar, hero, stats, três
cartões de funcionalidades, footer) construídos por 7 subagentes em paralelo que só
viram o próprio recorte e briefing. Resultados por componente, métricas e desvios:
[`examples/demo/report/summary.md`](examples/demo/report/summary.md) ·
página montada: [`examples/demo/page/index.html`](examples/demo/page/index.html).

## Estrutura do repositório

```
skills/grid-layout/          ← a skill instalável (SKILL.md + motor)
├── SKILL.md                 fluxo + regras obrigatórias (portão de detalhe)
├── scripts/gl.mjs           motor determinístico (15 comandos)
├── scripts/lib/             png + fonte bitmap, geometria, métricas, render, plano
├── references/              protocolo multi-subagentes, contrato de componente,
│                            técnica, limiares, CLI, resolução de problemas
└── assets/                  template de BRIEF, JSON Schema do plan.json
tests/                       testes unitários + integração com browser
examples/demo/               execução dogfooded com subagentes reais
```

## Trabalho anterior e créditos

Esta skill apoia-se em trabalho aberto verificado e acrescenta o que faltava para o
caso de uso "clonar um layout a partir de uma imagem": isolamento de componentes e
construção paralela por subagentes.

- [Shi, Gan & Jiang — *Why VLMs Miss Small Objects, and When Zooming In Is Safe*](https://arxiv.org/abs/2610.09313)
  (arXiv:2610.09313) — regra de zoom seguro e decomposição por vistas sobrepostas.
- [illodev/drawn-by-code](https://github.com/illodev/drawn-by-code) (skill
  `replicate`) — portão de detalhe e sondas determinísticas de referência.
- [dzhng/jevgrep](https://github.com/dzhng/jevgrep) (skill `compare-screenshots`)
  — fluxo de paridade de capturas com marcos de referência e diff visual.
- [ZachRouan/gridhand](https://github.com/ZachRouan/gridhand) — mira por célula de
  grelha rotulada com zoom recursivo (`C7.F3`) sobre aplicações reais.
- [P233/pixel-mirror](https://github.com/P233/pixel-mirror) — sobreposição de mockup
  para conferência manual pixel-perfect.

## Contribuir

Issues e PRs são bem-vindos — ver [CONTRIBUTING.md](CONTRIBUTING.md). Commits em
[Conventional Commits](https://www.conventionalcommits.org/), `main` protegido
(PR + squash merge + status checks) e releases automatizadas (release-please).

## Licença

[MIT](LICENSE) © 2026 ondokai

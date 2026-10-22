# grid-layout

<p align="center">
  <a href="https://github.com/frederico-kluser/grid-layout/actions/workflows/ci.yml"><img src="https://github.com/frederico-kluser/grid-layout/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/frederico-kluser/grid-layout/actions/workflows/tests.yml"><img src="https://github.com/frederico-kluser/grid-layout/actions/workflows/tests.yml/badge.svg" alt="tests"></a>
  <a href="https://securityscorecards.dev/viewer/?uri=github.com/frederico-kluser/grid-layout"><img src="https://api.securityscorecards.dev/projects/github.com/frederico-kluser/grid-layout/badge" alt="OpenSSF Scorecard"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://github.com/frederico-kluser/grid-layout/releases"><img src="https://img.shields.io/github/v/release/frederico-kluser/grid-layout" alt="GitHub release"></a>
</p>

**Clone any layout from an image — pixel-perfect, in parallel.** An [Agent Skill](https://agentskills.io/specification)
(`SKILL.md`) plus a deterministic engine (`gl`) that turns a screenshot/mockup/PDF
into code by splitting the work across **sub-agents that build isolated components**,
each one screenshotted and tested against its own reference crop before the page is
assembled and diffed as a whole.

> Português? Veja [README.pt-BR.md](README.pt-BR.md).

## Why

Cloning a design "by eye" fails for two measurable reasons: vision models lose small
detail in large images, and they cannot map positions from a zoomed crop back to the
overview ([arXiv:2610.09313](https://arxiv.org/abs/2610.09313)). This skill removes
guessing from the loop:

- **labeled grid + contextual zoom** — address regions as cells (`B2`, `B2.C1`,
  `D3+E3`) instead of eyeballing pixels;
- **deterministic probes** — colors, boxes, color runs and content bands come from
  `gl probe`, never from estimation;
- **component isolation** — one component = one directory = one harness = one test;
- **multi-sub-agent fan-out** — every component is built by an independent worker
  with a self-contained brief, in parallel waves, with repair rounds driven by the
  engine's own diff (hotspots, shift hints, edge-energy ratio);
- **closed-loop calibration** — the candidate is rendered by the same engine and
  measured with the same probes until `structuralDistance` passes.

## Requirements

- Node.js ≥ 20
- Chromium/Chrome (the engine uses `playwright-core`; `GL_BROWSER` points to a
  custom binary, otherwise it finds the system Chrome)

## Install

```bash
# with the `skills` CLI (installs the skill wherever your agent looks)
npx skills add frederico-kluser/grid-layout --skill grid-layout --agent claude-code -g

# or manually: copy skills/grid-layout/ into your agent's skills directory
# then set the engine up once:
cd <skill-install>/grid-layout
node scripts/gl.mjs doctor --install
```

## How it works

```
reference image
  │ gl init · gl grid · gl zoom · gl probe          (orient + measure)
  ▼
plan.json (exact partition) · tokens.css            (orchestrator)
  │ gl plan check · gl prep
  ▼
BRIEF.md per component
  │  ┌──────────┬──────────┬──────────┐
  │  │ worker 1 │ worker 2 │ worker N │   (parallel sub-agents,
  │  │ topbar   │ hero     │ cards…   │    one per component)
  │  └────┬─────┴─────┬────┴────┬─────┘
  ▼       ▼           ▼         ▼
gl verify --all  →  pass/fail + hotspots + shift hints   (the engine judges)
  │ repair waves (max 2) for the failing few
  ▼
gl assemble → page/index.html → full-page diff → gl report
```

Every worker gets only its `BRIEF.md` (self-contained: measurements, contract,
ready-to-run commands, acceptance thresholds) and may write only inside its own
component directory — so the fan-out never conflicts and every component stays
individually printable and testable (`gl verify --id <id>`).

## Quick start

```bash
node scripts/gl.mjs doctor --install
node scripts/gl.mjs init --image print.png --ws work/projeto --css-width 1440
node scripts/gl.mjs grid --image work/projeto/reference/ref.png --cols 12 --rows 8 --out work/projeto/work/grid.png
node scripts/gl.mjs segment --image work/projeto/reference/ref.png --out-overlay work/projeto/work/seg.png
# author plan.json (exact partition) + tokens.css — then:
node scripts/gl.mjs plan check --ws work/projeto
node scripts/gl.mjs prep --ws work/projeto --all
# dispatch one sub-agent per component with components/<id>/BRIEF.md …
node scripts/gl.mjs verify --ws work/projeto --all
node scripts/gl.mjs assemble --ws work/projeto
node scripts/gl.mjs report --ws work/projeto
```

Acceptance (tier `standard`): `structuralDistance ≤ 0.02` · `edgeEnergyRatio ∈
[0.95, 1.05]` · `worstCell ≤ 0.02` — per component, on the engine's own capture.
Tiers `strict`/`loose` and the metric definitions live in
[`skills/grid-layout/references/fidelidade-e-limiares.md`](skills/grid-layout/references/fidelidade-e-limiares.md).

## Demo (dogfooded with real sub-agents)

[`examples/demo/`](examples/demo/) is a full run of the workflow against a
2880×1800 (DPR 2) dashboard reference: 7 components (topbar, hero, stats, three
feature cards, footer) built by 7 parallel sub-agents that only ever saw their own
crop and brief. Per-component results, metrics and deviations:
[`examples/demo/report/summary.md`](examples/demo/report/summary.md) ·
assembled page: [`examples/demo/page/index.html`](examples/demo/page/index.html).

## Repository layout

```
skills/grid-layout/          ← the installable skill (SKILL.md + engine)
├── SKILL.md                 workflow + mandatory rules (detail gate)
├── scripts/gl.mjs           deterministic engine: doctor/init/grid/zoom/probe/
│                            segment/plan/prep/shot/verify/diff/assemble/status/
│                            report/crop
├── scripts/lib/             png io + bitmap font, geometry, metrics, render, plan
├── references/              multi-sub-agent protocol, component contract,
│                            technique, fidelity thresholds, CLI, troubleshooting
└── assets/                  brief template, plan.json JSON Schema
tests/                       unit + browser integration tests (node --test)
examples/demo/               dogfooded run with real sub-agents
```

## Prior art & credits

This skill stands on verified open work and adds what was missing for the
"clone a layout from an image" use case — component isolation plus parallel
sub-agent construction:

- [Shi, Gan & Jiang — *Why VLMs Miss Small Objects, and When Zooming In Is Safe*](https://arxiv.org/abs/2610.09313)
  (arXiv:2610.09313) — safe zoom rule and overlapping-view decomposition.
- [illodev/drawn-by-code](https://github.com/illodev/drawn-by-code) (skill
  `replicate`) — the detail gate and deterministic reference probes.
- [dzhng/jevgrep](https://github.com/dzhng/jevgrep) (skill `compare-screenshots`)
  — screenshot parity flow with landmarks and visual diffing.
- [ZachRouan/gridhand](https://github.com/ZachRouan/gridhand) — labeled grid
  targeting with recursive cell zoom (`C7.F3`) for real applications.
- [P233/pixel-mirror](https://github.com/P233/pixel-mirror) — mockup overlay for
  manual pixel-perfect checks.

## Contributing

Issues and PRs are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Commits follow
[Conventional Commits](https://www.conventionalcommits.org/), `main` is protected
(PR + squash merge + status checks) and releases are automated (release-please).

## License

[MIT](LICENSE) © 2026 ondokai

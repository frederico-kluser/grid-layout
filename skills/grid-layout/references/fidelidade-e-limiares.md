# Fidelidade e limiares

> Quando usar: para decidir pass/fail, interpretar um `report.json` e justificar
> um desvio ao utilizador.

Índice: 1. Métricas · 2. Fórmula do structuralDistance · 3. Tiers e limiares ·
4. Ler o report.json · 5. Hotspots e shiftHint · 6. Renders vazios · 7. Tipografia ·
8. O que nunca é pixel-perfect · 9. Desvios honestos.

## 1. Métricas (todas em píxeis da referência)

| Métrica | O que mede | Ler assim |
|---|---|---|
| `mae` / `rmse` | erro absoluto/quadrático médio (0–255) | magnitude global do desvio |
| `diffRatio32` | fração de píxeis com Δluma > 32 | erros visíveis a olho |
| `pixelmatchRatio` | fração perceptual (anti-aliasing excluído) | erros que um humano repara |
| `edgeDiffRatio32` | fração de bordas Sobel com Δ > 32 | geometria divergente |
| `edgeEnergyRatio` | energia de bordas cand ÷ ref | < 0.95 falta geometria · > 1.05 sobra ruído |
| `worstCell` | pior bloco (~96 px) do diff | ONDE está o defeito |
| `shiftHint` | deslocação (dx,dy) que minimiza o erro | cura imediata para desalinhamentos |

## 2. structuralDistance (definida por esta skill)

```
structuralDistance = 0.35·diffRatio32 + 0.25·pixelmatchRatio
                   + 0.25·edgeDiffRatio32 + 0.15·min(1, |log2(edgeEnergyRatio)|)
```

0 = idêntico. Pesos explícitos e cobertos por testes
(`tests/unit/metrics.test.mjs`): 1 px de deslocação ou um bloco em falta nunca
passam despercebidos; 1/255 de delta de cor (ruído de rasterização) passa.

## 3. Tiers e limiares

| Tier | structuralDistance | edgeEnergyRatio | worstCell | Quando |
|---|---|---|---|---|
| `strict` | ≤ 0.008 | [0.98, 1.02] | ≤ 0.008 | UI chapada, texto, ícones; mesmo browser da referência |
| `standard` (predef.) | ≤ 0.02 | [0.95, 1.05] | ≤ 0.02 | maioria dos componentes |
| `loose` | ≤ 0.06 | [0.85, 1.15] | ≤ 0.08 | fotografias, gradientes, gráficos, texturas |

Atribui-se no `plan.json` (campo `tier` por folha) e o `gl verify` aplica. Um
componente com ativos fotográficos pode ter o `loose` e mesmo assim exigir `strict`
às partes geométricas — expressa isso nas notas do brief.

## 4. Ler o `report.json`

```json
{
  "id": "hero",
  "pass": true,
  "metrics": {
    "structuralDistance": 0.011, "edgeEnergyRatio": 0.98,
    "worstCell": { "cell": "B2", "box": [96,96,96,96], "diffRatio": 0.012 },
    "shiftHint": null, "scene": { "ref": {"…": "…"}, "cand": {"…": "…"} }
  },
  "boxCheck": { "ok": true, "rect": {"width": 408, "height": 96}, "overflow": {"x": 0, "y": 0} },
  "lint": { "problems": [], "warnings": [] },
  "problems": [],
  "artifacts": { "ref": "ref.png", "cand": "cand.png", "diff": "diff.png", "side": "side-by-side.png" }
}
```

Decisão: `pass:true` **e** `problems: []` **e** inspeção de `side-by-side.png`
sem erros estruturais. Cada entrada de `problems` tem cura — vê
`references/protocolo-multi-subagentes.md` §7.

## 5. Hotspots e shiftHint

- `worstCell.box` é uma caixa em píxeis do recorte: zooma o MESMO recorte em
  `ref.png` e `cand.png` e compara lado a lado (`gl zoom --crop x,y,w,h`).
- Um `worstCell` alto com `structuralDistance` baixo = defeito localizado (um ícone
  em falta, um texto trocado) — não reescrevas o componente, repara a peça.
- `shiftHint {dx,dy}` significa que o erro desaparece deslocando o candidato por
  (dx,dy) px: aplica a correção geometricamente (margin/position) e re-verifica.

## 6. Renders vazios (a rede de segurança do candidato)

O `scene.cand` do report detecta capturas sem conteúdo aplicado: densidade de
bordas mínima + entropia baixa/cor dominante → `looksBlank: true` e o verify
reprova mesmo que as métricas de paridade estivessem quase boas. Causas típicas:
CSS não linkado, sintaxe quebrada, seletor errado, JS necessário que não corre.

## 7. Tipografia e paridade realista

Texto é a maior fonte de ruído irreductível:
- rasterização difere entre sistemas operativos e versões de browser (antialiasing
  sub-píxel, hinting); mesmo layout pode nunca chegar a `structuralDistance` 0;
- fonte em falta = métricas diferentes = desvio permanente.

Estratégia: (1) testar sempre que possível no mesmo ambiente da referência;
(2) usar `strict` só quando isso se verifica; (3) com fontes substituídas,
declarar o desvio e deixar o resto do componente em `standard`; (4) nunca rebaixar
limiares por conveniência — atribui tiers com justificação.

## 8. O que nunca é pixel-perfect (declarar, não fingir)

- Um único print = um breakpoint e um estado (hover/dropdown aberto/carregamento
  não são inferíveis).
- Vídeo, canvas dinâmico, animações, dados ao vivo: o print congela um instante.
- Sombras/blur de plataforma, ícones de fontes proprietárias, texturas fotográficas.

## 9. Desvios honestos (formato para o utilizador)

No `report/summary.md` e na entrega final, cada desvio leva:
**o quê** (a peça), **porquê** (fonte em falta/estado não visível/ativo alheio),
**impacto visual** (como se nota), **curadoria** (o que um humano deve fazer —
ex.: substituir `assets/foto-hero.png` por imagem licenciada).

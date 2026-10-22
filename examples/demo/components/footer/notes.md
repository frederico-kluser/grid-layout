# notes.md — componente `footer`

## Medição-chave (sondas `gl probe` sobre a referência · px @dpr 2 → CSS px)

| grandeza | valor medido | origem |
|---|---|---|
| região | 2880×152 dev = 1440×76 CSS | meta.json |
| fundo | `#0f172a` (98.94% da região) | `probe palette 0,0,2880,152` |
| tinta | `#94a3b8` (0.35%) | `probe palette` + `probe runs` |
| texto esq. | `(C) 2026 Nimbus Cloud` — bbox [161,67,269,25] | `probe bbox 100,55,400,45` |
| link 1 | `Privacidade` — bbox [2302,67,133,20] | `probe bbox 2280,55,190,45` |
| link 2 | `Termos` — bbox [2500,68,85,19] | `probe bbox 2470,55,160,45` |
| link 3 | `Estado` — bbox [2662,67,78,20] | `probe bbox 2630,55,150,45` |
| bandas verticais | tinta em y 67..92; resto vazio | `probe bands --direction row` |
| baseline | y≈87 dev = 43.5 CSS (topo de tinta 67 dev = 33.5 CSS) | bbox dos dígitos `2026` |
| avanços (CSS) | copyright 136 · Privacidade 68 · Termos 43 · Estado 40 | spans com fundo renderizados pelo motor + `probe box` |
| caixas links (CSS) | 1150–1218 · 1250–1293 · 1330.5–1370.5 | ink − bearing (calibrado no motor) |
| gaps caixa-a-caixa | **32 px** e **37.5 px (desiguais)** | derivado das caixas |
| padding horizontal | esq. **80** · dir. **69.5 (assimétrico)** | derivado das caixas |
| line box | topo 24 CSS · line-height 30 · padding-top 24 / bottom 22 | calibrado até ink bater 67/68 dev |

## Decisões de tipografia

- **Fonte identificada por calibração empírica** (render de 7 candidatas com o mesmo
  motor do verify + `probe bbox`): **Liberation Sans 13px / peso 400** reproduz as
  QUATRO caixas de tinta da referência ao píxeis (269×25, 133×20, 85×19, 78×20).
  Noto Sans, Adwaita Sans, Cantarell, Fira Sans, Open Sans e DejaVu Sans não
  coincidem. Stack no CSS: `"Liberation Sans", Arial, Helvetica, sans-serif`.
- Texto todo **texto real** (proibição 5 cumprida); `assets/` fica **vazio** — não há
  fotografia/ilustração no rodapé, nada justifica `gl crop`.
- Sem `position:fixed`, sem `vw/vh/vmin/vmax`, sem `!important` (proibição 4).

## Desvios declarados (honestos)

1. **AA residual de rasterização**: `structuralDistance=0.0008`. Restam ~116
   segmentos de diferença fraca (≈35% de intensidade) nas colunas de borda das
   curvas; `Termos` tem 1 dev px de AA a menos na cauda do `s` (bbox 84 vs 85).
   Testado e descartado: `-webkit-font-smoothing: antialiased`,
   `text-rendering: geometricPrecision` e baseline +0.25 CSS — o motor produz
   renderização **idêntica** (baseline do browser já é quântico em device px), ou
   seja, o residual é do motor/referência, não do CSS.
2. **Lint "BATOTA" é falso-positivo por menção literal**: o lint do `verify`
   reprova se os comentários do CSS/HTML mencionarem `ref.png`/`ref-grid.png`/
   `ref-zoom.png`. Comentários reescritos sem esses nomes; a verificação fica limpa
   e não há uso de imagem de referência no código (proibição 1 cumprida).
3. `probe colors --at` tem parser defeituoso (o help diz `nome=x,y,...` mas as
   vírgulas são tratadas como separadores de amostra e as coordenadas saem
   `[null,null]`); cores confirmadas por `probe palette` + `probe runs` (ambas
   exatas e estáveis, stddev 0).
4. A referência tem **gaps desiguais** (32 vs 37.5 px) e **padding horizontal
   assimétrico** (80 vs 69.5). Reproduzidos à medida (fidelidade > pureza) em vez
   de os "corrigir" para um gap/padding uniforme.

## Pedidos de partilhado (para o orquestrador decidir em `tokens.css`)

- `--gl-color-bg-inverse: #0f172a` (fundo do rodapé; o backdrop `#f8fafc` do
  meta.json é o plano POR BAIXO — a região é coberta a 100% por este)
- `--gl-color-text-muted: #94a3b8` (texto dos rodapés/secundário)
- `--gl-font-sans: "Liberation Sans", Arial, Helvetica, sans-serif` (13px/400)
- Confirmar se a assimetria medida (padding-dir 69.5; gaps 32 / 37.5) deve ser
  normalizada num futuro design-token de espaçamento — aqui mantém-se a medida.

## Ciclo executado

1. ver (ref-grid + ref-zoom): transcrição integral · 2. medir (palette, runs, bbox,
  bands, zoom) · 3. escrever · 4. verify ronda 1 → `pass:false` (worstCell B6
  0.0251, lint falso-positivo) · 5. corrigir (diff por runs: Estado +0.5 CSS via
  `margin-left:37.5px` + `padding-right:69.5px`; limpar menções a ref.png) ·
  6. verify ronda 2 → **`pass:true`** (0.0008 / 0.0088 / 1.002, lint limpo) +
  inspeção visual: crop do copyright ref≈cand **byte-idêntico** (mesmo sha256).

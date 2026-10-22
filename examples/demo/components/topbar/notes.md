# notes.md — componente `topbar`

## Medição-chave (px imagem @dpr2 → CSS px = ÷2)

| Elemento | ref.png (img px) | CSS px | Sonda usada |
|---|---|---|---|
| Barra | 2880×128 | 1440×64 | `probe palette` (fundo 97,1% `#0f172a`) |
| Padding lateral | logo x=48; avatar fim x=2832 | 24 / 24 | `probe runs --row 64`, `probe bbox` |
| Logo (quadrado azul) | box [48,36,56,56] | 28×28, top 18 (centrado) | `probe bbox` |
| Raio do logo | ≈12 (ajuste em dy=1.5/4.5) | 6 | `probe runs` linhas 37–44 |
| Marca branca | [64,52,24,24], margem 16 por lado | 12×12, radius 3 | `probe runs` linhas 52–58 (perfil de cobertura) |
| Wordmark "NIMBUS" | ink [126,50,139,27], baseline ≈76.5 | 18px bold, ink 69.5×13.5 | `probe bbox`, `probe bands` |
| Gap logo→wordmark | ink 22 | 10 (box gap 9.7) | `probe bands --direction col` |
| Nav "Produto" | ink [2162,53,95,22] | 14px regular | `probe bbox` |
| Nav "Precos" | ink [2314,54,85,21] | 14px regular | `probe bbox` |
| Nav "Docs" | ink [2450,54,61,21] | 14px regular | `probe bbox` |
| Gaps entre itens | ink 57 e 52 (**não uniformes**) | box 27.0 e 24.4 | `probe runs --tol 3` (extremos finos) |
| Gap nav→avatar | ≈256.2 (Docs-fim→avatar-início) | 128.1 | calibração `gl verify` |
| Avatar (círculo) | [2768,32,64,64] | 32×32, centrado | `probe bbox`, `probe runs` |

Cores exatas (`probe colors`/`palette`): fundo `#0f172a` · primária `#2563eb`
(logo e avatar) · marca `#ffffff` · texto nav `#94a3b8` · wordmark `#ffffff`.

## Tipografia

- Fonte: `Arial, "Liberation Sans", Helvetica, sans-serif` (nesta máquina Arial
  resolve para Liberation Sans). As larguras de ink medidas batem certo com as
  métricas Arial/Liberation a 14px (Produto 94.8 vs 95 medido; Docs 60.6 vs 61) e
  a 18px bold (NIMBUS 136.5+AA vs 139 medido). É a fonte correta.
- Wordmark: 18px / 700 / line-height normal (baseline previsto 38.24 CSS vs
  38.25 medido — sem correção necessária).
- Nav: 14px / 400 / line-height normal; "Precos" **sem cédula** (confirmado:
  bbox sem descendente, idêntico a "Docs").
- Texto integral visível: `NIMBUS` · `Produto` · `Precos` · `Docs`.

## Decisões e desvios

1. **Gaps de nav não uniformes** (57 vs 52 px img de ink): reproduzidos como
   medidos (margins 27px e 24.4px), não como `gap` uniforme — fidelidade acima
   da pureza. Se o original for uniforme (ex. 24px), é o render da ref que
   diverge; manho os valores medidos.
2. **Calibração de fase sub-pixel**: `gap` do grupo direito = 128.1px (não
   redondo) para pousar a caixa de "Docs" na mesma fase de rasterização da ref
   (2448.0 device px). Eliminou todo o erro real em "Docs" (13%→0 na marca e
   6.6%→0 na palavra).
3. **Tokens**: NÃO substituídos por `var(--gl-…)`. O isolamento do subagente
   (§1 do BRIEF: não ler nada fora do diretório) impediu consultar `tokens.css`;
   usei valores medidos locais (permitido: "fidelidade acima da pureza").
   **Pedido de partilhado** (candidatos a token, medidos):
   - `--gl-color-bg: #0f172a` (fundo de barra escura)
   - `--gl-color-brand: #2563eb` (primária — logo, avatar)
   - `--gl-color-muted: #94a3b8` (texto de navegação)
   - `--gl-font-ui: Arial/Helvetica/sans-serif` · wordmark 18px/700 · nav 14px/400
   - escala de espaçamento lateral 24px; avatar 32px; logo 28px
4. **Residual declarado (não escondido)**: nas células A5/B5 (Produto/Precos)
   ficam ~0.5% de píxeis de aresta com diferença de anti-aliasing nas curvas dos
   glifos de peso regular (mesmo traçado/fase de caixa; `pixelmatchRatio: 0` e
   `worstCell 0.005` vs limite 0.02). É o limite de rasterização de glifos —
   ver "Limites conhecidos" da skill. Sem erro estrutural.
5. **Ativos**: `assets/` vazio — logo, marca e avatar são geometria simples,
   recriados em CSS (proibido extrair ativos para isto). Nenhuma imagem usada.
6. Estados não representáveis na imagem (hover, foco, breakpoints) não são
   inferíveis — não implementados.

## Verificações (3 rondas · pass desde a 1ª)

| # | structuralDistance | edgeEnergyRatio | worstCell | pixelmatchRatio |
|---|---|---|---|---|
| 1 | 0.0012 | 1.002 | 0.0137 (B6) | 0.0001 |
| 2 | 0.0009 | 1.002 | 0.0067 (B6) | 0.0001 |
| 3 | **0.0004** | **1.001** | **0.0050 (B5)** | **0** |

Limiares tier `standard`: ≤0.02 · [0.95,1.05] · ≤0.02 → **pass:true**.

Artefactos `gl` (cand.png, diff.png, side-by-side.png, report.json, work/) são
saídas dos comandos `gl` autorizados pelo BRIEF; não são ficheiros de entrega.

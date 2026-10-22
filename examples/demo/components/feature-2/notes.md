# notes.md · feature-2 — clonagem pixel-perfect

## Transcrição do texto visível (ref.png / ref-zoom.png)
- Título: `Escala automatica` (sem acentos, tal como na imagem)
- Corpo (2 linhas): `Cresce com o trafego e recolhe` / `quando a procura cai.`
- Não há mais texto, etiquetas nem glifos: o ícone é um quadrado verde sólido.

## Elementos por ordem e geometria (CSS px · px imagem ÷ 2)
1. Fundo da região `#f8fafc` (440×280, plano).
2. Cartão `#ffffff`, borda 1 px `#e2e8f0`, radius 16 px — caixa (20, 32, 402, 222).
3. Ícone quadrado `#10b981`, 48×48, radius 12 px, sem glifo — em (45, 57).
4. Título bold `#0f172a` — caixa de texto em x=45; tinta ink 255–284 px dev.
5. Corpo `#64748b`, 2 linhas — ink 327–353 e 371–397 px dev.

## Medições-chave (px dev @ dpr 2 → CSS)
- Cartão: bordas 40–41 / 842–843 (2 px dev = 1 px CSS `#e2e8f0`); topo 64–65, base 506–507.
  Caixa exata (40, 64, 804, 444) dev = (20, 32, 402, 222) CSS; radius 32 dev = 16 CSS
  (perfil de canto: topo plano começa em x=72=40+32; lateral em y=96=64+32).
- Ícone: `probe box #10b981` → (90, 114, 96, 96) dev = (45, 57, 48, 48) CSS;
  radius 24 dev = 12 CSS (primeira linha plana em 114=90+24).
- Padding do cartão: 24 CSS (ícone e texto alinhados em x=45 = 21 + 24; ícone top 57 = 33 + 24).
- Título: ink 348×30 dev; 'E' cap 28 dev; baseline ≈ 285 dev. Offset na caixa de linha: ink top +11 dev.
- Corpo: linha 1 ink 389×27 dev, linha 2 268×27 dev; entre-linhas 44 dev = 22 CSS.
  'C' cap 21 dev; 'q' bowl+descendente 21 dev.
- Cores: fundo `#f8fafc` · cartão `#ffffff` · borda `#e2e8f0` · ícone `#10b981` ·
  título `#0f172a` · corpo `#64748b` (paleta k=8 + amostras 1×1 estáveis).

## Decisões de tipografia (calibradas por render, não a olho)
- Família: `Arial, "Liberation Sans", Helvetica, sans-serif` — empírico: esta resolução
  reproduz EXATAMENTE as caixas de tinta da ref (heading 348×30 dev a 20 px/700;
  corpo 389×27 e 268×27 dev a 14 px/400). `system-ui`, `DejaVu Sans` e `Noto Sans`
  renderizam métricas diferentes (357/405 dev) e foram rejeitados por medição.
- Título: 20 px / peso 700 / line-height 28 px · Corpo: 14 px / 400 / line-height 22 px.
- Quebra de linha fixa com `<br>` para garantir a divisão exata das duas linhas.
- Sem letter-spacing (o ink bate certo a 0).

## Verificações (ciclo §5)
- 2/6 verificações `gl verify`, ambas `pass: true`:
  structuralDistance=0 · worstCell=0 (A1) · edgeEnergyRatio=1.00 · mae=0 · rmse=0 ·
  hotspots=[] · lint=[] · sem pedidos de rede bloqueados.
- `cand.png` byte-idêntico a `ref.png` (sha256 `ec737c91…` nos dois) — paridade total.

## Ativos (§6)
- `assets/` vazio: nada na ref é fotografia/ilustração. O ícone é uma forma simples
  reconstruída em CSS (proibido crop para formas/ícones).

## Desvios / notas honestas
1. Fundo imediato: o BRIEF diz `#fbfcfd`, mas as amostras de píxeis (8,8) e (440,508)
   dão `#f8fafc` com stddev 0 — pintei `#f8fafc` (fidelidade ao píxel). O `preview.html`
   do harness usa `#fbfcfd` no body; o meu raiz pinta por cima e a ref bate certo.
2. Sintaxe do `probe colors --at` do BRIEF está errada: o código do gl.mjs faz
   `split(',')` + `split(':')`, ou seja, o formato real é `nome=x:y[,raio]`
   (não `nome=x,y`). Usado o formato real.
3. tokens.css não foi lido (instrução do orquestrador: nada fora do diretório do
   componente), por isso usei valores literais medidos em vez de `var(--gl-…)`.
   **Pedido de partilhado**: candidatos a tokens — `--gl-slate-50 #f8fafc`,
   `--gl-slate-200 #e2e8f0`, `--gl-slate-500 #64748b`, `--gl-slate-900 #0f172a`,
   `--gl-emerald-500 #10b981`, `--gl-radius-card 16px`, `--gl-radius-icon 12px`.
4. Margens do vão assimétricas na ref (esq. 20 / dir. 18 / topo 32 / baixo 26 CSS):
   reproduzidas como estão — a caixa inclui as margens do vão, tal como o pedido.

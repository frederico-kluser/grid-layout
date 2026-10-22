# notes.md · feature-1

## Resultado
`pass: true` em 2 verificações (ciclo mín. 2 / máx. 6). Métricas finais:
`structuralDistance=0` · `worstCell=0` · `edgeEnergyRatio=1` · `mae=0` · `rmse=0` ·
`pixelmatchRatio=0` — o render do candidato é idêntico à referência píxel a píxel.

## Texto visível (transcrição completa)
- Título: `Deploy instantaneo`
- Corpo: `Do commit ao producao em segundos,` / `sem pipelines frageis.`
  (a referência não usa acentos — reproduzi exatamente)

## Medições-chave (px da referência @2x → CSS px)
| Elemento | Medido (ref px) | CSS |
|---|---|---|
| Card (caixa de borda) | (160, 64) 804×444 | (80, 32) 402×222 |
| Borda do card | 2 px `#e2e8f0` | 1 px, radius externo 32→16 px |
| Ícone | (210, 114) 96×96 `#2563eb` | (105, 57) 48×48, radius 24→12 px |
| Padding do card | 48 px (borda→ícone, topo e esquerda) | 24 px |
| Título | ink (212,255) 366×38; cap D=27.5; baseline≈283.5 | bold 20/28, baseline 141.75 |
| Corpo linha 1 | ink (212,327) 477×23; cap D=20; baseline≈348 | 14/22, baseline 174 |
| Corpo linha 2 | ink (211,371) 268×27; baseline≈392 | entre-linhas 44 ref = 22 px |
| Fundo | `#f8fafc` (16 amostras, stddev 0 — plano) | `var(--gl-color-bg)` |

Cores todas com equivalente em tokens.css: fundo `--gl-color-bg`, card
`--gl-color-surface`, ícone `--gl-color-primary`, título `--gl-color-ink`,
corpo `--gl-color-muted` (#64748b — confirmado por palette da região do texto),
borda `--gl-color-border`.

## Decisões de tipografia
- Família: `var(--gl-font-sans)` (Arial, sans-serif) — as larguras medidas batem
  certo com métricas Arial/Liberation (advance do título = 369 ref px vs ink 366;
  corpo linha 1 = 481 ref px vs ink 477), resolvido no renderizador como Arial.
- Título 20 px / line-height 28 px / weight 700; corpo 14 px / line-height 22 px.
- Quebra de linha explícita (`<br>`) após "segundos," — a quebra natural do
  navegador colocaria "sem pipelines" na linha 1 (largura livre 352 px), logo a
  quebra da referência só é reproduzível de forma explícita.

## Desvios
- Nenhum de fidelidade (paridade total). Notas de processo:
  - `margin-top: 17px` no título está fora da escala 8/4 de propósito: a 1ª
    verificação ficou 2 ref px (1 CSS px) acima em todo o bloco de texto e o
    `shiftHint`/sondas no candidato confirmaram a correção de +1 CSS px.
  - O brief indica fundo `#fdfdfe` não-plano; a medição direta (16 pontos,
    stddev 0) dá `#f8fafc` plano e o diff final é 0 — a medição mandou.
- Ativos de imagem: **nenhum** — o "ícone" é um quadrado arredondado CSS puro
  (palette da região: 93.5% `#2563eb`, resto AA; sem glifo). `assets/` fica vazio.

## Pedidos ao orquestrador (partilhado)
- `gl probe colors --at` documenta `nome=x,y,...` mas o parser atual exige
  `nome=x:y[,raio]` (separador de coordenadas é `:`); o exemplo do BRIEF §5
  falha com "amostra inválida". Corrigir doc do motor/brief.
- Tokens sugeridos (valores hoje locais, claramente partilháveis):
  `--gl-radius-card: 16px` e `--gl-radius-icon: 12px` (raios usados em toda a
  família de cards). `--gl-color-body` (#475569) não corresponde ao corpo deste
  componente — o texto medido é `#64748b` (= `--gl-color-muted`).
- O lint de "BATOTA" dispara com comentários de CSS que mencionem literalmente
  `ref.png` (mesmo sem o usar como imagem); vale a pena estreitar o padrão.

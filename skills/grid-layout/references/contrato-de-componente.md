# Contrato de componente

> Quando usar: ao definir a decomposição (F2), ao preparar pacotes (F3) e sempre
> que um subagente perguntar "o que entrego exatamente?".

Índice: 1. Diretório · 2. Elemento raiz e CSS · 3. Preview isolado · 4. Assets ·
5. Componentes triviais · 6. Famílias (repetidos) · 7. Tokens · 8. Stacks ·
9. Montagem · 10. Regras de unidade (dpr) · 11. Anti-batota.

## 1. Diretório de um componente

```
components/<id>/
├── BRIEF.md          # instruções auto-contidas (gerado por gl prep)
├── meta.json         # contrato medido: caixa, cssSize, dpr, backdrop, vizinhos, limiares
├── ref.png           # recorte EXATO da referência (coordenadas locais a partir daqui)
├── ref-grid.png      # recorte com réguas de píxeis + identidade
├── ref-zoom.png      # ampliação nearest (ler texto/ícones pequenos)
├── component.html    # ENTREGA: fragmento (o subagente escreve)
├── component.css     # ENTREGA: estilos (o subagente escreve)
├── assets/           # ENTREGA: ativos extraídos com `gl crop`
├── notes.md          # ENTREGA: medições, decisões, desvios, pedidos de partilha
├── preview.html      # GERADO (gl verify recria sempre) — nunca editar
├── cand.png          # GERADO: captura do candidato
├── diff.png          # GERADO: mapa de erros (vermelho) + hotspots
├── side-by-side.png  # GERADO: ref | cand | diff
└── report.json       # GERADO: veredito do motor
```

## 2. Elemento raiz e CSS

- `component.html` tem **um único elemento raiz**:
  `<section class="gl-<id>" data-gl-id="<id>"> … </section>`.
- O root **preenche a caixa**: `width:100%; height:100%; box-sizing:border-box`.
  Quem define o tamanho da caixa é o harness (`meta.cssSize`), nunca o componente.
- `component.css`: **todos** os seletores sob `.gl-<id>` (escopo por prefixo).
  Nada de `:root`, `html`, `body`, `*` — o lint do `gl verify` reprova seletores
  fora do âmbito e avisa sobre `@keyframes` não prefixados.
- Conteúdo transbordando a caixa (`overflow`) é erro reportado pelo verify.
- Efeitos que *devem* extravasar (sombra, glow) ficam visíveis na página montada;
  no teste isolado aparecem cortados pela caixa — não os reduzas por isso.

## 3. Preview isolado (o "printar e testar um a um")

`preview.html` mostra **só** o componente, na caixa exata, sobre o fundo imediato
(`meta.backdrop`, amostrado da referência). `gl verify --id <id>`:

1. recria o preview a partir de `component.html` + `component.css` + `tokens.css`;
2. captura o elemento `.gl-<id>` (viewport `cssSize`, `deviceScaleFactor = dpr`,
   animações mortas, rede externa bloqueada, fontes carregadas);
3. mede a caixa do root (`boxCheck`) e o transbordo;
4. diffa contra `ref.png` e escreve `report.json`, `cand.png`, `diff.png`,
   `side-by-side.png` (exit 1 se reprovar).

Isto funciona para qualquer stack que se renderize num URL/ficheiro: o contrato de
verificação é `ficheiro/URL + seletor + caixa + dpr`, não "HTML puro".

## 4. Assets (fotografias e ilustrações)

```bash
node <gl> crop --image ref.png --box x,y,w,h --out assets/nome.png
```

Política:
- **Texto é sempre texto real** — nunca dentro de imagens.
- Ícones/formas simples: recriar em CSS/SVG (nunca recortar).
- Fotografias, ilustrações complexas, texturas: recortar de `ref.png` com
  `gl crop`, documentar em `notes.md` (é conteúdo alheio — usar como placeholder
  e substituir por ativo próprio/licenciado no projeto final).
- Caminhos sempre relativos à raiz do componente: `assets/nome.png` (o assemble
  reescreve para `../components/<id>/assets/…` na página montada).
- `gl crop` avisa quando o recorte cobre >35% da página — confirma que não se está
  a recortar UI recriável.

## 5. Componentes triviais (fundo chapado)

Recortes sem conteúdo (>99.7% de uma cor) são gerados automaticamente por
`gl prep` (CSS com `background:<cor>`). **Não recebem subagente** — o orquestrador
salta-os na onda de construção.

## 6. Famílias (elementos repetidos)

Quatro cartões iguais com textos diferentes **não** são quatro problemas novos:

1. o orquestrador marca a 1.ª instância como canónica e as restantes como
   `reuse: "<id-canónico>"` nas notas do `plan.json`;
2. constrói-se primeiro a canónica (onda 1);
3. as restantes reutilizam o mesmo HTML/CSS com os dados/texto próprios (onda 2,
   trabalho mecânico); cada instância mantém o seu diretório, teste e relatório.

## 7. Tokens (a única partilha)

`tokens.css` (raiz do workspace) concentra o medido na referência, por exemplo:

```css
:root {
  --gl-color-bg: #f2f4f7;
  --gl-color-surface: #ffffff;
  --gl-color-primary: #2563eb;
  --gl-color-text: #101828;
  --gl-color-muted: #475467;
  --gl-font-sans: Arial, sans-serif;
  --gl-space-1: 8px; --gl-space-2: 16px; --gl-space-3: 24px; --gl-space-4: 32px;
}
```

- Medidos uma vez (`gl probe palette`/`colors`/`runs`), escritos pelo orquestrador.
- Componentes usam `var(--gl-…)` para cores/tipografia/espaçamento comuns.
- Um subagente que precise de um token novo pede-o em `notes.md`; valores locais
  também são legítimos (fidelidade acima da pureza) — documenta-se a exceção.
- Escala de espaçamento: quantiza para a escala medida (4/8 px típico) quando o
  desvio ≤ 1 px; fora disso usa o valor medido.

## 8. Stacks

| Stack | Entrega | Preview de verificação |
|---|---|---|
| `html` (predefinição) | `component.html` + `component.css` | `preview.html` gerado |
| `react`/`vue`/`svelte`/… | componente da stack + o seu CSS | rota/página do projeto que renderize SÓ o componente com a caixa do `meta.json` |

Fluxo recomendado: **primeiro HTML+CSS com paridade verificada**, depois uma onda
de portagem para a stack alvo (1 subagente por componente), reutilizando o mesmo
teste: a captura do componente portado tem de dar o mesmo `pass:true` contra o
mesmo `ref.png`. O `plan.json` regista `"stack": "html"` ou a stack final.

## 9. Montagem (`gl assemble`)

A árvore do `plan.json` vira layout real:
- `row` → flex-direction:row · `col` → flex-direction:column · `abs` → posicionado
  pela caixa medida (só para sobreposições intencionais);
- cada folha é um slot com as dimensões CSS exatas da sua caixa;
- saída: `page/index.html` + CSS ligado (`tokens.css` + `component.css` de cada um).
A página final diffa-se contra a referência completa — os erros que só surgem em
contexto (sombra de um sobre outro, bordas partilhadas) aparecem aí.

## 10. Regras de unidade (dpr)

- `plan.json` guarda caixas em **píxeis da imagem**; `meta.json` acrescenta `cssBox`/
  `cssSize` (px ÷ dpr).
- O preview renderiza com `deviceScaleFactor = dpr` para a captura sair nos píxeis
  exatos da referência.
- Caixas que não sejam múltiplas de dpr geram aviso no `gl plan check` (arredonda-as
  na decomposição para evitar cortes de meio píxel).

## 11. Anti-batota (automático no `gl verify`)

Reprova-se: referência (`ref*.png`) usada como imagem/fundo; `http(s)://` em
`src`/`url()`; `position:fixed`; `vw/vh/vmin/vmax`; `!important`; texto dentro de
imagens. Além disso, o `report.json` inclui `scene.cand` (entropia, dominância,
densidade de bordas) que apanha renders vazios ou não aplicados.

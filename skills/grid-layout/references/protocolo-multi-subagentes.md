# Protocolo multi-subagentes

> Quando usar: ao despachar o trabalho de construção (F4) e de reparação (F5).
> Princípio: **um componente = um subagente = um diretório = um teste**.

Índice: 1. Porquê paralelo · 2. Papéis · 3. Ondas · 4. Anatomia do BRIEF ·
5. Mensagem de despacho · 6. Escrita isolada · 7. Reparação · 8. Revisão cega ·
9. Dimensionamento · 10. Harness-agnóstico · 11. Checklist.

## 1. Porquê paralelo (e onde)

A decomposição certa transforma um layout num conjunto de problemas INDEPENDENTES:
cada componente tem referência própria, contrato próprio e teste próprio. Como os
subagentes começam SEM contexto e SEM histórico, nada se ganha em serializá-los —
e cada um converge mais depressa porque vê apenas o seu recorte em altíssima
resolução, sem o ruído do resto da página.

Onde não paralelizar: orientação (F1), decomposição (F2), tokens e montagem (F5)
são do orquestrador — são decisões globais e escrever em `plan.json`/`tokens.css`
por duas mãos é receita para conflitos.

## 2. Papéis

| Papel | Quem | Faz |
|---|---|---|
| Orquestrador | agente principal | init, orientar, decompor, tokens, despachar, verificar, montar, reparar, reportar |
| Construtor | 1 subagente por componente | reproduz o seu recorte dentro dos limiares, no seu diretório |
| Revisor cego | subagente (opcional) | compara pares A/B sem saber qual é a referência |

Não existe delegação aninhada: subagentes **não** lançam outros subagentes.

## 3. Ondas (waves)

```
F1 orientar ─ F2 decompor + tokens ─ F3 prep
   └─ ONDA 1: N construtores em paralelo (1 por folha não-trivial)
        └─ gl verify --all   ← o motor, nunca o auto-relatório
             └─ ONDA 2 (reparação): só os que falham, com diff/hotspots
                  └─ gl verify --all → gl assemble → diff da página
                       └─ ONDA 3 (reparação de página): só regiões falhadas
                            └─ gl report → entrega
```

Regras:
- **Máximo 2 ondas de reparação** por componente. Persistindo a falha, para e
  entrega `report/summary.md` com a lista de desvios — nunca laços infinitos.
- **Nunca re-despachar um componente que já passou** por causa de outro que falhou.
- A onda seguinte só arranca quando `gl verify --all` corre (barreira real).

## 4. Anatomia do BRIEF (gerado por `gl prep`)

`components/<id>/BRIEF.md` é auto-contido e já inclui: missão com medidas exatas
(px e CSS px), tolerância do tier, contexto de vizinhos (para alinhar bordas),
contrato de ficheiros, anti-batota, o ciclo obrigatório com os COMANDOS PRONTOS,
a política de ativos e o formato da última mensagem. O subagente precisa de mais
nada — nem do SKILL.md, nem da conversa do orquestrador.

Se o orquestrador quiser acrescentar contexto (ex.: "o terceiro cartão mostra um
estado vazio"), acrescenta **ao fim do BRIEF** uma secção `## Notas do orquestrador`
sem tocar no resto.

## 5. Mensagem de despacho (pronta a colar)

```
Trabalha num diretório e num só objetivo: reproduzir um componente de UI a partir
de uma imagem de referência, com fidelidade pixel-perfect.

1. Lê o briefing completo: <ABS>/components/<id>/BRIEF.md
2. Segue-o À LEI — incluindo o ciclo de medição, os comandos `gl` indicados e o
   critério de sucesso. Não leias nada fora do diretório do componente.
3. Escreve apenas: component.html, component.css, assets/, notes.md.
4. Termina com o bloco de resultado que o briefing define (≤12 linhas).
```

Para ondas de reparação, acrescenta:

```
5. Esta é uma REPARAÇÃO: lê report.json, diff.png e side-by-side.png já existentes
   no diretório. Corrige primeiro o hotspot mais grave (ver `gl zoom` no briefing).
```

## 6. Escrita isolada (nunca dois no mesmo ficheiro)

- Cada subagente escreve **apenas** em `components/<id>/`.
- `tokens.css`, `plan.json`, `preview.html` e tudo o mais é do orquestrador.
- `preview.html` é GERADO (`gl verify` recria sempre) — nunca editar.
- O lint do `gl verify` reprova seletores fora de `.gl-<id>`, `position:fixed`,
  unidades de viewport, `!important`, rede externa e uso da referência como imagem.
- Pedidos de partilha (ex.: "preciso de um tom de azul do tokens.css") vão em
  `notes.md`; o orquestrador decide e re-despacha se valer a pena.

## 7. Reparação (onda seguinte)

1. `gl verify --all` → lista de falhas com métricas + hotspots por componente.
2. Para cada falha, **regerar o brief de reparação**: BRIEF.md + os artefactos
   (`report.json`, `diff.png`, `side-by-side.png`) + a interpretação do hotspot
   (`worstCell`, `shiftHint`, `edgeEnergyRatio` alto/baixo).
3. Despachar apenas esses componentes (nova mensagem, §5).
4. Depois, `gl assemble` + diff da página: erros que só aparecem em contexto
   (sombra que extravasa, alinhamento de bordas entre vizinhos) são atribuídos ao
   componente cuja caixa contém o hotspot — repara-se só esse.

Sinais típicos → curas:

| Sinal no report.json | Causa provável | Curar com |
|---|---|---|
| `shiftHint {dx,dy}` | elemento deslocado | mover `dx/dy` px no CSS |
| `edgeEnergyRatio` < 0.95 | falta geometria/texto | verificar ícones, bordas, sombras; `probe bbox` nas caixas |
| `edgeEnergyRatio` > 1.05 | ruído (sombra gorda, peso de fonte) | reduzir sombra/peso; comparar com `probe runs` |
| `worstCell` alto, global baixo | defeito localizado | `gl zoom` no recorte do hotspot, ref vs cand |
| `boxCheck.ok: false` | root não preenche a caixa | `width:100%;height:100%;box-sizing:border-box` |
| `BATOTA` no lint | referência usada como imagem | remover; reconstruir de verdade |
| `candidato parece vazio` | CSS não aplicou / ficheiro vazio | conferir `component.css` link e sintaxe |

## 8. Revisão cega (opcional, barata, poderosa)

Métricas passam e mesmo assim algo "cheira mal"? Gera um par A/B sem rótulos:

```bash
node <gl> crop --image reference/ref.png --box x,y,w,h --out work/review-a.png
node <gl> crop --image components/<id>/cand.png --box x,y,w,h --out work/review-b.png
```

Despacha um subagente novo (contexto limpo) com: "Compara estas duas imagens e
lista as diferenças visuais, da mais para a menos notória. Não adivinhes qual é
a original." O orquestrador descodifica depois qual era qual. Sem viés de
confirmação, os erros de percepção aparecem todos.

## 9. Dimensionamento (quando dividir/juntar folhas)

- Alvo: **4–12 componentes** por página típica. Menos = pouco paralelismo; mais =
  overhead de integração e cortes frágeis.
- Folha < ~48 px de largura ou altura: junta-se a uma vizinha na decomposição
  (o `gl plan check` avisa como "folha minúscula").
- Região densa (tabela, grelha de cartões, menu grande): divide em sub-regiões —
  uma folha por cartão/linha só quando cada uma tem geometria própria; itens
  repetidos são UMA família (constrói-se o primeiro, os restantes reutilizam o
  mesmo CSS com dados diferentes — ver `references/contrato-de-componente.md`).
- Região fotográfica/ilustrada: folha própria, tier `loose`, ativo extraído.

## 10. Harness-agnóstico (não prescrever ferramentas)

O protocolo não depende de nenhum harness concreto. Frasear sempre assim:

> "Se o ambiente tiver subagentes/ferramenta de delegação, despacha um trabalhador
> por componente em paralelo (máx. 6–8 em simultâneo), cada um com o ficheiro
> BRIEF.md como única entrada, espera por todos e depois re-verifica com o motor.
> Sem delegação disponível, executa o mesmo trabalho componente-a-componente neste
> contexto, mantendo o mesmo contrato e o mesmo ciclo de verificação."

Regras universais: briefs auto-contidos (contexto novo, sem histórico), sem
escritas concorrentes no mesmo ficheiro, resultados curtos e estruturados,
barreiras reais entre ondas (`gl verify` como teste de passagem), fan-out pequeno.

## 11. Checklist da onda

- [ ] `gl plan check` → `ok:true` e `gl prep --all` executado
- [ ] Briefs lidos pelo orquestrador (conferir contexto de vizinhos e notas)
- [ ] ≤ 8 construtores em paralelo · triviais excluídos · ordem por área
- [ ] Todos terminaram com o bloco de resultado ≤ 12 linhas
- [ ] `gl verify --all` re-corrido pelo orquestrador (não confiar nos relatórios)
- [ ] Falhas → onda de reparação (máx. 2) · `gl assemble` + diff da página
- [ ] `gl report` gerado · desvios declarados · nada fingido

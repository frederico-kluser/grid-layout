# Resolução de problemas

> Quando usar: quando um comando falha, um componente não converge ou o resultado
> cheira mal. Formato: erro → causa → correção.

## Ambiente e instalação

| Erro/sintoma | Causa | Correção |
|---|---|---|
| `Erro: dependências … em falta` | `npm install` não correu | `node scripts/gl.mjs doctor --install` |
| `Erro: nenhum browser Chromium/Chrome disponível` | sem Chromium do Playwright nem Chrome do sistema | instalar Chrome OU `doctor --install` OU `GL_BROWSER=/caminho/para/chrome` |
| `Erro: não é PNG` em `plan skeleton` | referência não normalizada | correr `gl init` (normaliza via browser) |
| capturas com fontes diferentes da referência | máquina/browser diferentes | testar no mesmo ambiente; ver `references/fidelidade-e-limiares.md` §7 |
| `pedidos externos bloqueados` no report | CDN/fonte remota no componente | fontes/ativos locais (`assets/`), sem rede |

## Plano e decomposição

| Erro/sintoma | Causa | Correção |
|---|---|---|
| `buraco de N px no eixo …` | caixas dos filhos não se encostam | alinhar as caixas até fecharem o pai |
| `sobreposição de N px …` | duas folhas cobrem os mesmos píxeis | dividir os limites |
| `filho … não cobre o eixo transversal` | folha mais baixa/estreita que o pai | estender a folha até ao limite do pai |
| `id duplicado` / `id inválido` | ids repetidos ou com maiúsculas | `^[a-z][a-z0-9-]{0,31}$`, únicos |
| `folha minúscula` (aviso) | corte a mais | juntar à vizinha na decomposição |
| segmentação corta onde não deve | vão falso (bloco sólido lido como vão) | mover/apagar o corte no overlay; ou `--min-gap` maior |
| segmentação não corta o que deve | sem vão nem aresta evidente | cortar manualmente no `plan.json` (a sugestão é só sugestão) |

## Construção de componentes

| Erro/sintoma | Causa | Correção |
|---|---|---|
| `caixa do root errada` | root não preenche a caixa | `width:100%;height:100%;box-sizing:border-box` no `.gl-<id>` |
| `conteúdo transborda a caixa` | overflow do layout | rever medidas (`probe bbox`) e tamanhos |
| `BATOTA: a referência … é usada no código` | ref.png como imagem/fundo | remover; reconstruir a peça |
| `seletor "X" fora do âmbito` (aviso) | CSS global | prefixar tudo com `.gl-<id>` |
| `candidato parece vazio` | CSS não aplicou | conferir sintaxe, nome da classe, `component.css` |
| `dimensões diferentes` | captura ≠ recorte | dpr/caixa não múltiplas; ver avisos do `gl plan check` |
| texto nunca bate certo | fonte em falta/substituída | declarar desvio; calibrar tamanho/entrelinha por `bbox`/`bands` |

## Métricas e convergência

| Sintoma | Causa | Correção |
|---|---|---|
| `structuralDistance` estagnado alto | geometria errada (layout, não detalhe) | medir caixas com `bbox`, comparar `runs` inteiros |
| `edgeEnergyRatio` < 0.95 | falta bordas/texto/sombra | procurar omissões nos hotspots |
| `edgeEnergyRatio` > 1.05 | ruído (sombra/peso/gradiente) | reduzir; comparar com `palette`/`runs` |
| `worstCell` alto, resto bom | defeito localizado | `gl zoom` no recorte do hotspot |
| `shiftHint` presente | deslocamento global da peça | mover (dx,dy) px e re-verificar |
| reprovações em loop | erro de contrato, não de píxeis | reler `report.json.problems` e o BRIEF §4 |
| métricas boas mas "algo está mal" | erro perceptual | revisão cega (protocolo §8) |

## Montagem e página final

| Erro/sintoma | Causa | Correção |
|---|---|---|
| imagens em falta na página montada | caminho `assets/` errado | usar `assets/…` (o assemble reescreve) |
| página diffa mal mas componentes passam | sombras/sobreposições entre vizinhos | reparar pela atribuição do diff (região → componente) |
| desalinhamento de bordas entre vizinhos | caixas do plano não refletem o visual | ajustar o corte no `plan.json` e re-gerar prep |

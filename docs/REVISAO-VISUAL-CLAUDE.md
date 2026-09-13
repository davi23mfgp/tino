# QA visual — tarefa C5

Base: commit `3af300e` mais as correções das tarefas C2/C3/C4 desta branch.
Revisor: Claude, branch `claude/revisoes`.

Medição real, não impressão: `scripts/qa-visual-claude.mjs` entra com a conta
de demonstração, percorre dez rotas pessoais em **320, 390, 768 e 1440 px** e
mede a tela. Usa o Edge instalado na máquina (canal `msedge`), então não baixa
navegador. As 40 capturas ficam em `.qa-visual/` (fora do versionamento).

Rotas: `/painel`, `/cartoes`, `/categorias`, `/metas`, `/reserva`, `/dividas`,
`/plano`, `/projecao`, `/transacoes`, `/configuracoes`.

## O medidor prova que enxerga

O script planta de propósito um estouro de borda e um texto de contraste baixo
na primeira rota e aborta se não acusar os dois. Isso existe porque a primeira
versão devolveu **276 achados falsos**: o app usa cores em `lab()`/`oklch()` e
o leitor de cor assumia `rgb()`, transformando `oklch(0.65 0.15 170)` nos
números 0,65 / 0,15 / 170. Todo contraste saía errado.

Corrigido com conversão pelo `canvas`, que normaliza qualquer cor que o
navegador saiba pintar. Depois disso, "zero achados" passou a significar
alguma coisa.

Também ficou de fora o falso positivo de rolagem: elemento que passa da borda
**dentro de um rolador horizontal proposital** (`overflow-x: auto`) é o
comportamento esperado, não defeito.

## Resultado

| Verificação | 320 | 390 | 768 | 1440 |
|---|---|---|---|---|
| Rolagem horizontal na página | nenhuma | nenhuma | nenhuma | nenhuma |
| Elemento passando da borda direita | nenhum | nenhum | nenhum | nenhum |
| Número cortado (caixa menor que o conteúdo) | nenhum | nenhum | nenhum | nenhum |
| Contraste abaixo do mínimo WCAG | nenhum | nenhum | nenhum | nenhum |
| Ação coberta ao fim da rolagem | nenhuma | nenhuma | nenhuma | nenhuma |
| Erro de JavaScript na página | nenhum | nenhum | nenhum | nenhum |

Dez rotas, quatro larguras, quarenta combinações.

## Achado corrigido

### A última barra do gráfico ficava presa embaixo do porquinho

- **Captura:** `.qa-visual/cartoes-320.png` e `.qa-visual/cartoes-390.png`
- **Rota:** `/cartoes` · **Largura:** 320 e 390 px
- **Problema:** o gráfico "Faturas por mês" rola na horizontal e a última
  barra (`mar/27`) encosta na borda direita quando o rolador chega ao fim.
  O porquinho flutuante fica fixo em `bottom-24 right-4`, ocupando 44 × 44 px
  exatamente ali. Medido: com `scrollLeft` no máximo, a caixa da última barra
  cruza a caixa do porquinho nas duas larguras, e o rolador tinha
  `padding-right: 0`.
- **Por que é diferente do resto:** barra fixa cobrindo conteúdo costuma ser
  passageiro — rola e resolve. Este não: a barra está presa no fim do rolador,
  então **nenhuma posição de rolagem a liberava**. E ela é um `<button>`:
  seleciona o mês da fatura.
- **Contraria:** item 46 da lista de 53 ("Porquinho IA na lateral/inferior
  direito sem sobreposição").
- **Correção aplicada:** `pr-16 lg:pr-0` no rolador do gráfico — 64 px de
  folga no celular, para a última barra passar do porquinho; no desktop o
  porquinho flutuante não existe (`lg:hidden`), então nada muda lá.
- **Verificado depois:** com o rolador no fim, a última barra não cruza mais o
  porquinho em 320 nem em 390; em 1440 o porquinho continua ausente.

## Sobreposição passageira: medida e considerada aceitável

A barra inferior e o porquinho passam por cima de conteúdo enquanto a página
rola. Medido em `/cartoes`, `/painel` e `/metas`, em 320, 390 e 768:

| Largura | Rota | O que fica sob a barra inferior em algum momento |
|---|---|---|
| 320 | `/painel` | "Cartões · R$ 1.644,00 em faturas abertas" |
| 390 | `/cartoes` | meses de abr/26 a set/26 |
| 390 | `/metas` | "Registrar aporte ou retirada", campo de valor |

Isso **não** foi corrigido, e é de propósito: ao rolar até o fim da página,
nenhum desses elementos continua coberto — a verificação de "ação coberta ao
fim da rolagem" deu zero nas quarenta combinações. É o comportamento normal de
barra fixa, e o recheio de rodapé do layout já garante que tudo alcança a
área livre.

O caso do gráfico era diferente justamente porque não alcançava.

## Comparação com a lista de 53

Confirmado nas capturas, em `/cartoes` a 390 px:

- **Item 1** (identidade visual do banco): o cartão mostra "BANCO DO BRASIL"
  com selo, e o seletor mostra "Nubank" no outro cartão.
- **Item 2** (faturas por mês em barras): presentes, com lançamentos e
  parcelas previstas em séries separadas.
- **Item 6** (estilo iOS responsivo): as quatro larguras se comportam, sem
  rolagem horizontal.
- **Item 27** (orçamento planejado distinto do limite bancário): a tela
  escreve "Limite bancário" no cartão e trata o orçamento em aba própria.

Não conferi item por item os 53: a divisão de tarefas deixa a validação
completa com o Codex, e esta tarefa é o QA visual complementar.

## Pergunta de produto

Uma, e não decidi sozinho: **o porquinho flutuante deve continuar sobre o
conteúdo no celular?** A folga de 64 px resolve o gráfico de faturas, mas
qualquer elemento novo que encoste na borda inferior direita vai esbarrar nele
de novo. As saídas seriam reservar essa faixa no layout inteiro, ou mover o
porquinho para dentro da barra inferior. As duas mudam o desenho que o Codex
está validando, então ficam com você.

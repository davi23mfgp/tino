# Como toda tela do Tino deve ser feita

Pedido do Davi em 13/09/2026, valendo para o app inteiro e para tudo que vier
depois — não é o estilo de uma tela só.

## A regra

Uma pessoa bate o olho na tela e, sem ler tudo, consegue:

1. **Se situar** — qual é a minha situação agora.
2. **Identificar o problema** — o que está errado ou apertado.
3. **Entender a análise** — por que isso aconteceu.
4. **Agir** — qual é a melhor ação possível, com um botão que a executa.

Se a tela não responde as quatro, ela não está pronta. "Bateu o olho e já
entendo e coloco em prática."

## Como isso vira layout

- **Uma pergunta por bloco, e a resposta é um número grande.** Nada de grade de
  métricas pequenas onde tudo tem o mesmo peso. O número que responde vem em
  tamanho de manchete; o detalhe que o explica vem abaixo, menor.
- **Resposta em vez de insumo.** "Você fica sem dívida em novembro de 2027" no
  lugar de "14 meses"; "quanto vou ter" no lugar de "entrou e saiu". Se a
  pessoa precisa fazer conta de cabeça, a tela está entregando insumo.
- **A ação mora ao lado da conclusão.** Todo bloco que aponta um problema
  termina em um botão que resolve aquele problema.
- **O detalhe é opcional, não ausente.** O que explica o número fica atrás de
  um "ver" ou de um acordeão — nunca apagado em 11px no meio da tela.
- **Página viva, com cor.** Cinza em tudo é proibido. Verde da marca para a
  série principal, o positivo e a ação; vermelho para o que aperta; a cor da
  instituição quando a tela fala de um banco. Cor carrega significado — não é
  enfeite, e por isso nunca é distribuída aleatoriamente.
- **Moderno e refinado, não denso.** Respiro entre blocos, cantos generosos,
  tipografia com hierarquia de verdade (manchete, título, apoio, nota).

## Contraste continua obrigatório

Cor viva não dispensa a conta: todo par texto/fundo é calculado
(OKLab → sRGB linear → WCAG) e precisa passar de 4,5:1. O verde da marca
(`#45f45c`) hospeda texto **preto**, nunca branco — branco em cima dele dá
1,46:1. Os números estão em `REDESIGN-EM-CURSO.md`.

## Já aplicado

- `/plano` — data de liberdade como manchete, régua de quitação, dívida da vez
  com ação, fila com peso relativo, roteiro com o número do mês em destaque.
- `/projecao` (fluxo de caixa) — "quanto você vai ter" como manchete; entrada e
  saída viraram detalhe opcional.
- Painel — cartão na cor da instituição com o logo do banco.

## Falta aplicar

`/analise`, `/simulador`, `/investir`, `/dividas` (a lista precisa responder
"qual dívida, por que pagaria, de onde tiro o dinheiro" logo no topo),
`/orcamento`, `/metas`, `/reserva`.

## Mínimo de texto — regra de 14/09/2026

Pedido do Davi ao ver o painel do ARCA: **o mínimo possível de texto e o máximo
de instrução prática**, no sistema inteiro.

O que isso quer dizer, na prática:

- **Rótulo curto e número.** Não escrever a frase que explica por que o número é
  aquele. O número já é a explicação.
- **Quando houver texto, que seja instrução, não justificativa.** "Aporte
  R$ 300 aqui" no lugar de "esta classe está abaixo do alvo porque o método
  prevê partes iguais e a sua carteira concentrou em ações".
- **Diferença que importa vira etiqueta, não parágrafo.** `−8 p.p.` ao lado da
  barra, e não uma linha dizendo o mesmo em palavras.
- **Explicação que sobrevive vai recolhida** (`<details>`) ou sai da tela.
- **A ressalva de investimento fica**, em uma linha curta. "Cálculo, não
  recomendação" é exigência de CVM, não didatismo — encurtar é permitido,
  apagar não.

Isso vale para tela nova e para tela que for tocada. Não é autorização para sair
varrendo texto do app inteiro sem pedido — quando o Davi quiser a varredura, ele
pede.

## A abertura de toda tela — regra de 14/09/2026

O Davi apontou a calculadora de reserva como o desenho que ele quer em tudo:

> "Tá vendo esse começo? Gostei muito dele. Do gradiente, da fonte, do texto.
> Aplique isso no site todo. Sempre comece assim, como se fosse a entrada do
> cliente para aquela seção. E depois busca as informações pra saber onde guiar
> ele."

O componente é `src/components/abertura.tsx`. A ordem é a regra:

1. **Rótulo** — duas ou três palavras em caixa alta dizendo do que se trata.
2. **Resposta** — uma frase em tamanho de manchete que responde a pergunta
   daquela seção, com o número da pessoa dentro dela.
3. **Apoio** — uma linha de contexto, só quando o número sozinho não basta.
4. **Guia** — as perguntas ou controles que levam a pessoa ao próximo passo.

**Primeiro a pessoa sabe onde está, depois o app pede informação.** O
contrário — formulário no topo, resposta no fim — faz preencher campo sem saber
para quê, e foi o que as telas antigas faziam.

O **verde** marca só o pedaço da frase que vem dos dados dela ("6 meses",
"R$ 26.948,58"), nunca a frase inteira: ele diz "isto é seu", não decora texto.

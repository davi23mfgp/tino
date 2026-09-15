# Plano: princípio de tela no site inteiro

Pedido do Davi em 15/09/2026: aplicar o pensamento de `/analise`, `/simulador`
e `/investir` em **todas** as telas, incluindo coisas pequenas. Este documento
é a análise e o plano. **Nada foi implementado ainda — aguarda aprovação.**

A régua é `docs/PRINCIPIO-DE-TELA.md`: situar → problema → análise → agir,
abertura padrão (`src/components/abertura.tsx`), mínimo de texto, número
manchete, ação colada na conclusão, cor com significado.

## O diagnóstico em uma frase

`<Abertura>` existe e está aprovada, mas é usada em **1 lugar** de 27 telas
(`orcamento-casal.tsx`). O resto do app abre com filtro, formulário ou com uma
grade de `Metrica` onde 4 números têm o mesmo peso — ou seja, abre com insumo,
não com resposta.

Levantamento mecânico (27 rotas em `src/app/(app)`):

- 0 telas usando `<Abertura>`.
- 15 telas com grade de `Metrica`/`grid-cols` como primeiro conteúdo.
- ~57 usos de `Metrica` no total: é o componente que mais define o app hoje,
  e ele foi feito para detalhe, não para resposta.
- 9 telas com parágrafo explicativo logo abaixo do título (justificativa, não
  instrução — contra a regra de 14/09).

## Mudança estrutural que destrava o resto (fazer primeiro)

1. **`<Resposta>` novo primitivo** (`src/components/resposta.tsx`): rótulo,
   número em tamanho de manchete, etiqueta de variação ao lado, e um botão de
   ação opcional. É o que hoje cada tela improvisa com `<strong>` e CSS
   próprio (`/investir`, `/dividas`, `/mei` cada um do seu jeito).
2. **`<Abertura>` vira o começo obrigatório** de toda tela, com um caso novo:
   tela sem dado ainda (mostra o que falta, não um zero).
3. **`Metrica` rebaixada**: deixa de ser grade de 4 iguais e passa a ser linha
   de apoio abaixo da resposta. Um ajuste no componente propaga em ~20 telas.
4. **`<Detalhe>`**: `<details>` padronizado para o que hoje é parágrafo de
   11-13px no meio da tela.

Com esses quatro, cada tela abaixo vira trabalho de composição, não de CSS
novo. Sem eles, cada tela reinventa o mesmo desenho.

## Onda 1 — as três que o Davi já viu

### `/analise`
- Abre com `Parecer de <mês>` e 4 tiles de peso igual (Entrou/Saiu/Resultado/
  Patrimônio). Nada responde nada; a ação é uma linha de 14px no rodapé.
- Novo: manchete com o veredito e o número dele dentro; nota de saúde vira
  etiqueta; o pior indicador ganha bloco próprio com régua **e botão** que
  leva ao orçamento da categoria; "O que fazer, nesta ordem" sobe para o topo
  com botão por item; os 4 tiles descem para detalhe recolhido.

### `/simulador`
- Abre pedindo "o que você quer mudar?" antes de dizer o que acontece sem
  mudar nada. Os 4 `Metrica` finais empatam em peso.
- Novo: abertura com o cenário base já calculado; a resposta vira uma manchete
  comparativa (`+ R$ 8.100`); saldo, juros e quitação viram etiquetas; botão
  **"Transformar em meta"/"Virar orçamento"** — hoje a simulação morre na tela.

### `/investir`
- O mais perto de pronto. Trocar a faixa manual pela `<Abertura>`; as três
  legendas em frase viram etiqueta; `Caixa no vermelho` aponta problema sem
  botão; a divisão da renda mostra percentual sem dizer o aporte a fazer.

## Onda 2 — as telas de decisão (maior ganho por esforço)

### `/painel` (início)
Abre com "Resultado de <mês>" e a dupla Entrou/Saiu. É a primeira tela do app
e ela entrega insumo. Novo: manchete do tipo *"Sobram R$ 740 até o dia 30"* ou
*"Faltam R$ 320 para fechar o mês"*, com a ação recomendada ao lado. O resto
das seções (cartões, fila, categorias) já está bom.

### `/dividas`
Já tem "O que você deve hoje" + "Pague esta primeira" — perto. Falta: o apoio
é um parágrafo de três linhas (vira etiqueta), e o princípio exige responder
**"de onde tiro o dinheiro"**, que a tela não responde; o alvo não tem botão
que execute o pagamento/registro.

### `/orcamento`
Abre com seletor de competência. Novo: *"Você usou 78% do orçamento com 12
dias pela frente"*, a categoria estourada em destaque com botão de ajustar.

### `/projecao`
Tem 4 `Metrica` iguais (saldo hoje, receita média, despesa média, fecha o ano
em). O "fecha o ano em" é a resposta e está no mesmo tamanho dos insumos —
promover a manchete, recolher os outros três.

### `/emprestimos`
Formulário primeiro, com parágrafo explicativo. Novo: antes de preencher,
responder com o dado que já existe (*"com sua renda, parcela segura é até
R$ X"*); depois de preencher, veredito em manchete (vale/não vale) com o
motivo em etiqueta.

### `/cartoes`
Novo: *"Próxima fatura: R$ 1.240, fecha em 6 dias"* + ação.

### `/metas`
`/reserva` é o desenho aprovado; `/metas` usa o mesmo componente mas sem a
calculadora que faz a abertura. Dar a `/metas` a abertura equivalente
(*"faltam R$ 2.300 para a meta mais próxima"*).

### `/mei`
Faturamento já é número grande (bom). Falta a resposta: *"ainda cabem
R$ 21.400 até dezembro"*, e o texto entre parênteses sobre proporcionalidade
vira etiqueta.

## Onda 3 — a loja

`/loja` (balcão), `/loja/estoque`, `/loja/fiado`, `/loja/contas`,
`/loja/financas`: todas abrem com grade de `Metrica` igual. Cada uma ganha
uma pergunta e uma resposta:

- Balcão: *"Vendeu R$ 430 hoje"* + abrir caixa / nova venda.
- Estoque: *"3 produtos acabam esta semana"* + repor.
- Fiado: *"R$ 820 a receber, R$ 210 atrasado"* + cobrar.
- Contas: *"R$ 1.100 a pagar nos próximos 7 dias"* + pagar.
- Finanças: resultado da loja no mês como manchete.

## Onda 4 — as telas de lista e ajuste (as "coisas pequenas")

- `/transacoes`: abertura com o total do período filtrado e quantos itens
  esperam conferência.
- `/capturas`: *"7 lançamentos esperando você"* + conferir tudo.
- `/recorrencias`: *"R$ 2.340 por mês em contas fixas, 2 atrasadas"* + ação.
- `/regras`: *"N regras, M lançamentos classificados sozinhos"* — hoje o
  título é "O que o Tino aprendeu" sem número nenhum.
- `/categorias`: tirar o parágrafo "Personalize nome e emoji…" (justificativa)
  e abrir com quantas categorias e quantas sem uso.
- `/conectar`, `/importar`, `/parcelamentos`: abertura curta dizendo em que
  passo a pessoa está.
- `/assinatura`: manchete com o plano e quando renova.
- `/configuracoes`: não leva manchete (não responde pergunta de dinheiro), só
  a limpeza de texto explicativo.

## Regras aplicadas em varredura, nas telas tocadas

Só nas telas de cada onda, não no app inteiro de uma vez:

- parágrafo de justificativa → etiqueta ou `<details>`;
- grade de 4 `Metrica` iguais → uma resposta + apoio;
- bloco que aponta problema sem botão → ganha botão;
- contraste de todo par novo calculado (OKLab → sRGB linear → WCAG), verde da
  marca sempre com texto preto.

## Fora do escopo desta proposta

- Varrer texto do app inteiro sem tela tocada (o Davi pede quando quiser).
- Trocar fonte, paleta ou navegação.
- O achado de `/api/tino/alertas` consultado por 4 componentes da mesma página
  (5-6 requisições por carregamento): é estrutural, fica separado do visual.

## Verificação por onda

`tsc`, `next build`, `npm test`, fumaça 63 rotas, e leitura no navegador
medindo geometria pelo DOM (o screenshot desta máquina sai em escala diferente
do viewport e engana a olho).

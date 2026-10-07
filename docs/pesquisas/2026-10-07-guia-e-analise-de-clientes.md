# Estudo: Guia do negócio e análise de clientes

Data: 2026-10-07 · Fase e item: Fase 2, itens 2.1 (Guia do negócio) e 2.2 (análise de clientes)

## A pergunta

Como o Tino mostra, em linguagem simples, o que falta para o negócio ir
melhor (2.1) e quem são os clientes que compram mais, que sumiram e que só
compram no fiado (2.2), sem número inventado e para qualquer idade?

## Quem já faz

| Referência | O que faz | Resultado ou número | Fonte | Força |
|---|---|---|---|---|
| Square, grupos automáticos de clientes (EUA) | Dois grupos que se montam sozinhos: **frequentes** (3 visitas em 6 meses) e **sumidos** (eram frequentes e não voltam há 6 semanas). A pessoa pode mudar os números. | sem número de efeito | [Square, grupos e filtros](https://squareup.com/help/us/en/article/6245-manage-customer-groups-and-filters), [Square, diretório de clientes](https://squareup.com/help/us/en/article/6147) | forte (documentação do produto), só resumo |
| Shopify, guia de primeiros passos (Canadá) | Lista de tarefas na tela inicial, com progresso, cada passo com título, explicação e um botão que leva a fazer. | sem número publicado | [Shopify, padrão "setup guide"](https://shopify.dev/docs/api/app-home/patterns/compositions/setup-guide) | forte (documentação), só resumo |
| Sebrae, sobrevivência do MEI (Brasil) | 29% dos MEI fecham em até 5 anos; falta de controle financeiro e de capital de giro estão entre as causas mais citadas (capital de giro: 22% dos que fecharam). | 29% em 5 anos | [Monitor Mercantil](https://monitormercantil.com.br/taxa-de-mortalidade-de-meis-e-de-29/), [Fenacon](https://fenacon.org.br/noticias/obrigatoriedade-de-emissao-de-nfs-e-deve-reduzir-taxa-de-mortalidade-do-mei/) | média (imprensa citando o Sebrae) |

## Veredito

**Faz sentido, e as duas coisas são a mesma tela de pensar.** O Square
mostra o que funciona na análise de clientes: grupos que se montam sozinhos,
com regra simples e escrita na tela. A Shopify mostra o formato do guia:
passo, porquê e um botão. O Sebrae diz onde o MEI quebra: controle do
dinheiro e capital de giro. Então o Guia começa por aí.

O que o Tino faz:

1. **Guia do negócio:** cada passo é uma pergunta com resposta tirada dos
   dados ("já cadastrou o custo dos produtos? 3 de 12 sem custo"), o porquê
   em uma frase, e um botão que leva à tela que resolve. Passo sem dado para
   responder não aparece com resposta inventada; aparece como "cadastre X
   para o Tino conferir" (regra 3). Ordem: o que segura o caixa primeiro
   (custo, taxa da maquininha, fiado atrasado, DAS), depois o que traz venda
   (cliente sumido, orçamento sem resposta).
2. **Análise de clientes:** quatro grupos, com a regra escrita embaixo de
   cada um: **compram mais** (os que somam 80% do faturamento dos últimos
   90 dias), **frequentes** (3 compras ou mais em 6 meses, como o Square),
   **sumidos** (eram frequentes e não compram há 6 semanas, como o Square) e
   **só no fiado** (todas as compras dos últimos 6 meses no fiado). Cada
   grupo com uma ação: mandar mensagem, cobrar.
3. **Sem nota de cliente** nem número de "saúde" inventado: o Tino diz o
   fato e a referência (a regra do grupo), não uma pontuação.

## Como medir

- **Passos do Guia concluídos** no primeiro mês: meta 3 de cada 5 negócios
  concluindo pelo menos 2 passos; sem referência de mercado, o primeiro mês
  dá a linha de base.
- **Clientes sumidos que voltam** depois de uma mensagem mandada pela tela:
  linha de base no primeiro mês.

## Limites deste estudo

- Páginas não abertas deste ambiente; resumos de busca. Conferir antes de
  citar fora.
- As faixas do Square (3 em 6 meses, 6 semanas) são de varejo e restaurante
  dos EUA; podem não servir para assistência. Por isso a tela diz a regra e
  ela poderá ser ajustada depois das conversas com os donos.

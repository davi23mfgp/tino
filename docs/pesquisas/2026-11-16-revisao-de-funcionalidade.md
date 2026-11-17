# Revisão de funcionalidade (pedido do Davi, 16/11/2026)

Pedido: olhar o app pela função. Fácil de subir arquivo e saber o que vai
acontecer, contas que não se misturam (conta fixa no cartão), investimento
por catálogo com rendimento, ligação com programas de milhas, atalhos do dia
a dia no lugar do Open Finance, simulador completo, e o app coerente e sem
repetição. Três investigadores (cavecrew) leram o código; nada foi rodado por
eles. O que está marcado "conferido" eu rodei.

## 1. Conta fixa no cartão

- Não há soma dupla no Meu mês nem no pagamento de fatura (o pagamento é
  transferência, não despesa).
- **Corrigido e conferido:** conta fixa lançada no cartão não gravava o mês
  da fatura; a compra de 29/11 num cartão que fecha dia 28 caía em novembro.
  Agora cai na fatura de janeiro, como uma compra comum.
- **Defeito provável, não corrigido:** na previsão (Entra e sai por mês), a
  fatura fechada entra como saída até o dia do vencimento, mesmo já paga. Quem
  paga antes do vencimento vê a fatura descontada duas vezes até o dia de
  vencer. O pagamento também abate a fatura do mês em que foi feito, que pode
  ser outra. Lido em `lib/fluxo-mensal.ts` e `lib/fluxo-mensal-dados.ts`;
  falta reproduzir com dados antes de mexer.
- **Diferença entre telas:** o orçamento do Início soma o gasto das
  categorias de conta fixa; o Meu mês tira essas categorias do variável. Os
  dois números podem não bater.
- O custo fixo é o valor cadastrado, não o que foi pago.

## 2. Subir extrato e fatura (saber o que vai acontecer)

A prévia já mostra: quantas linhas novas e repetidas, entra e sai, categoria
sugerida, transferências, soma da fatura conferida e parcelas futuras.
Falta: saldo da conta antes e depois, quantos lançamentos vão para cada mês,
o mês da fatura (é enviado mas não aparece) e o total por categoria.

## 3. Investimentos

Existe: cadastro à mão com código e quantidade, cotação automática (Yahoo,
sem chave), câmbio, Selic e CDI, resultado no período.
Não existe: catálogo ou busca por nome, conferência do código, preço médio,
compra e venda com data, dividendos, rendimento automático de renda fixa e
fundos, rendimento desde a compra.

## 4. Milhas

Existe: cinco programas com link, saldo digitado, previsão de pontos pela
fatura e pelas parcelas, simulador de compra com bônus.
Não existe: ligação com o programa, validade dos pontos, valor por milha,
mais de um programa por cartão.

## 5. Simulador

Existe: guardar, cortar gasto, mudar renda, pagar dívida mais rápido, comprar
parcelado, pegar empréstimo, quitar dívida, gasto e entrada únicos, de 6 a 60
meses, com tabela mês a mês.
Não existe: financiamento SAC, à vista contra parcelado com juros, antecipar
parcelas, quitar dívida contra investir, renda que varia, reajuste em
percentual, aposentadoria na tela, juros do rotativo.

## 6. Repetição entre telas

- Orçamento, Meu mês e Contas fixas mostram o custo fixo em três lugares.
- Dois motores de previsão: o do Início e o da tela Entra e sai por mês.
- Dívidas e Plano de pagamento calculam a quitação cada um do seu jeito.
- Empréstimo e o cenário de empréstimo do Simulador fazem a mesma conta.
- "Simular" existe em Simulador, Investir, Reserva e Metas.
- Análise e Início mostram o mesmo diagnóstico.

## O que depende de estudo de mercado antes de propor

Catálogo de investimentos (fontes de dados e custo), ligação com programas de
milhas (se algum programa oferece acesso) e a ordem de tudo. Nada disso foi
estudado ainda.

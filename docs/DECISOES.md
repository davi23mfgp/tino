# Decisões de modelagem e o porquê

Cada uma custou uma discussão ou um defeito. Mudar qualquer uma sem entender o
motivo reintroduz o problema.

## Dinheiro e taxas

**Centavos inteiros, sempre.** Float em dinheiro acumula erro de arredondamento
(`0.1 + 0.2 !== 0.3`) e, somado mês a mês, faz o extrato não fechar com o banco.

**Taxa em pontos-base inteiros.** 250 = 2,50% ao mês. Mesma razão: taxa em float
propaga erro na projeção composta, onde ela é elevada a 24 ou 60.

**Rateio devolve a soma exata.** `ratear(1000, 3)` dá `[334, 333, 333]`, não três
valores de 333 que somam 999. Centavo perdido em divisão vira diferença de saldo.

## Saldo

**Saldo é sempre derivado dos lançamentos, nunca gravado.** Campo de saldo
desatualiza no primeiro lançamento editado ou apagado.

**Cartão de crédito não entra no saldo disponível.** Limite é dívida futura, não
dinheiro. Somá-lo mostraria um saldo que a pessoa não tem.

**Transferência move saldo entre contas, mas não é receita nem despesa.** As duas
pontas se anulam no resultado do mês. A direção vem do vínculo: a ponta de
destino aponta para a de origem (`transferenciaParId`).

> Este foi um defeito real: o cálculo só somava receitas e despesas, então
> guardar na poupança ou pagar a fatura do cartão não mudava saldo nenhum.
> A correção está em `panorama.ts` **e** em `api/contas/route.ts` — as duas
> telas precisam usar a mesma regra, senão mostram saldos diferentes.

## Cheque especial

**Saldo negativo em conta não é dívida separada: é o próprio saldo**, com juros
incidindo sobre ele.

Tratar como dívida à parte contava o mesmo buraco duas vezes (uma no saldo, outra
no passivo) e fazia a sobra do mês ficar "parada" ao lado de uma dívida a 8% —
o oposto do que acontece na conta real, onde qualquer entrada abate o negativo
na hora.

**Fatura de cartão é diferente:** ela só diminui quando é paga, então entra como
dívida de verdade.

No **plano de pagamento** e no **simulador**, a conta negativa entra uma vez só:
`Divida.contaId` liga a dívida à conta que a originou, e quem tem vínculo é
pulado na derivação. Sem isso a dívida aparecia dobrada.

## Competências e datas

**Competência é `"YYYY-MM"` em string.** Comparação, agrupamento e chave única
ficam triviais e não dependem de fuso.

**Datas gravadas em UTC à meia-noite.** Sem isso o dia escorrega ao renderizar em
`America/Sao_Paulo`.

**O mês financeiro pode não começar no dia 1º.** Quem recebe dia 5 tem o mês de 5
a 4 (`Lar.diaInicioMes`); fechar no dia 1º jogaria salário e contas em meses
diferentes.

**Vencimento dia 31 em fevereiro cai no dia 28.** É o que o banco faz
(`diaSeguro`).

## Análise

**A nota de saúde tem teto pela pior faixa.** Média sozinha dava 84 ao lado do
rótulo "situação crítica". Em finanças o pior item manda: estar sem reserva não
é compensado por ter pouco custo fixo. Teto de 55 com indicador crítico, 40 com
a conta no negativo.

**Indicador sem base real não recebe faixa.** Sem receita lançada, a taxa de
poupança aparece como "sem faixa" explicando que usou renda declarada. Elogiar
sobra que ninguém viu é pior que calar.

**Média mensal ignora meses sem lançamento.** Lar recém-criado não é mês de gasto
zero; incluí-los puxaria a média para baixo.

**Média diária conta só dias com gasto.** Incluir os zerados diria que a pessoa
gasta menos por dia do que gasta quando gasta.

## Captura de gastos

**Notificação vai para fila, nunca direto ao extrato.** Ela erra: compra negada
gera aviso igual ao de aprovada, posto pré-autoriza um valor e cobra outro,
estorno chega como compra.

**O descarte vem antes da extração.** Se o texto é "compra negada", nem se lê o
valor — um lançamento falso é pior que um lançamento faltando, porque a pessoa
passa a desconfiar de todo o extrato.

**Parcela é lida antes da data, e o trecho sai do texto.** "parcelada em 3/10"
tem a mesma cara de "3 de outubro". Sem isso o gasto ia para outro mês.

**Data futura em notificação é sempre descartada** em favor de hoje: o aviso
chega no instante da compra.

**Chave de captura é guardada como hash.** O valor em claro aparece uma vez, na
criação. Uma chave por aparelho, para revogar só o que foi perdido.

## Categorização

**Duas camadas: regras do lar vencem o dicionário embutido.** O dicionário cobre
o primeiro extrato; a correção do usuário vira regra com prioridade acima dele.

**A regra nasce da descrição limpa, não do texto cru.** Padrão colado no
lançamento inteiro pegaria só aquele e nunca mais.

**Regex inválida do usuário não derruba a importação** — é capturada e ignorada.

**Reprocessar histórico só toca no que está sem categoria por padrão.**
Recategorizar em massa apagaria o trabalho manual sem aviso.

## Importação

**Prévia antes de gravar, sempre.** Importação silenciosa é como extrato errado
entra e ninguém percebe por três meses.

**Deduplicação por impressão digital** (conta + data + valor + descrição
normalizada), ou pelo `FITID` do banco quando existe. Permite reimportar o mês
inteiro sem duplicar.

## Sessão

**A checagem de "lar existe" fica em `sessaoDaPagina`, não só no layout.** O Next
renderiza layout e página em paralelo: o redirecionamento do layout não impede a
página de consultar o banco antes. Sem isso, token válido apontando para lar
apagado quebrava toda tela com erro de servidor.

**Cookie não pode ser apagado em Server Component.** Por isso o desvio manda
para `/login?sessao=invalida` e deixa o próximo login sobrescrever.


## 09/09/2026 — simplificação e continuidade

Por pedido explícito do usuário, priorizar saldo e ações básicas no início; recursos avançados permanecem em Mais. Terminar telas reais antes das capturas da landing. Manter stack existente, cálculos em centavos e permissões. Registrar a migração fiscal aditiva que faltava ao histórico do schema. Evidências e retomada em CONTINUAR-NO-OUTRO-NOTEBOOK.md.


### 09/09/2026 — revisão das telas avançadas

Valores cortados nos cartões corrigidos, formulário de contas fixas em diálogo com recuperação de falhas, campos de metas identificados e largura de notificações corrigida. Evidências e modo opcional de build com pouca memória em CONTINUAR-NO-OUTRO-NOTEBOOK.md.

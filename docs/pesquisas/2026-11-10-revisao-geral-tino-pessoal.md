# Estudo: revisão geral do Tino pessoal e mudanças necessárias

Data: 2026-11-10 · Fase e item: Fase 7, itens 7.2 e 7.3 (e o pedido novo de
captura quase automática sem Open Finance)

## A pergunta

O que o Tino pessoal precisa mudar para ficar na linha dos grandes apps de
finanças (objetivo, fácil de preencher, mostra para onde o dinheiro vai,
ajuda a chegar nas metas, avisa na hora certa) e como compensar a falta de
Open Finance com anotação quase automática?

Pedido do Davi (10/11/2026): olhar como desenvolvedor, financeiro,
banqueiro, contador e usuário, com Pierre e Calen como referências.

## Como o site foi revisado

- As 23 telas do pessoal, em celular (390) e computador (1280), na conta
  demo (02/11/2026).
- O relatório de primeiro uso do Davi, montando a conta dele do zero
  (21/10/2026), com o extrato e as faturas reais.
- O código das rotas de captura, avisos e importação.

Não foi feito: teste com pessoa de fora (item 6.4) nem medição de uso real,
porque o app ainda não tem usuários além do Davi.

## Quem já faz

| Referência | O que faz | Resultado ou número | Fonte | Força |
|---|---|---|---|---|
| Pierre (Brasil, CloudWalk) | Finanças por conversa com IA: a pessoa pergunta e o app responde com os dados do banco, ligados por Open Finance. Tem Pierre MCP (outras IAs leem os dados) e planos PRO e Premium. | 165 mil usuários, 1,2 milhão de mensagens e R$ 800 milhões acompanhados, segundo a imprensa (sem data clara; os números variam entre as fontes) | [Let's Money](https://www.letsmoney.com.br/noticias/cloudwalk-pierre-ia-multiagente-financas-pessoais/), [Estado de Minas](https://www.em.com.br/mundo-corporativo/2026/03/7387214-pierre-usa-ia-para-simplificar-gestao-financeira.html), [App Store](https://apps.apple.com/app/id6749781755) | média |
| Calen (referência de desenho do Davi) | Menos técnico de primeira, mais fundo para quem quiser; a pessoa "só vê" na maior parte do tempo. Analisado por 36 capturas em 07/09/2026. | sem número público; a busca não achou o app | `docs/PROMPT-REDESIGN-CALEN.md` | fraca (só capturas) |
| Kelo (iPhone) | Paga com Apple Pay e o gasto é anotado sozinho; um toque para dar nome. Usa Atalhos, Toque Atrás e a automação do Apple Pay. Recurso do plano pago. | sem número público | [App Store](https://apps.apple.com/app/id6744532763) | forte no que faz, sem resultado |
| Automação "Transação" do iPhone | O app Atalhos dispara quando o cartão é usado na Carteira e entrega valor, loja e cartão. Falha quando a maquininha não devolve o registro ao Apple Pay. | tutoriais desde 2023 | [r/shortcuts](https://redlib.hbubli.cc/r/shortcuts/comments/17dqih9/tutorial_how_to_automatically_add_apple_pay), [Finny (concorrente)](https://getfinny.app/blog/ios-shortcuts-automations-flaky-fix) | média; a ressalva vem de concorrente |
| Mobills e Organizze (Brasil) | Controle de gastos; leem notificação do banco e SMS para lançar sozinhos; sincronização bancária só no plano pago. | Mobills R$ 19,90 por mês ou R$ 99,90 por ano; Organizze com preços divergentes entre as fontes | [Canaltech](https://canaltech.com.br/apps/organizze-ou-mobills-qual-aplicativo-melhor-para-controlar-gastos/), [Serasa](https://www.serasa.com.br/ensina/suas-economias/aplicativo-controle-financeiro) | média |
| YNAB (EUA) | Método: cada real tem função antes de ser gasto. Manual de propósito, com teste longo. | cerca de US$ 109 por ano | [comparativos de 2026](https://envelopebudgeting.com/articles/monarch-vs-ynab) | fraca (blogs) |
| Monarch e Copilot (EUA) | Painel da casa com pouco trabalho manual; Copilot ganha pelo desenho. | cerca de US$ 99,99 e US$ 95 por ano | [Sacra](https://sacra.com/c/monarch-money/), estudo de 07/10 | média |
| Endividamento no Brasil | 82% das famílias com dívida e 29,9% inadimplentes (Peic, agosto de 2026). | número oficial | estudo de 07/10/2026 | forte |

## O que a revisão achou, por olhar

### Como usuário (quem nunca usou)

1. **Não há roteiro de começo.** O app abre vazio e não diz a ordem: contas,
   renda, contas fixas, limites, extrato. O Davi precisou de ajuda de fora
   para montar a própria conta.
2. **Painel vazio assusta.** Sem dado nenhum aparecem "Saúde 50 de 100" e
   projeção negativa. Fere a regra 3 (número inventado).
3. **Repetição.** Aviso de privacidade grande em toda tela; título repetido
   pela aba; dois botões "+"; duas fileiras de abas na Análise; telas com o
   mesmo nome.
4. **Muitas telas para a mesma pergunta.** Análise, Fluxo de caixa,
   Simulador, Plano, Empréstimo, Reserva, Metas, Meu mês: oito telas de
   planejamento. Os grandes respondem "como estou" numa tela e deixam o
   resto um toque abaixo (Calen, Copilot).

### Como financeiro (para onde o dinheiro vai)

5. **A resposta "para onde foi" está espalhada.** Rosca no Início,
   categorias na Análise, gasto por limite no Meu mês. Falta uma tela só:
   categorias do mês, da maior para a menor, com a variação contra a média
   da própria pessoa.
6. **Transferência entre contas** ainda depende da importação detectar. Não
   há como lançar à mão "paguei a fatura" ou "mandei para a poupança".
7. **Meta não conversa com o mês.** A meta diz quanto guardar por mês, mas o
   Meu mês não reserva esse valor na sobra. Em YNAB e Monarch, a meta é uma
   linha do orçamento.

### Como banqueiro (crédito e risco)

8. **O ponto forte do Tino já é este**: plano de dívida com data de
   liberdade, custo real do empréstimo, comprometimento da renda com
   referência. Nenhum app brasileiro da tabela mostra isso na frente.
9. **Falta o aviso antes do problema.** Os 14 avisos existentes olham o
   estado (estourou, está baixo). Faltam os de calendário: fatura fecha em 3
   dias, parcela acaba mês que vem, renda extra termina em dezembro.
10. **Pix no crédito e parcelado** (achado na fatura do Davi) deveria virar
    dívida sozinho, com as parcelas que faltam.

### Como contador (confiança no número)

11. **Conferência com o banco.** A fatura já fecha com o total impresso. O
    extrato da conta não: falta "o saldo do Tino bate com o do banco em tal
    data?" e, se não bate, a diferença.
12. **Fechar o mês.** A loja tem; o pessoal não. Um resumo do mês fechado
    (entrou, saiu, guardou, dívida que caiu) é o que a pessoa mostra em casa.
13. **Renda de MEI e renda da casa** se misturam na conta da pessoa que tem
    os dois (caso do Davi: DAS pago pela conta pessoal).

### Como desenvolvedor

14. **O Tino é site instalável.** Por isso não lê notificação, não mostra
    janela por cima de outro app e não aparece no app Atalhos. É o que
    separa o Tino do Kelo e do Mobills hoje.
15. **A porta de entrada já existe** (`/api/capturar`, por chave) e todo
    gasto que chega cai em Conferir. O que falta é o lado do celular.
16. **Avisos sem push de verdade.** A notificação é local, renovada quando o
    app abre. Sem push, o aviso de calendário do item 9 não chega.

## Veredito

**Faz sentido mudar, em quatro frentes, nesta ordem.** O Tino tem mais
cálculo que os concorrentes brasileiros e menos facilidade. O trabalho é de
tirar e ligar, não de acrescentar tela.

### 1. Começo guiado (o que mais pesa para quem nunca usou)

- Roteiro "Montar o seu Tino" em 5 passos, com progresso (item 7.4 e opção
  C do passo 60).
- Painel sem dado diz "ainda sem dados", sem nota nem projeção.
- A IA do Tino conduz: pergunta, entende a resposta e propõe o lançamento;
  a pessoa confirma. É o que o Pierre faz por conversa, sem depender de
  Open Finance.

### 2. Anotar quase sozinho, no lugar do Open Finance

O que o Open Finance entrega e como o Tino supre:

| Open Finance entrega | Como suprir | Estado |
|---|---|---|
| Gasto entra na hora | Android: ler o aviso do banco. iPhone: automação do Apple Pay. Os dois com "Confirmar" por cima da tela | precisa de app nas lojas |
| Compra de outra pessoa da casa | Android lê o aviso do adicional; no iPhone, SMS do banco ou o Tino no celular dela | idem |
| Gasto em dinheiro e Pix | Toque atrás, botão na tela de bloqueio, voz, Telegram | parte pronta (Telegram, voz, atalho) |
| Histórico e fatura | Importar PDF, OFX e CSV, com conferência do total | pronto |
| Saldo exato | Não tem como. Conferência mensal com o extrato (item 11) | falta |

O que copiar do Kelo: um toque para confirmar. O que não copiar: lançar sem
conferência (regra 5). O que o Tino faz diferente: funciona nos dois
sistemas e pega a compra do casal.

**Decisão do Davi:** virar app da Play Store e da App Store (contas de
desenvolvedor: US$ 25 uma vez e US$ 99 por ano). Sem isso, só restam os
caminhos de montar atalho à mão, que ele já disse não querer.

### 3. Uma tela para cada pergunta

- **"Como estou?"** Início (não mexer, pedido do Davi).
- **"Para onde foi?"** Extrato com o resumo por categoria no alto (item 5).
- **"Quanto posso gastar?"** Meu mês, com a meta como linha (item 7).
- **"Quando saio da dívida e quando chego na meta?"** Uma tela de
  objetivos: metas, reserva e dívidas com data, no lugar de cinco telas.
- **"E se...?"** Simulador e empréstimo, um toque abaixo.

Passa pelo canvas (continuação do passo 60).

### 4. Avisos que chegam antes

- Push de verdade (VAPID), sem fornecedor pago.
- Avisos de calendário: fatura fecha, conta vence, parcela acaba, renda
  termina, meta atrasou.
- Resumo da semana por Telegram ou push: gastou, sobrou, o que vence.
- Cada aviso com a referência e um botão que resolve (regra 4).

### O que não fazer

- Não abrir mais telas de análise. Já há demais.
- Não prometer "automático" na venda: é "quase", com conferência.
- Não copiar o grátis com anúncio (lição do Mint, estudo de 07/10).

## Como medir

| Métrica | Meta | Referência |
|---|---|---|
| Conta montada em até 15 minutos por quem nunca usou | 4 de 5 pessoas no teste do item 6.4 | o Davi levou mais de uma sessão, com ajuda |
| Gastos que entram sem digitar (aviso, Apple Pay, importação) | 70% dos lançamentos do mês | hoje, na conta do Davi, só a importação |
| Tempo entre a compra e a conferência | mesmo dia em 80% dos casos | sem medida hoje |
| Diferença entre o saldo do Tino e o do banco no fim do mês | zero em 9 de 10 meses | sem medida hoje |
| Conversão do teste em assinatura, com e sem dívida cadastrada | medir antes de fixar meta | estudo de 07/10 |

As metas são propostas, não número de mercado: não há fonte pública de
ativação desses apps.

## Limites deste estudo

- Calen: só as capturas de setembro; a busca não achou página nem número.
- Pierre e Kelo: imprensa e página da loja; não usei os apps.
- Preços de Organizze, YNAB e dos planos do Pierre divergem entre as fontes.
- Resumos de busca; as páginas não abrem deste ambiente.
- Nada do lado do celular (Atalhos, leitura de aviso) foi testado em
  aparelho de verdade.

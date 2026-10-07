# Estudo: a tela de Assinatura e o botão do leão (6.2)

Data: 2026-10-07 · Fase e item: Fase 6, item 6.2 (telas que ainda não
passaram pelo canvas: Assinatura, da fila antiga, e o botão flutuante do
leão, achado no inventário 6.1)

## A pergunta

Como a tela de Assinatura deve mostrar o teste, os planos e o preço para
converter sem empurrar, e o que fazer com o botão do leão que cobre a ponta
direita de valores no celular?

## Quem já faz

| Referência | O que faz | Resultado ou número | Fonte | Força |
|---|---|---|---|---|
| RevenueCat, relatório de 2025 (mais de 75 mil apps, US$ 10 bilhões) | Teste de 17 a 32 dias converte 42,5% (mediana), contra 25,5% no teste de menos de 4 dias. Plano anual é 47% das assinaturas novas, puxado por mostrar o anual em "por mês" ao lado do mensal. Pedir a assinatura depois de um momento de valor dá 2,1 vezes mais testes iniciados que pedir logo na entrada. | dado agregado do setor | [Subscription Insider, resumo do relatório](https://subscriptioninsider.com/article-type/news/revenuecats-state-of-subscription-apps-2025-report-ais-dominance-retention-challenges-and-the-shift-away-from-pure-subscriptions) | média (resumo de terceiro) |
| O mesmo relatório | 72% dos anuais cancelam no primeiro ano, 30% já no primeiro mês. | retenção é o problema, não a venda | [Subscription Insider](https://subscriptioninsider.com/article-type/news/revenuecats-state-of-subscription-apps-2025-report-ais-dominance-retention-challenges-and-the-shift-away-from-pure-subscriptions) | média |
| Blinkist (Alemanha) | Trocou a lista de recursos por uma linha do tempo do teste: hoje começa, no dia tal chega um lembrete, no dia tal cobra. Quem lembra antes não se sente enganado. | 23% mais testes iniciados, 55% menos reclamações, e o aceite de notificação subiu de 6% para 74% | [UX Planet, relato da Blinkist](https://uxplanet.org/how-solving-our-biggest-customer-complaint-at-blinkist-led-to-a-23-increase-in-conversion-b60ad514134b), [RevenueCat, paywall no estilo Blinkist](https://www.revenuecat.com/blog/engineering/how-to-build-a-blinkist-style-paywall-using-revenuecat-webhooks-and-zapier) | média (relato da própria empresa) |
| Material Design (botão flutuante) | O botão flutuante pode sumir ao rolar para baixo quando atrapalha a leitura; o botão estendido encolhe ao rolar. Um botão flutuante por tela, só para a ação mais importante. | guia de desenho | [Icons8, guia do FAB](https://blog.icons8.com/articles/floating-action-button-ux-design/amp), [SAP Fiori para Android](https://www.sap.com/design-system/fiori-design-android/v26-4/components/buttons/fab/usage) | média |

## Veredito

- **Assinatura: mostrar o que a pessoa já fez no teste** (o momento de
  valor: dívidas cadastradas, plano montado), o anual em "por mês" ao lado
  do mensal, e a data em que o teste acaba. O teste de 14 dias fica (está
  na faixa que converte menos que o de 17 a 32 dias: hipótese a medir, a
  duração é decisão do Davi). Três opções no canvas, passo 52.
- **Botão do leão: sair do caminho do conteúdo.** No Tino pessoal já há o
  botão "+" no meio da barra de baixo; o leão é um segundo botão flutuante,
  contra a regra de um só. Três opções no canvas, passo 53: encolher ao
  rolar, ir para dentro da barra de baixo, ou ir para o topo, ao lado do
  sino.

## Como medir

- Assinatura: conversão do teste em pagante, e a parte que escolhe o anual.
- Leão: toques no assistente por semana antes e depois da mudança (mudar o
  lugar não pode derrubar o uso).

## Limites deste estudo

- Números do RevenueCat são de apps do mundo todo, não só do Brasil nem só
  de finanças.

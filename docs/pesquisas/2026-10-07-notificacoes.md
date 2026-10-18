# Estudo: a gaveta de Notificações (6.2)

Data: 2026-10-07 · Fase e item: Fase 6, item 6.2 (Notificações, da fila
antiga do canvas)

## A pergunta

A gaveta do sino do Tino pessoal mostra até 30 avisos na mesma lista, com o
mesmo peso: DAS atrasado ao lado de "Lazer passou do orçamento". Como
separar o que pede ação do que é só informação, sem a pessoa desligar tudo?

## Quem já faz

| Referência | O que faz | Resultado ou número | Fonte | Força |
|---|---|---|---|---|
| Apple, níveis de interrupção (iOS 15) | Quatro níveis: passivo (entra na lista sem som), ativo, sensível ao tempo (fura o resumo e o modo foco) e crítico. O resumo agendado junta o que pode esperar e entrega em horários escolhidos. | padrão do sistema | [WWDC 2021, sessão 10091](https://www.wwdcnotes.com/notes/wwdc21/10091), [OneSignal, iOS 15](https://onesignal.com/blog/how-to-improve-push-engagement-with-ios-15/) | forte (documentação da Apple resumida) |
| Pesquisas de cansaço de notificação | 46% desligariam as notificações depois de 2 a 5 mensagens numa semana; 32% largariam o app com 6 a 10. 63% dos americanos já apagaram um app por excesso de notificação. | pesquisas de opinião | [Mobile Marketing Magazine](https://mobilemarketingmagazine.com/?p=90128), [Solitaire Bliss, pesquisa nos EUA](https://www.solitairebliss.com/blog/the-state-of-notification-fatigue-in-america) | fraca a média (pesquisas de empresa) |
| Blinkist (estudo da Assinatura) | O aviso que a pessoa pediu (o lembrete antes de cobrar) foi aceito por 74%. | aviso útil é aceito | [UX Planet](https://uxplanet.org/how-solving-our-biggest-customer-complaint-at-blinkist-led-to-a-23-increase-in-conversion-b60ad514134b) | média |

## Veredito

- **Separar o que pede ação do que informa.** DAS atrasado e "falta
  dinheiro em janeiro" são do nível "sensível ao tempo"; categoria que
  passou do orçamento é passiva. Hoje os dois têm o mesmo peso e a lista
  passa de 15 itens, a faixa em que quase metade desliga.
- **Agrupar o repetido.** Quatro categorias que passaram do orçamento são
  um aviso ("4 categorias passaram"), não quatro.
- Três opções no canvas, passo 54: duas pilhas (fazer agora e para saber),
  resumo do dia, e agrupado por assunto.

## Como medir

- Avisos abertos (toque em "Abrir detalhes") sobre avisos mostrados.
- Vigias desligados por conta: se subir depois da mudança, piorou.

## Limites deste estudo

- As pesquisas de cansaço são dos EUA e de empresas do setor.

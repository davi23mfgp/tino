/**
 * Trabalhador de serviço do Tino.
 *
 * Existe por um motivo só: manter um atalho de lançar gasto na barra de
 * notificações do celular. Não guarda página em cache e não intercepta rede —
 * cache aqui traria tela velha mostrando saldo velho, que é pior do que
 * carregar de novo.
 *
 * Limite honesto da web: notificação de site **não aceita responder com texto
 * dentro dela** (a Notification API tem botão, não campo). Então o atalho abre
 * a tela `/lancar`, que é campo, microfone e nada mais. Responder de dentro da
 * notificação só existe em aplicativo nativo — ou pelo WhatsApp, que o Tino já
 * atende.
 */

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (evento) => evento.waitUntil(self.clients.claim()))

/**
 * O lembrete diário chegando do servidor.
 *
 * O push não traz dinheiro nenhum: só o pedido de repor o atalho. Conteúdo de
 * notificação aparece na tela de bloqueio, e saldo na tela de bloqueio é
 * problema de quem perde o celular.
 */
self.addEventListener("push", (evento) => {
  evento.waitUntil(
    self.registration.showNotification("Gastou alguma coisa?", {
      body: "Toque para anotar em cinco segundos.",
      tag: "tino-lancar",
      icon: "/icones/icone-192.png",
      badge: "/icones/icone-192.png",
      requireInteraction: true,
      silent: true,
      actions: [
        { action: "anotar", title: "Anotar" },
        { action: "ditar", title: "Ditar" },
      ],
    }),
  )
})

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close()

  const destino = evento.action === "ditar" ? "/lancar?modo=voz" : "/lancar"

  evento.waitUntil(
    (async () => {
      const abertas = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      // Reaproveita a aba do Tino que já estiver aberta: abrir uma segunda
      // deixa a pessoa com duas sessões do mesmo app na gaveta de tarefas.
      for (const cliente of abertas) {
        if (new URL(cliente.url).origin === self.location.origin) {
          await cliente.navigate(destino)
          return cliente.focus()
        }
      }
      return self.clients.openWindow(destino)
    })(),
  )
})

"use client"

import { useCallback, useEffect, useState } from "react"

/**
 * O atalho de lançar, fixo na barra de notificações.
 *
 * Pedido do Davi em 15/09/2026: uma notificação parada no celular onde dê para
 * ditar ou digitar o gasto. O que a web permite, e o que não permite:
 *
 * - **Permite** uma notificação que não some sozinha (`requireInteraction`),
 *   silenciosa, com dois botões — e o toque abre a tela de lançar. Com o push
 *   ligado, ela também volta sozinha uma vez por dia, mesmo com o app fechado.
 * - **Não permite** escrever dentro da própria notificação: a API tem botão,
 *   não campo de texto. Responder ali dentro só existe em aplicativo nativo,
 *   ou pelo WhatsApp, que o Tino já atende.
 *
 * A notificação é criada pelo próprio aparelho quando o app abre, e o servidor
 * a repõe uma vez por dia por push. Não há fornecedor no meio: o par de chaves
 * VAPID identifica este servidor e o navegador entrega de graça. Sem as chaves
 * no ambiente, tudo continua funcionando — só não volta sozinha.
 */

const CHAVE = "tino:atalho-de-lancar"
const MARCA = "tino-lancar"

/**
 * A chave pública do VAPID vem como texto em base64url e o navegador quer
 * bytes. É a única tradução que este arquivo faz.
 */
function chaveParaBytes(base64: string) {
  const completo = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")
  const cru = atob(completo)
  return Uint8Array.from([...cru].map((letra) => letra.charCodeAt(0)))
}

/**
 * Inscreve este aparelho para o lembrete diário.
 *
 * Falhar aqui não desliga o atalho: sem push, a notificação continua sendo
 * reposta toda vez que o Tino abre. É degradação, não quebra.
 */
async function inscreverNoPush() {
  try {
    const registro = await navigator.serviceWorker.ready
    const { configurado, chavePublica } = await fetch("/api/push").then((r) => r.json())
    if (!configurado || !chavePublica) return

    const inscricao =
      (await registro.pushManager.getSubscription()) ??
      (await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: chaveParaBytes(chavePublica),
      }))

    const dados = inscricao.toJSON() as { endpoint?: string; keys?: { p256dh: string; auth: string } }
    if (!dados.endpoint || !dados.keys) return

    await fetch("/api/push", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint: dados.endpoint, chaves: dados.keys }),
    })
  } catch {
    // Navegador sem push, permissão parcial, rede fora: o atalho local segue.
  }
}

export function usarAtalhoDeLancar() {
  const [suportado, setSuportado] = useState(false)
  const [ligado, setLigado] = useState(false)

  useEffect(() => {
    const temTudo = typeof window !== "undefined" && "serviceWorker" in navigator && "Notification" in window
    setSuportado(temTudo)
    if (!temTudo) return

    try {
      setLigado(localStorage.getItem(CHAVE) === "1")
    } catch {
      // Navegador com armazenamento bloqueado: o atalho fica desligado, e a
      // tela continua funcionando.
    }
  }, [])

  const mostrar = useCallback(async () => {
    const registro = await navigator.serviceWorker.register("/sw.js")
    await navigator.serviceWorker.ready
    await registro.showNotification("Gastou alguma coisa?", {
      body: "Toque para anotar em cinco segundos.",
      tag: MARCA,
      icon: "/icones/icone-192.png",
      badge: "/icones/icone-192.png",
      requireInteraction: true,
      silent: true,
      actions: [
        { action: "anotar", title: "Anotar" },
        { action: "ditar", title: "Ditar" },
      ],
    } as NotificationOptions & { actions: { action: string; title: string }[] })
  }, [])

  const ligar = useCallback(async () => {
    const permissao = await Notification.requestPermission()
    if (permissao !== "granted") return false

    await mostrar()
    await inscreverNoPush()
    try {
      localStorage.setItem(CHAVE, "1")
    } catch {
      // Sem armazenamento o atalho vale só para esta sessão.
    }
    setLigado(true)
    return true
  }, [mostrar])

  const desligar = useCallback(async () => {
    // Desligar de verdade: apagar só o armazenamento local deixaria o servidor
    // mandando para um aparelho que pediu para parar, e notificação que volta
    // depois de desligada é o que faz desinstalar o app.
    try {
      const registro = await navigator.serviceWorker.getRegistration()
      const inscricao = await registro?.pushManager.getSubscription()
      if (inscricao) {
        await fetch(`/api/push?endpoint=${encodeURIComponent(inscricao.endpoint)}`, { method: "DELETE" })
        await inscricao.unsubscribe()
      }
    } catch {
      // Sem push ligado não há o que desinscrever.
    }

    try {
      localStorage.setItem(CHAVE, "0")
    } catch {
      // Idem: só esta sessão.
    }
    setLigado(false)

    const registro = await navigator.serviceWorker.getRegistration()
    const abertas = (await registro?.getNotifications({ tag: MARCA })) ?? []
    for (const notificacao of abertas) notificacao.close()
  }, [])

  return { suportado, ligado, ligar, desligar, mostrar }
}

/**
 * Renova a notificação sempre que o app abre, se a pessoa já ligou o atalho.
 * Sem isso ela desapareceria na primeira limpeza da gaveta e não voltaria.
 */
export function RenovarAtalhoDeLancar() {
  const { ligado, mostrar } = usarAtalhoDeLancar()

  useEffect(() => {
    if (!ligado || Notification.permission !== "granted") return
    void mostrar()
  }, [ligado, mostrar])

  return null
}

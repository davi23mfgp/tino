"use client"

import { useCallback, useEffect, useState } from "react"

/**
 * O atalho de lançar, fixo na barra de notificações.
 *
 * Pedido do Davi em 15/09/2026: uma notificação parada no celular onde dê para
 * ditar ou digitar o gasto. O que a web permite, e o que não permite:
 *
 * - **Permite** uma notificação que não some sozinha (`requireInteraction`),
 *   silenciosa, com dois botões — e o toque abre a tela de lançar.
 * - **Não permite** escrever dentro da própria notificação: a API tem botão,
 *   não campo de texto. Responder ali dentro só existe em aplicativo nativo,
 *   ou pelo WhatsApp, que o Tino já atende.
 *
 * A notificação é local, criada pelo próprio aparelho quando o app abre — não
 * há servidor de push, nem chave de fornecedor, nem custo. O preço disso é
 * honesto: ela é renovada quando o Tino é aberto, e o Android pode limpá-la
 * junto com as outras.
 */

const CHAVE = "tino:atalho-de-lancar"
const MARCA = "tino-lancar"

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
    try {
      localStorage.setItem(CHAVE, "1")
    } catch {
      // Sem armazenamento o atalho vale só para esta sessão.
    }
    setLigado(true)
    return true
  }, [mostrar])

  const desligar = useCallback(async () => {
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

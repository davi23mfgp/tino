import webpush from "web-push"

import { prisma } from "@/lib/prisma"

/**
 * Notificação empurrada para o aparelho.
 *
 * Não há fornecedor no meio: o par de chaves VAPID identifica este servidor, o
 * navegador devolve um endereço próprio para cada aparelho, e o Google e a
 * Mozilla só entregam o pacote — cifrado, que nem eles leem. Custo zero e
 * nenhuma conta para criar. É por isso que este caminho foi escolhido em vez
 * de um serviço de notificação pago.
 *
 * O que ela faz no Tino é uma coisa só: repor o atalho de lançar na barra de
 * notificações de quem ligou. Não manda saldo, não manda valor, não manda nome
 * de estabelecimento — o conteúdo de um push fica guardado no aparelho e
 * aparece na tela de bloqueio, e dinheiro na tela de bloqueio é problema de
 * quem perde o celular.
 */

export function pushConfigurado() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

let configurado = false

function configurar() {
  if (configurado) return
  const publica = process.env.VAPID_PUBLIC_KEY
  const privada = process.env.VAPID_PRIVATE_KEY
  if (!publica || !privada) throw new Error("VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY não estão no ambiente.")

  // O "assunto" é exigência do padrão: um jeito de o serviço de push falar com
  // o dono do servidor se algo der errado. Sem domínio próprio no ambiente,
  // cai no e-mail de suporte.
  webpush.setVapidDetails(
    process.env.VAPID_ASSUNTO ?? "mailto:suporte@tino.app",
    publica,
    privada,
  )
  configurado = true
}

export interface Inscricao {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Manda uma notificação e limpa a inscrição quando o aparelho some.
 *
 * 404 e 410 do serviço de push significam "este endereço não existe mais" —
 * app desinstalado, notificações revogadas, navegador reinstalado. Guardar
 * inscrição morta faz o envio diário ficar mais lento a cada mês e não entrega
 * nada, então ela sai do banco na hora.
 */
export async function empurrar(inscricao: Inscricao, carga: Record<string, unknown>) {
  configurar()

  try {
    await webpush.sendNotification(
      {
        endpoint: inscricao.endpoint,
        keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
      },
      JSON.stringify(carga),
    )
    await prisma.inscricaoPush.update({
      where: { id: inscricao.id },
      data: { ultimoEnvio: new Date() },
    })
    return true
  } catch (falha) {
    const codigo = (falha as { statusCode?: number }).statusCode
    if (codigo === 404 || codigo === 410) {
      await prisma.inscricaoPush.delete({ where: { id: inscricao.id } }).catch(() => {})
      return false
    }
    throw falha
  }
}

import { comSessao, corpo, exigir, ok } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { pushConfigurado, empurrar } from "@/lib/push"

export const dynamic = "force-dynamic"

/**
 * Inscrição do aparelho para o atalho de lançar voltar sozinho.
 *
 * GET devolve a chave pública e se este aparelho já está inscrito — o cliente
 * precisa das duas coisas antes de pedir permissão, e a chave pública é
 * pública mesmo: ela identifica o servidor, não autoriza nada.
 *
 * POST guarda ou atualiza a inscrição. O endereço é único: o mesmo navegador
 * que se inscreve de novo (depois de limpar dados, por exemplo) atualiza a
 * linha em vez de criar uma segunda, senão a pessoa receberia o lembrete em
 * duplicata para sempre.
 *
 * DELETE desliga de verdade. Apagar só o `localStorage` do aparelho deixaria o
 * servidor mandando para um aparelho que pediu para parar — e notificação que
 * volta depois de desligada é o tipo de coisa que faz desinstalar o app.
 */

export const GET = comSessao(async (sessao, requisicao) => {
  const endpoint = new URL(requisicao.url).searchParams.get("endpoint")

  return ok({
    configurado: pushConfigurado(),
    chavePublica: process.env.VAPID_PUBLIC_KEY ?? null,
    inscrito: endpoint
      ? Boolean(await prisma.inscricaoPush.findFirst({ where: { endpoint, usuarioId: sessao.usuarioId } }))
      : false,
  })
})

export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{
    endpoint: string
    chaves: { p256dh: string; auth: string }
    hora?: number
    testar?: boolean
  }>(requisicao)

  const endpoint = exigir(dados.endpoint, "Endereço do aparelho")
  const p256dh = exigir(dados.chaves?.p256dh, "Chave do aparelho")
  const auth = exigir(dados.chaves?.auth, "Chave do aparelho")
  // Fora de 0–23 não existe hora; o valor vem do cliente e não se confia nele.
  const hora = Math.min(23, Math.max(0, Math.trunc(dados.hora ?? 20)))

  const inscricao = await prisma.inscricaoPush.upsert({
    where: { endpoint },
    create: { usuarioId: sessao.usuarioId, endpoint, p256dh, auth, hora },
    update: { usuarioId: sessao.usuarioId, p256dh, auth, hora },
  })

  // Um envio imediato quando a pessoa pede, para ela ver funcionando agora em
  // vez de descobrir amanhã se funcionou.
  if (dados.testar && pushConfigurado()) {
    await empurrar(inscricao, { tipo: "atalho" })
  }

  return ok({ id: inscricao.id, hora: inscricao.hora }, 201)
})

export const DELETE = comSessao(async (sessao, requisicao) => {
  const endpoint = new URL(requisicao.url).searchParams.get("endpoint")
  if (endpoint) {
    await prisma.inscricaoPush.deleteMany({ where: { endpoint, usuarioId: sessao.usuarioId } })
  } else {
    // Sem endereço, desliga esta pessoa em todos os aparelhos. É o que alguém
    // que perdeu o celular espera do botão de desligar.
    await prisma.inscricaoPush.deleteMany({ where: { usuarioId: sessao.usuarioId } })
  }
  return ok({ desligado: true })
})

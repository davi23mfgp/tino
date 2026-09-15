import { prisma } from "@/lib/prisma"
import { comSessao, corpo, exigir, ok } from "@/lib/api"
import { competenciaAtual } from "@/lib/datas"
import { montarPanorama } from "@/lib/tino/panorama"
import { responderPorRegras } from "@/lib/tino/chat"
import { ehBuscaDeDocumento, procurarDocumento } from "@/lib/tino/documentos"
import { modeloDisponivel, responderComModeloStream, type TurnoConversa } from "@/lib/tino/modelo"

// O chat lê o panorama inteiro do banco a cada pergunta: resposta financeira
// vale pelo número atual, não por um cache de minutos atrás.
export const dynamic = "force-dynamic"

export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ pergunta: string; conversaId?: string }>(requisicao)
  const pergunta = exigir(dados.pergunta, "Escreva sua pergunta").trim()

  const conversa = dados.conversaId
    ? await prisma.conversa.findFirst({ where: { id: dados.conversaId, larId: sessao.larId } })
    : await prisma.conversa.create({
        data: {
          larId: sessao.larId,
          usuarioId: sessao.usuarioId,
          // O título vem da primeira pergunta: lista de conversas com "Nova
          // conversa" repetido não ajuda ninguém a se achar depois.
          titulo: pergunta.slice(0, 60),
        },
      })

  if (!conversa) return ok({ erro: "Conversa não encontrada." }, 404)

  await prisma.mensagem.create({
    data: { conversaId: conversa.id, papel: "USUARIO", texto: pergunta },
  })

  // Procurar papel vem antes do motor de regras: "acha o comprovante do
  // aluguel" cairia nele como pergunta qualquer e sairia com um panorama que
  // ninguém pediu.
  if (ehBuscaDeDocumento(pergunta)) {
    const texto = await procurarDocumento(sessao.larId, pergunta)
    await prisma.mensagem.create({
      data: { conversaId: conversa.id, papel: "ASSISTENTE", texto },
    })
    return ok({ texto, fonte: "regras", conversaId: conversa.id })
  }

  const panorama = await montarPanorama(sessao.larId, competenciaAtual())
  const porRegras = responderPorRegras(pergunta, panorama)

  if (porRegras) {
    await prisma.mensagem.create({
      data: {
        conversaId: conversa.id,
        papel: "ASSISTENTE",
        texto: porRegras.texto,
        contexto: (porRegras.contexto ?? {}) as object,
      },
    })
    return ok({ ...porRegras, conversaId: conversa.id })
  }

  if (!modeloDisponivel()) {
    const texto =
      "Essa eu não sei responder sozinho. Posso te ajudar com saldo, gastos por categoria, dívidas, metas, reserva, projeção, empréstimo e MEI — é só perguntar de um desses jeitos."
    await prisma.mensagem.create({ data: { conversaId: conversa.id, papel: "ASSISTENTE", texto } })
    return ok({ texto, fonte: "regras", conversaId: conversa.id })
  }

  const anteriores = await prisma.mensagem.findMany({
    where: { conversaId: conversa.id },
    orderBy: { criadoEm: "asc" },
    // Últimas 20 mensagens: contexto suficiente para a conversa seguir, sem
    // reenviar meses de histórico a cada pergunta.
    take: 20,
  })

  const historico: TurnoConversa[] = anteriores
    .slice(0, -1)
    .map((mensagem) => ({ papel: mensagem.papel, texto: mensagem.texto }))

  const fluxo = responderComModeloStream({
    pergunta,
    panorama,
    historico,
    aoConcluir: async (textoCompleto) => {
      await prisma.mensagem.create({
        data: { conversaId: conversa.id, papel: "ASSISTENTE", texto: textoCompleto },
      })
    },
  })

  return new Response(fluxo, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Conversa-Id": conversa.id,
      "Cache-Control": "no-store",
    },
  })
})

export const GET = comSessao(async (sessao, requisicao) => {
  const conversaId = new URL(requisicao.url).searchParams.get("conversaId")

  if (!conversaId) {
    return ok(
      await prisma.conversa.findMany({
        where: { larId: sessao.larId },
        orderBy: { atualizadoEm: "desc" },
        take: 30,
      }),
    )
  }

  return ok(
    await prisma.conversa.findFirst({
      where: { id: conversaId, larId: sessao.larId },
      include: { mensagens: { orderBy: { criadoEm: "asc" } } },
    }),
  )
})

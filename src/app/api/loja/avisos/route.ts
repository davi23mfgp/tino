import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { avisosDaLoja } from "@/lib/loja/ordens"
import { rotuloCompetencia } from "@/lib/datas"
import { diaNoFuso } from "@/lib/loja/contas"
import { lembreteDoRelatorio, mesParaFechar } from "@/lib/loja/relatorio-mei"
import { dadosDoRelatorio } from "@/lib/loja/relatorio-mei-dados"
import { campo, validar, z } from "@/lib/validar"

export const dynamic = "force-dynamic"

/** O sino do MEI: grava os lembretes do dia e devolve os avisos recentes. */
export const GET = comSessao(async (sessao) => {
  const loja = await lojaDoLar(sessao.larId)
  const lar = await prisma.lar.findUnique({ where: { id: sessao.larId }, select: { fusoHorario: true } })

  // O lembrete do dia 20 (passo 41): um aviso por mês, com o texto acompanhando
  // a contagem de pendências. Sem pendência o aviso anterior segue na lista, já
  // lido ou não, mas deixa de ser reescrito.
  const hoje = diaNoFuso(new Date(), lar?.fusoHorario ?? "America/Sao_Paulo")
  const mes = mesParaFechar(hoje)
  const relatorio = await dadosDoRelatorio(sessao.larId, mes)
  const lembrete = relatorio && lembreteDoRelatorio({ competencia: mes, hoje, pendentes: relatorio.pendentes, vendas: relatorio.vendas.length, prazo: relatorio.prazo, nomeDoMes: rotuloCompetencia(mes) })
  if (lembrete) {
    // O texto muda com a contagem: atualiza o aviso do mês em vez de criar outro (a chave é uma por mês).
    await prisma.avisoLoja.upsert({
      where: { lojaId_chave: { lojaId: loja.id, chave: lembrete.chave } },
      create: { lojaId: loja.id, chave: lembrete.chave, tipo: lembrete.tipo, titulo: lembrete.titulo, texto: lembrete.texto, rota: lembrete.rota, acao: lembrete.acao },
      update: { titulo: lembrete.titulo, texto: lembrete.texto },
    })
  }

  return ok({ avisos: await avisosDaLoja(loja.id, lar?.fusoHorario) })
})

/** Marca como lidos os avisos indicados, ou todos. */
export const PATCH = comSessao(async (sessao, requisicao) => {
  const { ids } = validar(z.object({ ids: z.array(campo.id()).max(100).optional() }), await corpo(requisicao))
  const loja = await lojaDoLar(sessao.larId)
  const feitos = await prisma.avisoLoja.updateMany({ where: { lojaId: loja.id, lidoEm: null, ...(ids ? { id: { in: ids } } : {}) }, data: { lidoEm: new Date() } })
  return ok({ lidos: feitos.count })
})

import { prisma } from "@/lib/prisma"
import { comSessao, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { diaNoFuso } from "@/lib/loja/contas"
import { contarPorDia, itensDoDia, semanaDe } from "@/lib/loja/agenda"
import { paraOrdemDia, SELECAO_ORDEM } from "@/lib/loja/ordens"

export const dynamic = "force-dynamic"

/**
 * A agenda de um dia (padrão: hoje no fuso do lar), a semana com a contagem
 * de cada dia e as ordens de serviço que ainda não foram entregues.
 */
export const GET = comSessao(async (sessao, requisicao) => {
  const loja = await lojaDoLar(sessao.larId)
  const lar = await prisma.lar.findUnique({ where: { id: sessao.larId }, select: { fusoHorario: true } })
  const fuso = lar?.fusoHorario
  const agora = new Date()
  const hoje = diaNoFuso(agora, fuso)
  const pedido = new URL(requisicao.url).searchParams.get("dia")
  const dia = pedido && /^\d{4}-\d{2}-\d{2}$/.test(pedido) ? pedido : hoje
  const semana = semanaDe(dia)
  // Uma folga de um dia de cada lado cobre a diferença entre o fuso e o UTC.
  const de = new Date(Date.parse(`${semana[0]!.dia}T00:00:00Z`) - 86_400_000)
  const ate = new Date(Date.parse(`${semana[6]!.dia}T00:00:00Z`) + 2 * 86_400_000)

  const [compromissos, ordens, passos, clientes, usados] = await Promise.all([
    prisma.compromissoLoja.findMany({
      where: { lojaId: loja.id, inicioEm: { gte: de, lt: ate } },
      include: { cliente: { select: { nome: true } }, ordem: { select: { numero: true } } },
    }),
    prisma.ordemServicoLoja.findMany({
      where: { lojaId: loja.id, OR: [{ etapa: { not: "ENTREGUE" } }, { atualizadoEm: { gte: new Date(agora.getTime() - 7 * 86_400_000) } }] },
      orderBy: [{ prazoEm: { sort: "asc", nulls: "last" } }, { numero: "asc" }],
      select: SELECAO_ORDEM,
    }),
    prisma.clienteLoja.findMany({
      where: { lojaId: loja.id, proximoPasso: { not: null }, proximoPassoEm: { gte: de, lt: ate } },
      select: { id: true, nome: true, proximoPasso: true, proximoPassoEm: true },
    }),
    prisma.clienteLoja.findMany({ where: { lojaId: loja.id }, orderBy: { nome: "asc" }, select: { id: true, nome: true, telefone: true } }),
    // Os modelos que a loja já atendeu sobem para o topo da busca da entrada.
    prisma.ordemServicoLoja.findMany({
      where: { lojaId: loja.id, aparelhoModelo: { not: null } }, orderBy: { criadoEm: "desc" }, take: 200, select: { aparelhoModelo: true },
    }),
  ])

  const fontes = {
    compromissos: compromissos.map((c) => ({ id: c.id, titulo: c.titulo, detalhe: c.detalhe, inicioEm: c.inicioEm, diaInteiro: c.diaInteiro, feitoEm: c.feitoEm, cliente: c.cliente?.nome ?? null, ordemNumero: c.ordem?.numero ?? null })),
    ordens: ordens.map(paraOrdemDia),
    passos: passos.map((p) => ({ clienteId: p.id, cliente: p.nome, proximoPasso: p.proximoPasso!, proximoPassoEm: p.proximoPassoEm! })),
  }
  const contagem = contarPorDia(semana, fontes, agora, fuso)
  return ok({
    loja: { nome: loja.nome, area: loja.area, subarea: loja.subarea },
    hoje,
    dia,
    semana: semana.map((d) => ({ ...d, quantidade: contagem[d.dia] ?? 0 })),
    itens: itensDoDia(dia, fontes, agora, fuso),
    ordens: ordens.map(({ linkToken: _token, ...o }) => o),
    clientes,
    modelosUsados: [...new Set(usados.map((linha) => linha.aparelhoModelo!))].slice(0, 40),
  })
})

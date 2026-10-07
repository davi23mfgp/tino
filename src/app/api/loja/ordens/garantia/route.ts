import { prisma } from "@/lib/prisma"
import { comSessao, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { procurarGarantia } from "@/lib/loja/assistencia"

export const dynamic = "force-dynamic"

/**
 * Na entrada, o aparelho já passou por aqui e ainda está na garantia? A tela
 * pergunta enquanto a pessoa digita o IMEI ou escolhe o cliente e o modelo, e
 * propõe marcar como retorno em garantia; quem decide é a loja.
 */
export const GET = comSessao(async (sessao, requisicao) => {
  const loja = await lojaDoLar(sessao.larId)
  const parametros = new URL(requisicao.url).searchParams
  const serie = (parametros.get("serie") ?? "").slice(0, 40)
  const modelo = (parametros.get("modelo") ?? "").slice(0, 80)
  const nome = (parametros.get("cliente") ?? "").trim().replace(/\s+/g, " ").slice(0, 80)
  const cliente = nome ? await prisma.clienteLoja.findFirst({ where: { lojaId: loja.id, nome: { equals: nome, mode: "insensitive" } }, select: { id: true } }) : null
  // Só as entregues dos últimos 90 dias podem estar na garantia.
  const desde = new Date(Date.now() - 91 * 86_400_000)
  const candidatas = await prisma.ordemServicoLoja.findMany({
    where: { lojaId: loja.id, etapa: "ENTREGUE", atualizadoEm: { gte: desde } },
    select: { id: true, numero: true, servico: true, clienteId: true, aparelhoSerie: true, aparelhoModelo: true, etapasEm: true },
  })
  const achada = procurarGarantia(
    candidatas.map((linha) => ({ ...linha, etapasEm: linha.etapasEm as Record<string, string> | null })),
    { serie, modelo, clienteId: cliente?.id ?? null },
    new Date(),
  )
  if (!achada) return ok({ garantia: null })
  return ok({
    garantia: {
      id: achada.ordem.id, numero: achada.ordem.numero, servico: achada.ordem.servico, por: achada.por,
      entregueEm: achada.ordem.etapasEm?.ENTREGUE ?? null, ate: achada.ate.toISOString(), diasRestantes: achada.diasRestantes,
    },
  })
})

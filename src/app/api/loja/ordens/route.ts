import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ErroDeUso, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { novoToken } from "@/lib/loja/clientes"
import { proximoNumeroDeOrdem } from "@/lib/loja/ordens"
import { campo, validar, z } from "@/lib/validar"
import { esquemaDoAparelho, gravacaoDoAparelho } from "@/lib/loja/entrada-aparelho"
import { garantiaDoConserto } from "@/lib/loja/assistencia"

/**
 * Abre uma ordem de serviço. Vinda de orçamento, herda o cliente, o valor e
 * o que fazer; um orçamento abre uma OS só (a segunda tentativa devolve a
 * primeira, em vez de duplicar o aparelho na bancada).
 */
export const POST = comSessao(async (sessao, requisicao) => {
  const dados = validar(
    z.object({
      orcamentoId: campo.id().optional(),
      clienteId: campo.id().optional(),
      clienteNome: campo.texto(80).optional(),
      clienteTelefone: campo.texto(20).optional(),
      objeto: campo.texto(120).optional(),
      servico: campo.texto(160).optional(),
      naEntrada: campo.texto(500).nullable().optional(),
      prazoEm: campo.data().nullable().optional(),
      valorCentavos: campo.centavos().nullable().optional(),
      checklist: z.array(campo.textoObrigatorio(120)).max(30).optional(),
      aparelho: esquemaDoAparelho.optional(),
      garantiaDeId: campo.id().optional(),
    }),
    await corpo(requisicao),
  )
  const loja = await lojaDoLar(sessao.larId)

  let clienteId = dados.clienteId
  let valorCentavos = dados.valorCentavos ?? null
  let servico = dados.servico?.trim() ?? ""
  if (dados.orcamentoId) {
    const orcamento = await prisma.orcamentoLoja.findFirst({
      where: { id: dados.orcamentoId, lojaId: loja.id },
      select: { id: true, status: true, clienteId: true, totalCentavos: true, itens: { orderBy: { ordem: "asc" }, select: { descricao: true } }, ordemServico: { select: { id: true, numero: true } } },
    })
    if (!orcamento) throw new ErroDeUso("Orçamento não encontrado.", 404)
    if (orcamento.ordemServico) return ok({ ordem: orcamento.ordemServico, existente: true })
    if (orcamento.status === "RASCUNHO" || orcamento.status === "PERDIDO") throw new ErroDeUso("Só orçamento enviado, aprovado ou vendido abre ordem de serviço.", 409)
    clienteId = orcamento.clienteId
    valorCentavos = valorCentavos ?? orcamento.totalCentavos
    servico = servico || orcamento.itens.map((item) => item.descricao).join(", ").slice(0, 160)
  }
  if (clienteId) {
    if (!(await prisma.clienteLoja.count({ where: { id: clienteId, lojaId: loja.id } }))) throw new ErroDeUso("Cliente não encontrado.", 404)
  } else {
    const nome = dados.clienteNome?.trim().replace(/\s+/g, " ")
    if (!nome) throw new ErroDeUso("Diga de quem é o serviço.")
    const existente = await prisma.clienteLoja.findFirst({ where: { lojaId: loja.id, nome: { equals: nome, mode: "insensitive" } }, orderBy: { criadoEm: "asc" } })
    clienteId = existente?.id ?? (await prisma.clienteLoja.create({ data: { lojaId: loja.id, nome, telefone: dados.clienteTelefone || null } })).id
  }
  // Com a entrada do aparelho, o "o que ficou com a loja" sai do modelo e da
  // cor: a lista de OS e o link do cliente continuam lendo `objeto`.
  const objeto = dados.objeto?.trim() || [dados.aparelho?.modelo, dados.aparelho?.cor].filter(Boolean).join(" ").trim()
  if (!objeto) throw new ErroDeUso("Diga o que ficou com a loja (o aparelho, a peça).")
  if (!servico) throw new ErroDeUso("Diga o que vai ser feito.")

  const agora = new Date()
  // Retorno em garantia: a loja confirmou na tela. Confere aqui de novo que a
  // OS de antes é desta loja e que a garantia ainda vale, senão o vínculo
  // diria "na garantia" de um conserto que já saiu dela.
  let garantiaDeId: string | null = null
  if (dados.garantiaDeId) {
    const anterior = await prisma.ordemServicoLoja.findFirst({ where: { id: dados.garantiaDeId, lojaId: loja.id }, select: { id: true, etapasEm: true } })
    const garantia = anterior ? garantiaDoConserto(anterior.etapasEm as Record<string, string> | null, agora) : null
    if (!anterior || !garantia?.comecou || !garantia.vigente) throw new ErroDeUso("Essa OS não está mais na garantia.", 409)
    garantiaDeId = anterior.id
  }
  const linkToken = novoToken()
  const aparelho = dados.aparelho ? gravacaoDoAparelho(dados.aparelho, linkToken) : {}
  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    try {
      const ordem = await prisma.$transaction(async (transacao) =>
        transacao.ordemServicoLoja.create({
          data: {
            lojaId: loja.id,
            numero: await proximoNumeroDeOrdem(transacao, loja.id),
            clienteId: clienteId!,
            objeto,
            servico,
            naEntrada: dados.naEntrada || null,
            prazoEm: dados.prazoEm ?? null,
            valorCentavos,
            etapasEm: { RECEBIDO: agora.toISOString() },
            checklist: (dados.checklist ?? []).map((texto) => ({ texto, feito: false })),
            orcamentoId: dados.orcamentoId ?? null,
            linkToken,
            garantiaDeId,
            ...aparelho,
          },
          select: { id: true, numero: true },
        }),
      )
      return ok({ ordem, existente: false }, 201)
    } catch (excecao) {
      if (!(excecao instanceof Prisma.PrismaClientKnownRequestError && excecao.code === "P2002") || tentativa === 2) throw excecao
    }
  }
  throw new ErroDeUso("Não consegui numerar a ordem de serviço. Tente de novo.")
})

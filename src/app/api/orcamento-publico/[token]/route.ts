import { prisma } from "@/lib/prisma"
import { comPublica, corpo, ErroDeUso, erro, ok } from "@/lib/api"
import { consumirLimite, ipDaRequisicao, LimiteEstourado, REGRAS } from "@/lib/limite"
import { paraResumoSimples, situacaoDoOrcamento } from "@/lib/loja/orcamento"
import { validar, z } from "@/lib/validar"

export const dynamic = "force-dynamic"

const TOKEN_VALIDO = /^[A-Za-z0-9_-]{32}$/

/**
 * O cliente aprova pelo link. Sem sessão: o segredo é o próprio link.
 *
 * Só aprova o enviado dentro da validade, e só uma vez. Vencido não aprova:
 * o preço de semana passada pode não valer mais, e quem decide renovar é a
 * loja.
 */
export async function POST(requisicao: Request, contexto: { params: Promise<{ token: string }> }) {
  return comPublica(async () => {
    try {
      await consumirLimite(`orcamento:ip:${ipDaRequisicao(requisicao)}`, REGRAS.publico)
    } catch (excecao) {
      if (excecao instanceof LimiteEstourado) return erro(excecao.message, 429)
      throw excecao
    }
    const { token } = await contexto.params
    validar(z.object({ acao: z.literal("aprovar") }), await corpo(requisicao))
    if (!TOKEN_VALIDO.test(token)) throw new ErroDeUso("Orçamento não encontrado.", 404)

    const orcamento = await prisma.orcamentoLoja.findUnique({
      where: { linkToken: token },
      include: { loja: { select: { lar: { select: { fusoHorario: true } } } }, cliente: { select: { nome: true } } },
    })
    if (!orcamento || orcamento.status === "RASCUNHO") throw new ErroDeUso("Orçamento não encontrado.", 404)
    const situacao = situacaoDoOrcamento(paraResumoSimples(orcamento), new Date(), orcamento.loja.lar.fusoHorario)
    if (situacao === "vencido") throw new ErroDeUso("Este orçamento venceu. Peça um novo para a loja.", 409)
    if (situacao !== "enviado" && situacao !== "visto") throw new ErroDeUso("Este orçamento já foi decidido.", 409)

    const feito = await prisma.orcamentoLoja.updateMany({
      where: { id: orcamento.id, status: "ENVIADO" },
      data: { status: "APROVADO", aprovadoEm: new Date(), aprovadoPeloCliente: true },
    })
    if (feito.count !== 1) throw new ErroDeUso("Este orçamento já foi decidido.", 409)
    // O sino do dono: a aprovação é o aviso que mais importa, porque é dinheiro
    // decidido esperando alguém começar o serviço.
    const numero = String(orcamento.numero).padStart(4, "0")
    await prisma.avisoLoja.createMany({
      data: [{
        lojaId: orcamento.lojaId, chave: `orc-aprovado:${orcamento.id}`, tipo: "orcamento_aprovado",
        titulo: `${orcamento.cliente.nome} aprovou o orçamento ${numero} pelo link`,
        texto: "Abra a ordem de serviço ou venda no Balcão.",
        rota: `/loja/agenda?nova-os=${orcamento.id}`, acao: "Abrir OS",
      }],
      skipDuplicates: true,
    })
    return ok({ aprovado: true })
  })(requisicao)
}

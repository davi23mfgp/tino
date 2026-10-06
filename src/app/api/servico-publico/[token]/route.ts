import { prisma } from "@/lib/prisma"
import { comPublica, corpo, ErroDeUso, erro, ok } from "@/lib/api"
import { consumirLimite, ipDaRequisicao, LimiteEstourado, REGRAS } from "@/lib/limite"
import { numeroDaOrdem } from "@/lib/loja/agenda"
import { campo, validar, z } from "@/lib/validar"

export const dynamic = "force-dynamic"

const TOKEN_VALIDO = /^[A-Za-z0-9_-]{32}$/

/**
 * O cliente confere, pelo link, como o aparelho chegou (passo 39, opção A).
 * É o lugar da assinatura do RepairDesk: num toque, "está certo", ou o que
 * está errado, que vira aviso no sino da loja na hora, antes de o técnico
 * abrir o aparelho.
 *
 * Responde uma vez só. Mudar de ideia depois que a loja viu a resposta é
 * conversa no balcão, não clique no link.
 */
export async function POST(requisicao: Request, contexto: { params: Promise<{ token: string }> }) {
  return comPublica(async () => {
    try {
      await consumirLimite(`servico:ip:${ipDaRequisicao(requisicao)}`, REGRAS.publico)
    } catch (excecao) {
      if (excecao instanceof LimiteEstourado) return erro(excecao.message, 429)
      throw excecao
    }
    const { token } = await contexto.params
    const dados = validar(
      z.discriminatedUnion("acao", [
        z.object({ acao: z.literal("confere") }),
        z.object({ acao: z.literal("contesta"), texto: campo.textoObrigatorio(500) }),
      ]),
      await corpo(requisicao),
    )
    if (!TOKEN_VALIDO.test(token)) throw new ErroDeUso("Serviço não encontrado.", 404)
    const ordem = await prisma.ordemServicoLoja.findUnique({
      where: { linkToken: token },
      select: { id: true, numero: true, lojaId: true, etapa: true, aparelhoTipo: true, cliente: { select: { nome: true } } },
    })
    if (!ordem || !ordem.aparelhoTipo) throw new ErroDeUso("Serviço não encontrado.", 404)
    if (ordem.etapa === "ENTREGUE") throw new ErroDeUso("Este aparelho já foi entregue.", 409)

    const feito = await prisma.ordemServicoLoja.updateMany({
      where: { id: ordem.id, entradaConferidaEm: null, entradaContestada: null },
      data: dados.acao === "confere" ? { entradaConferidaEm: new Date() } : { entradaContestada: dados.texto },
    })
    if (feito.count !== 1) throw new ErroDeUso("A conferência deste aparelho já foi respondida.", 409)

    if (dados.acao === "contesta") {
      await prisma.avisoLoja.createMany({
        data: [{
          lojaId: ordem.lojaId, chave: `entrada-contestada:${ordem.id}`, tipo: "entrada_contestada",
          titulo: `${ordem.cliente.nome} disse que a entrada da OS ${numeroDaOrdem(ordem.numero)} está errada`,
          texto: dados.texto.slice(0, 200),
          rota: `/loja/agenda?os=${ordem.id}`, acao: "Ver a OS",
        }],
        skipDuplicates: true,
      })
    }
    return ok({ respondido: dados.acao })
  })(requisicao)
}

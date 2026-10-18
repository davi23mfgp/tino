import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { comSessao, ok } from "@/lib/api"
import { gerarCodigoDeIndicacao, linkDeIndicacao } from "@/lib/indicacao"
import { origemDoLink } from "@/lib/redefinir-senha"

export const dynamic = "force-dynamic"

/**
 * O código e o link de indicação da conta, com quem chegou por ele e quem já
 * paga. O código nasce na primeira vez que a pessoa abre isto.
 */
export const GET = comSessao(async (sessao, requisicao) => {
  let usuario = await prisma.usuario.findUnique({ where: { id: sessao.usuarioId }, select: { codigoIndicacao: true } })
  for (let tentativa = 0; !usuario?.codigoIndicacao && tentativa < 5; tentativa += 1) {
    try {
      usuario = await prisma.usuario.update({ where: { id: sessao.usuarioId }, data: { codigoIndicacao: gerarCodigoDeIndicacao() }, select: { codigoIndicacao: true } })
    } catch (excecao) {
      // Código repetido (1 em quase 900 milhões): tenta outro.
      if (!(excecao instanceof Prisma.PrismaClientKnownRequestError && excecao.code === "P2002")) throw excecao
    }
  }
  const codigo = usuario!.codigoIndicacao!
  const indicados = await prisma.usuario.findMany({
    where: { origemCadastro: { path: ["ref"], equals: codigo } },
    select: { assinatura: { select: { status: true } } },
  })
  const origem = origemDoLink(process.env, new URL(requisicao.url).origin)
  return ok({
    codigo,
    link: linkDeIndicacao(origem, codigo, sessao.produto === "mei" ? "mei" : "pessoal"),
    indicados: indicados.length,
    pagantes: indicados.filter((linha) => linha.assinatura?.status === "ATIVA").length,
    // O mês grátis só vale com a cobrança ligada (item 1.5).
    premioAtivo: false,
  })
})

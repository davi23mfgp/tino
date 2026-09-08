/**
 * Chamados abertos de dentro do app.
 *
 * Exige sessão de propósito, mesmo sendo o canal "público" do usuário: chamado
 * anônimo não diz de qual conta veio, e sem a conta não dá para olhar a
 * assinatura, o histórico de cobrança nem reproduzir o problema. Também é o que
 * impede a rota de virar caixa de spam aberta.
 */

import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import type { TipoChamado } from "@prisma/client"

const TIPOS: TipoChamado[] = ["BUG", "DUVIDA", "COBRANCA"]

/// Curto o bastante para caber numa tela, longo o bastante para descrever um
/// bug com o passo a passo. Sem teto, um colar acidental enche a coluna.
const LIMITE_MENSAGEM = 4000

export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ tipo?: string; mensagem?: string; rota?: string }>(requisicao)

  const mensagem = (dados.mensagem ?? "").trim()
  if (mensagem.length < 5) throw new ErroDeUso("Conte um pouco mais do que aconteceu.")
  if (mensagem.length > LIMITE_MENSAGEM) throw new ErroDeUso("Mensagem longa demais. Resuma o essencial.")

  const tipo = TIPOS.includes(dados.tipo as TipoChamado) ? (dados.tipo as TipoChamado) : "DUVIDA"

  const chamado = await prisma.chamado.create({
    data: {
      usuarioId: sessao.usuarioId,
      tipo,
      mensagem,
      // A tela de origem entra automaticamente: bug relatado sem ela obriga
      // quem lê a adivinhar onde procurar.
      rota: dados.rota?.slice(0, 200) ?? null,
    },
  })

  return ok({ id: chamado.id, criadoEm: chamado.criadoEm }, 201)
})

/** Os chamados que a própria pessoa abriu, com a resposta quando houver. */
export const GET = comSessao(async (sessao) => {
  const chamados = await prisma.chamado.findMany({
    where: { usuarioId: sessao.usuarioId },
    orderBy: { criadoEm: "desc" },
    take: 20,
  })
  return ok(chamados)
})

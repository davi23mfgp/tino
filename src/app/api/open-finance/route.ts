import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { criarProvedor, sincronizarConexao } from "@/lib/open-finance"

export const dynamic = "force-dynamic"

export const GET = comSessao(async (sessao) => {
  const conexoes = await prisma.conexaoOpenFinance.findMany({
    where: { larId: sessao.larId },
    include: { contas: { select: { id: true, nome: true, tipo: true } } },
    orderBy: { criadoEm: "desc" },
  })

  // Open Finance está desligado (Davi, 28/09/2026), e sem provedor
  // configurado `criarProvedor` lança de propósito em produção. A tela de
  // Configurações lê esta rota para listar conexões antigas: responder erro
  // 500 a cada abertura enchia o registro de erros do admin com um defeito
  // que não existe. Ler as conexões não precisa do provedor.
  let nomeDoProvedor = "desligado"
  try {
    nomeDoProvedor = criarProvedor().nome
  } catch {
    // Fica "desligado": a tela não oferece conexão nenhuma.
  }
  return ok({
    provedor: nomeDoProvedor,
    // O sandbox devolve dados fictícios. A tela precisa dizer isso em letras
    // grandes, senão o usuário toma decisão com número inventado.
    sandbox: nomeDoProvedor === "sandbox",
    conexoes: conexoes.map((conexao) => ({
      ...conexao,
      diasParaExpirar: conexao.consentimentoExpiraEm
        ? Math.ceil((conexao.consentimentoExpiraEm.getTime() - Date.now()) / 86_400_000)
        : null,
    })),
  })
})

/** Inicia o consentimento: devolve a URL onde o usuário autentica no banco. */
export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ retornoUrl?: string }>(requisicao)
  const origem = new URL(requisicao.url).origin

  const url = await criarProvedor().urlConsentimento({
    larId: sessao.larId,
    retornoUrl: dados.retornoUrl ?? `${origem}/api/open-finance/callback`,
  })

  return ok({ url })
})

/** Dispara a sincronização de uma conexão existente. */
export const PUT = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ conexaoId: string; dias?: number }>(requisicao)
  if (!dados.conexaoId) throw new ErroDeUso("Informe a conexão a sincronizar.")

  return ok(await sincronizarConexao({ larId: sessao.larId, conexaoId: dados.conexaoId, dias: dados.dias }))
})

/** Revoga o consentimento e desliga a conexão. */
export const DELETE = comSessao(async (sessao, requisicao) => {
  const conexaoId = new URL(requisicao.url).searchParams.get("conexaoId")
  if (!conexaoId) throw new ErroDeUso("Informe a conexão.")

  const conexao = await prisma.conexaoOpenFinance.findFirst({ where: { id: conexaoId, larId: sessao.larId } })
  if (!conexao) throw new ErroDeUso("Conexão não encontrada.", 404)

  await criarProvedor().revogar(conexao.itemId)

  // As contas e os lançamentos ficam: são o histórico financeiro do usuário.
  // Revogar o acesso ao banco não deve apagar o que ele já registrou.
  await prisma.conta.updateMany({ where: { conexaoId }, data: { conexaoId: null } })
  await prisma.conexaoOpenFinance.update({ where: { id: conexaoId }, data: { status: "REVOGADA" } })

  return ok({ revogada: true })
})

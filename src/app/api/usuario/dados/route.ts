import { comSessao } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { consumirLimite, REGRAS } from "@/lib/limite"

export const dynamic = "force-dynamic"

/**
 * Baixar tudo o que o Tino guarda sobre você.
 *
 * Direito do titular, LGPD art. 18, incisos II e V: acesso aos dados e
 * portabilidade. Não é recurso de produto — é obrigação de quem guarda dado
 * pessoal, e quem cobra assinatura guardando extrato bancário está bem no meio
 * dessa definição.
 *
 * Sai em JSON e não em PDF de propósito: portabilidade quer dizer poder levar
 * para outro serviço, e PDF não se importa em lugar nenhum.
 *
 * **O que NÃO vai no arquivo:** o hash da senha (é credencial, não dado do
 * titular, e mandar por e-mail seria entregar a chave de casa), o segredo das
 * chaves de captura, e os tokens de conexão bancária. Vai o que a pessoa
 * escreveu, lançou e decidiu.
 */
export const GET = comSessao(async (sessao) => {
  // Montar o pacote inteiro é consulta pesada. Uma por hora por pessoa basta
  // para o direito ser exercido e não dá para usar como ataque.
  await consumirLimite(`dados:${sessao.usuarioId}`, { maximo: 3, janelaSegundos: 3600, bloqueioSegundos: 600 })

  const larId = sessao.larId

  const [usuario, lar, contas, categorias, transacoes, recorrencias, orcamentos, metas, dividas, parcelamentos, capturas, alertas, conversas, assinatura, simulacoes] =
    await Promise.all([
      prisma.usuario.findUnique({
        where: { id: sessao.usuarioId },
        select: { id: true, nome: true, email: true, criadoEm: true, ultimoLogin: true, avatarUrl: true },
      }),
      prisma.lar.findUnique({ where: { id: larId }, select: { id: true, nome: true, tipo: true, moeda: true, fusoHorario: true } }),
      prisma.conta.findMany({ where: { larId } }),
      prisma.categoria.findMany({ where: { larId } }),
      prisma.transacao.findMany({ where: { larId } }),
      prisma.recorrencia.findMany({ where: { larId } }),
      prisma.orcamento.findMany({ where: { larId } }),
      prisma.meta.findMany({ where: { larId } }),
      prisma.divida.findMany({ where: { larId } }),
      prisma.parcelamento.findMany({ where: { larId }, include: { parcelas: true } }),
      prisma.captura.findMany({ where: { larId } }),
      prisma.alerta.findMany({ where: { larId } }),
      prisma.conversa.findMany({ where: { larId }, include: { mensagens: true } }),
      prisma.assinatura.findUnique({ where: { usuarioId: sessao.usuarioId } }),
      prisma.simulacaoEmprestimo.findMany({ where: { larId } }),
    ])

  const pacote = {
    geradoEm: new Date().toISOString(),
    aviso:
      "Exportação completa dos seus dados no Tino, em JSON. Não inclui senha, chaves de acesso nem tokens de conexão — credencial não é dado do titular, é chave de casa.",
    usuario,
    lar,
    contas,
    categorias,
    transacoes,
    recorrencias,
    orcamentos,
    metas,
    dividas,
    parcelamentos,
    capturas,
    alertas,
    conversas,
    assinatura,
    simulacoes,
  }

  return new Response(JSON.stringify(pacote, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="tino-meus-dados-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  })
})

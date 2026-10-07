/**
 * A ida ao banco das análises da Fase 2. As regras moram em `./analises`,
 * puras e testadas; aqui só se junta o dado no formato que elas leem.
 */

import { prisma } from "@/lib/prisma"
import { situacaoDoDas } from "@/lib/financeiro"
import { diaNoFuso } from "@/lib/loja/contas"
import { montarDevedores } from "@/lib/loja/fiado"
import { gruposDeClientes, motivosDePerda, type ClienteParaAnalise, type FotoDoNegocio } from "@/lib/loja/analises"

const DIA = 86_400_000
const CARTAO = ["DEBITO", "CREDITO_VISTA", "CREDITO_PARCELADO"] as const

/** Cliente com as compras dos últimos 8 meses (os 6 da análise mais as 6 semanas do "sumido"). */
export async function clientesParaAnalise(lojaId: string, agora: Date): Promise<ClienteParaAnalise[]> {
  const clientes = await prisma.clienteLoja.findMany({
    where: { lojaId },
    select: {
      id: true, nome: true, telefone: true,
      vendas: {
        where: { cancelada: false, criadoEm: { gte: new Date(agora.getTime() - 230 * DIA) } },
        select: { criadoEm: true, totalCentavos: true, pagamentos: { select: { forma: true } } },
      },
    },
  })
  return clientes.map((cliente) => ({
    id: cliente.id, nome: cliente.nome, telefone: cliente.telefone,
    compras: cliente.vendas.map((venda) => ({
      em: venda.criadoEm, totalCentavos: venda.totalCentavos,
      // Fiado é a venda inteira no fiado; a que teve parte em dinheiro não é "só fiado".
      fiado: venda.pagamentos.length > 0 && venda.pagamentos.every((pagamento) => pagamento.forma === "FIADO"),
    })),
  }))
}

export async function perdasDaLoja(lojaId: string, agora: Date) {
  const orcamentos = await prisma.orcamentoLoja.findMany({
    where: { lojaId, status: "PERDIDO", perdidoEm: { gte: new Date(agora.getTime() - 181 * DIA) } },
    select: { status: true, perdidoEm: true, motivoPerda: true, totalCentavos: true },
  })
  return motivosDePerda(orcamentos, agora)
}

/** O que o Guia do negócio lê. Sem perfil MEI, o DAS fica `null` (não é zero atrasado, é não saber). */
export async function fotoDoNegocio(loja: { id: string; larId: string; chavePix: string | null; telefoneContato: string | null }, agora: Date): Promise<FotoDoNegocio> {
  const noventa = new Date(agora.getTime() - 90 * DIA)
  const [produtos, produtosSemCusto, vendasNoCartao, maquininhas, clientesFiado, perfil, lar, semResposta, clientes] = await Promise.all([
    prisma.produtoLoja.count({ where: { lojaId: loja.id, ativo: true } }),
    prisma.produtoLoja.count({ where: { lojaId: loja.id, ativo: true, custoCentavos: 0 } }),
    prisma.pagamentoVenda.count({ where: { forma: { in: [...CARTAO] }, venda: { lojaId: loja.id, cancelada: false, criadoEm: { gte: noventa } } } }),
    prisma.formaRecebimento.count({ where: { lojaId: loja.id, forma: { in: [...CARTAO] }, taxaBps: { gt: 0 } } }),
    prisma.clienteLoja.findMany({
      where: { lojaId: loja.id, vendas: { some: { cancelada: false, pagamentos: { some: { forma: "FIADO", recebidoEm: null } } } } },
      select: { id: true, nome: true, telefone: true, vendas: { where: { cancelada: false }, select: { id: true, numero: true, criadoEm: true, pagamentos: { select: { forma: true, valorCentavos: true, recebidoEm: true } } } } },
    }),
    prisma.meiPerfil.findUnique({ where: { larId: loja.larId }, select: { diaVencimentoDas: true, dataAbertura: true } }),
    prisma.lar.findUnique({ where: { id: loja.larId }, select: { fusoHorario: true } }),
    prisma.orcamentoLoja.count({ where: { lojaId: loja.id, status: "ENVIADO", enviadoEm: { lt: new Date(agora.getTime() - 2 * DIA) }, OR: [{ validoAte: null }, { validoAte: { gte: new Date(agora.getTime() - DIA) } }] } }),
    clientesParaAnalise(loja.id, agora),
  ])

  const atrasados = montarDevedores(clientesFiado, agora).filter((devedor) => devedor.diasDaMaisAntiga > 30)

  let dasAtrasados: number | null = null
  if (perfil) {
    const hoje = diaNoFuso(agora, lar?.fusoHorario ?? undefined)
    const ano = Number(hoje.slice(0, 4))
    const competencias = await prisma.meiCompetencia.findMany({ where: { larId: loja.larId, competencia: { startsWith: String(ano) } }, select: { competencia: true, dasPago: true } })
    // Como a tela MEI: só conta atrasado o mês registrado; mês sem registro não é afirmado como dívida.
    dasAtrasados = competencias.filter((linha) => situacaoDoDas(linha.competencia, linha.dasPago, hoje, perfil.diaVencimentoDas) === "atrasado").length
  }

  return {
    produtos, produtosSemCusto, vendasNoCartao90d: vendasNoCartao, maquininhasComTaxa: maquininhas,
    fiadoAtrasadoCentavos: atrasados.reduce((soma, devedor) => soma + devedor.devendoCentavos, 0),
    fiadoAtrasadoClientes: atrasados.length,
    dasAtrasados,
    clientesSumidos: gruposDeClientes(clientes, agora).sumidos.length,
    orcamentosSemResposta: semResposta,
    chavePix: Boolean(loja.chavePix),
    telefoneDaLoja: Boolean(loja.telefoneContato),
  }
}

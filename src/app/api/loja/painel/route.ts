import { prisma } from "@/lib/prisma"
import { comSessao, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { diaNoFuso, somarDias } from "@/lib/loja/contas"
import { formasDoPainel, produtosDoPainel, resumoDoPainel } from "@/lib/loja/painel"

/** Painel mensal/diário: compara períodos equivalentes no fuso da empresa. */
export const GET = comSessao(async (sessao, requisicao) => {
  const loja = await lojaDoLar(sessao.larId)
  const lar = await prisma.lar.findUnique({ where: { id: sessao.larId }, select: { fusoHorario: true } })
  const fuso = lar?.fusoHorario ?? "America/Sao_Paulo"
  const hoje = diaNoFuso(new Date(), fuso)
  const busca = new URL(requisicao.url).searchParams
  const periodo = busca.get("periodo") === "dia" ? "dia" : "mes"
  const pedido = busca.get("data") ?? hoje
  const data = /^\d{4}-\d{2}-\d{2}$/.test(pedido) && !Number.isNaN(Date.parse(`${pedido}T12:00:00Z`)) && pedido <= hoje ? pedido : hoje
  const mes = data.slice(0, 7)
  const primeiro = `${mes}-01`
  const inicio = periodo === "dia" ? data : primeiro
  const fim = periodo === "dia" ? data : mes === hoje.slice(0, 7) ? hoje : somarDias(`${mes}-01`, new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).getUTCDate() - 1)
  const anterior = periodo === "dia" ? somarDias(data, -1) : new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 2, 1)).toISOString().slice(0, 7)
  const inicioAnterior = periodo === "dia" ? anterior : `${anterior}-01`
  const fimAnterior = periodo === "dia" ? anterior : somarDias(inicioAnterior, Math.min(Number(fim.slice(8, 10)), new Date(Date.UTC(Number(anterior.slice(0, 4)), Number(anterior.slice(5, 7)), 0)).getUTCDate()) - 1)
  const desde = new Date(Date.parse(`${inicioAnterior}T00:00:00Z`) - 86_400_000)
  const [vendas, meta] = await Promise.all([prisma.vendaLoja.findMany({
    where: { lojaId: loja.id, cancelada: false, criadoEm: { gte: desde } },
    select: { totalCentavos: true, cancelada: true, criadoEm: true, itens: { select: { descricao: true, quantidade: true, totalCentavos: true } }, pagamentos: { select: { forma: true, valorCentavos: true, valorLiquidoCentavos: true } } },
  }), prisma.metaDaLoja.findUnique({ where: { lojaId_competencia: { lojaId: loja.id, competencia: mes } }, select: { valorCentavos: true } })])
  const noDia = (venda: { criadoEm: Date }) => diaNoFuso(venda.criadoEm, fuso)
  const atual = vendas.filter((venda) => noDia(venda) >= inicio && noDia(venda) <= fim)
  const anteriores = vendas.filter((venda) => noDia(venda) >= inicioAnterior && noDia(venda) <= fimAnterior)
  const vendasDaMeta = periodo === "mes" ? atual : await prisma.vendaLoja.findMany({
    where: { lojaId: loja.id, cancelada: false, criadoEm: { gte: new Date(Date.parse(`${primeiro}T00:00:00Z`) - 86_400_000) } },
    select: { totalCentavos: true, criadoEm: true },
  })
  const metaRealizadoCentavos = vendasDaMeta.filter((venda) => noDia(venda) >= primeiro && noDia(venda) <= data).reduce((soma, venda) => soma + venda.totalCentavos, 0)
  const rotulos: string[] = []
  if (periodo === "dia") for (let hora = 0; hora < 24; hora++) rotulos.push(String(hora).padStart(2, "0"))
  else for (let dia = inicio; dia <= fim; dia = somarDias(dia, 1)) rotulos.push(dia)
  const serie = rotulos.map((rotulo) => {
    const totalCentavos = atual.filter((venda) => periodo === "dia" ? new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, hour: "2-digit", hourCycle: "h23" }).format(venda.criadoEm) === rotulo : noDia(venda) === rotulo).reduce((soma, venda) => soma + venda.totalCentavos, 0)
    return { rotulo, totalCentavos }
  })
  return ok({ periodo, inicio, fim, inicioAnterior, fimAnterior, atual: resumoDoPainel(atual), anterior: resumoDoPainel(anteriores), serie, metaCentavos: meta?.valorCentavos ?? null, metaRealizadoCentavos, produtos: produtosDoPainel(atual), formas: formasDoPainel(atual) })
})

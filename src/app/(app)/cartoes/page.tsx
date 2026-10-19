import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { sessaoDaPagina } from "@/lib/pagina"
import { competenciaAtual } from "@/lib/datas"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { CentralCartoes } from "@/components/central-cartoes"
import { Bancos, type ProdutoDoBanco } from "@/components/bancos"
import { saldosDasContas } from "@/lib/saldos-das-contas"
import { cicloDaFatura, faturaAberta, limiteDoCartao, resumoDoMes } from "@/lib/cartoes"
export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Bancos · Tino" }
export default async function Cartoes({ searchParams }: { searchParams: Promise<{ cartao?: string; aba?: string }> }) {
  const sessao = await sessaoDaPagina()
  const pedido = await searchParams
  const [contas, categorias] = await Promise.all([
    prisma.conta.findMany({
      where: { larId: sessao.larId, tipo: "CARTAO_CREDITO", arquivada: false },
      orderBy: { criadoEm: "asc" },
      include: {
        transacoes: {
          where: { tipo: { in: ["DESPESA", "RECEITA"] } },
          include: { categoria: { select: { nome: true, cor: true, icone: true } }, fatura: { select: { competencia: true } } },
        },
        parcelamentos: { where: { ativo: true }, include: { parcelas: { orderBy: { numero: "asc" } } } },
        orcamentosCartao: { include: { categorias: true } },
      },
    }),
    prisma.categoria.findMany({where:{larId:sessao.larId,tipo:"DESPESA"},select:{id:true,nome:true},orderBy:{nome:"asc"}})
  ])
  const cartoes = contas.map(({transacoes,parcelamentos,orcamentosCartao,...c})=>({...c, compras:transacoes.map(t=>({id:t.id,descricao:t.descricao,data:t.data.toISOString().slice(0,10),competencia:t.fatura?.competencia??t.competenciaFatura??t.competencia,valorCentavos:t.valorCentavos,tipo:t.tipo,categoriaId:t.categoriaId,categoria:t.categoria})),parcelamentos:parcelamentos.map(p=>({id:p.id,descricao:p.descricao,categoriaId:p.categoriaId,parcelasTotal:p.parcelasTotal,parcelasPagas:p.parcelasPagas,valorTotalCentavos:p.valorTotalCentavos,parcelaCentavos:p.parcelaCentavos,parcelas:p.parcelas.map(x=>({id:x.id,numero:x.numero,competencia:x.competencia,valorCentavos:x.valorCentavos,paga:x.paga}))})),orcamentos:orcamentosCartao.map(o=>({competencia:o.competencia,totalCentavos:o.totalCentavos,categorias:o.categorias.map(l=>({categoriaId:l.categoriaId,limiteCentavos:l.limiteCentavos}))}))}))
  // "Hoje" no fuso de quem usa: às 22h de 5/10 em São Paulo já é dia 6 em UTC,
  // e a fatura que vence dia 6 sairia do limite um dia antes.
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
  // Com um cartão escolhido (ou uma aba pedida por link antigo), abre a fatura
  // como antes; sem, a lista por banco (passo 58, A).
  if (pedido.cartao || pedido.aba) {
    return <>
      <Link href="/cartoes" className="mb-3 inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold"><ChevronLeft aria-hidden className="size-5" />Bancos</Link>
      <CentralCartoes cartoes={cartoes} categorias={categorias} mesAtual={competenciaAtual()} hoje={hoje} cartaoInicial={pedido.cartao} />
    </>
  }
  const todas = await prisma.conta.findMany({ where: { larId: sessao.larId, arquivada: false }, orderBy: { criadoEm: "asc" }, select: { id: true, nome: true, tipo: true, instituicao: true, saldoInicialCentavos: true } })
  const saldos = await saldosDasContas(sessao.larId, todas)
  const produtos: ProdutoDoBanco[] = todas.map((conta) => {
    const dados = cartoes.find((c) => c.id === conta.id)
    if (!dados) return { id: conta.id, nome: conta.nome, tipo: conta.tipo, instituicao: conta.instituicao, saldoCentavos: saldos.get(conta.id) ?? conta.saldoInicialCentavos }
    const competencia = faturaAberta(dados, hoje)
    const resumo = resumoDoMes(dados, competencia)
    const limite = limiteDoCartao(dados, competenciaAtual())
    return {
      id: conta.id, nome: conta.nome, tipo: conta.tipo, instituicao: conta.instituicao, saldoCentavos: 0,
      cartao: {
        faturaCentavos: resumo.saldo, competencia, vencimento: cicloDaFatura(dados, competencia)?.venceEm ?? null,
        parcelasCentavos: Math.max(0, resumo.previsto - resumo.gastos),
        limiteCentavos: limite?.limiteCentavos ?? null, usoBps: limite?.usoBps ?? null, disponivelCentavos: limite?.disponivelCentavos ?? null,
      },
    }
  })
  return <Bancos produtos={produtos} />
}

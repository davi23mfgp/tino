import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { sessaoDaPagina } from "@/lib/pagina"
import { competenciaAtual } from "@/lib/datas"
import { CentralCartoes } from "@/components/central-cartoes"
export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Cartões — Tino" }
export default async function Cartoes() {
  const sessao = await sessaoDaPagina()
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
  return <CentralCartoes cartoes={cartoes} categorias={categorias} mesAtual={competenciaAtual()} />
}


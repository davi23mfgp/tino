import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { sessaoDaPagina } from "@/lib/pagina"
import { competenciaAtual } from "@/lib/datas"
import { CentralMilhas } from "@/components/central-milhas"
export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Milhas · Tino" }
export default async function Milhas() {
  const sessao = await sessaoDaPagina()
  const contas = await 
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
    })
  const cartoes = contas.map(({transacoes,parcelamentos,orcamentosCartao,...c})=>({...c, compras:transacoes.map(t=>({id:t.id,descricao:t.descricao,data:t.data.toISOString().slice(0,10),competencia:t.fatura?.competencia??t.competenciaFatura??t.competencia,valorCentavos:t.valorCentavos,tipo:t.tipo,categoriaId:t.categoriaId,categoria:t.categoria})),parcelamentos:parcelamentos.map(p=>({id:p.id,descricao:p.descricao,categoriaId:p.categoriaId,parcelasTotal:p.parcelasTotal,parcelasPagas:p.parcelasPagas,valorTotalCentavos:p.valorTotalCentavos,parcelaCentavos:p.parcelaCentavos,parcelas:p.parcelas.map(x=>({id:x.id,numero:x.numero,competencia:x.competencia,valorCentavos:x.valorCentavos,paga:x.paga}))})),orcamentos:orcamentosCartao.map(o=>({competencia:o.competencia,totalCentavos:o.totalCentavos,categorias:o.categorias.map(l=>({categoriaId:l.categoriaId,limiteCentavos:l.limiteCentavos}))}))}))
  return <CentralMilhas cartoes={cartoes} mes={competenciaAtual()} />
}

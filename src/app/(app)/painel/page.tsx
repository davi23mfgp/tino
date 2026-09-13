import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, CalendarClock, CreditCard, Receipt } from "lucide-react"
import { sessaoDaPagina } from "@/lib/pagina"
import { prisma } from "@/lib/prisma"
import { competenciaAtual, formatarData, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { montarPanorama } from "@/lib/tino/panorama"
import { compromissosFuturos } from "@/lib/parcelamentos"
import { projetarComParcelas } from "@/lib/projecao-com-parcelas"
import { VisaoInicio } from "@/components/visao-inicio"
import { RoscaCategorias, GraficoFluxo } from "@/components/graficos"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Cartao, LinhaLista, Vazio } from "@/components/ui/painel"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title:"Início — Tino",description:"Seu saldo, os movimentos do mês e os próximos compromissos.",robots:{index:false,follow:false} }

export default async function Painel() {
  const sessao=await sessaoDaPagina()
  const competencia=competenciaAtual()
  const [panorama,pendentes,totalPendentes,contas,compromissos]=await Promise.all([
    montarPanorama(sessao.larId,competencia),
    prisma.captura.findMany({where:{larId:sessao.larId,status:"PENDENTE"},orderBy:{criadoEm:"desc"},take:3}),
    prisma.captura.count({where:{larId:sessao.larId,status:"PENDENTE"}}),
    // Uma conta com data passada ainda precisa ser conferida; nao deve sumir.
    prisma.recorrencia.findMany({where:{larId:sessao.larId,ativa:true,tipo:"DESPESA"},orderBy:{proximaData:"asc"},take:3}),
    compromissosFuturos(sessao.larId, 12),
  ])
  const fatura=panorama.saldoPorConta.filter(c=>c.tipo==="CARTAO_CREDITO").reduce((total,c)=>total+Math.abs(Math.min(0,c.saldoCentavos)),0)
  const categorias=panorama.mes.despesasPorCategoria
  const previsao=projetarComParcelas(panorama,compromissos)
  const proximos=previsao.slice(0,3)
  return <div className="flex flex-col gap-5">
        <section className="home-balance ios-saldo" aria-labelledby="saldo-titulo">
          <h2 id="saldo-titulo" className="home-balance-label">Saldo das contas</h2>
          <p className={"home-balance-value "+(panorama.saldoTotalCentavos<0 ? "text-negativo" : "")}>{formatarMoeda(panorama.saldoTotalCentavos)}</p>
          <p className="mb-5 text-sm text-muted-fg"><span className={panorama.mes.sobraCentavos<0 ? "text-negativo" : "text-positivo"}>{formatarMoeda(panorama.mes.sobraCentavos)}</span> de resultado neste mês</p>
          <div className="home-flow"><div><small>↙ Entrou no mês</small><strong className="text-positivo">{formatarMoeda(panorama.mes.receitasCentavos)}</strong></div><div><small>↗ Saiu no mês</small><strong className="text-negativo">{formatarMoeda(panorama.mes.despesasCentavos)}</strong></div></div>
        </section>

    <div className="ios-atalhos" aria-label="Ações do dia a dia">
      <Button asChild variant="secondary"><Link href="/capturas"><Receipt data-icon="inline-start" />Anotar</Link></Button>
      <Button asChild variant="secondary"><Link href="/recorrencias"><CalendarClock data-icon="inline-start" />Contas</Link></Button>
      <Button asChild variant="secondary"><Link href="/cartoes"><CreditCard data-icon="inline-start" />Cartões</Link></Button>
    </div>
    <VisaoInicio agora={<div className="grid gap-4 lg:grid-cols-2">
        <Cartao titulo="Contas para acompanhar" estatico acao={<Link href="/recorrencias" className="inline-flex min-h-11 items-center">Ver todas</Link>}>
          {contas.length ? contas.map(conta=><LinhaLista key={conta.id} icone={CalendarClock} nome={conta.descricao} detalhe={formatarData(conta.proximaData)} valor={formatarMoeda(conta.valorCentavos)} href="/recorrencias"/>)
          : <Vazio titulo="Nenhuma conta fixa cadastrada." texto="Cadastre aluguel, internet e outras contas para acompanhar as próximas datas."/>}
          {!contas.length && <Link href="/recorrencias" className="mt-2 inline-flex min-h-11 items-center text-sm underline">Adicionar conta fixa</Link>}
        </Cartao>
        <Link href="/cartoes" className="flex min-h-20 items-center gap-3 rounded-2xl border border-pauta bg-papel-1 p-5"><CreditCard className="size-5 shrink-0" aria-hidden/><div className="min-w-0 flex-1"><p className="text-sm font-medium">Cartões</p><p className="mt-1 text-xs text-muted-fg">{fatura>0 ? formatarMoeda(fatura)+" em faturas abertas" : "Veja faturas e parcelas"}</p></div><ArrowRight className="size-4 shrink-0" aria-hidden/></Link>
        {totalPendentes>0 && <Cartao titulo={"Para conferir ("+totalPendentes+")"} estatico acao={<Link href="/capturas" className="inline-flex min-h-11 items-center">Conferir</Link>}>
          <p className="mb-2 text-xs text-muted-fg">Estes registros ainda não entram no seu saldo.</p>
          {pendentes.map(c=><LinhaLista key={c.id} icone={Receipt} nome={c.estabelecimento??c.textoBruto??"Sem descrição"} valor={c.valorCentavos!==null ? formatarMoeda(c.valorCentavos) : undefined} href="/capturas"/>)}
        </Cartao>}
    </div>} categorias={<Card><CardHeader><CardTitle>Para onde foi</CardTitle><CardDescription>Seus gastos do mês, por categoria.</CardDescription></CardHeader><CardContent>
      {categorias.length ? <RoscaCategorias dados={categorias} /> : <Vazio titulo="Seu primeiro gasto aparece aqui." texto="Use o botão + para registrar." />}
    </CardContent><CardFooter><Button asChild variant="ghost"><Link href="/analise">Ver análise completa<ArrowRight data-icon="inline-end" /></Link></Button></CardFooter></Card>}
    futuro={<div className="flex flex-col gap-4"><Card><CardHeader><CardTitle>Seu saldo nos próximos meses</CardTitle><CardDescription>Estimativa com suas médias e parcelas já contratadas.</CardDescription></CardHeader><CardContent>
      <GraficoFluxo dados={previsao.map(m => ({competencia:m.competencia,saldoAcumuladoCentavos:m.acumuladoCentavos}))} />
      <div className="ios-lista">{proximos.map(m => <div key={m.competencia} className="ios-lista-linha"><span className="flex-1">{rotuloCompetencia(m.competencia)}</span><strong className={m.acumuladoCentavos<0 ? "text-negativo" : "text-positivo"}>{formatarMoeda(m.acumuladoCentavos)}</strong></div>)}</div>
    </CardContent><CardFooter><Button asChild variant="secondary" className="w-full"><Link href="/projecao">Ver previsão completa<ArrowRight data-icon="inline-end" /></Link></Button></CardFooter></Card></div>} />
  </div>
}

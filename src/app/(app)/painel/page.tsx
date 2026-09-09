import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, CalendarClock, CreditCard, Receipt } from "lucide-react"
import { sessaoDaPagina } from "@/lib/pagina"
import { prisma } from "@/lib/prisma"
import { competenciaAtual, formatarData } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { montarPanorama } from "@/lib/tino/panorama"
import { Cartao, LinhaLista, Vazio } from "@/components/ui/painel"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title:"Início — Tino",description:"Seu saldo, os movimentos do mês e os próximos compromissos.",robots:{index:false,follow:false} }

export default async function Painel() {
  const sessao=await sessaoDaPagina()
  const competencia=competenciaAtual()
  const [panorama,pendentes,totalPendentes,contas]=await Promise.all([
    montarPanorama(sessao.larId,competencia),
    prisma.captura.findMany({where:{larId:sessao.larId,status:"PENDENTE"},orderBy:{criadoEm:"desc"},take:3}),
    prisma.captura.count({where:{larId:sessao.larId,status:"PENDENTE"}}),
    // Uma conta com data passada ainda precisa ser conferida; nao deve sumir.
    prisma.recorrencia.findMany({where:{larId:sessao.larId,ativa:true,tipo:"DESPESA"},orderBy:{proximaData:"asc"},take:3}),
  ])
  const fatura=panorama.saldoPorConta.filter(c=>c.tipo==="CARTAO_CREDITO").reduce((total,c)=>total+Math.abs(Math.min(0,c.saldoCentavos)),0)
  const categorias=panorama.mes.despesasPorCategoria.slice(0,5)
  const maiorCategoria=Math.max(1,...categorias.map(c=>c.totalCentavos))
  return <div className="space-y-5">
    <div className="home-grid">
      <div className="home-main min-w-0 space-y-5">
        <section className="home-balance" aria-labelledby="saldo-titulo">
          <h2 id="saldo-titulo" className="home-balance-label">Saldo das contas</h2>
          <p className={"home-balance-value "+(panorama.saldoTotalCentavos<0 ? "text-negativo" : "")}>{formatarMoeda(panorama.saldoTotalCentavos)}</p>
          <div className="home-flow"><div><small>↙ Entrou no mês</small><strong className="text-positivo">{formatarMoeda(panorama.mes.receitasCentavos)}</strong></div><div><small>↗ Saiu no mês</small><strong className="text-negativo">{formatarMoeda(panorama.mes.despesasCentavos)}</strong></div></div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-pauta pt-4 text-sm"><span className="text-muted-fg">Resultado do mês</span><strong className={panorama.mes.sobraCentavos<0 ? "text-negativo" : "text-positivo"}>{formatarMoeda(panorama.mes.sobraCentavos)}</strong></div>
          <p className="mt-1 text-xs text-muted-fg">Entradas menos saídas registradas no mês.</p>
          <Link href="/transacoes" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">Ver movimentos<ArrowRight size={16} aria-hidden/></Link>
        </section>
        <Cartao titulo="Para onde foi" estatico acao={<Link className="inline-flex min-h-11 items-center" href="/analise">Ver detalhes</Link>}>
          {categorias.length ? <div>{categorias.map(c=><div key={c.categoriaId??"sem-categoria"} className="home-category"><div><span className="min-w-0 truncate">{c.nome}</span><strong className="shrink-0 font-medium">{formatarMoeda(c.totalCentavos)}</strong></div><div className="home-category-track" aria-hidden><span style={{width:Math.max(1,c.totalCentavos/maiorCategoria*100)+"%"}}/></div></div>)}</div>
          : <Vazio titulo="Seu primeiro gasto aparece aqui." texto="Use o botão + para registrar um gasto. Depois, você vê como o mês se divide."/>}
        </Cartao>
      </div>
      <div className="home-side min-w-0 space-y-5">
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
      </div>
    </div>
    <details className="app-nav-group"><summary><span>Quer olhar mais de perto?<small>Planejamento e análises, no seu ritmo.</small></span><span aria-hidden>+</span></summary>
      <div className="grid gap-2 pb-3 sm:grid-cols-3">{[["/plano","Organizar dívidas"],["/projecao","Ver saldo futuro"],["/analise","Analisar meu dinheiro"]].map(([rota,titulo])=><Link key={rota} href={rota} className="flex min-h-12 items-center justify-between gap-2 rounded-xl bg-papel-1 px-4 text-sm">{titulo}<ArrowRight size={16} aria-hidden/></Link>)}</div>
    </details>
  </div>
}
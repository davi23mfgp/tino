import { prisma } from "@/lib/prisma"
import { sessaoDaPagina } from "@/lib/pagina"
import { acompanharMetas } from "@/lib/metas"
import { CartaoMeta } from "@/components/cartao-meta"
import { NovaMeta } from "@/components/nova-meta"
import { Cartao,Vazio } from "@/components/ui/painel"
import { formatarMoeda } from "@/lib/dinheiro"
import { montarPanorama } from "@/lib/tino/panorama"
import { CalculadoraReserva } from "@/components/calculadora-reserva"
export async function PainelMetas({reserva=false}:{reserva?:boolean}) {
 const sessao=await sessaoDaPagina()
 const [todas,contas,lancamentos]=await Promise.all([acompanharMetas(sessao.larId),prisma.conta.findMany({where:{larId:sessao.larId,arquivada:false,tipo:{not:"CARTAO_CREDITO"}},select:{id:true,nome:true}}),prisma.transacao.findMany({where:{larId:sessao.larId,metaId:null,dividaId:null,pago:true,tipo:{in:["DESPESA","RECEITA"]}},select:{id:true,contaId:true,descricao:true,valorCentavos:true,tipo:true},orderBy:{data:"desc"},take:100})])
 const metas=todas.filter(m=>(m.tipo==="RESERVA_EMERGENCIA")===reserva&&m.status!=="CANCELADA")
 const panorama=reserva?await montarPanorama(sessao.larId):null
 return <div className="space-y-5">{reserva&&panorama&&<CalculadoraReserva custoEssencialCentavos={panorama.medias.custoEssencialCentavos||panorama.medias.custoFixoCentavos||panorama.medias.despesaCentavos} mesesAtuais={panorama.lar.mesesReserva} reservadoCentavos={panorama.reserva.atualCentavos}/>}<Cartao titulo={reserva?"Reserva de emergência":"Suas metas"}><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-fg">{reserva?"Separe o dinheiro para imprevistos e acompanhe a cobertura.":"Defina o prazo, planeje o aporte e acompanhe cada mês."}</p><NovaMeta contas={contas} reserva={reserva}/></div>{panorama&&<div className="mt-5 grid gap-3 sm:grid-cols-3">{[["Reservado",formatarMoeda(panorama.reserva.atualCentavos)],["Alvo",formatarMoeda(panorama.reserva.idealCentavos)],["Cobertura",`${panorama.reserva.mesesDeFolga.toFixed(1)} meses`]].map(([nome,valor])=><div key={nome} className="rounded-2xl bg-papel-2 p-4"><p className="text-xs text-muted-fg">{nome}</p><strong className="mt-2 block text-xl">{valor}</strong></div>)}</div>}</Cartao><div className="grid gap-4 xl:grid-cols-2">{metas.map(m=><CartaoMeta key={m.id} meta={{...m,dataAlvo:m.dataAlvo?.toISOString()??null}} contas={contas} lancamentos={lancamentos}/> )}</div>{!metas.length&&<Vazio titulo={reserva?"Sua reserva começa aqui":"Qual é seu próximo objetivo?"} texto="Cadastre o valor que já tem e quanto quer guardar."/>}</div>
}

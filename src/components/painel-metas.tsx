import { prisma } from "@/lib/prisma"
import { sessaoDaPagina } from "@/lib/pagina"
import { acompanharMetas } from "@/lib/metas"
import { CartaoMeta } from "@/components/cartao-meta"
import { NovaMeta } from "@/components/nova-meta"
import { formatarMoeda } from "@/lib/dinheiro"
import { CarrosselDeMetas } from "@/components/carrossel-metas"
import estilosCarrossel from "@/components/carrossel-metas.module.css"
import { Plus } from "lucide-react"
// A reserva de emergência tem tela própria (/reserva) desde 23/09; aqui ficam
// as outras metas, e a reserva fica de fora para não aparecer em dois lugares.
const MES_CURTO=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"]
const semCentavosZerados=(centavos:number)=>formatarMoeda(centavos).replace(/,00$/,"")
export async function PainelMetas() {
 const sessao=await sessaoDaPagina()
 const [todas,contas,lancamentos]=await Promise.all([acompanharMetas(sessao.larId),prisma.conta.findMany({where:{larId:sessao.larId,arquivada:false,tipo:{not:"CARTAO_CREDITO"}},select:{id:true,nome:true}}),prisma.transacao.findMany({where:{larId:sessao.larId,metaId:null,dividaId:null,pago:true,tipo:{in:["DESPESA","RECEITA"]}},select:{id:true,contaId:true,descricao:true,valorCentavos:true,tipo:true},orderBy:{data:"desc"},take:100})])
 const metas=todas.filter(m=>m.tipo!=="RESERVA_EMERGENCIA"&&m.status!=="CANCELADA")

 // Um aviso por meta ativa, a mais perto de fechar primeiro: é ela que
 // responde "onde estou" quando a pessoa abre a tela.
 const ativas=metas.filter(m=>m.status==="ATIVA"&&m.saldoCentavos<m.alvoCentavos)
  .sort((a,b)=>(a.alvoCentavos-a.saldoCentavos)-(b.alvoCentavos-b.saldoCentavos))
 const avisos=ativas.map(m=>{
  const percentual=m.alvoCentavos>0?Math.floor(m.saldoCentavos*100/m.alvoCentavos):0
  const prazo=m.dataAlvo?`até ${MES_CURTO[m.dataAlvo.getUTCMonth()]} ${m.dataAlvo.getUTCFullYear()}`:"sem prazo"
  return {id:m.id,titulo:`Faltam ${semCentavosZerados(m.alvoCentavos-m.saldoCentavos)} para ${m.nome}`,apoio:`${percentual}% guardado · ${prazo}`,percentual}
 })
 return <div className="space-y-5"><CarrosselDeMetas
  avisos={avisos}
  vazio={metas.length===0
   ? {titulo:"Qual é seu próximo objetivo?",apoio:"Cadastre o valor que já tem e quanto quer guardar."}
   : metas.every(m=>m.saldoCentavos>=m.alvoCentavos)
     ? {titulo:"Todas as suas metas estão completas",apoio:"Defina o próximo objetivo quando quiser."}
     : {titulo:"Nenhuma meta ativa agora",apoio:"As que faltam estão pausadas."}}
  acao={<NovaMeta contas={contas} classeBotao={estilosCarrossel.novaMeta} rotuloBotao={<><Plus aria-hidden/>Nova meta</>}/>}
 /><div className="grid gap-4 md:grid-cols-2">{metas.map(m=><CartaoMeta key={m.id} meta={{...m,dataAlvo:m.dataAlvo?.toISOString()??null}} contas={contas} lancamentos={lancamentos}/> )}</div></div>
}

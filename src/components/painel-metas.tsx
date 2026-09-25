import { prisma } from "@/lib/prisma"
import { sessaoDaPagina } from "@/lib/pagina"
import { acompanharMetas } from "@/lib/metas"
import { CartaoMeta } from "@/components/cartao-meta"
import { NovaMeta } from "@/components/nova-meta"
import { Vazio } from "@/components/ui/painel"
import { formatarMoeda } from "@/lib/dinheiro"
import { Destaque } from "@/components/ui/destaque"
// A reserva de emergência tem tela própria (/reserva) desde 23/09; aqui ficam
// as outras metas, e a reserva fica de fora para não aparecer em dois lugares.
export async function PainelMetas() {
 const sessao=await sessaoDaPagina()
 const [todas,contas,lancamentos]=await Promise.all([acompanharMetas(sessao.larId),prisma.conta.findMany({where:{larId:sessao.larId,arquivada:false,tipo:{not:"CARTAO_CREDITO"}},select:{id:true,nome:true}}),prisma.transacao.findMany({where:{larId:sessao.larId,metaId:null,dividaId:null,pago:true,tipo:{in:["DESPESA","RECEITA"]}},select:{id:true,contaId:true,descricao:true,valorCentavos:true,tipo:true},orderBy:{data:"desc"},take:100})])
 const metas=todas.filter(m=>m.tipo!=="RESERVA_EMERGENCIA"&&m.status!=="CANCELADA")

 // A meta mais perto de fechar: é ela que responde "onde estou" quando a
 // pessoa abre a tela. /metas abria direto na lista, sem dizer nada.
 const ativas=metas.filter(m=>m.status==="ATIVA"&&m.saldoCentavos<m.alvoCentavos)
 const maisPerto=[...ativas].sort((a,b)=>(a.alvoCentavos-a.saldoCentavos)-(b.alvoCentavos-b.saldoCentavos))[0]
 return <div className="space-y-5">{<Destaque
  rotulo="Metas"
  titulo={maisPerto
   ? `Faltam ${formatarMoeda(maisPerto.alvoCentavos-maisPerto.saldoCentavos)} para ${maisPerto.nome}`
   : ativas.length===0&&metas.length>0
     ? "Todas as suas metas estão completas"
     : "Qual é seu próximo objetivo?"}
  apoio={maisPerto
   ? `${ativas.length} ${ativas.length===1?"meta ativa":"metas ativas"}${maisPerto.aporteMensalCentavos>0?` · ${formatarMoeda(maisPerto.aporteMensalCentavos)} por mês nesta`:""}.`
   : "Defina o prazo, planeje o aporte e acompanhe cada mês."}
 />}{/* Destaque de hoje, o botão verde de nova meta e os cartões da opção C
  (Davi, 25/09). O bloco "Suas metas" saiu: repetia a frase do destaque e
  empurrava as metas para baixo da dobra. */}<div className="flex justify-end"><NovaMeta contas={contas} classeBotao="min-h-11 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground" rotuloBotao="+ Nova meta"/></div><div className="grid gap-4 md:grid-cols-2">{metas.map(m=><CartaoMeta key={m.id} meta={{...m,dataAlvo:m.dataAlvo?.toISOString()??null}} contas={contas} lancamentos={lancamentos}/> )}</div>{!metas.length&&<Vazio titulo="Qual é seu próximo objetivo?" texto="Cadastre o valor que já tem e quanto quer guardar."/>}</div>
}

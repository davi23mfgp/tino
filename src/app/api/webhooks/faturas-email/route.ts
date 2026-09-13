import {Resend} from "resend"
import {prisma} from "@/lib/prisma"
import {anexoAceito,contaDoEndereco,emailConfigurado,LIMITE_ANEXO_BYTES} from "@/lib/faturas-email"
export const maxDuration=60
export async function POST(req:Request){
 if(!emailConfigurado())return Response.json({erro:"Recebimento não configurado."},{status:503})
 const resend=new Resend(process.env.RESEND_API_KEY)
 let evento
 try{evento=resend.webhooks.verify({payload:await req.text(),headers:{id:req.headers.get("svix-id")??"",timestamp:req.headers.get("svix-timestamp")??"",signature:req.headers.get("svix-signature")??""},webhookSecret:process.env.RESEND_WEBHOOK_SECRET!})}catch{return Response.json({erro:"Assinatura inválida."},{status:401})}
 if(evento.type!=="email.received")return Response.json({ignorado:true})
 const ids=evento.data.to.map(contaDoEndereco).filter((id):id is string=>Boolean(id))
 if(!ids.length)return Response.json({ignorado:true})
 try{
 const contas=await prisma.conta.findMany({where:{id:{in:ids},arquivada:false},select:{id:true,larId:true}})
 const {data:anexos,error}=await resend.emails.receiving.attachments.list({emailId:evento.data.email_id})
 if(error||!anexos)throw new Error("Anexos indisponíveis")
 for(const anexo of anexos.data){
  if(!anexoAceito(anexo.filename))continue
  const existentes=await prisma.faturaRecebida.findMany({where:{eventoId:evento.data.email_id,arquivoNome:anexo.filename},select:{contaId:true}})
  const destinos=contas.filter(c=>!existentes.some(e=>e.contaId===c.id));if(!destinos.length)continue
  if(new URL(anexo.download_url).protocol!=="https:")throw new Error("URL inválida")
  const resposta=await fetch(anexo.download_url,{redirect:"error",signal:AbortSignal.timeout(20000)})
  if(!resposta.ok||!resposta.body)throw new Error("Falha no anexo")
  const leitor=resposta.body.getReader();const partes:Uint8Array[]=[];let tamanho=0
  while(true){const p=await leitor.read();if(p.done)break;tamanho+=p.value.length;if(tamanho>LIMITE_ANEXO_BYTES){await leitor.cancel();throw new Error("Anexo acima de 10 MB")}partes.push(p.value)}
  const conteudo=Buffer.concat(partes)
  for(const conta of destinos)await prisma.faturaRecebida.upsert({where:{eventoId_contaId_arquivoNome:{eventoId:evento.data.email_id,contaId:conta.id,arquivoNome:anexo.filename}},create:{larId:conta.larId,contaId:conta.id,eventoId:evento.data.email_id,arquivoNome:anexo.filename,conteudo},update:{}})
 }
 return Response.json({recebido:true})
 }catch{return Response.json({erro:"Falha ao receber anexos. O provedor pode reenviar."},{status:503})}
}

import { prisma } from "@/lib/prisma"
import { comSessao,corpo,ok,ErroDeUso } from "@/lib/api"
export const PUT=comSessao<{params:Promise<{id:string}>}>(async(sessao,req,contexto)=>{
 const {id}=await contexto.params;const dados=await corpo<{valorCentavos:number}>(req)
 if(!Number.isSafeInteger(dados?.valorCentavos)||dados.valorCentavos<0||dados.valorCentavos>2147483647)throw new ErroDeUso("Informe um orçamento válido.")
 const resultado=await prisma.conta.updateMany({where:{id,larId:sessao.larId,tipo:"CARTAO_CREDITO",arquivada:false},data:{orcamentoMensalCentavos:dados.valorCentavos}})
 if(!resultado.count)throw new ErroDeUso("Cartão não encontrado.",404)
 return ok({salvo:true})
})

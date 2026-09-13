import {prisma} from "@/lib/prisma"
import {comSessao,ok,ErroDeUso} from "@/lib/api"
type Contexto={params:Promise<{id:string}>}
export const GET=comSessao<Contexto>(async(s,r,c)=>{const {id}=await c.params;const f=await prisma.faturaRecebida.findFirst({where:{id,larId:s.larId,status:"PENDENTE"}});if(!f)throw new ErroDeUso("Arquivo não encontrado.",404);return new Response(new Uint8Array(f.conteudo),{headers:{"Content-Type":"application/octet-stream","Cache-Control":"no-store"}})})
export const DELETE=comSessao<Contexto>(async(s,r,c)=>{const {id}=await c.params;await prisma.faturaRecebida.updateMany({where:{id,larId:s.larId},data:{status:"CONCLUIDA",conteudo:Buffer.alloc(0)}});return ok({concluida:true})})

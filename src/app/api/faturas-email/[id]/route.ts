import {prisma} from "@/lib/prisma"
import {comSessao,ok,ErroDeUso} from "@/lib/api"
import {confirmarFaturaRecebida} from "@/lib/importar/fatura-recebida"
export const maxDuration=60
type Contexto={params:Promise<{id:string}>}
export const GET=comSessao<Contexto>(async(s,r,c)=>{const {id}=await c.params;const f=await prisma.faturaRecebida.findFirst({where:{id,larId:s.larId,status:"PENDENTE"}});if(!f)throw new ErroDeUso("Arquivo não encontrado.",404);return new Response(new Uint8Array(f.conteudo),{headers:{"Content-Type":"application/octet-stream","Cache-Control":"no-store"}})})
export const DELETE=comSessao<Contexto>(async(s,r,c)=>{const {id}=await c.params;await prisma.faturaRecebida.updateMany({where:{id,larId:s.larId},data:{status:"CONCLUIDA",conteudo:Buffer.alloc(0)}});return ok({concluida:true})})
/** O toque de "Confirmar": lança a fatura lida, se a soma ainda fecha com o total. */
export const POST=comSessao<Contexto>(async(s,r,c)=>{const {id}=await c.params;const {importacao,resumo}=await confirmarFaturaRecebida({larId:s.larId,id,membroId:s.membroId});return ok({importacao,resumo},201)})

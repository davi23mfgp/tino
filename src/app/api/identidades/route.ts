import {prisma} from "@/lib/prisma"
import {comSessao,corpo,ok,ErroDeUso} from "@/lib/api"
import {validarFotoMeta} from "@/lib/metas"
export const GET=comSessao(async s=>ok(await prisma.identidadeVisual.findMany({where:{larId:s.larId},orderBy:{nome:"asc"}})))
export const PUT=comSessao(async(s,r)=>{
 const d=await corpo<{nome:string;logoUrl?:string|null;emoji?:string|null}>(r)
 if(typeof d?.nome!=="string"||!d.nome.trim()||d.nome.length>80)throw new ErroDeUso("Informe um nome de até 80 caracteres.")
 if(d.emoji && (typeof d.emoji!=="string"||d.emoji.length>24||! /\p{Extended_Pictographic}/u.test(d.emoji)))throw new ErroDeUso("Escolha um emoji válido.")
 const logoUrl=d.logoUrl?validarFotoMeta(d.logoUrl):null
 const nome=d.nome.trim().normalize("NFC")
 return ok(await prisma.identidadeVisual.upsert({where:{larId_nome:{larId:s.larId,nome}},create:{larId:s.larId,nome,logoUrl,emoji:d.emoji||null},update:{logoUrl,emoji:d.emoji||null}}))
})
export const DELETE=comSessao(async(s,r)=>{const d=await corpo<{id:string}>(r);if(typeof d?.id!=="string")throw new ErroDeUso("Identidade inválida.");await prisma.identidadeVisual.deleteMany({where:{id:d.id,larId:s.larId}});return ok({removida:true})})

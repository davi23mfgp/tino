import {prisma} from "@/lib/prisma"
import {comSessao,corpo,ok,ErroDeUso} from "@/lib/api"
import {enderecoFaturas,emailConfigurado} from "@/lib/faturas-email"
import {cifrarSenhaDaFatura,prepararFaturaRecebida} from "@/lib/importar/fatura-recebida"
export const maxDuration=60
export const GET=comSessao(async(s,r)=>{const contaId=new URL(r.url).searchParams.get("contaId")??"";const conta=await prisma.conta.findFirst({where:{id:contaId,larId:s.larId,arquivada:false}});if(!conta)throw new ErroDeUso("Escolha uma conta.");return ok({configurado:emailConfigurado(),endereco:enderecoFaturas(contaId),temSenha:Boolean(conta.senhaFaturaCifrada),arquivos:await prisma.faturaRecebida.findMany({where:{larId:s.larId,contaId,status:"PENDENTE"},select:{id:true,arquivoNome:true,criadoEm:true,leitura:true},orderBy:{criadoEm:"desc"},take:30})})})

/**
 * Guarda (ou apaga, com senha vazia) a senha do PDF da fatura desta conta.
 * A senha só entra: nenhuma rota a devolve, nem cifrada.
 */
export const PUT=comSessao(async(s,r)=>{
 const dados=await corpo<{contaId?:string;senha?:string}>(r)
 const conta=await prisma.conta.findFirst({where:{id:dados.contaId??"",larId:s.larId,arquivada:false}})
 if(!conta)throw new ErroDeUso("Escolha uma conta.")
 const senha=(dados.senha??"").trim()
 if(senha.length>64)throw new ErroDeUso("Senha longa demais.")
 await prisma.conta.update({where:{id:conta.id},data:{senhaFaturaCifrada:senha?cifrarSenhaDaFatura(conta.id,senha):null}})
 // Senha nova: relê o que estava esperando por ela, até três para caber no tempo da rota.
 if(senha){
  const esperando=await prisma.faturaRecebida.findMany({where:{larId:s.larId,contaId:conta.id,status:"PENDENTE"},select:{id:true},orderBy:{criadoEm:"desc"},take:3})
  for(const fatura of esperando)await prepararFaturaRecebida(fatura.id).catch(()=>null)
 }
 return ok({temSenha:Boolean(senha)})
})

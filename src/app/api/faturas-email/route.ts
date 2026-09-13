import {prisma} from "@/lib/prisma"
import {comSessao,ok,ErroDeUso} from "@/lib/api"
import {enderecoFaturas,emailConfigurado} from "@/lib/faturas-email"
export const GET=comSessao(async(s,r)=>{const contaId=new URL(r.url).searchParams.get("contaId")??"";const conta=await prisma.conta.findFirst({where:{id:contaId,larId:s.larId,arquivada:false}});if(!conta)throw new ErroDeUso("Escolha uma conta.");return ok({configurado:emailConfigurado(),endereco:enderecoFaturas(contaId),arquivos:await prisma.faturaRecebida.findMany({where:{larId:s.larId,contaId,status:"PENDENTE"},select:{id:true,arquivoNome:true,criadoEm:true},orderBy:{criadoEm:"desc"},take:30})})})

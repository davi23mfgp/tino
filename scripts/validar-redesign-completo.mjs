import assert from "node:assert/strict"
import {pathToFileURL} from "node:url"
import {mkdir} from "node:fs/promises"
import {PrismaClient} from "@prisma/client"
process.loadEnvFile(".env")
assert(["localhost","127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname),"Validação exige banco local")
const {chromium}=await import(pathToFileURL(process.env.TINO_PLAYWRIGHT_MODULE).href)
const navegador=await chromium.launch({channel:"msedge",headless:true})
const contexto=await navegador.newContext({viewport:{width:1440,height:960},reducedMotion:"reduce"})
const prisma=new PrismaClient();const contasCriadas=[];const metasCriadas=[];const identidadesCriadas=[];let larTeste
const base="http://127.0.0.1:3000";const prefixo=`Validação ${Date.now()}`
const req=contexto.request;const erros=[]
async function api(rota,dados,metodo="POST"){const r=await req.fetch(base+rota,{method:metodo,...(dados?{data:dados}:{})});const corpo=await r.json();assert(r.ok(),`${rota}: ${r.status()} ${JSON.stringify(corpo)}`);return corpo}
try{
 await api("/api/auth/login",{email:"demo@tino.local",senha:"demo12345"})
 // Só o navegador isolado de teste adapta o cookie ao HTTP local.
 await contexto.addCookies((await contexto.cookies()).map(c=>({...c,secure:false})))
 const conta=await api("/api/contas",{nome:prefixo+" cartão",tipo:"CARTAO_CREDITO",instituicao:"Nubank",limiteCentavos:500000});contasCriadas.push(conta.id)
 const origem=await api("/api/contas",{nome:prefixo+" conta",tipo:"CORRENTE",saldoInicialCentavos:500000});contasCriadas.push(origem.id)
 await api(`/api/cartoes/${conta.id}/orcamento`,{valorCentavos:100000},"PUT")
 const compra=await api("/api/transacoes",{contaId:conta.id,descricao:prefixo+" compra",tipo:"DESPESA",valorCentavos:12345,data:new Date().toISOString().slice(0,10)})
 await api(`/api/transacoes/${compra.id}`,{valorCentavos:12000},"PATCH")
 const parcela=await api("/api/parcelamentos",{contaId:conta.id,descricao:prefixo+" parcelamento",valorTotalCentavos:10001,parcelasTotal:3})
 const parcelas=await prisma.parcelaCompra.findMany({where:{parcelamentoId:parcela.id}});assert.equal(parcelas.reduce((s,p)=>s+p.valorCentavos,0),10001)
 await api(`/api/parcelamentos/${parcela.id}`,{parcelasPagas:1},"PATCH")
 const meta=await api("/api/metas",{nome:prefixo+" meta",tipo:"VIAGEM",alvoCentavos:50000,saldoCentavos:0,aporteMensalCentavos:10000,contaId:origem.id,compromissoMensal:true,lembreteDia:1,dataAlvo:"2027-12-01"});metasCriadas.push(meta.id)
 const aporte={valorCentavos:5000,contaId:origem.id,chave:crypto.randomUUID()}
 await api(`/api/metas/${meta.id}`,aporte);await api(`/api/metas/${meta.id}`,aporte)
 const atual=await prisma.meta.findUnique({where:{id:meta.id}});assert.equal(atual.saldoCentavos,5000,"Aporte repetido não pode duplicar")
 const acompanhamento=(await api("/api/metas",null,"GET")).find(m=>m.id===meta.id);assert.equal(acompanhamento.realizadoCentavos,5000);assert.equal(acompanhamento.pendenteCentavos,5000)
 const png="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII="
 await api(`/api/metas/${meta.id}`,{fotoUrl:png},"PATCH")
 const identidade=await api("/api/identidades",{nome:prefixo,emoji:"🛒",logoUrl:png},"PUT");identidadesCriadas.push(identidade.id)
 larTeste=await prisma.lar.create({data:{nome:prefixo}})
 const alheia=await prisma.conta.create({data:{larId:larTeste.id,nome:"Isolada",tipo:"CARTAO_CREDITO"}})
 const negado=await req.patch(`${base}/api/transacoes/${compra.id}`,{data:{contaId:alheia.id}});assert.equal(negado.status(),400)
 const negado2=await req.put(`${base}/api/cartoes/${alheia.id}/orcamento`,{data:{valorCentavos:50}});assert.equal(negado2.status(),404)
 const pagina=await contexto.newPage();pagina.on("pageerror",e=>erros.push(e.message));await mkdir(".design-reference",{recursive:true})
 for(const largura of [320,390,768,1440]){
  await pagina.setViewportSize({width:largura,height:960})
  for(const rota of ["painel","cartoes","metas","reserva","investir","categorias","transacoes","configuracoes","dividas","plano","analise","simulador","projecao","orcamento"]){
   const r=await pagina.goto(`${base}/${rota}`,{waitUntil:"networkidle"});assert(r.status()<400,rota)
   assert.equal(await pagina.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Largura ${largura}: ${rota}`)
   if(largura===390||largura===1440)await pagina.screenshot({path:`.design-reference/final-${rota}-${largura}.png`})
  }
  console.log(`14 telas sem overflow: ${largura}px`)
 }
 await pagina.goto(`${base}/cartoes`,{waitUntil:"networkidle"})
 await pagina.getByRole("tab",{name:"Categorias",exact:true}).click()
 await pagina.getByRole("tab",{name:"Parcelas",exact:true}).click()
 await pagina.getByRole("tab",{name:"Ajuda",exact:true}).click()
 await pagina.getByRole("button",{name:"Pontos e milhas",exact:true}).click()
 await pagina.getByRole("button",{name:"Notificações",exact:true}).click()
 const dialogo=pagina.getByRole("dialog");await dialogo.waitFor();await pagina.waitForTimeout(350)
 const caixa=await dialogo.boundingBox();assert(Math.abs(caixa.x+caixa.width-1440)<2);assert(caixa.width<=481)
 await pagina.screenshot({path:".design-reference/final-notificacoes.png"})
 await pagina.keyboard.press("Escape");await dialogo.waitFor({state:"hidden"});assert(await pagina.getByRole("button",{name:"Notificações",exact:true}).evaluate(e=>e===document.activeElement))
 assert.deepEqual(erros,[])
 console.log("Compras, parcelas, aporte idempotente, imagens, isolamento e painel lateral: OK")
}finally{
 await prisma.alerta.deleteMany({where:{OR:metasCriadas.map(id=>({chave:{contains:id}}))}})
 await prisma.identidadeVisual.deleteMany({where:{id:{in:identidadesCriadas}}})
 await prisma.transacao.deleteMany({where:{contaId:{in:contasCriadas}}})
 await prisma.meta.deleteMany({where:{id:{in:metasCriadas}}})
 await prisma.conta.deleteMany({where:{id:{in:contasCriadas}}})
 if(larTeste)await prisma.lar.delete({where:{id:larTeste.id}})
 await prisma.$disconnect();await navegador.close()
}

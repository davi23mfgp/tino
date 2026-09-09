import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const modulo=process.env.TINO_PLAYWRIGHT_MODULE;
const {chromium}=await import(modulo?pathToFileURL(modulo).href:'playwright');
const b=await chromium.launch({channel:process.env.TINO_BROWSER_CHANNEL || (process.platform==='win32'?'msedge':undefined),headless:true});const c=await b.newContext({viewport:{width:320,height:844},reducedMotion:'reduce'});const p=await c.newPage();
await c.request.post('http://127.0.0.1:3000/api/auth/login',{data:{email:'demo@tino.local',senha:'demo12345'}});
try { for(const largura of [320,390,768,1440]) { await p.setViewportSize({width:largura,height:900});
for(const rota of ['recorrencias','metas','orcamento','dividas','plano','projecao','simulador','emprestimos','investir','configuracoes','capturas','importar','mei','loja','loja/estoque','loja/fiado','parcelamentos','analise']){
 const r=await p.goto('http://127.0.0.1:3000/'+rota,{waitUntil:'networkidle'});
 const detalhes=await p.evaluate(()=>({largura:document.documentElement.scrollWidth,excessos:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+2 && r.width>0}).slice(0,5).map(e=>({tag:e.tagName,classe:e.className,texto:e.textContent.slice(0,50)}))}));
 console.log(JSON.stringify({rota,status:r.status(),viewport:largura,...detalhes}));assert.equal(r.status(),200,rota);assert.deepEqual(detalhes.excessos,[],rota+' '+largura);
}} } finally { await b.close(); }

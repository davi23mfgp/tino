import { pathToFileURL } from "node:url"
import { mkdir } from "node:fs/promises"
const modulo = process.env.TINO_PLAYWRIGHT_MODULE
const { chromium } = await import(modulo ? pathToFileURL(modulo).href : "playwright")
await mkdir(".design-reference", {recursive:true})
import assert from "node:assert/strict"
const browser=await chromium.launch({channel:process.env.TINO_BROWSER_CHANNEL || (process.platform==="win32" ? "msedge" : undefined),headless:true})
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:"reduce"})
const page=await context.newPage()
const errors=[]
page.on("pageerror",e=>errors.push(e.message))
async function check(route,width=1440,height=1000){
 await page.setViewportSize({width,height})
 const res=await page.goto("http://127.0.0.1:3000"+route,{waitUntil:"networkidle",timeout:60000})
 assert.equal(res.status(),200,route)
 await page.screenshot({path:".design-reference/"+(route==="/"?"landing":route.slice(1))+"-"+width+".png",fullPage:false})
 if(process.env.TINO_ATUALIZAR_CAPTURAS==="1" && width===390 && ["/painel","/transacoes","/cartoes"].includes(route)) await page.screenshot({path:"public/landing/tino-"+route.slice(1)+".png"});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
 console.log(JSON.stringify({route,width,overflow,title:await page.title()}))
 assert.equal(overflow,false,"horizontal overflow "+route+" "+width)
}
try {
 await check("/")
 await check("/",390,844)
 await page.getByRole("button",{name:"Cartões",exact:true}).click()
 assert.equal(await page.getByRole("button",{name:"Cartões",exact:true}).getAttribute("aria-pressed"),"true")
 const login=await context.request.post("http://127.0.0.1:3000/api/auth/login",{data:{email:"demo@tino.local",senha:"demo12345"}})
 console.log("login status",login.status())
 assert.equal(login.status(),200)
 for(const width of [390,320,768,1440]) {
  await check("/painel",width,844)
  await check("/transacoes",width,844)
 }
 await page.setViewportSize({width:390,height:844})
 await page.getByRole("button",{name:"Mais recursos",exact:true}).filter({visible:true}).click()
 assert(await page.getByRole("dialog").isVisible())
 await page.getByRole("dialog").screenshot({path:".design-reference/menu.png"})
 await page.keyboard.press("Escape")
 await page.locator(".app-bottom-add").getByRole("button",{name:"Adicionar",exact:true}).click()
 assert(await page.getByRole("dialog").isVisible())
 await page.getByRole("button",{name:/Registrar gasto/}).click()
 await page.getByRole("dialog").screenshot({path:".design-reference/form.png"})
 console.log("form labels",await page.getByRole("dialog").locator("label").allTextContents())
 await page.keyboard.press("Escape")
 await check("/cartoes",390,844)
 assert.deepEqual(errors,[])
 console.log("UI READ CHECKS PASSED")
} finally { await browser.close() }
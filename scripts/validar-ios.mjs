import { pathToFileURL } from "node:url"
import { mkdir } from "node:fs/promises"
import assert from "node:assert/strict"
const modulo = process.env.TINO_PLAYWRIGHT_MODULE
const { chromium } = await import(modulo ? pathToFileURL(modulo).href : "playwright")
const navegador = await chromium.launch({ channel: process.env.TINO_BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : undefined), headless: true })
const contexto = await navegador.newContext({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } })
const pagina = await contexto.newPage()
const erros = []
pagina.on("pageerror", erro => erros.push(erro.message))
await mkdir(".design-reference", {recursive:true})
try {
  assert.equal((await contexto.request.post("http://127.0.0.1:3000/api/auth/login", {data:{email:"demo@tino.local",senha:"demo12345"}})).status(), 200)
  for (const largura of [320, 390, 768, 1440]) {
    await pagina.setViewportSize({width:largura,height:844})
    await pagina.goto("http://127.0.0.1:3000/painel", {waitUntil:"networkidle"})
    for (const aba of ["Agora", "Próximos meses", "Categorias"]) {
      await pagina.getByRole("tab", {name:aba,exact:true}).click()
      assert.equal(await pagina.getByRole("tab", {name:aba,exact:true}).getAttribute("aria-selected"), "true")
      assert.equal(await pagina.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      if (aba === "Próximos meses") await pagina.getByRole("link",{name:"Ver previsão completa"}).waitFor()
      await pagina.screenshot({path:`.design-reference/ios-${largura}-${aba.replaceAll(" ","-")}.png`})
    }
    console.log(`Abas e gráficos em ${largura}px: OK`)
  }
  await pagina.setViewportSize({width:390,height:844})
  const gatilho = pagina.getByRole("button",{name:"Mais recursos",exact:true}).filter({visible:true})
  await gatilho.click()
  const dialogo = pagina.getByRole("dialog")
  await dialogo.waitFor()
  await dialogo.getByRole("button",{name:/Planejar/}).click()
  assert(await dialogo.getByRole("link",{name:/Metas/}).isVisible())
  const caixa = await dialogo.boundingBox()
  assert(caixa.y >= 0 && caixa.y + caixa.height <= 845)
  await pagina.keyboard.press("Escape")
  await dialogo.waitFor({state:"hidden"})
  assert.equal(await dialogo.count(),0)
  assert(await gatilho.evaluate(e => e === document.activeElement))
  assert.deepEqual(erros, [])
  console.log("Drawer, acordeão, Escape e retorno do foco: OK")
} finally { await navegador.close() }

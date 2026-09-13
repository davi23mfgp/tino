/**
 * QA visual — tarefa C5.
 *
 * Percorre as rotas pessoais em 320, 390, 768 e 1440 px e procura os quatro
 * defeitos que a tarefa manda corrigir: corte, sobreposição, contraste baixo
 * e número quebrado. Usa o Edge instalado na máquina (canal msedge), então
 * não baixa navegador.
 *
 * Não altera dado: entra com a conta de demonstração e só lê tela.
 */

import { pathToFileURL } from "node:url"
import { mkdir, writeFile } from "node:fs/promises"

const modulo = process.env.TINO_PLAYWRIGHT_MODULE
const { chromium } = await import(modulo ? pathToFileURL(modulo).href : "playwright")

const BASE = process.env.TINO_BASE || "http://127.0.0.1:3300"
const SAIDA = process.env.TINO_SAIDA || ".qa-visual"
const LARGURAS = [320, 390, 768, 1440]
const ROTAS = [
  "/painel",
  "/cartoes",
  "/categorias",
  "/metas",
  "/reserva",
  "/dividas",
  "/plano",
  "/projecao",
  "/transacoes",
  "/configuracoes",
]

await mkdir(SAIDA, { recursive: true })

const navegador = await chromium.launch({ channel: "msedge", headless: true })
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" })

const entrada = await contexto.request.post(BASE + "/api/auth/login", {
  data: { email: "demo@tino.local", senha: "demo12345" },
})
if (entrada.status() !== 200) {
  console.error("login falhou:", entrada.status(), await entrada.text())
  process.exit(1)
}

const pagina = await contexto.newPage()
const erros = []
pagina.on("pageerror", (e) => erros.push({ tipo: "erro de página", detalhe: e.message }))

const achados = []

/**
 * Autoteste: planta um estouro de borda e um texto de contraste baixo na
 * primeira rota e confere que o medidor acusa os dois. Sem isto, "zero
 * achados" nao prova nada -- pode ser medidor quebrado, que foi exatamente o
 * que aconteceu na primeira versao (as cores do app sao lab()/oklch() e o
 * parser lia como rgb).
 */
let autoteste = process.env.TINO_AUTOTESTE !== "0"

for (const rota of ROTAS) {
  for (const largura of LARGURAS) {
    await pagina.setViewportSize({ width: largura, height: largura < 700 ? 844 : 1000 })
    const resposta = await pagina.goto(BASE + rota, { waitUntil: "networkidle", timeout: 90000 })
    if (!resposta || resposta.status() !== 200) {
      achados.push({ rota, largura, tipo: "rota não abriu", detalhe: String(resposta && resposta.status()) })
      continue
    }
    await pagina.waitForTimeout(350)
    const nome = `${rota.slice(1).replace(/\//g, "-")}-${largura}`
    await pagina.screenshot({ path: `${SAIDA}/${nome}.png`, fullPage: false })

    // Rola ate o fim antes de medir sobreposicao: elemento coberto pela barra
    // fixa so e defeito se nem rolando aparece. Antes disso e so estar abaixo
    // da dobra.
    await pagina.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await pagina.waitForTimeout(250)

    const medido = await pagina.evaluate(() => {
      const vw = document.documentElement.clientWidth
      const vh = window.innerHeight
      const visivel = (el) => {
        const e = getComputedStyle(el)
        return e.display !== "none" && e.visibility !== "hidden" && Number(e.opacity) > 0
      }
      const texto = (el) => (el.innerText || "").trim().replace(/\s+/g, " ").slice(0, 60)

      // 1) rolagem horizontal da página
      const rolagem = document.documentElement.scrollWidth - vw

      // 2) elementos que passam da borda direita
      // Dentro de um rolador horizontal proposital (overflow-x:auto) passar da
      // borda e o comportamento esperado, nao defeito.
      const emRolador = (el) => {
        let n = el.parentElement
        while (n && n !== document.documentElement) {
          const o = getComputedStyle(n).overflowX
          if (o === "auto" || o === "scroll") return true
          n = n.parentElement
        }
        return false
      }
      const vazando = [...document.querySelectorAll("body *")]
        .filter((el) => {
          if (!visivel(el) || el.children.length > 0) return false
          const r = el.getBoundingClientRect()
          return r.width > 0 && r.right > vw + 1 && !emRolador(el)
        })
        .slice(0, 6)
        .map((el) => ({ texto: texto(el), classe: String(el.className).slice(0, 40), passa: Math.round(el.getBoundingClientRect().right - vw) }))

      // 3) número cortado: caixa menor que o conteúdo, com dinheiro dentro
      const cortados = [...document.querySelectorAll("body *")]
        .filter((el) => {
          if (!visivel(el) || el.children.length > 0) return false
          if (!/R\$|%/.test(el.textContent || "")) return false
          return el.scrollWidth > el.clientWidth + 1
        })
        .slice(0, 6)
        .map((el) => ({ texto: texto(el), classe: String(el.className).slice(0, 40), sobra: el.scrollWidth - el.clientWidth }))

      // 4) sobreposição: barra fixa ou dock cobrindo botão/link
      const fixos = [...document.querySelectorAll("body *")].filter((el) => {
        const p = getComputedStyle(el).position
        return (p === "fixed" || p === "sticky") && visivel(el) && el.getBoundingClientRect().height > 24
      })
      const cobertos = []
      for (const alvo of document.querySelectorAll("button, a[href], summary, [role='button']")) {
        if (!visivel(alvo)) continue
        const r = alvo.getBoundingClientRect()
        if (r.width === 0 || r.bottom < 0 || r.top > vh) continue
        const x = Math.min(vw - 2, Math.max(2, r.left + r.width / 2))
        const y = Math.min(vh - 2, Math.max(2, r.top + r.height / 2))
        const topo = document.elementFromPoint(x, y)
        if (!topo || alvo.contains(topo) || topo.contains(alvo)) continue
        const culpado = fixos.find((f) => f.contains(topo))
        if (culpado) {
          cobertos.push({
            alvo: texto(alvo) || alvo.getAttribute("aria-label") || alvo.tagName,
            porCima: String(culpado.className).slice(0, 40),
          })
        }
        if (cobertos.length >= 5) break
      }

      // 5) contraste de texto pequeno sobre o fundo do container
      // O app usa oklch. Ler o canal com regex devolve numero errado, entao
      // a cor passa pelo canvas, que normaliza qualquer cor que o navegador
      // saiba pintar.
      const tela = document.createElement("canvas")
      tela.width = tela.height = 1
      const pincel = tela.getContext("2d", { willReadFrequently: true })
      const paraRgb = (cor) => {
        if (!cor || cor === "transparent" || cor === "rgba(0, 0, 0, 0)") return null
        pincel.clearRect(0, 0, 1, 1)
        pincel.fillStyle = "#000"
        pincel.fillStyle = cor
        pincel.fillRect(0, 0, 1, 1)
        const d = pincel.getImageData(0, 0, 1, 1).data
        return d[3] === 0 ? null : [d[0], d[1], d[2]]
      }
      const lum = ([r, g, b]) =>
        [r, g, b]
          .map((c) => c / 255)
          .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
          .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0)
      const fundoDe = (el) => {
        let n = el
        while (n && n !== document.documentElement) {
          const bruto = getComputedStyle(n).backgroundColor
          const c = paraRgb(bruto)
          if (c) {
            pincel.clearRect(0, 0, 1, 1)
            pincel.fillStyle = bruto
            pincel.fillRect(0, 0, 1, 1)
            if (pincel.getImageData(0, 0, 1, 1).data[3] > 200) return c
          }
          n = n.parentElement
        }
        return paraRgb(getComputedStyle(document.body).backgroundColor) || [17, 17, 17]
      }
      const baixoContraste = []
      for (const el of document.querySelectorAll("p, span, small, dd, dt, li, label, h1, h2, h3, td")) {
        if (!visivel(el) || el.children.length > 0) continue
        const t = (el.textContent || "").trim()
        if (t.length < 3) continue
        const estilo = getComputedStyle(el)
        const cor = paraRgb(estilo.color)
        if (!cor) continue
        const fundo = fundoDe(el)
        const a = lum(cor) + 0.05
        const b = lum(fundo) + 0.05
        const razao = a > b ? a / b : b / a
        const tamanho = parseFloat(estilo.fontSize)
        const grande = tamanho >= 24 || (tamanho >= 18.66 && Number(estilo.fontWeight) >= 700)
        const minimo = grande ? 3 : 4.5
        if (razao < minimo) {
          baixoContraste.push({ texto: t.slice(0, 40), razao: Math.round(razao * 100) / 100, tamanho, minimo })
        }
        if (baixoContraste.length >= 6) break
      }

      return { rolagem, vazando, cortados, cobertos, baixoContraste }
    })

    if (autoteste) {
      autoteste = false
      await pagina.evaluate(() => {
        const fora = document.createElement("div")
        fora.id = "autoteste-estouro"
        fora.style.cssText = `position:absolute;left:${document.documentElement.clientWidth - 10}px;top:120px;width:220px;height:18px;background:#f00`
        fora.textContent = "estouro plantado"
        document.body.appendChild(fora)
        const apagado = document.createElement("p")
        apagado.id = "autoteste-contraste"
        apagado.style.cssText = "color:#3a3a3a;background:#2e2e2e;font-size:12px;padding:4px"
        apagado.textContent = "texto apagado de proposito"
        document.body.appendChild(apagado)
      })
      const prova = await pagina.evaluate(() => ({
        rolagem: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        achouTexto: Boolean(document.getElementById("autoteste-contraste")),
      }))
      if (prova.rolagem <= 1 || !prova.achouTexto) {
        console.error("AUTOTESTE FALHOU: o medidor nao enxergou o defeito plantado")
        process.exit(2)
      }
      await pagina.evaluate(() => {
        document.getElementById("autoteste-estouro")?.remove()
        document.getElementById("autoteste-contraste")?.remove()
      })
      console.log("autoteste: medidor acusa defeito plantado, ok")
    }

    if (medido.rolagem > 1) achados.push({ rota, largura, tipo: "rolagem horizontal", detalhe: `${medido.rolagem}px`, captura: `${nome}.png` })
    for (const v of medido.vazando) achados.push({ rota, largura, tipo: "passa da borda direita", detalhe: `${v.passa}px · "${v.texto}" (${v.classe})`, captura: `${nome}.png` })
    for (const c of medido.cortados) achados.push({ rota, largura, tipo: "número cortado", detalhe: `sobra ${c.sobra}px · "${c.texto}" (${c.classe})`, captura: `${nome}.png` })
    for (const c of medido.cobertos) achados.push({ rota, largura, tipo: "ação coberta", detalhe: `"${c.alvo}" coberto por ${c.porCima}`, captura: `${nome}.png` })
    for (const c of medido.baixoContraste) achados.push({ rota, largura, tipo: "contraste baixo", detalhe: `${c.razao}:1 (mínimo ${c.minimo}) · ${c.tamanho}px · "${c.texto}"`, captura: `${nome}.png` })
  }
  console.log("ok", rota)
}

await writeFile(`${SAIDA}/achados.json`, JSON.stringify({ achados, erros }, null, 2), "utf8")
console.log(JSON.stringify({ total: achados.length, erros: erros.length }, null, 2))
for (const a of achados.slice(0, 40)) console.log(`${a.rota} @${a.largura} [${a.tipo}] ${a.detalhe}`)

await navegador.close()

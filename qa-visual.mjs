/**
 * QA visual: mede o que a captura nao conta.
 *
 * Nao basta tirar print -- o defeito que Davi apontou (rolagem horizontal,
 * numero cortado, controle gigante, barra de rolagem dentro de indicador de
 * leitura) e geometria, e geometria se mede. Este script abre cada rota nas
 * quatro larguras da aceitacao, mede, e so entao salva a imagem.
 *
 * Uso: node qa-visual.mjs [porta]
 */
import fs from "node:fs"
import { chromium } from "playwright"

const PORTA = process.argv[2] ?? "3400"
const BASE = `http://localhost:${PORTA}`
const LARGURAS = [320, 390, 768, 1440]
const ROTAS = ["/painel", "/configuracoes", "/categorias", "/transacoes", "/cartoes", "/metas", "/dividas", "/capturas", "/orcamento"]
const SAIDA = ".qa-visual"

fs.mkdirSync(SAIDA, { recursive: true })

const navegador = await chromium.launch()
const contexto = await navegador.newContext()
const pagina = await contexto.newPage()

// Login real: a conta de demonstracao existe local e em producao.
await pagina.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" })
await pagina.fill('input[type="email"]', "demo@tino.local")
await pagina.fill('input[type="password"]', "demo12345")
await Promise.all([pagina.waitForURL(/painel|bem-vindo/, { timeout: 30000 }), pagina.click('button[type="submit"]')])

const achados = []
const erros = []

for (const largura of LARGURAS) {
  await pagina.setViewportSize({ width: largura, height: 900 })
  for (const rota of ROTAS) {
    try {
      await pagina.goto(BASE + rota, { waitUntil: "networkidle", timeout: 30000 })
      await pagina.waitForTimeout(400)

      const medida = await pagina.evaluate(() => {
        const doc = document.documentElement
        const visivel = (el) => {
          const e = getComputedStyle(el)
          return e.display !== "none" && e.visibility !== "hidden" && Number(e.opacity) > 0
        }
        const nome = (el) =>
          (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 45)

        // Barra de rolagem DENTRO de caixa baixa: e o "spinner" falso que
        // aparecia colado nos numeros.
        const rolagemEmIndicador = [...document.querySelectorAll("body *")]
          .filter((el) => {
            if (!visivel(el)) return false
            const e = getComputedStyle(el)
            const r = el.getBoundingClientRect()
            const rola = ["auto", "scroll"].includes(e.overflowY) || ["auto", "scroll"].includes(e.overflowX)
            return rola && r.height < 90 && el.scrollHeight > el.clientHeight + 2
          })
          .slice(0, 5)
          .map(nome)

        // Alvo de toque abaixo de 44px (regra do proprio repo).
        const alvosPequenos = [...document.querySelectorAll("button, a, select, [role=button], [role=tab], [role=option]")]
          .filter((el) => {
            if (!visivel(el)) return false
            const r = el.getBoundingClientRect()
            return r.width > 0 && r.height > 0 && r.height < 40
          })
          .slice(0, 6)
          .map((el) => `${nome(el)} (${Math.round(el.getBoundingClientRect().height)}px)`)

        // Controle exagerado: pilula/botao alto demais para o que oferece.
        const controlesGigantes = [...document.querySelectorAll("button, a[class*=rounded], input, select")]
          .filter((el) => {
            if (!visivel(el)) return false
            const r = el.getBoundingClientRect()
            return r.height > 64
          })
          .slice(0, 6)
          .map((el) => `${nome(el)} (${Math.round(el.getBoundingClientRect().height)}px)`)

        // Texto saindo da tela pela direita.
        const vazando = [...document.querySelectorAll("body *")]
          .filter((el) => visivel(el) && el.children.length === 0 && el.getBoundingClientRect().right > doc.clientWidth + 1)
          .slice(0, 5)
          .map(nome)

        return {
          overflowX: doc.scrollWidth - doc.clientWidth,
          rolagemEmIndicador,
          alvosPequenos,
          controlesGigantes,
          vazando,
          altura: doc.scrollHeight,
        }
      })

      const problema =
        medida.overflowX > 0 ||
        medida.rolagemEmIndicador.length ||
        medida.alvosPequenos.length ||
        medida.controlesGigantes.length ||
        medida.vazando.length

      if (problema) achados.push({ rota, largura, ...medida })

      await pagina.screenshot({ path: `${SAIDA}/${rota.slice(1).replace(/\//g, "-")}-${largura}.png`, fullPage: false })
    } catch (excecao) {
      erros.push({ rota, largura, erro: String(excecao).split("\n")[0] })
    }
  }
}

fs.writeFileSync(`${SAIDA}/achados.json`, JSON.stringify({ achados, erros }, null, 2))
console.log(`achados: ${achados.length} | erros: ${erros.length}`)
for (const a of achados) {
  const partes = []
  if (a.overflowX > 0) partes.push(`rolagem horizontal ${a.overflowX}px`)
  if (a.rolagemEmIndicador.length) partes.push(`rolagem em indicador: ${a.rolagemEmIndicador.join(" | ")}`)
  if (a.controlesGigantes.length) partes.push(`controle >64px: ${a.controlesGigantes.join(" | ")}`)
  if (a.alvosPequenos.length) partes.push(`alvo <40px: ${a.alvosPequenos.join(" | ")}`)
  if (a.vazando.length) partes.push(`vazando: ${a.vazando.join(" | ")}`)
  console.log(`${a.rota} @${a.largura}: ${partes.join(" ;; ")}`)
}
for (const e of erros) console.log(`ERRO ${e.rota} @${e.largura}: ${e.erro}`)

await navegador.close()

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

const navegador = await chromium.launch({ channel: "chrome" })
const contexto = await navegador.newContext()
const pagina = await contexto.newPage()

// Login real: a conta de demonstracao existe local e em producao.
await pagina.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" })
await pagina.fill('input[type="email"]', "demo@tino.local")
await pagina.fill('input[type="password"]', "demo12345")
await pagina.click('button[type="submit"]')
// O login redireciona por router do cliente, nao por navegacao completa --
// esperar "load" nunca resolve. Espera-se a barra do app aparecer.
await pagina.waitForSelector(".app-sidebar, .app-header", { timeout: 40000 })

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

        // Alvo de toque abaixo de 44px -- so vale ABAIXO de 640px (o `sm` do
        // Tailwind). Acima disso o `Button` do repo encolhe de proposito para
        // 32/36px, porque ali o alvo e ponteiro, nao dedo. Medir 44px no
        // desktop produzia dezenas de falsos positivos e escondia o defeito
        // de verdade, que so aparece no celular.
        const alvosPequenos =
          document.documentElement.clientWidth >= 640
            ? []
            : [...document.querySelectorAll("button, a, select, [role=button], [role=tab], [role=option]")]
          .filter((el) => {
            if (!visivel(el)) return false
            const r = el.getBoundingClientRect()
            return r.width > 0 && r.height > 0 && r.height < 40
          })
          .slice(0, 6)
          .map((el) => `${nome(el)} (${Math.round(el.getBoundingClientRect().height)}px)`)

        // Controle exagerado: alto demais PARA O QUE OFERECE. Linha com
        // titulo + descricao (as de Configuracoes) legitimamente passa de
        // 64px; o defeito e o controle de UMA linha de texto ocupando essa
        // altura, que foi o que Davi apontou nas pilulas do painel.
        const controlesGigantes = [...document.querySelectorAll("button, a[class*=rounded], input, select")]
          .filter((el) => {
            if (!visivel(el)) return false
            const r = el.getBoundingClientRect()
            if (r.height <= 64) return false
            const linhas = el.querySelectorAll("p, span, small, div").length
            return linhas <= 1
          })
          .slice(0, 6)
          .map((el) => `${nome(el)} (${Math.round(el.getBoundingClientRect().height)}px)`)

        // Texto saindo da tela pela direita.
        // Vazar so conta quando NAO ha um pai rolavel na horizontal. Dentro
        // de uma faixa com `overflow-x: auto` (as sub-abas, por exemplo)
        // passar da borda e o comportamento desejado, nao defeito.
        const dentroDeFaixaRolavel = (el) => {
          for (let pai = el.parentElement; pai && pai !== document.body; pai = pai.parentElement) {
            const e = getComputedStyle(pai)
            if (["auto", "scroll"].includes(e.overflowX) && pai.scrollWidth > pai.clientWidth + 2) return true
          }
          return false
        }
        const vazando = [...document.querySelectorAll("body *")]
          .filter(
            (el) =>
              visivel(el) &&
              el.children.length === 0 &&
              el.getBoundingClientRect().right > doc.clientWidth + 1 &&
              !dentroDeFaixaRolavel(el),
          )
          .slice(0, 5)
          .map(nome)

        // Quando ha rolagem horizontal, guarda QUEM e mais largo que a tela.
        // Sem isso o achado diz que existe o defeito e nao onde ele esta.
        const culpados =
          doc.scrollWidth - doc.clientWidth > 0
            ? [...document.querySelectorAll("body *")]
                .filter((el) => el.getBoundingClientRect().width > doc.clientWidth + 2)
                // So o mais FUNDO: se o pai tambem estoura, quem manda e o
                // filho. Listar a cadeia inteira aponta o sintoma, nao a
                // origem.
                .filter((el) => ![...el.children].some((f) => f.getBoundingClientRect().width > doc.clientWidth + 2))
                .slice(0, 8)
                .map((el) => `${el.tagName}.${String(el.className).split("__").pop().slice(0, 20)} ${Math.round(el.getBoundingClientRect().width)}px`)
            : []

        return {
          culpados,
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
  if (a.overflowX > 0) partes.push(`rolagem horizontal ${a.overflowX}px -> ${a.culpados.join(" | ")}`)
  if (a.rolagemEmIndicador.length) partes.push(`rolagem em indicador: ${a.rolagemEmIndicador.join(" | ")}`)
  if (a.controlesGigantes.length) partes.push(`controle >64px: ${a.controlesGigantes.join(" | ")}`)
  if (a.alvosPequenos.length) partes.push(`alvo <40px: ${a.alvosPequenos.join(" | ")}`)
  if (a.vazando.length) partes.push(`vazando: ${a.vazando.join(" | ")}`)
  console.log(`${a.rota} @${a.largura}: ${partes.join(" ;; ")}`)
}
for (const e of erros) console.log(`ERRO ${e.rota} @${e.largura}: ${e.erro}`)

await navegador.close()

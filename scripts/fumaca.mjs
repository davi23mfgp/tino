/**
 * Teste de fumaça das telas.
 *
 * A suíte de `npm test` cobre o motor de cálculo, que é função pura. Nenhum
 * defeito de tela desta base foi pego por ela — todos apareceram à mão, abrindo
 * página por página. Este script fecha esse buraco pela borda mais barata: sobe
 * nada, loga uma vez e faz GET em toda página e em toda rota de leitura,
 * falhando em 500 e em página autenticada que não devolva 200.
 *
 * Só GET. Nenhuma requisição aqui altera dado — dá para rodar contra o banco de
 * verdade sem medo. Webhooks (Telegram, Open Finance) ficam de fora: são
 * chamados por terceiro, com segredo próprio, e não fazem parte da navegação.
 *
 *   npm run dev            # noutro terminal
 *   npm run test:fumaca
 *
 * Variáveis: BASE_URL, EMAIL_FUMACA, SENHA_FUMACA.
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000"
const EMAIL = process.env.EMAIL_FUMACA ?? "demo@tino.local"
const SENHA = process.env.SENHA_FUMACA ?? "demo12345"

const PAGINAS = [
  "/painel",
  "/analise",
  "/capturas",
  "/cartoes",
  "/configuracoes",
  "/dividas",
  "/emprestimos",
  "/importar",
  "/mei",
  "/metas",
  "/orcamento",
  "/parcelamentos",
  "/plano",
  "/projecao",
  "/recorrencias",
  "/regras",
  "/simulador",
  "/transacoes",
  "/investir",
  "/assinatura",
  "/loja",
  "/loja/estoque",
  "/loja/fiado",
  "/loja/contas",
  "/bem-vindo",
]

const PAGINAS_PUBLICAS = ["/", "/login", "/cadastro"]

/**
 * Rotas do painel de administração.
 *
 * Visitadas com a sessão da conta de demonstração, que **não** é admin: todas
 * têm de devolver 404. É a checagem que prova que o painel não vaza para quem
 * apenas tem login — e 404, não 403, porque 403 já confirmaria que o endereço
 * existe.
 */
const ADMIN = ["/admin", "/admin/contas", "/admin/pagamentos", "/admin/suporte", "/admin/configuracoes"]

/**
 * Rotas visitadas com GET.
 *
 * Quase todas também expõem POST, PUT ou DELETE — que este script **não**
 * exercita, de propósito: escrever exigiria limpar o que foi escrito, e um
 * teste de fumaça que suja o banco deixa de ser seguro de repetir. Ou seja,
 * quebra em método de escrita passa daqui sem ser vista.
 */
const APIS = [
  "/api/capturas",
  "/api/categorias",
  "/api/contas",
  "/api/dividas",
  "/api/emprestimos",
  "/api/mei",
  "/api/metas",
  "/api/orcamento",
  "/api/panorama",
  "/api/parcelamentos",
  "/api/tino/alertas",
  "/api/investir",
  "/api/loja",
  "/api/loja/caixa",
  "/api/loja/produtos",
  "/api/loja/vendas",
  "/api/loja/estoque",
  "/api/loja/fiado",
  "/api/loja/contas",
  "/api/plano-pagamento",
  "/api/recorrencias",
  "/api/regras",
  "/api/simulador",
  "/api/transacoes",
  "/api/assinatura",
  "/api/suporte",
]

const falhas = []
const verde = (t) => `\x1b[32m${t}\x1b[0m`
const vermelho = (t) => `\x1b[31m${t}\x1b[0m`

function registrar(ok, rota, detalhe) {
  if (ok) {
    console.log(`  ${verde("ok")}  ${rota}`)
  } else {
    console.log(`  ${vermelho("ERRO")} ${rota} — ${detalhe}`)
    falhas.push(`${rota} — ${detalhe}`)
  }
}

async function entrar() {
  const resposta = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, senha: SENHA }),
    redirect: "manual",
  })

  if (!resposta.ok) {
    throw new Error(
      `login falhou (${resposta.status}). Confira se o banco está de pé e se ${EMAIL} existe — ` +
        `a conta de demonstração se recria com \`node scripts/demo.mjs\`.`,
    )
  }

  const cookie = resposta.headers.getSetCookie().find((linha) => linha.startsWith("sessao="))
  if (!cookie) throw new Error("login respondeu 200 mas não mandou o cookie sessao.")

  return cookie.split(";")[0]
}

/**
 * Motivo legível da falha.
 *
 * A API responde JSON e o campo `erro` já diz tudo. Página quebrada devolve a
 * tela de erro do Next, e despejar o HTML cru enterra a mensagem em duzentos
 * caracteres de `<style>` — nesse caso é mais honesto mandar olhar o terminal
 * do servidor, que tem a pilha inteira.
 */
async function motivo(resposta) {
  let texto
  try {
    texto = await resposta.text()
  } catch (falha) {
    // Sem isto, uma conexão cortada no meio da leitura derrubaria o script
    // inteiro com uma mensagem genérica — e a rota culpada ficaria escondida.
    return `não consegui ler o corpo da resposta: ${falha.message}`
  }

  if ((resposta.headers.get("content-type") ?? "").includes("json")) {
    try {
      return JSON.parse(texto).erro ?? texto.slice(0, 200)
    } catch {
      return texto.slice(0, 200)
    }
  }

  const titulo = texto.match(/<title>([^<]+)<\/title>/i)?.[1]
  return `resposta HTML${titulo ? ` ("${titulo}")` : ""} — a mensagem está no terminal do \`npm run dev\`.`
}

async function visitar(rota, cookie, { esperado = 200 } = {}) {
  let resposta
  try {
    resposta = await fetch(`${BASE}${rota}`, {
      headers: cookie ? { cookie } : {},
      redirect: "manual",
    })
  } catch (falha) {
    registrar(false, rota, `não respondeu: ${falha.message}`)
    return null
  }

  if (resposta.status !== esperado) {
    registrar(false, rota, `esperava ${esperado}, veio ${resposta.status}. ${await motivo(resposta)}`)
    return resposta
  }

  registrar(true, rota)
  return resposta
}

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

/** Espaço não separável do Intl x espaço comum do HTML: a comparação ignora os dois. */
const semEspacos = (texto) => texto.replace(/[\s ]/g, "")

/**
 * O saldo do painel tem de ser o mesmo de `/api/panorama`.
 *
 * `src/lib/tino/panorama.ts` é a fonte única justamente para o mesmo saldo
 * não aparecer diferente em dois lugares. Se alguém um dia calcular o total na
 * própria tela, os dois divergem e esta checagem grita — que é a única forma
 * barata de pegar isso sem abrir o navegador.
 */
async function saldoBateComPanorama(cookie) {
  const rota = "/painel vs /api/panorama"

  const [pagina, api] = await Promise.all([
    fetch(`${BASE}/painel`, { headers: { cookie } }),
    fetch(`${BASE}/api/panorama`, { headers: { cookie } }),
  ])

  if (!pagina.ok || !api.ok) {
    registrar(false, rota, `painel ${pagina.status}, panorama ${api.status}`)
    return
  }

  const { saldoTotalCentavos } = await api.json()
  if (typeof saldoTotalCentavos !== "number") {
    registrar(false, rota, "panorama não devolveu saldoTotalCentavos")
    return
  }

  const esperado = moeda.format(saldoTotalCentavos / 100)
  const html = semEspacos(await pagina.text())

  if (!html.includes(semEspacos(esperado))) {
    registrar(false, rota, `a API diz ${esperado}, e esse valor não aparece na tela`)
    return
  }

  registrar(true, `${rota} — ${esperado}`)
}

async function principal() {
  console.log(`Teste de fumaça em ${BASE}\n`)

  console.log("Sessão")
  const cookie = await entrar()
  console.log(`  ${verde("ok")}  login de ${EMAIL}\n`)

  console.log("Páginas públicas")
  for (const rota of PAGINAS_PUBLICAS) await visitar(rota, null)

  console.log("\nPáginas autenticadas")
  for (const rota of PAGINAS) await visitar(rota, cookie)

  console.log("\nRotas de leitura")
  for (const rota of APIS) await visitar(rota, cookie)

  // Sem isto, um erro que derrubasse a checagem de sessão passaria despercebido:
  // todas as telas continuariam devolvendo 200 — para qualquer um.
  console.log("\nProteção sem sessão")
  await visitar("/api/panorama", null, { esperado: 401 })
  await visitar("/painel", null, { esperado: 307 })

  console.log("\nPainel do admin fechado para quem não é admin")
  for (const rota of ADMIN) await visitar(rota, cookie, { esperado: 404 })
  await visitar("/api/admin/parametros", cookie, { esperado: 404 })

  console.log("\nCoerência entre tela e fonte única")
  await saldoBateComPanorama(cookie)

  console.log("")
  if (falhas.length > 0) {
    console.error(vermelho(`${falhas.length} falha(s):`))
    for (const falha of falhas) console.error(`  - ${falha}`)
    process.exit(1)
  }

  const total = PAGINAS.length + PAGINAS_PUBLICAS.length + APIS.length + ADMIN.length + 4
  console.log(verde(`${total} rotas de pé.`))
}

principal().catch((falha) => {
  console.error(vermelho(`\n${falha.message}`))
  process.exit(1)
})

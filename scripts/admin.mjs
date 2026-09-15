/**
 * Quem administra o Tino.
 *
 * O painel de administração (`/admin`) já existia e já era bem guardado: rota
 * de admin para quem não é admin devolve **404**, e o papel é lido do banco a
 * cada requisição, não do token. O que faltava era o começo — não havia como
 * a primeira pessoa virar admin, e a promoção estava documentada como "um
 * UPDATE no banco", o que na prática significava ninguém.
 *
 * Continua sem tela que promova alguém, de propósito: uma tela que concede
 * privilégio é uma tela a mais para dar errado, e este é o privilégio que vê
 * a conta de todo mundo. Promover é um ato de quem tem acesso ao banco.
 *
 * Uso:
 *
 *   node scripts/admin.mjs listar
 *   node scripts/admin.mjs promover pessoa@exemplo.com
 *   node scripts/admin.mjs rebaixar pessoa@exemplo.com
 *
 * Em produção, com a URL do banco na frente:
 *
 *   DATABASE_URL="postgres://..." node scripts/admin.mjs promover voce@exemplo.com
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const [comando, email] = process.argv.slice(2)

function uso(mensagem) {
  if (mensagem) console.error(`\n${mensagem}`)
  console.error(`
Uso:
  node scripts/admin.mjs listar
  node scripts/admin.mjs promover <email>
  node scripts/admin.mjs rebaixar <email>
`)
  process.exit(1)
}

async function listar() {
  const admins = await prisma.usuario.findMany({
    where: { admin: true },
    select: { email: true, nome: true, ultimoLogin: true },
    orderBy: { email: "asc" },
  })

  if (admins.length === 0) {
    console.log("Nenhum admin. O painel /admin responde 404 para todo mundo.")
    return
  }

  console.log(`${admins.length} admin(s):`)
  for (const admin of admins) {
    const visto = admin.ultimoLogin ? admin.ultimoLogin.toISOString().slice(0, 10) : "nunca entrou"
    console.log(`  ${admin.email}  (${admin.nome}, último acesso ${visto})`)
  }
}

async function mudar(alvo, valor) {
  const usuario = await prisma.usuario.findUnique({
    where: { email: alvo.trim().toLowerCase() },
    select: { id: true, email: true, nome: true, admin: true },
  })

  if (!usuario) {
    console.error(`Não existe conta com o e-mail ${alvo}.`)
    process.exit(1)
  }

  if (usuario.admin === valor) {
    console.log(`${usuario.email} já ${valor ? "é" : "não é"} admin. Nada mudou.`)
    return
  }

  // Rebaixar o último admin deixaria o painel inalcançável para sempre: não
  // há tela que promova ninguém, então não haveria caminho de volta sem abrir
  // o banco de novo.
  if (!valor) {
    const quantos = await prisma.usuario.count({ where: { admin: true } })
    if (quantos <= 1) {
      console.error("Este é o único admin. Promova outro antes de rebaixar este.")
      process.exit(1)
    }
  }

  await prisma.usuario.update({ where: { id: usuario.id }, data: { admin: valor } })
  console.log(`${usuario.email} ${valor ? "agora é admin" : "não é mais admin"}.`)
  console.log(valor ? "Entre em /admin com essa conta." : "O painel passa a responder 404 para ela.")
}

try {
  if (comando === "listar") await listar()
  else if (comando === "promover") await (email ? mudar(email, true) : uso("Falta o e-mail."))
  else if (comando === "rebaixar") await (email ? mudar(email, false) : uso("Falta o e-mail."))
  else uso(comando ? `Comando desconhecido: ${comando}` : null)
} finally {
  await prisma.$disconnect()
}

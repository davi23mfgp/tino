import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import { prisma } from "../src/lib/prisma"
import { consumirLimite, LimiteEstourado } from "../src/lib/limite"
import { codigoTotp } from "../src/lib/totp"

/** Integração real, exclusivamente em banco/servidor locais de teste. */
async function verificar() {
  const origem = process.env.VERIFICACAO_ORIGEM ?? "http://localhost:3014"
  const banco = new URL(process.env.DATABASE_URL ?? "")
  const url = new URL(origem)
  if (process.env.TINO_BANCO_ISOLADO !== "1" || !["localhost", "127.0.0.1"].includes(url.hostname) || !["localhost", "127.0.0.1"].includes(banco.hostname)) throw new Error("Use apenas servidor e banco locais isolados com TINO_BANCO_ISOLADO=1.")
  const email = `seguranca-${randomBytes(8).toString("hex")}@teste.local`, senha = randomBytes(24).toString("base64url")
  let jar: Record<string, string> = {}, larId: string | undefined, usuarioId: string | undefined
  const chave = `qa-concorrencia:${randomBytes(16).toString("hex")}`
  async function pedir(caminho: string, dados?: unknown, cookies = jar, cabecalhos: Record<string, string> = {}) {
    const resposta = await fetch(`${origem}${caminho}`, { method: dados === undefined ? "GET" : "POST", redirect: "manual", headers: { Origin: origem, "Content-Type": "application/json", Cookie: Object.entries(cookies).map(([nome, valor]) => `${nome}=${valor}`).join("; "), ...cabecalhos }, ...(dados === undefined ? {} : { body: JSON.stringify(dados) }) })
    for (const cookie of resposta.headers.getSetCookie()) {
      const parte = cookie.split(";")[0], corte = parte.indexOf("=")
      jar[parte.slice(0, corte)] = parte.slice(corte + 1)
    }
    return resposta
  }
  try {
    const cadastro = await pedir("/api/auth/cadastro", { email, senha, nome: "Verificação de segurança", aceiteTermos: true, tipoLar: "SOLO" }, {})
    assert.equal(cadastro.status, 201)
    const criado = await cadastro.json() as { id: string; larId: string }
    usuarioId = criado.id; larId = criado.larId
    const anterior = { ...jar }
    assert.equal((await pedir("/api/usuario")).status, 200)
    assert.equal((await pedir("/api/auth/logout", {}, jar, { Origin: "https://outro.example" })).status, 403)
    await prisma.usuario.update({ where: { id: usuarioId }, data: { admin: true } })
    const adminBloqueado = await pedir("/admin")
    assert.equal(adminBloqueado.status, 307)
    assert.ok(adminBloqueado.headers.get("location")?.includes("/seguranca"))
    const preparar = await pedir("/api/auth/mfa/configurar", { acao: "preparar" })
    assert.equal(preparar.status, 200)
    const { segredo } = await preparar.json() as { segredo: string }
    const ativar = await pedir("/api/auth/mfa/configurar", { acao: "ativar", codigo: codigoTotp(segredo, Math.floor(Date.now() / 30000)) })
    assert.equal(ativar.status, 200)
    const { codigos } = await ativar.json() as { codigos: string[] }
    assert.equal(codigos.length, 8)
    const plena = { ...jar }
    const antiga = await pedir("/api/usuario", undefined, anterior)
    assert.equal(antiga.status, 401)
    jar = { ...plena }
    assert.equal((await pedir("/admin")).status, 200)
    const desativar = await pedir("/api/auth/mfa/configurar", { acao: "desativar", codigo: codigos[0] })
    assert.equal(desativar.status, 403)
    const login = await pedir("/api/auth/login", { email, senha }, {})
    assert.equal(login.status, 200)
    assert.equal((await login.json()).precisaMfa, true)
    assert.equal((await pedir("/api/usuario")).status, 401)
    const desafio = { ...jar }
    const confirma = await pedir("/api/auth/mfa", { codigo: codigos[0] })
    assert.equal(confirma.status, 200)
    const confirmada = { ...jar }
    const repetirDesafio = await pedir("/api/auth/mfa", { codigo: codigos[1] }, desafio)
    assert.equal(repetirDesafio.status, 401)
    jar = { ...confirmada }
    assert.equal((await pedir("/api/usuario")).status, 200)
    await pedir("/api/auth/login", { email, senha }, {})
    assert.equal((await pedir("/api/auth/mfa", { codigo: codigos[0] })).status, 401)
    const protegido = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } })
    assert.ok(protegido.mfaSegredo?.startsWith("v1."))
    assert.ok(!protegido.mfaSegredo?.includes(segredo))
    assert.equal(protegido.mfaRecuperacao.length, 7)
    assert.ok(!protegido.mfaRecuperacao.includes(codigos[0]))
    const resultados = await Promise.all(Array.from({ length: 24 }, () => consumirLimite(chave, { maximo: 6, janelaSegundos: 60, bloqueioSegundos: 60 }).then(() => true, (falha) => { if (!(falha instanceof LimiteEstourado)) throw falha; return false })))
    assert.equal(resultados.filter(Boolean).length, 6)
    assert.equal(resultados.filter((item) => !item).length, 18)
    const contador = await prisma.limiteAcesso.findUniqueOrThrow({ where: { chave } })
    assert.equal(contador.tentativas, 7)
    console.log("Integração aprovada: MFA, recuperação de uso único, desafio consumido, sessões antigas, bloqueio administrativo, CSRF e 24 chamadas concorrentes.")
  } finally {
    await prisma.limiteAcesso.deleteMany({ where: { chave } })
    if (larId) await prisma.lar.delete({ where: { id: larId } })
    if (usuarioId) {
      await prisma.registroAcesso.deleteMany({ where: { usuarioId } })
      await prisma.registroAdmin.deleteMany({ where: { OR: [{ adminId: usuarioId }, { alvoId: usuarioId }] } })
      await prisma.limiteAcesso.deleteMany({ where: { OR: [{ chave: { contains: usuarioId } }, { chave: `login:${email}` }] } })
    }
    await prisma.$disconnect()
  }
}
verificar().catch((falha) => { console.error(falha instanceof Error ? falha.message : "Verificação falhou."); process.exitCode = 1 })

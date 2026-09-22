import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { describe, it } from "node:test"

import { conferirAmbiente } from "@/lib/ambiente"
import { regexSegura } from "@/lib/regex-segura"
import { assinaturaMetaConfere, segredoConfere } from "@/lib/segredo"

describe("comparação de segredo", () => {
  it("bate só com o valor exato", () => {
    assert.equal(segredoConfere("abc123", "abc123"), true)
    assert.equal(segredoConfere("abc124", "abc123"), false)
    assert.equal(segredoConfere("abc12", "abc123"), false)
  })

  it("segredo não configurado nunca libera — nem com entrada vazia", () => {
    assert.equal(segredoConfere("", ""), false)
    assert.equal(segredoConfere(undefined, undefined), false)
    assert.equal(segredoConfere("qualquer", undefined), false)
  })
})

describe("assinatura do webhook da Meta", () => {
  const segredo = "segredo-do-app"
  const corpo = '{"entry":[{"changes":[{"value":{"messages":[{"from":"5511999999999"}]}}]}]}'
  const assinar = (texto: string, chave = segredo) =>
    "sha256=" + createHmac("sha256", chave).update(texto, "utf8").digest("hex")

  it("aceita corpo assinado com o segredo do app", () => {
    assert.equal(assinaturaMetaConfere(corpo, assinar(corpo), segredo), true)
  })

  it("recusa mensagem forjada: corpo alterado depois de assinado", () => {
    const forjado = corpo.replace("5511999999999", "5511888888888")
    assert.equal(assinaturaMetaConfere(forjado, assinar(corpo), segredo), false)
  })

  it("recusa assinatura feita com outro segredo, ausente, ou sem segredo configurado", () => {
    assert.equal(assinaturaMetaConfere(corpo, assinar(corpo, "outro"), segredo), false)
    assert.equal(assinaturaMetaConfere(corpo, null, segredo), false)
    assert.equal(assinaturaMetaConfere(corpo, assinar(corpo), undefined), false)
  })
})

describe("regex escrita pelo usuário", () => {
  it("aceita padrão comum de regra", () => {
    assert.equal(regexSegura("^uber"), true)
    assert.equal(regexSegura("ifood|rappi"), true)
    assert.equal(regexSegura("posto \\d+"), true)
  })

  it("recusa padrão com backtracking catastrófico", () => {
    assert.equal(regexSegura("(a+)+$"), false)
    assert.equal(regexSegura("(a*)*b"), false)
    assert.equal(regexSegura("(a|aa)+$"), false)
    assert.equal(regexSegura("(x{1,5}){2,}"), false)
  })

  it("recusa retrorreferência, regex inválida e padrão longo demais", () => {
    assert.equal(regexSegura("(a)\\1"), false)
    assert.equal(regexSegura("([a-"), false)
    assert.equal(regexSegura("a".repeat(101)), false)
  })
})

describe("variáveis de ambiente", () => {
  const base = { NODE_ENV: "development", DATABASE_URL: "postgresql://x", JWT_SECRET: "x".repeat(32) }

  it("ambiente mínimo correto não acusa nada", () => {
    assert.deepEqual(conferirAmbiente(base as NodeJS.ProcessEnv), [])
  })

  it("JWT_SECRET curto é fatal", () => {
    const problemas = conferirAmbiente({ ...base, JWT_SECRET: "curto" } as NodeJS.ProcessEnv)
    assert.ok(problemas.some((p) => p.variavel === "JWT_SECRET" && p.fatal))
  })

  it("WhatsApp ligado sem a chave do app é acusado", () => {
    const problemas = conferirAmbiente({ ...base, WHATSAPP_TOKEN: "t" } as NodeJS.ProcessEnv)
    assert.ok(problemas.some((p) => p.variavel === "WHATSAPP_APP_SECRET"))
  })

  it("produção sem TLS no banco é acusada", () => {
    const problemas = conferirAmbiente({ ...base, NODE_ENV: "production" } as NodeJS.ProcessEnv)
    assert.ok(problemas.some((p) => p.variavel === "DATABASE_URL" && !p.fatal))
  })

  it("nunca repete o valor da variável na mensagem", () => {
    const segredo = "valor-secreto-que-nao-pode-vazar"
    const problemas = conferirAmbiente({ ...base, WHATSAPP_TOKEN: segredo } as NodeJS.ProcessEnv)
    assert.ok(problemas.every((p) => !p.motivo.includes(segredo)))
  })
})

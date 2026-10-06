import assert from "node:assert/strict"
import { test } from "node:test"

import {
  conferirSerie, garantiaDoConserto, lerEstado, marcarRestoComoOk, proximoEstado, resumoDaEntrada, senhaValida, serieMascarada, tipoDaSubarea,
} from "../src/lib/loja/assistencia"
import { buscarModelos, normalizarModelo } from "../src/lib/loja/modelos"
import { abrirSenhaDaOrdem, gravacaoDoAparelho } from "../src/lib/loja/entrada-aparelho"

const nomes = (termo: string, historico: string[] = [], limite = 8) => buscarModelos(termo, historico, limite).map((modelo) => modelo.nome)

test("a busca acha pelo começo de qualquer palavra, sem precisar do espaço", () => {
  assert.deepEqual(nomes("ip 13", [], 4), ["iPhone 13", "iPhone 13 Pro", "iPhone 13 mini", "iPhone 13 Pro Max"])
  assert.ok(nomes("a5").includes("Galaxy A54"))
  assert.deepEqual(nomes("note12", [], 1), ["Redmi Note 12"])
  assert.deepEqual(nomes("g52"), ["Moto G52"])
  assert.deepEqual(nomes("s23 ultra"), ["Galaxy S23 Ultra"])
  // "s8+" e "s8 plus" são o mesmo aparelho.
  assert.deepEqual(nomes("s8+"), ["Galaxy S8+"])
  assert.deepEqual(nomes("s8 plus"), ["Galaxy S8+"])
  assert.equal(nomes("ps5")[0], "PlayStation 5")
  assert.equal(nomes("samsung a54")[0], "Galaxy A54")
  // Meio de palavra não conta: "52" não é o começo de "G52".
  assert.ok(!nomes("52").includes("Moto G52"))
  assert.deepEqual(nomes(""), [])
})

test("quem digita pouco vê o modelo mais curto antes, e o que a loja já atendeu vem primeiro", () => {
  assert.deepEqual(nomes("iphone 1", [], 3), ["iPhone 11", "iPhone 12", "iPhone 13"])
  assert.deepEqual(nomes("iphone 1", ["iPhone 15 Pro Max"], 2), ["iPhone 15 Pro Max", "iPhone 11"])
  // Modelo que não está na lista, mas a loja já atendeu, aparece pela busca.
  assert.deepEqual(nomes("galaxy x", ["Galaxy XCover 7"], 1), ["Galaxy XCover 7"])
})

test("normalização: acento, caixa e símbolos não atrapalham", () => {
  assert.equal(normalizarModelo("  iPhone SE (3ª geração) "), "iphone se 3a geracao")
  assert.equal(normalizarModelo("Galaxy S25+"), "galaxy s25 plus")
})

test("o toque na peça: defeito, depois funciona, depois volta a não testado", () => {
  assert.equal(proximoEstado(undefined), "defeito")
  assert.equal(proximoEstado("defeito"), "ok")
  assert.equal(proximoEstado("ok"), "nao_testado")
  assert.equal(proximoEstado("nao_testado"), "defeito")
})

test("'o resto funciona' marca só o que não foi tocado, e defeito continua defeito", () => {
  const estado = marcarRestoComoOk({ camera: "defeito" }, "celular")
  assert.equal(estado.camera, "defeito")
  assert.equal(estado.tela, "ok")
  assert.equal(Object.values(estado).filter((valor) => valor === "ok").length, 8)
})

test("peça não tocada é 'não testado', nunca 'funciona' (regra 3)", () => {
  const resumo = resumoDaEntrada({ camera: "defeito", tela: "ok" }, "celular")
  assert.deepEqual(resumo.defeito, ["Câmera"])
  assert.deepEqual(resumo.ok, ["Tela"])
  assert.equal(resumo.naoTestado.length, 7)
  // Peça de outro tipo e estado desconhecido não entram.
  assert.deepEqual(lerEstado({ camera: "defeito", teclado: "ok", tela: "quebrada" }, "celular"), { camera: "defeito" })
})

test("IMEI: 15 dígitos com o dígito verificador certo", () => {
  assert.equal(conferirSerie("490154203237518"), "imei")
  assert.equal(conferirSerie("49 0154 2032 3751 8"), "imei")
  assert.equal(conferirSerie("490154203237519"), "imei_errado")
  assert.equal(conferirSerie("49015420323751"), "imei_errado")
  assert.equal(conferirSerie("C02XK1ABJGH5"), "serie")
  assert.equal(conferirSerie(""), "vazio")
  assert.equal(serieMascarada("490154203237518"), "final 7518")
})

test("senha: padrão de 4 a 9 pontos sem repetir; número até 32", () => {
  assert.equal(senhaValida("PADRAO", "1478"), true)
  assert.equal(senhaValida("PADRAO", "147"), false)
  assert.equal(senhaValida("PADRAO", "1471"), false)
  assert.equal(senhaValida("PADRAO", "1470"), false)
  assert.equal(senhaValida("NUMERO", "123456"), true)
  assert.equal(senhaValida("NUMERO", ""), false)
  assert.equal(senhaValida("NENHUMA", ""), true)
})

test("garantia: 90 dias contados da entrega, e sem data antes da entrega", () => {
  const agora = new Date("2026-10-10T12:00:00Z")
  assert.deepEqual(garantiaDoConserto({ RECEBIDO: "2026-10-01T12:00:00Z" }, agora), { comecou: false })
  const garantia = garantiaDoConserto({ ENTREGUE: "2026-10-07T12:00:00Z" }, agora)
  assert.equal(garantia.comecou, true)
  if (!garantia.comecou) return
  assert.equal(garantia.ate.toISOString(), "2027-01-05T12:00:00.000Z")
  assert.equal(garantia.diasRestantes, 87)
  assert.equal(garantiaDoConserto({ ENTREGUE: "2026-06-01T12:00:00Z" }, agora).comecou && garantiaDoConserto({ ENTREGUE: "2026-06-01T12:00:00Z" }, agora).vigente, false)
})

test("a subárea escolhe o tipo de partida", () => {
  assert.equal(tipoDaSubarea("Celular"), "celular")
  assert.equal(tipoDaSubarea("Informática"), "notebook")
  assert.equal(tipoDaSubarea("Videogame"), "videogame")
  assert.equal(tipoDaSubarea(null), "celular")
})

test("a senha fica cifrada, abre só com o link da própria OS, e 'sem senha' apaga", () => {
  const anterior = process.env.MFA_CHAVE_CRIPTOGRAFIA
  process.env.MFA_CHAVE_CRIPTOGRAFIA = "a".repeat(64)
  try {
    const dados = gravacaoDoAparelho({ tipo: "celular", senhaTipo: "NUMERO", senha: "2580" }, "token-da-os-1") as { senhaCifrada: string; senhaTipo: string }
    assert.equal(dados.senhaTipo, "NUMERO")
    assert.ok(!dados.senhaCifrada.includes("2580"))
    assert.equal(abrirSenhaDaOrdem(dados.senhaCifrada, "token-da-os-1"), "2580")
    assert.throws(() => abrirSenhaDaOrdem(dados.senhaCifrada, "token-de-outra-os"))
    assert.deepEqual(gravacaoDoAparelho({ tipo: "celular", senhaTipo: "NENHUMA" }, "x").senhaCifrada, null)
    assert.throws(() => gravacaoDoAparelho({ tipo: "celular", senhaTipo: "PADRAO", senha: "12" }, "x"), /4 a 9 pontos/)
    // Sem mudar a senha, a edição não mexe nela.
    assert.equal("senhaCifrada" in gravacaoDoAparelho({ tipo: "celular", modelo: "Moto G52" }, "x"), false)
  } finally {
    if (anterior === undefined) delete process.env.MFA_CHAVE_CRIPTOGRAFIA
    else process.env.MFA_CHAVE_CRIPTOGRAFIA = anterior
  }
})

test("sem a chave do servidor, a senha não é guardada em texto puro", () => {
  const anterior = process.env.MFA_CHAVE_CRIPTOGRAFIA
  delete process.env.MFA_CHAVE_CRIPTOGRAFIA
  try {
    assert.throws(() => gravacaoDoAparelho({ tipo: "celular", senhaTipo: "NUMERO", senha: "2580" }, "x"), /segurança/)
  } finally {
    if (anterior !== undefined) process.env.MFA_CHAVE_CRIPTOGRAFIA = anterior
  }
})

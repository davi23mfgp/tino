import test from "node:test"
import assert from "node:assert/strict"

import { contaDoEndereco, emailConfigurado, enderecoFaturas } from "../src/lib/faturas-email"

/**
 * Endereço e assinatura do recebimento de fatura por e-mail.
 *
 * O módulo lê as variáveis de ambiente no momento da chamada, então cada
 * teste as define antes de importar. Nada aqui fala com a Resend nem com a
 * rede: a assinatura é HMAC local.
 */

const AMBIENTE = {
  RESEND_API_KEY: "re_teste",
  RESEND_WEBHOOK_SECRET: "whsec_teste",
  FATURAS_EMAIL_DOMINIO: "faturas.tino.app",
  FATURAS_EMAIL_SEGREDO: "segredo-de-teste-nao-usado-em-producao",
}

function comAmbiente(extra: Record<string, string | undefined> = {}) {
  for (const [chave, valor] of Object.entries({ ...AMBIENTE, ...extra })) {
    if (valor === undefined) delete process.env[chave]
    else process.env[chave] = valor
  }
}



test("sem configuração completa, não há endereço nem leitura", () => {
  comAmbiente({ FATURAS_EMAIL_SEGREDO: undefined })
  assert.equal(emailConfigurado(), false)
  assert.equal(enderecoFaturas("conta1"), null)
  assert.equal(contaDoEndereco("conta1+aaaaaaaaaaaaaaaaaaaaaaaa@faturas.tino.app"), null)
  comAmbiente()
})

test("o endereço carrega a conta e uma assinatura de 24 hex", () => {
  comAmbiente()
  const endereco = enderecoFaturas("conta1")
  assert.ok(endereco)
  const [local, dominio] = endereco.split("@")
  const [conta, assinatura] = local.split("+")
  assert.equal(conta, "conta1")
  assert.equal(dominio, AMBIENTE.FATURAS_EMAIL_DOMINIO)
  assert.match(assinatura, /^[a-f0-9]{24}$/)
})

test("o endereço válido devolve a conta", () => {
  comAmbiente()
  assert.equal(contaDoEndereco(enderecoFaturas("conta1")!), "conta1")
})

test("cada conta tem assinatura própria", () => {
  comAmbiente()
  assert.notEqual(enderecoFaturas("conta1"), enderecoFaturas("conta2"))
})

test("assinatura de outra conta não abre a porta", () => {
  comAmbiente()
  const alheia = enderecoFaturas("conta2")!.split("+")[1]
  assert.equal(contaDoEndereco(`conta1+${alheia}`), null)
})

test("assinatura adulterada é recusada", () => {
  comAmbiente()
  const endereco = enderecoFaturas("conta1")!
  const [local, dominio] = endereco.split("@")
  const [conta, assinatura] = local.split("+")
  const trocado = (assinatura[0] === "0" ? "1" : "0") + assinatura.slice(1)
  assert.equal(contaDoEndereco(`${conta}+${trocado}@${dominio}`), null)
})

test("trocar o segredo invalida os endereços antigos", () => {
  comAmbiente()
  const antigo = enderecoFaturas("conta1")!
  comAmbiente({ FATURAS_EMAIL_SEGREDO: "outro-segredo" })
  assert.equal(contaDoEndereco(antigo), null)
  comAmbiente()
})

test("domínio diferente é recusado mesmo com assinatura certa", () => {
  comAmbiente()
  const [local] = enderecoFaturas("conta1")!.split("@")
  assert.equal(contaDoEndereco(`${local}@outrodominio.com`), null)
})

test("endereço sem assinatura é recusado", () => {
  comAmbiente()
  assert.equal(contaDoEndereco(`conta1@${AMBIENTE.FATURAS_EMAIL_DOMINIO}`), null)
  assert.equal(contaDoEndereco(`conta1+@${AMBIENTE.FATURAS_EMAIL_DOMINIO}`), null)
  assert.equal(contaDoEndereco(`conta1+abc@${AMBIENTE.FATURAS_EMAIL_DOMINIO}`), null)
})

/**
 * Regressão do achado P2-3 (REVISAO-SEGURANCA-CLAUDE.md): servidor de e-mail
 * no caminho pode normalizar a caixa da parte local. Antes da correção o
 * endereço era recusado em silêncio e a fatura nunca chegava.
 */
test("maiúscula no endereço continua valendo", () => {
  comAmbiente()
  const endereco = enderecoFaturas("conta1")!
  assert.equal(contaDoEndereco(endereco.toUpperCase()), "conta1")
})

test("espaço em volta não atrapalha", () => {
  comAmbiente()
  assert.equal(contaDoEndereco(`  ${enderecoFaturas("conta1")!}  `), "conta1")
})

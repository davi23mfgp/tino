import { test } from "node:test"
import assert from "node:assert/strict"

import { escolherConta, lerEstruturada } from "../src/lib/captura/estruturada"

const contas = [
  { id: "cc", nome: "Itaú conta", instituicao: "Itaú", tipo: "CONTA_CORRENTE" },
  { id: "itau", nome: "Itaú cartão 4416", instituicao: "Itaú", tipo: "CARTAO_CREDITO" },
  { id: "nu", nome: "Nubank", instituicao: "Nubank", tipo: "CARTAO_CREDITO" },
]

test("captura em campos: lê o valor como a Carteira escreve, em centavos", () => {
  assert.equal(lerEstruturada({ valor: "R$ 34,90", loja: "Padaria" })?.leitura.valorCentavos, 3490)
  assert.equal(lerEstruturada({ valor: "1.234,56" })?.leitura.valorCentavos, 123456)
  assert.equal(lerEstruturada({ valor: 12.5 })?.leitura.valorCentavos, 1250)
})

test("captura em campos: recusa valor vazio, zero e estorno", () => {
  assert.equal(lerEstruturada({ valor: "" }), null)
  assert.equal(lerEstruturada({ valor: "0" }), null)
  assert.equal(lerEstruturada({ valor: "-R$ 20,00" }), null)
  assert.equal(lerEstruturada({ loja: "Padaria" }), null)
})

test("captura em campos: separa o final do cartão do nome", () => {
  assert.equal(lerEstruturada({ valor: "10", cartao: "Itaú 4416" })?.leitura.cartaoFinal, "4416")
  const semFinal = lerEstruturada({ valor: "10", cartao: "Nubank Mastercard" })
  assert.equal(semFinal?.leitura.cartaoFinal, null)
  assert.equal(semFinal?.cartaoNome, "Nubank Mastercard")
})

test("escolher conta: o final do cartão decide com certeza", () => {
  assert.deepEqual(escolherConta(contas, { cartaoFinal: "4416" }), { conta: contas[1], certa: true })
})

test("escolher conta: o nome do cartão acha a conta, sem acento nem caixa", () => {
  assert.deepEqual(escolherConta(contas, { cartaoNome: "NUBANK Mastercard" }), { conta: contas[2], certa: true })
})

test("escolher conta: banco com conta e cartão propõe o cartão, sem certeza", () => {
  const escolha = escolherConta(contas, { cartaoNome: "Itau Visa" })
  assert.equal(escolha.conta?.id, "itau")
  assert.equal(escolha.certa, false)
})

test("escolher conta: sem pista, o palpite nunca é certeza", () => {
  assert.equal(escolherConta(contas, {}).certa, false)
  assert.equal(escolherConta(contas, { cartaoNome: "Banco Desconhecido" }).certa, false)
  assert.deepEqual(escolherConta([], {}), { conta: undefined, certa: false })
})

test("escolher conta: investimento no mesmo banco não tira a certeza do cartão", () => {
  const comTesouro = [...contas, { id: "tesouro", nome: "Tesouro Selic", instituicao: "Nubank", tipo: "INVESTIMENTO" }]
  assert.deepEqual(escolherConta(comTesouro, { cartaoNome: "Nubank Mastercard" }), { conta: contas[2], certa: true })
})

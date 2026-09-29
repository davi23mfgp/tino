import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { impressaoDoErro, semDadosPessoais } from "@/lib/erros"

describe("registro de erros sem dado pessoal", () => {
  it("tira e-mail, CPF, CNPJ, telefone, chaves e endereço do banco", () => {
    const limpo = semDadosPessoais(
      "Falha para maria.silva@gmail.com cpf 123.456.789-09 cnpj 12.345.678/0001-90 tel (79) 99812-3456 " +
        "Bearer abc.def.ghi sk_live_1234567890abcdef postgresql://u:senha@host/db",
    )
    for (const vazado of ["maria.silva", "123.456.789-09", "12.345.678/0001-90", "99812-3456", "abc.def.ghi", "sk_live_1234567890abcdef", "senha@host"]) {
      assert.ok(!limpo.includes(vazado), `ainda aparece: ${vazado} em ${limpo}`)
    }
    assert.match(limpo, /\[e-mail\].*\[cpf\].*\[cnpj\].*\[telefone\].*Bearer \[chave\].*\[chave\].*\[banco\]/)
  })

  it("não estraga mensagem comum", () => {
    assert.equal(semDadosPessoais("Cannot read properties of undefined (reading 'valor')"), "Cannot read properties of undefined (reading 'valor')")
  })
})

describe("o mesmo defeito vira uma linha só", () => {
  const pilha = "TypeError: x\n    at montarPanorama (/var/task/src/lib/tino/panorama.ts:120:15)\n    at node:internal/process"
  it("ids e números diferentes não separam o defeito", () => {
    assert.equal(
      impressaoDoErro("SERVIDOR", "Conta cmumlw7cq01rm5zela2bm2b9i não encontrada (linha 12)", pilha),
      impressaoDoErro("SERVIDOR", "Conta cmx9999999999999999999999 não encontrada (linha 40)", pilha),
    )
  })
  it("mensagem diferente, origem diferente ou outro ponto do código separam", () => {
    const base = impressaoDoErro("SERVIDOR", "Conta não encontrada", pilha)
    assert.notEqual(base, impressaoDoErro("SERVIDOR", "Saldo negativo", pilha))
    assert.notEqual(base, impressaoDoErro("NAVEGADOR", "Conta não encontrada", pilha))
    assert.notEqual(base, impressaoDoErro("SERVIDOR", "Conta não encontrada", pilha.replace("montarPanorama", "projetarFluxo")))
  })
  it("a mesma linha de código em outra coluna ou versão continua sendo o mesmo defeito", () => {
    assert.equal(impressaoDoErro("SERVIDOR", "x", pilha), impressaoDoErro("SERVIDOR", "x", pilha.replace(":120:15", ":121:9")))
  })
})

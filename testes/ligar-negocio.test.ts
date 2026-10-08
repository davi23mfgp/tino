import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { formatarCnpj, lerCnpj, lerDesde } from "@/lib/loja/ligar-negocio"

describe("CNPJ de quem liga o negócio", () => {
  it("aceita um CNPJ com os dígitos certos, com ou sem pontuação", () => {
    for (const texto of ["11.222.333/0001-81", "11222333000181"]) {
      const lido = lerCnpj(texto)
      assert.deepEqual(lido, { ok: true, valor: "11222333000181" })
    }
  })
  it("recusa tamanho errado e dígito verificador errado, com mensagem diferente", () => {
    const curto = lerCnpj("1122233300018")
    const errado = lerCnpj("11.222.333/0001-82")
    assert.equal(curto.ok, false)
    assert.equal(errado.ok, false)
    assert.notEqual(curto.ok === false && curto.erro, errado.ok === false && errado.erro)
  })
  it("formata enquanto digita", () => {
    assert.equal(formatarCnpj("11222333000181"), "11.222.333/0001-81")
    assert.equal(formatarCnpj("1122"), "11.22")
  })
})

describe("desde quando o MEI existe", () => {
  const agora = new Date("2026-10-08T12:00:00Z")
  it("03/2024 vira o dia 1 de março de 2024", () => {
    assert.deepEqual(lerDesde("03/2024", agora), { ok: true, valor: new Date("2024-03-01T00:00:00Z") })
  })
  it("recusa mês inválido, formato errado, ano antes do MEI e data no futuro", () => {
    for (const texto of ["13/2024", "2024", "3-2024", "05/2008", "11/2026"]) assert.equal(lerDesde(texto, agora).ok, false, texto)
  })
  it("o mês corrente vale", () => {
    assert.equal(lerDesde("10/2026", agora).ok, true)
  })
})

import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { liberarSeNaoHaCobranca } from "@/lib/acesso-sem-cobranca"

const vencido = { liberado: false, status: "TESTE", motivo: "TESTE_VENCIDO", testeAteEm: new Date(0) } as const
const cancelada = { liberado: false, status: "CANCELADA", motivo: "CANCELADA" } as const

describe("acesso depois dos 14 dias", () => {
  it("com pagamento ativo, teste vencido continua bloqueado", () => {
    const estado = liberarSeNaoHaCobranca(vencido, true)
    assert.equal(estado.liberado, false)
    assert.equal(estado.motivo, "TESTE_VENCIDO")
  })

  it("sem pagamento ativo, teste vencido fica liberado e sem motivo de bloqueio", () => {
    const estado = liberarSeNaoHaCobranca(vencido, false)
    assert.equal(estado.liberado, true)
    assert.equal(estado.motivo, undefined)
  })

  it("sem pagamento ativo, conta cancelada também fica liberada", () => {
    assert.equal(liberarSeNaoHaCobranca(cancelada, false).liberado, true)
  })

  it("quem já estava liberado não muda", () => {
    const ativa = { liberado: true, status: "ATIVA" } as const
    assert.deepEqual(liberarSeNaoHaCobranca(ativa, false), ativa)
  })
})

import assert from "node:assert/strict"
import { it } from "node:test"
import { podeConfirmar, podeDescartar, type StatusCaptura } from "../src/lib/captura/transicoes"

const TODOS: StatusCaptura[] = ["PENDENTE", "NAO_ENTENDIDA", "CONFIRMADA", "DESCARTADA"]

it("pendente e não entendida são decidíveis nos dois sentidos", () => {
  for (const status of ["PENDENTE", "NAO_ENTENDIDA"] as StatusCaptura[]) {
    assert.deepEqual(podeDescartar(status, false), { permite: true })
    assert.deepEqual(podeConfirmar(status, false), { permite: true })
  }
})

it("captura confirmada não é descartada por aqui — o achado 1 do relatório", () => {
  const veredito = podeDescartar("CONFIRMADA", true)
  assert.equal(veredito.permite, false)
  assert.equal(veredito.permite === false && veredito.status, 409)
  assert.match(veredito.permite === false ? veredito.motivo : "", /extrato/)
})

it("ter lançamento basta para barrar o descarte, mesmo com estado inconsistente", () => {
  assert.equal(podeDescartar("PENDENTE", true).permite, false)
})

it("captura descartada não vira lançamento", () => {
  const veredito = podeConfirmar("DESCARTADA", false)
  assert.equal(veredito.permite, false)
  assert.equal(veredito.permite === false && veredito.status, 409)
})

it("repetir a mesma decisão é aceito e não grava de novo", () => {
  assert.deepEqual(podeDescartar("DESCARTADA", false), { permite: true, jaFeito: true })
  assert.deepEqual(podeConfirmar("CONFIRMADA", true), { permite: true, jaFeito: true })
})

it("nenhum estado deixa confirmar e descartar ao mesmo tempo depois de decidido", () => {
  for (const status of TODOS) {
    const temTransacao = status === "CONFIRMADA"
    const d = podeDescartar(status, temTransacao)
    const c = podeConfirmar(status, temTransacao)
    const gravaDescarte = d.permite && !d.jaFeito
    const gravaConfirmacao = c.permite && !c.jaFeito
    assert.ok(!(gravaDescarte && gravaConfirmacao) || DECIDIVEIS_OK(status), `${status} aceitou os dois`)
  }
})

function DECIDIVEIS_OK(status: StatusCaptura) {
  return status === "PENDENTE" || status === "NAO_ENTENDIDA"
}

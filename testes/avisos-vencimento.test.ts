import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { avisosDeVencimento } from "../src/lib/tino/avisos-vencimento"

const hoje = new Date("2026-11-10T12:00:00Z")
const em = (dias: number) => new Date(hoje.getTime() + dias * 86_400_000)
const conta = (id: string, dias: number, tipo = "DESPESA") => ({ id, descricao: id, valorCentavos: 10000, tipo, proximaData: em(dias) })

describe("aviso de conta que vence", () => {
  it("avisa de todas as contas da janela, não só da primeira", () => {
    const avisos = avisosDeVencimento([conta("Aluguel", 0), conta("Luz", 0), conta("Internet", 2), conta("Escola", 9)], hoje)
    assert.deepEqual(avisos.map((aviso) => aviso.titulo), ["Aluguel vence hoje", "Luz vence hoje", "Internet vence em 2 dias"])
  })
  it("o toque abre a confirmação daquela conta", () => {
    assert.equal(avisosDeVencimento([conta("abc123", 1)], hoje)[0].acaoRota, "/recorrencias?pagar=abc123")
  })
  it("renda fixa e conta já vencida não entram", () => {
    assert.equal(avisosDeVencimento([conta("Salário", 1, "RECEITA"), conta("Atrasada", -2)], hoje).length, 0)
  })
  it("no máximo cinco avisos por rodada", () => {
    assert.equal(avisosDeVencimento(Array.from({ length: 9 }, (_, i) => conta("c" + i, 1)), hoje).length, 5)
  })
})

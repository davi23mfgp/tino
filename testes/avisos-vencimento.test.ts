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
  it("renda fixa não entra", () => {
    assert.equal(avisosDeVencimento([conta("Salário", 1, "RECEITA"), conta("Salário", -2, "RECEITA")], hoje).length, 0)
  })
  it("conta vencida e não paga avisa do atraso, a mais antiga primeiro, até 30 dias", () => {
    const avisos = avisosDeVencimento([conta("Luz", 1), conta("Internet", -1), conta("Aluguel", -12), conta("Esquecida", -45)], hoje)
    assert.deepEqual(avisos.map((aviso) => aviso.titulo), ["Aluguel venceu há 12 dias", "Internet venceu há 1 dia", "Luz vence em 1 dia"])
    assert.equal(avisos[0].severidade, "ATENCAO")
    assert.match(avisos[0].texto, /Se já pagou, marque como paga\.$/)
    // A chave não muda com o passar dos dias: é um aviso só, não um por dia.
    const amanha = avisosDeVencimento([conta("Aluguel", -12)], new Date(hoje.getTime() + 86_400_000))
    assert.equal(amanha[0].chave, avisos[0].chave)
    assert.equal(amanha[0].titulo, "Aluguel venceu há 13 dias")
  })
  it("no máximo cinco avisos por rodada", () => {
    assert.equal(avisosDeVencimento(Array.from({ length: 9 }, (_, i) => conta("c" + i, 1)), hoje).length, 5)
  })
})

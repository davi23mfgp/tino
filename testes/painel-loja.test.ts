import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { cnpjValido } from "@/lib/loja/cadastro-mei"
import { formasDoPainel, produtosDoPainel, resumoDoPainel } from "@/lib/loja/painel"

const vendas = [
  { totalCentavos: 1800, cancelada: false, criadoEm: new Date("2026-10-02T12:00:00Z"), itens: [{ descricao: "Café", quantidade: 2, totalCentavos: 2000 }], pagamentos: [{ forma: "PIX", valorCentavos: 1800, valorLiquidoCentavos: 1800 }] },
  { totalCentavos: 2800, cancelada: false, criadoEm: new Date("2026-10-02T13:00:00Z"), itens: [{ descricao: "Arroz", quantidade: 1, totalCentavos: 2800 }], pagamentos: [{ forma: "CREDITO_VISTA", valorCentavos: 2800, valorLiquidoCentavos: 2700 }] },
  { totalCentavos: 9900, cancelada: true, criadoEm: new Date("2026-10-02T14:00:00Z"), itens: [{ descricao: "Café", quantidade: 9, totalCentavos: 9900 }], pagamentos: [{ forma: "PIX", valorCentavos: 9900, valorLiquidoCentavos: 9900 }] },
]

describe("painel da loja", () => {
  it("conta apenas vendas concluídas e mantém dinheiro em centavos", () => {
    assert.deepEqual(resumoDoPainel(vendas), { brutoCentavos: 4600, vendas: 2, unidades: 3, ticketMedioCentavos: 2300, liquidoCentavos: 4500, taxasCentavos: 100 })
    assert.deepEqual(formasDoPainel(vendas), [{ forma: "CREDITO_VISTA", totalCentavos: 2800 }, { forma: "PIX", totalCentavos: 1800 }])
    assert.equal(produtosDoPainel(vendas)[0].unidades, 2)
  })
  it("média de período sem vendas fica ausente", () => {
    assert.equal(resumoDoPainel([]).ticketMedioCentavos, null)
  })
})

describe("confirmação do CNPJ", () => {
  it("confere os dois dígitos e rejeita sequências repetidas", () => {
    assert.equal(cnpjValido("11.222.333/0001-81"), true)
    assert.equal(cnpjValido("11.222.333/0001-82"), false)
    assert.equal(cnpjValido("11.111.111/1111-11"), false)
  })
})

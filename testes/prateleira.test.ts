import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { referenciaDaBarra, resumoDaPrateleira, situacaoNaPrateleira, type LinhaDaPrateleira } from "@/lib/loja/prateleira"

const linha = (parcial: Partial<LinhaDaPrateleira>): LinhaDaPrateleira => ({
  saldo: 10,
  precoCentavos: 500,
  custoMedioCentavos: 200,
  acabando: false,
  semSaldo: false,
  quantidadeVendida: 5,
  nuncaVendeu: false,
  diasSemVender: 2,
  ...parcial,
})
const dia = new Date("2026-09-28T12:00:00Z")

describe("situação na prateleira", () => {
  it("uma só, a mais urgente: reposição antes de custo, custo antes de parado", () => {
    assert.equal(situacaoNaPrateleira(linha({ saldo: 0, semSaldo: true, custoMedioCentavos: null })), "sem estoque")
    assert.equal(situacaoNaPrateleira(linha({ saldo: 1, acabando: true, custoMedioCentavos: null })), "acabando")
    assert.equal(situacaoNaPrateleira(linha({ custoMedioCentavos: null, nuncaVendeu: true })), "sem custo")
    assert.equal(situacaoNaPrateleira(linha({ nuncaVendeu: true, quantidadeVendida: 0, diasSemVender: null })), "nunca vendeu")
    assert.equal(situacaoNaPrateleira(linha({ diasSemVender: 30 })), "parado")
    assert.equal(situacaoNaPrateleira(linha({})), "em dia")
  })

  it("para o funcionário, custo escondido não vira 'sem custo'", () => {
    assert.equal(situacaoNaPrateleira(linha({ custoMedioCentavos: null }), false), "em dia")
  })
})

describe("resumo da prateleira", () => {
  it("valor na venda e custo parado em centavos, com o sem-custo de fora e contado", () => {
    // Os números da loja de teste de 28/09: brigadeiro, café e brownie sem custo.
    const resumo = resumoDaPrateleira([
      linha({ saldo: 1, precoCentavos: 350, custoMedioCentavos: 110 }),
      linha({ saldo: 42, precoCentavos: 600, custoMedioCentavos: 140 }),
      linha({ saldo: 7, precoCentavos: 800, custoMedioCentavos: null }),
    ])
    assert.equal(resumo.pecas, 50)
    assert.equal(resumo.valorNaVendaCentavos, 350 + 42 * 600 + 7 * 800)
    assert.equal(resumo.custoParadoCentavos, 110 + 42 * 140)
    assert.equal(resumo.semCustoComSaldo, 1)
  })

  it("saldo negativo (venda sem entrada lançada) não desconta do valor", () => {
    const resumo = resumoDaPrateleira([linha({ saldo: -3, precoCentavos: 1000, custoMedioCentavos: 400 })])
    assert.equal(resumo.pecas, 0)
    assert.equal(resumo.valorNaVendaCentavos, 0)
    assert.equal(resumo.custoParadoCentavos, 0)
  })
})

describe("referência da barra do estoque", () => {
  it("é a última entrada ou contagem", () => {
    assert.equal(referenciaDaBarra([{ tipo: "ENTRADA", quantidade: 40, criadoEm: dia }, { tipo: "SAIDA", quantidade: 39, criadoEm: dia }], 1), 40)
    assert.equal(referenciaDaBarra([{ tipo: "ENTRADA", quantidade: 40, criadoEm: dia }, { tipo: "AJUSTE", quantidade: 12, criadoEm: dia }], 12), 12)
  })

  it("nunca abaixo do saldo, para a barra não passar de 100%", () => {
    assert.equal(referenciaDaBarra([{ tipo: "ENTRADA", quantidade: 30, criadoEm: dia }, { tipo: "ENTRADA", quantidade: 5, criadoEm: dia }], 20), 20)
    assert.equal(referenciaDaBarra([], 0), 0)
  })
})

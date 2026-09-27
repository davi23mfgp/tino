import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { montarFluxoMensal, type DadosDoFluxo } from "@/lib/fluxo-mensal"

// O exemplo do Davi (27/09): R$ 5 mil na conta, ainda entra o salário de
// R$ 4 mil, saem R$ 6 mil entre cartão, fixa e variável — sobram R$ 3 mil.
function base(extra: Partial<DadosDoFluxo> = {}): DadosDoFluxo {
  return {
    hoje: "2026-10-02",
    meses: 3,
    fora: [],
    contas: [{ id: "cc", nome: "Conta corrente", saldoCentavos: 500_000 }],
    recorrencias: [
      { id: "salario", descricao: "Salário", tipo: "RECEITA", valorCentavos: 400_000, periodicidade: "MENSAL", proximaData: "2026-10-05" },
      { id: "aluguel", descricao: "Aluguel", tipo: "DESPESA", valorCentavos: 200_000, periodicidade: "MENSAL", proximaData: "2026-10-10" },
    ],
    entradasDetectadas: [],
    outrasEntradasMediaCentavos: 0,
    outrasEntradasNoMesCentavos: 0,
    gastoVariavelMedioCentavos: 100_000,
    gastoVariavelNoMesCentavos: 0,
    faturas: [
      { cartaoId: "c1", cartao: "Platinum", competencia: "2026-10", venceEm: "2026-10-06", fechada: true, comprasConhecidasCentavos: 250_000, parcelasCentavos: 50_000, mediaComprasCentavos: 280_000 },
    ],
    dividas: [],
    dividasPagasNoMesCentavos: 0,
    ...extra,
  }
}

describe("fluxo de caixa mês a mês", () => {
  it("faz a conta do Davi: tem 5 mil, entra 4 mil, saem 6 mil, sobram 3 mil", () => {
    const [outubro] = montarFluxoMensal(base())
    assert.equal(outubro.comecaCentavos, 500_000)
    assert.equal(outubro.entraCentavos, 400_000)
    // fatura fechada 2.500 + parcelas 500 + aluguel 2.000 + variável 1.000
    assert.equal(outubro.saiCentavos, 600_000)
    assert.equal(outubro.terminaCentavos, 300_000)
  })

  it("cada mês começa com o que o anterior terminou", () => {
    const [outubro, novembro] = montarFluxoMensal(base())
    assert.equal(novembro.comecaCentavos, outubro.terminaCentavos)
  })

  it("no mês corrente só conta o que ainda falta: salário já recebido não entra de novo", () => {
    // O salário de outubro já caiu: a próxima ocorrência é em novembro.
    const dados = base({ recorrencias: [{ id: "salario", descricao: "Salário", tipo: "RECEITA", valorCentavos: 400_000, periodicidade: "MENSAL", proximaData: "2026-11-05" }] })
    const [outubro, novembro] = montarFluxoMensal(dados)
    assert.equal(outubro.entraCentavos, 0)
    assert.equal(novembro.entraCentavos, 400_000)
  })

  it("o gasto variável do mês corrente é só o que a média ainda espera", () => {
    const [outubro] = montarFluxoMensal(base({ gastoVariavelNoMesCentavos: 70_000 }))
    const variavel = outubro.itens.find((item) => item.chave === "gasto-variavel")
    assert.equal(variavel?.centavos, 30_000)
  })

  it("fatura sai no mês em que vence; a que já venceu não sai de novo", () => {
    const dados = base({
      hoje: "2026-10-08",
      faturas: [{ cartaoId: "c1", cartao: "Platinum", competencia: "2026-10", venceEm: "2026-10-06", fechada: true, comprasConhecidasCentavos: 250_000, parcelasCentavos: 50_000, mediaComprasCentavos: 280_000 }],
    })
    const [outubro] = montarFluxoMensal(dados)
    assert.equal(outubro.itens.some((item) => item.chave === "cartao:c1"), false)
  })

  it("fatura aberta usa a média para completar, nunca para reduzir o que já foi comprado", () => {
    const aberta = (conhecidas: number) => base({ faturas: [{ cartaoId: "c1", cartao: "Platinum", competencia: "2026-11", venceEm: "2026-11-06", fechada: false, comprasConhecidasCentavos: conhecidas, parcelasCentavos: 50_000, mediaComprasCentavos: 280_000 }] })
    const [, pouca] = montarFluxoMensal(aberta(100_000))
    const [, muita] = montarFluxoMensal(aberta(400_000))
    assert.equal(pouca.itens.find((item) => item.chave === "cartao:c1")?.centavos, 330_000)
    assert.equal(pouca.itens.find((item) => item.chave === "cartao:c1")?.estimado, true)
    assert.equal(muita.itens.find((item) => item.chave === "cartao:c1")?.centavos, 450_000)
  })

  it("tirar uma conta do fluxo tira o saldo dela do começo", () => {
    const dados = base({ contas: [{ id: "cc", nome: "Conta corrente", saldoCentavos: 500_000 }, { id: "poup", nome: "Poupança", saldoCentavos: 670_000 }], fora: ["conta:poup"] })
    const [outubro] = montarFluxoMensal(dados)
    assert.equal(outubro.comecaCentavos, 500_000)
  })

  it("item tirado do fluxo continua na lista, marcado, mas não entra na soma", () => {
    const [outubro] = montarFluxoMensal(base({ fora: ["recorrencia:aluguel"] }))
    const aluguel = outubro.itens.find((item) => item.chave === "recorrencia:aluguel")
    assert.equal(aluguel?.fora, true)
    assert.equal(outubro.saiCentavos, 400_000)
  })

  it("conta atrasada sai no mês corrente junto com a do mês, e depois segue todo mês", () => {
    const dados = base({ recorrencias: [{ id: "luz", descricao: "Luz", tipo: "DESPESA", valorCentavos: 20_000, periodicidade: "MENSAL", proximaData: "2026-09-15" }] })
    const [outubro, novembro] = montarFluxoMensal(dados)
    const luzOutubro = outubro.itens.filter((item) => item.chave === "recorrencia:luz")
    assert.equal(luzOutubro.length, 2)
    assert.match(luzOutubro[0].detalhe, /atrasada/)
    assert.equal(novembro.itens.filter((item) => item.chave === "recorrencia:luz").length, 1)
  })

  it("parcela de dívida que venceu antes de hoje não sai de novo no mês corrente", () => {
    const [outubro, novembro] = montarFluxoMensal(base({ hoje: "2026-10-20", dividas: [{ centavos: 50_000, dia: 10 }, { centavos: 30_000, dia: 25 }] }))
    assert.equal(outubro.itens.find((item) => item.chave === "dividas")?.centavos, 30_000)
    assert.equal(novembro.itens.find((item) => item.chave === "dividas")?.centavos, 80_000)
  })

  it("entrada solta no mês corrente vale só a fração do mês que falta", () => {
    // Dia 31 de outubro: falta 1 dia de 31.
    const [outubro, novembro] = montarFluxoMensal(base({ hoje: "2026-10-31", outrasEntradasMediaCentavos: 62_000 }))
    assert.equal(outubro.itens.find((item) => item.chave === "outras-entradas")?.centavos, 2_000)
    assert.equal(novembro.itens.find((item) => item.chave === "outras-entradas")?.centavos, 62_000)
  })

  it("conta trimestral sai de três em três meses", () => {
    const dados = base({ meses: 7, recorrencias: [{ id: "iptu", descricao: "Seguro", tipo: "DESPESA", valorCentavos: 30_000, periodicidade: "TRIMESTRAL", proximaData: "2026-10-20" }] })
    const meses = montarFluxoMensal(dados).filter((mes) => mes.itens.some((item) => item.chave === "recorrencia:iptu")).map((mes) => mes.competencia)
    assert.deepEqual(meses, ["2026-10", "2027-01", "2027-04"])
  })
})

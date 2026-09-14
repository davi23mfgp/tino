import assert from "node:assert/strict"
import { it } from "node:test"
import { aporteQueReequilibra, posicaoDoArca, type ClasseDeAtivo } from "../src/lib/tino/investir"

const carteira = (itens: [ClasseDeAtivo, number][]) => itens.map(([classe, valorCentavos]) => ({ classe, valorCentavos }))

const soma = (partes: { valorCentavos: number }[]) => partes.reduce((s, p) => s + p.valorCentavos, 0)

it("renda fixa e caixa somam na mesma letra do método", () => {
  const { letras, totalCentavos } = posicaoDoArca(carteira([["RENDA_FIXA", 30_000], ["CAIXA", 20_000]]))
  const c = letras.find((letra) => letra.rotulo === "Caixa e renda fixa")!
  assert.equal(c.atualCentavos, 50_000)
  assert.equal(totalCentavos, 50_000)
  assert.equal(c.atualBps, 10_000)
})

it("cripto e outros ficam fora da conta do método, mas continuam somados à parte", () => {
  const { totalCentavos, foraDoMetodoCentavos, letras } = posicaoDoArca(
    carteira([["ACOES", 25_000], ["CRIPTO", 75_000], ["OUTROS", 5_000]]),
  )
  assert.equal(totalCentavos, 25_000)
  assert.equal(foraDoMetodoCentavos, 80_000)
  assert.equal(letras.find((letra) => letra.letra === "A" && letra.rotulo === "Ações")!.atualBps, 10_000)
})

it("carteira vazia divide o aporte em quatro partes iguais", () => {
  const partes = aporteQueReequilibra(100_000, [])
  assert.equal(partes.length, 4)
  assert.deepEqual(partes.map((p) => p.valorCentavos), [25_000, 25_000, 25_000, 25_000])
})

it("o aporte vai primeiro para quem está mais atrás do alvo", () => {
  // Só ações na carteira: o aporte deve ir todo para as outras três letras.
  const partes = aporteQueReequilibra(30_000, carteira([["ACOES", 100_000]]))
  const acoes = partes.find((p) => p.rotulo === "Ações")!
  assert.equal(acoes.valorCentavos, 0)
  assert.equal(soma(partes), 30_000)
})

it("quando o aporte cobre toda a defasagem, todas chegam ao alvo", () => {
  const atual = carteira([["ACOES", 100_000], ["FII", 0], ["RENDA_FIXA", 0], ["INTERNACIONAL", 0]])
  const aporte = 300_000
  const partes = aporteQueReequilibra(aporte, atual)
  assert.equal(soma(partes), aporte)

  const depois = posicaoDoArca([
    ...atual,
    ...partes.map((parte) => ({
      classe: (parte.rotulo === "Ações" ? "ACOES" : parte.rotulo === "Real estate" ? "FII" : parte.rotulo === "Caixa e renda fixa" ? "RENDA_FIXA" : "INTERNACIONAL") as ClasseDeAtivo,
      valorCentavos: parte.valorCentavos,
    })),
  ])
  for (const letra of depois.letras) {
    assert.ok(Math.abs(letra.atualBps - 2500) <= 1, `${letra.rotulo} ficou em ${letra.atualBps}bps`)
  }
})

it("carteira já no alvo divide igual, sem inventar desequilíbrio", () => {
  const partes = aporteQueReequilibra(
    40_000,
    carteira([["ACOES", 25_000], ["FII", 25_000], ["RENDA_FIXA", 25_000], ["INTERNACIONAL", 25_000]]),
  )
  assert.deepEqual(partes.map((p) => p.valorCentavos), [10_000, 10_000, 10_000, 10_000])
})

it("o aporte nunca some nem sobra um centavo", () => {
  for (const valor of [1, 7, 333, 99_999, 1_000_001]) {
    const partes = aporteQueReequilibra(valor, carteira([["ACOES", 12_345], ["CAIXA", 777]]))
    assert.equal(soma(partes), valor, `aporte de ${valor}`)
  }
})

it("aporte zero ou negativo não distribui nada", () => {
  assert.equal(soma(aporteQueReequilibra(0, carteira([["ACOES", 1000]]))), 0)
  assert.equal(soma(aporteQueReequilibra(-500, carteira([["ACOES", 1000]]))), 0)
})

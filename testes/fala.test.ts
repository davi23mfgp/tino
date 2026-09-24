import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { lerGastoFalado, numeroFalado, sinaisDaFrase } from "@/lib/captura/fala"
import { lerTextoLivre } from "@/lib/captura/notificacao"

describe("número dito por extenso", () => {
  it("soma unidade, dezena e centena", () => {
    assert.equal(numeroFalado("sete"), 7)
    assert.equal(numeroFalado("cinquenta e dois"), 52)
    assert.equal(numeroFalado("cento e vinte"), 120)
    assert.equal(numeroFalado("duzentos e cinquenta"), 250)
  })

  it("aceita algarismo, que é o que a transcrição costuma devolver", () => {
    assert.equal(numeroFalado("52"), 52)
  })

  it("não é número devolve null, e não zero — zero é um valor dito", () => {
    assert.equal(numeroFalado("mercado"), null)
    assert.equal(numeroFalado("zero"), 0)
  })
})

describe("gasto falado", () => {
  const casos: [string, number, string | null][] = [
    ["Paguei 52 reais e 30 centavos no mercado.", 5230, "mercado"],
    ["gastei 30 reais no uber", 3000, "uber"],
    ["paguei sete e cinquenta no pão", 750, "pão"],
    ["Comprei pão, sete e cinquenta.", 750, "pão"],
    ["comprei um remédio de 38 reais na farmácia", 3800, "farmácia"],
    ["paguei quarenta no posto", 4000, "posto"],
    ["gastei duzentos e cinquenta reais no mercado hoje", 25000, "mercado"],
    ["custou dezoito e noventa", 1890, null],
  ]

  for (const [frase, centavos, lugar] of casos) {
    it(`lê ${JSON.stringify(frase)}`, () => {
      const lido = lerGastoFalado(frase)
      assert.equal(lido?.valorCentavos, centavos)
      assert.equal(lido?.estabelecimento, lugar)
    })
  }

  it("cento e vinte reais é 120, não 100 com 20 centavos", () => {
    // O padrão "N e N reais" leria isso errado, e por isso não existe.
    assert.equal(lerGastoFalado("paguei cento e vinte reais na conta de luz")?.valorCentavos, 12000)
  })

  it("centavo acima de 99 é transcrição errada, não lançamento", () => {
    assert.equal(lerGastoFalado("paguei dez reais e cento e vinte centavos"), null)
  })

  it("pergunta não vira gasto", () => {
    assert.equal(lerGastoFalado("quanto eu tenho hoje"), null)
    assert.equal(lerGastoFalado("quanto eu gastei esse mês"), null)
    assert.equal(lerGastoFalado("oi tudo bem"), null)
  })

  it("número solto sem verbo de gasto não vira dinheiro", () => {
    assert.equal(lerGastoFalado("são duas e trinta da tarde"), null)
  })
})

describe("o leitor de texto livre atende os dois jeitos", () => {
  it("digitado continua valendo, e com a confiança de antes", () => {
    const lido = lerTextoLivre("mercado 52,30")
    assert.equal(lido.valorCentavos, 5230)
    assert.equal(lido.confianca, 95)
  })

  it("falado entra com confiança menor — entre a fala e o texto há uma transcrição", () => {
    const lido = lerTextoLivre("gastei 30 reais no uber")
    assert.equal(lido.valorCentavos, 3000)
    assert.equal(lido.estabelecimento, "uber")
    assert.ok(lido.confianca < 95, "falado não pode ter a mesma confiança do digitado")
  })
})

describe("sinais da frase", () => {
  const hoje = new Date(2026, 8, 24, 10)

  it("sem sinal é saída de hoje", () => {
    const sinais = sinaisDaFrase("mercado 52,30", hoje)
    assert.equal(sinais.tipo, "DESPESA")
    assert.equal(sinais.data.getDate(), 24)
  })

  it("ontem e anteontem voltam a data", () => {
    assert.equal(sinaisDaFrase("gastei trinta no posto ontem", hoje).data.getDate(), 23)
    assert.equal(sinaisDaFrase("anteontem no mercado 40", hoje).data.getDate(), 22)
  })

  it("recebi, salário e reembolso viram entrada, com ou sem acento", () => {
    assert.equal(sinaisDaFrase("recebi 200 do João", hoje).tipo, "RECEITA")
    assert.equal(sinaisDaFrase("Salário 4.500", hoje).tipo, "RECEITA")
    assert.equal(sinaisDaFrase("caiu o reembolso de 80", hoje).tipo, "RECEITA")
  })

  it("não confunde palavra que só contém o sinal", () => {
    assert.equal(sinaisDaFrase("recebimento pendente 50", hoje).tipo, "DESPESA")
  })
})

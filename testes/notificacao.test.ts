import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { lerNotificacao, lerTextoLivre } from "@/lib/captura/notificacao"

/**
 * O leitor de notificação erra em silêncio quando erra: o valor entra certo e o
 * resto sai errado. Estes testes fixam os casos que já quebraram na prática.
 */

const HOJE = new Date(Date.UTC(2026, 7, 24)) // 24/08/2026

describe("lerNotificacao — compras", () => {
  it("lê valor e estabelecimento de uma compra comum", () => {
    const lida = lerNotificacao("Nubank — Compra aprovada: R$ 52,30 em ASSAI ATACADISTA", HOJE)
    assert.equal(lida.valorCentavos, 5230)
    assert.equal(lida.estabelecimento, "ASSAI ATACADISTA")
    assert.equal(lida.instituicao, "Nubank")
    assert.equal(lida.ignorar, false)
  })

  it("não confunde o cartão com o estabelecimento", () => {
    // Regressão: "no cartão final 4213: R$ 52,30 em ASSAI" virava o
    // estabelecimento "Cartao Final 4213: r$ 52" — valor certo, nome errado.
    const lida = lerNotificacao("Compra aprovada no cartao final 4213: R$ 52,30 em ASSAI ATACADISTA", HOJE)
    assert.equal(lida.valorCentavos, 5230)
    assert.equal(lida.estabelecimento, "ASSAI ATACADISTA")
    assert.equal(lida.cartaoFinal, "4213")
  })

  it("lê o final do cartão quando o texto cita", () => {
    const lida = lerNotificacao("Compra aprovada de R$ 129,90 em NETFLIX.COM no cartao final 3189", HOJE)
    assert.equal(lida.cartaoFinal, "3189")
    // O domínio é cortado no ponto de propósito: "Netflix" é um nome melhor
    // para o extrato do que "NETFLIX.COM".
    assert.equal(lida.estabelecimento, "NETFLIX")
  })

  it("separa a parcela do nome do estabelecimento", () => {
    const lida = lerNotificacao("Compra aprovada: R$ 300,00 em MAGAZINE LUIZA parcelada em 3/10", HOJE)
    assert.equal(lida.estabelecimento, "MAGAZINE LUIZA")
    assert.equal(lida.parcelaNumero, 3)
    assert.equal(lida.parcelaTotal, 10)
  })

  it("não lê a parcela como data", () => {
    // Regressão grave: "parcelada em 3/10" virava 3 de outubro, e o gasto
    // sumia do mês em que aconteceu.
    const lida = lerNotificacao("Compra aprovada: R$ 300,00 em MAGAZINE LUIZA parcelada em 3/10", HOJE)
    assert.equal(lida.data?.getUTCMonth(), 7, "deveria ficar em agosto, não outubro")
    assert.equal(lida.data?.getUTCDate(), 24)
  })

  it("não lê a parcela como data nem quando ela cai no passado", () => {
    // Este é o caso que só a remoção do trecho da parcela resolve. Em dezembro,
    // "3/10" seria 3 de outubro — data passada, que o filtro de data futura
    // aceitaria de bom grado, jogando a compra dois meses para trás.
    const emDezembro = new Date(Date.UTC(2026, 11, 15))
    const lida = lerNotificacao("Compra aprovada: R$ 300,00 em MAGAZINE LUIZA parcelada em 3/10", emDezembro)
    assert.equal(lida.data?.getUTCMonth(), 11, "deveria ficar em dezembro, não outubro")
    assert.equal(lida.data?.getUTCDate(), 15)
    assert.equal(lida.parcelaNumero, 3)
  })

  it("respeita a data escrita quando ela é passada", () => {
    const lida = lerNotificacao("Compra de R$ 89,00 em RESTAURANTE SABOR no dia 12/08", HOJE)
    assert.equal(lida.data?.getUTCDate(), 12)
    assert.equal(lida.data?.getUTCMonth(), 7)
  })

  it("descarta data futura em favor de hoje", () => {
    // Notificação chega no instante da compra; data à frente é leitura errada.
    const lida = lerNotificacao("Compra de R$ 40,00 em LOJA no dia 30/12", HOJE)
    assert.equal(lida.data?.getTime(), HOJE.getTime())
  })

  it("nomeia o banco por vários apelidos", () => {
    assert.equal(lerNotificacao("Itau: compra de R$ 10,00 em X", HOJE).instituicao, "Itaú")
    assert.equal(lerNotificacao("C6 Bank: compra de R$ 10,00 em X", HOJE).instituicao, "C6 Bank")
    assert.equal(lerNotificacao("PicPay: compra de R$ 10,00 em X", HOJE).instituicao, "PicPay")
  })

  it("dá mais confiança quando reconhece mais pistas", () => {
    const completa = lerNotificacao("Nubank — Compra aprovada no cartao final 4213: R$ 52,30 em ASSAI", HOJE)
    const crua = lerNotificacao("R$ 52,30", HOJE)
    assert.ok(completa.confianca > crua.confianca)
    assert.ok(completa.confianca >= 70, "com banco, cartão e loja deveria passar do limiar de conferência")
  })
})

describe("lerNotificacao — o que não é gasto", () => {
  const casos: [string, string][] = [
    ["compra negada", "Compra NEGADA no cartao final 4213: R$ 890,00 em LOJA XPTO"],
    // As duas formas de recusa que os bancos escrevem, com e sem acento. Cada
    // uma difere da compra aprovada por uma palavra só, então cada uma precisa
    // do próprio caso: foi "nao aprovada" que passou batido e virou gasto.
    ["compra negada", "Compra nao aprovada de R$ 89,90 no POSTO IPIRANGA"],
    ["compra negada", "Compra não aprovada de R$ 89,90 no POSTO IPIRANGA"],
    ["compra negada", "Compra não autorizada de R$ 89,90 no POSTO IPIRANGA"],
    ["estorno ou cancelamento", "Estorno de R$ 52,30 referente a compra em ASSAI"],
    ["aviso de fatura, não é compra", "Sua fatura de setembro fechou: R$ 1.040,51"],
    ["entrada de dinheiro", "Você recebeu um Pix de R$ 200,00"],
    ["aviso informativo", "Seu limite disponível é de R$ 4.500,00"],
    ["aviso de segurança", "Detectamos uma tentativa suspeita de R$ 900,00"],
  ]

  for (const [motivo, texto] of casos) {
    it(`ignora: ${motivo}`, () => {
      const lida = lerNotificacao(texto, HOJE)
      assert.equal(lida.ignorar, true, `deveria ignorar "${texto}"`)
      assert.equal(lida.motivoIgnorar, motivo)
    })
  }

  it("o descarte vem antes da extração — nada de valor em aviso ignorado", () => {
    const lida = lerNotificacao("Compra NEGADA: R$ 890,00 em LOJA", HOJE)
    assert.equal(lida.valorCentavos, null)
  })
})

describe("lerTextoLivre", () => {
  it("entende o jeito que a pessoa escreve", () => {
    const mercado = lerTextoLivre("mercado 52,30", HOJE)
    assert.equal(mercado.valorCentavos, 5230)
    assert.equal(mercado.estabelecimento, "mercado")

    const uber = lerTextoLivre("uber 18", HOJE)
    assert.equal(uber.valorCentavos, 1800)
    assert.equal(uber.estabelecimento, "uber")
  })

  it("aceita o valor antes do nome", () => {
    const lida = lerTextoLivre("38,90 farmacia", HOJE)
    assert.equal(lida.valorCentavos, 3890)
    assert.equal(lida.estabelecimento, "farmacia")
  })

  it("tira o verbo do começo", () => {
    const lida = lerTextoLivre("gastei no posto 120", HOJE)
    assert.equal(lida.valorCentavos, 12000)
    assert.match(lida.estabelecimento ?? "", /posto/)
  })

  it("confia mais quando há nome junto do valor", () => {
    assert.ok(lerTextoLivre("padaria 12", HOJE).confianca > lerTextoLivre("12", HOJE).confianca)
  })

  it("usa a data de hoje", () => {
    assert.equal(lerTextoLivre("mercado 10", HOJE).data?.getTime(), HOJE.getTime())
  })
})

import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  aberturaConta,
  diasParaVencer,
  dividirPagamento,
  emAberto,
  paraRetomarHoje,
  resumoDoCliente,
  situacaoDoOrcamento,
  taxaDeFechamento,
  type ClienteComOrcamentos,
  type OrcamentoResumo,
} from "@/lib/loja/orcamento"
import { rotaPermitida } from "@/lib/acesso"

const SP = "America/Sao_Paulo"
// 05/10/2026, 14h em São Paulo.
const AGORA = new Date("2026-10-05T17:00:00Z")
const dia = (iso: string) => new Date(`${iso}T00:00:00Z`)

function orcamento(parte: Partial<OrcamentoResumo> = {}): OrcamentoResumo {
  return {
    id: "o1", numero: 14, status: "ENVIADO", totalCentavos: 31_000, validoAte: dia("2026-10-11"), enviadoEm: new Date("2026-10-04T21:00:00Z"),
    aberturas: 0, ultimaAberturaEm: null, aprovadoPeloCliente: false, motivoPerda: null, vendaNumero: null, criadoEm: new Date("2026-10-04T20:40:00Z"),
    ...parte,
  }
}

function cliente(parte: Partial<ClienteComOrcamentos> = {}): ClienteComOrcamentos {
  return { id: "c1", nome: "Marcos Lima", telefone: "11987654321", proximoPasso: null, proximoPassoEm: null, orcamentos: [], ...parte }
}

describe("situação do orçamento", () => {
  it("enviado sem abrir, aberto, e vencido pelo dia no fuso do lar", () => {
    assert.equal(situacaoDoOrcamento(orcamento(), AGORA, SP), "enviado")
    assert.equal(situacaoDoOrcamento(orcamento({ aberturas: 3 }), AGORA, SP), "visto")
    assert.equal(situacaoDoOrcamento(orcamento({ validoAte: dia("2026-10-04") }), AGORA, SP), "vencido")
  })

  it("no último dia, às 23h de São Paulo, ainda vale (em UTC já é o dia seguinte)", () => {
    const noite = new Date("2026-10-12T02:00:00Z") // 11/10, 23h em SP
    assert.equal(situacaoDoOrcamento(orcamento({ validoAte: dia("2026-10-11") }), noite, SP), "enviado")
  })

  it("dias para vencer: 0 é hoje, 1 é amanhã", () => {
    assert.equal(diasParaVencer(orcamento({ validoAte: dia("2026-10-05") }), AGORA, SP), 0)
    assert.equal(diasParaVencer(orcamento({ validoAte: dia("2026-10-06") }), AGORA, SP), 1)
  })
})

describe("entrada e parcelas", () => {
  it("R$ 310 com R$ 110 de entrada em 2 vezes", () => {
    assert.deepEqual(dividirPagamento(31_000, 11_000, 2), { entradaCentavos: 11_000, parcelas: [10_000, 10_000] })
  })
  it("a sobra do centavo vai para a primeira parcela, e a soma fecha", () => {
    const plano = dividirPagamento(1_000, null, 3)
    assert.deepEqual(plano.parcelas, [334, 333, 333])
    assert.equal(plano.parcelas.reduce((a, b) => a + b, 0), 1_000)
  })
})

describe("para retomar hoje", () => {
  it("o passo de hoje vai junto do orçamento do cliente, com a hora", () => {
    const lista = paraRetomarHoje([cliente({ proximoPasso: "Ligar", proximoPassoEm: new Date("2026-10-05T18:00:00Z"), orcamentos: [orcamento({ aberturas: 3 })] })], AGORA, SP)
    assert.equal(lista.length, 1)
    assert.equal(lista[0]!.quando, "hoje, 15h")
    assert.equal(lista[0]!.linha, "Ligar · orçamento 0014")
    assert.equal(lista[0]!.valorCentavos, 31_000)
  })

  it("enviado dentro do prazo e sem passo não entra: espera o cliente, não o dono", () => {
    assert.equal(paraRetomarHoje([cliente({ orcamentos: [orcamento()] })], AGORA, SP).length, 0)
  })

  it("atrasado primeiro, rascunho por último", () => {
    const lista = paraRetomarHoje([
      cliente({ id: "a", nome: "Padaria", orcamentos: [orcamento({ id: "r", status: "RASCUNHO", enviadoEm: null })] }),
      cliente({ id: "b", nome: "Juliana", orcamentos: [orcamento({ id: "v", validoAte: dia("2026-10-06") })] }),
      cliente({ id: "c", nome: "Zé", proximoPasso: "Cobrar resposta", proximoPassoEm: new Date("2026-10-02T12:00:00Z") }),
    ], AGORA, SP)
    assert.deepEqual(lista.map((item) => item.quando), ["atrasado, 02/10", "vence amanhã", "terminar"])
  })
})

describe("em aberto e taxa de fechamento", () => {
  it("vencido não conta como dinheiro em aberto", () => {
    const resumo = emAberto([orcamento({ totalCentavos: 18_000 }), orcamento({ totalCentavos: 14_000, validoAte: dia("2026-10-01") }), orcamento({ status: "RASCUNHO", totalCentavos: 22_000 })], AGORA, SP)
    assert.equal(resumo.totalCentavos, 40_000)
    assert.equal(resumo.quantidade, 2)
  })

  it("0 de 0 não é 0%: sem envio, a taxa é nula", () => {
    assert.equal(taxaDeFechamento([orcamento({ status: "RASCUNHO", enviadoEm: null })], AGORA).atual.bps, null)
  })

  it("conta pelos enviados nos 90 dias, com os 90 anteriores de referência", () => {
    const taxa = taxaDeFechamento([
      orcamento({ status: "CONVERTIDO", enviadoEm: new Date("2026-09-20T12:00:00Z") }),
      orcamento({ status: "PERDIDO", enviadoEm: new Date("2026-09-21T12:00:00Z") }),
      orcamento({ status: "APROVADO", enviadoEm: new Date("2026-06-01T12:00:00Z") }),
    ], AGORA)
    assert.deepEqual(taxa.atual, { fechados: 1, enviados: 2, bps: 5_000 })
    assert.deepEqual(taxa.anterior, { fechados: 1, enviados: 1, bps: 10_000 })
  })
})

describe("abertura do link", () => {
  const navegador = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
  it("a prévia que o WhatsApp monta ao enviar não conta como o cliente abrindo", () => {
    assert.equal(aberturaConta({ userAgent: "WhatsApp/2.24.1 A", ehDaLoja: false, ultimaAberturaEm: null, agora: AGORA }), false)
  })
  it("o dono conferindo o próprio link não conta", () => {
    assert.equal(aberturaConta({ userAgent: navegador, ehDaLoja: true, ultimaAberturaEm: null, agora: AGORA }), false)
  })
  it("recarregar em menos de 30 minutos não soma outra abertura", () => {
    assert.equal(aberturaConta({ userAgent: navegador, ehDaLoja: false, ultimaAberturaEm: new Date(AGORA.getTime() - 10 * 60_000), agora: AGORA }), false)
    assert.equal(aberturaConta({ userAgent: navegador, ehDaLoja: false, ultimaAberturaEm: new Date(AGORA.getTime() - 40 * 60_000), agora: AGORA }), true)
  })
})

describe("linha do cliente e acesso", () => {
  it("fiado na rua vem antes do valor do orçamento", () => {
    const linha = resumoDoCliente({ criadoEm: dia("2026-03-01"), orcamentos: [orcamento({ status: "PERDIDO", motivoPerda: "PRECO" })] }, 5_600, AGORA, SP)
    assert.deepEqual(linha, { detalhe: "recusou o 0014 · preço", valorCentavos: 5_600, rotuloValor: "no fiado" })
  })
  it("funcionário do balcão não abre clientes nem orçamentos, mas abre o link público", () => {
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/loja/clientes"), false)
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/api/loja/orcamentos/x/acao"), false)
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/o/abc"), true)
  })
})

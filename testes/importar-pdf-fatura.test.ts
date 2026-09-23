import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { categoriaPeloRamo } from "@/lib/categorizar"
import { lerData } from "@/lib/datas"
import { interpretarTextoPdf } from "@/lib/importar/pdf"

// Textos no formato que o `unpdf` extrai de cada banco. Nomes e valores são
// inventados; a disposição das linhas é a real.

const ITAU = `
Resumo da fatura em R$
Total da fatura anterior 1.000,00
Pagamento efetuado em 06/08/2026 -1.000,00
Lançamentos atuais 261,16
Com vencimento em:
08/09/2026
Limite total de crédito:
R$ 63.352,00
Pagamentos efetuados
06/08 PAGAMENTO DEB AUTOMATIC -1.000,00
Lançamentos: compras e saques
04/11 LOJA ONLINE*X 10/12 100,00
29/07 MERCADINHO BOMSAO JOSE DO R 50,00
outros SAO JOSE DO R
17/08 CANTINA DA PRACASAO JOSE D 30,00
restaurante SAO JOSE DO R
Lançamentos internacionais
16/08 SERVICO WEB.COMUS 20,00
8,06 USD 8,06
Dólar de Conversão R$ 5,54
Repasse de IOF em R$ 0,70
Lançamentos: produtos e serviços
10/01 PIX FULANO 08/12 29,46
Principal (R$ 23,36) + Juros (R$ 6,10)
30/07 Mensalidade - Plano do 62,00
Anuidade Diferenciada
03/08 Redução Mensalidade - P -31,00
Compras parceladas - próximas faturas
04/11 LOJA ONLINE*X 11/12 100,00
10/01 PIX FULANO 09/12 29,46
Próxima fatura 129,46
Demais faturas 16.586,87
Limites de crédito Valor em R$
Limite total de crédito 63.352,00
Limite disponível 37.241,01
`

const NUBANK = `
Data de vencimento: 08 SET 2026
Total de compras de todos os cartões, 30 JUL a 30 AGO R$ 10,00
Outros lançamentos R$ 49,00
PRÓXIMAS FATURAS
Fechamento da próxima fatura 29 SET 2026
TRANSAÇÕES DE 30 JUL A 30 AGO
03 AGO Padaria Central R$ 10,00
05 AGO EBW*Canva - NuPay R$ 49,00
05 AGO Pagamento em 05 AGO −R$ 259,29
06 AGO Saldo restante da fatura anterior R$ 0,00
`

const INTER = `
Data de Vencimento
05/09/2026
Despesas do mês R$ 955,72
28 de jul. 2026 PG *99 RIDE - R$ 25,30
05 de ago. 2026 PAGAMENTO ON LINE - + R$ 4.707,35
16 de jul. 2026 PIX CRED PARCELADO (Parcela 02 de 04)
Principal (R$ 803,96) + Juros (R$ 126,46)
FULANO DE TAL R$ 930,42
`

const MERCADO_PAGO = `
Vence em
23/09/2026
Consumos de 19/08 a 18/09 R$ 134,10
24/08 Pagamento da fatura de agosto/2026 R$ 163,40
15/09 99* R$ 21,40
14/11 MERCADOLIVRE*MERCADOLIVRE Parcela 11 de 24 R$ 112,70
`

const hoje = new Date("2026-09-23T12:00:00Z")
const fatura = (texto: string) => interpretarTextoPdf(texto, { faturaCartao: true, hoje })
const dia = (data: Date) => data.toISOString().slice(0, 10)

describe("fatura de cartão em PDF", () => {
  it("compra entra como despesa; pagamento e estorno, como crédito", () => {
    const { lancamentos } = fatura(ITAU)
    const tipo = (trecho: string) => lancamentos.find((l) => l.descricao.includes(trecho))?.tipo
    assert.equal(tipo("MERCADINHO"), "DESPESA")
    assert.equal(tipo("PAGAMENTO DEB"), "RECEITA")
    assert.equal(tipo("Redução"), "RECEITA")
  })

  it("resumo e limite não viram lançamento, nem em 2029", () => {
    const { lancamentos } = fatura(ITAU)
    assert.ok(!lancamentos.some((l) => /limite|demais faturas|efetuado em/i.test(l.descricao)))
    assert.ok(lancamentos.every((l) => l.data <= hoje), "nenhuma data no futuro")
    // O pagamento aparece no resumo e na lista: só a lista conta.
    assert.equal(lancamentos.filter((l) => l.valorCentavos === 100_000).length, 1)
  })

  it("não importa as parcelas das próximas faturas", () => {
    const { lancamentos } = fatura(ITAU)
    assert.ok(!lancamentos.some((l) => l.parcelaAtual === 11 || l.parcelaAtual === 9))
  })

  it("parcela sabe qual é, e entra no mês em que foi cobrada", () => {
    const loja = fatura(ITAU).lancamentos.find((l) => l.descricao.startsWith("LOJA ONLINE"))!
    assert.equal(loja.parcelaAtual, 10)
    assert.equal(loja.parcelasTotal, 12)
    // Comprada em 04/11/2025: a 10ª parcela é de agosto de 2026, não de novembro.
    assert.equal(dia(loja.dataCompra!), "2025-11-04")
    assert.equal(dia(loja.data), "2026-08-04")
  })

  it("parcela escrita por extenso (Mercado Pago, Inter)", () => {
    const mp = fatura(MERCADO_PAGO).lancamentos.find((l) => l.descricao.startsWith("MERCADOLIVRE"))!
    assert.deepEqual([mp.parcelaAtual, mp.parcelasTotal], [11, 24])
    assert.equal(mp.descricao, "MERCADOLIVRE*MERCADOLIVRE 11/24")

    const pix = fatura(INTER).lancamentos.find((l) => l.descricao.startsWith("PIX CRED"))!
    assert.equal(pix.valorCentavos, 93_042)
    assert.deepEqual([pix.parcelaAtual, pix.parcelasTotal], [2, 4])
  })

  it("ano vem do vencimento, não do relógio", () => {
    // Importada um ano depois, a fatura continua com as datas dela.
    const { lancamentos } = interpretarTextoPdf(MERCADO_PAGO, { faturaCartao: true, hoje: new Date("2027-10-01") })
    assert.equal(dia(lancamentos.find((l) => l.descricao === "99*")!.data), "2026-09-15")
  })

  it("hífen da coluna vazia do Inter não é sinal de menos", () => {
    const { lancamentos } = fatura(INTER)
    assert.equal(lancamentos.find((l) => l.descricao.includes("99 RIDE"))?.tipo, "DESPESA")
    assert.equal(lancamentos.find((l) => l.descricao.includes("PAGAMENTO"))?.tipo, "RECEITA")
  })

  it("lê o mês por extenso do Nubank e o menos Unicode", () => {
    const { lancamentos } = fatura(NUBANK)
    assert.deepEqual(
      lancamentos.map((l) => [dia(l.data), l.tipo, l.valorCentavos]),
      [
        ["2026-08-03", "DESPESA", 1_000],
        ["2026-08-05", "DESPESA", 4_900],
        ["2026-08-05", "RECEITA", 25_929],
      ],
    )
  })

  it("a soma lida fecha com o total que cada fatura declara", () => {
    for (const texto of [ITAU, NUBANK, INTER, MERCADO_PAGO]) {
      const { conferencia } = fatura(texto)
      assert.ok(conferencia, "achou o total declarado")
      assert.equal(conferencia.lidoCentavos, conferencia.informadoCentavos)
    }
  })

  it("a conferência acusa lançamento perdido", () => {
    const semUmaCompra = ITAU.replace("17/08 CANTINA DA PRACASAO JOSE D 30,00\n", "")
    const { conferencia } = fatura(semUmaCompra)
    assert.equal(conferencia!.informadoCentavos - conferencia!.lidoCentavos, 3_000)
  })

  it("usa o ramo impresso pelo banco e tira a cidade colada ao nome", () => {
    const cantina = fatura(ITAU).lancamentos.find((l) => l.descricao.startsWith("CANTINA"))!
    assert.equal(cantina.descricao, "CANTINA DA PRACA")
    assert.equal(cantina.categoriaBanco, "restaurante")
    assert.equal(categoriaPeloRamo(cantina.categoriaBanco!), "Restaurante")
    assert.equal(categoriaPeloRamo("outros"), undefined)
  })
})

describe("extrato de conta em PDF", () => {
  it("valor com milhar não é lido como data", () => {
    const { lancamentos } = interpretarTextoPdf("Saldo disponível 63.352,00\n12/08 PIX RECEBIDO 150,00", { hoje })
    assert.equal(lancamentos.length, 1)
    assert.equal(dia(lancamentos[0].data), "2026-08-12")
  })
})

describe("lerData recusa data impossível", () => {
  it("dia e mês fora da faixa são null, não rolam para frente", () => {
    assert.equal(lerData("63/35/2026"), null)
    assert.equal(lerData("31/02/2026"), null)
    assert.equal(lerData("2026-13-01"), null)
    assert.equal(dia(lerData("29/02/2028")!), "2028-02-29")
  })
})

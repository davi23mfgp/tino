import assert from "node:assert/strict"
import { describe, it } from "node:test"

import type { PreviaImportacao } from "@/lib/importar"
import { motivoParaNaoImportarSozinho } from "@/lib/importar/sem-tela"
import { ehTransferencia, relerFaturaComIa, sugerirCategorias, type ModeloJson } from "@/lib/importar/ia"

/** Modelo falso: devolve a resposta dada e guarda o que recebeu. */
function modeloFalso(resposta: unknown) {
  const pedidos: string[] = []
  const modelo: ModeloJson = async (_sistema, usuario) => {
    pedidos.push(usuario)
    return resposta === null ? null : typeof resposta === "string" ? resposta : JSON.stringify(resposta)
  }
  return { modelo, pedidos }
}

// Layout que o leitor por regra não conhece: data com ponto, total com rótulo novo.
const FATURA_NOVA = `
Banco Exemplo S.A.
Cliente FULANO DE TAL CPF 123.456.789-09 Limite R$ 5.000,00
Rua das Flores, 10 CEP 01234-567
Vencimento 10/09/2026
Valor desta fatura 60,00
Lançamentos
05.08 PADARIA DO ZE 20,00
12.06 LIVRARIA CENTRAL 3/5 40,00
Parcelas das próximas faturas
12.06 LIVRARIA CENTRAL 4/5 40,00
34191759836648102252450484150003815630000002152
`

const hoje = new Date("2026-09-23T12:00:00Z")

describe("releitura da fatura pela IA", () => {
  const respostaCerta = {
    total_da_fatura: "60,00",
    lancamentos: [
      { linha: 6, data: "05/08", descricao: "PADARIA DO ZE", valor: "20,00", credito: false, parcela: null },
      { linha: 7, data: "12/06", descricao: "LIVRARIA CENTRAL", valor: "40,00", credito: false, parcela: "3/5" },
    ],
  }

  it("aceita quando cada item está no texto e a soma fecha com o total", async () => {
    const { modelo } = modeloFalso(respostaCerta)
    const releitura = await relerFaturaComIa(FATURA_NOVA, modelo, { hoje })
    assert.ok(releitura)
    assert.equal(releitura.conferencia.lidoCentavos, 6_000)
    const livraria = releitura.lancamentos.find((l) => l.descricao.startsWith("LIVRARIA"))!
    assert.deepEqual([livraria.parcelaAtual, livraria.parcelasTotal], [3, 5])
    // Ano pelo vencimento impresso; parcela 3 dois meses depois da compra.
    assert.equal(livraria.dataCompra?.toISOString().slice(0, 10), "2026-06-12")
    assert.equal(livraria.data.toISOString().slice(0, 10), "2026-08-12")
  })

  it("descarta valor que não está escrito na linha apontada, mesmo que feche a soma", async () => {
    const { modelo } = modeloFalso({
      total_da_fatura: "60,00",
      lancamentos: [{ linha: 6, data: "05/08", descricao: "PADARIA DO ZE", valor: "60,00", credito: false, parcela: null }],
    })
    assert.equal(await relerFaturaComIa(FATURA_NOVA, modelo, { hoje }), null)
  })

  it("descarta tudo quando a soma não fecha — inclusive parcela da próxima fatura", async () => {
    const comFutura = structuredClone(respostaCerta)
    comFutura.lancamentos.push({ linha: 9, data: "12/06", descricao: "LIVRARIA CENTRAL", valor: "40,00", credito: false, parcela: "4/5" })
    const { modelo } = modeloFalso(comFutura)
    assert.equal(await relerFaturaComIa(FATURA_NOVA, modelo, { hoje }), null)
  })

  it("total só vale se estiver escrito como total, não como uma compra", async () => {
    // A IA devolve só a padaria e chama o valor dela de total: "fecharia".
    const { modelo } = modeloFalso({
      total_da_fatura: "20,00",
      lancamentos: [respostaCerta.lancamentos[0]],
    })
    assert.equal(await relerFaturaComIa(FATURA_NOVA, modelo, { hoje }), null)
    assert.equal(await relerFaturaComIa(FATURA_NOVA, modeloFalso({ ...respostaCerta, total_da_fatura: "999,99" }).modelo, { hoje }), null)
  })

  it("descrição precisa estar perto do valor apontado", async () => {
    const trocada = structuredClone(respostaCerta)
    trocada.lancamentos[0].descricao = "MERCADO QUALQUER"
    const { modelo } = modeloFalso(trocada)
    assert.equal(await relerFaturaComIa(FATURA_NOVA, modelo, { hoje }), null)
  })

  it("não manda CPF, CEP, endereço nem código de barras", async () => {
    const { modelo, pedidos } = modeloFalso(respostaCerta)
    await relerFaturaComIa(FATURA_NOVA, modelo, { hoje })
    const enviado = pedidos[0]
    assert.ok(!enviado.includes("123.456.789-09"))
    assert.ok(!enviado.includes("01234-567"))
    assert.ok(!enviado.includes("Rua das Flores"))
    assert.ok(!enviado.includes("34191759836648102252450484150003815630000002152"))
    assert.ok(enviado.includes("PADARIA DO ZE"))
  })

  it("IA fora do ar ou resposta quebrada é null, não erro", async () => {
    assert.equal(await relerFaturaComIa(FATURA_NOVA, modeloFalso(null).modelo, { hoje }), null)
    assert.equal(await relerFaturaComIa(FATURA_NOVA, modeloFalso("não sei").modelo, { hoje }), null)
  })
})

describe("categoria sugerida pela IA", () => {
  const categorias = ["Supermercado", "Restaurante", "Assinaturas e streaming"]

  it("só aceita categoria que existe no lar", async () => {
    const { modelo } = modeloFalso({
      itens: [
        { n: 1, categoria: "Supermercado" },
        { n: 2, categoria: "Software" },
        { n: 3, categoria: null },
      ],
    })
    const sugestoes = await sugerirCategorias(["Compre Mix", "Canva", "Loja X"], categorias, modelo)
    assert.deepEqual([...sugestoes], [["Compre Mix", "Supermercado"]])
  })

  it("Pix e transferência não vão para a IA", async () => {
    const { modelo, pedidos } = modeloFalso({ itens: [] })
    await sugerirCategorias(["PIX Fulana de Tal", "Compre Mix"], categorias, modelo)
    assert.ok(!pedidos[0].includes("Fulana"))
    assert.equal(ehTransferencia("PIX CRED PARCELADO"), true)
    assert.equal(ehTransferencia("PIX PJBANK PAGAMENTOS"), true)
    assert.equal(ehTransferencia("COMPRE MIX"), false)
  })

  it("número de item fora da lista é ignorado", async () => {
    const { modelo } = modeloFalso({ itens: [{ n: 7, categoria: "Restaurante" }] })
    assert.equal((await sugerirCategorias(["Compre Mix"], categorias, modelo)).size, 0)
  })
})

describe("importação sem tela (Telegram, WhatsApp)", () => {
  const previa = (parcial: Partial<PreviaImportacao>) =>
    ({ formato: "pdf", faturaPdf: true, total: 1, novas: 1, duplicadas: 0, semCategoria: 0, lancamentos: [], avisos: [], ...parcial }) as PreviaImportacao

  it("fatura cuja soma não fecha não é importada sozinha", () => {
    assert.match(
      motivoParaNaoImportarSozinho(previa({ conferencia: { informadoCentavos: 10_000, lidoCentavos: 9_000 } })) ?? "",
      /Não importei nada/,
    )
    assert.match(motivoParaNaoImportarSozinho(previa({})) ?? "", /não importei nada/)
  })

  it("fatura que fecha, e extrato comum, seguem", () => {
    assert.equal(motivoParaNaoImportarSozinho(previa({ conferencia: { informadoCentavos: 10_000, lidoCentavos: 10_000 } })), null)
    assert.equal(motivoParaNaoImportarSozinho(previa({ faturaPdf: false })), null)
  })
})

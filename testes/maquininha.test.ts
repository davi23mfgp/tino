import assert from "node:assert/strict"
import { test } from "node:test"

import { conciliar, lerArquivoDaMaquininha, type PagamentoDoBalcao, type VendaDaMaquininha } from "../src/lib/loja/maquininha"

// Planilha no jeito das maquininhas: título antes do cabeçalho, ";" e vírgula decimal,
// data com hora, taxa em reais negativa, uma venda negada e uma estornada.
const PLANILHA = [
  "Relatório de vendas;;;;;;;;",
  "Período: 01/10/2026 a 07/10/2026;;;;;;;;",
  "Data da venda;Status;Forma de pagamento;Parcelas;Valor bruto;Taxa;Valor líquido;Previsão de pagamento;Código da transação",
  "05/10/2026 09:12;Pago;Débito;1;R$ 50,00;-0,75;49,25;06/10/2026;A1",
  "05/10/2026 10:40;Aprovada;Crédito à vista;1;120,00;-3,59;116,41;05/11/2026;A2",
  "05/10/2026 11:02;Negada;Crédito;1;300,00;0;0;;A3",
  "06/10/2026 15:30;Aprovada;Crédito 3x;3;450,00;-22,46;427,54;05/11/2026;A4",
  "06/10/2026 16:00;Estornada;Débito;1;80,00;-1,20;78,80;07/10/2026;A5",
  "07/10/2026 08:05;Aprovada;Débito;1;35,00;-0,53;34,47;08/10/2026;A6",
].join("\n")

test("maquininha: lê a planilha com título, ';', taxa negativa e data com hora", () => {
  const leitura = lerArquivoDaMaquininha(PLANILHA)
  assert.equal(leitura.falta, null)
  assert.equal(leitura.vendas.length, 4)
  const [debito, credito, parcelado, ultima] = leitura.vendas
  assert.deepEqual(debito, {
    linha: 4, dia: "2026-10-05", hora: "09:12", forma: "DEBITO", parcelas: 1,
    brutoCentavos: 5000, taxaCentavos: 75, liquidoCentavos: 4925, previsao: "2026-10-06", pago: true, codigo: "A1",
  })
  assert.equal(credito.forma, "CREDITO_VISTA")
  assert.equal(credito.pago, false)
  assert.equal(parcelado.forma, "CREDITO_PARCELADO")
  assert.equal(parcelado.parcelas, 3)
  assert.equal(ultima.linha, 9)
})

test("maquininha: negada e estornada ficam de fora, com o motivo e a linha", () => {
  const { descartadas } = lerArquivoDaMaquininha(PLANILHA)
  assert.deepEqual(descartadas.map((linha) => linha.linha), [6, 8])
  assert.ok(descartadas.every((linha) => linha.motivo.startsWith("cancelada, negada ou estornada")))
})

test("maquininha: taxa em percentual vira reais; sem bruto, soma líquido e taxa", () => {
  const percentual = lerArquivoDaMaquininha("data,valor,taxa (%),tipo\n2026-10-05,200.00,2.99,credito").vendas[0]
  assert.equal(percentual.taxaCentavos, 598)
  assert.equal(percentual.liquidoCentavos, 19402)
  const semBruto = lerArquivoDaMaquininha("Data;Valor líquido;Tarifa\n05/10/2026;97,00;3,00").vendas[0]
  assert.equal(semBruto.brutoCentavos, 10000)
  // "Valor" não pode ter casado com "Valor líquido": o líquido é o líquido.
  const ambos = lerArquivoDaMaquininha("Data;Valor líquido;Valor\n05/10/2026;97,00;100,00").vendas[0]
  assert.equal(ambos.brutoCentavos, 10000)
  assert.equal(ambos.liquidoCentavos, 9700)
  assert.equal(ambos.taxaCentavos, 300)
})

test("maquininha: sem coluna de data ou de valor, diz o que falta em vez de inventar", () => {
  assert.equal(lerArquivoDaMaquininha("Valor;Taxa\n10,00;0,30").falta, "a coluna da data da venda")
  assert.equal(lerArquivoDaMaquininha("Data;Taxa\n05/10/2026;0,30").falta, "a coluna do valor da venda")
  assert.equal(lerArquivoDaMaquininha("").falta, "o arquivo está vazio")
})

const pagamento = (id: string, extra: Partial<PagamentoDoBalcao>): PagamentoDoBalcao => ({
  id, vendaNumero: Number(id.replace(/\D/g, "")) || 1, dia: "2026-10-05", hora: "09:10", forma: "DEBITO", parcelas: 1,
  valorCentavos: 5000, taxaBps: 150, liquidoCentavos: 4925, previsao: "2026-10-06", recebido: false, ...extra,
})

test("conciliação: bate por valor e dia, e sobra o que só um lado tem", () => {
  const vendas = lerArquivoDaMaquininha(PLANILHA).vendas
  const balcao = [
    pagamento("p1", {}),
    pagamento("p2", { hora: "10:45", forma: "CREDITO_VISTA", valorCentavos: 12000, taxaBps: 299, liquidoCentavos: 11641, previsao: "2026-11-04" }),
    pagamento("p3", { dia: "2026-10-06", hora: "15:31", forma: "CREDITO_PARCELADO", parcelas: 3, valorCentavos: 45000, taxaBps: 499, liquidoCentavos: 42755, previsao: "2026-11-05" }),
    // Venda no Balcão que não passou na maquininha (outra maquininha, ou cancelada).
    pagamento("p4", { dia: "2026-10-06", hora: "12:00", valorCentavos: 9000, liquidoCentavos: 8865 }),
    // Fora do período do arquivo: não entra em "só no Balcão".
    pagamento("p5", { dia: "2026-10-01", valorCentavos: 7000 }),
    // Dinheiro não passa na maquininha.
    pagamento("p6", { dia: "2026-10-06", forma: "DINHEIRO", valorCentavos: 2000 }),
  ]
  const resultado = conciliar(vendas, balcao)
  assert.deepEqual(resultado.periodo, { de: "2026-10-05", ate: "2026-10-07" })
  assert.deepEqual(resultado.bateram.map((par) => [par.maquininha.codigo, par.balcao.id]), [["A1", "p1"], ["A2", "p2"], ["A4", "p3"]])
  assert.deepEqual(resultado.soNaMaquininha.map((venda) => venda.codigo), ["A6"])
  assert.deepEqual(resultado.soNoBalcao.map((linha) => linha.id), ["p4"])
})

test("conciliação: taxa e prazo diferentes do cadastrado viram aviso e ajuste proposto", () => {
  const vendas = lerArquivoDaMaquininha(PLANILHA).vendas
  const balcao = [
    pagamento("p1", {}),
    pagamento("p2", { hora: "10:45", forma: "CREDITO_VISTA", valorCentavos: 12000, taxaBps: 299, liquidoCentavos: 11641, previsao: "2026-11-04" }),
    pagamento("p3", { dia: "2026-10-06", hora: "15:31", forma: "CREDITO_PARCELADO", parcelas: 3, valorCentavos: 45000, taxaBps: 499, liquidoCentavos: 42755, previsao: "2026-11-05" }),
  ]
  const { bateram, taxa, ajustes } = conciliar(vendas, balcao)
  assert.deepEqual(bateram[0].avisos, [])
  // O crédito cai um dia depois do que a regra estimou: a proposta é corrigir a data.
  assert.deepEqual(bateram[1].avisos.map((aviso) => aviso.texto), ["Cai em 05/11, não em 04/11 como o Tino estimou."])
  // Parcelado: cobrou 22,46 e o cadastro dizia 22,45 (4,99%): um centavo é arredondamento, sem aviso.
  assert.deepEqual(bateram[2].avisos, [])
  assert.deepEqual(taxa, { cobradaCentavos: 75 + 359 + 2246, esperadaCentavos: 75 + 359 + 2245, diferencaCentavos: 1 })
  // O débito a maquininha já pagou: a proposta é marcar recebido no dia em que caiu.
  assert.deepEqual(ajustes, [{ pagamentoId: "p1", vendaNumero: 1, recebidoEm: "2026-10-06" }, { pagamentoId: "p2", vendaNumero: 2, previsao: "2026-11-05" }])

  const caro = conciliar(vendas, [pagamento("p1", { taxaBps: 100, liquidoCentavos: 4950 })])
  assert.deepEqual(caro.bateram[0].avisos.map((aviso) => aviso.texto), ["A maquininha cobrou R$ 0,75 de taxa; pela taxa cadastrada seriam R$ 0,50."])
  assert.deepEqual(caro.taxa, { cobradaCentavos: 75, esperadaCentavos: 50, diferencaCentavos: 25 })
  assert.deepEqual(caro.ajustes, [{ pagamentoId: "p1", vendaNumero: 1, recebidoEm: "2026-10-06", liquidoCentavos: 4925 }])
})

test("conciliação: prefere o mesmo dia, depois a mesma forma, depois a hora mais perto", () => {
  const venda = (extra: Partial<VendaDaMaquininha>): VendaDaMaquininha => ({
    linha: 2, dia: "2026-10-05", hora: "14:00", forma: "DEBITO", parcelas: 1, brutoCentavos: 1000, taxaCentavos: null,
    liquidoCentavos: null, previsao: null, pago: false, codigo: null, ...extra,
  })
  const dois = [pagamento("cedo", { hora: "09:00", valorCentavos: 1000 }), pagamento("perto", { hora: "14:05", valorCentavos: 1000 })]
  assert.equal(conciliar([venda({})], dois).bateram[0].balcao.id, "perto")
  // Lançado no dia seguinte ainda casa; dois dias depois, não.
  assert.equal(conciliar([venda({})], [pagamento("x", { dia: "2026-10-06", valorCentavos: 1000 })]).bateram.length, 1)
  assert.equal(conciliar([venda({})], [pagamento("x", { dia: "2026-10-07", valorCentavos: 1000 })]).bateram.length, 0)
  // Lançado antes da venda na maquininha não casa: o Balcão não adivinha.
  assert.equal(conciliar([venda({})], [pagamento("x", { dia: "2026-10-04", valorCentavos: 1000 })]).bateram.length, 0)
  const mesmoDia = [pagamento("amanha", { dia: "2026-10-06", hora: "14:00", valorCentavos: 1000 }), pagamento("hoje", { hora: "20:00", valorCentavos: 1000 })]
  assert.equal(conciliar([venda({})], mesmoDia).bateram[0].balcao.id, "hoje")
  const formas = [pagamento("credito", { hora: "14:00", forma: "CREDITO_VISTA", valorCentavos: 1000 }), pagamento("debito", { hora: "16:00", valorCentavos: 1000 })]
  assert.equal(conciliar([venda({})], formas).bateram[0].balcao.id, "debito")
  // Débito lançado como crédito ainda casa, com aviso.
  const errado = conciliar([venda({})], [formas[0]])
  assert.deepEqual(errado.bateram[0].avisos.map((aviso) => aviso.texto), ["Na maquininha foi débito; no Balcão está crédito à vista."])
  // Pix não casa com cartão.
  assert.equal(conciliar([venda({ forma: "PIX" })], [pagamento("c", { valorCentavos: 1000 })]).bateram.length, 0)
  // Duas vendas iguais não usam o mesmo pagamento.
  assert.equal(conciliar([venda({}), venda({ hora: "14:01" })], [dois[1]]).soNaMaquininha.length, 1)
})

test("conciliação: Pix do Balcão só conta como sobra se o arquivo trouxer Pix", () => {
  const venda: VendaDaMaquininha = { linha: 2, dia: "2026-10-05", hora: null, forma: "DEBITO", parcelas: 1, brutoCentavos: 1000, taxaCentavos: null, liquidoCentavos: null, previsao: null, pago: false, codigo: null }
  const pix = pagamento("pix", { forma: "PIX", valorCentavos: 3000 })
  assert.deepEqual(conciliar([venda], [pix]).soNoBalcao, [])
  assert.deepEqual(conciliar([venda, { ...venda, forma: "PIX", brutoCentavos: 500 }], [pix]).soNoBalcao.map((linha) => linha.id), ["pix"])
  assert.equal(conciliar([venda], [pix]).taxa, null)
  assert.deepEqual(conciliar([], [pix]), { periodo: null, bateram: [], soNaMaquininha: [], soNoBalcao: [], taxa: null, ajustes: [] })
})

test("conciliação: parcelado e o que já foi recebido não ganham data proposta", () => {
  const venda = (extra: Partial<VendaDaMaquininha>): VendaDaMaquininha => ({
    linha: 2, dia: "2026-10-05", hora: null, forma: "CREDITO_PARCELADO", parcelas: 3, brutoCentavos: 30000, taxaCentavos: null,
    liquidoCentavos: null, previsao: "2026-11-05", pago: true, codigo: null, ...extra,
  })
  // Cada parcela cai num mês: marcar recebido pela primeira faria o resto parecer recebido.
  const parcelado = pagamento("p", { forma: "CREDITO_PARCELADO", parcelas: 3, valorCentavos: 30000, previsao: "2026-11-04" })
  assert.deepEqual(conciliar([venda({})], [parcelado]).ajustes, [])
  const recebido = pagamento("r", { forma: "DEBITO", valorCentavos: 30000, recebido: true })
  assert.deepEqual(conciliar([venda({ forma: "DEBITO", parcelas: 1 })], [recebido]).ajustes, [])
})

test("maquininha: sinônimo curto não casa dentro de outra palavra", () => {
  // "id" está dentro de "Unidade": sem a regra, o nome da loja virava código da venda.
  assert.equal(lerArquivoDaMaquininha("Data;Valor;Unidade\n05/10/2026;10,00;Loja Centro").vendas[0].codigo, null)
})

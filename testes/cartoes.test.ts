import test from "node:test"
import assert from "node:assert/strict"
import {resumoDoMes,mesesDoCartao,type DadosCartao} from "../src/lib/cartoes"
const cartao:DadosCartao={id:"a",nome:"Teste",instituicao:null,limiteCentavos:100000,diaFechamento:20,diaVencimento:28,compras:[{id:"1",descricao:"Mercado",data:"2026-09-01",competencia:"2026-09",valorCentavos:12345,tipo:"DESPESA",categoriaId:"cat",categoria:{nome:"Mercado",cor:"green",icone:"🛒"}},{id:"2",descricao:"Crédito",data:"2026-09-02",competencia:"2026-09",valorCentavos:345,tipo:"RECEITA",categoriaId:null,categoria:null},{id:"3",descricao:"Outro mês",data:"2026-10-01",competencia:"2026-10",valorCentavos:900,tipo:"DESPESA",categoriaId:null,categoria:null}],parcelamentos:[{id:"p",descricao:"Compra",categoriaId:null,parcelasTotal:2,parcelasPagas:0,valorTotalCentavos:24690,parcelaCentavos:12345,parcelas:[{id:"pp",numero:1,competencia:"2026-09",valorCentavos:12345,paga:false}]}]}
test("fatura separa previsão, crédito e compras sem duplicar parcelas",()=>{const r=resumoDoMes(cartao,"2026-09");assert.equal(r.gastos,12345);assert.equal(r.creditos,345);assert.equal(r.saldo,12000);assert.equal(r.previsto,12345);assert.deepEqual(r.categorias,[{id:"cat",nome:"Mercado",totalCentavos:12345}]);assert.equal(r.compras.length,2)})
test("meses incluem histórico e previsão, ordenados sem repetição",()=>{const meses=mesesDoCartao(cartao,"2026-09");assert.equal(new Set(meses).size,meses.length);assert.deepEqual([...meses].sort(),meses);assert.equal(resumoDoMes(cartao,"2026-08").gastos,0)})

import { faixaDoUsoDoLimite, limiteDoCartao } from "../src/lib/cartoes"

const cartaoComLimite = (limiteCentavos: number | null): DadosCartao => ({
  id: "c", nome: "Platinum", instituicao: null, limiteCentavos, diaFechamento: 28, diaVencimento: 6,
  compras: [
    { id: "1", descricao: "Mercado", data: "2026-09-10", competencia: "2026-09", valorCentavos: 200_000, tipo: "DESPESA", categoriaId: null, categoria: null },
    { id: "2", descricao: "Estorno", data: "2026-09-12", competencia: "2026-09", valorCentavos: 20_000, tipo: "RECEITA", categoriaId: null, categoria: null },
    { id: "3", descricao: "Depois do fechamento", data: "2026-09-29", competencia: "2026-10", valorCentavos: 30_000, tipo: "DESPESA", categoriaId: null, categoria: null },
    { id: "4", descricao: "Fatura paga", data: "2026-08-10", competencia: "2026-08", valorCentavos: 500_000, tipo: "DESPESA", categoriaId: null, categoria: null },
  ],
  parcelamentos: [{
    id: "p", descricao: "TV", categoriaId: null, parcelasTotal: 4, parcelasPagas: 1, valorTotalCentavos: 400_000, parcelaCentavos: 100_000,
    parcelas: [
      { id: "a", numero: 1, competencia: "2026-08", valorCentavos: 100_000, paga: true },
      { id: "b", numero: 2, competencia: "2026-09", valorCentavos: 100_000, paga: false },
      { id: "c", numero: 3, competencia: "2026-10", valorCentavos: 100_000, paga: false },
      { id: "d", numero: 4, competencia: "2026-11", valorCentavos: 100_000, paga: false },
    ],
  }],
})

test("limite usado soma fatura aberta, compras da próxima fatura e parcelas futuras", () => {
  const limite = limiteDoCartao(cartaoComLimite(1_000_000), "2026-09")!
  // Fatura de set (2.000 − 200) + compra de out (300) = 2.100; parcelas de out e nov = 2.000.
  assert.equal(limite.faturaCentavos, 210_000)
  assert.equal(limite.parcelasFuturasCentavos, 200_000)
  assert.equal(limite.usadoCentavos, 410_000)
  assert.equal(limite.disponivelCentavos, 590_000)
  assert.equal(limite.usoBps, 4100)
})

test("sem limite cadastrado não inventa percentual", () => {
  assert.equal(limiteDoCartao(cartaoComLimite(null), "2026-09"), null)
})

test("uso acima do limite zera o disponível e mostra o percentual real", () => {
  const limite = limiteDoCartao(cartaoComLimite(300_000), "2026-09")!
  assert.equal(limite.disponivelCentavos, 0)
  assert.equal(limite.usoBps, 13_667)
})

test("faixas do uso do limite", () => {
  assert.equal(faixaDoUsoDoLimite(3000), "saudavel")
  assert.equal(faixaDoUsoDoLimite(4100), "atencao")
  assert.equal(faixaDoUsoDoLimite(7000), "alto")
})

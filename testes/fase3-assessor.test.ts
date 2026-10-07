import assert from "node:assert/strict"
import { test } from "node:test"

import { arquivoIcs, instanteNoFuso, lerPedidoDeAgenda, linkGoogleAgenda, textoDaProposta } from "../src/lib/loja/pedido-agenda"
import { dasDoMes, dasDoPerfil, responderTributario, LIMITE_MEI_2026_CENTAVOS, type ContextoDoMei } from "../src/lib/regras-mei"

// Quarta, 7 de outubro de 2026, 10h em São Paulo.
const agora = new Date("2026-10-07T13:00:00Z")
const ler = (texto: string) => lerPedidoDeAgenda(texto, agora)

test("agenda: o pedido do Davi vira proposta com dia, hora e cliente", () => {
  const pedido = ler("tenho um horário amanhã às 15h com a Ana, agenda pra mim")
  assert.deepEqual(pedido, { dia: "2026-10-08", hora: "15:00", cliente: "Ana", titulo: "Horário com Ana", faltando: [] })
  assert.equal(textoDaProposta(pedido), "Quinta, 08/10, 15:00 · Horário com Ana")
})

test("agenda: dia da semana, dia do mês, data e depois de amanhã", () => {
  assert.equal(ler("sexta 10:30 corte da Rita").dia, "2026-10-09")
  assert.equal(ler("sexta 10:30 corte da Rita").titulo, "Corte · Rita")
  // "quarta" dito na quarta é a da semana que vem: para hoje, a pessoa diz "hoje".
  assert.equal(ler("quarta às 9h").dia, "2026-10-14")
  assert.equal(ler("dia 12 às 9h troca de tela do João").titulo, "Troca de tela · João")
  assert.equal(ler("dia 3 às 9h").dia, "2026-11-03")
  assert.equal(ler("12/01 entrega das capinhas").dia, "2027-01-12")
  assert.equal(ler("depois de amanhã 3 da tarde").dia, "2026-10-09")
})

test("agenda: hora com h, dois-pontos, meio-dia, período, e 'às 3' em horário comercial", () => {
  assert.equal(ler("amanhã 14h30").hora, "14:30")
  assert.equal(ler("amanhã 9:05").hora, "09:05")
  assert.equal(ler("hoje meio-dia almoço").hora, "12:00")
  assert.equal(ler("amanhã 8 da noite").hora, "20:00")
  assert.equal(ler("amanhã 9 da manhã").hora, "09:00")
  assert.equal(ler("quinta às 3").hora, "15:00")
  // Número que não é hora não vira hora.
  assert.equal(ler("dia 12 buscar 2 peças").hora, null)
})

test("agenda: o que falta, a tela pergunta", () => {
  assert.deepEqual(ler("buscar peça segunda").faltando, ["hora"])
  assert.deepEqual(ler("ligar para o fornecedor").faltando, ["dia", "hora"])
})

test("agenda: o instante respeita o fuso da loja", () => {
  assert.equal(instanteNoFuso("2026-10-08", "15:00").toISOString(), "2026-10-08T18:00:00.000Z")
  assert.equal(instanteNoFuso("2026-10-08", "15:00", "America/Manaus").toISOString(), "2026-10-08T19:00:00.000Z")
})

test("Google Agenda: link pronto e arquivo .ics, com hora em UTC", () => {
  const inicio = instanteNoFuso("2026-10-08", "15:00")
  const link = new URL(linkGoogleAgenda({ titulo: "Horário com Ana", inicio, minutos: 45, detalhe: "Carlos Cell" }))
  assert.equal(link.searchParams.get("action"), "TEMPLATE")
  assert.equal(link.searchParams.get("dates"), "20261008T180000Z/20261008T184500Z")
  assert.equal(new URL(linkGoogleAgenda({ titulo: "Feira", inicio, diaInteiro: "2026-10-08" })).searchParams.get("dates"), "20261008/20261009")
  const ics = arquivoIcs({ id: "abc", titulo: "Corte; Rita, 30 min", inicio })
  assert.match(ics, /DTSTART:20261008T180000Z\r\nDTEND:20261008T190000Z/)
  assert.ok(ics.includes("SUMMARY:Corte\\; Rita\\, 30 min\r\n"))
})

const contexto = (parte: Partial<ContextoDoMei>): ContextoDoMei => ({ faturadoNoAnoCentavos: null, limiteAnualCentavos: LIMITE_MEI_2026_CENTAVOS, atividade: null, ...parte })

test("MEI: o DAS de 2026 confere com o salário mínimo de R$ 1.621", () => {
  assert.equal(dasDoMes("COMERCIO"), 8_205)
  assert.equal(dasDoMes("SERVICOS"), 8_605)
  assert.equal(dasDoMes("COMERCIO_E_SERVICOS"), 8_705)
  assert.equal(dasDoMes("TRANSPORTE_CARGA"), null)
})

test("MEI: responde com fonte e data, usa os números da conta, e diz quando é caso de contador", () => {
  const limite = responderTributario("quanto ainda posso faturar esse ano?", contexto({ faturadoNoAnoCentavos: 6_000_000 }))
  assert.equal(limite.chave, "limite")
  assert.match(limite.resposta, /ainda cabem R\$ 21\.000,00/)
  assert.ok("fontes" in limite && limite.fontes.length > 0 && limite.conferidaEm === "2026-10-07")

  const ate20 = responderTributario("e se eu passar do limite?", contexto({ faturadoNoAnoCentavos: 9_000_000 }))
  assert.equal(ate20.chave, "excesso")
  assert.match(ate20.resposta, /faixa de até 20%/)
  assert.equal(ate20.procureContador, true)
  assert.match(responderTributario("estourei o limite", contexto({ faturadoNoAnoCentavos: 10_000_000 })).resposta, /passou de 20%/)

  assert.match(responderTributario("quanto é o DAS?", contexto({ atividade: "SERVICOS" })).resposta, /O seu, pela atividade cadastrada: R\$ 86,05/)
  assert.equal(responderTributario("preciso emitir nota para empresa?", contexto({})).chave, "nota")

  const fora = responderTributario("posso abater o carro no imposto de renda?", contexto({}))
  assert.equal(fora.chave, "contador")
  assert.equal(fora.procureContador, true)
})

test("DAS do perfil: o informado vale; sem ele, a tabela de 2026; sem os dois, nenhum número", () => {
  assert.deepEqual(dasDoPerfil(9000, "COMERCIO"), { centavos: 9000, daTabela: false })
  assert.deepEqual(dasDoPerfil(null, "COMERCIO"), { centavos: 8205, daTabela: true })
  assert.deepEqual(dasDoPerfil(null, "SERVICOS"), { centavos: 8605, daTabela: true })
  // O caminhoneiro tem conta própria: sem o valor da guia, a tela pede, não inventa.
  assert.deepEqual(dasDoPerfil(null, "TRANSPORTE_CARGA"), { centavos: null, daTabela: false })
  assert.deepEqual(dasDoPerfil(0, "COMERCIO"), { centavos: 0, daTabela: false })
})

import assert from "node:assert/strict"
import { test } from "node:test"

import { lembretesDeRetirada, mensagemDeLembrete } from "../src/lib/loja/agenda"
import { procurarGarantia, type CandidataDeGarantia } from "../src/lib/loja/assistencia"

const agora = new Date("2026-10-07T15:00:00Z")
const diasAtras = (dias: number) => new Date(agora.getTime() - dias * 86_400_000)

test("aparelho pronto e esquecido: aviso nos marcos de 7, 30 e 60 dias, só o mais recente", () => {
  const ordem = (id: string, dias: number) => ({ id, numero: 12, objeto: "iPhone 13", cliente: "Maria Souza", prontoEm: diasAtras(dias) })
  const avisos = lembretesDeRetirada([ordem("a", 6), ordem("b", 7), ordem("c", 31), ordem("d", 65)], agora, "America/Sao_Paulo")
  assert.deepEqual(avisos.map((aviso) => aviso.chave), ["os-esquecida:b:7", "os-esquecida:c:30", "os-esquecida:d:60"])
  assert.equal(avisos[2]!.titulo, "iPhone 13 de Maria Souza está pronto há 65 dias")
  assert.equal(avisos[0]!.rota, "/loja/agenda?os=b")
})

test("o lembrete muda de tom depois de 30 dias, e não ameaça vender o aparelho", () => {
  const curto = mensagemDeLembrete("Maria Souza", "iPhone 13", "Carlos Cell", 8, "https://x/s/1")
  const longo = mensagemDeLembrete("Maria Souza", "iPhone 13", "Carlos Cell", 45, "https://x/s/1")
  assert.match(curto, /^Olá, Maria!/)
  assert.match(longo, /há 45 dias/)
  for (const texto of [curto, longo]) assert.doesNotMatch(texto, /vend|leil|descart/i)
})

const entregue = (dias: number) => ({ RECEBIDO: diasAtras(dias + 3).toISOString(), ENTREGUE: diasAtras(dias).toISOString() })
const candidata = (parte: Partial<CandidataDeGarantia>): CandidataDeGarantia => ({
  id: "os1", numero: 1, servico: "Troca de tela", clienteId: "maria", aparelhoSerie: "490154203237518", aparelhoModelo: "iPhone 13", etapasEm: entregue(10), ...parte,
})

test("garantia: o IMEI decide, com ou sem espaço", () => {
  const achada = procurarGarantia([candidata({})], { serie: "49 0154 2032 3751 8" }, agora)
  assert.equal(achada?.ordem.id, "os1")
  assert.equal(achada?.por, "serie")
  assert.equal(achada?.diasRestantes, 80)
})

test("garantia: sem IMEI, vale o mesmo cliente com o mesmo modelo, e a tela sabe que é mais fraco", () => {
  assert.equal(procurarGarantia([candidata({})], { modelo: "iphone 13", clienteId: "maria" }, agora)?.por, "cliente_e_modelo")
  assert.equal(procurarGarantia([candidata({})], { modelo: "iPhone 13", clienteId: "joao" }, agora), null)
  // Mesmo cliente e modelo, mas o IMEI é outro: é outro aparelho.
  assert.equal(procurarGarantia([candidata({})], { modelo: "iPhone 13", clienteId: "maria", serie: "356938035643809" }, agora), null)
})

test("garantia: só conta entregue há menos de 90 dias, e a mais recente vem primeiro", () => {
  assert.equal(procurarGarantia([candidata({ etapasEm: entregue(95) })], { serie: "490154203237518" }, agora), null)
  assert.equal(procurarGarantia([candidata({ etapasEm: { RECEBIDO: diasAtras(2).toISOString() } })], { serie: "490154203237518" }, agora), null)
  const duas = [candidata({ id: "velha", etapasEm: entregue(60) }), candidata({ id: "nova", etapasEm: entregue(5) })]
  assert.equal(procurarGarantia(duas, { serie: "490154203237518" }, agora)?.ordem.id, "nova")
  // Série curta demais não identifica aparelho nenhum.
  assert.equal(procurarGarantia([candidata({ aparelhoSerie: "123" })], { serie: "123" }, agora), null)
})

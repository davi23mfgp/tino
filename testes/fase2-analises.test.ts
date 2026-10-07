import assert from "node:assert/strict"
import { test } from "node:test"

import { brCodePix, crc16, normalizarChavePix } from "../src/lib/pix"
import { gruposDeClientes, guiaDoNegocio, motivosDePerda, type ClienteParaAnalise, type FotoDoNegocio } from "../src/lib/loja/analises"

const agora = new Date("2026-10-07T12:00:00Z")
const dias = (n: number) => new Date(agora.getTime() - n * 86_400_000)

test("Pix: o exemplo do manual do Banco Central sai igual, com o mesmo CRC", () => {
  // Manual de Padrões para Iniciação do Pix, exemplo de QR estático.
  assert.equal(
    brCodePix({ chave: "123e4567-e12b-12d1-a456-426655440000", nome: "Fulano de Tal", cidade: "BRASILIA" }),
    "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D",
  )
  assert.equal(crc16("123456789"), "29B1")
})

test("Pix: valor em reais sem float, nome sem acento e cortado no tamanho do padrão", () => {
  const codigo = brCodePix({ chave: "+5511988887777", nome: "Assistência do João Carlos da Silva", cidade: "São José dos Campos", valorCentavos: 45_005, identificador: "OS-0012" })
  assert.match(codigo, /5406450\.05/)
  assert.match(codigo, /5925Assistencia do Joao Carlo/)
  assert.match(codigo, /6015Sao Jose dos Ca/)
  assert.match(codigo, /62100506OS0012/)
  assert.equal(codigo.slice(-4), crc16(codigo.slice(0, -4)))
})

test("Pix: a chave é reconhecida e posta no formato do Pix", () => {
  assert.deepEqual(normalizarChavePix("(11) 98888-7777"), { tipo: "telefone", chave: "+5511988887777" })
  assert.deepEqual(normalizarChavePix("11.222.333/0001-81"), { tipo: "cnpj", chave: "11222333000181" })
  assert.deepEqual(normalizarChavePix("529.982.247-25"), { tipo: "cpf", chave: "52998224725" })
  assert.deepEqual(normalizarChavePix("Loja@Exemplo.com"), { tipo: "email", chave: "loja@exemplo.com" })
  assert.equal(normalizarChavePix("123")?.tipo, undefined)
  assert.equal(normalizarChavePix(""), null)
})

test("motivos de perda: 90 dias, em reais, com os 90 de antes como referência", () => {
  const perdido = (diasAtras: number, motivo: "PRECO" | "PRAZO" | null, total: number) => ({ status: "PERDIDO", perdidoEm: dias(diasAtras), motivoPerda: motivo, totalCentavos: total })
  const r = motivosDePerda([
    perdido(5, "PRECO", 50_000), perdido(10, "PRECO", 30_000), perdido(20, "PRAZO", 10_000), perdido(30, null, 5_000), perdido(40, "PRAZO", 5_000),
    perdido(120, "PRECO", 99_000), { status: "APROVADO", perdidoEm: null, motivoPerda: null, totalCentavos: 1 },
  ], agora)
  assert.deepEqual(r.linhas.map((l) => [l.rotulo, l.quantidade, l.valorCentavos]), [["Preço", 2, 80_000], ["Prazo", 2, 15_000], ["Sem motivo", 1, 5_000]])
  assert.deepEqual(r.total, { quantidade: 5, valorCentavos: 100_000 })
  assert.deepEqual(r.anterior, { quantidade: 1, valorCentavos: 99_000 })
  assert.equal(r.principal?.motivo, "PRECO")
  assert.equal(r.cedo, false)
})

test("motivos de perda: com menos de 5 perdas, mostra os números mas não aponta culpado", () => {
  const r = motivosDePerda([{ status: "PERDIDO", perdidoEm: dias(3), motivoPerda: "PRECO", totalCentavos: 9_000 }], agora)
  assert.equal(r.principal, null)
  assert.equal(r.cedo, true)
})

test("clientes: compram mais (80%), frequentes, sumidos e só no fiado", () => {
  const cliente = (id: string, compras: [number, number, boolean?][]): ClienteParaAnalise => ({ id, nome: id, telefone: null, compras: compras.map(([d, v, f]) => ({ em: dias(d), totalCentavos: v, fiado: Boolean(f) })) })
  const r = gruposDeClientes([
    cliente("ana", [[5, 50_000], [20, 30_000], [60, 10_000]]),
    cliente("bia", [[10, 20_000]]),
    cliente("caio", [[15, 5_000]]),
    // Comprou 3 vezes, a última há 50 dias: mais de 6 semanas, então sumiu.
    cliente("davi", [[50, 3_000], [80, 1_000], [100, 1_000]]),
    cliente("eva", [[3, 2_000, true], [30, 2_000, true]]),
    cliente("fabio", [[2, 1_000]]),
    // Duas compras antigas não fazem frequente, então também não fazem sumido.
    cliente("gil", [[50, 500], [70, 500]]),
    // Uma compra no fiado e outra não: não é "só no fiado". Uma só, também não.
    cliente("hugo", [[4, 500, true], [9, 500]]),
    cliente("iris", [[6, 500, true]]),
  ], agora)
  assert.deepEqual(r.compramMais.map((l) => l.cliente.id), ["ana", "bia"])
  assert.equal(r.compramMais[0]!.parteBps, Math.round((90_000 * 10_000) / 126_500))
  assert.deepEqual(r.frequentes.map((c) => c.id).sort(), ["ana", "davi"])
  assert.deepEqual(r.sumidos.map((l) => l.cliente.id), ["davi"])
  assert.deepEqual(r.soFiado.map((c) => c.id), ["eva"])
  assert.equal(r.cedo, false)
})

const foto = (parte: Partial<FotoDoNegocio>): FotoDoNegocio => ({
  produtos: 0, produtosSemCusto: 0, vendasNoCartao90d: 0, maquininhasComTaxa: 0, fiadoAtrasadoCentavos: 0, fiadoAtrasadoClientes: 0,
  dasAtrasados: 0, clientesSumidos: 0, orcamentosSemResposta: 0, chavePix: true, telefoneDaLoja: true, ...parte,
})

test("guia: o que falta vem primeiro, na ordem do caixa, e passo sem dado não aparece", () => {
  const passos = guiaDoNegocio(foto({ produtos: 12, produtosSemCusto: 3, fiadoAtrasadoCentavos: 5_000, fiadoAtrasadoClientes: 2, chavePix: false }))
  assert.deepEqual(passos.filter((p) => !p.feito).map((p) => p.chave), ["custo", "fiado", "pix"])
  assert.equal(passos[0]!.resposta, "3 de 12 ainda sem custo.")
  // Feito desce: com o custo em dia, o primeiro passo é o fiado, e o custo vai para o fim.
  const emDia = guiaDoNegocio(foto({ produtos: 12, fiadoAtrasadoCentavos: 5_000, fiadoAtrasadoClientes: 1 }))
  assert.equal(emDia[0]!.chave, "fiado")
  assert.equal(emDia.at(-1)!.feito, true)
  assert.ok(emDia.findIndex((p) => p.chave === "custo") > emDia.findIndex((p) => p.chave === "fiado"))
  // Sem produto cadastrado, não pergunta do custo; sem venda no cartão, não pergunta da taxa; sem MEI, não pergunta do DAS.
  const vazio = guiaDoNegocio(foto({ dasAtrasados: null }))
  assert.equal(vazio.some((p) => p.chave === "custo" || p.chave === "taxa" || p.chave === "das"), false)
  assert.ok(vazio.every((p) => p.porque.length > 20 && p.rota.startsWith("/")))
})

test("o funcionário do balcão não vê as análises da loja", async () => {
  const { rotaPermitida } = await import("../src/lib/acesso")
  assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/api/loja/analises"), false)
  assert.equal(rotaPermitida("TITULAR", "/api/loja/analises"), true)
})

test("indicação: código de 6 sem letras que confundem, e o link do mesmo produto", async () => {
  const { codigoValido, gerarCodigoDeIndicacao, linkDeIndicacao } = await import("../src/lib/indicacao")
  const codigo = gerarCodigoDeIndicacao(new Uint8Array([0, 1, 2, 30, 31, 255]))
  assert.equal(codigo, "ABC9AH")
  assert.equal(codigoValido(codigo), true)
  for (let i = 0; i < 200; i += 1) assert.doesNotMatch(gerarCodigoDeIndicacao(), /[01OIL]/)
  assert.equal(codigoValido("ABC0AJ"), false)
  assert.equal(linkDeIndicacao("https://tino.app", "ABC9AJ", "mei"), "https://tino.app/para-mei?ref=ABC9AJ")
  assert.equal(linkDeIndicacao("https://tino.app", "ABC9AJ", "pessoal"), "https://tino.app/?ref=ABC9AJ")
})

test("a indicação vale para o pessoal e para o MEI", async () => {
  const { rotaPermitidaNoMei } = await import("../src/lib/acesso")
  assert.equal(rotaPermitidaNoMei("/api/indicacao"), true)
})

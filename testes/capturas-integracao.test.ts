import assert from "node:assert/strict"
import { it } from "node:test"
import { prisma } from "../src/lib/prisma"
import { registrarCaptura, confirmarCaptura, descartarCaptura } from "../src/lib/captura"

it("capturas: identidade, concorrência e decisões preservam os lançamentos", { skip: process.env.TINO_TESTE_INTEGRACAO !== "1" }, async () => {
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname), "Somente banco local")
  const lar = await prisma.lar.create({ data: { nome: "Teste isolado de capturas" } })
  try {
    const conta = await prisma.conta.create({ data: { larId: lar.id, nome: "Cartão de teste", tipo: "CARTAO_CREDITO", diaFechamento: 28, diaVencimento: 6 } })
    const params = { larId: lar.id, texto: "mercado 52,30", origem: "MANUAL" as const, textoLivre: true }
    const [a, b] = await Promise.all([registrarCaptura({ ...params, eventoId: "evento-1" }), registrarCaptura({ ...params, eventoId: "evento-1" })])
    assert.equal(a.id, b.id)
    const distinta = await registrarCaptura({ ...params, eventoId: "evento-2" })
    assert.notEqual(a.id, distinta.id)
    const semId = await Promise.all([registrarCaptura(params), registrarCaptura(params)])
    assert.notEqual(semId[0].id, semId[1].id)
    const confirmar = { larId: lar.id, capturaId: a.id, contaId: conta.id }
    const [t1, t2] = await Promise.all([confirmarCaptura(confirmar), confirmarCaptura(confirmar)])
    assert.equal(t1.id, t2.id)
    await assert.rejects(descartarCaptura(lar.id, a.id), /já confirmada/)
    await descartarCaptura(lar.id, distinta.id)
    await assert.rejects(confirmarCaptura({ ...confirmar, capturaId: distinta.id }), /descartada/)
    const corrida = await Promise.allSettled([confirmarCaptura({ ...confirmar, capturaId: semId[0].id }), descartarCaptura(lar.id, semId[0].id)])
    assert.equal(corrida.filter((item) => item.status === "fulfilled").length, 1)
    const final = await prisma.captura.findUniqueOrThrow({ where: { id: semId[0].id } })
    assert.equal(Boolean(final.transacaoId), final.status === "CONFIRMADA")
  } finally {
    await prisma.lar.delete({ where: { id: lar.id } })
    await prisma.$disconnect()
  }
})

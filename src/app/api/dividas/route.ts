import { prisma } from "@/lib/prisma"
import { ErroDeUso, comSessao, corpo, ok } from "@/lib/api"
import { campo, validar, z } from "@/lib/validar"
import { TipoDivida } from "@prisma/client"
import { compararEstrategias, ordenarDividas, planejarQuitacao } from "@/lib/financeiro"
import { competenciaAtual } from "@/lib/datas"
import { montarPanorama } from "@/lib/tino/panorama"

export const GET = comSessao(async (sessao, requisicao) => {
  const url = new URL(requisicao.url)
  const extra = Math.max(0, Number(url.searchParams.get("extraMensalCentavos") ?? 0))

  // A renda só entra na primeira leitura (sem extra). A simulação de pagar
  // mais chama esta rota a cada arrasto da régua, e a renda não muda com ela:
  // montar o panorama inteiro a cada passo seria custo sem resposta nova.
  const [lar, dividas, panorama] = await Promise.all([
    prisma.lar.findUniqueOrThrow({ where: { id: sessao.larId }, select: { estrategiaDivida: true } }),
    prisma.divida.findMany({ where: { larId: sessao.larId }, orderBy: { criadoEm: "asc" } }),
    extra === 0 ? montarPanorama(sessao.larId, competenciaAtual()) : null,
  ])

  const abertas = dividas
    .filter((divida) => !divida.quitada)
    .map((divida) => ({
      id: divida.id,
      credor: divida.credor,
      saldoDevedorCentavos: divida.saldoDevedorCentavos,
      jurosMensalBps: divida.jurosMensalBps,
      parcelaCentavos: divida.parcelaCentavos,
    }))

  return ok({
    dividas,
    estrategia: lar.estrategiaDivida,
    ordem: ordenarDividas(abertas, lar.estrategiaDivida),
    plano: abertas.length > 0 ? planejarQuitacao(abertas, extra, lar.estrategiaDivida) : null,
    comparativo: abertas.length > 0 ? compararEstrategias(abertas, extra) : null,
    totalCentavos: abertas.reduce((soma, divida) => soma + divida.saldoDevedorCentavos, 0),
    parcelaMensalCentavos: abertas.reduce((soma, divida) => soma + divida.parcelaCentavos, 0),
    // Média observada, ou a declarada no cadastro enquanto não há histórico.
    // Zero quer dizer "não sabemos" — a tela pede a renda em vez de calcular.
    rendaMensalCentavos: panorama ? panorama.medias.receitaCentavos : null,
  })
})

export const POST = comSessao(async (sessao, requisicao) => {
  // Antes os números entravam crus: taxa negativa, parcela fracionada e tipo
  // inventado chegavam ao banco ou viravam erro 500 (auditoria, 10/11/2026).
  // Mesmo critério da edição em `dividas/[id]`.
  const dados = validar(
    z.object({
      credor: campo.textoObrigatorio(120),
      tipo: z.enum(TipoDivida).default("OUTRO"),
      saldoDevedorCentavos: campo.centavos(),
      jurosMensalBps: campo.bps().optional(),
      parcelaCentavos: campo.centavos().optional(),
      parcelasTotal: campo.inteiro(1, 600).nullish(),
      parcelasPagas: campo.inteiro(0, 600).optional(),
      diaVencimento: campo.dia().optional(),
      observacao: campo.texto(500).nullish(),
    }),
    await corpo(requisicao),
  )
  if (dados.parcelasTotal != null && (dados.parcelasPagas ?? 0) > dados.parcelasTotal) {
    throw new ErroDeUso("Parcelas pagas não pode passar do total.")
  }

  const divida = await prisma.divida.create({
    data: {
      larId: sessao.larId,
      credor: dados.credor,
      tipo: dados.tipo,
      saldoDevedorCentavos: dados.saldoDevedorCentavos,
      jurosMensalBps: dados.jurosMensalBps ?? 0,
      parcelaCentavos: dados.parcelaCentavos ?? 0,
      parcelasTotal: dados.parcelasTotal ?? null,
      parcelasPagas: dados.parcelasPagas ?? 0,
      diaVencimento: dados.diaVencimento ?? 10,
      observacao: dados.observacao || null,
    },
  })

  return ok(divida, 201)
})

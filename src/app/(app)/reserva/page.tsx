import { prisma } from "@/lib/prisma"
import { sessaoDaPagina } from "@/lib/pagina"
import { acompanharMetas } from "@/lib/metas"
import { montarPanorama } from "@/lib/tino/panorama"
import { TelaReserva } from "./tela-reserva"

export const dynamic = "force-dynamic"

/**
 * Reserva de emergência (Davi, 23/09: opção B do canvas, com formas de juntar
 * mais flexíveis e os botões de guardar e retirar).
 *
 * Os números vêm todos do panorama — reservado, alvo e custo essencial —, e
 * não da meta gravada. A tela antiga mostrava o alvo do panorama na
 * calculadora e o `alvoCentavos` da meta no cartão logo abaixo: o essencial
 * muda todo mês, a meta só era atualizada quando a pessoa apertava "usar este
 * alvo", e a mesma tela dizia R$ 34.063 e R$ 31.200. Ao salvar um plano, a
 * meta é realinhada ao alvo do panorama.
 */
export default async function Reserva() {
  const sessao = await sessaoDaPagina()
  const [panorama, metas, contas, lancamentos] = await Promise.all([
    montarPanorama(sessao.larId),
    acompanharMetas(sessao.larId),
    prisma.conta.findMany({ where: { larId: sessao.larId, arquivada: false, tipo: { not: "CARTAO_CREDITO" } }, select: { id: true, nome: true } }),
    prisma.transacao.findMany({
      where: { larId: sessao.larId, metaId: null, dividaId: null, pago: true, tipo: { in: ["DESPESA", "RECEITA"] } },
      select: { id: true, contaId: true, descricao: true, valorCentavos: true, tipo: true },
      orderBy: { data: "desc" },
      take: 100,
    }),
  ])

  // A primeira reserva ainda em uso recebe os aportes; as outras continuam
  // somando no reservado pelo panorama.
  const meta = metas.find((item) => item.tipo === "RESERVA_EMERGENCIA" && item.status !== "CANCELADA") ?? null
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })

  return (
    <TelaReserva
      hoje={hoje}
      essencialCentavos={panorama.medias.custoEssencialCentavos || panorama.medias.custoFixoCentavos || panorama.medias.despesaCentavos}
      reservadoCentavos={panorama.reserva.atualCentavos}
      alvoCentavos={panorama.reserva.idealCentavos}
      mesesAlvo={panorama.lar.mesesReserva}
      rendaCentavos={panorama.medias.receitaCentavos}
      sobraCentavos={panorama.medias.sobraCentavos}
      meta={
        meta && {
          id: meta.id,
          nome: meta.nome,
          tipo: meta.tipo,
          alvoCentavos: meta.alvoCentavos,
          saldoCentavos: meta.saldoCentavos,
          aporteMensalCentavos: meta.aporteMensalCentavos,
          dataAlvo: meta.dataAlvo?.toISOString() ?? null,
          contaId: meta.contaId,
          fotoUrl: meta.fotoUrl,
          lembreteDia: meta.lembreteDia,
          compromissoMensal: meta.compromissoMensal,
          status: meta.status,
          realizadoCentavos: meta.realizadoCentavos,
          previstoCentavos: meta.previstoCentavos,
        }
      }
      contas={contas}
      lancamentos={lancamentos}
    />
  )
}

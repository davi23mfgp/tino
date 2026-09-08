import Link from "next/link"
import { ArrowRight, CalendarClock, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react"

import { sessaoDaPagina } from "@/lib/pagina"
import { prisma } from "@/lib/prisma"
import { competenciaAtual } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { montarPanorama } from "@/lib/tino/panorama"
import { montarPlanoDoLar } from "@/lib/tino/plano-do-lar"
import { Cartao, Heroi, LinhaLista, Metrica, Vazio } from "@/components/ui/painel"
import { GraficoEvolucao, RoscaCategorias } from "@/components/graficos"

export const dynamic = "force-dynamic"

/**
 * Início — a tela que mais importa.
 *
 * A ordem vertical daqui é a da PARTE 4.1 do `docs/SPEC-CALEN-PRECISO.md`, e
 * ela não é preferência: a rodada anterior passou em todo teste automático e
 * o Davi olhou e disse "ainda tem muita parte técnica". O diagnóstico, feito
 * na tela rodando, foi que o Tino abria com DUAS frases de jargão em 22px e
 * escondia o número num tile de 20px — exatamente o inverso do que a
 * referência faz (número de 36px, três palavras de rótulo, uma linha curta).
 *
 * Por isso esta página encolheu. Tudo o que saiu daqui — patrimônio
 * detalhado, mapa de calor, categorias comparadas, parcelas, balanço — já
 * existia em `/analise`, então nada foi perdido: virou um "Ver mais
 * detalhes" no fim. A regra do Davi é simples primeiro, fundo depois.
 */
export default async function Painel() {
  const sessao = await sessaoDaPagina()
  const competencia = competenciaAtual()

  const [panorama, planoDoLar, pendentes, totalPendentes, proximaConta] = await Promise.all([
    montarPanorama(sessao.larId, competencia),
    montarPlanoDoLar(sessao.larId, competencia),
    prisma.captura.findMany({
      where: { larId: sessao.larId, status: "PENDENTE" },
      orderBy: { criadoEm: "desc" },
      take: 3,
    }),
    prisma.captura.count({ where: { larId: sessao.larId, status: "PENDENTE" } }),
    prisma.recorrencia.findFirst({
      where: { larId: sessao.larId, ativa: true, tipo: "DESPESA", proximaData: { gte: new Date() } },
      orderBy: { proximaData: "asc" },
    }),
  ])

  const piorDivida = planoDoLar.plano.ordem[0] ?? null
  const cartoes = panorama.saldoPorConta.filter((conta) => conta.tipo === "CARTAO_CREDITO")
  const faturaTotal = cartoes.reduce((soma, cartao) => soma + Math.abs(Math.min(0, cartao.saldoCentavos)), 0)
  const sobra = panorama.mes.sobraCentavos

  // Linha de apoio: teto de 8 palavras, por contrato do spec (PARTE 2). O que
  // não cabe em 8 palavras não é apoio, é outra tela — a taxa de juros, por
  // exemplo, saiu daqui e mora em `/plano`, onde ela decide alguma coisa.
  //
  // O nome da conta é cortado no travessão de propósito: contas cadastradas
  // como "Conta corrente — cheque especial" trazem o jargão de volta pela
  // porta dos fundos, e a própria PARTE 3 do spec corta esse sufixo na frase
  // que ela manda escrever. O dado no banco não é tocado.
  const nomeCurto = piorDivida?.nome.split("—")[0].trim()
  const apoio =
    panorama.saldoTotalCentavos < 0
      ? "Conta negativa: o dinheiro mais caro que existe."
      : nomeCurto
        ? `${nomeCurto} é sua dívida mais cara.`
        : "Nenhuma dívida cara em aberto agora."

  return (
    <div className="space-y-4">
      {/* 2) O herói: rótulo 11px, número 36px, apoio curto, um botão. */}
      <Heroi
        rotulo={sobra >= 0 ? "Sobra deste mês" : "Falta neste mês"}
        valor={formatarMoeda(Math.abs(sobra))}
        tom={sobra >= 0 ? "neutro" : "negativo"}
        apoio={apoio}
        acao={
          <Link
            href={piorDivida ? "/plano" : "/transacoes"}
            className="toque inline-flex h-11 items-center gap-2 rounded-[var(--raio-pilula)] bg-primary px-5 text-[14px] font-medium text-primary-foreground"
          >
            {piorDivida ? "Ver como pagar" : "Ver meus gastos"}
            <ArrowRight className="size-4" />
          </Link>
        }
      />

      {/* 3) A fila automática, antes de qualquer coisa manual. Some inteira
          quando está vazia — card vazio ocupa a dobra sem informar nada. */}
      {totalPendentes > 0 && (
        <Cartao
          titulo="Esperando você"
          acao={
            <Link href="/capturas" className="text-[13px] text-acao hover:underline">
              ver tudo
            </Link>
          }
        >
          <div className="space-y-1">
            {pendentes.map((captura) => (
              <LinhaLista
                key={captura.id}
                icone={Receipt}
                nome={captura.estabelecimento ?? captura.textoBruto ?? "Sem descrição"}
                valor={captura.valorCentavos !== null ? formatarMoeda(captura.valorCentavos) : undefined}
                href="/capturas"
              />
            ))}
          </div>
        </Cartao>
      )}

      {/* 4) Os quatro números do mês: 2×2 no celular, 4×1 no desktop. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metrica
          rotulo="Saldo"
          valor={formatarMoeda(panorama.saldoTotalCentavos)}
          tom={panorama.saldoTotalCentavos < 0 ? "negativo" : "neutro"}
          icone={Wallet}
        />
        <Metrica
          rotulo="Entrou"
          valor={formatarMoeda(panorama.mes.receitasCentavos)}
          tom="positivo"
          icone={TrendingUp}
        />
        <Metrica
          rotulo="Saiu"
          valor={formatarMoeda(panorama.mes.despesasCentavos)}
          tom="negativo"
          icone={TrendingDown}
        />
        {/* O dia vai no RÓTULO, não na linha de variação: a variação desenha
            um sinal (=, ↑, ↓) na frente do texto, e "= dia 10" não quer
            dizer nada. */}
        <Metrica
          rotulo={proximaConta ? `Próxima conta · dia ${proximaConta.diaVencimento}` : "Próxima conta"}
          valor={proximaConta ? formatarMoeda(proximaConta.valorCentavos) : "nenhuma"}
          tom="neutro"
          icone={CalendarClock}
        />
      </div>

      {/* 5) A rosca no lugar das barras finas (PARTE 1.6): o Início conta "o
          mês inteiro, repartido", e é isso que uma rosca desenha. */}
      <Cartao titulo="Para onde foi">
        {panorama.mes.despesasPorCategoria.length > 0 ? (
          <RoscaCategorias dados={panorama.mes.despesasPorCategoria} />
        ) : (
          <Vazio
            titulo="Nenhum gasto neste mês"
            texto="Anote pelo celular ou importe um extrato para o Tino começar a trabalhar."
          />
        )}
      </Cartao>

      {/* 6) O gráfico de evolução, sozinho — sem tabela ao lado. */}
      {panorama.historico.some((mes) => mes.receitasCentavos > 0 || mes.despesasCentavos > 0) && (
        <Cartao titulo="Entrou e saiu, mês a mês">
          <GraficoEvolucao dados={panorama.historico} />
        </Cartao>
      )}

      {/* 7) O fundo, para quem quiser. Tudo o que saiu da primeira dobra está
          em `/analise`, que já tinha as mesmas peças antes desta mudança. */}
      <Link
        href="/analise"
        className="ios-tap flex min-h-[44px] items-center justify-between gap-3 rounded-[var(--raio-cartao)] px-4 text-[14px] font-medium text-[color:var(--texto-2)] hover:bg-foreground/[0.04]"
      >
        Ver mais detalhes
        <ArrowRight className="size-4 shrink-0" />
      </Link>

      {faturaTotal > 0 && (
        <p className="px-1 text-[12px] text-[color:var(--texto-3)]">
          Fatura de cartão em aberto: {formatarMoeda(faturaTotal)}.
        </p>
      )}
    </div>
  )
}

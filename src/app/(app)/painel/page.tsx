import Link from "next/link"
import { ArrowRight, CalendarClock, PiggyBank, Wallet } from "lucide-react"

import { sessaoDaPagina } from "@/lib/pagina"
import { prisma } from "@/lib/prisma"
import { competenciaAtual, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda, formatarPercentual } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"
import { montarPanorama } from "@/lib/tino/panorama"
import { montarPlanoDoLar } from "@/lib/tino/plano-do-lar"
import { compromissosFuturos, resumoParcelamentos } from "@/lib/parcelamentos"
import { Barra, BarrasCategorias, Cartao, Metrica, Rotulo, Valor, Vazio } from "@/components/ui/painel"
import { GraficoEvolucao, GraficoParcelas } from "@/components/graficos"
import { MapaDeCalor } from "@/components/mapa-de-calor"
import { CategoriasComparadas } from "@/components/categorias-comparadas"
import { TinoAcompanha } from "@/components/tino-acompanha"
import { AnotarRapidoHoje } from "@/components/anotar-rapido"

export const dynamic = "force-dynamic"

export default async function Painel() {
  const sessao = await sessaoDaPagina()
  const competencia = competenciaAtual()

  const [panorama, parcelamentos, compromissos, planoDoLar, pendentes, proximaConta] = await Promise.all([
    montarPanorama(sessao.larId, competencia),
    resumoParcelamentos(sessao.larId),
    compromissosFuturos(sessao.larId, 6),
    montarPlanoDoLar(sessao.larId, competencia),
    prisma.captura.findMany({
      where: { larId: sessao.larId, status: "PENDENTE" },
      orderBy: { criadoEm: "desc" },
      take: 3,
    }),
    prisma.recorrencia.findFirst({
      where: { larId: sessao.larId, ativa: true, tipo: "DESPESA", proximaData: { gte: new Date() } },
      orderBy: { proximaData: "asc" },
    }),
  ])
  const totalPendentesCount = await prisma.captura.count({
    where: { larId: sessao.larId, status: "PENDENTE" },
  })
  const piorDivida = planoDoLar.plano.ordem[0] ?? null

  const contasLiquidas = panorama.saldoPorConta.filter((conta) => conta.tipo !== "CARTAO_CREDITO")
  const cartoes = panorama.saldoPorConta.filter((conta) => conta.tipo === "CARTAO_CREDITO")
  const faturaTotal = cartoes.reduce((soma, cartao) => soma + Math.abs(Math.min(0, cartao.saldoCentavos)), 0)
  // O saldo menos o que ja esta devido. Fatura de cartao e divida vem de
  // modelos diferentes no banco (conta do tipo cartao x tabela de dividas),
  // entao somar as duas nao conta nada duas vezes.
  const patrimonioLiquido = panorama.saldoTotalCentavos - faturaTotal - panorama.dividas.totalCentavos

  const negativo = panorama.projecao.find((linha) => linha.negativo)

  // A ordem aqui é a ordem de prioridade que aparece na tela, e ela não é
  // arbitrária: o que custa mais caro se ficar parado vem primeiro. Cheque
  // especial na frente de tudo, porque é a dívida mais cara que existe.
  const passos: string[] = []

  if (panorama.saldoTotalCentavos < 0) {
    passos.push(
      "Tirar a conta do negativo é a prioridade número um: o cheque especial cobra até 8% ao mês, mais que qualquer outra dívida sua.",
    )
  }
  if (negativo) {
    passos.push(
      `No ritmo atual, o caixa fica negativo em ${rotuloCompetencia(negativo.competencia)} (${formatarMoeda(negativo.saldoAcumuladoCentavos)}).`,
    )
  }
  if (parcelamentos.maiorMensalCentavos > 0) {
    passos.push(
      `O mês mais pesado à frente leva ${formatarMoeda(parcelamentos.maiorMensalCentavos)} só em parcelas já compradas — esse valor sai antes de qualquer gasto novo.`,
    )
  }
  if (panorama.mes.naoCategorizadas > 0) {
    passos.push(
      `${panorama.mes.naoCategorizadas} lançamento(s) sem categoria. Corrigir uma vez ensina o Tino para sempre.`,
    )
  }

  return (
    <div className="space-y-5">
      {/* ════════ HOJE — etapa 3 do redesign de 07/09/2026 ════════
          Cinco coisas, nessa ordem, e é o que a tela pergunta primeiro:
          "o que eu faço agora?". O resto da página (saldo detalhado,
          gráficos, mapa de calor) continua abaixo — não removi nada, só
          deixei de ser a PRIMEIRA coisa que a pessoa lê. */}
      <div>
        {/* 1) A frase grande. */}
        <p className="text-[22px] font-semibold leading-snug tracking-[-0.015em] sm:text-[26px]">
          {panorama.mes.sobraCentavos >= 0
            ? `Sobra ${formatarMoeda(panorama.mes.sobraCentavos)} este mês.`
            : `Faltam ${formatarMoeda(Math.abs(panorama.mes.sobraCentavos))} pra fechar o mês.`}{" "}
          {piorDivida ? (
            <span className="text-[color:var(--texto-2)]">
              A conta que mais dói é {piorDivida.nome.toLowerCase()}, a {formatarPercentual(piorDivida.jurosMensalBps)} ao mês.
            </span>
          ) : (
            <span className="text-[color:var(--texto-2)]">Nenhuma dívida cara em aberto agora.</span>
          )}
        </p>

        {/* 2) A ação recomendada, vinda do mesmo motor que a tela /plano usa. */}
        {piorDivida && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-[14px] text-[color:var(--texto-2)]">{planoDoLar.plano.primeiroPasso}</p>
            <Link
              href="/plano"
              className="toque flex shrink-0 items-center gap-1 rounded-[var(--raio-pilula)] bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground"
            >
              Ver plano de pagamento <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* 3) Anotar em uma linha. */}
      <Cartao titulo="Anotar em segundos" estatico>
        <AnotarRapidoHoje />
        <p className="mt-2 text-[12px] text-muted-fg">
          Escreva como você falaria: <b>uber 18</b>, <b>farmácia 38,90</b>, <b>almoço 45</b>.
        </p>
      </Cartao>

      {/* 4) O que está esperando confirmação. */}
      {totalPendentesCount > 0 && (
        <Cartao
          titulo={`${totalPendentesCount} esperando você`}
          acao={
            <Link href="/capturas" className="text-xs text-acao hover:underline">
              ver todas
            </Link>
          }
        >
          <div className="space-y-2">
            {pendentes.map((captura) => (
              <div key={captura.id} className="flex items-center justify-between text-[14px]">
                <span className="truncate text-[color:var(--texto-2)]">
                  {captura.estabelecimento ?? captura.textoBruto}
                </span>
                {captura.valorCentavos !== null && (
                  <span className="numero shrink-0">{formatarMoeda(captura.valorCentavos)}</span>
                )}
              </div>
            ))}
          </div>
        </Cartao>
      )}

      {/* 5) Três números — saldo, sobra do mês, próxima conta a vencer.
          Ícone em círculo sólido (referência do redesign de 07/09/2026) —
          só aqui, os quatro KPIs do topo; o resto das ~20 telas com
          `<Metrica>` continua sem ícone, por escolha (ver
          `docs/REDESIGN-EM-CURSO.md`). */}
      <div className="grid grid-cols-3 gap-3">
        <Metrica
          rotulo="Saldo"
          valor={formatarMoeda(panorama.saldoTotalCentavos)}
          tom={panorama.saldoTotalCentavos < 0 ? "negativo" : "neutro"}
          icone={Wallet}
        />
        <Metrica
          rotulo="Sobra do mês"
          valor={formatarMoeda(panorama.mes.sobraCentavos)}
          tom={panorama.mes.sobraCentavos >= 0 ? "positivo" : "negativo"}
          icone={PiggyBank}
        />
        <Metrica
          rotulo="Próxima conta"
          valor={
            proximaConta
              ? `${formatarMoeda(proximaConta.valorCentavos)} · dia ${proximaConta.diaVencimento}`
              : "nenhuma"
          }
          tom="neutro"
          icone={CalendarClock}
        />
      </div>

      {/* ════════ o resto da tela, como já estava ════════ */}

      {/* O Tino abre esta parte porque o que exige decisão vem antes do que só
          informa. Saldo bonito com fatura estourando é meia verdade. */}
      <TinoAcompanha />

      <div className="grid gap-5 lg:grid-cols-2">
        <Cartao titulo={`Saldo em ${rotuloCompetencia(competencia)}`}>
          {/* Saldo positivo sai em PRETO, não em verde — medido no protótipo.
              Faz sentido: verde é para o que entrou, e saldo é estado, não
              movimento. Verde aqui competiria com o "Entrou" ao lado. O
              negativo continua vermelho, porque aí é aviso. */}
          <Valor tom={panorama.saldoTotalCentavos < 0 ? "negativo" : "neutro"}>
            {formatarMoeda(panorama.saldoTotalCentavos)}
          </Valor>
          <p className="mt-1 text-sm text-muted-fg">
            {panorama.saldoTotalCentavos < 0
              ? "Suas contas estão no vermelho — isso é cheque especial, a dívida mais cara que existe."
              : "Somando contas correntes, poupança e dinheiro. Cartão não entra: limite não é seu."}
          </p>

          <div className="mt-4 space-y-2">
            {contasLiquidas.map((conta) => (
              <div key={conta.id} className="flex items-center justify-between text-[14px]">
                <span className="text-[color:var(--texto-2)]">{conta.nome}</span>
                <span className={cn("numero", conta.saldoCentavos < 0 && "text-negativo")}>
                  {formatarMoeda(conta.saldoCentavos)}
                </span>
              </div>
            ))}
            {contasLiquidas.length === 0 && <Vazio titulo="Nenhuma conta cadastrada ainda." />}
          </div>

          {/* O QUE O SALDO NÃO CONTA.
              O cartão fica de fora do número grande de propósito, e a frase
              acima já diz isso. Mas parar aí deixa a meia-verdade de pé: saldo
              bonito com fatura estourando engana. Aqui a conta se fecha —
              desconta o que já está devido e mostra o que sobra de verdade.

              Nada disso é estimativa: fatura vem do saldo dos cartões e dívida
              vem do que a pessoa cadastrou. Quando não há nem uma nem outra, o
              bloco não aparece, porque somar zero não informa nada. */}
          {(faturaTotal > 0 || panorama.dividas.totalCentavos > 0) && (
            <div className="mt-5 border-t border-pauta pt-4">
              <Rotulo>Descontando o que você deve</Rotulo>

              <div className="mt-3 space-y-2">
                {faturaTotal > 0 && (
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-[color:var(--texto-2)]">Fatura de cartão em aberto</span>
                    <span className="numero text-negativo">−{formatarMoeda(faturaTotal)}</span>
                  </div>
                )}
                {panorama.dividas.totalCentavos > 0 && (
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-[color:var(--texto-2)]">Dívidas em aberto</span>
                    <span className="numero text-negativo">
                      −{formatarMoeda(panorama.dividas.totalCentavos)}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-pauta pt-3">
                <span className="text-[14px] font-medium">Sobra de verdade</span>
                <Valor tom={patrimonioLiquido < 0 ? "negativo" : "neutro"} tamanho="cartao">
                  {formatarMoeda(patrimonioLiquido)}
                </Valor>
              </div>

              <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--texto-2)]">
                {patrimonioLiquido < 0
                  ? "Você deve mais do que tem em conta. Quitar o juro mais caro vem antes de qualquer aporte."
                  : "É com este número que dá para contar depois de pagar tudo que já está devido."}
              </p>
            </div>
          )}
        </Cartao>

        <Cartao titulo="Mês corrente">
          <div className="grid grid-cols-2 gap-3">
            <Metrica rotulo="Entrou" valor={formatarMoeda(panorama.mes.receitasCentavos)} tom="positivo" />
            <Metrica rotulo="Saiu" valor={formatarMoeda(panorama.mes.despesasCentavos)} tom="negativo" />
            <Metrica
              rotulo="Sobra do mês"
              valor={formatarMoeda(panorama.mes.sobraCentavos)}
              tom={panorama.mes.sobraCentavos >= 0 ? "positivo" : "negativo"}
            />
            <Metrica
              rotulo="Fatura em aberto"
              valor={formatarMoeda(faturaTotal)}
              tom={faturaTotal > 0 ? "atencao" : "neutro"}
            />
          </div>

          <div className="mt-4">
            {panorama.mes.despesasPorCategoria.length > 0 ? (
              <BarrasCategorias dados={panorama.mes.despesasPorCategoria} />
            ) : (
              <Vazio
                titulo="Nenhum gasto neste mês"
                texto="Anote pelo celular ou importe um extrato para o Tino começar a trabalhar."
              />
            )}
          </div>
        </Cartao>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Cartao
          titulo="Parcelamentos"
          acao={
            <Link href="/parcelamentos" className="text-xs text-acao hover:underline">
              ver todos
            </Link>
          }
        >
          <Valor tom="atencao" tamanho="cartao">
            {formatarMoeda(parcelamentos.restanteCentavos)}
          </Valor>
          <p className="mt-1 text-[13px] text-[color:var(--texto-2)]">
            restante em {parcelamentos.emAndamento} compras · {parcelamentos.percentualPago}% já pago
          </p>
          <div className="mt-3">
            <Barra percentual={parcelamentos.percentualPago} tom="verde" />
          </div>
          {parcelamentos.ultimaCompetencia && (
            <p className="mt-3 text-[13px] text-[color:var(--texto-2)]">
              Última parcela em {rotuloCompetencia(parcelamentos.ultimaCompetencia)}.
            </p>
          )}
        </Cartao>

        <Cartao titulo="Próximos meses comprometidos">
          <div className="space-y-2">
            {compromissos.map((linha) => (
              <div key={linha.competencia} className="flex items-center justify-between text-sm">
                <span className="text-muted-fg">{rotuloCompetencia(linha.competencia, true)}</span>
                <span>{formatarMoeda(linha.totalCentavos)}</span>
              </div>
            ))}
            {compromissos.length === 0 && <Vazio titulo="Nenhuma parcela futura" />}
          </div>
        </Cartao>

        <Cartao titulo="Reserva de emergência">
          <Valor tamanho="cartao">{formatarMoeda(panorama.reserva.atualCentavos)}</Valor>
          <p className="mt-1 text-[13px] text-[color:var(--texto-2)]">
            de {formatarMoeda(panorama.reserva.idealCentavos)} — cobre {panorama.reserva.mesesDeFolga} mês(es)
          </p>
          <div className="mt-3">
            <Barra percentual={panorama.reserva.percentual} />
          </div>
        </Cartao>
      </div>

      {panorama.mes.despesasCentavos > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Cartao titulo="Quando o dinheiro sai">
            <MapaDeCalor
              dias={panorama.mes.gastosPorDia}
              mediaDiariaCentavos={panorama.mes.mediaDiariaCentavos}
              maiorGasto={panorama.mes.maiorGastoDoDia}
            />
          </Cartao>

          <Cartao titulo="Categorias vs. mês passado">
            <CategoriasComparadas linhas={panorama.mes.despesasPorCategoria} limite={6} />
          </Cartao>
        </div>
      )}

      {panorama.historico.some((mes) => mes.receitasCentavos > 0 || mes.despesasCentavos > 0) && (
        <Cartao titulo="Entrou e saiu, mês a mês">
          <GraficoEvolucao dados={panorama.historico} />
        </Cartao>
      )}

      {compromissos.length > 0 && (
        <Cartao titulo="Parcelas que já estão comprometidas">
          <GraficoParcelas dados={compromissos} />
          <p className="mt-2 text-[12px] text-muted-fg">
            Esse valor sai de cada mês antes de qualquer gasto novo.
          </p>
        </Cartao>
      )}

      <Cartao
        titulo="O que o Tino faria agora"
        acao={
          <Link href="/plano" className="flex items-center gap-1 text-xs text-acao hover:underline">
            abrir plano <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        {/* Numerado porque a ordem É a informação: tirar a conta do negativo
            antes de qualquer aporte não é preferência, é o que sai mais caro
            se for feito na ordem errada. Numeração em lista que não é
            sequência seria só enfeite, e aqui não é o caso. */}
        {passos.length > 0 ? (
          <ol className="space-y-3.5">
            {passos.map((passo, indice) => (
              <li key={indice} className="flex gap-3 text-[14px] leading-relaxed">
                {/* Número sem círculo atrás, medido no protótipo. O círculo
                    fazia o marcador pesar mais que o próprio passo, e aqui
                    quem manda é a frase. */}
                <span className="mt-0.5 w-4 shrink-0 text-[12px] font-semibold text-accent-foreground">
                  {indice + 1}
                </span>
                <span className="min-w-0 flex-1">{passo}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[14px] leading-relaxed text-[color:var(--texto-2)]">
            Contas em ordem. A sobra do mês pode ir para a reserva ou para as metas.
          </p>
        )}
      </Cartao>
    </div>
  )
}

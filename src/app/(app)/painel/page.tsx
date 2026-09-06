import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { sessaoDaPagina } from "@/lib/pagina"
import { competenciaAtual, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { montarPanorama } from "@/lib/tino/panorama"
import { compromissosFuturos, resumoParcelamentos } from "@/lib/parcelamentos"
import { Barra, Cartao, Metrica, Vazio } from "@/components/ui/painel"
import { GraficoCategorias, GraficoEvolucao, GraficoParcelas } from "@/components/graficos"
import { MapaDeCalor } from "@/components/mapa-de-calor"
import { CategoriasComparadas } from "@/components/categorias-comparadas"
import { TinoAcompanha } from "@/components/tino-acompanha"

export const dynamic = "force-dynamic"

export default async function Painel() {
  const sessao = await sessaoDaPagina()
  const competencia = competenciaAtual()

  const [panorama, parcelamentos, compromissos] = await Promise.all([
    montarPanorama(sessao.larId, competencia),
    resumoParcelamentos(sessao.larId),
    compromissosFuturos(sessao.larId, 6),
  ])

  const contasLiquidas = panorama.saldoPorConta.filter((conta) => conta.tipo !== "CARTAO_CREDITO")
  const cartoes = panorama.saldoPorConta.filter((conta) => conta.tipo === "CARTAO_CREDITO")
  const faturaTotal = cartoes.reduce((soma, cartao) => soma + Math.abs(Math.min(0, cartao.saldoCentavos)), 0)
  const negativo = panorama.projecao.find((linha) => linha.negativo)

  return (
    <div className="space-y-4">
      {/* O Tino abre a tela porque o que exige decisão vem antes do que só
          informa. Saldo bonito com fatura estourando é meia verdade. */}
      <TinoAcompanha />

      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao titulo={`Saldo em ${rotuloCompetencia(competencia)}`}>
          <p
            className={`numero text-4xl font-bold ${
              panorama.saldoTotalCentavos < 0 ? "text-negativo" : "text-positivo"
            }`}
          >
            {formatarMoeda(panorama.saldoTotalCentavos)}
          </p>
          <p className="mt-1 text-sm text-muted-fg">
            {panorama.saldoTotalCentavos < 0
              ? "Suas contas estão no vermelho — isso é cheque especial, a dívida mais cara que existe."
              : "Somando contas correntes, poupança e dinheiro. Cartão não entra: limite não é seu."}
          </p>

          <div className="mt-4 space-y-2">
            {contasLiquidas.map((conta) => (
              <div key={conta.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-fg">{conta.nome}</span>
                <span className={conta.saldoCentavos < 0 ? "text-negativo" : ""}>
                  {formatarMoeda(conta.saldoCentavos)}
                </span>
              </div>
            ))}
            {contasLiquidas.length === 0 && <Vazio titulo="Nenhuma conta cadastrada ainda." />}
          </div>
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
              <GraficoCategorias dados={panorama.mes.despesasPorCategoria} />
            ) : (
              <Vazio
                titulo="Nenhum gasto neste mês"
                texto="Anote pelo celular ou importe um extrato para o Tino começar a trabalhar."
              />
            )}
          </div>
        </Cartao>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Cartao
          titulo="Parcelamentos"
          acao={
            <Link href="/parcelamentos" className="text-xs text-acao hover:underline">
              ver todos
            </Link>
          }
        >
          <p className="text-3xl font-semibold tracking-tight text-atencao">
            {formatarMoeda(parcelamentos.restanteCentavos)}
          </p>
          <p className="mt-1 text-[12px] text-muted-fg">
            restante em {parcelamentos.emAndamento} compras · {parcelamentos.percentualPago}% já pago
          </p>
          <div className="mt-3">
            <Barra percentual={parcelamentos.percentualPago} tom="verde" />
          </div>
          {parcelamentos.ultimaCompetencia && (
            <p className="mt-3 text-[12px] text-muted-fg">
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
          <p className="text-3xl font-semibold tracking-tight">{formatarMoeda(panorama.reserva.atualCentavos)}</p>
          <p className="mt-1 text-[12px] text-muted-fg">
            de {formatarMoeda(panorama.reserva.idealCentavos)} — cobre {panorama.reserva.mesesDeFolga} mês(es)
          </p>
          <div className="mt-3">
            <Barra percentual={panorama.reserva.percentual} />
          </div>
        </Cartao>
      </div>

      {panorama.mes.despesasCentavos > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
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
        <ul className="space-y-2 text-sm">
          {panorama.saldoTotalCentavos < 0 && (
            <li>
              Tirar a conta do negativo é a prioridade número um: o cheque especial cobra até 8% ao mês, mais que
              qualquer outra dívida sua.
            </li>
          )}
          {negativo && (
            <li>
              No ritmo atual, o caixa fica negativo em {rotuloCompetencia(negativo.competencia)}
              {" "}({formatarMoeda(negativo.saldoAcumuladoCentavos)}).
            </li>
          )}
          {parcelamentos.maiorMensalCentavos > 0 && (
            <li>
              O mês mais pesado à frente leva {formatarMoeda(parcelamentos.maiorMensalCentavos)} só em parcelas já
              compradas — esse valor já está comprometido antes de qualquer gasto novo.
            </li>
          )}
          {panorama.mes.naoCategorizadas > 0 && (
            <li>
              {panorama.mes.naoCategorizadas} lançamento(s) sem categoria. Corrigir uma vez ensina o Tino para
              sempre.
            </li>
          )}
          {panorama.saldoTotalCentavos >= 0 && !negativo && parcelamentos.restanteCentavos === 0 && (
            <li>Contas em ordem. A sobra do mês pode ir para a reserva ou para as metas.</li>
          )}
        </ul>
      </Cartao>
    </div>
  )
}

import { sessaoDaPagina } from "@/lib/pagina"
import { competenciaAtual, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { montarPanorama } from "@/lib/tino/panorama"
import { compromissosFuturos } from "@/lib/parcelamentos"
import { Cartao, Metrica } from "@/components/ui/painel"
import { GraficoFluxo } from "@/components/graficos"

export const dynamic = "force-dynamic"

export default async function Projecao() {
  const sessao = await sessaoDaPagina()
  const competencia = competenciaAtual()

  const [panorama, compromissos] = await Promise.all([
    montarPanorama(sessao.larId, competencia),
    compromissosFuturos(sessao.larId, 12),
  ])

  const parcelasDe = (mes: string) =>
    compromissos.find((linha) => linha.competencia === mes)?.totalCentavos ?? 0

  // A projeção da biblioteca já soma custo fixo e média variável. As parcelas
  // entram por fora, mês a mês, porque não são um valor constante.
  const linhas = panorama.projecao.map((linha) => {
    const parcelas = parcelasDe(linha.competencia)
    return { ...linha, parcelasCentavos: parcelas, saldoComParcelas: linha.saldoMesCentavos - parcelas }
  })

  let acumulado = panorama.saldoTotalCentavos
  const comAcumulado = linhas.map((linha) => {
    acumulado += linha.saldoComParcelas
    return { ...linha, acumuladoCentavos: acumulado }
  })

  const primeiroNegativo = comAcumulado.find((linha) => linha.acumuladoCentavos < 0)
  const maiorSaida = Math.max(...comAcumulado.map((linha) => linha.despesasCentavos + linha.parcelasCentavos), 1)

  return (
    <div className="space-y-4">
      <Cartao titulo="Projeção de 12 meses">
        <div className="grid gap-3 sm:grid-cols-4">
          <Metrica
            rotulo="Saldo hoje"
            valor={formatarMoeda(panorama.saldoTotalCentavos)}
            tom={panorama.saldoTotalCentavos < 0 ? "negativo" : "positivo"}
          />
          <Metrica rotulo="Receita média" valor={formatarMoeda(panorama.medias.receitaCentavos)} />
          <Metrica rotulo="Despesa média" valor={formatarMoeda(panorama.medias.despesaCentavos)} />
          <Metrica
            rotulo="Fecha o ano em"
            valor={formatarMoeda(comAcumulado[comAcumulado.length - 1]?.acumuladoCentavos ?? 0)}
            tom={(comAcumulado[comAcumulado.length - 1]?.acumuladoCentavos ?? 0) < 0 ? "negativo" : "positivo"}
          />
        </div>

        {primeiroNegativo && (
          <p className="mt-4 rounded-2xl border border-negativo/40 bg-negativo/10 p-3 text-sm text-negativo">
            No ritmo atual, o caixa fica negativo em {rotuloCompetencia(primeiroNegativo.competencia)} (
            {formatarMoeda(primeiroNegativo.acumuladoCentavos)}). Ainda dá tempo de mudar isso cortando gasto ou
            adiando compra parcelada.
          </p>
        )}

        <p className="mt-4 text-[12px] text-muted-fg">
          Cenário de tudo seguir como está: receita e despesa pela sua média, mais as parcelas já contratadas. Não
          prevê imprevisto nem aumento de renda.
        </p>
      </Cartao>

      <Cartao titulo="Saldo projetado">
        <GraficoFluxo
          dados={comAcumulado.map((linha) => ({
            competencia: linha.competencia,
            saldoAcumuladoCentavos: linha.acumuladoCentavos,
          }))}
        />
      </Cartao>

      <Cartao titulo="Mês a mês">
        <div className="space-y-3">
          {comAcumulado.map((linha) => (
            <div key={linha.competencia} className="rounded-[var(--raio-cartao)] border border-pauta p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{rotuloCompetencia(linha.competencia)}</span>
                <span
                  className={`text-sm font-semibold ${
                    linha.acumuladoCentavos < 0 ? "text-negativo" : "text-positivo"
                  }`}
                >
                  {formatarMoeda(linha.acumuladoCentavos)}
                </span>
              </div>

              <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-papel-2">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${(linha.receitasCentavos / maiorSaida) * 50}%` }}
                />
                <div
                  className="h-full bg-negativo/70"
                  style={{ width: `${(linha.despesasCentavos / maiorSaida) * 50}%` }}
                />
                <div
                  className="h-full bg-atencao/70"
                  style={{ width: `${(linha.parcelasCentavos / maiorSaida) * 50}%` }}
                />
              </div>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-fg">
                <span>entra {formatarMoeda(linha.receitasCentavos)}</span>
                <span>sai {formatarMoeda(linha.despesasCentavos)}</span>
                {linha.parcelasCentavos > 0 && <span>parcelas {formatarMoeda(linha.parcelasCentavos)}</span>}
                <span className={linha.saldoComParcelas < 0 ? "text-negativo" : "text-positivo"}>
                  resultado {formatarMoeda(linha.saldoComParcelas)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Cartao>
    </div>
  )
}

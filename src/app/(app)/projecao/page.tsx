import { cn } from "@/lib/utils"
import estilos from "../analise/avancadas.module.css"
import { sessaoDaPagina } from "@/lib/pagina"
import { competenciaAtual, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { montarPanorama } from "@/lib/tino/panorama"
import { compromissosFuturos } from "@/lib/parcelamentos"
import { Cartao, Metrica } from "@/components/ui/painel"
import { projetarComParcelas } from "@/lib/projecao-com-parcelas"
import { FluxoDeCaixaNoTempo } from "@/components/graficos"
import { montarFluxoDeCaixa } from "@/lib/fluxo-caixa"

export const dynamic = "force-dynamic"

export default async function Projecao() {
  const sessao = await sessaoDaPagina()
  const competencia = competenciaAtual()

  const [panorama, compromissos] = await Promise.all([
    montarPanorama(sessao.larId, competencia),
    compromissosFuturos(sessao.larId, 12),
  ])

  const comAcumulado = projetarComParcelas(panorama, compromissos)
  const fluxo = await montarFluxoDeCaixa(sessao.larId, panorama.saldoTotalCentavos, comAcumulado)

  const primeiroNegativo = comAcumulado.find((linha) => linha.acumuladoCentavos < 0)
  const maiorSaida = Math.max(...comAcumulado.map((linha) => linha.despesasCentavos + linha.parcelasCentavos), 1)

  return (
    <div className={cn(estilos.pagina, "space-y-4")}>
      <Cartao titulo="Projeção de 12 meses">
        <div className="grade-valores">
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
            <span className="valor-inteiro">{formatarMoeda(primeiroNegativo.acumuladoCentavos)}</span>). Ainda dá tempo de mudar isso cortando gasto ou
            adiando compra parcelada.
          </p>
        )}

        <p className="mt-4 text-[calc(12px*var(--escala-letra))] text-muted-fg">
          Cenário de tudo seguir como está: receita e despesa pela sua média, mais as parcelas já contratadas. Não
          prevê imprevisto nem aumento de renda.
        </p>
      </Cartao>

      {/* Mesmo grafico do inicio, com a janela maior: quem clica em "Ver
          projecao" quer o mesmo desenho que viu no painel, nao outro. Aqui ele
          vem com 300px de altura porque a tela e dedicada a isso. */}
      <Cartao titulo="Quando o caixa fica assim">
        <FluxoDeCaixaNoTempo series={fluxo} altura={300} />
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
                  <span className="valor-inteiro">{formatarMoeda(linha.acumuladoCentavos)}</span>
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

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[calc(12px*var(--escala-letra))] text-muted-fg">
                <span>entra <span className="valor-inteiro">{formatarMoeda(linha.receitasCentavos)}</span></span>
                <span>sai <span className="valor-inteiro">{formatarMoeda(linha.despesasCentavos)}</span></span>
                {linha.parcelasCentavos > 0 && <span>parcelas <span className="valor-inteiro">{formatarMoeda(linha.parcelasCentavos)}</span></span>}
                <span className={linha.saldoComParcelas < 0 ? "text-negativo" : "text-positivo"}>
                  resultado <span className="valor-inteiro">{formatarMoeda(linha.saldoComParcelas)}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </Cartao>
    </div>
  )
}

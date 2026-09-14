import { cn } from "@/lib/utils"
import avancadas from "../analise/avancadas.module.css"
import estilos from "./projecao.module.css"
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
    <div className={cn(avancadas.pagina, "space-y-4")}>
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
        <ul className={estilos.meses}>
          {comAcumulado.map((linha) => {
            const saiTotal = linha.despesasCentavos + linha.parcelasCentavos
            const base = Math.max(1, linha.receitasCentavos, saiTotal)
            return (
              <li key={linha.competencia} className={estilos.mes} data-negativo={linha.acumuladoCentavos < 0}>
                <div className={estilos.mesCabecalho}>
                  <span className={estilos.mesNome}>{rotuloCompetencia(linha.competencia)}</span>
                  <span className={estilos.mesSaldo}>
                    {formatarMoeda(linha.acumuladoCentavos)}
                    <small>no fim do mês</small>
                  </span>
                </div>
                {/* Duas barras espelhadas na mesma escala: entra em cima, sai
                    embaixo. A barra tricolor anterior somava receita, despesa e
                    parcela na mesma linha, então o comprimento não significava
                    nada — não dava para ver qual lado era maior. */}
                <div className={estilos.balanca}>
                  <span className={estilos.entra}><i style={{ width: `${(linha.receitasCentavos / base) * 100}%` }} /></span>
                  <span className={estilos.sai}><i style={{ width: `${(saiTotal / base) * 100}%` }} /></span>
                </div>
                <div className={estilos.mesDetalhe}>
                  <span><b className="text-positivo">{formatarMoeda(linha.receitasCentavos)}</b> entra</span>
                  <span><b className="text-negativo">{formatarMoeda(saiTotal)}</b> sai{linha.parcelasCentavos > 0 ? `, com ${formatarMoeda(linha.parcelasCentavos)} de parcelas` : ""}</span>
                  <span className={linha.saldoComParcelas < 0 ? "text-negativo" : "text-positivo"}>
                    {linha.saldoComParcelas < 0 ? "falta " : "sobra "}<b>{formatarMoeda(Math.abs(linha.saldoComParcelas))}</b> no mês
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </Cartao>
    </div>
  )
}

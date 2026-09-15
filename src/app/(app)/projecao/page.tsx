import Link from "next/link"
import { TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import avancadas from "../analise/avancadas.module.css"
import estilos from "./projecao.module.css"
import { sessaoDaPagina } from "@/lib/pagina"
import { competenciaAtual, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { montarPanorama } from "@/lib/tino/panorama"
import { compromissosFuturos } from "@/lib/parcelamentos"
import { Cartao, Metrica } from "@/components/ui/painel"
import { Abertura } from "@/components/abertura"
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

  const fechaAno = comAcumulado[comAcumulado.length - 1]?.acumuladoCentavos ?? 0
  const primeiroNegativo = comAcumulado.find((linha) => linha.acumuladoCentavos < 0)
  const maiorSaida = Math.max(...comAcumulado.map((linha) => linha.despesasCentavos + linha.parcelasCentavos), 1)

  return (
    <div className={cn(avancadas.pagina, "space-y-4")}>
      {/* "Fecha o ano em" é a resposta da tela e estava do mesmo tamanho dos
          três insumos que a produzem. Ela subiu para a abertura; saldo, receita
          e despesa média continuam logo abaixo, no papel de explicar. */}
      <Abertura
        rotulo="Daqui a 12 meses"
        titulo={
          fechaAno >= 0 ? (
            <>No ritmo de hoje, você fecha o ano com <em>{formatarMoeda(fechaAno)}</em>.</>
          ) : (
            <>No ritmo de hoje, você fecha o ano <em>{formatarMoeda(Math.abs(fechaAno))} no vermelho</em>.</>
          )
        }
        apoio={<>Pela sua média, com as parcelas já contratadas.</>}
      />

      <Cartao titulo="O que sustenta essa conta">
        <div className="grade-valores">
          <Metrica
            rotulo="Saldo hoje"
            valor={formatarMoeda(panorama.saldoTotalCentavos)}
            tom={panorama.saldoTotalCentavos < 0 ? "negativo" : "positivo"}
          />
          <Metrica rotulo="Receita média" valor={formatarMoeda(panorama.medias.receitaCentavos)} />
          <Metrica rotulo="Despesa média" valor={formatarMoeda(panorama.medias.despesaCentavos)} />
        </div>

        {/* O aviso era um bloco de três linhas para dizer um mês e um valor, e
            embaixo dele vinha um parágrafo explicando a hipótese da projeção.
            Agora é uma faixa de vidro com o essencial e um caminho de saída —
            e a hipótese virou uma linha curta ao lado do título do cartão. */}
        {primeiroNegativo && (
          <Link
            href="/simulador"
            className="vidro-menu mt-3 flex items-center gap-3 rounded-2xl border-[color-mix(in_oklab,var(--negativo),transparent_60%)] bg-[linear-gradient(115deg,color-mix(in_oklab,var(--papel-2),var(--negativo)_14%),var(--papel-2)_72%)] px-4 py-3"
          >
            <TrendingDown className="size-5 shrink-0 text-negativo" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[calc(14px*var(--escala-letra))] font-semibold text-negativo">
                No vermelho em {rotuloCompetencia(primeiroNegativo.competencia, true)}
              </span>
              <span className="numero valor-inteiro block text-[calc(12px*var(--escala-letra))] text-muted-fg">
                {formatarMoeda(primeiroNegativo.acumuladoCentavos)}
              </span>
            </span>
            <span className="shrink-0 text-[calc(12px*var(--escala-letra))] text-acao">Simular saída</span>
          </Link>
        )}
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

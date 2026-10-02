import Link from "next/link"
import { ONDE_RESOLVER_INDICADOR } from "@/lib/tino/onde-resolver"
import estilos from "./avancadas.module.css"
import analise from "@/components/analise.module.css"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { sessaoDaPagina } from "@/lib/pagina"
import { competenciaAtual, competenciaMaisMeses, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { montarPanorama } from "@/lib/tino/panorama"
import { balancoMensal } from "@/lib/tino/balanco"
import { montarDiagnostico } from "@/lib/tino/diagnostico"
import { compromissosFuturos, resumoParcelamentos } from "@/lib/parcelamentos"
import { Cartao, Vazio } from "@/components/ui/painel"
import { GraficoBalanco, GraficoDozeMeses } from "@/components/graficos"
import { cn } from "@/lib/utils"
import { AbasInternas } from "@/components/abas-internas"
import { EntradasESaidas } from "@/components/entradas-saidas"
import { IndicadoresDaAnalise, TopoDaAnalise } from "@/components/indicadores-da-analise"
import { CategoriasDoMes } from "@/components/categorias-do-mes"

export const dynamic = "force-dynamic"

/// Cabeçalho de grupo do balanço: o nome contábil e, ao lado, o que ele
/// significa para quem não é contador.
const estiloGrupo =
  "flex items-baseline gap-2 pb-1 text-[max(10px,calc(12px*var(--escala-letra)))] font-semibold uppercase tracking-widest text-muted-fg [&>span]:text-[max(10px,calc(12px*var(--escala-letra)))] [&>span]:font-normal [&>span]:normal-case [&>span]:tracking-normal [&>span]:opacity-70"

const NOME_GRUPO: Record<string, string> = {
  MORADIA: "Moradia",
  ALIMENTACAO: "Alimentação",
  TRANSPORTE: "Transporte",
  SAUDE: "Saúde",
  EDUCACAO: "Educação",
  LAZER: "Lazer",
  PESSOAL: "Pessoal",
  SERVICOS: "Serviços",
  DIVIDAS: "Dívidas",
  IMPOSTOS: "Impostos",
  INVESTIMENTO: "Investimento",
  RENDA: "Renda",
  NEGOCIO_MEI: "Negócio (MEI)",
  OUTROS: "Outros",
}

export default async function Analise() {
  const sessao = await sessaoDaPagina()
  const competencia = competenciaAtual()

  const [panorama, compromissos, parcelamentos, mensal] = await Promise.all([
    montarPanorama(sessao.larId, competencia),
    compromissosFuturos(sessao.larId, 36),
    resumoParcelamentos(sessao.larId),
    balancoMensal(sessao.larId, 12),
  ])

  const diagnostico = montarDiagnostico(panorama, {
    compromissos,
    parcelamentosRestanteCentavos: parcelamentos.restanteCentavos,
  })

  const { dre, balanco } = diagnostico
  const nomeDoMes = rotuloCompetencia(competencia).split(" ")[0]
  const semMovimento = dre.receitasCentavos === 0 && dre.despesasCentavos === 0

  if (semMovimento) {
    return (
      <Cartao titulo="Análise">
        <Vazio
          titulo="Ainda não há movimento para analisar"
          texto="Anote alguns gastos ou importe um extrato. Com um mês de dados eu monto o parecer completo."
        />
      </Cartao>
    )
  }

  return (
    <div className={cn(estilos.pagina, analise.pagina)}>
      {/* Opção C do canvas (Davi, 28/09): o que pede atenção primeiro. O
          parecer antigo abria com o resultado do mês, que a aba Entradas e
          saídas já mostra; aqui o topo diz quantos indicadores pedem ação e
          qual é o primeiro passo. */}
      <TopoDaAnalise diagnostico={diagnostico} mes={nomeDoMes} />

      <AbasInternas abas={[{ chave: "indicadores", titulo: "Indicadores", conteudo: (<>
      <IndicadoresDaAnalise indicadores={diagnostico.indicadores} />
      </>) }, { chave: "entradas", titulo: "Entradas e saídas", conteudo: (<>
      {/* ── A renda numa barra ─────────────────────────── */}
      <EntradasESaidas
        mes={rotuloCompetencia(competencia)}
        receitasCentavos={dre.receitasCentavos}
        despesasCentavos={dre.despesasCentavos}
        grupos={dre.grupos.map((grupo) => ({
          grupo: grupo.grupo,
          nome: NOME_GRUPO[grupo.grupo] ?? grupo.grupo,
          totalCentavos: grupo.totalCentavos,
          percentualDaReceita: grupo.percentualDaReceita,
        }))}
        custoFixoCentavos={dre.custoFixoCentavos}
        custoVariavelCentavos={dre.custoVariavelCentavos}
        patrimonio={{
          liquidoCentavos: balanco.patrimonioLiquidoCentavos,
          temCentavos: balanco.ativoTotalCentavos,
          deveCentavos: balanco.passivoTotalCentavos,
        }}
      >
        {/* ── Balanço ─────────────────────────────────── */}
        <div className="space-y-1">
          <p className={estiloGrupo}>Ativo <span>o que você tem</span></p>
          {/* Aberto conta a conta e dívida a dívida, como um contador
              entregaria: dois totais escondem justamente o que serve para
              agir — qual conta está no vermelho e qual dívida é a cara. */}
          {balanco.ativoCirculante.map((linha) => (
            <Linha key={`ac-${linha.rotulo}`} rotulo={linha.rotulo} apoio={linha.apoio} valor={linha.valorCentavos} />
          ))}
          {balanco.ativoAplicado.map((linha) => (
            <Linha key={`aa-${linha.rotulo}`} rotulo={linha.rotulo} apoio={linha.apoio} valor={linha.valorCentavos} />
          ))}
          <Linha rotulo="Total do ativo" valor={balanco.ativoTotalCentavos} forte soma />

          <p className={cn(estiloGrupo, "mt-4")}>Passivo <span>o que você deve</span></p>
          {balanco.passivoCurto.map((linha) => (
            <Linha key={`pc-${linha.rotulo}`} rotulo={linha.rotulo} apoio={linha.apoio} valor={-linha.valorCentavos} tom="negativo" />
          ))}
          {balanco.passivoLongo.map((linha) => (
            <Linha key={`pl-${linha.rotulo}`} rotulo={linha.rotulo} apoio={linha.apoio} valor={-linha.valorCentavos} tom="negativo" />
          ))}
          {balanco.passivoTotalCentavos === 0 && <Linha rotulo="Sem dívidas" valor={0} />}
          <Linha rotulo="Total do passivo" valor={-balanco.passivoTotalCentavos} tom="negativo" forte soma />

          <Linha
            fechamento
            rotulo="Patrimônio líquido"
            valor={balanco.patrimonioLiquidoCentavos}
            tom={balanco.patrimonioLiquidoCentavos >= 0 ? "positivo" : "negativo"}
            forte
          />
        </div>

        {/* A série de doze meses fica ao lado do balanço, e não num cartão
            próprio: é o mesmo patrimônio visto no tempo, e quem abriu o
            detalhe é quem quer vê-la. */}
        {mensal.serie.length > 1 && (
          <div className="min-w-0">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <p className="text-[calc(13px*var(--escala-letra))] font-medium">Como andou nos últimos meses</p>
              <p
                className={`numero inline-flex items-center gap-0.5 text-[calc(13px*var(--escala-letra))] ${
                  mensal.variacaoCentavos >= 0 ? "text-positivo" : "text-negativo"
                }`}
              >
                {mensal.variacaoCentavos >= 0 ? (
                  <ArrowUpRight aria-hidden className="size-3.5 shrink-0" strokeWidth={2.5} />
                ) : (
                  <ArrowDownRight aria-hidden className="size-3.5 shrink-0" strokeWidth={2.5} />
                )}
                <span className="valor-inteiro">{formatarMoeda(mensal.variacaoCentavos)}</span>
              </p>
            </div>

            <GraficoBalanco dados={mensal.serie} />

            <p className="mt-3 text-[calc(12px*var(--escala-letra))] leading-relaxed text-muted-fg">
              A série usa saldo em conta e parcelamentos, que têm data em cada lançamento. Fica de fora{" "}
              {mensal.foraDaSerie.join(", ")}, porque esses só têm o valor de hoje no banco, e repeti-lo para trás faria o
              gráfico mostrar uma melhora que não houve.
            </p>
          </div>
        )}
      </EntradasESaidas>

      {/* Sem risco nem ponto forte, o cartão ficava só com o título. */}
      {(diagnostico.riscos.length > 0 || diagnostico.pontosFortes.length > 0) && (
      <div className={analise.leituraObjetiva}>
        {[{ titulo: "Pede atenção", faixas: ["ATENCAO", "CRITICO"], textos: diagnostico.riscos }, { titulo: "Pontos fortes", faixas: ["BOM"], textos: diagnostico.pontosFortes }].filter((grupo) => grupo.textos.length > 0).map((grupo) => <section key={grupo.titulo} className={analise.bloco}>
          <h2>{grupo.titulo}</h2>
          <ul>{diagnostico.indicadores.filter((indicador) => grupo.faixas.includes(indicador.faixa)).map((indicador) => <li key={indicador.chave} data-faixa={indicador.faixa}>
                        <div className={analise.indicadorCabecalho}><span>{indicador.nome}</span><b className="valor-sensivel">{indicador.valor}</b></div>
                        {indicador.escala && <><div className={analise.medidaObjetiva}><span style={{ width: `${Math.max(0, Math.min(100, indicador.numero / indicador.escala.maximo * 100))}%` }} /><i style={{ left: `${indicador.escala.bom / indicador.escala.maximo * 100}%` }} /></div><small>{indicador.escala.menorMelhor ? "Até" : "Meta"} {indicador.chave === "liquidez" ? `${indicador.escala.bom} meses` : `${indicador.escala.bom / 100}%`}</small></>}
                        {ONDE_RESOLVER_INDICADOR[indicador.chave] && <Link href={ONDE_RESOLVER_INDICADOR[indicador.chave].href}>{ONDE_RESOLVER_INDICADOR[indicador.chave].texto} →</Link>}
                      </li>)}</ul>
          <details><summary>Entender a leitura</summary>{grupo.textos.map((texto) => <p key={texto}>{texto}</p>)}</details>
        </section>)}
      </div>
      )}

      {/* ── Gráficos ──────────────────────────────────── */}
      <Cartao titulo="Como cada mês fechou">
        <GraficoDozeMeses dados={panorama.historico} competenciaDestacada={competencia} />
        <p className="mt-3 text-[calc(13px*var(--escala-letra))] leading-relaxed text-[color:var(--texto-2)]">
          Barra para cima é mês que sobrou; para baixo, mês que faltou. O mês atual vai cheio e os anteriores em
          meio-tom, porque ele ainda não terminou: comparar mês pela metade com mês fechado engana.
        </p>
      </Cartao>

      {/* ── Categorias ──────────────────────────────────── */}
      </>) }, { chave: "categorias", titulo: "Categorias", conteudo: (<>
      <CategoriasDoMes
        linhas={panorama.mes.despesasPorCategoria}
        mesAnterior={rotuloCompetencia(competenciaMaisMeses(competencia, -1)).split(" ")[0]}
        dias={panorama.mes.gastosPorDia}
        maiorGasto={panorama.mes.maiorGastoDoDia}
        mediaDiariaCentavos={panorama.mes.mediaDiariaCentavos}
        hoje={Number(new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(8, 10))}
      />
      </>) }]} />
      <p className="px-1 text-[max(10px,calc(12px*var(--escala-letra)))] leading-relaxed text-muted-fg">
        Leitura dos seus lançamentos. Não é recomendação nem substitui contador.
      </p>
    </div>
  )
}

function Linha({
  rotulo,
  valor,
  apoio,
  tom = "neutro",
  forte,
  soma,
  fechamento,
}: {
  rotulo: string
  valor: number
  apoio?: string
  tom?: "neutro" | "positivo" | "negativo"
  forte?: boolean
  /// Linha de total: fecha o grupo com um traço acima, como numa soma.
  soma?: boolean
  /// Resultado final: traço mais forte e mais respiro.
  fechamento?: boolean
}) {
  const cor = tom === "positivo" ? "text-positivo" : tom === "negativo" ? "text-negativo" : "text-foreground"

  return (
    <div
      className={cn(
        // Cada item tem seu fio, como num extrato de papel: sem ele, rótulo e
        // valor de linhas vizinhas se misturam quando o nome é longo.
        "flex items-baseline justify-between gap-3 border-t border-pauta/50 py-1.5",
        forte && "font-semibold",
        soma && "mt-0.5 border-t-2 border-t-pauta",
        fechamento && "mt-2 border-t-2 border-t-[color:var(--texto-3)] pt-2.5",
      )}
    >
      <span className={cn("min-w-0 text-[calc(13px*var(--escala-letra))]", !forte && "text-muted-fg")}>
        {rotulo}
        {apoio && <span className="ml-1.5 text-[max(10px,calc(12px*var(--escala-letra)))] opacity-60">{apoio}</span>}
      </span>
      <span className={cn("text-[calc(14px*var(--escala-letra))] tabular-nums", cor)}><span className="valor-inteiro">{formatarMoeda(valor)}</span></span>
    </div>
  )
}


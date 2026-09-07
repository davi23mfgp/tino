import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { sessaoDaPagina } from "@/lib/pagina"
import { competenciaAtual, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { montarPanorama } from "@/lib/tino/panorama"
import { balancoMensal } from "@/lib/tino/balanco"
import { montarDiagnostico, type Faixa } from "@/lib/tino/diagnostico"
import { compromissosFuturos, resumoParcelamentos } from "@/lib/parcelamentos"
import { Barra, Cartao, Metrica, Vazio } from "@/components/ui/painel"
import { GraficoAnel, GraficoBalanco, GraficoCategorias, GraficoDozeMeses } from "@/components/graficos"
import { MapaDeCalor } from "@/components/mapa-de-calor"
import { CategoriasComparadas } from "@/components/categorias-comparadas"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const COR_FAIXA: Record<Faixa, string> = {
  BOM: "text-positivo",
  ATENCAO: "text-atencao",
  CRITICO: "text-negativo",
  SEM_DADO: "text-muted-fg",
}

const ROTULO_FAIXA: Record<Faixa, string> = {
  BOM: "saudável",
  ATENCAO: "atenção",
  CRITICO: "crítico",
  SEM_DADO: "sem faixa",
}

const ROTULO_SITUACAO = {
  SAUDAVEL: { texto: "Saudável", tom: "text-positivo" },
  ATENCAO: { texto: "Atenção", tom: "text-atencao" },
  APERTADO: { texto: "Apertado", tom: "text-atencao" },
  CRITICO: { texto: "Crítico", tom: "text-negativo" },
}

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
  const situacao = ROTULO_SITUACAO[diagnostico.situacao]
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
    <div className="space-y-4">
      {/* ── Parecer ───────────────────────────────────── */}
      <Cartao titulo={`Parecer de ${rotuloCompetencia(competencia)}`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="w-full max-w-[160px] shrink-0">
            <GraficoAnel percentual={diagnostico.nota} rotulo="saúde" valor={String(diagnostico.nota)} />
          </div>

          <div className="min-w-0 flex-1">
            <p className={cn("text-[13px] font-medium uppercase tracking-widest", situacao.tom)}>{situacao.texto}</p>
            <p className="mt-2 text-[15px] leading-relaxed">{diagnostico.parecer}</p>
          </div>
        </div>
      </Cartao>

      {/* ── Indicadores ───────────────────────────────── */}
      <Cartao titulo="Indicadores">
        <div className="grid gap-3 lg:grid-cols-2">
          {diagnostico.indicadores.map((indicador) => (
            <div key={indicador.chave} className="rounded-[var(--raio-cartao)] border border-pauta bg-papel-2 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[13px] font-medium">{indicador.nome}</p>
                <div className="text-right">
                  <p className={cn("text-[20px] font-semibold leading-none", COR_FAIXA[indicador.faixa])}>
                    {indicador.valor}
                  </p>
                  <p className={cn("mt-1 text-[10px] uppercase tracking-widest", COR_FAIXA[indicador.faixa])}>
                    {ROTULO_FAIXA[indicador.faixa]}
                  </p>
                </div>
              </div>

              <p className="mt-2 text-[12px] leading-relaxed text-muted-fg">{indicador.leitura}</p>
              <p className="mt-1.5 text-[11px] text-muted-fg opacity-70">Referência: {indicador.referencia}</p>
            </div>
          ))}
        </div>
      </Cartao>

      {/* ── Prioridades ───────────────────────────────── */}
      <Cartao titulo="O que fazer, nesta ordem">
        <ol className="space-y-3">
          {diagnostico.prioridades.map((prioridade) => (
            <li key={prioridade.ordem} className="flex gap-3 rounded-[var(--raio-cartao)] border border-pauta p-3.5">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/[0.08] text-[12px] font-semibold">
                {prioridade.ordem}
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-medium">{prioridade.titulo}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-fg">{prioridade.porque}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed">{prioridade.acao}</p>
                {prioridade.impactoMensalCentavos ? (
                  <p className="mt-1.5 text-[12px] text-positivo">
                    Efeito estimado: {formatarMoeda(prioridade.impactoMensalCentavos)} por mês.
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </Cartao>

      {/* ── DRE ───────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao titulo="Demonstrativo do mês">
          <div className="space-y-1">
            <Linha rotulo="Receitas" valor={dre.receitasCentavos} tom="positivo" forte />
            <Linha rotulo="(–) Despesas" valor={-dre.despesasCentavos} tom="negativo" />

            <div className="my-2 border-t border-pauta" />

            <Linha
              rotulo="= Resultado do mês"
              valor={dre.resultadoCentavos}
              tom={dre.resultadoCentavos >= 0 ? "positivo" : "negativo"}
              forte
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metrica rotulo="Custo fixo" valor={formatarMoeda(dre.custoFixoCentavos)} detalhe="não muda com o uso" />
            <Metrica rotulo="Custo variável" valor={formatarMoeda(dre.custoVariavelCentavos)} detalhe="onde dá para mexer" />
            <Metrica rotulo="Essencial" valor={formatarMoeda(dre.essenciaisCentavos)} />
            <Metrica
              rotulo="Não essencial"
              valor={formatarMoeda(dre.supefluasCentavos)}
              tom={dre.supefluasCentavos > dre.essenciaisCentavos ? "atencao" : "neutro"}
            />
          </div>

          <div className="mt-4 space-y-2.5">
            {dre.grupos.map((grupo) => (
              <div key={grupo.grupo}>
                <div className="flex items-center justify-between text-[13px]">
                  <span>{NOME_GRUPO[grupo.grupo] ?? grupo.grupo}</span>
                  <span className="text-muted-fg">
                    {formatarMoeda(grupo.totalCentavos)}
                    {grupo.percentualDaReceita > 0 && ` · ${(grupo.percentualDaReceita / 100).toFixed(0)}% da renda`}
                  </span>
                </div>
                <div className="mt-1">
                  <Barra
                    percentual={(grupo.totalCentavos / Math.max(1, dre.despesasCentavos)) * 100}
                    tom="verde"
                  />
                </div>
              </div>
            ))}
          </div>
        </Cartao>

        {/* ── Balanço ─────────────────────────────────── */}
        <Cartao titulo="Balanço">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-widest text-muted-fg">Ativo</p>
            <Linha rotulo="Disponível em conta" valor={balanco.ativoCirculanteCentavos} />
            <Linha rotulo="Guardado em metas" valor={balanco.ativoAplicadoCentavos} />
            <Linha rotulo="Total" valor={balanco.ativoTotalCentavos} forte />

            <p className="pt-3 text-[11px] uppercase tracking-widest text-muted-fg">Passivo</p>
            <Linha rotulo="Curto prazo (até 12 meses)" valor={-balanco.passivoCurtoPrazoCentavos} tom="negativo" />
            <Linha rotulo="Longo prazo" valor={-balanco.passivoLongoPrazoCentavos} tom="negativo" />
            <Linha rotulo="Total" valor={-balanco.passivoTotalCentavos} tom="negativo" forte />

            <div className="my-2 border-t border-pauta" />

            <Linha
              rotulo="Patrimônio líquido"
              valor={balanco.patrimonioLiquidoCentavos}
              tom={balanco.patrimonioLiquidoCentavos >= 0 ? "positivo" : "negativo"}
              forte
            />
          </div>

          <p className="mt-3 text-[12px] leading-relaxed text-muted-fg">
            Patrimônio líquido é o número que diz se você avançou: dá para terminar o mês com mais dinheiro em conta e
            mesmo assim mais pobre, se a dívida cresceu mais que o saldo.
          </p>

          {mensal.serie.length > 1 && (
            <div className="mt-5 border-t border-pauta pt-4">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <p className="text-[13px] font-medium">Como andou nos últimos meses</p>
                <p
                  className={`numero inline-flex items-center gap-0.5 text-[13px] ${
                    mensal.variacaoCentavos >= 0 ? "text-positivo" : "text-negativo"
                  }`}
                >
                  {mensal.variacaoCentavos >= 0 ? (
                    <ArrowUpRight aria-hidden className="size-3.5 shrink-0" strokeWidth={2.5} />
                  ) : (
                    <ArrowDownRight aria-hidden className="size-3.5 shrink-0" strokeWidth={2.5} />
                  )}
                  {formatarMoeda(mensal.variacaoCentavos)}
                </p>
              </div>

              <GraficoBalanco dados={mensal.serie} />

              <p className="mt-3 text-[12px] leading-relaxed text-muted-fg">
                A série usa saldo em conta e parcelamentos, que têm data em cada lançamento. Fica de fora{" "}
                {mensal.foraDaSerie.join(", ")} — esses só têm o valor de hoje no banco, e repeti-lo para trás faria o
                gráfico mostrar uma melhora que não houve.
              </p>
            </div>
          )}

          {(diagnostico.riscos.length > 0 || diagnostico.pontosFortes.length > 0) && (
            <div className="mt-4 space-y-3">
              {diagnostico.riscos.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-negativo">Riscos</p>
                  <ul className="mt-1.5 space-y-1.5">
                    {diagnostico.riscos.map((risco) => (
                      <li key={risco} className="text-[12px] leading-relaxed text-muted-fg">
                        {risco}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {diagnostico.pontosFortes.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-positivo">Pontos fortes</p>
                  <ul className="mt-1.5 space-y-1.5">
                    {diagnostico.pontosFortes.map((ponto) => (
                      <li key={ponto} className="text-[12px] leading-relaxed text-muted-fg">
                        {ponto}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Cartao>
      </div>

      {/* ── Gráficos ──────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao titulo="Para onde foi o dinheiro">
          {panorama.mes.despesasPorCategoria.length > 0 ? (
            <GraficoCategorias dados={panorama.mes.despesasPorCategoria} />
          ) : (
            <Vazio titulo="Sem gastos classificados no mês" />
          )}
        </Cartao>

        <Cartao titulo="Como cada mês fechou">
          <GraficoDozeMeses dados={panorama.historico} competenciaDestacada={competencia} />
          <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--texto-2)]">
            Barra para cima é mês que sobrou; para baixo, mês que faltou. O mês atual vai cheio e os anteriores em
            meio-tom, porque ele ainda não terminou — comparar mês pela metade com mês fechado engana.
          </p>
        </Cartao>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao titulo="Quando o dinheiro sai">
          <MapaDeCalor
            dias={panorama.mes.gastosPorDia}
            mediaDiariaCentavos={panorama.mes.mediaDiariaCentavos}
            maiorGasto={panorama.mes.maiorGastoDoDia}
          />
        </Cartao>

        <Cartao titulo="O que mudou desde o mês passado">
          <CategoriasComparadas linhas={panorama.mes.despesasPorCategoria} limite={10} />
        </Cartao>
      </div>

      <p className="px-1 text-[11px] leading-relaxed text-muted-fg">
        Este parecer lê os seus próprios lançamentos contra faixas de referência de mercado. Não é recomendação de
        investimento nem substitui contador para questão tributária.
      </p>
    </div>
  )
}

function Linha({
  rotulo,
  valor,
  tom = "neutro",
  forte,
}: {
  rotulo: string
  valor: number
  tom?: "neutro" | "positivo" | "negativo"
  forte?: boolean
}) {
  const cor = tom === "positivo" ? "text-positivo" : tom === "negativo" ? "text-negativo" : "text-foreground"

  return (
    <div className={cn("flex items-baseline justify-between gap-3 py-1", forte && "font-semibold")}>
      <span className={cn("text-[13px]", !forte && "text-muted-fg")}>{rotulo}</span>
      <span className={cn("text-[14px] tabular-nums", cor)}>{formatarMoeda(valor)}</span>
    </div>
  )
}

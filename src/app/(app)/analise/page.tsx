import estilos from "./avancadas.module.css"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { sessaoDaPagina } from "@/lib/pagina"
import { competenciaAtual, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { montarPanorama } from "@/lib/tino/panorama"
import { balancoMensal } from "@/lib/tino/balanco"
import { montarDiagnostico, type Faixa } from "@/lib/tino/diagnostico"
import { compromissosFuturos, resumoParcelamentos } from "@/lib/parcelamentos"
import { Barra, Cartao, Detalhe, Metrica, Pilula, Vazio } from "@/components/ui/painel"
import { Abertura } from "@/components/abertura"
import { ONDE_RESOLVER, ONDE_RESOLVER_INDICADOR } from "@/lib/tino/onde-resolver"
import Link from "next/link"
import { GraficoBalanco, GraficoCategorias, GraficoDozeMeses } from "@/components/graficos"
import { MapaDeCalor } from "@/components/mapa-de-calor"
import { CategoriasComparadas } from "@/components/categorias-comparadas"
import { cn } from "@/lib/utils"
import { AbasInternas } from "@/components/abas-internas"
import { ReguaDoIndicador } from "@/components/regua-do-indicador"

export const dynamic = "force-dynamic"

const COR_FAIXA: Record<Faixa, string> = {
  BOM: "text-positivo",
  ATENCAO: "text-atencao",
  CRITICO: "text-negativo",
  SEM_DADO: "text-muted-fg",
}

/// Cabeçalho de grupo do balanço: o nome contábil e, ao lado, o que ele
/// significa para quem não é contador.
const estiloGrupo =
  "flex items-baseline gap-2 pb-1 text-[calc(11px*var(--escala-letra))] font-semibold uppercase tracking-widest text-muted-fg [&>span]:text-[calc(10px*var(--escala-letra))] [&>span]:font-normal [&>span]:normal-case [&>span]:tracking-normal [&>span]:opacity-70"

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
    <div className={cn(estilos.pagina, "space-y-4")}>
      {/* ── Parecer ───────────────────────────────────── */}
      {/* A resposta primeiro. Os quatro tiles de peso igual (entrou, saiu,
          resultado, patrimônio) eram insumo: com todos do mesmo tamanho,
          nenhum respondia nada. Eles continuam na tela, recolhidos. */}
      <Abertura
        rotulo={`Parecer de ${rotuloCompetencia(competencia)}`}
        titulo={
          dre.resultadoCentavos >= 0 ? (
            <>Você fechou o mês com <em>{formatarMoeda(dre.resultadoCentavos)}</em> de sobra.</>
          ) : (
            <>Você fechou o mês <em>{formatarMoeda(Math.abs(dre.resultadoCentavos))} no vermelho</em>.</>
          )
        }
        apoio={<>Situação geral: <b>{situacao.texto}</b>, nota {diagnostico.nota} de 100.</>}
      >
        <Detalhe titulo="Os números do mês">
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { rotulo: "Entrou", valor: dre.receitasCentavos, tom: "text-positivo" },
              { rotulo: "Saiu", valor: dre.despesasCentavos, tom: "text-negativo" },
              { rotulo: "Resultado", valor: dre.resultadoCentavos, tom: dre.resultadoCentavos < 0 ? "text-negativo" : "" },
              { rotulo: "Patrimônio", valor: balanco.patrimonioLiquidoCentavos, tom: balanco.patrimonioLiquidoCentavos < 0 ? "text-negativo" : "" },
            ].map((linha) => (
              <div key={linha.rotulo} className="vidro-menu rounded-2xl px-3 py-2.5">
                <dt className="text-[calc(10px*var(--escala-letra))] uppercase tracking-widest text-muted-fg">{linha.rotulo}</dt>
                <dd className={cn("numero valor-sensivel mt-1 text-[calc(15px*var(--escala-letra))] font-semibold", linha.tom)}>
                  {formatarMoeda(linha.valor)}
                </dd>
              </div>
            ))}
          </dl>
        </Detalhe>
      </Abertura>

      {/* O que fazer subiu para cá. Era a última coisa da primeira aba, depois
          de dois blocos de diagnóstico — e é o que a pessoa veio buscar. Cada
          item agora termina no botão que executa, não numa frase. */}
      {diagnostico.prioridades.length > 0 && (
        <Cartao titulo="O que fazer, nesta ordem">
          <ol className="space-y-3">
            {diagnostico.prioridades.map((prioridade) => (
              <li key={prioridade.ordem} className="flex gap-3 rounded-[var(--raio-cartao)] border border-pauta p-3.5">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/[0.08] text-[calc(12px*var(--escala-letra))] font-semibold">
                  {prioridade.ordem}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[calc(14px*var(--escala-letra))] font-medium">{prioridade.titulo}</p>
                  <p className="mt-1 text-[calc(13px*var(--escala-letra))]">{prioridade.acao}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {prioridade.impactoMensalCentavos ? (
                      <Pilula tom="positivo">
                        <span className="valor-inteiro">{formatarMoeda(prioridade.impactoMensalCentavos)}</span>&nbsp;por mês
                      </Pilula>
                    ) : null}
                    <Link
                      href={ONDE_RESOLVER[prioridade.chave]?.href ?? "/transacoes"}
                      className="text-[calc(13px*var(--escala-letra))] font-medium text-acao underline-offset-4 hover:underline"
                    >
                      {ONDE_RESOLVER[prioridade.chave]?.texto ?? "Abrir"}
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Cartao>
      )}

      <AbasInternas abas={[{ chave: "indicadores", titulo: "Indicadores", conteudo: (<>
      {/* ── Indicadores ───────────────────────────────── */}
      <Cartao titulo="Indicadores">
        <div className="grid gap-3 lg:grid-cols-2">
          {diagnostico.indicadores.map((indicador) => (
            <div key={indicador.chave} title={`Referência: ${indicador.referencia}`} className="rounded-2xl border border-pauta bg-papel-2 p-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 text-[calc(13px*var(--escala-letra))] font-medium">{indicador.nome}</p>
                <div className="text-right">
                  <p className={cn("text-[calc(20px*var(--escala-letra))] font-semibold leading-none", COR_FAIXA[indicador.faixa])}>
                    {indicador.valor}
                  </p>
                  <p className={cn("mt-1 text-[calc(10px*var(--escala-letra))] uppercase tracking-widest", COR_FAIXA[indicador.faixa])}>
                    {ROTULO_FAIXA[indicador.faixa]}
                  </p>
                </div>
              </div>

              {/* A régua no lugar da palavra. "ATENÇÃO" não diz se falta muito
                  ou pouco — 28% e 29% ganham o mesmo rótulo e parecem iguais.
                  Aqui a faixa verde é o alvo, a amarela o limite, e o traço
                  mostra onde a pessoa caiu. */}
              {indicador.escala && (
                <ReguaDoIndicador numero={indicador.numero} escala={indicador.escala} cor={COR_FAIXA[indicador.faixa]} />
              )}

              {/* Indicador fora da faixa aponta problema; sem um destino ele
                  devolve o problema para a pessoa resolver sozinha. */}
              {indicador.faixa !== "BOM" && indicador.faixa !== "SEM_DADO" && ONDE_RESOLVER_INDICADOR[indicador.chave] && (
                <Link
                  href={ONDE_RESOLVER_INDICADOR[indicador.chave].href}
                  className="mt-3 inline-block text-[calc(13px*var(--escala-letra))] font-medium text-acao underline-offset-4 hover:underline"
                >
                  {ONDE_RESOLVER_INDICADOR[indicador.chave].texto}
                </Link>
              )}
            </div>
          ))}
        </div>
      </Cartao>

      </>) }, { chave: "entradas", titulo: "Entradas e saídas", conteudo: (<>
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

          <div className="mt-4 grade-valores">
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
                <div className="flex items-center justify-between text-[calc(13px*var(--escala-letra))]">
                  <span>{NOME_GRUPO[grupo.grupo] ?? grupo.grupo}</span>
                  <span className="text-muted-fg">
                    <span className="valor-inteiro">{formatarMoeda(grupo.totalCentavos)}</span>
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

          {mensal.serie.length > 1 && (
            <div className="mt-5 border-t border-pauta pt-4">
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
                {mensal.foraDaSerie.join(", ")} — esses só têm o valor de hoje no banco, e repeti-lo para trás faria o
                gráfico mostrar uma melhora que não houve.
              </p>
            </div>
          )}

          {(diagnostico.riscos.length > 0 || diagnostico.pontosFortes.length > 0) && (
            <div className="mt-4 space-y-3">
              {diagnostico.riscos.length > 0 && (
                <div>
                  <p className="text-[calc(11px*var(--escala-letra))] uppercase tracking-widest text-negativo">Riscos</p>
                  <ul className="mt-1.5 space-y-1.5">
                    {diagnostico.riscos.map((risco) => (
                      <li key={risco} className="text-[calc(12px*var(--escala-letra))] leading-relaxed text-muted-fg">
                        {risco}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {diagnostico.pontosFortes.length > 0 && (
                <div>
                  <p className="text-[calc(11px*var(--escala-letra))] uppercase tracking-widest text-positivo">Pontos fortes</p>
                  <ul className="mt-1.5 space-y-1.5">
                    {diagnostico.pontosFortes.map((ponto) => (
                      <li key={ponto} className="text-[calc(12px*var(--escala-letra))] leading-relaxed text-muted-fg">
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
      </>) }, { chave: "categorias", titulo: "Categorias", conteudo: (<>
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
          <p className="mt-3 text-[calc(13px*var(--escala-letra))] leading-relaxed text-[color:var(--texto-2)]">
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

      </>) }]} />
      <p className="px-1 text-[calc(11px*var(--escala-letra))] leading-relaxed text-muted-fg">
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
        {apoio && <span className="ml-1.5 text-[calc(10px*var(--escala-letra))] opacity-60">{apoio}</span>}
      </span>
      <span className={cn("text-[calc(14px*var(--escala-letra))] tabular-nums", cor)}><span className="valor-inteiro">{formatarMoeda(valor)}</span></span>
    </div>
  )
}


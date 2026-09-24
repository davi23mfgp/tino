import estilos from "./entradas-saidas.module.css"

import { formatarMoeda, formatarPercentual } from "@/lib/dinheiro"
import { REFERENCIA_CUSTO_FIXO, REFERENCIA_TAXA_POUPANCA } from "@/lib/tino/diagnostico"
import { cn } from "@/lib/utils"

/**
 * Aba "Entradas e saídas" da Análise (Davi, 24/09: opção A do canvas — a
 * renda numa barra).
 *
 * A tela antiga era um DRE de contador: três linhas de soma, quatro tiles com
 * valor estourando a caixa, nove barras verdes todas iguais e o balanço aberto
 * em dezessete linhas. Cada número estava certo e nenhum respondia a pergunta
 * de quem abre a aba: o dinheiro do mês foi para onde, e sobrou quanto. Uma
 * barra só, do tamanho da renda, responde as duas de uma vez — o pedaço de
 * cada cor é um grupo, o listrado é a sobra, e dá para ver sem ler que a
 * moradia come um quarto de tudo.
 */

/// Cor fixa por grupo, e não pela posição no ranking: se a alimentação passa
/// a moradia num mês, as cores trocariam de dono e a pessoa leria a barra do
/// mês passado com a legenda errada.
const COR_DO_GRUPO: Record<string, string> = {
  MORADIA: "oklch(0.7 0.19 25)",
  ALIMENTACAO: "oklch(0.76 0.17 60)",
  EDUCACAO: "oklch(0.8 0.16 95)",
  TRANSPORTE: "oklch(0.72 0.15 170)",
  SAUDE: "oklch(0.66 0.17 250)",
  PESSOAL: "oklch(0.64 0.2 295)",
  LAZER: "oklch(0.7 0.18 340)",
  SERVICOS: "oklch(0.62 0.08 220)",
  DIVIDAS: "oklch(0.58 0.2 15)",
  IMPOSTOS: "oklch(0.6 0.1 40)",
  INVESTIMENTO: "oklch(0.7 0.14 145)",
  NEGOCIO_MEI: "oklch(0.68 0.12 200)",
}
const COR_SEM_GRUPO = "oklch(0.55 0.02 250)"

/// Quantos grupos aparecem antes do "ver todos". Seis cobrem quase sempre
/// mais de 90% do gasto; o resto é cauda de R$ 100 que só alonga a lista.
const GRUPOS_A_VISTA = 6

export type GrupoDoMes = { grupo: string; nome: string; totalCentavos: number; percentualDaReceita: number }

export function EntradasESaidas({
  mes,
  receitasCentavos,
  despesasCentavos,
  grupos,
  custoFixoCentavos,
  custoVariavelCentavos,
  patrimonio,
  children,
}: {
  /// "setembro de 2026".
  mes: string
  receitasCentavos: number
  despesasCentavos: number
  grupos: GrupoDoMes[]
  custoFixoCentavos: number
  custoVariavelCentavos: number
  patrimonio: { liquidoCentavos: number; temCentavos: number; deveCentavos: number }
  /// O balanço aberto e o gráfico do patrimônio, recolhidos sob a linha do
  /// patrimônio líquido.
  children: React.ReactNode
}) {
  const resultado = receitasCentavos - despesasCentavos
  const temRenda = receitasCentavos > 0

  // Gasto sem categoria não some da barra: sem ele, os pedaços somariam menos
  // que o "Saiu" logo acima e a sobra listrada pareceria maior do que é.
  const somaDosGrupos = grupos.reduce((soma, grupo) => soma + grupo.totalCentavos, 0)
  const semGrupo = Math.max(0, despesasCentavos - somaDosGrupos)

  // A barra tem o tamanho do maior dos dois. No mês que fecha no vermelho, o
  // gasto passa da renda, e o traço marca onde a renda acabou.
  const base = Math.max(receitasCentavos, despesasCentavos, 1)
  const sobraBps = temRenda ? Math.round((resultado / receitasCentavos) * 10_000) : 0
  const tomDaSobra =
    sobraBps >= REFERENCIA_TAXA_POUPANCA.bom ? "bom" : sobraBps >= REFERENCIA_TAXA_POUPANCA.atencao ? "atencao" : "critico"

  const fixoBps = temRenda ? Math.round((custoFixoCentavos / receitasCentavos) * 10_000) : 0
  const tomDoFixo =
    fixoBps <= REFERENCIA_CUSTO_FIXO.bom ? "bom" : fixoBps <= REFERENCIA_CUSTO_FIXO.atencao ? "atencao" : "critico"
  const somaFixoVariavel = Math.max(1, custoFixoCentavos + custoVariavelCentavos)

  const percentualDe = (grupo: GrupoDoMes) =>
    temRenda ? grupo.percentualDaReceita : Math.round((grupo.totalCentavos / Math.max(1, despesasCentavos)) * 10_000)

  const linha = (grupo: GrupoDoMes) => (
    <li key={grupo.grupo}>
      <i style={{ background: COR_DO_GRUPO[grupo.grupo] ?? COR_SEM_GRUPO }} aria-hidden />
      <span>{grupo.nome}</span>
      <small>{formatarPercentual(percentualDe(grupo), 0)}</small>
      <b className="valor-sensivel">{formatarMoeda(grupo.totalCentavos)}</b>
    </li>
  )

  return (
    <div className={estilos.aba}>
      <section className={cn("ficha", estilos.topo)}>
        <p className={estilos.rotulo}>{mes}</p>
        <dl className={estilos.tres}>
          <div>
            <dt>Entrou</dt>
            <dd className="valor-sensivel" data-tom="entrou"><ValorComCentavos centavos={receitasCentavos} /></dd>
          </div>
          <div>
            <dt>Saiu</dt>
            <dd className="valor-sensivel"><ValorComCentavos centavos={despesasCentavos} /></dd>
          </div>
          <div>
            <dt>{resultado >= 0 ? "Sobrou" : "Faltou"}</dt>
            <dd className="valor-sensivel" data-tom={resultado >= 0 ? "entrou" : "faltou"}>
              <ValorComCentavos centavos={Math.abs(resultado)} />
            </dd>
          </div>
        </dl>

        <div className={estilos.barra} role="img" aria-label="A renda do mês dividida entre os grupos de gasto e a sobra">
          {grupos.map((grupo) => (
            <span
              key={grupo.grupo}
              style={{ width: `${(grupo.totalCentavos / base) * 100}%`, background: COR_DO_GRUPO[grupo.grupo] ?? COR_SEM_GRUPO }}
              title={`${grupo.nome}: ${formatarMoeda(grupo.totalCentavos)}`}
            />
          ))}
          {semGrupo > 0 && <span style={{ width: `${(semGrupo / base) * 100}%`, background: COR_SEM_GRUPO }} title="Sem categoria" />}
          {resultado > 0 && <span className={estilos.sobra} style={{ width: `${(resultado / base) * 100}%` }} title="Sobrou" />}
          {resultado < 0 && temRenda && (
            <em className={estilos.fimDaRenda} style={{ left: `${(receitasCentavos / base) * 100}%` }} aria-hidden />
          )}
        </div>

        <p className={estilos.leitura}>
          {!temRenda ? (
            <>
              Nenhuma entrada lançada em {mes} — a barra mostra só os gastos, e sem a renda não dá para dizer quanto
              sobrou. Lance o que entrou para a conta fechar.
            </>
          ) : resultado >= 0 ? (
            <>
              A renda inteira numa barra: cada cor é para onde foi, o listrado é o que sobrou —{" "}
              <b data-tom={tomDaSobra}>{formatarPercentual(sobraBps, 1)}</b>. Abaixo de{" "}
              {formatarPercentual(REFERENCIA_TAXA_POUPANCA.atencao, 0)} não se forma reserva;{" "}
              {formatarPercentual(REFERENCIA_TAXA_POUPANCA.bom, 0)} ou mais constrói patrimônio.
            </>
          ) : (
            <>
              Saiu <b data-tom="critico">{formatarMoeda(-resultado)}</b> a mais do que entrou. O traço marca onde a renda
              acabou: o que passa dele saiu do saldo guardado, do cartão ou de dívida.
            </>
          )}
        </p>
      </section>

      {grupos.length > 0 && (
        <section className={cn("ficha", estilos.bloco)}>
          <header>
            <h2>Para onde foi</h2>
            <small>{temRenda ? "% da renda" : "% dos gastos"}</small>
          </header>
          <ul className={estilos.lista}>{grupos.slice(0, GRUPOS_A_VISTA).map(linha)}</ul>
          {grupos.length > GRUPOS_A_VISTA && (
            <details className={estilos.mais}>
              <summary>
                <span data-fechado>Ver os {grupos.length} grupos</span>
                <span data-aberto>Mostrar menos</span>
              </summary>
              <ul className={estilos.lista}>{grupos.slice(GRUPOS_A_VISTA).map(linha)}</ul>
            </details>
          )}
        </section>
      )}

      {despesasCentavos > 0 && (
        <section className={cn("ficha", estilos.bloco)}>
          <header>
            <h2>Fixo e variável</h2>
          </header>
          <div className={estilos.duas} aria-hidden>
            <span data-parte="fixo" style={{ width: `${(custoFixoCentavos / somaFixoVariavel) * 100}%` }} />
            <span data-parte="variavel" style={{ width: `${(custoVariavelCentavos / somaFixoVariavel) * 100}%` }} />
          </div>
          <div className={estilos.legenda}>
            <span>
              <i data-parte="fixo" aria-hidden />
              <b className="valor-sensivel">{formatarMoeda(custoFixoCentavos)}</b> fixo · não muda com o uso
            </span>
            <span>
              <i data-parte="variavel" aria-hidden />
              <b className="valor-sensivel">{formatarMoeda(custoVariavelCentavos)}</b> variável · onde dá para mexer
            </span>
          </div>
          {temRenda && (
            <p className={estilos.leitura}>
              O fixo toma <b data-tom={tomDoFixo}>{formatarPercentual(fixoBps, 1)}</b> da renda. Até{" "}
              {formatarPercentual(REFERENCIA_CUSTO_FIXO.bom, 0)} sobra folga para imprevisto; acima de{" "}
              {formatarPercentual(REFERENCIA_CUSTO_FIXO.atencao, 0)} o orçamento engessa.
            </p>
          )}
        </section>
      )}

      {/* O balanço aberto em dezessete linhas ocupava a tela inteira do celular
          e empurrava tudo o mais para baixo. Fechado, ele vira a resposta que
          importa — quanto você vale hoje —, e abre para quem quer conferir
          conta por conta. */}
      <details className={cn("ficha", estilos.patrimonio)}>
        <summary>
          <div>
            <b>
              Patrimônio líquido{" "}
              <span className="valor-sensivel" data-tom={patrimonio.liquidoCentavos < 0 ? "critico" : undefined}>
                {formatarMoeda(patrimonio.liquidoCentavos)}
              </span>
            </b>
            <small>
              tem <span className="valor-sensivel">{formatarMoeda(patrimonio.temCentavos)}</span> · deve{" "}
              <span className="valor-sensivel">{formatarMoeda(patrimonio.deveCentavos)}</span>
            </small>
          </div>
          <span aria-hidden className={estilos.seta}>›</span>
        </summary>
        <div className={estilos.dentro}>{children}</div>
      </details>
    </div>
  )
}

/// "R$ 8.600" grande e ",00" menor. O Intl devolve a vírgula decimal como
/// último separador, então o corte ali é seguro para qualquer valor.
function ValorComCentavos({ centavos }: { centavos: number }) {
  const texto = formatarMoeda(centavos)
  const corte = texto.lastIndexOf(",")
  if (corte < 0) return <>{texto}</>
  return (
    <>
      {texto.slice(0, corte)}
      <small>{texto.slice(corte)}</small>
    </>
  )
}

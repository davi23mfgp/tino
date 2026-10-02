"use client"

import { useState, type CSSProperties } from "react"

import { formatarMoeda } from "@/lib/dinheiro"
import estilos from "./analise.module.css"

/// As mesmas cores, na mesma ordem, das categorias do cartão: a pessoa acha a
/// categoria pela cor antes de ler o nome.
const CORES = ["oklch(0.72 0.17 145)", "oklch(0.68 0.12 230)", "oklch(0.74 0.14 80)", "oklch(0.66 0.16 25)", "oklch(0.66 0.14 300)", "oklch(0.7 0.1 190)", "oklch(0.64 0.05 250)", "oklch(0.58 0.02 145)"]
const INICIAIS = ["D", "S", "T", "Q", "Q", "S", "S"]
const NOMES_DIA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"]
const VISIVEIS = 8
/// Variação abaixo de 3% é ruído de mês, não tendência — a mesma régua de
/// `CategoriasComparadas`.
const RUIDO_BPS = 300

interface Linha {
  categoriaId: string | null
  nome: string
  totalCentavos: number
  anteriorCentavos: number
  variacaoBps: number | null
}

/**
 * Categorias do mês (Davi, 28/09: opção C do canvas).
 *
 * Primeiro o que mais subiu, que é onde dá para agir; depois quando o dinheiro
 * sai, dia a dia; por último a lista inteira. A comparação é com o mesmo
 * período do mês anterior (ver `corteDoMesAnterior`): no dia 10, contra o mês
 * passado inteiro, tudo parecia ter caído.
 */
export function CategoriasDoMes({ linhas, mesAnterior, dias, maiorGasto, mediaDiariaCentavos, hoje }: {
  linhas: Linha[]
  /// Nome do mês anterior ("agosto"), para dizer contra o que se compara.
  mesAnterior: string
  dias: { dia: number; diaDaSemana: number; totalCentavos: number }[]
  maiorGasto: { dia: number; totalCentavos: number } | null
  mediaDiariaCentavos: number
  hoje: number
}) {
  const [todas, setTodas] = useState(false)
  const [diaSelecionado, selecionarDia] = useState<number | null>(maiorGasto?.dia ?? null)
  const diaEmDestaque = dias.find((dia) => dia.dia === diaSelecionado)
  const total = linhas.reduce((soma, linha) => soma + linha.totalCentavos, 0)
  // O que mais subiu em reais, não em percentual: R$ 10 que viram R$ 30 são
  // +200% e não mudam o mês; R$ 1.200 que viram R$ 1.400 mudam.
  const subiram = linhas
    .filter((linha) => linha.totalCentavos > linha.anteriorCentavos && (linha.variacaoBps === null || linha.variacaoBps >= RUIDO_BPS))
    .sort((a, b) => (b.totalCentavos - b.anteriorCentavos) - (a.totalCentavos - a.anteriorCentavos))
    .slice(0, 3)
  const maior = Math.max(1, ...linhas.map((linha) => linha.totalCentavos))
  const visiveis = todas ? linhas : linhas.slice(0, VISIVEIS)
  const maiorDia = Math.max(1, ...dias.map((dia) => dia.totalCentavos))

  if (linhas.length === 0) return <section className={estilos.bloco}><p className={estilos.vazio}>Nenhum gasto classificado no mês ainda.</p></section>

  return <div className={estilos.categorias}>
    <div className={estilos.coluna}>
      <section className={`${estilos.bloco} ${estilos.comparacaoCompacta}`}>
        <header className={estilos.cabecalho}><h2>Maiores aumentos</h2><small>vs. {mesAnterior} · mesmo período</small></header>
        {subiram.length === 0 ? <p className={estilos.vazio}>Nenhuma categoria subiu contra o mesmo período de {mesAnterior}.</p> : (
          <ul className={estilos.subiu}>
            {subiram.map((linha, indice) => <li key={linha.categoriaId ?? linha.nome}>
              <span className={estilos.posicaoAumento}>{indice + 1}</span>
              <div className={estilos.dadosAumento}><strong>{linha.nome}</strong><small>{linha.anteriorCentavos === 0 ? "Sem gasto no período anterior" : <>Antes: <span className="valor-sensivel">{formatarMoeda(linha.anteriorCentavos)}</span></>}</small><div className={estilos.barraAumento}><span style={{ width: `${(linha.totalCentavos - linha.anteriorCentavos) / Math.max(1, ...subiram.map((item) => item.totalCentavos - item.anteriorCentavos)) * 100}%` }} /></div></div>
              <div className={estilos.valorAumento}><b className="valor-sensivel">+{formatarMoeda(linha.totalCentavos - linha.anteriorCentavos)}</b><Variacao linha={linha} /></div>
            </li>)}
          </ul>
        )}
      </section>

      <section className={`${estilos.bloco} ${estilos.blocoDias}`}>
        <header className={estilos.cabecalho}><h2>Gastos por dia</h2><small>Mês atual</small></header>
        {maiorGasto && maiorGasto.totalCentavos > 0 && <div className={estilos.destaqueDia}><span>Pico de gastos · dia {maiorGasto.dia}</span><b className="valor-sensivel">{formatarMoeda(maiorGasto.totalCentavos)}</b><small>{total > 0 ? Math.round(maiorGasto.totalCentavos / total * 100) : 0}% dos gastos do mês</small></div>}
        <div className={estilos.calendario}>
          {INICIAIS.map((inicial, indice) => <abbr key={indice} title={NOMES_DIA[indice]}>{inicial}</abbr>)}
          {/* Casas vazias até o dia da semana do dia 1º, para a grade alinhar. */}
          {Array.from({ length: dias[0]?.diaDaSemana ?? 0 }, (_, indice) => <span key={`v${indice}`} aria-hidden style={{ background: "transparent" }} />)}
          {dias.map((dia) => <button
            type="button"
            onClick={() => selecionarDia(dia.dia)}
            aria-pressed={diaSelecionado === dia.dia}
            aria-label={`Dia ${dia.dia}: ${formatarMoeda(dia.totalCentavos)}${dia.dia === hoje ? ", hoje" : ""}`}
            key={dia.dia}
            title={`Dia ${dia.dia}: ${formatarMoeda(dia.totalCentavos)}`}
            data-gasto={dia.totalCentavos > 0 || undefined}
            data-hoje={dia.dia === hoje || undefined}
            data-futuro={dia.dia > hoje || undefined}
            // A escala é relativa ao maior dia do próprio mês: cada casa gasta
            // numa ordem de grandeza, e escala fixa deixaria o mapa todo claro
            // para uns e todo escuro para outros.
            style={{ "--forca": 0.18 + (dia.totalCentavos / maiorDia) * 0.72 } as CSSProperties}
          >{dia.dia}</button>)}
        </div>
        <div className={estilos.resumoSelecao} aria-live="polite"><span>{diaEmDestaque ? `Dia ${diaEmDestaque.dia} · ${NOMES_DIA[diaEmDestaque.diaDaSemana]}` : "Selecione um dia"}<b className="valor-sensivel">{diaEmDestaque ? formatarMoeda(diaEmDestaque.totalCentavos) : "Selecione"}</b></span><span>Média dos dias com gasto<b className="valor-sensivel">{formatarMoeda(mediaDiariaCentavos)}</b></span></div>
        <div className={estilos.rodapeCalendario}><small>Toque em um dia para consultar</small><span className={estilos.escala} aria-hidden>menos {[0.18, 0.4, 0.62, 0.9].map((forca) => <i key={forca} style={{ "--forca": forca } as CSSProperties} />)} mais</span></div>
      </section>
    </div>

    <section className={`${estilos.bloco} ${estilos.categoriasCompactas}`}>
      <header className={estilos.cabecalho}><h2>Por categoria</h2><small className="valor-sensivel">{formatarMoeda(total)} no mês</small></header>
      <ul className={estilos.lista}>
        {visiveis.map((linha, indice) => <li key={linha.categoriaId ?? linha.nome} style={{ "--cor": CORES[indice % CORES.length] } as CSSProperties}>
          <div><i aria-hidden /><span>{linha.nome}</span><b className="valor-sensivel">{formatarMoeda(linha.totalCentavos)}</b></div>
          <div className={estilos.medidaCategoria}><span className={estilos.barra} aria-hidden><i style={{ width: `${(linha.totalCentavos / maior) * 100}%` }} /></span><small>{total > 0 ? Math.round(linha.totalCentavos / total * 100) : 0}% do mês</small><Variacao linha={linha} /></div>
        </li>)}
      </ul>
      {linhas.length > VISIVEIS && <button type="button" className={estilos.mais} onClick={() => setTodas((atual) => !atual)}>{todas ? "Mostrar menos" : `Ver todas as ${linhas.length}`}</button>}
    </section>
  </div>
}

/** A seta diz a direção; a cor, se é bom — em gasto, cair é bom. */
function Variacao({ linha }: { linha: Linha }) {
  if (linha.variacaoBps === null) return <span className={estilos.variacao} data-sentido="novo">novo</span>
  if (Math.abs(linha.variacaoBps) < RUIDO_BPS) return <span className={estilos.variacao} data-sentido="igual" aria-label="estável">=</span>
  const subiu = linha.variacaoBps > 0
  return <span className={estilos.variacao} data-sentido={subiu ? "subiu" : "caiu"} aria-label={`${subiu ? "subiu" : "caiu"} ${Math.abs(Math.round(linha.variacaoBps / 100))}%`}>{subiu ? "▲" : "▼"} {Math.abs(Math.round(linha.variacaoBps / 100))}%</span>
}

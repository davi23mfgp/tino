"use client"

import { useState, type CSSProperties } from "react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { enviar } from "@/lib/cliente"
import { competenciaMaisMeses, rotuloCompetencia } from "@/lib/datas"
import { formatarDecimal, formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { iconeDaCategoria } from "@/lib/icone-categoria"
import type { DadosCartao } from "@/lib/cartoes"
import estilos from "./abas-cartao.module.css"

/// Uma cor por posição, a mesma em toda visita: a pessoa acha a categoria
/// pela cor antes de ler o nome. Tons do meio, legíveis no claro e no escuro.
const CORES = ["oklch(0.72 0.17 145)", "oklch(0.68 0.12 230)", "oklch(0.74 0.14 80)", "oklch(0.66 0.16 25)", "oklch(0.66 0.14 300)", "oklch(0.7 0.1 190)", "oklch(0.64 0.05 250)", "oklch(0.58 0.02 145)"]
const CORTES = [5, 10, 20]
const semCentavosZerados = (centavos: number) => formatarMoeda(centavos).replace(/,00$/, "")

type Categoria = { id: string; nome: string; totalCentavos: number }

/**
 * Gastos por categoria (Davi, 26/09: opção M3 do canvas).
 *
 * Uma cápsula por categoria, na mesma escala para todas, com um traço onde
 * fica o limite: o que passa dele sai listrado em vermelho depois do traço.
 * Assim se vê de uma vez quem gastou mais e quem estourou, sem ler número.
 *
 * O limite é o do orçamento do próprio cartão, desta fatura — não o da tela
 * Orçamento. Aquele soma o gasto de todas as contas no mês do calendário;
 * pôr ao lado só das compras do cartão compararia duas coisas diferentes e o
 * "passou" sairia errado. Tocar na categoria abre as compras dela e o ajuste
 * do limite, com o corte sugerido (o "economizar" que morava na aba Ajuda).
 */
export function CategoriasDoCartao({ cartao, mes, categorias, aoVerCompras, aoSalvar }: {
  cartao: DadosCartao
  mes: string
  categorias: Categoria[]
  aoVerCompras: (categoriaId: string) => void
  aoSalvar: () => void
}) {
  const [aberta, setAberta] = useState<Categoria | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState("")
  const plano = cartao.orcamentos?.find((linha) => linha.competencia === mes)
  const anterior = plano ? undefined : cartao.orcamentos?.find((linha) => linha.competencia === competenciaMaisMeses(mes, -1) && linha.categorias.length > 0)
  const limiteDe = (id: string) => plano?.categorias.find((linha) => linha.categoriaId === id)?.limiteCentavos
  const total = categorias.reduce((soma, linha) => soma + linha.totalCentavos, 0)
  const escala = Math.max(1, ...categorias.map((linha) => Math.max(linha.totalCentavos, limiteDe(linha.id) ?? 0)))
  const temLimite = Boolean(plano?.categorias.length)

  // O plano do cartão é um só por fatura, com todas as categorias: salvar uma
  // reescreve a lista inteira, e o total nunca fica abaixo da soma delas.
  async function salvar(categorias: { categoriaId: string; limiteCentavos: number }[]) {
    setOcupado(true); setErro("")
    try {
      const soma = categorias.reduce((acumulado, linha) => acumulado + linha.limiteCentavos, 0)
      await enviar(`/api/cartoes/${cartao.id}/orcamento`, { competencia: mes, totalCentavos: Math.max(plano?.totalCentavos ?? 0, soma), categorias }, "PUT")
      setAberta(null); aoSalvar()
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não consegui salvar.") }
    finally { setOcupado(false) }
  }
  function trocarLimite(categoriaId: string, limiteCentavos: number) {
    const outras = (plano?.categorias ?? []).filter((linha) => linha.categoriaId !== categoriaId)
    return salvar(limiteCentavos > 0 ? [...outras, { categoriaId, limiteCentavos }] : outras)
  }

  if (categorias.length === 0) {
    return <div className={estilos.vazio}><strong>Nenhuma compra nesta fatura</strong><p>As categorias aparecem aqui quando houver compras.</p></div>
  }

  return <div className={estilos.aba}>
    <section className={estilos.bloco} data-respiro>
      <div className={estilos.topoNumero}>
        <div><small>Em compras em {rotuloCompetencia(mes).split(" ")[0]}</small><b className="valor-sensivel">{semCentavosZerados(total)}</b></div>
        <p>{categorias.length} {categorias.length === 1 ? "categoria" : "categorias"}</p>
      </div>
      {temLimite && <p className={estilos.legendaCapsula}><span><i data-marca />limite</span><span><i data-passou />passou</span></p>}
      <ul className={estilos.capsulas}>
        {categorias.map((linha, indice) => {
          const limite = limiteDe(linha.id)
          const dentro = limite !== undefined ? Math.min(linha.totalCentavos, limite) : linha.totalCentavos
          const passou = limite !== undefined && linha.totalCentavos > limite ? linha.totalCentavos - limite : 0
          const Icone = iconeDaCategoria({ nome: linha.nome }, "DESPESA")
          return <li key={linha.id} style={{ "--cor": CORES[indice % CORES.length] } as CSSProperties}>
            <button type="button" onClick={() => { setAberta(linha); setErro("") }} aria-label={`${linha.nome}: ${formatarMoeda(linha.totalCentavos)}${limite !== undefined ? `, limite ${formatarMoeda(limite)}` : ""}`}>
              <span className={estilos.linhaCapsula}>
                <Icone aria-hidden />
                <strong>{linha.nome}</strong>
                <b className="valor-sensivel">{semCentavosZerados(linha.totalCentavos)}</b>
                <small data-passou={passou > 0 || undefined}>{limite === undefined ? "sem limite" : passou > 0 ? `+${semCentavosZerados(passou)}` : `de ${semCentavosZerados(limite)}`}</small>
              </span>
              <span className={estilos.capsula} aria-hidden>
                <i style={{ width: `${(dentro / escala) * 100}%` }} />
                {passou > 0 && <i data-passou style={{ left: `calc(${(limite! / escala) * 100}% + 2px)`, width: `calc(${(passou / escala) * 100}% - 2px)` }} />}
                {limite !== undefined && <em style={{ left: `${(limite / escala) * 100}%` }} />}
              </span>
            </button>
          </li>
        })}
      </ul>
    </section>
    {anterior && (
      <button type="button" className={estilos.repetir} disabled={ocupado} onClick={() => void salvar(anterior.categorias)}>
        Repetir os limites de {rotuloCompetencia(anterior.competencia).split(" ")[0]}
      </button>
    )}
    <p className={estilos.dica}>Toque numa categoria para ver as compras e ajustar o limite.</p>
    {erro && !aberta && <p role="alert" className={estilos.erro}>{erro}</p>}

    <Dialog open={aberta !== null} onOpenChange={(abrir) => !abrir && setAberta(null)}>
      <DialogContent largura="curta" className={estilos.folha}>
        {aberta && <AjusteDaCategoria
          categoria={aberta}
          total={total}
          limite={limiteDe(aberta.id)}
          ocupado={ocupado}
          erro={erro}
          aoSalvar={(centavos) => void trocarLimite(aberta.id, centavos)}
          aoVerCompras={() => { setAberta(null); aoVerCompras(aberta.id) }}
        />}
      </DialogContent>
    </Dialog>
  </div>
}

/**
 * O limite de uma categoria, com o corte sugerido.
 *
 * Os botões de corte preenchem o limite com o gasto desta fatura menos 5, 10
 * ou 20% e dizem quanto sobra por mês — é a conta que a pessoa faria de
 * cabeça antes de decidir. O valor continua editável: o corte é ponto de
 * partida, não regra.
 */
function AjusteDaCategoria({ categoria, total, limite, ocupado, erro, aoSalvar, aoVerCompras }: {
  categoria: Categoria
  total: number
  limite: number | undefined
  ocupado: boolean
  erro: string
  aoSalvar: (centavos: number) => void
  aoVerCompras: () => void
}) {
  const [texto, setTexto] = useState(limite !== undefined ? formatarDecimal(limite / 100, 2) : "")
  const [corte, setCorte] = useState<number | null>(null)
  const valor = Math.max(0, paraCentavos(texto || "0"))
  const sobra = categoria.totalCentavos - valor

  return <>
    <DialogHeader>
      <DialogTitle>{categoria.nome}</DialogTitle>
      <DialogDescription>{formatarMoeda(categoria.totalCentavos)} nesta fatura · {total ? Math.round((categoria.totalCentavos / total) * 100) : 0}% das compras</DialogDescription>
    </DialogHeader>
    <div className={estilos.ajuste}>
      <label className={estilos.campoLimite}>
        <span>Limite nesta fatura</span>
        <span className={estilos.campoBusca}><small>R$</small><input inputMode="decimal" placeholder="sem limite" value={texto} onChange={(evento) => { setTexto(evento.target.value); setCorte(null) }} aria-label={`Limite de ${categoria.nome}`} /></span>
      </label>
      <div className={estilos.cortes} role="group" aria-label="Cortar do gasto desta fatura">
        {CORTES.map((percentual) => (
          <button key={percentual} type="button" aria-pressed={corte === percentual} onClick={() => { setCorte(percentual); setTexto(formatarDecimal(Math.round(categoria.totalCentavos * (100 - percentual) / 100) / 100, 2)) }}>−{percentual}%</button>
        ))}
      </div>
      {valor > 0 && <p className={estilos.sobra}>{sobra > 0 ? <>Gastando até esse limite, sobram <b>{formatarMoeda(sobra)}</b> por mês.</> : <>Esse limite fica acima do que você gastou nesta fatura.</>}</p>}
      {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
      <div className={estilos.botoesAjuste}>
        <button type="button" className={estilos.botaoFiltros} disabled={ocupado || (valor === 0 && limite === undefined)} onClick={() => aoSalvar(valor)}>{ocupado ? "Salvando…" : valor === 0 ? "Tirar limite" : "Salvar limite"}</button>
        <button type="button" className={estilos.botaoSecundario} onClick={aoVerCompras}>Ver compras</button>
      </div>
    </div>
  </>
}

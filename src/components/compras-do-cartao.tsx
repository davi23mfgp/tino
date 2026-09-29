"use client"

import { useState } from "react"
import { ListChecks, Search, ShoppingBag, SlidersHorizontal, X } from "lucide-react"

import { MarcaPersonalizada } from "@/components/identidades-visuais"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { iconeDaCategoria } from "@/lib/icone-categoria"
import { formatarMoeda } from "@/lib/dinheiro"
import type { CompraCartao } from "@/lib/cartoes"
import estilos from "./abas-cartao.module.css"

const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
/// "25 set" a partir de "2026-09-25".
const diaCurto = (iso: string) => `${Number(iso.slice(8, 10))} ${MES_CURTO[Number(iso.slice(5, 7)) - 1]}`
const semCentavosZerados = (centavos: number) => formatarMoeda(centavos).replace(/,00$/, "")

/**
 * Compras da fatura (Davi, 26/09: opção A do canvas, com o "Conferir" que
 * morava na aba Ajuda).
 *
 * A lista vem separada por dia, com o total do dia no cabeçalho: a fatura do
 * banco é lida assim, e conferir uma contra a outra fica linha a linha. Editar
 * e apagar saíram da linha — eram dois ícones repetidos vinte vezes; tocar na
 * compra abre a edição, e apagar mora lá dentro.
 */
export function ComprasDoCartao({ compras, categorias, busca, aoBuscar, categoria, aoFiltrar, aoAbrir, aoConferir, aoNova }: {
  compras: CompraCartao[]
  categorias: { id: string; nome: string; totalCentavos: number }[]
  busca: string
  aoBuscar: (texto: string) => void
  categoria: string
  aoFiltrar: (categoriaId: string) => void
  aoAbrir: (compra: CompraCartao) => void
  aoConferir: () => void
  aoNova: () => void
}) {
  const [folha, setFolha] = useState(false)
  const total = compras.reduce((soma, compra) => soma + (compra.tipo === "DESPESA" ? compra.valorCentavos : -compra.valorCentavos), 0)
  const escolhida = categorias.find((linha) => linha.id === categoria)
  const dias = compras.reduce<{ data: string; compras: CompraCartao[] }[]>((grupos, compra) => {
    const ultimo = grupos.at(-1)
    if (ultimo?.data === compra.data) ultimo.compras.push(compra)
    else grupos.push({ data: compra.data, compras: [compra] })
    return grupos
  }, [])

  return <div className={estilos.aba}>
    <div className={estilos.busca}>
      <label className={estilos.campoBusca}><Search aria-hidden /><input type="search" aria-label="Buscar compra" placeholder="Buscar compra" value={busca} onChange={(evento) => aoBuscar(evento.target.value)} /></label>
      <button type="button" className={estilos.botaoFiltros} onClick={() => setFolha(true)}><SlidersHorizontal aria-hidden />Filtros{escolhida ? " · 1" : ""}</button>
      <button type="button" className={estilos.botaoConferir} onClick={aoConferir} aria-label="Conferir fatura"><ListChecks aria-hidden /><span>Conferir</span></button>
    </div>
    {escolhida && <button type="button" className={estilos.chipAtivo} onClick={() => aoFiltrar("")}>{escolhida.nome}<X aria-label="Tirar filtro" /></button>}

    <div className={estilos.resumo}><span>{compras.length} {compras.length === 1 ? "compra" : "compras"}</span><b className="valor-sensivel">{semCentavosZerados(total)}</b></div>

    {compras.length === 0 ? (
      <div className={estilos.vazio}>
        <ShoppingBag aria-hidden />
        <strong>{busca || categoria ? "Nenhuma compra com esse filtro" : "Nenhuma compra nesta fatura"}</strong>
        <p>{busca || categoria ? "Limpe a busca ou escolha outra categoria." : "As compras entram pelo aviso do banco, pela fatura importada ou lançadas à mão."}</p>
        <button type="button" onClick={() => (busca || categoria ? (aoBuscar(""), aoFiltrar("")) : aoNova())}>{busca || categoria ? "Limpar filtros" : "Nova compra"}</button>
      </div>
    ) : (
      <section className={estilos.bloco}>
        {dias.map((dia) => (
          <div key={dia.data}>
            <h3 className={estilos.dia}><span>{diaCurto(dia.data)}</span><span className="valor-sensivel">{semCentavosZerados(dia.compras.reduce((soma, compra) => soma + (compra.tipo === "DESPESA" ? compra.valorCentavos : -compra.valorCentavos), 0))}</span></h3>
            <ul>
              {dia.compras.map((compra) => {
                const Icone = iconeDaCategoria(compra.categoria, compra.tipo === "RECEITA" ? "RECEITA" : "DESPESA")
                return <li key={compra.id}>
                  <button type="button" className={estilos.linha} onClick={() => aoAbrir(compra)} aria-label={`Abrir ${compra.descricao}`}>
                    {/* A marca do estabelecimento, quando há; o ícone da
                        categoria atrás dela, para o círculo nunca ficar vazio. */}
                    <span className={estilos.icone}><MarcaPersonalizada nome={compra.descricao} /><Icone aria-hidden /></span>
                    <span className={estilos.texto}><strong>{compra.descricao}</strong><small>{compra.categoria?.nome ?? "Sem categoria"}</small></span>
                    <b className="valor-sensivel" data-credito={compra.tipo === "RECEITA" || undefined}>{compra.tipo === "RECEITA" ? "− " : ""}{semCentavosZerados(compra.valorCentavos)}</b>
                  </button>
                </li>
              })}
            </ul>
          </div>
        ))}
      </section>
    )}

    <Dialog open={folha} onOpenChange={setFolha}>
      <DialogContent largura="curta" className={estilos.folha}>
        <DialogHeader><DialogTitle>Filtrar por categoria</DialogTitle><DialogDescription>O total de cada uma nesta fatura.</DialogDescription></DialogHeader>
        <div className={estilos.opcoes}>
          <button type="button" aria-pressed={!categoria} onClick={() => { aoFiltrar(""); setFolha(false) }}><span>Todas</span></button>
          {categorias.map((linha) => (
            <button key={linha.id} type="button" aria-pressed={categoria === linha.id} onClick={() => { aoFiltrar(linha.id); setFolha(false) }}>
              <span>{linha.nome}</span><b className="valor-sensivel">{semCentavosZerados(linha.totalCentavos)}</b>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  </div>
}

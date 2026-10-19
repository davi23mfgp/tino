"use client"

import { useEffect, useState } from "react"

import { FichaPadrao, LinhaDaFicha } from "@/components/ficha-padrao"
import { MarcaPersonalizada } from "@/components/identidades-visuais"
import { SeletorCategoria, SimboloCategoria, type CategoriaSelecionavel } from "@/components/seletor-categoria"
import { Input } from "@/components/ui/input"
import { formatarDecimal, formatarMoeda, paraCentavos } from "@/lib/dinheiro"

/**
 * A ficha de um lançamento do Extrato (passo 57, opção A).
 *
 * Antes o nome e o valor se editavam tocando no próprio texto da lista, e a
 * pessoa não tinha como saber; excluir não existia em tela nenhuma. Agora a
 * linha inteira abre esta ficha, que mostra tudo, troca a categoria num toque
 * e tem Editar e Excluir escritos.
 */
export interface LancamentoDaFicha {
  id: string
  data: string
  descricao: string
  descricaoOriginal?: string | null
  valorCentavos: number
  tipo: "RECEITA" | "DESPESA" | "TRANSFERENCIA"
  categoriaId: string | null
  categoria?: { nome: string; icone?: string | null } | null
  conta: { nome: string }
}

interface Props {
  lancamento: LancamentoDaFicha | null
  categorias: CategoriaSelecionavel[]
  aoFechar: () => void
  aoSalvar: (id: string, parcial: { descricao?: string; valorCentavos?: number; data?: string; categoriaId?: string | null; criarRegra?: boolean }) => Promise<boolean>
  aoExcluir: (lancamento: LancamentoDaFicha) => void
  aoEscolherLoja: (lancamento: LancamentoDaFicha) => void
}

const dataLonga = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" })

export function FichaLancamento({ lancamento, categorias, aoFechar, aoSalvar, aoExcluir, aoEscolherLoja }: Props) {
  const [editando, setEditando] = useState(false)
  const [descricao, setDescricao] = useState("")
  const [valor, setValor] = useState("")
  const [data, setData] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  useEffect(() => {
    if (!lancamento) return
    setEditando(false)
    setErro("")
    setDescricao(lancamento.descricao)
    setValor(formatarDecimal(lancamento.valorCentavos / 100, 2))
    setData(lancamento.data.slice(0, 10))
  }, [lancamento])

  if (!lancamento) return <FichaPadrao aberta={false} aoFechar={aoFechar} titulo="Lançamento"><span /></FichaPadrao>

  const transferencia = lancamento.tipo === "TRANSFERENCIA"
  const sinal = lancamento.tipo === "RECEITA" ? "+" : transferencia ? "" : "-"

  async function salvar() {
    if (!lancamento) return
    const centavos = paraCentavos(valor)
    if (!descricao.trim()) return setErro("Escreva o nome do lançamento.")
    if (!(centavos > 0)) return setErro("O valor tem de ser maior que zero.")
    setSalvando(true)
    setErro("")
    const parcial: { descricao?: string; valorCentavos?: number; data?: string } = {}
    if (descricao.trim() !== lancamento.descricao) parcial.descricao = descricao.trim()
    if (centavos !== lancamento.valorCentavos) parcial.valorCentavos = centavos
    if (data && data !== lancamento.data.slice(0, 10)) parcial.data = `${data}T12:00:00.000Z`
    const ok = Object.keys(parcial).length === 0 ? true : await aoSalvar(lancamento.id, parcial)
    setSalvando(false)
    if (ok) setEditando(false)
    else setErro("Não consegui salvar. Confira e tente de novo.")
  }

  const rodapeEdicao = (
    <div className="grid gap-2.5">
      {erro && <p role="alert" className="text-sm text-negativo">{erro}</p>}
      <div className="flex gap-2.5">
        <button type="button" disabled={salvando} onClick={() => void salvar()}
          className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-full bg-[oklch(var(--primary))] px-5 text-[15.5px] font-bold text-[oklch(var(--primary-foreground))] disabled:opacity-50">
          {salvando ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" disabled={salvando} onClick={() => { setEditando(false); setErro("") }}
          className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-full border border-pauta px-5 text-[15.5px] font-semibold">
          Cancelar
        </button>
      </div>
    </div>
  )

  return (
    <FichaPadrao
      aberta
      aoFechar={aoFechar}
      titulo={editando ? "Editar lançamento" : "Lançamento"}
      descricao={editando ? "Mude o que precisar e toque em Salvar." : "Toque fora para fechar."}
      aoEditar={transferencia ? undefined : () => setEditando(true)}
      aoExcluir={() => aoExcluir(lancamento)}
      rodape={editando ? rodapeEdicao : undefined}
    >
      {editando ? (
        <div className="grid gap-3">
          <label className="grid gap-1.5 text-sm text-muted-fg">Nome<Input value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={120} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-sm text-muted-fg">Valor (R$)<Input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" /></label>
            <label className="grid gap-1.5 text-sm text-muted-fg">Data<Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></label>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3.5">
            <span className="grid size-[52px] shrink-0 place-items-center overflow-hidden rounded-2xl bg-papel-2 [&_img]:size-full">
              <MarcaPersonalizada nome={lancamento.descricao} original={lancamento.descricaoOriginal ?? undefined} />
              <SimboloCategoria categoria={lancamento.categoria} tipo={lancamento.tipo} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xl font-semibold">{lancamento.descricao}</p>
              <p className="text-sm text-muted-fg">{dataLonga(lancamento.data)}</p>
            </div>
          </div>
          <p className={`numero valor-sensivel text-[40px] font-light leading-none tracking-tight ${lancamento.tipo === "RECEITA" ? "text-positivo" : ""}`}>
            {sinal}{formatarMoeda(lancamento.valorCentavos)}
          </p>
          <div>
            <LinhaDaFicha rotulo="Conta">{lancamento.conta.nome}</LinhaDaFicha>
            {!transferencia && (
              <LinhaDaFicha rotulo="Categoria">
                <SeletorCategoria opcoes={categorias} valor={lancamento.categoriaId} rotulo={`Categoria de ${lancamento.descricao}`} vazio="escolher"
                  aoMudar={(categoriaId) => void aoSalvar(lancamento.id, { categoriaId, criarRegra: categoriaId !== null })} />
              </LinhaDaFicha>
            )}
            {!transferencia && (
              <LinhaDaFicha rotulo="Logo da loja">
                <button type="button" className="font-semibold text-acao" onClick={() => aoEscolherLoja(lancamento)}>trocar</button>
              </LinhaDaFicha>
            )}
            {lancamento.descricaoOriginal && lancamento.descricaoOriginal !== lancamento.descricao && (
              <LinhaDaFicha rotulo="Como veio do banco"><span className="truncate text-muted-fg">{lancamento.descricaoOriginal}</span></LinhaDaFicha>
            )}
          </div>
        </>
      )}
    </FichaPadrao>
  )
}

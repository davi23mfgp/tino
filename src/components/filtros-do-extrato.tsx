"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, MoreHorizontal, SlidersHorizontal, X } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { SimboloCategoria, type CategoriaSelecionavel } from "@/components/seletor-categoria"
import { formatarMoeda } from "@/lib/dinheiro"
import estilos from "./filtros-do-extrato.module.css"

/**
 * Filtros do extrato (Davi, 24/09: a tela da opção A do canvas, e o botão de
 * filtro abrindo a folha da opção B).
 *
 * A tela antiga gastava cinco linhas de controles antes do primeiro
 * lançamento. Aqui o uso comum cabe numa linha de chips que desliza (tipo,
 * conta, categoria, sem categoria), e o resto mora numa folha que sobe de
 * baixo — pelo botão ao lado da busca ou pelo toque em "Conta" e "Categoria".
 *
 * O filtro vale no toque, sem botão de aplicar: a lista de trás já muda
 * enquanto a folha está aberta, e o botão do pé mostra quanto o filtro
 * encontrou — número que veio do servidor, não uma estimativa.
 */

export type TipoDoFiltro = "todos" | "RECEITA" | "DESPESA"
export type ContaDoFiltro = { id: string; nome: string; tipo?: string; cor?: string | null }

const TIPOS: { valor: TipoDoFiltro; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "RECEITA", rotulo: "Entradas" },
  { valor: "DESPESA", rotulo: "Saídas" },
]

/// A cor que a pessoa deu à conta no cadastro. É o que liga o chip ao cartão
/// que ela já reconhece na tela de Cartões.
const COR_DA_CONTA: Record<string, string> = {
  blue: "oklch(0.68 0.15 250)",
  green: "oklch(0.78 0.2 145)",
  purple: "oklch(0.66 0.18 300)",
  yellow: "oklch(0.83 0.15 90)",
  orange: "oklch(0.75 0.16 60)",
  red: "oklch(0.68 0.19 25)",
  teal: "oklch(0.74 0.12 190)",
}

/// "Cartão Platinum (final 8842)" vira "Platinum": no chip o nome inteiro
/// ocupava a largura da folha e empurrava um cartão por linha.
export function nomeCurtoDaConta(nome: string): string {
  const curto = nome.replace(/\s*\(final \d+\)\s*$/i, "").replace(/^cart[aã]o\s+/i, "").trim()
  return curto || nome
}

/// Quantas categorias a grade mostra antes do "Outras". Duas linhas de
/// quatro cabem na folha do celular sem rolar; as trinta de uma vez viravam
/// uma parede de ícones.
const CATEGORIAS_A_VISTA = 7

export function FiltrosDoExtrato({
  children,
  tipo,
  aoMudarTipo,
  contaId,
  aoMudarConta,
  categoriaId,
  aoMudarCategoria,
  semCategoria,
  aoMudarSemCategoria,
  diaEscolhido,
  aoSoltarDia,
  contas,
  categorias,
  usoPorCategoria,
  encontrados,
  aoLimpar,
}: {
  /// O campo de busca, que divide a linha com o botão de filtro.
  children: React.ReactNode
  tipo: TipoDoFiltro
  aoMudarTipo: (tipo: TipoDoFiltro) => void
  contaId: string
  aoMudarConta: (id: string) => void
  categoriaId: string | null
  aoMudarCategoria: (id: string | null) => void
  semCategoria: boolean
  aoMudarSemCategoria: (sem: boolean) => void
  /// Dia preso pela faixa de dias, se houver. Vira um chip removível: antes a
  /// pessoa tocava num dia e precisava achar o alternador "Mês" para voltar.
  diaEscolhido: string | null
  aoSoltarDia: () => void
  contas: ContaDoFiltro[]
  categorias: CategoriaSelecionavel[]
  /// Quantos lançamentos cada categoria tem na lista carregada. Serve só para
  /// ordenar a grade — as mais usadas primeiro —, nunca aparece como número.
  usoPorCategoria: Map<string, number>
  /// O que o servidor encontrou com os filtros de agora; `null` enquanto carrega.
  /// O total só vem quando o filtro é de um lado só: somar entradas com saídas
  /// num número sem sinal não diz nada.
  encontrados: { lancamentos: number; totalCentavos: number | null } | null
  aoLimpar: () => void
}) {
  const [aberta, setAberta] = useState(false)
  const [todasCategorias, setTodasCategorias] = useState(false)

  // Investimento fica fora: aplicação não recebe gasto nem salário, e seis
  // corretoras empurravam as contas de verdade para fora da folha.
  const contasDoDia = contas.filter((item) => item.tipo !== "INVESTIMENTO" || item.id === contaId)
  const conta = contas.find((item) => item.id === contaId)
  const categoria = categorias.find((item) => item.id === categoriaId)
  // O número no botão avisa que a lista está restrita mesmo quando o chip
  // ligado já saiu da tela, levado pela rolagem da linha.
  const ativos = [contaId, categoriaId, semCategoria, tipo !== "todos"].filter(Boolean).length

  // As categorias acompanham o tipo escolhido (em "Saídas", as de renda só
  // empurravam as de gasto) e vêm das mais usadas para as menos. A escolhida
  // entra na vista mesmo se estiver lá no fim, para a pessoa ver o que ligou.
  const categoriasDoTipo = categorias
    .filter((item) => tipo === "todos" || !item.tipo || item.tipo === tipo)
    .map((item, ordem) => ({ item, ordem, uso: usoPorCategoria.get(item.id) ?? 0 }))
    .sort((a, b) => b.uso - a.uso || a.ordem - b.ordem)
    .map(({ item }) => item)
  const cabe = categoriasDoTipo.length <= CATEGORIAS_A_VISTA + 1
  const aVista = todasCategorias || cabe ? categoriasDoTipo : categoriasDoTipo.slice(0, CATEGORIAS_A_VISTA)
  if (!todasCategorias && !cabe && categoria && !aVista.includes(categoria)) aVista[aVista.length - 1] = categoria

  return (
    <>
      <div className={estilos.buscaEFiltro}>
        {children}
        <button type="button" className={estilos.botaoFiltros} onClick={() => setAberta(true)} data-ativo={ativos > 0 || undefined}>
          <SlidersHorizontal aria-hidden className="size-4" />
          Filtros{ativos > 0 ? ` · ${ativos}` : ""}
        </button>
      </div>

      <div className={estilos.linha} role="toolbar" aria-label="Filtros rápidos">
        {diaEscolhido && (
          <button type="button" className={estilos.chip} data-ligado onClick={aoSoltarDia} aria-label={`Ver o mês inteiro em vez do dia ${Number(diaEscolhido.slice(8, 10))}`}>
            Dia {Number(diaEscolhido.slice(8, 10))} <X aria-hidden className="size-3.5" />
          </button>
        )}

        {TIPOS.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            className={estilos.chip}
            data-ligado={tipo === opcao.valor || undefined}
            aria-pressed={tipo === opcao.valor}
            onClick={() => aoMudarTipo(opcao.valor)}
          >
            {opcao.rotulo}
          </button>
        ))}

        {conta ? (
          <button type="button" className={estilos.chip} data-ligado onClick={() => aoMudarConta("")} aria-label={`Tirar o filtro da conta ${conta.nome}`}>
            <span className={estilos.nome}>{nomeCurtoDaConta(conta.nome)}</span> <X aria-hidden className="size-3.5" />
          </button>
        ) : (
          <button type="button" className={estilos.chip} onClick={() => setAberta(true)}>
            Conta <ChevronDown aria-hidden className="size-3.5" />
          </button>
        )}

        {categoria ? (
          <button type="button" className={estilos.chip} data-ligado onClick={() => aoMudarCategoria(null)} aria-label={`Tirar o filtro da categoria ${categoria.nome}`}>
            <span className={estilos.nome}>{categoria.nome}</span> <X aria-hidden className="size-3.5" />
          </button>
        ) : (
          <button type="button" className={estilos.chip} onClick={() => setAberta(true)}>
            Categoria <ChevronDown aria-hidden className="size-3.5" />
          </button>
        )}

        <button
          type="button"
          className={estilos.chip}
          data-ligado={semCategoria || undefined}
          aria-pressed={semCategoria}
          onClick={() => aoMudarSemCategoria(!semCategoria)}
        >
          Sem categoria
        </button>
      </div>

      <Dialog open={aberta} onOpenChange={setAberta}>
        <DialogContent largura="curta" className={estilos.folha}>
          <div className={estilos.corpo}>
            <span className={estilos.alca} aria-hidden />
            <header className={estilos.topo}>
              <DialogTitle className={estilos.titulo}>Filtrar</DialogTitle>
              <button type="button" className={estilos.limpar} onClick={aoLimpar} disabled={ativos === 0}>
                Limpar
              </button>
            </header>
            <DialogDescription className="sr-only">Tipo, conta ou cartão e categoria. A lista muda a cada toque.</DialogDescription>

            <section>
              <h3 className={estilos.rotulo}>Tipo</h3>
              <div className={estilos.segmento} role="radiogroup" aria-label="Tipo">
                {TIPOS.map((opcao) => (
                  <button key={opcao.valor} type="button" role="radio" aria-checked={tipo === opcao.valor} onClick={() => aoMudarTipo(opcao.valor)}>
                    {opcao.rotulo}
                  </button>
                ))}
              </div>
            </section>

            {contasDoDia.length > 0 && (
              <section>
                <h3 className={estilos.rotulo}>Conta ou cartão</h3>
                <div className={estilos.contas}>
                  {contasDoDia.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={estilos.chip}
                      data-ligado={item.id === contaId || undefined}
                      aria-pressed={item.id === contaId}
                      aria-label={item.nome}
                      onClick={() => aoMudarConta(item.id === contaId ? "" : item.id)}
                    >
                      <i className={estilos.bolinha} style={{ background: COR_DA_CONTA[item.cor ?? ""] ?? COR_DA_CONTA.blue }} aria-hidden />
                      <span className={estilos.nome}>{nomeCurtoDaConta(item.nome)}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className={estilos.rotulo}>Categoria</h3>
              {categoriasDoTipo.length === 0 ? (
                <p className={estilos.vazio}>
                  Nenhuma categoria cadastrada para este tipo. <Link href="/categorias">Cadastrar</Link>
                </p>
              ) : (
                <div className={estilos.grade} data-todas={todasCategorias || undefined}>
                  {aVista.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      data-ligado={item.id === categoriaId || undefined}
                      aria-pressed={item.id === categoriaId}
                      onClick={() => aoMudarCategoria(item.id === categoriaId ? null : item.id)}
                    >
                      <SimboloCategoria categoria={item} />
                      <span>{item.nome}</span>
                    </button>
                  ))}
                  {!cabe && (
                    <button type="button" onClick={() => setTodasCategorias((atual) => !atual)} aria-expanded={todasCategorias}>
                      <MoreHorizontal aria-hidden className="size-[19px]" />
                      <span>{todasCategorias ? "Menos" : "Outras"}</span>
                    </button>
                  )}
                </div>
              )}
            </section>

            <label className={estilos.interruptor}>
              <span>Só o que está sem categoria</span>
              <Switch checked={semCategoria} onCheckedChange={aoMudarSemCategoria} />
            </label>

            <button type="button" className={estilos.mostrar} onClick={() => setAberta(false)}>
              {encontrados === null
                ? "Atualizando…"
                : encontrados.lancamentos === 0
                  ? "Nada encontrado · voltar"
                  : `Mostrar ${encontrados.lancamentos} ${encontrados.lancamentos === 1 ? "lançamento" : "lançamentos"}${
                      encontrados.totalCentavos === null ? "" : ` · ${formatarMoeda(encontrados.totalCentavos)}`
                    }`}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

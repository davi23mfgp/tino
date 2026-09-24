"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, CreditCard, Landmark, PiggyBank, SlidersHorizontal, Wallet, X } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { SimboloCategoria, type CategoriaSelecionavel } from "@/components/seletor-categoria"
import { formatarMoeda } from "@/lib/dinheiro"
import estilos from "./filtros-do-extrato.module.css"

/**
 * Filtros do extrato (Davi, 24/09: opções A e B do canvas juntas).
 *
 * A tela antiga gastava cinco linhas de controles antes do primeiro
 * lançamento — dois alternadores, dois seletores e um "Mais filtros" que
 * escondia o único filtro que falta a quem está organizando o mês (o "sem
 * categoria"). Aqui o uso comum cabe numa linha que desliza (tipo, conta,
 * categoria, sem categoria) e o resto mora numa folha, que abre tanto pelo
 * botão "Filtros" quanto pelo toque em "Conta" ou "Categoria".
 *
 * O filtro vale no toque, sem botão de aplicar: a lista de trás já muda
 * enquanto a folha está aberta, e o botão do pé mostra quanto o filtro
 * encontrou — número que veio do servidor, não uma estimativa.
 */

export type TipoDoFiltro = "todos" | "RECEITA" | "DESPESA"
export type ContaDoFiltro = { id: string; nome: string; tipo?: string }

const TIPOS: { valor: TipoDoFiltro; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "RECEITA", rotulo: "Entradas" },
  { valor: "DESPESA", rotulo: "Saídas" },
]

function IconeDaConta({ tipo }: { tipo?: string }) {
  const Icone = tipo === "CARTAO_CREDITO" ? CreditCard : tipo === "POUPANCA" ? PiggyBank : tipo === "DINHEIRO" ? Wallet : Landmark
  return <Icone aria-hidden className="size-4 shrink-0" strokeWidth={1.8} />
}

export function FiltrosDoExtrato({
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
  encontrados,
  aoLimpar,
}: {
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
  /// O que o servidor encontrou com os filtros de agora; `null` enquanto carrega.
  /// O total só vem quando o filtro é de um lado só: somar entradas com saídas
  /// num número sem sinal não diz nada.
  encontrados: { lancamentos: number; totalCentavos: number | null } | null
  aoLimpar: () => void
}) {
  const [aberta, setAberta] = useState(false)

  // Investimento fica fora da folha: aplicação não recebe gasto nem salário,
  // e seis corretoras empurravam as contas de verdade para fora da tela.
  const contasDoDia = contas.filter((item) => item.tipo !== "INVESTIMENTO" || item.id === contaId)
  const conta = contas.find((item) => item.id === contaId)
  const categoria = categorias.find((item) => item.id === categoriaId)
  // O número no botão avisa que a lista está restrita mesmo quando o chip
  // ligado já saiu da tela, levado pela rolagem da linha.
  const ativos = [contaId, categoriaId, semCategoria, tipo !== "todos"].filter(Boolean).length

  // Na folha, as categorias acompanham o tipo escolhido: em "Saídas", as de
  // renda só empurravam as de gasto para baixo.
  const categoriasDoTipo = categorias.filter((item) => tipo === "todos" || !item.tipo || item.tipo === tipo)

  return (
    <>
      <div className={estilos.linha} role="toolbar" aria-label="Filtros rápidos">
        <button type="button" className={estilos.botaoFiltros} onClick={() => setAberta(true)} data-ativo={ativos > 0 || undefined}>
          <SlidersHorizontal aria-hidden className="size-4" />
          Filtros{ativos > 0 ? ` · ${ativos}` : ""}
        </button>

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
            <span className={estilos.nome}>{conta.nome}</span> <X aria-hidden className="size-3.5" />
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
                      onClick={() => aoMudarConta(item.id === contaId ? "" : item.id)}
                    >
                      <IconeDaConta tipo={item.tipo} />
                      <span className={estilos.nome}>{item.nome}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className={estilos.rotulo}>Categoria</h3>
              {categoriasDoTipo.length === 0 ? (
                <p className={estilos.vazio}>Nenhuma categoria cadastrada para este tipo.</p>
              ) : (
                <div className={estilos.grade}>
                  {categoriasDoTipo.map((item) => (
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
                </div>
              )}
              <Link href="/categorias" className={estilos.personalizar}>
                Personalizar categorias
              </Link>
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

"use client"

import { useEffect, useState } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { enviar } from "@/lib/cliente"
import { formatarDecimal, formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { competenciaAtual, rotuloCompetencia } from "@/lib/datas"
import type { DadosCartao } from "@/lib/cartoes"
import estilos from "./central-cartoes.module.css"

/**
 * Campo de dinheiro que só reformata quando sai do foco.
 *
 * Reformatar a cada tecla empurrava o cursor para o fim e impedia apagar o
 * meio do número.
 */
function CampoValor({ valor, aoMudar, rotulo }: { valor: number; aoMudar: (centavos: number) => void; rotulo: string }) {
  const [texto, setTexto] = useState(formatarDecimal(valor / 100, 2))
  const [editando, setEditando] = useState(false)
  useEffect(() => { if (!editando) setTexto(formatarDecimal(valor / 100, 2)) }, [valor, editando])
  return (
    <span className={estilos.campoValor}>
      <small>R$</small>
      <input
        aria-label={rotulo}
        inputMode="decimal"
        value={texto}
        onFocus={() => setEditando(true)}
        onChange={(evento) => setTexto(evento.target.value)}
        onBlur={() => { aoMudar(Math.max(0, paraCentavos(texto))); setEditando(false) }}
        onKeyDown={(evento) => { if (evento.key === "Enter") evento.currentTarget.blur() }}
      />
    </span>
  )
}

export function OrcamentoDoCartao({
  cartao,
  mes,
  categorias,
  gastos,
  aoSalvar,
}: {
  cartao: DadosCartao
  mes: string
  categorias: { id: string; nome: string }[]
  gastos: { id: string; nome: string; totalCentavos: number }[]
  aoSalvar: () => void
}) {
  const existente = cartao.orcamentos?.find((plano) => plano.competencia === mes)
  // O valor legado da conta só inicializa o mês corrente, e só enquanto não
  // existir nenhum plano mensal salvo.
  const inicial = existente?.totalCentavos ?? (!cartao.orcamentos?.length && mes === competenciaAtual() ? cartao.orcamentoMensalCentavos ?? 0 : 0)

  const [total, setTotal] = useState(inicial)
  const [linhas, setLinhas] = useState<Record<string, number>>(
    Object.fromEntries(existente?.categorias.map((linha) => [linha.categoriaId, linha.limiteCentavos]) ?? []),
  )
  const [erro, setErro] = useState("")
  const [estado, setEstado] = useState<"edicao" | "salvando" | "salvo">("edicao")

  const gastoTotal = gastos.reduce((soma, linha) => soma + linha.totalCentavos, 0)
  const distribuido = Object.values(linhas).reduce((soma, valor) => soma + valor, 0)
  const ativas = categorias.filter((categoria) => categoria.id in linhas || gastos.some((gasto) => gasto.id === categoria.id))
  const usado = total > 0 ? Math.min(100, (gastoTotal / total) * 100) : 0
  const disponiveis = categorias.filter((categoria) => !ativas.some((ativa) => ativa.id === categoria.id))

  function alterarTotal(valor: number) { setTotal(valor); setEstado("edicao") }
  function alterarCategoria(id: string, valor: number) { setLinhas((atual) => ({ ...atual, [id]: valor })); setEstado("edicao") }
  function removerCategoria(id: string) {
    setLinhas((atual) => { const proximo = { ...atual }; delete proximo[id]; return proximo })
    setEstado("edicao")
  }

  async function salvar() {
    if (estado === "salvando") return
    if (distribuido > total) { setErro("Reduza as categorias ou aumente o total do mês."); return }
    setErro(""); setEstado("salvando")
    try {
      await enviar(
        `/api/cartoes/${cartao.id}/orcamento`,
        { competencia: mes, totalCentavos: total, categorias: Object.entries(linhas).map(([categoriaId, limiteCentavos]) => ({ categoriaId, limiteCentavos })) },
        "PUT",
      )
      setEstado("salvo"); aoSalvar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar."); setEstado("edicao")
    }
  }

  // Sem plano ainda: a tela faz uma pergunta e oferece pontos de partida, em
  // vez de abrir com quatro números zerados e um slider sem referência.
  if (total === 0) {
    const sugestoes = [gastoTotal, Math.round(gastoTotal * 1.1), cartao.limiteCentavos ? Math.round(cartao.limiteCentavos * 0.3) : 0]
      .filter((valor, indice, lista) => valor > 0 && lista.indexOf(valor) === indice)

    return (
      <section className={estilos.painel}>
        <header className={estilos.cabecalho}>
          <div>
            <h2>Quanto você quer gastar neste cartão em {rotuloCompetencia(mes)}?</h2>
            <p>Isto é um teto seu, para o mês. Não muda o limite que o banco te deu.</p>
          </div>
        </header>

        <div className={estilos.definir}>
          <CampoValor valor={total} aoMudar={alterarTotal} rotulo="Total do mês" />
          <Button onClick={() => void salvar()} disabled={total === 0 || estado === "salvando"}>
            {estado === "salvando" ? "Salvando…" : "Definir orçamento"}
          </Button>
        </div>

        {sugestoes.length > 0 && (
          <div className={estilos.sugestoes}>
            <span>Pontos de partida:</span>
            {sugestoes.map((valor, indice) => (
              <button key={valor} type="button" onClick={() => alterarTotal(valor)}>
                {formatarMoeda(valor)}
                <small>{indice === 0 ? "o que você já gastou" : indice === 1 ? "com 10% de folga" : "30% do limite do banco"}</small>
              </button>
            ))}
          </div>
        )}

        {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
      </section>
    )
  }

  return (
    <section className={estilos.painel}>
      <header className={estilos.cabecalho}>
        <div>
          <h2>Seu plano de {rotuloCompetencia(mes)}</h2>
          <p>Teto que você definiu para este cartão. O limite do banco não muda.</p>
        </div>
        <span className={estilos.etiqueta}>{Math.round((gastoTotal / total) * 100)}% usado</span>
      </header>

      {/* Uma frase responde a pergunta do mês; a barra mostra onde ela está. */}
      <p className={estilos.frasePlano}>
        Você já usou <b>{formatarMoeda(gastoTotal)}</b> de {formatarMoeda(total)}.{" "}
        {gastoTotal > total
          ? <span className={estilos.estourou}>Passou {formatarMoeda(gastoTotal - total)} do que planejou.</span>
          : <>Ainda cabem <b>{formatarMoeda(total - gastoTotal)}</b> neste mês.</>}
      </p>
      <div className={estilos.trilhoPlano} data-estourou={gastoTotal > total}><i style={{ width: `${usado}%` }} /></div>

      <div className={estilos.linhaTotal}>
        <span>Mudar o teto do mês</span>
        <CampoValor valor={total} aoMudar={alterarTotal} rotulo="Total do mês" />
      </div>

      <div className={estilos.cabecalhoCategorias}>
        <h3>Limite por categoria <small>{formatarMoeda(Math.max(0, total - distribuido))} ainda sem destino</small></h3>
        {disponiveis.length > 0 && (
          <div className={estilos.adicionarCategoria}>
            <Select value="" onValueChange={(valor) => alterarCategoria(valor, 0)}>
              <SelectTrigger aria-label="Adicionar categoria" className="w-[210px]"><SelectValue placeholder="Adicionar categoria" /></SelectTrigger>
              <SelectContent>{disponiveis.map((categoria) => <SelectItem key={categoria.id} value={categoria.id}>{categoria.nome}</SelectItem>)}</SelectContent>
            </Select>
            <Plus size={16} aria-hidden />
          </div>
        )}
      </div>

      <ul className={estilos.listaLimites}>
        {ativas.map((categoria) => {
          const limite = linhas[categoria.id] ?? 0
          const gasto = gastos.find((linha) => linha.id === categoria.id)?.totalCentavos ?? 0
          const proporcao = limite > 0 ? Math.min(100, (gasto / limite) * 100) : 0
          return (
            <li key={categoria.id} data-estourou={limite > 0 && gasto > limite}>
              <span className={estilos.nomeLimite}>
                <strong>{categoria.nome}</strong>
                <small>{formatarMoeda(gasto)} gastos{limite > 0 ? ` de ${formatarMoeda(limite)}` : " · sem limite definido"}</small>
              </span>
              <CampoValor valor={limite} aoMudar={(valor) => alterarCategoria(categoria.id, valor)} rotulo={`Limite de ${categoria.nome}`} />
              <button type="button" aria-label={`Tirar ${categoria.nome} do plano`} onClick={() => removerCategoria(categoria.id)} className={estilos.tirar}><X size={15} /></button>
              <span className={estilos.trilhoLimite}><i style={{ width: `${proporcao}%` }} /></span>
            </li>
          )
        })}
      </ul>

      {!ativas.length && <p className={estilos.legenda}>Sem limites por categoria. O teto do mês já vale sozinho.</p>}
      {(erro || distribuido > total) && (
        <p role="alert" className={estilos.erro}>{erro || `As categorias somam ${formatarMoeda(distribuido - total)} a mais que o teto do mês.`}</p>
      )}

      <footer className={estilos.rodapeOrcamento}>
        <span role="status">{estado === "salvo" ? "Orçamento salvo." : "As mudanças ainda não foram salvas."}</span>
        <Button disabled={estado === "salvando" || distribuido > total} onClick={() => void salvar()}>
          {estado === "salvando" ? "Salvando…" : "Salvar orçamento"}
        </Button>
      </footer>
    </section>
  )
}

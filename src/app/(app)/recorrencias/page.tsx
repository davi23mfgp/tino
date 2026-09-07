"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Plus, Trash2 } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarData } from "@/lib/datas"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { Cartao, Metrica, Vazio } from "@/components/ui/painel"
import { showToast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

/**
 * Contas fixas.
 *
 * É a tela que faz a projeção valer alguma coisa: sem saber o que sai todo mês
 * de qualquer jeito, o app só sabe olhar para trás. Aluguel, luz, assinatura e
 * salário entram aqui uma vez e alimentam projeção, reserva e plano.
 */

interface Recorrencia {
  id: string
  descricao: string
  valorCentavos: number
  tipo: "RECEITA" | "DESPESA"
  periodicidade: string
  diaVencimento: number
  proximaData: string
  valorVariavel: boolean
  ativa: boolean
  conta: { nome: string }
  categoria: { nome: string } | null
}

interface Resposta {
  recorrencias: Recorrencia[]
  custoFixoMensalCentavos: number
  receitaFixaMensalCentavos: number
}

const PERIODOS = [
  { valor: "MENSAL", rotulo: "todo mês" },
  { valor: "BIMESTRAL", rotulo: "a cada 2 meses" },
  { valor: "TRIMESTRAL", rotulo: "a cada 3 meses" },
  { valor: "SEMESTRAL", rotulo: "a cada 6 meses" },
  { valor: "ANUAL", rotulo: "uma vez por ano" },
]

const campo = "w-full rounded-[var(--raio-campo)] border border-pauta bg-background px-3.5 py-2.5 text-[13px] outline-none focus:border-acao/50"

const VAZIO = {
  descricao: "",
  valor: "",
  tipo: "DESPESA" as "RECEITA" | "DESPESA",
  periodicidade: "MENSAL",
  dia: "10",
  contaId: "",
  categoriaId: "",
  variavel: false,
}

export default function Recorrencias() {
  const [dados, setDados] = useState<Resposta | null>(null)
  const [contas, setContas] = useState<{ id: string; nome: string }[]>([])
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([])
  const [nova, setNova] = useState(VAZIO)
  const [abrir, setAbrir] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(async () => {
    const [resposta, listaContas, listaCategorias] = await Promise.all([
      buscar<Resposta>("/api/recorrencias"),
      buscar<{ id: string; nome: string }[]>("/api/contas"),
      buscar<{ id: string; nome: string }[]>("/api/categorias"),
    ])
    setDados(resposta)
    setContas(listaContas)
    setCategorias(listaCategorias)
    setNova((atual) => ({ ...atual, contaId: atual.contaId || listaContas[0]?.id || "" }))
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function criar(evento: React.FormEvent) {
    evento.preventDefault()
    setOcupado(true)
    try {
      await enviar("/api/recorrencias", {
        descricao: nova.descricao,
        valorCentavos: paraCentavos(nova.valor),
        tipo: nova.tipo,
        periodicidade: nova.periodicidade,
        diaVencimento: Number(nova.dia) || 10,
        contaId: nova.contaId,
        categoriaId: nova.categoriaId || undefined,
        valorVariavel: nova.variavel,
      })
      setNova({ ...VAZIO, contaId: contas[0]?.id ?? "" })
      setAbrir(false)
      await carregar()
    } finally {
      setOcupado(false)
    }
  }

  /** Lança a ocorrência do período. Idempotente: dois cliques não geram duas contas. */
  async function lancar(recorrencia: Recorrencia) {
    setOcupado(true)
    try {
      await enviar("/api/recorrencias", { id: recorrencia.id }, "PUT")
      await carregar()
    } finally {
      setOcupado(false)
    }
  }

  /**
   * "Desfazer em vez de confirmar" — item 4 do redesign de 07/09/2026. Em
   * vez de perguntar "tem certeza?" antes de remover, a linha já some da
   * tela na hora, e o DELETE de verdade só sai do navegador depois de 5s
   * sem ninguém desfazer. Clicou em "Desfazer": a linha volta, e a
   * requisição de exclusão nem chega a ser feita.
   */
  function remover(recorrencia: Recorrencia) {
    if (!dados) return
    const idAlvo = recorrencia.id
    setDados({ ...dados, recorrencias: dados.recorrencias.filter((r) => r.id !== idAlvo) })

    let desfeito = false
    showToast(`"${recorrencia.descricao}" removida`, {
      action: {
        label: "Desfazer",
        onClick: () => {
          desfeito = true
          setDados((atual) =>
            atual && !atual.recorrencias.some((r) => r.id === idAlvo)
              ? { ...atual, recorrencias: [...atual.recorrencias, recorrencia] }
              : atual,
          )
        },
      },
    })

    setTimeout(async () => {
      if (desfeito) return
      await buscar(`/api/recorrencias?id=${idAlvo}`, { method: "DELETE" })
    }, 5000)
  }

  const ativas = dados?.recorrencias.filter((linha) => linha.ativa) ?? []
  const despesas = ativas.filter((linha) => linha.tipo === "DESPESA")
  const receitas = ativas.filter((linha) => linha.tipo === "RECEITA")
  const hoje = new Date()

  return (
    <div className="space-y-4">
      <Cartao
        titulo="Contas fixas"
        acao={
          <button onClick={() => setAbrir((atual) => !atual)} className="flex items-center gap-1.5">
            <Plus className="size-3.5" /> nova
          </button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Metrica
            rotulo="Sai todo mês"
            valor={formatarMoeda(dados?.custoFixoMensalCentavos ?? 0)}
            detalhe="antes de qualquer escolha sua"
            tom="negativo"
          />
          <Metrica rotulo="Entra todo mês" valor={formatarMoeda(dados?.receitaFixaMensalCentavos ?? 0)} tom="positivo" />
          <Metrica
            rotulo="Sobra fixa"
            valor={formatarMoeda((dados?.receitaFixaMensalCentavos ?? 0) - (dados?.custoFixoMensalCentavos ?? 0))}
            tom={
              (dados?.receitaFixaMensalCentavos ?? 0) - (dados?.custoFixoMensalCentavos ?? 0) >= 0
                ? "positivo"
                : "negativo"
            }
          />
        </div>

        <p className="mt-3 text-[12px] leading-relaxed text-muted-fg">
          O custo fixo é a base de dois cálculos: quanto sua reserva de emergência precisa ter, e o piso da projeção de
          caixa. Cadastrar aqui melhora as duas coisas de uma vez.
        </p>

        {abrir && (
          <form onSubmit={criar} className="mt-4 grid gap-2 sm:grid-cols-3">
            <input
              value={nova.descricao}
              onChange={(e) => setNova({ ...nova, descricao: e.target.value })}
              placeholder="o que é (aluguel, luz, salário)"
              required
              className={cn(campo, "sm:col-span-2")}
            />
            <select
              value={nova.tipo}
              onChange={(e) => setNova({ ...nova, tipo: e.target.value as "RECEITA" | "DESPESA" })}
              className={campo}
            >
              <option value="DESPESA">sai da conta</option>
              <option value="RECEITA">entra na conta</option>
            </select>
            <input
              value={nova.valor}
              onChange={(e) => setNova({ ...nova, valor: e.target.value })}
              placeholder="valor"
              required
              className={campo}
              inputMode="decimal"
            />
            <select
              value={nova.periodicidade}
              onChange={(e) => setNova({ ...nova, periodicidade: e.target.value })}
              className={campo}
            >
              {PERIODOS.map((periodo) => (
                <option key={periodo.valor} value={periodo.valor}>
                  {periodo.rotulo}
                </option>
              ))}
            </select>
            <input
              value={nova.dia}
              onChange={(e) => setNova({ ...nova, dia: e.target.value })}
              placeholder="dia do vencimento"
              className={campo}
              inputMode="numeric"
            />
            <select value={nova.contaId} onChange={(e) => setNova({ ...nova, contaId: e.target.value })} className={campo}>
              {contas.map((conta) => (
                <option key={conta.id} value={conta.id}>
                  {conta.nome}
                </option>
              ))}
            </select>
            <select
              value={nova.categoriaId}
              onChange={(e) => setNova({ ...nova, categoriaId: e.target.value })}
              className={cn(campo, "sm:col-span-2")}
            >
              <option value="">sem categoria</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-[12px] sm:col-span-3">
              <input
                type="checkbox"
                checked={nova.variavel}
                onChange={(e) => setNova({ ...nova, variavel: e.target.checked })}
              />
              o valor muda todo mês (luz, água) — a projeção usa o último valor lançado
            </label>

            <button
              disabled={ocupado}
              className="rounded-[var(--raio-pilula)] bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground disabled:opacity-40 sm:col-span-3"
            >
              Adicionar conta fixa
            </button>
          </form>
        )}
      </Cartao>

      {[
        { titulo: "Sai todo mês", lista: despesas },
        { titulo: "Entra todo mês", lista: receitas },
      ].map((bloco) =>
        bloco.lista.length > 0 ? (
          <Cartao key={bloco.titulo} titulo={bloco.titulo}>
            <div className="space-y-2">
              {bloco.lista.map((recorrencia) => {
                const proxima = new Date(recorrencia.proximaData)
                const atrasada = proxima < hoje

                return (
                  <div
                    key={recorrencia.id}
                    className={cn(
                      "flex flex-wrap items-center gap-3 rounded-2xl border p-3",
                      atrasada ? "border-atencao/40 bg-atencao/5" : "border-pauta",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px]">{recorrencia.descricao}</p>
                      <p className="text-[11px] text-muted-fg">
                        {PERIODOS.find((p) => p.valor === recorrencia.periodicidade)?.rotulo} · dia{" "}
                        {recorrencia.diaVencimento} · {recorrencia.conta.nome}
                        {recorrencia.categoria && ` · ${recorrencia.categoria.nome}`}
                        {recorrencia.valorVariavel && " · valor variável"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[14px] tabular-nums">{formatarMoeda(recorrencia.valorCentavos)}</p>
                      <p className={cn("text-[11px]", atrasada ? "text-atencao" : "text-muted-fg")}>
                        {atrasada ? "venceu" : "vence"} {formatarData(proxima)}
                      </p>
                    </div>

                    <button
                      onClick={() => lancar(recorrencia)}
                      disabled={ocupado}
                      className="rounded-full border border-pauta px-3 py-1.5 text-[11px] transition hover:border-positivo/40 hover:text-positivo disabled:opacity-40"
                      title="lançar a ocorrência deste período"
                    >
                      <Check className="size-3.5" />
                    </button>
                    <button
                      onClick={() => remover(recorrencia)}
                      className="text-muted-fg transition hover:text-negativo"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </Cartao>
        ) : null,
      )}

      {ativas.length === 0 && (
        <Cartao>
          <Vazio
            titulo="Nenhuma conta fixa cadastrada"
            texto="Aluguel, luz, internet, assinatura, salário. Cinco minutos aqui deixam a projeção inteira mais precisa."
          />
        </Cartao>
      )}
    </div>
  )
}

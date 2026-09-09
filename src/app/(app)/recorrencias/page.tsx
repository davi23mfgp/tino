"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Plus, Trash2 } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarData } from "@/lib/datas"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { Cartao, Metrica, Vazio } from "@/components/ui/painel"
import { showToast } from "@/components/ui/toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  const [erro, setErro] = useState("")
  const [erroFormulario, setErroFormulario] = useState("")

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
    carregar().catch((erro: unknown) => setErro(erro instanceof Error ? erro.message : "Não foi possível carregar as contas."))
  }, [carregar])

  async function criar(evento: React.FormEvent) {
    evento.preventDefault()
    if (ocupado) return
    setErroFormulario("")
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
    } catch (erro) {
      setErroFormulario(erro instanceof Error ? erro.message : "Não foi possível salvar. Tente novamente.")
    } finally {
      setOcupado(false)
    }
  }

  /** Lança a ocorrência do período. Idempotente: dois cliques não geram duas contas. */
  async function lancar(recorrencia: Recorrencia) {
    if (ocupado) return
    setOcupado(true)
    try {
      await enviar("/api/recorrencias", { id: recorrencia.id }, "PUT")
      await carregar()
    } catch (erro) {
      showToast("Não foi possível concluir", { description: erro instanceof Error ? erro.message : "Tente novamente.", variant: "error" })
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
      try {
        await buscar(`/api/recorrencias?id=${idAlvo}`, { method: "DELETE" })
        await carregar()
      } catch (erro) {
        setDados((atual) => atual && !atual.recorrencias.some((r) => r.id === idAlvo) ? { ...atual, recorrencias: [...atual.recorrencias, recorrencia] } : atual)
        showToast("Não foi possível remover a conta", { description: erro instanceof Error ? erro.message : "Tente novamente.", variant: "error" })
      }
    }, 5000)
  }

  if (!dados) return <Cartao titulo="Contas fixas">
    {erro ? <div role="alert"><p className="text-sm text-muted-fg">{erro}</p><button className="mt-3 min-h-11 text-acao" onClick={() => { setErro(""); carregar().catch((erro: unknown) => setErro(erro instanceof Error ? erro.message : "Não foi possível carregar as contas.")) }}>Tentar novamente</button></div> : <p role="status" className="text-sm text-muted-fg">Carregando suas contas…</p>}
  </Cartao>

  const ativas = dados?.recorrencias.filter((linha) => linha.ativa) ?? []
  const despesas = ativas.filter((linha) => linha.tipo === "DESPESA")
  const receitas = ativas.filter((linha) => linha.tipo === "RECEITA")
  const hoje = new Date()

  return (
    <div className="space-y-4">
      <Cartao
        titulo="Contas fixas"
        acao={
          <button onClick={() => setAbrir((atual) => !atual)} className="flex min-h-11 items-center gap-1.5">
            <Plus className="size-4" /> Nova conta
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
          Cadastre uma vez o que entra e sai com frequência. O Tino usa essas contas para prever os próximos meses.
        </p>

        <Dialog open={abrir} onOpenChange={(aberto) => { if (!ocupado) setAbrir(aberto) }}>
          <DialogContent>
          <DialogHeader><DialogTitle>Nova conta fixa</DialogTitle></DialogHeader>
          <form onSubmit={criar} className="grid gap-3 px-5 py-4 sm:grid-cols-2 sm:px-6">
            <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-fg">Descrição
                <input
              value={nova.descricao}
              onChange={(e) => setNova({ ...nova, descricao: e.target.value })}
              placeholder="o que é (aluguel, luz, salário)"
              required
              className={cn(campo, "sm:col-span-2")}
            />
              </label>
            <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-fg">Entrada ou saída
<select
              value={nova.tipo}
              onChange={(e) => setNova({ ...nova, tipo: e.target.value as "RECEITA" | "DESPESA" })}
              className={campo}
            >
              <option value="DESPESA">sai da conta</option>
              <option value="RECEITA">entra na conta</option>
            </select>
              </label>
            <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-fg">Valor (R$)
                <input
              value={nova.valor}
              onChange={(e) => setNova({ ...nova, valor: e.target.value })}
              placeholder="valor"
              required
              className={campo}
              inputMode="decimal"
            />
              </label>
            <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-fg">Repete a cada
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
              </label>
            <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-fg">Dia do vencimento
                <input
              value={nova.dia}
              onChange={(e) => setNova({ ...nova, dia: e.target.value })}
              placeholder="dia do vencimento"
              className={campo}
              inputMode="numeric"
            />
              </label>
            <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-fg">Conta
<select value={nova.contaId} onChange={(e) => setNova({ ...nova, contaId: e.target.value })} className={campo}>
              {contas.map((conta) => (
                <option key={conta.id} value={conta.id}>
                  {conta.nome}
                </option>
              ))}
            </select>
              </label>
            <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-fg">Categoria (opcional)
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
              </label>

            {contas.length === 0 && <p role="status" className="text-sm text-muted-fg sm:col-span-2">Cadastre uma conta em <a href="/configuracoes" className="underline">Configurações</a> antes de adicionar uma conta fixa.</p>}
            <label className="flex min-h-11 items-center gap-2 text-[12px] sm:col-span-2">
              <input
                type="checkbox"
                checked={nova.variavel}
                onChange={(e) => setNova({ ...nova, variavel: e.target.checked })}
              />
              o valor muda todo mês (luz, água) — a projeção usa o último valor lançado
            </label>

            {erroFormulario && <p role="alert" className="text-sm text-negativo sm:col-span-2">{erroFormulario}</p>}
            <button
              disabled={ocupado || !nova.contaId}
              className="min-h-11 rounded-[var(--raio-pilula)] bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground disabled:opacity-40 sm:col-span-2"
            >
              {ocupado ? "Salvando…" : "Adicionar conta fixa"}
            </button>
          </form>
          </DialogContent>
        </Dialog>
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
                      className="flex min-h-11 items-center gap-2 rounded-full border border-pauta px-3 py-2 text-xs transition hover:border-positivo/40 hover:text-positivo disabled:opacity-40"
                      title="lançar a ocorrência deste período"
                    >
                      <Check className="size-4" /> Lançar
                    </button>
                    <button
                      onClick={() => remover(recorrencia)}
                      aria-label={`Remover ${recorrencia.descricao}`}
                      className="flex min-h-11 min-w-11 items-center justify-center text-muted-fg transition hover:text-negativo"
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

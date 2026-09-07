"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { Cartao, Metrica, Vazio } from "@/components/ui/painel"
import { showToast } from "@/components/ui/toast"
import { TrilhaLoja } from "@/components/trilha-loja"

/**
 * O que a loja paga para existir.
 *
 * Separado das despesas pessoais de propósito: misturar o aluguel do box com o
 * aluguel de casa é o que faz o MEI achar que lucrou quando só girou dinheiro.
 *
 * Vencido e "vence esta semana" aparecem separados — uma já é problema, a outra
 * ainda é aviso, e juntar as duas faz a pessoa parar de olhar.
 */

interface Conta {
  id: string
  descricao: string
  categoria: string
  valorCentavos: number
  vencimento: string
  paga: boolean
  mensal: boolean
}

interface Resposta {
  contas: Conta[]
  resumo: { abertoCentavos: number; vencidoCentavos: number; daSemanaCentavos: number }
}

const CATEGORIAS = [
  { valor: "ALUGUEL", rotulo: "Aluguel" },
  { valor: "CONDOMINIO", rotulo: "Condomínio" },
  { valor: "FORNECEDOR", rotulo: "Fornecedor" },
  { valor: "ENERGIA", rotulo: "Luz, água, internet" },
  { valor: "MAQUININHA", rotulo: "Maquininha" },
  { valor: "IMPOSTO", rotulo: "Imposto" },
  { valor: "FUNCIONARIO", rotulo: "Funcionário" },
  { valor: "OUTRO", rotulo: "Outro" },
]

const campo = "rounded-xl border border-pauta bg-background px-3 py-2 text-[13px] outline-none focus:border-positivo/50"

const hoje = () => new Date().toISOString().slice(0, 10)
const VAZIO = { descricao: "", categoria: "ALUGUEL", valor: "", vencimento: hoje(), mensal: true }

export default function ContasDaLoja() {
  const [dados, setDados] = useState<Resposta | null>(null)
  const [nova, setNova] = useState(VAZIO)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setDados(await buscar<Resposta>("/api/loja/contas"))
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function criar(evento: React.FormEvent) {
    evento.preventDefault()
    setOcupado(true)
    setErro(null)

    try {
      await enviar("/api/loja/contas", {
        descricao: nova.descricao,
        categoria: nova.categoria,
        valorCentavos: paraCentavos(nova.valor),
        vencimento: nova.vencimento,
        mensal: nova.mensal,
      })
      setNova({ ...VAZIO, vencimento: nova.vencimento })
      await carregar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui lançar a conta.")
    } finally {
      setOcupado(false)
    }
  }

  async function pagar(id: string) {
    setOcupado(true)
    try {
      await enviar("/api/loja/contas", { id }, "PATCH")
      await carregar()
    } finally {
      setOcupado(false)
    }
  }

  /**
   * "Desfazer em vez de confirmar" — mesmo padrão de `/recorrencias`. A
   * conta some da lista na hora; o DELETE de verdade só sai depois de 5s
   * sem ninguém desfazer.
   */
  function apagar(conta: Conta) {
    setDados((atual) => (atual ? { ...atual, contas: atual.contas.filter((c) => c.id !== conta.id) } : atual))

    let desfeito = false
    showToast(`"${conta.descricao}" apagada`, {
      action: {
        label: "Desfazer",
        onClick: () => {
          desfeito = true
          setDados((atual) =>
            atual && !atual.contas.some((c) => c.id === conta.id)
              ? { ...atual, contas: [...atual.contas, conta] }
              : atual,
          )
        },
      },
    })

    setTimeout(async () => {
      if (desfeito) return
      await buscar(`/api/loja/contas?id=${conta.id}`, { method: "DELETE" })
    }, 5000)
  }

  const contas = dados?.contas ?? []
  const abertas = contas.filter((conta) => !conta.paga)
  const pagas = contas.filter((conta) => conta.paga).slice(0, 12)
  const agora = new Date()

  return (
    <div className="space-y-4">
      <TrilhaLoja pagina="Contas a pagar" />
      <Cartao titulo="Contas da loja">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Metrica rotulo="Em aberto" valor={formatarMoeda(dados?.resumo.abertoCentavos ?? 0)} />
          <Metrica
            rotulo="Vencido"
            valor={formatarMoeda(dados?.resumo.vencidoCentavos ?? 0)}
            tom={dados?.resumo.vencidoCentavos ? "negativo" : "neutro"}
          />
          <Metrica
            rotulo="Vence esta semana"
            valor={formatarMoeda(dados?.resumo.daSemanaCentavos ?? 0)}
            tom={dados?.resumo.daSemanaCentavos ? "atencao" : "neutro"}
          />
        </div>
      </Cartao>

      <Cartao titulo="Lançar conta">
        <form onSubmit={criar} className="grid gap-3 sm:grid-cols-5">
          <label className="flex flex-col gap-1.5 text-[12px] text-muted-fg sm:col-span-2">
            do que é
            <input
              required
              value={nova.descricao}
              onChange={(evento) => setNova({ ...nova, descricao: evento.target.value })}
              placeholder="aluguel do box"
              className={campo}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-[12px] text-muted-fg">
            tipo
            <select
              value={nova.categoria}
              onChange={(evento) => setNova({ ...nova, categoria: evento.target.value })}
              className={campo}
            >
              {CATEGORIAS.map((categoria) => (
                <option key={categoria.valor} value={categoria.valor}>
                  {categoria.rotulo}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-[12px] text-muted-fg">
            quanto
            <input
              required
              inputMode="decimal"
              placeholder="0,00"
              value={nova.valor}
              onChange={(evento) => setNova({ ...nova, valor: evento.target.value })}
              className={campo}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-[12px] text-muted-fg">
            vence em
            <input
              type="date"
              required
              value={nova.vencimento}
              onChange={(evento) => setNova({ ...nova, vencimento: evento.target.value })}
              className={campo}
            />
          </label>

          <label className="flex items-center gap-2 text-[13px] sm:col-span-3">
            <input
              type="checkbox"
              checked={nova.mensal}
              onChange={(evento) => setNova({ ...nova, mensal: evento.target.checked })}
            />
            Todo mês — a próxima nasce sozinha quando eu pagar esta
          </label>

          <div className="flex items-end justify-end sm:col-span-2">
            <button
              type="submit"
              disabled={ocupado}
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground disabled:opacity-50"
            >
              <Plus className="size-4" /> lançar
            </button>
          </div>

          {erro && <p className="text-[13px] text-negativo sm:col-span-5">{erro}</p>}
        </form>
      </Cartao>

      <Cartao titulo="A pagar">
        {abertas.length === 0 ? (
          <Vazio
            titulo="Nenhuma conta em aberto"
            texto="Lance o aluguel, o condomínio e o fornecedor. Com eles, o app consegue dizer o lucro de verdade."
          />
        ) : (
          <div className="divide-y divide-pauta">
            {abertas.map((conta) => {
              const vencimento = new Date(conta.vencimento)
              const vencida = vencimento < agora

              return (
                <div key={conta.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {conta.descricao}
                      {conta.mensal && <span className="ml-2 text-[11px] text-muted-fg">todo mês</span>}
                    </p>
                    <p className={`text-[12px] ${vencida ? "text-negativo" : "text-muted-fg"}`}>
                      {vencida ? "venceu em " : "vence em "}
                      {vencimento.toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <span className={`numero ${vencida ? "text-negativo" : ""}`}>{formatarMoeda(conta.valorCentavos)}</span>

                  <button
                    onClick={() => pagar(conta.id)}
                    disabled={ocupado}
                    className="rounded-full border border-positivo/40 px-3 py-1 text-[12px] text-positivo disabled:opacity-50"
                  >
                    paguei
                  </button>
                  <button
                    onClick={() => apagar(conta)}
                    aria-label={`apagar ${conta.descricao}`}
                    className="text-muted-fg hover:text-negativo"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Cartao>

      {pagas.length > 0 && (
        <Cartao titulo="Pagas">
          <div className="divide-y divide-pauta">
            {pagas.map((conta) => (
              <div key={conta.id} className="flex items-center justify-between gap-3 py-2.5 text-sm text-muted-fg">
                <span>{conta.descricao}</span>
                <span className="numero">{formatarMoeda(conta.valorCentavos)}</span>
              </div>
            ))}
          </div>
        </Cartao>
      )}
    </div>
  )
}

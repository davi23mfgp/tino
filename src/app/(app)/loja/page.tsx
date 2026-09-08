"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { Cartao, Metrica, Valor, Vazio } from "@/components/ui/painel"
import { conferirVenda, totalDaVenda } from "@/lib/loja/venda"
import type { FormaPagamento, ItemDaVenda, PagamentoInformado, RegraDeRecebimento } from "@/lib/loja/venda"

/**
 * Balcão.
 *
 * A tela é a venda. Tudo que não for fechar a venda em poucos toques desce ou
 * sai — o concorrente aqui é o caderno, que abre na hora e não pede cadastro.
 *
 * O cálculo mostrado vem do mesmo módulo que o servidor usa para gravar
 * (`@/lib/loja/venda`), então o que o cliente vê no visor é o que vai ser
 * registrado. Recalcular na tela com outra fórmula é como dois saldos
 * diferentes para a mesma conta.
 */

interface Produto {
  id: string
  nome: string
  precoCentavos: number
}

interface Caixa {
  id: string
  aberturaCentavos: number
  resumo: {
    vendidoCentavos: number
    emDinheiroCentavos: number
    sangriaCentavos: number
    esperadoNaGavetaCentavos: number
  }
}

interface Estado {
  loja: { id: string; nome: string }
  produtos: Produto[]
  regras: RegraDeRecebimento[]
  caixa: Caixa | null
  ultimasVendas: {
    id: string
    numero: number
    totalCentavos: number
    criadoEm: string
    notaFiscal: { status: "PENDENTE" | "EMITIDA" | "REJEITADA" | "CANCELADA" } | null
  }[]
  resumo: {
    vendas: number
    brutoCentavos: number
    liquidoCentavos: number
    taxasCentavos: number
    recebidoCentavos: number
    aReceberCentavos: number
    fiadoCentavos: number
  }
  aCair: { dia: string; valorCentavos: number }[]
}

const FORMAS: { valor: FormaPagamento; rotulo: string }[] = [
  { valor: "DINHEIRO", rotulo: "Dinheiro" },
  { valor: "PIX", rotulo: "Pix" },
  { valor: "DEBITO", rotulo: "Débito" },
  { valor: "CREDITO_VISTA", rotulo: "Crédito" },
  { valor: "CREDITO_PARCELADO", rotulo: "Crédito parcelado" },
  { valor: "FIADO", rotulo: "Fiado" },
]

const campo = "rounded-[var(--raio-campo)] border border-pauta bg-background px-3.5 py-2.5 text-[13px] outline-none focus:border-acao/50"

export default function Loja() {
  const [dados, setDados] = useState<Estado | null>(null)
  const [carrinho, setCarrinho] = useState<(ItemDaVenda & { produtoId?: string })[]>([])
  const [avulso, setAvulso] = useState({ descricao: "", preco: "" })
  const [forma, setForma] = useState<FormaPagamento>("DINHEIRO")
  const [recebido, setRecebido] = useState("")
  const [cliente, setCliente] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [notaEmOperacao, setNotaEmOperacao] = useState<string | null>(null)
  const [notaErro, setNotaErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setDados(await buscar<Estado>("/api/loja"))
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const total = useMemo(() => totalDaVenda(carrinho), [carrinho])

  // Em dinheiro o lojista digita o que recebeu para ver o troco. Nas outras
  // formas o valor é sempre o total: passar diferente no cartão é erro.
  const pagamentos: PagamentoInformado[] = useMemo(() => {
    const valorCentavos = forma === "DINHEIRO" && recebido ? paraCentavos(recebido) : total
    return [{ forma, valorCentavos }]
  }, [forma, recebido, total])

  const conferencia = useMemo(() => conferirVenda(total, pagamentos), [total, pagamentos])

  function adicionar(produto: Produto) {
    setCarrinho((atual) => {
      const existente = atual.findIndex((item) => item.produtoId === produto.id)
      if (existente >= 0) {
        const copia = [...atual]
        copia[existente] = { ...copia[existente], quantidade: copia[existente].quantidade + 1 }
        return copia
      }
      return [
        ...atual,
        { produtoId: produto.id, descricao: produto.nome, quantidade: 1, precoUnitarioCentavos: produto.precoCentavos },
      ]
    })
  }

  function adicionarAvulso(evento: React.FormEvent) {
    evento.preventDefault()
    if (!avulso.descricao.trim()) return

    setCarrinho((atual) => [
      ...atual,
      { descricao: avulso.descricao.trim(), quantidade: 1, precoUnitarioCentavos: paraCentavos(avulso.preco) },
    ])
    setAvulso({ descricao: "", preco: "" })
  }

  async function emitirNota(vendaId: string) {
    setNotaEmOperacao(vendaId)
    setNotaErro(null)
    try {
      await enviar(`/api/loja/vendas/${vendaId}/nota-fiscal`, {})
      await carregar()
    } catch (falha) {
      setNotaErro(falha instanceof Error ? falha.message : "Não consegui emitir a nota.")
    } finally {
      setNotaEmOperacao(null)
    }
  }

  async function fechar() {
    setOcupado(true)
    setErro(null)
    setAviso(null)

    try {
      const resposta = await enviar<{ troco: number; venda: { numero: number } }>("/api/loja/vendas", {
        itens: carrinho,
        pagamentos,
        clienteNome: cliente || undefined,
      })

      setAviso(
        resposta.troco > 0
          ? `Venda ${resposta.venda.numero} fechada. Troco de ${formatarMoeda(resposta.troco)}.`
          : `Venda ${resposta.venda.numero} fechada.`,
      )
      setCarrinho([])
      setRecebido("")
      setCliente("")
      await carregar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui fechar a venda.")
    } finally {
      setOcupado(false)
    }
  }

  async function abrirCaixa() {
    setOcupado(true)
    try {
      await enviar("/api/loja/caixa", { acao: "abrir", aberturaCentavos: 0 })
      await carregar()
    } finally {
      setOcupado(false)
    }
  }

  const caixa = dados?.caixa

  return (
    <div className="space-y-4">
      <Cartao
        titulo={dados?.loja.nome ?? "Balcão"}
        acao={
          caixa ? null : (
            <button onClick={abrirCaixa} disabled={ocupado} className="flex items-center gap-1.5">
              <Plus className="size-3.5" /> abrir caixa
            </button>
          )
        }
      >
        {caixa ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metrica rotulo="Vendido no caixa" valor={formatarMoeda(caixa.resumo.vendidoCentavos)} />
            <Metrica rotulo="Em dinheiro" valor={formatarMoeda(caixa.resumo.emDinheiroCentavos)} />
            <Metrica rotulo="Sangria" valor={formatarMoeda(caixa.resumo.sangriaCentavos)} />
            <Metrica
              rotulo="Esperado na gaveta"
              valor={formatarMoeda(caixa.resumo.esperadoNaGavetaCentavos)}
              detalhe="abertura mais dinheiro menos sangria"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-fg">
            Nenhum caixa aberto. Dá para vender assim mesmo — a venda fica registrada, só não entra na conferência da
            gaveta no fim do dia.
          </p>
        )}
      </Cartao>

      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao titulo="Produtos">
          {dados && dados.produtos.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {dados.produtos.map((produto) => (
                <button
                  key={produto.id}
                  onClick={() => adicionar(produto)}
                  className="rounded-[var(--raio-cartao)] border border-pauta bg-papel-2 px-3.5 py-2.5 text-left text-[13px]"
                >
                  <span className="block font-medium">{produto.nome}</span>
                  <span className="text-muted-fg">{formatarMoeda(produto.precoCentavos)}</span>
                </button>
              ))}
            </div>
          ) : (
            <Vazio
              titulo="Nenhum produto cadastrado"
              texto="Não precisa cadastrar nada para vender: lance o item avulso abaixo e siga atendendo."
            />
          )}

          <form onSubmit={adicionarAvulso} className="mt-4 flex flex-wrap items-end gap-2">
            <label className="flex flex-1 flex-col gap-1.5 text-[12px] text-muted-fg">
              item avulso
              <input
                value={avulso.descricao}
                onChange={(evento) => setAvulso({ ...avulso, descricao: evento.target.value })}
                placeholder="o que está vendendo"
                className={campo}
              />
            </label>
            <label className="flex w-32 flex-col gap-1.5 text-[12px] text-muted-fg">
              preço
              <input
                inputMode="decimal"
                value={avulso.preco}
                onChange={(evento) => setAvulso({ ...avulso, preco: evento.target.value })}
                placeholder="0,00"
                className={campo}
              />
            </label>
            <button type="submit" className="rounded-full border border-pauta px-4 py-2.5 text-[13px]">
              incluir
            </button>
          </form>
        </Cartao>

        <Cartao titulo="Venda">
          {carrinho.length === 0 ? (
            <Vazio titulo="Nada no balcão" texto="Toque num produto ou lance um item avulso." />
          ) : (
            <div className="divide-y divide-pauta">
              {carrinho.map((item, indice) => (
                <div key={`${item.descricao}-${indice}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="flex-1">
                    {item.quantidade}× {item.descricao}
                  </span>
                  <span className="text-muted-fg">{formatarMoeda(item.quantidade * item.precoUnitarioCentavos)}</span>
                  <button
                    onClick={() => setCarrinho((atual) => atual.filter((_, i) => i !== indice))}
                    className="text-negativo"
                    aria-label={`tirar ${item.descricao}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Valor className="mt-4">{formatarMoeda(total)}</Valor>

          <div className="mt-4 flex flex-wrap gap-2">
            {FORMAS.map((opcao) => (
              <button
                key={opcao.valor}
                onClick={() => setForma(opcao.valor)}
                className={`rounded-full border px-3.5 py-2 text-[13px] ${
                  forma === opcao.valor ? "border-acao text-acao" : "border-pauta text-muted-fg"
                }`}
              >
                {opcao.rotulo}
              </button>
            ))}
          </div>

          {forma === "DINHEIRO" && (
            <label className="mt-3 flex flex-col gap-1.5 text-[12px] text-muted-fg">
              recebeu quanto
              <input
                inputMode="decimal"
                value={recebido}
                onChange={(evento) => setRecebido(evento.target.value)}
                placeholder={formatarMoeda(total, false)}
                className={campo}
              />
            </label>
          )}

          {forma === "FIADO" && (
            <label className="mt-3 flex flex-col gap-1.5 text-[12px] text-muted-fg">
              quem levou
              <input value={cliente} onChange={(evento) => setCliente(evento.target.value)} className={campo} />
            </label>
          )}

          {conferencia.trocoCentavos > 0 && (
            <p className="mt-3 text-sm text-positivo">Troco de {formatarMoeda(conferencia.trocoCentavos)}.</p>
          )}

          <button
            onClick={fechar}
            disabled={ocupado || carrinho.length === 0}
            className="mt-4 w-full rounded-full bg-acao px-4 py-3 text-[15px] font-medium text-primary-foreground disabled:opacity-50"
          >
            fechar venda
          </button>

          {erro && <p className="mt-3 text-[13px] text-negativo">{erro}</p>}
          {aviso && <p className="mt-3 text-[13px] text-positivo">{aviso}</p>}
        </Cartao>
      </div>

      <Cartao titulo="Os últimos 30 dias">
        {dados && dados.resumo.vendas > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metrica
                rotulo="Vendeu"
                valor={formatarMoeda(dados.resumo.brutoCentavos)}
                detalhe={`${dados.resumo.vendas} ${dados.resumo.vendas === 1 ? "venda" : "vendas"}`}
              />
              <Metrica
                rotulo="Vira seu"
                valor={formatarMoeda(dados.resumo.liquidoCentavos)}
                tom="positivo"
                detalhe={`${formatarMoeda(dados.resumo.taxasCentavos)} ficaram com a maquininha`}
              />
              <Metrica
                rotulo="Ainda vai cair"
                valor={formatarMoeda(dados.resumo.aReceberCentavos)}
                tom="atencao"
                detalhe="cartão que a adquirente ainda deve"
              />
              <Metrica
                rotulo="No fiado"
                valor={formatarMoeda(dados.resumo.fiadoCentavos)}
                tom={dados.resumo.fiadoCentavos > 0 ? "negativo" : "neutro"}
                detalhe="sem data para cair"
              />
            </div>

            {dados.aCair.length > 0 && (
              <div className="mt-4 rounded-[var(--raio-cartao)] border border-pauta bg-papel-2 p-4">
                <p className="text-[12px] uppercase tracking-widest text-muted-fg">Próximos dias</p>
                <div className="mt-2 space-y-1">
                  {dados.aCair.slice(0, 6).map((linha) => (
                    <div key={linha.dia} className="flex items-center justify-between text-[13px]">
                      <span className="text-muted-fg">
                        {new Date(`${linha.dia}T12:00:00Z`).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                      <span className="numero">{formatarMoeda(linha.valorCentavos)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <Vazio titulo="Nenhuma venda nos últimos 30 dias" />
        )}
      </Cartao>

      <Cartao titulo="Últimas vendas">
        {!dados || dados.ultimasVendas.length === 0 ? (
          <Vazio titulo="Nenhuma venda ainda" />
        ) : (
          <div className="divide-y divide-pauta">
            {dados.ultimasVendas.map((venda) => (
              <div key={venda.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-muted-fg">#{venda.numero}</span>
                <span>{new Date(venda.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                <span>{formatarMoeda(venda.totalCentavos)}</span>

                {venda.notaFiscal?.status === "EMITIDA" ? (
                  <span className="rounded-full bg-positivo/10 px-2.5 py-1 text-[11px] text-positivo">
                    nota emitida
                  </span>
                ) : venda.notaFiscal?.status === "CANCELADA" ? (
                  <span className="rounded-full bg-muted-fg/10 px-2.5 py-1 text-[11px] text-muted-fg">
                    nota cancelada
                  </span>
                ) : (
                  <button
                    onClick={() => emitirNota(venda.id)}
                    disabled={notaEmOperacao === venda.id}
                    title={
                      venda.notaFiscal?.status === "REJEITADA"
                        ? "A tentativa anterior foi rejeitada. Corrija o que faltar e tente de novo."
                        : undefined
                    }
                    className="rounded-full border border-pauta px-2.5 py-1 text-[11px] text-muted-fg hover:border-acao/40 disabled:opacity-50"
                  >
                    {notaEmOperacao === venda.id
                      ? "emitindo…"
                      : venda.notaFiscal?.status === "REJEITADA"
                        ? "tentar de novo"
                        : "emitir nota"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {notaErro && <p className="mt-3 text-[13px] text-negativo">{notaErro}</p>}
      </Cartao>
    </div>
  )
}

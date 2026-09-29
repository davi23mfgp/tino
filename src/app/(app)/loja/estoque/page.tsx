"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ClipboardCheck, Plus, Search, Truck } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, formatarPercentual, paraCentavos } from "@/lib/dinheiro"
import { resumoDaPrateleira, situacaoNaPrateleira, type Situacao } from "@/lib/loja/prateleira"
import { TrilhaLoja } from "@/components/trilha-loja"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SelectNative } from "@/components/ui/select-native"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import estilos from "./prateleira.module.css"

/**
 * Prateleira — rodada 3 do canvas (Davi, 28/09/2026): tabela sóbria, sem
 * cor, no vidro do app; tocar num produto abre a ficha dele.
 *
 * Responde três coisas que o lojista não sabe olhando a loja: quanto tem de
 * cada peça, quanto ela custou e quanto sobra em cada venda. A saída não se
 * lança aqui — ela nasce da venda no balcão, senão o saldo passa a divergir do
 * que foi vendido e a prateleira deixa de servir para conferir a loja.
 */

interface Movimento {
  id: string
  tipo: "ENTRADA" | "SAIDA" | "AJUSTE"
  quantidade: number
  custoUnitarioCentavos: number | null
  motivo: string | null
  venda: boolean
  criadoEm: string
}

interface Produto {
  id: string
  nome: string
  precoCentavos: number
  ncm: string | null
  codigoBarras: string | null
  estoqueMinimo: number | null
  saldo: number
  referencia: number
  custoMedioCentavos: number | null
  acabando: boolean
  semSaldo: boolean
  margem: { lucroCentavos: number | null; margemBps: number | null }
  movimentos: Movimento[]
}

interface Desempenho {
  produtoId: string
  quantidadeVendida: number
  diasSemVender: number | null
  nuncaVendeu: boolean
}

interface Resposta {
  prateleira: Produto[]
  desempenho: Desempenho[]
  podeVerFinanceiro: boolean
}

type Filtro = "todos" | "atencao" | "em dia"
type Janela = null | { tipo: "produto"; id: string } | { tipo: "novo" } | { tipo: "lancar"; lancamento: "ENTRADA" | "AJUSTE"; produtoId?: string }

const TOM: Record<Situacao, "alerta" | "atencao" | undefined> = {
  "sem estoque": "alerta",
  acabando: "alerta",
  "sem custo": "atencao",
  "nunca vendeu": "atencao",
  parado: "atencao",
  "em dia": undefined,
}

function SituacaoDoProduto({ situacao }: { situacao: Situacao }) {
  return (
    <span className={estilos.situacao} data-tom={TOM[situacao]}>
      <i aria-hidden />
      {situacao.charAt(0).toUpperCase() + situacao.slice(1)}
    </span>
  )
}

function Barra({ saldo, referencia, larga }: { saldo: number; referencia: number; larga?: boolean }) {
  const largura = referencia > 0 ? Math.max(3, Math.min(100, Math.round((Math.max(0, saldo) / referencia) * 100))) : 0
  return (
    <span className={`${estilos.barra} ${larga ? estilos.barraLarga : ""}`} aria-hidden>
      <i style={{ width: `${largura}%` }} />
    </span>
  )
}

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })

function descreverMovimento(movimento: Movimento) {
  if (movimento.tipo === "SAIDA") return movimento.venda ? "Venda no balcão" : "Saída"
  if (movimento.tipo === "AJUSTE") return `Contagem${movimento.motivo ? ` · ${movimento.motivo}` : ""}`
  // Sem custo na linha não quer dizer "entrou sem custo": para o funcionário
  // o custo vem escondido pela API. Por isso não se escreve nada no lugar.
  return movimento.custoUnitarioCentavos ? `Entrada · ${formatarMoeda(movimento.custoUnitarioCentavos)} cada` : "Entrada"
}

function quantidadeDoMovimento(movimento: Movimento) {
  if (movimento.tipo === "ENTRADA") return `+${movimento.quantidade}`
  if (movimento.tipo === "SAIDA") return `−${movimento.quantidade}`
  // Na contagem, a quantidade é o saldo contado, não a diferença.
  return `= ${movimento.quantidade}`
}

/**
 * NCM do produto, editado na ficha.
 *
 * Busca contra a tabela oficial (10.515 códigos, ver src/lib/loja/ncm.ts) —
 * não deixa digitar um código qualquer: o PATCH do servidor também confere,
 * mas mostrar a lista de verdade aqui evita a tentativa que ia falhar.
 */
function EditorNcm({ produtoId, ncmAtual, aoSalvar }: { produtoId: string; ncmAtual: string | null; aoSalvar: () => void }) {
  const [aberto, setAberto] = useState(false)
  const [termo, setTermo] = useState("")
  const [resultados, setResultados] = useState<{ codigo: string; descricao: string }[]>([])
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!aberto || !termo.trim()) {
      setResultados([])
      return
    }
    const espera = setTimeout(async () => {
      const resposta = await buscar<{ resultados: { codigo: string; descricao: string }[] }>(`/api/loja/ncm?busca=${encodeURIComponent(termo)}`)
      setResultados(resposta.resultados)
    }, 250)
    return () => clearTimeout(espera)
  }, [termo, aberto])

  async function escolher(codigo: string) {
    setSalvando(true)
    try {
      await enviar(`/api/loja/produtos/${produtoId}`, { ncm: codigo }, "PATCH")
      setAberto(false)
      setTermo("")
      aoSalvar()
    } finally {
      setSalvando(false)
    }
  }

  if (!aberto) {
    return (
      <button type="button" className={estilos.link} onClick={() => setAberto(true)}>
        {ncmAtual ?? "definir"}
      </button>
    )
  }
  return (
    <div className="relative">
      <Input autoFocus value={termo} onChange={(evento) => setTermo(evento.target.value)} onBlur={() => setTimeout(() => setAberto(false), 150)} placeholder="nome ou código" disabled={salvando} className="w-48" />
      {resultados.length > 0 && (
        <div className="superficie-flutuante absolute right-0 z-10 mt-1 w-72 rounded-xl border p-1">
          {resultados.map((resultado) => (
            <button key={resultado.codigo} type="button" onMouseDown={() => escolher(resultado.codigo)} className="block w-full rounded-lg px-2 py-1.5 text-left text-[calc(12px*var(--escala-letra))] hover:bg-foreground/[0.05]">
              <span className="numero font-medium">{resultado.codigo}</span> <span className="text-muted-fg">{resultado.descricao}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Entrada de mercadoria ou contagem, para um produto já escolhido ou a escolher. */
function Lancamento({
  tipo,
  produtos,
  produtoId,
  aoTerminar,
}: {
  tipo: "ENTRADA" | "AJUSTE"
  produtos: Produto[]
  produtoId?: string
  aoTerminar: () => void
}) {
  const [dados, setDados] = useState({ produtoId: produtoId ?? "", quantidade: "", custo: "", motivo: "" })
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function lancar(evento: React.FormEvent) {
    evento.preventDefault()
    if (ocupado) return
    setOcupado(true)
    setErro(null)
    try {
      const quantidade = Number(dados.quantidade)
      if (!dados.produtoId) throw new Error("Escolha o produto.")
      if (!Number.isInteger(quantidade) || quantidade < 0) throw new Error("Informe a quantidade em peças inteiras.")
      await enviar("/api/loja/estoque", {
        produtoId: dados.produtoId,
        tipo,
        quantidade,
        custoUnitarioCentavos: tipo === "ENTRADA" && dados.custo ? paraCentavos(dados.custo) : undefined,
        motivo: dados.motivo.trim() || undefined,
      })
      aoTerminar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui lançar.")
    } finally {
      setOcupado(false)
    }
  }

  return (
    <form onSubmit={lancar} className="grid gap-4">
      {!produtoId && (
        <label className={estilos.campo}>
          Produto
          <SelectNative value={dados.produtoId} onChange={(evento) => setDados({ ...dados, produtoId: evento.target.value })} required>
            <option value="">Escolha</option>
            {produtos.map((produto) => (
              <option key={produto.id} value={produto.id}>
                {produto.nome}
              </option>
            ))}
          </SelectNative>
        </label>
      )}
      <div className={estilos.dois}>
        <label className={estilos.campo}>
          {tipo === "ENTRADA" ? "Quantas peças chegaram" : "Quantas tem hoje"}
          <Input inputMode="numeric" value={dados.quantidade} onChange={(evento) => setDados({ ...dados, quantidade: evento.target.value })} required autoFocus />
        </label>
        {tipo === "ENTRADA" ? (
          <label className={estilos.campo}>
            Custo por peça (R$)
            <Input inputMode="decimal" value={dados.custo} onChange={(evento) => setDados({ ...dados, custo: evento.target.value })} placeholder="0,00" />
          </label>
        ) : (
          <label className={estilos.campo}>
            Motivo
            <Input value={dados.motivo} onChange={(evento) => setDados({ ...dados, motivo: evento.target.value })} placeholder="contagem do sábado" maxLength={80} />
          </label>
        )}
      </div>
      <p className={estilos.dica}>
        {tipo === "ENTRADA"
          ? "Sem o custo, a margem desta peça fica em branco — não é chutada."
          : "A contagem manda: o saldo passa a ser o número contado, e a diferença fica registrada."}
      </p>
      {erro && (
        <p role="alert" className={estilos.erro}>
          {erro}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={aoTerminar} disabled={ocupado}>
          Cancelar
        </Button>
        <Button disabled={ocupado}>{ocupado ? "Lançando…" : tipo === "ENTRADA" ? "Registrar entrada" : "Registrar contagem"}</Button>
      </div>
    </form>
  )
}

/** Produto novo: nome e preço bastam; o resto ajuda a prateleira a responder mais. */
function NovoProduto({ aoTerminar }: { aoTerminar: (criado: boolean) => void }) {
  const [dados, setDados] = useState({ nome: "", preco: "", custo: "", quantidade: "", minimo: "", codigo: "" })
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    if (ocupado) return
    setOcupado(true)
    setErro(null)
    try {
      const quantidade = dados.quantidade ? Number(dados.quantidade) : 0
      const minimo = dados.minimo ? Number(dados.minimo) : null
      if (!Number.isInteger(quantidade) || quantidade < 0) throw new Error("Informe a quantidade em peças inteiras.")
      if (minimo !== null && (!Number.isInteger(minimo) || minimo < 0)) throw new Error("Informe o aviso em peças inteiras.")
      await enviar("/api/loja/produtos", {
        nome: dados.nome.trim(),
        precoCentavos: paraCentavos(dados.preco),
        custoCentavos: dados.custo ? paraCentavos(dados.custo) : 0,
        quantidadeInicial: quantidade,
        estoqueMinimo: minimo,
        codigoBarras: dados.codigo.trim() || undefined,
      })
      aoTerminar(true)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui cadastrar.")
    } finally {
      setOcupado(false)
    }
  }

  return (
    <form onSubmit={salvar} className="grid gap-4">
      <label className={estilos.campo}>
        Nome
        <Input value={dados.nome} onChange={(evento) => setDados({ ...dados, nome: evento.target.value })} placeholder="o que você vende" required maxLength={80} autoFocus />
      </label>
      <div className={estilos.dois}>
        <label className={estilos.campo}>
          Vende por (R$)
          <Input inputMode="decimal" value={dados.preco} onChange={(evento) => setDados({ ...dados, preco: evento.target.value })} placeholder="0,00" required />
        </label>
        <label className={estilos.campo}>
          Custou (R$)
          <Input inputMode="decimal" value={dados.custo} onChange={(evento) => setDados({ ...dados, custo: evento.target.value })} placeholder="0,00" />
        </label>
        <label className={estilos.campo}>
          Tem hoje
          <Input inputMode="numeric" value={dados.quantidade} onChange={(evento) => setDados({ ...dados, quantidade: evento.target.value })} placeholder="0 peças" />
        </label>
        <label className={estilos.campo}>
          Avisar com
          <Input inputMode="numeric" value={dados.minimo} onChange={(evento) => setDados({ ...dados, minimo: evento.target.value })} placeholder="no último item" />
        </label>
      </div>
      <label className={estilos.campo}>
        Código de barras (opcional)
        <Input value={dados.codigo} onChange={(evento) => setDados({ ...dados, codigo: evento.target.value })} inputMode="numeric" maxLength={40} />
      </label>
      <p className={estilos.dica}>Com preço e custo, o Tino mostra quanto sobra em cada venda. Sem o custo, a margem fica em branco — não é chutada.</p>
      {erro && (
        <p role="alert" className={estilos.erro}>
          {erro}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => aoTerminar(false)} disabled={ocupado}>
          Cancelar
        </Button>
        <Button disabled={ocupado}>{ocupado ? "Cadastrando…" : "Cadastrar produto"}</Button>
      </div>
    </form>
  )
}

/** Valor com os centavos menores, como nos quadros de Finanças e MEI. */
function Reais({ centavos }: { centavos: number }) {
  const texto = formatarMoeda(centavos)
  const virgula = texto.lastIndexOf(",")
  return (
    <strong className={estilos.num}>
      {texto.slice(0, virgula)}
      <span>{texto.slice(virgula)}</span>
    </strong>
  )
}

export default function Prateleira() {
  const [dados, setDados] = useState<Resposta | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [busca, setBusca] = useState("")
  const [filtro, setFiltro] = useState<Filtro>("todos")
  const [janela, setJanela] = useState<Janela>(null)
  const [editando, setEditando] = useState<{ nome: string; preco: string; minimo: string } | null>(null)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    try {
      setDados(await buscar<Resposta>("/api/loja/estoque"))
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui carregar a prateleira.")
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const comCusto = dados?.podeVerFinanceiro ?? true
  const linhas = useMemo(() => {
    const porProduto = new Map((dados?.desempenho ?? []).map((linha) => [linha.produtoId, linha]))
    return (dados?.prateleira ?? []).map((produto) => {
      const desempenho = porProduto.get(produto.id)
      const linha = {
        ...produto,
        quantidadeVendida: desempenho?.quantidadeVendida ?? 0,
        nuncaVendeu: desempenho?.nuncaVendeu ?? true,
        diasSemVender: desempenho?.diasSemVender ?? null,
      }
      return { ...linha, situacao: situacaoNaPrateleira(linha, comCusto) }
    })
  }, [dados, comCusto])

  const resumo = useMemo(() => resumoDaPrateleira(linhas), [linhas])
  const atencao = linhas.filter((linha) => linha.situacao !== "em dia")
  const maisVendido = [...linhas].sort((a, b) => b.quantidadeVendida - a.quantidadeVendida).find((linha) => linha.quantidadeVendida > 0)

  const termo = busca.trim().toLocaleLowerCase("pt-BR")
  const visiveis = linhas.filter((linha) => {
    if (termo && !linha.nome.toLocaleLowerCase("pt-BR").includes(termo) && !(linha.codigoBarras ?? "").includes(termo)) return false
    if (filtro === "atencao") return linha.situacao !== "em dia"
    if (filtro === "em dia") return linha.situacao === "em dia"
    return true
  })

  const aberto = janela?.tipo === "produto" ? linhas.find((linha) => linha.id === janela.id) : undefined

  function fechar() {
    setJanela(null)
    setEditando(null)
  }

  async function salvarEdicao(evento: React.FormEvent) {
    evento.preventDefault()
    if (!aberto || !editando || salvando) return
    setSalvando(true)
    try {
      await enviar(
        `/api/loja/produtos/${aberto.id}`,
        {
          nome: editando.nome.trim(),
          precoCentavos: paraCentavos(editando.preco),
          estoqueMinimo: editando.minimo.trim() ? Number(editando.minimo) : null,
        },
        "PATCH",
      )
      setEditando(null)
      await carregar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui salvar.")
    } finally {
      setSalvando(false)
    }
  }

  const botao = (rotulo: string, Icone: typeof Plus, aoTocar: () => void, principal = false) => (
    <button type="button" className={estilos.botao} data-principal={principal || undefined} data-icone={!principal || undefined} onClick={aoTocar} aria-label={rotulo}>
      <Icone aria-hidden />
      <span>{rotulo}</span>
    </button>
  )

  return (
    <div className={estilos.pagina}>
      <TrilhaLoja pagina="Prateleira" />

      <div className={estilos.topo}>
        <p>
          {dados ? `${linhas.length} ${linhas.length === 1 ? "produto" : "produtos"}` : " "}
          {atencao.length > 0 && ` · ${atencao.length} ${atencao.length === 1 ? "pede" : "pedem"} atenção`}
        </p>
        <div className={estilos.acoes}>
          {botao("Contagem", ClipboardCheck, () => setJanela({ tipo: "lancar", lancamento: "AJUSTE" }))}
          {botao("Entrada", Truck, () => setJanela({ tipo: "lancar", lancamento: "ENTRADA" }))}
          {botao("Novo produto", Plus, () => setJanela({ tipo: "novo" }), true)}
        </div>
      </div>

      {/* Quadros finos (29/09), como Finanças da loja e MEI: número grande em
          peso leve, rótulo curto, a referência embaixo. */}
      <section className={estilos.kpis} aria-label="Resumo da prateleira">
        <div className={`${estilos.bloco} ${estilos.kpi}`}>
          <span>Valor na venda</span>
          <Reais centavos={resumo.valorNaVendaCentavos} />
          <small>
            {resumo.pecas} {resumo.pecas === 1 ? "peça" : "peças"} na prateleira
          </small>
        </div>
        {comCusto && (
          <div className={`${estilos.bloco} ${estilos.kpi}`}>
            <span>Custo parado</span>
            <Reais centavos={resumo.custoParadoCentavos} />
            <small>
              {resumo.semCustoComSaldo > 0
                ? `fora ${resumo.semCustoComSaldo} ${resumo.semCustoComSaldo === 1 ? "produto" : "produtos"} sem custo`
                : "o que a prateleira custou"}
            </small>
          </div>
        )}
        <div className={`${estilos.bloco} ${estilos.kpi}`}>
          <span>Pedem atenção</span>
          <strong className={estilos.num}>{atencao.length}</strong>
          <small>
            de {linhas.length} {linhas.length === 1 ? "produto" : "produtos"}
          </small>
        </div>
        <div className={`${estilos.bloco} ${estilos.kpi}`}>
          <span>Mais vendido</span>
          <strong data-texto>{maisVendido?.nome ?? "—"}</strong>
          <small>{maisVendido ? `${maisVendido.quantidadeVendida} vendidos · ${maisVendido.saldo} em estoque` : "nenhuma venda ainda"}</small>
        </div>
      </section>

      <div className={estilos.filtros}>
        <label className={estilos.busca}>
          <Search aria-hidden />
          <Input value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar produto" aria-label="Buscar produto" />
        </label>
        <div className={estilos.segmento} role="group" aria-label="Filtrar">
          {(
            [
              ["todos", "Todos", linhas.length],
              ["atencao", "Atenção", atencao.length],
              ["em dia", "Em dia", linhas.length - atencao.length],
            ] as const
          ).map(([valor, rotulo, quantidade]) => (
            <button key={valor} type="button" aria-pressed={filtro === valor} onClick={() => setFiltro(valor)}>
              {rotulo}
              <span>{quantidade}</span>
            </button>
          ))}
        </div>
      </div>

      {erro && (
        <p role="alert" className={estilos.erro}>
          {erro}
        </p>
      )}

      <section className={`${estilos.bloco} ${estilos.tabela}`} aria-label="Produtos">
        <div className={estilos.cabecalho} aria-hidden>
          {["Produto", "Situação", "Estoque", "Preço", "Custo", "Sobra por venda", "Vendidos"].map((titulo) => (
            <span key={titulo} className={estilos.rotulo}>
              {titulo}
            </span>
          ))}
        </div>
        {dados && linhas.length === 0 && <p className={estilos.vazio}>Nenhum produto ainda. Cadastre o que mais vende: ele vira atalho no Balcão e passa a ter saldo, custo e margem.</p>}
        {dados && linhas.length > 0 && visiveis.length === 0 && <p className={estilos.vazio}>Nenhum produto nesse filtro.</p>}
        {visiveis.map((linha) => (
          <button key={linha.id} type="button" className={estilos.linha} onClick={() => setJanela({ tipo: "produto", id: linha.id })}>
            <span className={estilos.nome}>{linha.nome}</span>
            <span className={estilos.cSituacao}>
              <SituacaoDoProduto situacao={linha.situacao} />
            </span>
            <span className={`${estilos.cEstoque} ${estilos.num}`}>
              {linha.saldo}
              <Barra saldo={linha.saldo} referencia={linha.referencia} />
            </span>
            <span className={`${estilos.cPreco} ${estilos.num}`}>{formatarMoeda(linha.precoCentavos)}</span>
            <span className={`${estilos.cCusto} ${estilos.num}`}>{linha.custoMedioCentavos === null ? "—" : formatarMoeda(linha.custoMedioCentavos)}</span>
            <span className={`${estilos.cSobra} ${estilos.num}`}>
              {linha.margem.lucroCentavos === null || linha.margem.margemBps === null ? (
                <span className={estilos.apagado}>—</span>
              ) : (
                <>
                  <span className={linha.margem.lucroCentavos < 0 ? "text-negativo" : undefined}>{formatarMoeda(linha.margem.lucroCentavos)}</span>{" "}
                  <span className={estilos.apagado}>{formatarPercentual(linha.margem.margemBps, 0)}</span>
                </>
              )}
            </span>
            <span className={`${estilos.cVendidos} ${estilos.num}`}>{linha.quantidadeVendida}</span>
          </button>
        ))}
      </section>

      <Dialog open={janela !== null} onOpenChange={(abrir) => !abrir && fechar()}>
        <DialogContent className="sm:max-w-[520px]">
          {janela?.tipo === "novo" && (
            <>
              <DialogHeader>
                <DialogTitle>Novo produto</DialogTitle>
                <DialogDescription>Nome e preço bastam; o resto você completa depois.</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <NovoProduto
                  aoTerminar={(criado) => {
                    fechar()
                    if (criado) void carregar()
                  }}
                />
              </DialogBody>
            </>
          )}

          {janela?.tipo === "lancar" && (
            <>
              <DialogHeader>
                <DialogTitle>{janela.lancamento === "ENTRADA" ? "Entrada de mercadoria" : "Contagem"}</DialogTitle>
                <DialogDescription>
                  {janela.produtoId ? linhas.find((linha) => linha.id === janela.produtoId)?.nome : "A saída não se lança aqui: ela sai sozinha quando você vende no Balcão."}
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                {linhas.length === 0 ? (
                  <p className={estilos.dica}>Cadastre um produto primeiro.</p>
                ) : (
                  <Lancamento
                    tipo={janela.lancamento}
                    produtos={linhas}
                    produtoId={janela.produtoId}
                    aoTerminar={() => {
                      const volta = janela.produtoId
                      setJanela(volta ? { tipo: "produto", id: volta } : null)
                      void carregar()
                    }}
                  />
                )}
              </DialogBody>
            </>
          )}

          {aberto && (
            <>
              <DialogHeader>
                <DialogTitle>{aberto.nome}</DialogTitle>
                <DialogDescription asChild>
                  <span>
                    <SituacaoDoProduto situacao={aberto.situacao} />
                  </span>
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                {editando ? (
                  <form onSubmit={salvarEdicao} className="grid gap-4">
                    <label className={estilos.campo}>
                      Nome
                      <Input value={editando.nome} onChange={(evento) => setEditando({ ...editando, nome: evento.target.value })} required maxLength={80} />
                    </label>
                    <div className={estilos.dois}>
                      <label className={estilos.campo}>
                        Vende por (R$)
                        <Input inputMode="decimal" value={editando.preco} onChange={(evento) => setEditando({ ...editando, preco: evento.target.value })} required />
                      </label>
                      <label className={estilos.campo}>
                        Avisar com
                        <Input inputMode="numeric" value={editando.minimo} onChange={(evento) => setEditando({ ...editando, minimo: evento.target.value })} placeholder="no último item" />
                      </label>
                    </div>
                    <p className={estilos.dica}>O custo vem das entradas de mercadoria (custo médio). Para mudar, registre a próxima entrada com o custo novo.</p>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" onClick={() => setEditando(null)} disabled={salvando}>
                        Cancelar
                      </Button>
                      <Button disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</Button>
                    </div>
                  </form>
                ) : (
                  <div className={estilos.detalhe}>
                    <div>
                      <div className={estilos.saldo}>
                        <strong className={estilos.num}>{aberto.saldo}</strong>
                        <span>em estoque{aberto.referencia > aberto.saldo ? ` · de ${aberto.referencia} da última entrada ou contagem` : ""}</span>
                      </div>
                      <Barra saldo={aberto.saldo} referencia={aberto.referencia} larga />
                    </div>

                    <div>
                      <div className={estilos.kv}>
                        <span>Preço de venda</span>
                        <b className={estilos.num}>{formatarMoeda(aberto.precoCentavos)}</b>
                      </div>
                      {comCusto && (
                        <>
                          <div className={estilos.kv}>
                            <span>Custo médio</span>
                            <b className={estilos.num}>{aberto.custoMedioCentavos === null ? "sem custo lançado" : formatarMoeda(aberto.custoMedioCentavos)}</b>
                          </div>
                          <div className={estilos.kv}>
                            <span>Sobra por venda</span>
                            <b className={estilos.num}>
                              {aberto.margem.lucroCentavos === null || aberto.margem.margemBps === null
                                ? "—"
                                : `${formatarMoeda(aberto.margem.lucroCentavos)} · ${formatarPercentual(aberto.margem.margemBps, 0)}`}
                            </b>
                          </div>
                        </>
                      )}
                      <div className={estilos.kv}>
                        <span>Vendidos</span>
                        <b className={estilos.num}>{aberto.quantidadeVendida}</b>
                      </div>
                      <div className={estilos.kv}>
                        <span>Avisar com</span>
                        <b className={estilos.num}>{aberto.estoqueMinimo === null ? "no último item" : `${aberto.estoqueMinimo} ${aberto.estoqueMinimo === 1 ? "peça" : "peças"}`}</b>
                      </div>
                      <div className={estilos.kv}>
                        <span>NCM</span>
                        <EditorNcm produtoId={aberto.id} ncmAtual={aberto.ncm} aoSalvar={carregar} />
                      </div>
                      {aberto.codigoBarras && (
                        <div className={estilos.kv}>
                          <span>Código de barras</span>
                          <b className={estilos.num}>{aberto.codigoBarras}</b>
                        </div>
                      )}
                    </div>

                    <div>
                      <span className={estilos.rotulo}>Movimentos</span>
                      {aberto.movimentos.length === 0 ? (
                        <p className={estilos.dica}>Nenhum ainda.</p>
                      ) : (
                        aberto.movimentos.map((movimento) => (
                          <div key={movimento.id} className={estilos.movimento}>
                            <span className={estilos.num}>{dataCurta(movimento.criadoEm)}</span>
                            <span>{descreverMovimento(movimento)}</span>
                            <b className={estilos.num}>{quantidadeDoMovimento(movimento)}</b>
                          </div>
                        ))
                      )}
                    </div>

                    <div className={estilos.dois}>
                      <button type="button" className={estilos.botao} data-principal onClick={() => setJanela({ tipo: "lancar", lancamento: "ENTRADA", produtoId: aberto.id })}>
                        <Truck aria-hidden />
                        Registrar entrada
                      </button>
                      <button type="button" className={estilos.botao} onClick={() => setJanela({ tipo: "lancar", lancamento: "AJUSTE", produtoId: aberto.id })}>
                        <ClipboardCheck aria-hidden />
                        Contagem
                      </button>
                    </div>
                    <button
                      type="button"
                      className={estilos.link}
                      onClick={() => setEditando({ nome: aberto.nome, preco: formatarMoeda(aberto.precoCentavos, false), minimo: aberto.estoqueMinimo?.toString() ?? "" })}
                    >
                      Editar nome, preço e aviso
                    </button>
                  </div>
                )}
              </DialogBody>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

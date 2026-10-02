"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Delete, Minus, Package, Plus, X } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { conferirVenda, totalDaVenda } from "@/lib/loja/venda"
import { digitar, type Tecla } from "@/lib/loja/teclado"
import type { FormaPagamento, ItemDaVenda, PagamentoInformado, RegraDeRecebimento } from "@/lib/loja/venda"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { FecharCaixa, TirarDinheiro } from "./fechar-caixa"
import estilos from "./balcao.module.css"

/**
 * Balcão — opção A do canvas (Davi, 28/09/2026): teclado de balcão. O painel
 * da direita passou para os quadros finos das últimas telas (29/09), e o
 * caixa ganhou o fechamento às cegas da D2 (ver `fechar-caixa.tsx`).
 *
 * A tela é a venda. O valor grande e o teclado são o que a maquininha já
 * ensinou: digita o valor, escolhe como pagou, cobra. Produto cadastrado é
 * atalho, não requisito — o concorrente aqui é o caderno, que abre na hora e
 * não pede cadastro.
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
  abertoEm: string
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
  { valor: "CREDITO_PARCELADO", rotulo: "Parcelado" },
  { valor: "FIADO", rotulo: "Fiado" },
]

const TECLAS: Tecla[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "apagar"]

/** Quadro fino: rótulo curto, valor grande em peso leve, os centavos menores. */
function Quadro({ rotulo, centavos, apoio, tom }: { rotulo: string; centavos: number; apoio?: string; tom?: "negativo" }) {
  const texto = formatarMoeda(centavos)
  const virgula = texto.lastIndexOf(",")
  return (
    <div className={estilos.quadro}>
      <small>{rotulo}</small>
      <strong data-tom={tom}>
        {texto.slice(0, virgula)}
        <span>{texto.slice(virgula)}</span>
      </strong>
      {apoio && <em>{apoio}</em>}
    </div>
  )
}

export default function Balcao() {
  const [dados, setDados] = useState<Estado | null>(null)
  const [carrinho, setCarrinho] = useState<(ItemDaVenda & { produtoId?: string })[]>([])
  const [digitado, setDigitado] = useState(0)
  const [descricaoAvulso, setDescricaoAvulso] = useState("")
  const [forma, setForma] = useState<FormaPagamento>("DINHEIRO")
  const [recebido, setRecebido] = useState("")
  const [cliente, setCliente] = useState("")
  const [telefoneCliente, setTelefoneCliente] = useState("")
  const [observacao, setObservacao] = useState("")
  const [desconto, setDesconto] = useState("")
  const [parcelas, setParcelas] = useState(2)
  const [detalhesAbertos, setDetalhesAbertos] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [notaEmOperacao, setNotaEmOperacao] = useState<string | null>(null)
  const [notaErro, setNotaErro] = useState<string | null>(null)
  const [abrindoCaixa, setAbrindoCaixa] = useState(false)
  const [trocoInicial, setTrocoInicial] = useState("")
  const [fechandoCaixa, setFechandoCaixa] = useState(false)
  const [tirando, setTirando] = useState(false)

  const carregar = useCallback(async () => {
    setDados(await buscar<Estado>("/api/loja"))
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // "Vender fiado" na tela do Fiado chega aqui com a forma já escolhida.
  useEffect(() => {
    const pedida = new URLSearchParams(window.location.search).get("forma")
    if (pedida && FORMAS.some((opcao) => opcao.valor === pedida)) setForma(pedida as FormaPagamento)
  }, [])

  // O valor que está no visor e ainda não virou item entra na venda como
  // item avulso: quem digita 35,00 e cobra vendeu 35,00, sem passo a mais.
  const itens = useMemo(
    () =>
      digitado > 0
        ? [...carrinho, { descricao: descricaoAvulso.trim() || "Venda avulsa", quantidade: 1, precoUnitarioCentavos: digitado }]
        : carrinho,
    [carrinho, digitado, descricaoAvulso],
  )
  const bruto = useMemo(() => totalDaVenda(itens), [itens])
  const descontoCentavos = desconto ? paraCentavos(desconto) : 0
  const total = useMemo(() => totalDaVenda(itens, descontoCentavos), [itens, descontoCentavos])

  // Em dinheiro o lojista digita o que recebeu para ver o troco. Nas outras
  // formas o valor é sempre o total: passar diferente no cartão é erro.
  const pagamentos: PagamentoInformado[] = useMemo(() => {
    const valorCentavos = forma === "DINHEIRO" && recebido ? paraCentavos(recebido) : total
    return [{ forma, valorCentavos, ...(forma === "CREDITO_PARCELADO" ? { parcelas } : {}) }]
  }, [forma, recebido, total, parcelas])

  const conferencia = useMemo(() => conferirVenda(total, pagamentos), [total, pagamentos])

  const tocar = useCallback((tecla: Tecla) => {
    setAviso(null)
    setDigitado((atual) => digitar(atual, tecla))
  }, [])

  // No computador, o teclado físico também digita no visor — quem vende no
  // notebook não vai clicar número por número. Só quando nenhum campo está
  // com o foco, para não roubar o que se digita no nome do item.
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      const alvo = evento.target as HTMLElement | null
      if (alvo && (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA" || alvo.isContentEditable)) return
      // Com uma janela aberta (a contagem da gaveta tem o próprio teclado), o
      // visor da venda não pode receber os números junto.
      if (document.querySelector('[role="dialog"]')) return
      if (evento.ctrlKey || evento.metaKey || evento.altKey) return
      if (/^[0-9]$/.test(evento.key)) tocar(evento.key as Tecla)
      else if (evento.key === "Backspace") tocar("apagar")
      else return
      evento.preventDefault()
    }
    window.addEventListener("keydown", aoTeclar)
    return () => window.removeEventListener("keydown", aoTeclar)
  }, [tocar])

  function adicionar(produto: Produto) {
    setAviso(null)
    setCarrinho((atual) => {
      const existente = atual.findIndex((item) => item.produtoId === produto.id)
      if (existente >= 0) {
        const copia = [...atual]
        copia[existente] = { ...copia[existente], quantidade: copia[existente].quantidade + 1 }
        return copia
      }
      return [...atual, { produtoId: produto.id, descricao: produto.nome, quantidade: 1, precoUnitarioCentavos: produto.precoCentavos }]
    })
  }

  function alterarQuantidade(indice: number, passo: number) {
    setCarrinho((atual) => atual.flatMap((item, posicao) => {
      if (posicao !== indice) return [item]
      const quantidade = item.quantidade + passo
      return quantidade > 0 ? [{ ...item, quantidade }] : []
    }))
  }

  /** Guarda o valor do visor como item e libera o visor para o próximo. */
  function guardarDigitado() {
    if (digitado <= 0) return
    setCarrinho((atual) => [...atual, { descricao: descricaoAvulso.trim() || "Item avulso", quantidade: 1, precoUnitarioCentavos: digitado }])
    setDigitado(0)
    setDescricaoAvulso("")
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

  async function cobrar() {
    if (ocupado || total <= 0) return
    if (descontoCentavos < 0) {
      setErro("O desconto não pode ser negativo.")
      return
    }
    if (descontoCentavos >= bruto) {
      setErro("O desconto precisa ser menor que o valor dos itens.")
      return
    }
    if (forma === "FIADO" && !cliente.trim()) {
      setErro("No fiado, diga quem levou.")
      return
    }
    setOcupado(true)
    setErro(null)
    setAviso(null)
    try {
      const resposta = await enviar<{ troco: number; venda: { numero: number } }>("/api/loja/vendas", {
        itens,
        pagamentos,
        descontoCentavos,
        clienteNome: cliente.trim() || undefined,
        clienteTelefone: telefoneCliente.trim() || undefined,
        observacao: observacao.trim() || undefined,
      })
      setAviso(
        resposta.troco > 0
          ? `Venda ${resposta.venda.numero} fechada. Troco de ${formatarMoeda(resposta.troco)}.`
          : `Venda ${resposta.venda.numero} fechada.`,
      )
      setCarrinho([])
      setDigitado(0)
      setDescricaoAvulso("")
      setRecebido("")
      setCliente("")
      setTelefoneCliente("")
      setObservacao("")
      setDesconto("")
      setParcelas(2)
      setDetalhesAbertos(false)
      await carregar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui fechar a venda.")
    } finally {
      setOcupado(false)
    }
  }

  async function abrirCaixa(evento: React.FormEvent) {
    evento.preventDefault()
    if (ocupado) return
    setOcupado(true)
    setErro(null)
    try {
      // O troco que já está na gaveta é o ponto de partida da conferência
      // do fim do dia: sem ele, a gaveta "sobra" exatamente esse valor.
      await enviar("/api/loja/caixa", { acao: "abrir", aberturaCentavos: trocoInicial ? paraCentavos(trocoInicial) : 0 })
      setAbrindoCaixa(false)
      setTrocoInicial("")
      await carregar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui abrir o caixa.")
      setAbrindoCaixa(false)
    } finally {
      setOcupado(false)
    }
  }

  const caixa = dados?.caixa
  const produtos = dados?.produtos ?? []

  const pilulaCaixa = caixa ? (
    <button type="button" className={estilos.caixa} data-aberto onClick={() => setFechandoCaixa(true)}>
      <i aria-hidden />
      Caixa aberto
      <b>Fechar</b>
    </button>
  ) : (
    <button type="button" className={estilos.caixa} onClick={() => setAbrindoCaixa(true)} disabled={!dados}>
      <i aria-hidden />
      Caixa fechado
      <b>Abrir</b>
    </button>
  )

  return (
    <div className={estilos.pagina}>
      <section className={`${estilos.bloco} ${estilos.coluna}`} aria-label="Venda">
        <div className={estilos.topo}>
          <span>{dados?.loja.nome ?? " "}</span>
          {pilulaCaixa}
        </div>

        <div className={estilos.visor} aria-live="polite">
          <small>valor da venda</small>
          <strong>{formatarMoeda(total)}</strong>
          <span>{itens.length ? `${itens.length} ${itens.length === 1 ? "item" : "itens"}` : "digite o valor ou toque num produto"}</span>
        </div>

        {carrinho.length > 0 && (
          <div className={estilos.itens}>
            {carrinho.map((item, indice) => (
              <div key={`${item.descricao}-${indice}`} className={estilos.item}>
                <span>{item.descricao}</span>
                <div className={estilos.quantidade} aria-label={`Quantidade de ${item.descricao}`}>
                  <button type="button" onClick={() => alterarQuantidade(indice, -1)} aria-label={`Diminuir ${item.descricao}`}><Minus aria-hidden /></button>
                  <b>{item.quantidade}</b>
                  <button type="button" onClick={() => alterarQuantidade(indice, 1)} aria-label={`Aumentar ${item.descricao}`}><Plus aria-hidden /></button>
                </div>
                <b>{formatarMoeda(item.quantidade * item.precoUnitarioCentavos)}</b>
                <button type="button" onClick={() => setCarrinho((atual) => atual.filter((_, i) => i !== indice))} aria-label={`Tirar ${item.descricao}`}>
                  <X aria-hidden />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Com valor no visor, dá para dar nome ao item e guardá-lo para
            digitar o próximo. Sem nome, ele entra como "Venda avulsa". */}
        {digitado > 0 && (
          <div className={estilos.digitado}>
            <Input
              value={descricaoAvulso}
              onChange={(evento) => setDescricaoAvulso(evento.target.value)}
              placeholder="O que é? (opcional)"
              aria-label="Nome do item"
              maxLength={80}
            />
            <button type="button" onClick={guardarDigitado}>
              + item
            </button>
          </div>
        )}

        {produtos.length > 0 ? (
          <div className={estilos.produtos} aria-label="Produtos">
            {produtos.map((produto) => (
              <button key={produto.id} type="button" onClick={() => adicionar(produto)}>
                {produto.nome}
                <span>{formatarMoeda(produto.precoCentavos)}</span>
              </button>
            ))}
          </div>
        ) : (
          dados && (
            <div className={estilos.semProdutos}>
              <Package aria-hidden />
              <span>Sem produtos ainda. Os da Prateleira aparecem aqui como atalho.</span>
              <Link href="/loja/estoque">Cadastrar</Link>
            </div>
          )
        )}

        <div className={estilos.corpo}>
          <div className={estilos.teclado} role="group" aria-label="Teclado">
            {TECLAS.map((tecla) => (
              <button key={tecla} type="button" onClick={() => tocar(tecla)} aria-label={tecla === "apagar" ? "Apagar" : tecla}>
                {tecla === "apagar" ? <Delete aria-hidden /> : tecla}
              </button>
            ))}
          </div>

          <div className={estilos.pagar}>
            <span className={estilos.rotulo}>Como pagou</span>
            <div className={estilos.formas} role="group" aria-label="Forma de pagamento">
              {FORMAS.map((opcao) => (
                <button key={opcao.valor} type="button" aria-pressed={forma === opcao.valor} onClick={() => setForma(opcao.valor)}>
                  {opcao.rotulo}
                </button>
              ))}
            </div>

            {forma === "DINHEIRO" && (
              <label className={estilos.campo}>
                Recebeu quanto
                <Input inputMode="decimal" value={recebido} onChange={(evento) => setRecebido(evento.target.value)} placeholder={formatarMoeda(total, false)} />
              </label>
            )}
            {forma === "FIADO" && (
              <label className={estilos.campo}>
                Quem levou
                <Input value={cliente} onChange={(evento) => setCliente(evento.target.value)} placeholder="Nome do cliente" maxLength={80} />
              </label>
            )}
            {forma === "CREDITO_PARCELADO" && (
              <label className={estilos.campo}>
                Parcelas
                <Input type="number" min={2} max={24} value={parcelas} onChange={(evento) => setParcelas(Math.max(2, Math.min(24, Number(evento.target.value) || 2)))} />
              </label>
            )}
            <button type="button" className={estilos.detalhesBotao} aria-expanded={detalhesAbertos} onClick={() => setDetalhesAbertos((atual) => !atual)}>
              {detalhesAbertos ? "Ocultar detalhes" : "Adicionar desconto ou cliente"}
            </button>
            {detalhesAbertos && (
              <div className={estilos.detalhes}>
                <label className={estilos.campo}>Desconto em R$<Input inputMode="decimal" value={desconto} onChange={(evento) => setDesconto(evento.target.value)} placeholder="0,00" /></label>
                {forma !== "FIADO" && <label className={estilos.campo}>Cliente (opcional)<Input value={cliente} onChange={(evento) => setCliente(evento.target.value)} maxLength={80} placeholder="Nome" /></label>}
                <label className={estilos.campo}>Telefone (opcional)<Input type="tel" value={telefoneCliente} onChange={(evento) => setTelefoneCliente(evento.target.value)} maxLength={20} placeholder="Telefone do cliente" /></label>
                <label className={estilos.campo}>Observação (opcional)<Input value={observacao} onChange={(evento) => setObservacao(evento.target.value)} maxLength={500} placeholder="Nota sobre a venda" /></label>
                {descontoCentavos > 0 && <p className={estilos.resumoDesconto}>Itens {formatarMoeda(bruto)} · desconto {formatarMoeda(descontoCentavos)}</p>}
              </div>
            )}
            {conferencia.trocoCentavos > 0 && <p className={estilos.troco}>Troco de {formatarMoeda(conferencia.trocoCentavos)}</p>}

            <button type="button" className={estilos.cobrar} onClick={() => void cobrar()} disabled={ocupado || total <= 0}>
              {ocupado ? "Fechando…" : `Cobrar ${formatarMoeda(total)}`}
            </button>
            {erro && (
              <p role="alert" className={estilos.erro}>
                {erro}
              </p>
            )}
            {aviso && (
              <p role="status" className={estilos.aviso}>
                {aviso}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className={estilos.coluna}>
        {caixa ? (
          <section className={`${estilos.bloco} ${estilos.dia}`} aria-labelledby="titulo-hoje">
            <div className={estilos.cabeca}>
              <h2 id="titulo-hoje">Caixa de hoje</h2>
              <span>desde {new Date(caixa.abertoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            {/* Sem "esperado na gaveta" aqui: a contagem do fechamento é às
                cegas, e o número à vista no painel desfazia isso. */}
            <div className={estilos.quadros}>
              <Quadro rotulo="Vendido no caixa" centavos={caixa.resumo.vendidoCentavos} />
              <Quadro rotulo="Em dinheiro" centavos={caixa.resumo.emDinheiroCentavos} />
              <Quadro rotulo="Troco inicial" centavos={caixa.aberturaCentavos} />
              <Quadro rotulo="Tirado da gaveta" centavos={caixa.resumo.sangriaCentavos} />
            </div>
            <div className={estilos.acoes}>
              <button type="button" onClick={() => setTirando(true)} aria-label="Tirar dinheiro da gaveta">
                Tirar dinheiro
              </button>
              <button type="button" data-principal onClick={() => setFechandoCaixa(true)}>
                Fechar caixa
              </button>
            </div>
          </section>
        ) : (
          <section className={`${estilos.bloco} ${estilos.dia}`} aria-labelledby="titulo-hoje">
            <h2 id="titulo-hoje">Caixa fechado</h2>
            <p className={estilos.vazio}>Dá para vender assim mesmo: a venda fica registrada, só não entra na conferência da gaveta.</p>
            <div className={estilos.acoes}>
              <button type="button" data-principal onClick={() => setAbrindoCaixa(true)} disabled={!dados}>
                Abrir o caixa
              </button>
            </div>
          </section>
        )}

        <section className={`${estilos.bloco} ${estilos.dia}`} aria-labelledby="titulo-30">
          <h2 id="titulo-30">Os últimos 30 dias</h2>
          {dados && dados.resumo.vendas > 0 ? (
            <>
              <div className={estilos.quadros}>
                <Quadro rotulo="Vendeu" centavos={dados.resumo.brutoCentavos} apoio={`${dados.resumo.vendas} ${dados.resumo.vendas === 1 ? "venda" : "vendas"}`} />
                <Quadro rotulo="Vira seu" centavos={dados.resumo.liquidoCentavos} apoio={`maquininha ${formatarMoeda(dados.resumo.taxasCentavos)}`} />
                <Quadro rotulo="Ainda vai cair" centavos={dados.resumo.aReceberCentavos} apoio="cartão a receber" />
                <Quadro rotulo="No fiado" centavos={dados.resumo.fiadoCentavos} apoio="sem data para cair" tom={dados.resumo.fiadoCentavos > 0 ? "negativo" : undefined} />
              </div>
              {dados.aCair.length > 0 && (
                <div className={estilos.separa}>
                  <span className={estilos.rotulo}>Próximos dias</span>
                  {dados.aCair.slice(0, 6).map((linha) => (
                    <div key={linha.dia} className={estilos.linha}>
                      <span>{new Date(`${linha.dia}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                      <b>{formatarMoeda(linha.valorCentavos)}</b>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className={estilos.vazio}>Nenhuma venda nos últimos 30 dias.</p>
          )}
        </section>

      </div>

        <section className={`${estilos.bloco} ${estilos.dia} ${estilos.ultimas}`} aria-labelledby="titulo-ultimas">
          <h2 id="titulo-ultimas">Últimas vendas</h2>
          {!dados || dados.ultimasVendas.length === 0 ? (
            <p className={estilos.vazio}>Nenhuma venda ainda. Cada venda aparece aqui, com a nota para emitir ao lado.</p>
          ) : (
            <div className={estilos.listaVendas}>
              {dados.ultimasVendas.map((venda) => (
                <div key={venda.id} className={estilos.venda}>
                  <span>#{venda.numero}</span>
                  <span>{new Date(venda.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                  <b>{formatarMoeda(venda.totalCentavos)}</b>
                  {venda.notaFiscal?.status === "EMITIDA" ? (
                    <span className={estilos.nota} data-status="EMITIDA">
                      nota emitida
                    </span>
                  ) : venda.notaFiscal?.status === "CANCELADA" ? (
                    <span className={estilos.nota}>nota cancelada</span>
                  ) : (
                    <button
                      type="button"
                      className={estilos.nota}
                      onClick={() => void emitirNota(venda.id)}
                      disabled={notaEmOperacao === venda.id}
                      title={venda.notaFiscal?.status === "REJEITADA" ? "A tentativa anterior foi rejeitada. Corrija o que faltar e tente de novo." : undefined}
                    >
                      {notaEmOperacao === venda.id ? "emitindo…" : venda.notaFiscal?.status === "REJEITADA" ? "tentar de novo" : "emitir nota"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {notaErro && <p className={estilos.erro}>{notaErro}</p>}
        </section>

      <FecharCaixa aberto={fechandoCaixa} resumo={caixa ? { ...caixa.resumo, aberturaCentavos: caixa.aberturaCentavos } : null} aoFechar={() => setFechandoCaixa(false)} aoConcluir={carregar} />
      <TirarDinheiro aberto={tirando} aoFechar={() => setTirando(false)} aoConcluir={carregar} />

      <Dialog open={abrindoCaixa} onOpenChange={(aberto) => !ocupado && setAbrindoCaixa(aberto)}>
        <DialogContent largura="curta">
          <DialogHeader>
            <DialogTitle>Abrir o caixa</DialogTitle>
            <DialogDescription>Quanto de troco já está na gaveta? No fim do dia o Tino confere se o dinheiro bate.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <form onSubmit={abrirCaixa} className="grid gap-4">
              <label className={estilos.campo}>
                Troco na gaveta (R$)
                <Input inputMode="decimal" value={trocoInicial} onChange={(evento) => setTrocoInicial(evento.target.value)} placeholder="0,00" autoFocus />
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setAbrindoCaixa(false)} disabled={ocupado}>
                  Cancelar
                </Button>
                <Button disabled={ocupado}>{ocupado ? "Abrindo…" : "Abrir o caixa"}</Button>
              </div>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  )
}

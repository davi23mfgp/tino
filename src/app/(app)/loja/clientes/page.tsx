"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { FileText, MessageCircle, Phone, Plus, Search, UserPlus } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, formatarPercentual } from "@/lib/dinheiro"
import { TrilhaLoja } from "@/components/trilha-loja"
import { Input } from "@/components/ui/input"
import { showToast } from "@/components/ui/toast"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { Avatar, linkDoWhatsApp, numeroDoOrcamento, Reais, Selo, type OrcamentoDaFicha, type Resumo, type Retomar } from "./comum"
import { EditorDeOrcamento, type Salvo } from "./editor"
import { FichaDoCliente } from "./ficha"
import estilos from "./clientes.module.css"

const TONS = { rascunho: "color-mix(in oklab, var(--foreground), transparent 78%)", enviado: "color-mix(in oklab, var(--foreground), transparent 58%)", visto: "color-mix(in oklab, var(--foreground), transparent 30%)" }

/**
 * Clientes, opção A do passo 36 (Davi, 05/10/2026): o próximo passo
 * primeiro. A tela abre no que pede o dono hoje; o que está em aberto e a
 * taxa de fechamento vêm logo abaixo, com a referência dos 90 dias antes.
 * No computador a ficha do cliente fica ao lado; no celular ela toma a tela.
 */
export default function Clientes() {
  const [dados, setDados] = useState<Resumo | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [busca, setBusca] = useState("")
  const [versao, setVersao] = useState(0)
  const [editor, setEditor] = useState<{ cliente?: { id: string; nome: string } | null; orcamento?: (OrcamentoDaFicha & { clienteId: string }) | null } | null>(null)
  const [compartilhar, setCompartilhar] = useState<string | null>(null)
  const [novoCliente, setNovoCliente] = useState(false)
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(async () => {
    try {
      setDados(await buscar<Resumo>("/api/loja/clientes"))
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui carregar os clientes.")
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  // Link direto para um cliente (?cliente=id). No computador, sem escolha,
  // a ficha abre no primeiro a retomar, para o lado direito não ficar vazio.
  useEffect(() => {
    if (!dados || selecionado) return
    const pedido = new URLSearchParams(window.location.search).get("cliente")
    if (pedido && dados.clientes.some((cliente) => cliente.id === pedido)) return setSelecionado(pedido)
    if (window.matchMedia("(min-width: 1024px)").matches) setSelecionado(dados.retomar[0]?.clienteId ?? dados.clientes[0]?.id ?? null)
  }, [dados, selecionado])

  function abrir(id: string | null) {
    setSelecionado(id)
    setCompartilhar(null)
    const url = new URL(window.location.href)
    if (id) url.searchParams.set("cliente", id)
    else url.searchParams.delete("cliente")
    window.history.replaceState(null, "", url)
    if (id && !window.matchMedia("(min-width: 1024px)").matches) window.scrollTo({ top: 0 })
  }

  function aoSalvar(salvo: Salvo) {
    setEditor(null)
    abrir(salvo.clienteId)
    setCompartilhar(salvo.enviar ? salvo.orcamentoId : null)
    setVersao((atual) => atual + 1)
    void carregar()
    if (!salvo.enviar) showToast("Orçamento salvo")
  }

  async function cadastrar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!nome.trim() || ocupado) return
    setOcupado(true)
    try {
      const resposta = await enviar<{ cliente: { id: string }; existente: boolean }>("/api/loja/clientes", { nome: nome.trim(), telefone: telefone.trim() || undefined })
      showToast(resposta.existente ? "Esse cliente já estava cadastrado" : "Cliente cadastrado")
      setNovoCliente(false)
      setNome("")
      setTelefone("")
      await carregar()
      abrir(resposta.cliente.id)
    } catch (falha) {
      showToast(falha instanceof Error ? falha.message : "Não consegui cadastrar.", { variant: "error" })
    } finally {
      setOcupado(false)
    }
  }

  const filtrados = useMemo(() => {
    if (!dados) return []
    const termo = busca.trim().toLowerCase()
    if (!termo) return dados.clientes
    const digitos = termo.replace(/\D/g, "")
    return dados.clientes.filter(
      (cliente) =>
        cliente.nome.toLowerCase().includes(termo) ||
        (digitos.length >= 3 && cliente.telefone?.replace(/\D/g, "").includes(digitos)) ||
        (digitos.length > 0 && cliente.numeros.some((numero) => String(numero) === String(Number(digitos)))),
    )
  }, [dados, busca])

  const botoesDoCartao = (cartao: Retomar) => {
    const abrirFicha = <button type="button" className={`${estilos.botao} ${estilos.pequeno}`} onClick={() => abrir(cartao.clienteId)}><FileText aria-hidden />Abrir</button>
    if (cartao.quando === "terminar" || !cartao.telefone) return abrirFicha
    const assunto = cartao.numero ? `Olá, ${cartao.nome.split(" ")[0]}! Sobre o orçamento ${numeroDoOrcamento(cartao.numero)}:` : `Olá, ${cartao.nome.split(" ")[0]}!`
    return (
      <>
        <a className={`${estilos.botao} ${estilos.pequeno}`} href={`tel:${cartao.telefone.replace(/[^\d+]/g, "")}`}><Phone aria-hidden />Ligar</a>
        <a className={`${estilos.botao} ${estilos.pequeno}`} href={linkDoWhatsApp(cartao.telefone, assunto)} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden />WhatsApp</a>
        {abrirFicha}
      </>
    )
  }

  const fechamento = dados?.fechamento
  const aberto = dados?.emAberto

  return (
    <div className={estilos.pagina}>
      <TrilhaLoja pagina="Clientes" />

      <div className={estilos.topo}>
        <p>Quem pediu preço, quem fechou e o que falta fazer.</p>
        <div className={estilos.botoes}>
          <button type="button" className={estilos.botao} onClick={() => setNovoCliente(true)}><UserPlus aria-hidden />Cliente</button>
          <button type="button" className={estilos.botao} data-principal onClick={() => setEditor({})}><Plus aria-hidden />Novo orçamento</button>
        </div>
      </div>

      {erro && <p className={estilos.erro}>{erro}</p>}
      {!dados && !erro && <p className={`${estilos.bloco} ${estilos.vazio}`}>Carregando os clientes…</p>}

      {dados && (
        <div className={estilos.grade} data-ficha={selecionado ? "" : undefined}>
          <div className={estilos.coluna}>
            <div className={estilos.titulo}><h2>Para retomar hoje</h2><span>{dados.retomar.length}</span></div>
            {dados.retomar.length === 0 ? (
              <p className={`${estilos.bloco} ${estilos.vazio}`}>Nada para retomar hoje. Orçamento enviado e passo marcado aparecem aqui no dia.</p>
            ) : (
              dados.retomar.map((cartao) => (
                <div key={`${cartao.clienteId}-${cartao.orcamentoId ?? "passo"}`} className={`${estilos.bloco} ${estilos.cartao}`}>
                  <button type="button" className={estilos.cartaoTopo} onClick={() => abrir(cartao.clienteId)}>
                    <Avatar nome={cartao.nome} />
                    <span><b className={estilos.nome}>{cartao.nome}</b><span className={estilos.sub}>{cartao.linha}</span></span>
                    <span className={estilos.valorLado}>
                      {cartao.valorCentavos !== null && <span className={estilos.valor}><Reais centavos={cartao.valorCentavos} /></span>}
                      <Selo texto={cartao.quando} tom={cartao.tom === "neutro" ? undefined : cartao.tom} />
                    </span>
                  </button>
                  <div className={estilos.acoes}>{botoesDoCartao(cartao)}</div>
                </div>
              ))
            )}

            {aberto && fechamento && (
              <section className={`${estilos.bloco} ${estilos.funil}`} aria-label="Em aberto">
                <header><span>Em aberto</span><span>{aberto.quantidade} {aberto.quantidade === 1 ? "orçamento" : "orçamentos"}</span></header>
                <span className={estilos.grande}><Reais centavos={aberto.totalCentavos} /></span>
                {aberto.totalCentavos > 0 ? (
                  <>
                    <div className={estilos.barra} aria-hidden>
                      {(["rascunho", "enviado", "visto"] as const).map((parte) => aberto.partes[parte] > 0 && <i key={parte} style={{ flex: aberto.partes[parte], background: TONS[parte] }} />)}
                    </div>
                    <div className={estilos.legenda}>
                      <span><i style={{ background: TONS.rascunho }} />rascunho {formatarMoeda(aberto.partes.rascunho)}</span>
                      <span><i style={{ background: TONS.enviado }} />enviado {formatarMoeda(aberto.partes.enviado)}</span>
                      <span><i style={{ background: TONS.visto }} />aberto {formatarMoeda(aberto.partes.visto)}</span>
                    </div>
                  </>
                ) : (
                  <span className={estilos.sub}>Nada em aberto. Faça um orçamento e mande o link pelo WhatsApp.</span>
                )}
                <div className={estilos.fechamento}>
                  {fechamento.atual.bps === null ? (
                    "Nenhum orçamento enviado nos últimos 90 dias: a taxa de fechamento aparece depois do primeiro."
                  ) : (
                    <>
                      Fechou {fechamento.atual.fechados} de {fechamento.atual.enviados} nos últimos 90 dias: <b>{formatarPercentual(fechamento.atual.bps, 0)}</b>
                      {fechamento.anterior.bps === null ? " · sem envio nos 90 dias anteriores" : ` · antes ${formatarPercentual(fechamento.anterior.bps, 0)}`}
                    </>
                  )}
                </div>
              </section>
            )}

            <label className={estilos.busca}>
              <Search aria-hidden />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente, telefone ou orçamento" aria-label="Buscar cliente, telefone ou orçamento" />
            </label>

            <div className={estilos.titulo}><h2>Todos os clientes</h2><span>{dados.clientes.length}</span></div>
            {filtrados.length === 0 ? (
              <p className={`${estilos.bloco} ${estilos.vazio}`}>{dados.clientes.length === 0 ? "Nenhum cliente ainda. Quem compra fiado no Balcão aparece aqui, e você pode cadastrar." : "Ninguém com esse nome, telefone ou número."}</p>
            ) : (
              <div className={`${estilos.bloco} ${estilos.lista}`}>
                {filtrados.map((cliente) => (
                  <button key={cliente.id} type="button" className={estilos.linha} aria-current={cliente.id === selecionado} onClick={() => abrir(cliente.id)}>
                    <Avatar nome={cliente.nome} />
                    <span><b className={estilos.nome}>{cliente.nome}</b><span className={estilos.sub}>{cliente.detalhe}</span></span>
                    <span className={estilos.direita}>
                      {cliente.valorCentavos !== null && <b>{formatarMoeda(cliente.valorCentavos)}</b>}
                      <small>{cliente.rotuloValor}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={estilos.lado}>
            {selecionado ? (
              <FichaDoCliente
                clienteId={selecionado}
                atualizar={versao}
                compartilharAoAbrir={compartilhar}
                aoVoltar={() => abrir(null)}
                aoMudar={() => void carregar()}
                aoEditar={(orcamento) => setEditor({ orcamento })}
                aoNovoOrcamento={(cliente) => setEditor({ cliente })}
              />
            ) : (
              <p className={`${estilos.bloco} ${estilos.vazio}`}>Escolha um cliente para ver a ficha.</p>
            )}
          </div>
        </div>
      )}

      <EditorDeOrcamento
        aberto={editor !== null}
        aoFechar={() => setEditor(null)}
        aoSalvar={aoSalvar}
        clientes={dados?.clientes ?? []}
        cliente={editor?.cliente ?? null}
        orcamento={editor?.orcamento ?? null}
      />

      <Dialog open={novoCliente} onOpenChange={(abrirDialogo) => !abrirDialogo && setNovoCliente(false)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
            <DialogDescription>Nome e telefone bastam. O telefone é o que abre o WhatsApp.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <form className={estilos.form} onSubmit={cadastrar}>
              <label className={estilos.campo}>Nome<Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} autoFocus /></label>
              <label className={estilos.campo}>Telefone<Input inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} maxLength={20} placeholder="(11) 9 0000-0000" /></label>
              <button type="submit" className={estilos.botao} data-principal disabled={ocupado || !nome.trim()}>Cadastrar</button>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  )
}

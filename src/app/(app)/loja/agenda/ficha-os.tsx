"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, ExternalLink, Link2, MessageCircle, Pencil, Plus, ShoppingBag, Square, SquareCheck } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda } from "@/lib/dinheiro"
import { ETAPAS, mensagemDePronto, numeroDaOrdem, prazoDaOrdem, rotuloDaEtapa, type Etapa, type ItemDaChecklist } from "@/lib/loja/agenda"
import { Input } from "@/components/ui/input"
import { showToast } from "@/components/ui/toast"

import { linkDoWhatsApp, Reais, Selo } from "../clientes/comum"
import base from "../clientes/clientes.module.css"
import estilos from "./agenda.module.css"
import type { OrdemParaEditar } from "./dialogos"

interface Ordem {
  id: string
  numero: number
  objeto: string
  servico: string
  naEntrada: string | null
  etapa: Etapa
  etapasEm: Record<string, string>
  prazoEm: string | null
  valorCentavos: number | null
  checklist: ItemDaChecklist[]
  orcamentoId: string | null
  vendaId: string | null
  link: string
  cliente: { id: string; nome: string; telefone: string | null }
  orcamento: { numero: number; status: string; aprovadoPeloCliente: boolean } | null
  venda: { numero: number } | null
}

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
const prazoCurto = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).replace(".", "").replace(",", "")

export function FichaDaOrdem({ id, atualizar, aoVoltar, aoMudar, aoEditar }: {
  id: string
  atualizar: number
  aoVoltar: () => void
  aoMudar: () => void
  aoEditar: (ordem: OrdemParaEditar) => void
}) {
  const [dados, setDados] = useState<{ loja: { nome: string }; ordem: Ordem } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [novoItem, setNovoItem] = useState("")
  const [avisar, setAvisar] = useState(false)

  const carregar = useCallback(async () => {
    try {
      setErro(null)
      setDados(await buscar(`/api/loja/ordens/${id}`))
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui abrir a ordem de serviço.")
    }
  }, [id])

  useEffect(() => {
    setDados(null)
    setAvisar(false)
    void carregar()
  }, [carregar, atualizar])

  async function mudar(parte: Partial<Pick<Ordem, "etapa" | "checklist">>, sucesso?: string) {
    setOcupado(true)
    try {
      await enviar(`/api/loja/ordens/${id}`, parte, "PATCH")
      if (sucesso) showToast(sucesso)
      await carregar()
      aoMudar()
      return true
    } catch (falha) {
      showToast(falha instanceof Error ? falha.message : "Não consegui salvar.", { variant: "error" })
      return false
    } finally {
      setOcupado(false)
    }
  }

  if (erro) return <section className={`${base.bloco} ${base.ficha}`}><button type="button" className={base.voltar} onClick={aoVoltar}><ArrowLeft size={16} aria-hidden />Agenda</button><p className={base.erro}>{erro}</p></section>
  if (!dados) return <section className={`${base.bloco} ${base.vazio}`}>Carregando a ordem de serviço…</section>

  const { ordem } = dados
  const url = typeof window === "undefined" ? ordem.link : `${window.location.origin}${ordem.link}`
  const prazo = prazoDaOrdem(ordem.prazoEm ? new Date(ordem.prazoEm) : null, ordem.etapa, new Date())
  const atual = ETAPAS.findIndex((etapa) => etapa.valor === ordem.etapa)
  const feitos = ordem.checklist.filter((item) => item.feito).length
  const mensagem = mensagemDePronto(ordem.cliente.nome, ordem.objeto, dados.loja.nome, url)
  const orcamentoAberto = ordem.orcamento && (ordem.orcamento.status === "ENVIADO" || ordem.orcamento.status === "APROVADO")
  const pagoPeloOrcamento = ordem.orcamento?.status === "CONVERTIDO"
  const podeCobrar = !ordem.vendaId && !pagoPeloOrcamento && (orcamentoAberto || ordem.valorCentavos !== null)
  const cobrar = orcamentoAberto ? `/loja?orcamento=${ordem.orcamentoId}&os=${ordem.id}` : `/loja?os=${ordem.id}`

  return (
    <section className={`${base.bloco} ${base.ficha}`} aria-labelledby="ficha-os">
      <button type="button" className={base.voltar} onClick={aoVoltar}><ArrowLeft size={16} aria-hidden />Agenda</button>

      <div className={base.orcTopo}>
        <div>
          <p className={base.sub}>Ordem de serviço {numeroDaOrdem(ordem.numero)}</p>
          <h2 id="ficha-os" style={{ fontSize: "calc(20px * var(--escala-letra))", fontWeight: 700 }}>{ordem.objeto} de {ordem.cliente.nome}</h2>
          <p className={base.sub}>
            {ordem.servico}
            {ordem.orcamento ? ` · do orçamento ${String(ordem.orcamento.numero).padStart(4, "0")}${ordem.orcamento.aprovadoPeloCliente ? ", aprovado pelo link" : ""}` : ""}
          </p>
        </div>
        <Selo texto={rotuloDaEtapa(ordem.etapa).toLowerCase()} tom={ordem.etapa === "PRONTO" ? "positivo" : undefined} />
      </div>

      <div className={base.quadros} style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <div className={`${base.bloco} ${base.quadro}`} style={{ gridColumn: "auto" }}>
          <span>Valor</span>
          <strong>{ordem.valorCentavos !== null ? <Reais centavos={ordem.valorCentavos} /> : "sem preço"}</strong>
          <small>{ordem.venda ? `pago na venda ${ordem.venda.numero}` : pagoPeloOrcamento ? "pago pelo orçamento" : ordem.valorCentavos === null ? "defina depois do diagnóstico" : "a cobrar"}</small>
        </div>
        <div className={`${base.bloco} ${base.quadro}`}>
          <span>Prazo</span>
          <strong>{ordem.prazoEm ? prazoCurto(ordem.prazoEm) : "sem prazo"}</strong>
          <small style={prazo.tom === "atencao" ? { color: "var(--atencao)" } : undefined}>{ordem.prazoEm ? prazo.texto : "combine com o cliente"}</small>
        </div>
      </div>

      {ordem.naEntrada && <div className={estilos.entrada}><b>Na entrada:</b> {ordem.naEntrada}</div>}

      <div>
        <p className={estilos.rotulo}>Etapa (toque para mudar)</p>
        <div className={estilos.etapas}>
          {ETAPAS.map((etapa, indice) => {
            const quando = ordem.etapasEm[etapa.valor]
            // Etapa pulada (de "recebido" direto para "pronto") não vira
            // feita: a ficha diria que o aparelho esperou peça sem ter esperado.
            const estado = indice === atual ? "agora" : indice < atual && quando ? "feito" : "depois"
            return (
              <button key={etapa.valor} type="button" className={estilos.etapa} data-estado={estado} disabled={ocupado || estado === "agora"} onClick={() => void mudar({ etapa: etapa.valor }, `OS ${numeroDaOrdem(ordem.numero)}: ${etapa.rotulo.toLowerCase()}`)}>
                <span aria-hidden>{estado === "feito" && <Check />}</span>
                <span>{etapa.rotulo}</span>
                <small>{quando ? (estado === "agora" ? `desde ${dataCurta(quando)}` : dataCurta(quando)) : ""}</small>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className={estilos.rotulo}>Checklist{ordem.checklist.length ? ` · ${feitos} de ${ordem.checklist.length}` : ""}</p>
        {ordem.checklist.map((item, indice) => (
          <button key={`${item.texto}-${indice}`} type="button" className={estilos.check} aria-pressed={item.feito} disabled={ocupado}
            onClick={() => void mudar({ checklist: ordem.checklist.map((linha, i) => (i === indice ? { ...linha, feito: !linha.feito } : linha)) })}>
            {item.feito ? <SquareCheck aria-hidden /> : <Square aria-hidden />}<span>{item.texto}</span>
          </button>
        ))}
        <form className={estilos.novoCheck} onSubmit={async (evento) => {
          evento.preventDefault()
          if (!novoItem.trim()) return
          if (await mudar({ checklist: [...ordem.checklist, { texto: novoItem.trim(), feito: false }] })) setNovoItem("")
        }}>
          <Input aria-label="Novo item da checklist" value={novoItem} onChange={(e) => setNovoItem(e.target.value)} maxLength={120} placeholder="Testar câmera e alto-falante" />
          <button type="submit" className={`${base.botao} ${base.pequeno}`} disabled={ocupado || !novoItem.trim()}><Plus aria-hidden />Pôr</button>
        </form>
      </div>

      {avisar && (
        <div className={base.compartilhar}>
          <b>Pronto. Mande para {ordem.cliente.nome.split(" ")[0]}:</b>
          <code>{mensagem}</code>
          <div className={base.acoes}>
            <a className={`${base.botao} ${base.pequeno}`} data-principal href={linkDoWhatsApp(ordem.cliente.telefone, mensagem)} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden />Abrir no WhatsApp</a>
          </div>
        </div>
      )}

      <div className={base.acoes}>
        {ordem.etapa !== "PRONTO" && ordem.etapa !== "ENTREGUE" && (
          <button type="button" className={base.botao} data-principal disabled={ocupado} onClick={async () => { if (await mudar({ etapa: "PRONTO" }, "Marcado como pronto")) setAvisar(true) }}>
            <MessageCircle aria-hidden />Pronto: avisar o cliente
          </button>
        )}
        {ordem.etapa === "PRONTO" && <button type="button" className={base.botao} data-principal disabled={ocupado} onClick={() => void mudar({ etapa: "ENTREGUE" }, "Entregue")}><Check aria-hidden />Entregue</button>}
        {ordem.etapa === "PRONTO" && !avisar && <button type="button" className={base.botao} onClick={() => setAvisar(true)}><MessageCircle aria-hidden />Avisar no WhatsApp</button>}
        {podeCobrar && <Link className={base.botao} href={cobrar}><ShoppingBag aria-hidden />Cobrar no Balcão</Link>}
        <button type="button" className={base.botao} onClick={() => void navigator.clipboard.writeText(url).then(() => showToast("Link copiado", { description: "O cliente vê em que etapa está." }), () => window.prompt("Copie o link:", url))}><Link2 aria-hidden />Link de acompanhamento</button>
        <a className={base.botao} href={url} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden />Ver como o cliente vê</a>
        <button type="button" className={base.botao} onClick={() => aoEditar({ id: ordem.id, objeto: ordem.objeto, servico: ordem.servico, naEntrada: ordem.naEntrada, prazoEm: ordem.prazoEm, valorCentavos: ordem.valorCentavos })}><Pencil aria-hidden />Editar</button>
      </div>
      {ordem.valorCentavos !== null && !ordem.venda && !pagoPeloOrcamento && !orcamentoAberto && <p className={base.dica}>Cobrar no Balcão liga a venda a esta OS; a mão de obra entra como serviço no DAS.</p>}
      {ordem.valorCentavos === null && <p className={base.dica}>Sem preço ainda: depois do diagnóstico, edite e ponha o valor, ou faça o orçamento na tela Clientes.</p>}
      {ordem.venda && <p className={base.dica}>Paga na venda {ordem.venda.numero}: {formatarMoeda(ordem.valorCentavos ?? 0)}.</p>}
    </section>
  )
}

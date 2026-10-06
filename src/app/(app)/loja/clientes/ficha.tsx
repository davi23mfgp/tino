"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, Clock, ExternalLink, FileText, Link2, MessageCircle, Pencil, Phone, Plus, ShoppingBag, Wrench, X } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda } from "@/lib/dinheiro"
import { MOTIVOS_DE_PERDA, rotuloDoMotivo, type MotivoPerda } from "@/lib/loja/orcamento"
import { Input } from "@/components/ui/input"
import { showToast } from "@/components/ui/toast"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { Avatar, diaGravado, formatarTelefone, linkDoWhatsApp, numeroDoOrcamento, quandoFoi, Reais, ROTULO_SITUACAO, Selo, type Ficha, type OrcamentoDaFicha } from "./comum"
import estilos from "./clientes.module.css"

/** Valor para o campo datetime-local, na hora do aparelho. */
function paraCampo(data: Date) {
  const local = new Date(data.getTime() - data.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

const ANDANDO = ["rascunho", "enviado", "visto", "vencido", "aprovado"]

export function FichaDoCliente({
  clienteId, atualizar, compartilharAoAbrir, aoVoltar, aoMudar, aoEditar, aoNovoOrcamento,
}: {
  clienteId: string
  atualizar: number
  compartilharAoAbrir: string | null
  aoVoltar: () => void
  aoMudar: () => void
  aoEditar: (orcamento: OrcamentoDaFicha & { clienteId: string }) => void
  aoNovoOrcamento: (cliente: { id: string; nome: string }) => void
}) {
  const [ficha, setFicha] = useState<Ficha | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const [link, setLink] = useState<{ orcamentoId: string; url: string } | null>(null)
  const [editandoPasso, setEditandoPasso] = useState(false)
  const [passo, setPasso] = useState("")
  const [quando, setQuando] = useState("")
  const [perdendo, setPerdendo] = useState(false)
  const [motivo, setMotivo] = useState<MotivoPerda | null>(null)
  const [detalhe, setDetalhe] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [contato, setContato] = useState<{ nome: string; telefone: string; email: string; observacao: string } | null>(null)

  const carregar = useCallback(async () => {
    try {
      setErro(null)
      setFicha(await buscar<Ficha>(`/api/loja/clientes/${clienteId}`))
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui abrir a ficha.")
    }
  }, [clienteId])

  useEffect(() => {
    setFicha(null)
    setEscolhido(null)
    setLink(null)
    setEditandoPasso(false)
    void carregar()
  }, [carregar, atualizar])

  const orcamento =
    ficha?.orcamentos.find((linha) => linha.id === escolhido) ??
    ficha?.orcamentos.find((linha) => linha.id === compartilharAoAbrir) ??
    ficha?.orcamentos.find((linha) => ANDANDO.includes(linha.situacao)) ??
    ficha?.orcamentos[0] ??
    null

  // "Salvar e enviar o link" no editor chega aqui: a ficha manda e abre o
  // painel de compartilhar, num clique a mais do dono (sem pop-up bloqueado).
  useEffect(() => {
    if (!ficha || !compartilharAoAbrir || link?.orcamentoId === compartilharAoAbrir) return
    const alvo = ficha.orcamentos.find((linha) => linha.id === compartilharAoAbrir)
    if (alvo && (alvo.status === "RASCUNHO" || alvo.status === "ENVIADO")) void mandarLink(alvo)
  }, [ficha, compartilharAoAbrir]) // eslint-disable-line react-hooks/exhaustive-deps

  async function executar(operacao: () => Promise<unknown>, sucesso?: string) {
    setOcupado(true)
    try {
      await operacao()
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

  async function mandarLink(alvo: OrcamentoDaFicha) {
    await executar(async () => {
      const resposta = await enviar<{ link: string; renovado: boolean }>(`/api/loja/orcamentos/${alvo.id}/acao`, { acao: "enviar" })
      setEscolhido(alvo.id)
      setLink({ orcamentoId: alvo.id, url: `${window.location.origin}${resposta.link}` })
      if (resposta.renovado) showToast("Validade renovada por 7 dias", { description: "O orçamento tinha vencido." })
    })
  }

  async function salvarPasso(evento: React.FormEvent) {
    evento.preventDefault()
    if (!passo.trim() || !quando) return showToast("Diga o que fazer e quando.", { variant: "error" })
    const salvo = await executar(() => enviar(`/api/loja/clientes/${clienteId}`, { proximoPasso: passo.trim(), proximoPassoEm: new Date(quando).toISOString() }, "PATCH"), "Próximo passo marcado")
    if (salvo) setEditandoPasso(false)
  }

  async function perder() {
    if (!orcamento || !motivo) return
    const salvo = await executar(() => enviar(`/api/loja/orcamentos/${orcamento.id}/acao`, { acao: "perder", motivo, detalhe: detalhe.trim() || undefined }), "Orçamento marcado como perdido")
    if (salvo) { setPerdendo(false); setMotivo(null); setDetalhe("") }
  }

  if (erro) return <section className={`${estilos.bloco} ${estilos.ficha}`}><button type="button" className={estilos.voltar} onClick={aoVoltar}><ArrowLeft size={16} aria-hidden />Clientes</button><p className={estilos.erro}>{erro}</p></section>
  if (!ficha) return <section className={`${estilos.bloco} ${estilos.vazio}`}>Carregando a ficha…</section>

  const { cliente } = ficha
  const primeiroNome = cliente.nome.split(" ")[0]
  const desde = new Date(cliente.criadoEm).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  const mensagemDoLink = link && orcamento ? `Olá, ${primeiroNome}! Segue o orçamento ${numeroDoOrcamento(orcamento.numero)} da ${ficha.loja.nome}: ${link.url}` : ""
  const situacao = orcamento ? ROTULO_SITUACAO[orcamento.situacao] : null
  const passoAtrasado = cliente.proximoPassoEm && new Date(cliente.proximoPassoEm).getTime() < Date.now()

  return (
    <section className={`${estilos.bloco} ${estilos.ficha}`} aria-labelledby="ficha-nome">
      <button type="button" className={estilos.voltar} onClick={aoVoltar}><ArrowLeft size={16} aria-hidden />Clientes</button>

      <div className={estilos.fichaTopo}>
        <Avatar nome={cliente.nome} grande />
        <div>
          <h2 id="ficha-nome">{cliente.nome}</h2>
          <p className={estilos.sub}>
            {[cliente.telefone ? formatarTelefone(cliente.telefone) : null, `desde ${desde}`, ficha.compras.quantidade > 0 ? `${ficha.compras.quantidade} ${ficha.compras.quantidade === 1 ? "compra" : "compras"}, ${formatarMoeda(ficha.compras.totalCentavos)}` : "nenhuma compra ainda", ficha.fiadoCentavos > 0 ? `${formatarMoeda(ficha.fiadoCentavos)} no fiado` : null].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className={estilos.acoes}>
          {cliente.telefone && <a className={`${estilos.botao} ${estilos.pequeno}`} href={`tel:${cliente.telefone.replace(/[^\d+]/g, "")}`}><Phone aria-hidden />Ligar</a>}
          {cliente.telefone && <a className={`${estilos.botao} ${estilos.pequeno}`} href={linkDoWhatsApp(cliente.telefone, `Olá, ${primeiroNome}!`)} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden />WhatsApp</a>}
          <button type="button" className={`${estilos.botao} ${estilos.pequeno}`} onClick={() => setContato({ nome: cliente.nome, telefone: cliente.telefone ?? "", email: cliente.email ?? "", observacao: cliente.observacao ?? "" })}><Pencil aria-hidden />Editar contato</button>
        </div>
      </div>
      {(cliente.email || cliente.observacao) && <p className={estilos.dica}>{[cliente.email, cliente.observacao].filter(Boolean).join(" · ")}</p>}

      {editandoPasso ? (
        <form className={`${estilos.passo} ${estilos.formPasso}`} data-calmo onSubmit={salvarPasso}>
          <label className={estilos.campo}>O que fazer<Input value={passo} onChange={(e) => setPasso(e.target.value)} placeholder="Ligar para confirmar a cor da tela" maxLength={140} autoFocus /></label>
          <label className={estilos.campo}>Quando<Input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} /></label>
          <div className={estilos.acoes}>
            <button type="submit" className={`${estilos.botao} ${estilos.pequeno}`} data-principal disabled={ocupado}>Marcar</button>
            <button type="button" className={`${estilos.botao} ${estilos.pequeno}`} onClick={() => setEditandoPasso(false)}>Cancelar</button>
          </div>
        </form>
      ) : cliente.proximoPasso && cliente.proximoPassoEm ? (
        <div className={estilos.passo} data-calmo={passoAtrasado ? undefined : ""}>
          <Clock aria-hidden />
          <div><b>Próximo passo:</b> {cliente.proximoPasso}<small>{passoAtrasado ? "passou: " : ""}{quandoFoi(cliente.proximoPassoEm)}</small></div>
          <button type="button" className={`${estilos.botao} ${estilos.pequeno}`} onClick={() => { setPasso(cliente.proximoPasso ?? ""); setQuando(paraCampo(new Date(cliente.proximoPassoEm!))); setEditandoPasso(true) }}><Pencil aria-hidden />Mudar</button>
          <button type="button" className={`${estilos.botao} ${estilos.pequeno}`} disabled={ocupado} onClick={() => void executar(() => enviar(`/api/loja/clientes/${clienteId}`, { proximoPasso: null }, "PATCH"), "Passo feito")}><Check aria-hidden />Feito</button>
        </div>
      ) : (
        <button type="button" className={`${estilos.botao} ${estilos.pequeno}`} style={{ justifySelf: "start" }} onClick={() => { setPasso(""); setQuando(paraCampo(new Date(Date.now() + 86_400_000))); setEditandoPasso(true) }}>
          <Clock aria-hidden />Marcar próximo passo
        </button>
      )}

      {orcamento ? (
        <>
          <div className={estilos.orcTopo}>
            <h3>Orçamento {numeroDoOrcamento(orcamento.numero)}{orcamento.versao > 1 ? <span className={estilos.sub} style={{ display: "inline", marginLeft: 8 }}>versão {orcamento.versao}</span> : null}</h3>
            {situacao && <Selo texto={orcamento.situacao === "visto" ? `aberto ${orcamento.aberturas === 1 ? "1 vez" : `${orcamento.aberturas} vezes`}` : situacao.texto} tom={situacao.tom} />}
          </div>

          <div className={estilos.quadros}>
            <div className={`${estilos.bloco} ${estilos.quadro}`}>
              <span>Total</span>
              <strong><Reais centavos={orcamento.totalCentavos} /></strong>
              <small>{orcamento.validoAte ? (orcamento.situacao === "vencido" ? `venceu em ${diaGravado(orcamento.validoAte)}` : `vale até ${diaGravado(orcamento.validoAte)}`) : "sem validade"}</small>
            </div>
            <div className={`${estilos.bloco} ${estilos.quadro}`}>
              <span>Aberto pelo cliente</span>
              <strong>{orcamento.status === "RASCUNHO" ? "não enviado" : orcamento.aberturas === 0 ? "ainda não" : orcamento.aberturas === 1 ? "1 vez" : `${orcamento.aberturas} vezes`}</strong>
              <small>{orcamento.ultimaAberturaEm ? `último ${quandoFoi(orcamento.ultimaAberturaEm)}` : orcamento.enviadoEm ? `enviado ${quandoFoi(orcamento.enviadoEm)}` : "mande o link para contar"}</small>
            </div>
            <div className={`${estilos.bloco} ${estilos.quadro}`}>
              <span>Pagamento</span>
              <strong>{orcamento.pagamento.entradaCentavos > 0 ? "entrada" : orcamento.pagamento.parcelas.length > 1 ? `${orcamento.pagamento.parcelas.length}x` : "à vista"}</strong>
              <small>
                {orcamento.pagamento.entradaCentavos > 0
                  ? `${formatarMoeda(orcamento.pagamento.entradaCentavos)} + ${orcamento.pagamento.parcelas.length}x ${formatarMoeda(orcamento.pagamento.parcelas[0] ?? 0)}`
                  : orcamento.pagamento.parcelas.length > 1 ? `de ${formatarMoeda(orcamento.pagamento.parcelas[0] ?? 0)}` : "pagamento único"}
              </small>
            </div>
          </div>

          <div className={estilos.itens}>
            {orcamento.itens.map((item) => (
              <div key={item.id} className={estilos.item}>
                <span>{item.descricao}</span>
                <b>{formatarMoeda(item.totalCentavos ?? item.quantidade * item.precoUnitarioCentavos)}</b>
                <small>{item.quantidade} × {formatarMoeda(item.precoUnitarioCentavos)}{item.servicoId ? " · serviço" : item.produtoId ? " · peça" : ""}</small>
              </div>
            ))}
            {orcamento.descontoCentavos > 0 && <div className={estilos.item}><span>Desconto</span><b>{formatarMoeda(-orcamento.descontoCentavos)}</b></div>}
          </div>

          {link && link.orcamentoId === orcamento.id && (
            <div className={estilos.compartilhar}>
              <b>Link pronto. Mande para {primeiroNome}:</b>
              <code>{link.url}</code>
              <div className={estilos.acoes}>
                <a className={`${estilos.botao} ${estilos.pequeno}`} data-principal href={linkDoWhatsApp(cliente.telefone, mensagemDoLink)} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden />Abrir no WhatsApp</a>
                <button type="button" className={`${estilos.botao} ${estilos.pequeno}`} onClick={() => void navigator.clipboard.writeText(mensagemDoLink).then(() => showToast("Mensagem copiada"), () => window.prompt("Copie a mensagem:", mensagemDoLink))}><Link2 aria-hidden />Copiar</button>
                <a className={`${estilos.botao} ${estilos.pequeno}`} href={link.url} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden />Ver como o cliente vê</a>
              </div>
            </div>
          )}

          <div className={estilos.acoes}>
            {(orcamento.situacao === "enviado" || orcamento.situacao === "visto" || orcamento.situacao === "aprovado") && (
              <Link className={estilos.botao} data-principal href={`/loja?orcamento=${orcamento.id}`}><ShoppingBag aria-hidden />Virar venda no Balcão</Link>
            )}
            {(orcamento.situacao === "aprovado" || orcamento.situacao === "convertido") && (
              <Link className={estilos.botao} href={`/loja/agenda?nova-os=${orcamento.id}`}><Wrench aria-hidden />Abrir OS</Link>
            )}
            {orcamento.status === "RASCUNHO" && <button type="button" className={estilos.botao} data-principal disabled={ocupado} onClick={() => void mandarLink(orcamento)}><Link2 aria-hidden />Enviar link</button>}
            {orcamento.status === "ENVIADO" && <button type="button" className={estilos.botao} disabled={ocupado} onClick={() => void mandarLink(orcamento)}><Link2 aria-hidden />{orcamento.situacao === "vencido" ? "Renovar e reenviar" : "Reenviar link"}</button>}
            {(orcamento.status === "RASCUNHO" || orcamento.status === "ENVIADO") && <button type="button" className={estilos.botao} onClick={() => aoEditar({ ...orcamento, clienteId })}><FileText aria-hidden />Editar</button>}
            {["RASCUNHO", "ENVIADO", "APROVADO"].includes(orcamento.status) && <button type="button" className={estilos.botao} onClick={() => setPerdendo(true)}><X aria-hidden />Perdido</button>}
          </div>
          {orcamento.situacao === "perdido" && <p className={estilos.dica}>Perdido: {rotuloDoMotivo(orcamento.motivoPerda as MotivoPerda).toLowerCase()}{orcamento.motivoPerdaDetalhe ? `, ${orcamento.motivoPerdaDetalhe}` : ""}.</p>}
          {orcamento.situacao === "convertido" && <p className={estilos.dica}>Virou a venda {orcamento.vendaNumero ?? ""} no Balcão.</p>}
          {orcamento.situacao === "aprovado" && <p className={estilos.dica}>{orcamento.aprovadoPeloCliente ? "O cliente aprovou pelo link" : "Aprovado"}{orcamento.aprovadoEm ? ` ${quandoFoi(orcamento.aprovadoEm)}` : ""}. Combine a entrega e passe no Balcão.</p>}
          {["RASCUNHO", "ENVIADO", "APROVADO"].includes(orcamento.status) && <p className={estilos.dica}>Marcar como perdido pede o motivo: é o que diz, no fim do mês, se o problema é preço, prazo ou atendimento.</p>}
        </>
      ) : (
        <p className={estilos.dica}>Nenhum orçamento para {primeiroNome} ainda.</p>
      )}

      {ficha.orcamentos.length > 1 && (
        <div className={estilos.outros}>
          <div className={estilos.titulo}><h2>Orçamentos de {primeiroNome}</h2><span>{ficha.orcamentos.length}</span></div>
          {ficha.orcamentos.map((linha) => (
            <button key={linha.id} type="button" className={estilos.outro} aria-current={linha.id === orcamento?.id} onClick={() => setEscolhido(linha.id)}>
              <span>{numeroDoOrcamento(linha.numero)} · {ROTULO_SITUACAO[linha.situacao].texto}</span>
              <span className={estilos.num}>{formatarMoeda(linha.totalCentavos)}</span>
            </button>
          ))}
        </div>
      )}

      <button type="button" className={estilos.botao} style={{ justifySelf: "start" }} onClick={() => aoNovoOrcamento({ id: cliente.id, nome: cliente.nome })}><Plus aria-hidden />Novo orçamento para {primeiroNome}</button>

      <Dialog open={contato !== null} onOpenChange={(abrir) => !abrir && setContato(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Contato de {primeiroNome}</DialogTitle>
            <DialogDescription>O telefone é o que abre o WhatsApp e a ligação.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {contato && (
              <form
                className={estilos.form}
                onSubmit={async (evento) => {
                  evento.preventDefault()
                  if (!contato.nome.trim()) return showToast("O nome não pode ficar vazio.", { variant: "error" })
                  const salvo = await executar(() => enviar(`/api/loja/clientes/${clienteId}`, { nome: contato.nome.trim(), telefone: contato.telefone.trim() || null, email: contato.email.trim() || null, observacao: contato.observacao.trim() || null }, "PATCH"), "Contato salvo")
                  if (salvo) setContato(null)
                }}
              >
                <label className={estilos.campo}>Nome<Input value={contato.nome} onChange={(e) => setContato({ ...contato, nome: e.target.value })} maxLength={80} /></label>
                <label className={estilos.campo}>Telefone<Input inputMode="tel" value={contato.telefone} onChange={(e) => setContato({ ...contato, telefone: e.target.value })} maxLength={20} placeholder="(11) 9 0000-0000" /></label>
                <label className={estilos.campo}>E-mail<Input type="email" value={contato.email} onChange={(e) => setContato({ ...contato, email: e.target.value })} maxLength={254} /></label>
                <label className={estilos.campo}>Observação<Input value={contato.observacao} onChange={(e) => setContato({ ...contato, observacao: e.target.value })} maxLength={500} placeholder="Prefere WhatsApp à tarde" /></label>
                <button type="submit" className={estilos.botao} data-principal disabled={ocupado}>Salvar</button>
              </form>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog open={perdendo} onOpenChange={(abrir) => !abrir && setPerdendo(false)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Por que não fechou?</DialogTitle>
            <DialogDescription>Somado no fim do mês, o motivo mostra onde a loja perde venda.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className={estilos.form}>
              <div className={estilos.motivos} role="group" aria-label="Motivo">
                {MOTIVOS_DE_PERDA.map((opcao) => (
                  <button key={opcao.valor} type="button" className={estilos.motivo} aria-pressed={motivo === opcao.valor} onClick={() => setMotivo(opcao.valor)}>{opcao.rotulo}</button>
                ))}
              </div>
              <label className={estilos.campo}>{motivo === "OUTRO" ? "Qual?" : "Detalhe (se quiser)"}<Input value={detalhe} onChange={(e) => setDetalhe(e.target.value)} maxLength={300} placeholder="Achou mais barato na outra rua" /></label>
              <button type="button" className={estilos.botao} data-principal disabled={!motivo || ocupado || (motivo === "OUTRO" && !detalhe.trim())} onClick={() => void perder()}>Marcar como perdido</button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </section>
  )
}

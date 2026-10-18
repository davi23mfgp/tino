"use client"

import { useEffect, useState } from "react"
import { ShieldCheck } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { Input } from "@/components/ui/input"
import { SelectNative } from "@/components/ui/select-native"
import { Textarea } from "@/components/ui/textarea"
import { showToast } from "@/components/ui/toast"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import base from "../clientes/clientes.module.css"
import { EntradaDoAparelho, entradaVazia, type ValorDaEntrada } from "./entrada-aparelho"
import fino from "./entrada.module.css"
import { senhaValida, type EstadoDaPeca, type TipoDeSenha } from "@/lib/loja/assistencia"
import type { TipoDeAparelho } from "@/lib/loja/modelos"

export interface ClienteSimples { id: string; nome: string; telefone: string | null }
export interface OrdemSimples { id: string; numero: number; objeto: string; cliente: { nome: string } }

const reaisDoCampo = (centavos: number | null) => (centavos ? (centavos / 100).toFixed(2).replace(".", ",") : "")

/** Valor do campo datetime-local, na hora do aparelho. */
export function paraCampo(data: Date) {
  return new Date(data.getTime() - data.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

/**
 * Novo compromisso. Sem hora, é do dia inteiro (a ideia do Controllares):
 * "pagar o DAS" não tem hora, e pedir uma seria inventar.
 */
export function NovoCompromisso({ aberto, aoFechar, aoSalvar, dia, clientes, ordens }: {
  aberto: boolean; aoFechar: () => void; aoSalvar: () => void; dia: string; clientes: ClienteSimples[]; ordens: OrdemSimples[]
}) {
  const [titulo, setTitulo] = useState("")
  const [data, setData] = useState(dia)
  const [hora, setHora] = useState("")
  const [cliente, setCliente] = useState("")
  const [ordemId, setOrdemId] = useState("")
  const [detalhe, setDetalhe] = useState("")
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    if (!aberto) return
    setTitulo(""); setData(dia); setHora(""); setCliente(""); setOrdemId(""); setDetalhe("")
  }, [aberto, dia])

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!titulo.trim() || !data || ocupado) return
    setOcupado(true)
    try {
      const conhecido = clientes.find((linha) => linha.nome.toLowerCase() === cliente.trim().toLowerCase())
      await enviar("/api/loja/agenda/compromissos", {
        titulo: titulo.trim(),
        dia: data,
        ...(hora ? { inicioEm: new Date(`${data}T${hora}`).toISOString() } : {}),
        ...(conhecido ? { clienteId: conhecido.id } : {}),
        ...(ordemId ? { ordemId } : {}),
        ...(detalhe.trim() ? { detalhe: detalhe.trim() } : {}),
      })
      showToast("Compromisso marcado")
      aoSalvar()
    } catch (falha) {
      showToast(falha instanceof Error ? falha.message : "Não consegui marcar.", { variant: "error" })
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => !abrir && aoFechar()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Novo compromisso</DialogTitle>
          <DialogDescription>Sem hora, fica para o dia inteiro.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form className={base.form} onSubmit={salvar}>
            <label className={base.campo}>O que fazer<Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} placeholder="Buscar a tela no fornecedor" autoFocus /></label>
            <div className={base.dois}>
              <label className={base.campo}>Dia<Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></label>
              <label className={base.campo}>Hora (se tiver)<Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} /></label>
            </div>
            <label className={base.campo}>Cliente (se tiver)
              <Input list="clientes-agenda" value={cliente} onChange={(e) => setCliente(e.target.value)} autoComplete="off" />
              <datalist id="clientes-agenda">{clientes.map((linha) => <option key={linha.id} value={linha.nome} />)}</datalist>
            </label>
            {ordens.length > 0 && (
              <label className={base.campo}>Ordem de serviço (se for de uma)
                <SelectNative value={ordemId} onChange={(e) => setOrdemId(e.target.value)}>
                  <option value="">Nenhuma</option>
                  {ordens.map((ordem) => <option key={ordem.id} value={ordem.id}>{String(ordem.numero).padStart(4, "0")} · {ordem.objeto} de {ordem.cliente.nome}</option>)}
                </SelectNative>
              </label>
            )}
            <label className={base.campo}>Detalhe<Input value={detalhe} onChange={(e) => setDetalhe(e.target.value)} maxLength={300} placeholder="Rua, telefone do fornecedor" /></label>
            <button type="submit" className={base.botao} data-principal disabled={ocupado || !titulo.trim()}>Marcar</button>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

interface GarantiaAchada { id: string; numero: number; servico: string; por: "serie" | "cliente_e_modelo"; ate: string; diasRestantes: number }

export interface OrdemParaEditar {
  id: string; objeto: string; servico: string; naEntrada: string | null; prazoEm: string | null; valorCentavos: number | null
  aparelho?: {
    modelo: string | null; cor: string | null; serie: string | null; tipo: TipoDeAparelho; acessorios: string[]
    estado: Record<string, EstadoDaPeca>; senhaTipo: TipoDeSenha | null; temSenha: boolean
  } | null
}

/** A área Assistência abre a OS pela entrada do aparelho (passo 39). */
export interface ModoAssistencia { tipoInicial: TipoDeAparelho; modelosUsados: string[] }

// Os serviços mais comuns do balcão, para o "o que fazer" sair em duas letras.
const SERVICOS_DE_ASSISTENCIA = [
  "Troca de tela", "Troca de bateria", "Troca do conector de carga", "Troca da tampa traseira", "Troca da câmera", "Troca do alto-falante",
  "Limpeza e desoxidação", "Atualização e formatação", "Backup e transferência de dados", "Diagnóstico", "Troca de teclado", "Limpeza interna e pasta térmica",
]

/**
 * Nova ordem de serviço, ou editar uma. Vinda de orçamento aprovado, já
 * chega com o cliente, o serviço e o valor; o dono só diz o que ficou com a
 * loja e como chegou.
 */
export function OrdemDeServico({ aberto, aoFechar, aoSalvar, clientes, orcamentoId, ordem, assistencia }: {
  aberto: boolean; aoFechar: () => void; aoSalvar: (id: string) => void; clientes: ClienteSimples[]; orcamentoId?: string | null; ordem?: OrdemParaEditar | null
  assistencia?: ModoAssistencia | null
}) {
  // OS antiga, de antes da entrada, continua editando no jeito de texto livre.
  const comEntrada = Boolean(assistencia && (!ordem || ordem.aparelho))
  const [entrada, setEntrada] = useState<ValorDaEntrada>(() => entradaVazia(assistencia?.tipoInicial ?? "celular"))
  const [garantia, setGarantia] = useState<GarantiaAchada | null>(null)
  const [retorno, setRetorno] = useState(false)

  const [cliente, setCliente] = useState("")
  const [telefone, setTelefone] = useState("")
  const [objeto, setObjeto] = useState("")
  const [servico, setServico] = useState("")
  const [naEntrada, setNaEntrada] = useState("")
  const [prazo, setPrazo] = useState("")
  const [valor, setValor] = useState("")
  const [checklist, setChecklist] = useState("")
  const [doOrcamento, setDoOrcamento] = useState<{ numero: number; cliente: string; total: number } | null>(null)
  const [ocupado, setOcupado] = useState(false)

  // Enquanto a pessoa digita o IMEI, escolhe o modelo ou o cliente, o Tino
  // procura se o aparelho saiu daqui há menos de 90 dias. Espera a digitação
  // parar, para não perguntar ao servidor a cada letra.
  useEffect(() => {
    if (!aberto || !comEntrada || ordem) return
    const temo = window.setTimeout(() => {
      const busca = new URLSearchParams({ serie: entrada.serie, modelo: entrada.modelo, cliente })
      if (!entrada.serie.trim() && !(entrada.modelo.trim() && cliente.trim())) { setGarantia(null); return }
      buscar<{ garantia: GarantiaAchada | null }>(`/api/loja/ordens/garantia?${busca}`)
        .then((resposta) => { setGarantia(resposta.garantia); if (!resposta.garantia) setRetorno(false) }, () => setGarantia(null))
    }, 450)
    return () => window.clearTimeout(temo)
  }, [aberto, comEntrada, ordem, entrada.serie, entrada.modelo, cliente])

  useEffect(() => {
    if (!aberto) return
    setCliente(""); setTelefone(""); setChecklist(""); setDoOrcamento(null); setGarantia(null); setRetorno(false)
    setObjeto(ordem?.objeto ?? "")
    setServico(ordem?.servico ?? "")
    setNaEntrada(ordem?.naEntrada ?? "")
    setPrazo(ordem?.prazoEm ? paraCampo(new Date(ordem.prazoEm)) : "")
    const aparelho = ordem?.aparelho
    setEntrada(aparelho
      ? { modelo: aparelho.modelo ?? "", cor: aparelho.cor ?? "", serie: aparelho.serie ?? "", tipo: aparelho.tipo, acessorios: aparelho.acessorios, estado: aparelho.estado, senhaTipo: aparelho.senhaTipo, senha: "", trocarSenha: !aparelho.temSenha }
      : entradaVazia(assistencia?.tipoInicial ?? "celular"))
    setValor(reaisDoCampo(ordem?.valorCentavos ?? null))
    if (orcamentoId && !ordem) {
      buscar<{ orcamento: { numero: number; totalCentavos: number; cliente: { nome: string }; itens: { descricao: string }[] } }>(`/api/loja/orcamentos/${orcamentoId}`)
        .then(({ orcamento }) => {
          setDoOrcamento({ numero: orcamento.numero, cliente: orcamento.cliente.nome, total: orcamento.totalCentavos })
          setServico(orcamento.itens.map((item) => item.descricao).join(", ").slice(0, 160))
          setValor(reaisDoCampo(orcamento.totalCentavos))
        })
        .catch(() => showToast("Não consegui abrir o orçamento.", { variant: "error" }))
    }
  }, [aberto, orcamentoId, ordem, assistencia?.tipoInicial])

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    if (ocupado) return
    if (comEntrada && !entrada.modelo.trim()) return showToast("Diga o modelo do aparelho.", { variant: "error" })
    if (!comEntrada && !objeto.trim()) return showToast("Diga o que ficou com a loja.", { variant: "error" })
    if (!servico.trim()) return showToast("Diga o que vai ser feito.", { variant: "error" })
    const mandaSenha = comEntrada && entrada.trocarSenha && entrada.senhaTipo !== null
    if (mandaSenha && !senhaValida(entrada.senhaTipo!, entrada.senha)) {
      return showToast(entrada.senhaTipo === "PADRAO" ? "O padrão precisa de pelo menos 4 pontos." : "Escreva a senha do aparelho, ou marque Sem senha.", { variant: "error" })
    }
    setOcupado(true)
    const objetoDaEntrada = [entrada.modelo.trim(), entrada.cor.trim()].filter(Boolean).join(" ")
    const comum = {
      objeto: comEntrada ? objetoDaEntrada : objeto.trim(), servico: servico.trim(), naEntrada: naEntrada.trim() || null,
      ...(comEntrada ? {
        aparelho: {
          modelo: entrada.modelo.trim(), cor: entrada.cor.trim(), serie: entrada.serie.trim(), tipo: entrada.tipo,
          acessorios: entrada.acessorios, estado: entrada.estado,
          ...(mandaSenha ? { senhaTipo: entrada.senhaTipo!, senha: entrada.senhaTipo === "NENHUMA" ? "" : entrada.senha } : {}),
        },
      } : {}),
      prazoEm: prazo ? new Date(prazo).toISOString() : null,
      valorCentavos: valor.trim() ? paraCentavos(valor) : null,
    }
    try {
      if (ordem) {
        await enviar(`/api/loja/ordens/${ordem.id}`, comum, "PATCH")
        showToast("Ordem de serviço salva")
        aoSalvar(ordem.id)
      } else {
        const conhecido = clientes.find((linha) => linha.nome.toLowerCase() === cliente.trim().toLowerCase())
        const resposta = await enviar<{ ordem: { id: string; numero: number }; existente: boolean }>("/api/loja/ordens", {
          ...comum,
          ...(orcamentoId ? { orcamentoId } : conhecido ? { clienteId: conhecido.id } : { clienteNome: cliente.trim(), clienteTelefone: telefone.trim() || undefined }),
          ...(retorno && garantia ? { garantiaDeId: garantia.id } : {}),
          checklist: checklist.split("\n").map((linha) => linha.trim()).filter(Boolean),
        })
        showToast(resposta.existente ? `Este orçamento já tinha a OS ${String(resposta.ordem.numero).padStart(4, "0")}` : `OS ${String(resposta.ordem.numero).padStart(4, "0")} aberta`)
        aoSalvar(resposta.ordem.id)
      }
    } catch (falha) {
      showToast(falha instanceof Error ? falha.message : "Não consegui salvar.", { variant: "error" })
    } finally {
      setOcupado(false)
    }
  }

  const conhecido = clientes.some((linha) => linha.nome.toLowerCase() === cliente.trim().toLowerCase())
  return (
    <Dialog open={aberto} onOpenChange={(abrir) => !abrir && aoFechar()}>
      <DialogContent className={comEntrada ? "sm:max-w-[980px]" : "sm:max-w-[520px]"}>
        <DialogHeader>
          <DialogTitle>{ordem ? "Editar ordem de serviço" : "Nova ordem de serviço"}</DialogTitle>
          <DialogDescription>
            {doOrcamento ? `Do orçamento ${String(doOrcamento.numero).padStart(4, "0")} de ${doOrcamento.cliente}, ${formatarMoeda(doOrcamento.total)}.` : comEntrada ? "O aparelho, como chegou e o que fazer. O cliente confere pelo link." : "O que ficou com a loja, o que fazer e até quando."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form className={base.form} onSubmit={salvar}>
            {comEntrada ? (
              <>
                {!ordem && !orcamentoId && (
                  <div className={fino.dois}>
                    <label className={fino.campo}>Cliente
                      <input list="clientes-os" value={cliente} onChange={(e) => setCliente(e.target.value)} autoComplete="off" placeholder="Nome" />
                      <datalist id="clientes-os">{clientes.map((linha) => <option key={linha.id} value={linha.nome} />)}</datalist>
                    </label>
                    <label className={fino.campo}>Telefone{conhecido ? " (já cadastrado)" : ""}<input inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} disabled={conhecido} placeholder="(11) 9 0000-0000" /></label>
                  </div>
                )}
                <EntradaDoAparelho valor={entrada} mudar={setEntrada} modelosUsados={assistencia!.modelosUsados} temSenhaGuardada={Boolean(ordem?.aparelho?.temSenha)} />
                {garantia && (
                  <div className={fino.garantia} data-marcado={retorno ? "" : undefined}>
                    <ShieldCheck aria-hidden />
                    <div>
                      <b>{garantia.por === "serie" ? "Este aparelho" : "Um aparelho igual deste cliente"} saiu daqui na OS {String(garantia.numero).padStart(4, "0")} ({garantia.servico.toLowerCase()}) e está na garantia até {new Date(garantia.ate).toLocaleDateString("pt-BR")}.</b>
                      <span>Se for o mesmo defeito, o conserto é por conta da loja (Código de Defesa do Consumidor, art. 26).</span>
                    </div>
                    <button type="button" aria-pressed={retorno} onClick={() => setRetorno(!retorno)}>{retorno ? "É retorno em garantia" : "Marcar como retorno"}</button>
                  </div>
                )}
                {/* O serviço no mesmo traço dos blocos da entrada: é o 05 da folha. */}
                <section className={fino.bloco} aria-labelledby="entrada-servico">
                  <h3 id="entrada-servico"><span>05</span>Serviço</h3>
                  <div className={fino.servico}>
                    <label className={fino.campo}>O que fazer
                      <input list="servicos-assistencia" value={servico} onChange={(e) => setServico(e.target.value)} maxLength={160} placeholder="Troca de tela" autoComplete="off" />
                      <datalist id="servicos-assistencia">{SERVICOS_DE_ASSISTENCIA.map((nome) => <option key={nome} value={nome} />)}</datalist>
                    </label>
                    <label className={fino.campo}>Prazo<input type="datetime-local" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></label>
                    <label className={fino.campo}>Valor (se já tiver)<input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="sem preço ainda" /></label>
                  </div>
                  <label className={fino.campo}>Observação (se tiver)<textarea rows={2} value={naEntrada} onChange={(e) => setNaEntrada(e.target.value)} maxLength={500} placeholder="Tela trincada no canto. Arranhão na tampa." /></label>
                </section>
              </>
            ) : (
              <>
                {!ordem && !orcamentoId && (
                  <div className={base.dois}>
                    <label className={base.campo}>Cliente
                      <Input list="clientes-os" value={cliente} onChange={(e) => setCliente(e.target.value)} autoComplete="off" placeholder="Nome" />
                      <datalist id="clientes-os">{clientes.map((linha) => <option key={linha.id} value={linha.nome} />)}</datalist>
                    </label>
                    <label className={base.campo}>Telefone{conhecido ? " (já cadastrado)" : ""}<Input inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} disabled={conhecido} placeholder="(11) 9 0000-0000" /></label>
                  </div>
                )}
                <div className={base.dois}>
                  <label className={base.campo}>O que ficou com a loja<Input value={objeto} onChange={(e) => setObjeto(e.target.value)} maxLength={120} placeholder="iPhone 11 preto" /></label>
                  <label className={base.campo}>O que fazer<Input value={servico} onChange={(e) => setServico(e.target.value)} maxLength={160} placeholder="Troca de tela" /></label>
                </div>
                <label className={base.campo}>Como chegou<Textarea rows={2} value={naEntrada} onChange={(e) => setNaEntrada(e.target.value)} maxLength={500} placeholder="Tela trincada, toque funciona. Sem capinha, sem chip." /></label>
                <div className={base.dois}>
                  <label className={base.campo}>Prazo<Input type="datetime-local" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></label>
                  <label className={base.campo}>Valor (se já tiver)<Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="sem preço ainda" /></label>
                </div>
              </>
            )}
            {!ordem && !comEntrada && (
              <label className={base.campo}>Checklist (uma por linha)<Textarea rows={3} value={checklist} onChange={(e) => setChecklist(e.target.value)} placeholder={"Fotografar o aparelho na entrada\nTestar o toque antes de abrir"} /></label>
            )}
            <button type="submit" className={comEntrada ? fino.enviar : base.botao} data-principal disabled={ocupado}>{ordem ? "Salvar" : "Abrir ordem de serviço"}</button>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

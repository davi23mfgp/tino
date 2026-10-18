"use client"

import { useRef, useState } from "react"
import { ArrowUp, CalendarDays, Check, Clock, Download, Users } from "lucide-react"

import { enviar } from "@/lib/cliente"
import { DitarGasto } from "@/components/ditar-gasto"
import { showToast } from "@/components/ui/toast"

import { formatarTelefone } from "../clientes/comum"
import estilos from "./peca.module.css"

interface ClienteDoPedido { id: string; nome: string; telefone: string | null }

interface Resposta {
  pedido: { dia: string | null; hora: string | null; cliente: string | null; titulo: string; faltando: ("dia" | "hora")[] }
  inicioEm: string | null
  cliente: { escolhido: ClienteDoPedido | null; candidatos: ClienteDoPedido[] }
}

type Pergunta = { tipo: "dia" | "hora" | "cliente"; texto: string; opcoes: { rotulo: string; valor: string }[] }

const SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
const diaLegivel = (dia: string) => `${SEMANA[new Date(`${dia}T12:00:00Z`).getUTCDay()]}, ${dia.slice(8, 10)}/${dia.slice(5, 7)}`
const somarHora = (hora: string) => `${String((Number(hora.slice(0, 2)) + 1) % 24).padStart(2, "0")}:${hora.slice(3, 5)}`
const HORAS = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"]

/**
 * "Peça ao Tino", passo 48 (Davi, 07/10/2026: "Junte A e B"). A linha no alto
 * da Agenda (opção A) recebe o pedido como a pessoa falaria; quando falta
 * alguma coisa, a linha vira conversa e o Tino pergunta só o que faltou
 * (opção B), com as respostas mais comuns num toque. No fim, a proposta:
 * nada é marcado sem o toque em "Marcar" (regra 5).
 *
 * A conversa não guarda estado no servidor: cada resposta se junta ao pedido
 * e o leitor relê tudo. "Amanhã com a Ana" mais "15h" é o mesmo que "amanhã
 * às 15h com a Ana", e a regra testada continua uma só.
 */
export function PecaAoTino({ aoMarcar }: { aoMarcar: (dia: string) => void }) {
  const [texto, setTexto] = useState("")
  const [acumulado, setAcumulado] = useState("")
  const [falas, setFalas] = useState<{ de: "voce" | "tino"; texto: string }[]>([])
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const [diaInteiro, setDiaInteiro] = useState(false)
  // `undefined`: ainda não perguntou; `null`: a pessoa disse que é outra pessoa.
  const [clienteEscolhido, setClienteEscolhido] = useState<ClienteDoPedido | null | undefined>(undefined)
  const [marcado, setMarcado] = useState<{ id: string; quando: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const campo = useRef<HTMLInputElement>(null)

  function proximaPergunta(atual: Resposta, inteiro: boolean, escolhido: ClienteDoPedido | null | undefined): Pergunta | null {
    const { pedido, cliente } = atual
    const com = escolhido?.nome ?? cliente.escolhido?.nome ?? pedido.cliente
    if (pedido.faltando.includes("dia")) {
      return { tipo: "dia", texto: `Entendi: ${pedido.titulo.toLowerCase().startsWith("horário") ? pedido.titulo : `"${pedido.titulo}"`}. Que dia?`, opcoes: [{ rotulo: "Hoje", valor: "hoje" }, { rotulo: "Amanhã", valor: "amanhã" }, { rotulo: "Depois de amanhã", valor: "depois de amanhã" }] }
    }
    if (pedido.faltando.includes("hora") && !inteiro) {
      return {
        tipo: "hora", texto: `Entendi: ${diaLegivel(pedido.dia!).toLowerCase()}${com ? `, com ${com}` : ""}. Que horas?`,
        opcoes: [...HORAS.map((hora) => ({ rotulo: hora, valor: `às ${hora}` })), { rotulo: "Dia inteiro", valor: "__dia_inteiro" }],
      }
    }
    if (cliente.candidatos.length > 1 && escolhido === undefined) {
      return {
        tipo: "cliente", texto: `Você tem ${cliente.candidatos.length} clientes com esse nome. Qual?`,
        opcoes: [...cliente.candidatos.map((candidato) => ({ rotulo: candidato.nome, valor: `__cliente:${candidato.id}` })), { rotulo: "Outra pessoa", valor: "__cliente:" }],
      }
    }
    return null
  }

  /** `mostrar` é o que aparece na fala da pessoa: o toque em "15:00" manda "às 15:00" ao leitor. */
  async function pedir(novo: string, mostrar = novo) {
    const frase = novo.trim()
    if (!frase || ocupado) return
    const juntado = acumulado ? `${acumulado} ${frase}` : frase
    setOcupado(true)
    try {
      const atual = await enviar<Resposta>("/api/loja/agenda/pedido", { texto: juntado.slice(0, 300) })
      const conversa = [...falas, { de: "voce" as const, texto: mostrar.trim() }]
      const pergunta = proximaPergunta(atual, diaInteiro, clienteEscolhido)
      setFalas(pergunta ? [...conversa, { de: "tino", texto: pergunta.texto }] : conversa)
      setAcumulado(juntado)
      setResposta(atual)
      setTexto("")
    } catch (falha) {
      showToast(falha instanceof Error ? falha.message : "Não consegui ler o pedido.", { variant: "error" })
    } finally {
      setOcupado(false)
    }
  }

  function responder(opcao: { rotulo: string; valor: string }) {
    if (!resposta) return
    if (opcao.valor === "__dia_inteiro" || opcao.valor.startsWith("__cliente:")) {
      const inteiro = opcao.valor === "__dia_inteiro" || diaInteiro
      const id = opcao.valor.startsWith("__cliente:") ? opcao.valor.slice(10) : undefined
      const escolhido = id === undefined ? clienteEscolhido : (resposta.cliente.candidatos.find((candidato) => candidato.id === id) ?? null)
      setDiaInteiro(inteiro)
      setClienteEscolhido(escolhido)
      const pergunta = proximaPergunta(resposta, inteiro, escolhido)
      setFalas([...falas, { de: "voce", texto: opcao.rotulo }, ...(pergunta ? [{ de: "tino" as const, texto: pergunta.texto }] : [])])
      return
    }
    void pedir(opcao.valor, opcao.rotulo)
  }

  function recomecar(manterTexto = false) {
    setTexto(manterTexto ? acumulado : "")
    setAcumulado("")
    setFalas([])
    setResposta(null)
    setDiaInteiro(false)
    setClienteEscolhido(undefined)
    setMarcado(null)
    campo.current?.focus()
  }

  const pergunta = resposta ? proximaPergunta(resposta, diaInteiro, clienteEscolhido) : null
  const cliente = clienteEscolhido === undefined ? resposta?.cliente.escolhido ?? null : clienteEscolhido
  const pronto = resposta && !pergunta && resposta.pedido.dia

  async function marcar() {
    const dia = resposta?.pedido.dia
    if (!resposta || !dia || ocupado) return
    const { pedido } = resposta
    setOcupado(true)
    try {
      const { compromisso } = await enviar<{ compromisso: { id: string } }>("/api/loja/agenda/compromissos", {
        titulo: pedido.titulo.slice(0, 120),
        dia,
        ...(!diaInteiro && resposta.inicioEm ? { inicioEm: resposta.inicioEm } : {}),
        ...(cliente ? { clienteId: cliente.id } : {}),
      })
      setMarcado({ id: compromisso.id, quando: `${diaLegivel(dia).toLowerCase()}${!diaInteiro && pedido.hora ? `, ${pedido.hora}` : ", dia inteiro"}` })
      aoMarcar(dia)
    } catch (falha) {
      showToast(falha instanceof Error ? falha.message : "Não consegui marcar.", { variant: "error" })
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className={estilos.peca} aria-label="Peça ao Tino">
      {falas.length > 1 && (
        <div className={estilos.conversa} aria-live="polite">
          {falas.map((fala, i) => <p key={i} className={estilos.fala} data-de={fala.de}>{fala.texto}</p>)}
        </div>
      )}

      {pergunta && (
        <div className={estilos.opcoes} role="group" aria-label={pergunta.texto}>
          {pergunta.opcoes.map((opcao) => (
            <button key={opcao.valor} type="button" className={estilos.opcao} onClick={() => responder(opcao)} disabled={ocupado}>{opcao.rotulo}</button>
          ))}
        </div>
      )}

      {!marcado && !pronto && (
        <form className={estilos.linha} onSubmit={(evento) => { evento.preventDefault(); void pedir(texto) }}>
          <input
            ref={campo}
            id="peca-ao-tino"
            className={estilos.campo}
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder={pergunta ? "Ou escreva a resposta" : "Peça ao Tino: amanhã às 15h com a Ana"}
            aria-label={pergunta ? pergunta.texto : "Peça ao Tino o que marcar"}
            maxLength={200}
            autoComplete="off"
          />
          <DitarGasto compacto rotulo="o compromisso" aoTranscrever={(falado) => setTexto(falado)} />
          <button type="submit" className={estilos.enviar} disabled={ocupado || !texto.trim()} aria-label="Mandar para o Tino"><ArrowUp aria-hidden /></button>
        </form>
      )}

      {pronto && !marcado && (
        <div className={estilos.proposta}>
          <p className={estilos.olho}>O Tino entendeu</p>
          <h3>{resposta.pedido.titulo}</h3>
          <p className={estilos.dado}><CalendarDays aria-hidden />{diaLegivel(resposta.pedido.dia!)}</p>
          <p className={estilos.dado}><Clock aria-hidden />{diaInteiro || !resposta.pedido.hora ? "Dia inteiro" : `${resposta.pedido.hora} às ${somarHora(resposta.pedido.hora)}`}</p>
          {resposta.pedido.cliente && (
            <p className={estilos.dado}><Users aria-hidden />{cliente ? `${cliente.nome}${cliente.telefone ? ` · ${formatarTelefone(cliente.telefone)}` : ""}` : `${resposta.pedido.cliente} (não está nos seus clientes)`}</p>
          )}
          {cliente && clienteEscolhido === undefined && <p className={estilos.nota}>{cliente.nome} já é sua cliente: o Tino achou pelo nome. Se for outra pessoa, corrija.</p>}
          <div className={estilos.botoes}>
            <button type="button" className={estilos.botao} data-principal onClick={() => void marcar()} disabled={ocupado}>Marcar</button>
            <button type="button" className={estilos.botao} onClick={() => recomecar(true)} disabled={ocupado}>Corrigir</button>
          </div>
        </div>
      )}

      {marcado && (
        <div className={estilos.feito}>
          <p className={estilos.ok}><Check aria-hidden />Marcado na Agenda do Tino: {marcado.quando}.</p>
          <p className={estilos.nota}>Pôr também na agenda do seu celular:</p>
          <div className={estilos.botoes}>
            <a className={estilos.botao} href={`/api/loja/agenda/compromissos/${marcado.id}/exportar?formato=google`} target="_blank" rel="noopener noreferrer"><CalendarDays aria-hidden />Google Agenda</a>
            <a className={estilos.botao} href={`/api/loja/agenda/compromissos/${marcado.id}/exportar?formato=ics`} download><Download aria-hidden />iPhone ou Outlook (.ics)</a>
          </div>
          <button type="button" className={estilos.outro} onClick={() => recomecar()}>Marcar outro</button>
        </div>
      )}
    </section>
  )
}

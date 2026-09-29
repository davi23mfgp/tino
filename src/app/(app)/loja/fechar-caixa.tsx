"use client"

import { useCallback, useEffect, useState } from "react"
import { Delete } from "lucide-react"

import { enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { digitar, type Tecla } from "@/lib/loja/teclado"
import { Input } from "@/components/ui/input"
import { showToast } from "@/components/ui/toast"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import estilos from "./caixa.module.css"

/**
 * Fechar caixa — D2 do canvas (Davi, 29/09/2026): contagem às cegas.
 *
 * Primeiro conta, depois vê. Quem conta sabendo quanto "tem que dar" tende a
 * achar exatamente esse número — e a conferência deixa de conferir. Por isso a
 * primeira tela não mostra o esperado, e o painel do Balcão também deixou de
 * mostrar.
 *
 * O valor contado é gravado como veio (ver `PUT /api/loja/caixa`): a diferença
 * é o resultado, e ajustar o contado para bater apagaria o que importa.
 */

export interface ResumoDoCaixa {
  aberturaCentavos: number
  vendidoCentavos: number
  emDinheiroCentavos: number
  sangriaCentavos: number
  esperadoNaGavetaCentavos: number
}

const TECLAS: Tecla[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "apagar"]

function Visor({ centavos }: { centavos: number }) {
  const texto = formatarMoeda(centavos)
  const virgula = texto.lastIndexOf(",")
  return (
    <strong className={estilos.visor}>
      {texto.slice(0, virgula)}
      <span>{texto.slice(virgula)}</span>
    </strong>
  )
}

export function FecharCaixa({ aberto, resumo, aoFechar, aoConcluir }: { aberto: boolean; resumo: ResumoDoCaixa | null; aoFechar: () => void; aoConcluir: () => Promise<void> }) {
  const [contado, setContado] = useState(0)
  const [conferindo, setConferindo] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!aberto) return
    setContado(0)
    setConferindo(false)
    setErro(null)
  }, [aberto])

  const tocar = useCallback((tecla: Tecla) => setContado((atual) => digitar(atual, tecla)), [])

  // Teclado físico na contagem, como no visor do Balcão.
  useEffect(() => {
    if (!aberto || conferindo) return
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.ctrlKey || evento.metaKey || evento.altKey) return
      if (/^[0-9]$/.test(evento.key)) tocar(evento.key as Tecla)
      else if (evento.key === "Backspace") tocar("apagar")
      else if (evento.key === "Enter") setConferindo(true)
      else return
      evento.preventDefault()
    }
    window.addEventListener("keydown", aoTeclar)
    return () => window.removeEventListener("keydown", aoTeclar)
  }, [aberto, conferindo, tocar])

  async function fechar() {
    setOcupado(true)
    setErro(null)
    try {
      await enviar("/api/loja/caixa", { fechamentoInformadoCentavos: contado }, "PUT")
      showToast(diferenca === 0 ? "Caixa fechado. Bateu." : `Caixa fechado com ${diferenca < 0 ? "falta" : "sobra"} de ${formatarMoeda(Math.abs(diferenca))}.`)
      aoFechar()
      await aoConcluir()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui fechar o caixa.")
    } finally {
      setOcupado(false)
    }
  }

  const esperado = resumo?.esperadoNaGavetaCentavos ?? 0
  const diferenca = contado - esperado
  const tom = diferenca === 0 ? "bateu" : diferenca < 0 ? "falta" : "sobra"

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => !ocupado && !abrir && aoFechar()}>
      <DialogContent className="sm:max-w-[440px]">
        {!conferindo ? (
          <>
            <DialogHeader>
              <DialogTitle>Conte a gaveta</DialogTitle>
              <DialogDescription>Conte notas e moedas e digite o total. O esperado aparece depois, para a contagem não ir atrás do número.</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <div className={estilos.folha}>
                <div className={estilos.centro} aria-live="polite">
                  <small>quanto tem na gaveta</small>
                  <Visor centavos={contado} />
                </div>
                <div className={estilos.teclado} role="group" aria-label="Teclado">
                  {TECLAS.map((tecla) => (
                    <button key={tecla} type="button" onClick={() => tocar(tecla)} aria-label={tecla === "apagar" ? "Apagar" : tecla}>
                      {tecla === "apagar" ? <Delete aria-hidden /> : tecla}
                    </button>
                  ))}
                </div>
                <button type="button" className={estilos.principal} onClick={() => setConferindo(true)}>
                  Conferir
                </button>
              </div>
            </DialogBody>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Conferência</DialogTitle>
              <DialogDescription className="sr-only">Resultado da contagem da gaveta</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <div className={estilos.folha}>
                <div className={estilos.centro} data-tom={tom}>
                  <span className={estilos.selo} aria-hidden>
                    {tom === "bateu" ? "✓" : tom === "falta" ? "!" : "+"}
                  </span>
                  <strong className={estilos.resultado}>
                    {tom === "bateu" ? "bateu" : tom === "falta" ? `faltam ${formatarMoeda(-diferenca)}` : `sobram ${formatarMoeda(diferenca)}`}
                  </strong>
                  <span>
                    contou {formatarMoeda(contado)} · devia ter {formatarMoeda(esperado)}
                  </span>
                </div>
                <div className={estilos.quatro}>
                  <div>
                    <small>Vendido hoje</small>
                    <b>{formatarMoeda(resumo?.vendidoCentavos ?? 0)}</b>
                  </div>
                  <div>
                    <small>Em dinheiro</small>
                    <b>{formatarMoeda(resumo?.emDinheiroCentavos ?? 0)}</b>
                  </div>
                  <div>
                    <small>Troco inicial</small>
                    <b>{formatarMoeda(resumo?.aberturaCentavos ?? 0)}</b>
                  </div>
                  <div>
                    <small>Tirado da gaveta</small>
                    <b>{formatarMoeda(resumo?.sangriaCentavos ?? 0)}</b>
                  </div>
                </div>
                {erro && <p className={estilos.erro}>{erro}</p>}
                <button type="button" className={estilos.principal} onClick={() => void fechar()} disabled={ocupado}>
                  {ocupado ? "Fechando…" : "Fechar caixa"}
                </button>
                <button type="button" className={estilos.link} onClick={() => setConferindo(false)} disabled={ocupado}>
                  contar de novo
                </button>
              </div>
            </DialogBody>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

const MOTIVOS = ["depósito no banco", "pagar fornecedor", "troco", "retirada do dono"]

/** Dinheiro que sai da gaveta durante o dia: sai também do esperado no fechamento. */
export function TirarDinheiro({ aberto, aoFechar, aoConcluir }: { aberto: boolean; aoFechar: () => void; aoConcluir: () => Promise<void> }) {
  const [valor, setValor] = useState("")
  const [motivo, setMotivo] = useState(MOTIVOS[0])
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!aberto) return
    setValor("")
    setMotivo(MOTIVOS[0])
    setErro(null)
  }, [aberto])

  async function registrar(evento: React.FormEvent) {
    evento.preventDefault()
    setOcupado(true)
    setErro(null)
    try {
      await enviar("/api/loja/caixa", { acao: "sangria", valorCentavos: paraCentavos(valor), motivo })
      showToast(`${formatarMoeda(paraCentavos(valor))} tirados da gaveta.`)
      aoFechar()
      await aoConcluir()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui registrar.")
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => !ocupado && !abrir && aoFechar()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Tirar dinheiro da gaveta</DialogTitle>
          <DialogDescription>Depósito, pagamento, troco: o que sair do caixa durante o dia.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={registrar} className={estilos.folha}>
            <label className={estilos.campo}>
              Quanto saiu da gaveta?
              <Input inputMode="decimal" value={valor} onChange={(evento) => setValor(evento.target.value)} placeholder="0,00" required autoFocus />
            </label>
            <div className={estilos.chips} role="group" aria-label="Motivo">
              {MOTIVOS.map((item) => (
                <button key={item} type="button" aria-pressed={motivo === item} onClick={() => setMotivo(item)}>
                  {item}
                </button>
              ))}
            </div>
            {erro && <p className={estilos.erro}>{erro}</p>}
            <button type="submit" className={estilos.principal} disabled={ocupado}>
              Registrar
            </button>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

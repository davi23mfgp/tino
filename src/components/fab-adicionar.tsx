"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Receipt, Upload, Zap } from "lucide-react"

import { buscar, enviar, TRANSACOES_ATUALIZADAS } from "@/lib/cliente"
import { cn } from "@/lib/utils"
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogBody,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SelectNative } from "@/components/ui/select-native"
import { showToast } from "@/components/ui/toast"

interface Conta {
  id: string
  nome: string
}

interface FabAdicionarProps {
  /** Mantém o botão dentro da barra de navegação; por padrão, flutua no celular. */
  ancorado?: boolean
  /** Renderiza um botão com texto no fluxo, inclusive no desktop; prevalece sobre ancorado. */
  inline?: boolean
  onSaved?: () => void
}

type EstadoContas = "carregando" | "pronto" | "erro"

function dataLocal(dia = new Date()): string {
  return `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, "0")}-${String(dia.getDate()).padStart(2, "0")}`
}

function centavosDoValor(valor: string): number | null {
  const texto = valor.trim()
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(texto)) return null
  const [inteiro, decimal = ""] = texto.split(",")
  const centavos = Number(`${inteiro.replace(/\./g, "")}${decimal.padEnd(2, "0")}`)
  return Number.isSafeInteger(centavos) && centavos > 0 ? centavos : null
}

const focoVisivel = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acao focus-visible:ring-offset-2 focus-visible:ring-offset-background"
const acaoMenu = `flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[14px] transition-colors hover:bg-foreground/[0.05] motion-reduce:transition-none ${focoVisivel}`

export function FabAdicionar({ ancorado = false, inline: compacto = false, onSaved }: FabAdicionarProps) {
  const router = useRouter()
  const id = useId()
  const tituloFormulario = useRef<HTMLHeadingElement>(null)
  const campoValor = useRef<HTMLInputElement>(null)
  const salvando = useRef(false)
  const [aberto, setAberto] = useState(false)
  const [tela, setTela] = useState<"menu" | "formulario">("menu")
  const [contas, setContas] = useState<Conta[]>([])
  const [estadoContas, setEstadoContas] = useState<EstadoContas>("carregando")
  const [tentativa, setTentativa] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [erroValor, setErroValor] = useState(false)
  const [contaId, setContaId] = useState("")
  const [tipo, setTipo] = useState<"DESPESA" | "RECEITA">("DESPESA")
  const [descricao, setDescricao] = useState("")
  const [valor, setValor] = useState("")
  const [data, setData] = useState(dataLocal)
  const formAberto = aberto && tela === "formulario"
  const contaPronta = estadoContas === "pronto" && contas.some((conta) => conta.id === contaId)

  useEffect(() => {
    if (formAberto) tituloFormulario.current?.focus()
  }, [formAberto])

  useEffect(() => {
    if (!formAberto) return
    const controlador = new AbortController()
    setEstadoContas("carregando")
    buscar<unknown>("/api/contas", { signal: controlador.signal })
      .then((lista) => {
        if (controlador.signal.aborted) return
        if (!Array.isArray(lista) || !lista.every((conta): conta is Conta =>
          typeof conta === "object" && conta !== null &&
          "id" in conta && typeof conta.id === "string" && conta.id.length > 0 &&
          "nome" in conta && typeof conta.nome === "string",
        )) {
          throw new Error("Resposta de contas inválida.")
        }
        setContas(lista)
        setContaId((atual) => lista.some((conta) => conta.id === atual) ? atual : lista[0]?.id ?? "")
        setEstadoContas("pronto")
      })
      .catch(() => {
        if (controlador.signal.aborted) return
        setContas([])
        setContaId("")
        setEstadoContas("erro")
      })
    return () => controlador.abort()
  }, [formAberto, tentativa])

  function abrirFormulario() {
    setEstadoContas("carregando")
    setErro(null)
    setErroValor(false)
    if (!descricao && !valor) setData(dataLocal())
    setTela("formulario")
  }

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (salvando.current) return
    setErro(null)
    if (!contaPronta) {
      setErro("Aguarde as contas carregarem e escolha uma conta para salvar.")
      return
    }
    if (!descricao.trim()) {
      setErro("Informe uma descrição para o lançamento.")
      return
    }
    const valorCentavos = centavosDoValor(valor)
    if (valorCentavos === null) {
      setErroValor(true)
      setErro("Informe um valor maior que zero, como 52,30 ou 1.234,56, com até duas casas decimais.")
      campoValor.current?.focus()
      return
    }
    const dia = new Date(`${data}T12:00:00`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(dia.getTime()) || dataLocal(dia) !== data) {
      setErro("Informe uma data válida.")
      return
    }

    salvando.current = true
    setEnviando(true)
    try {
      await enviar(
        "/api/transacoes",
        { contaId, tipo, descricao: descricao.trim(), valorCentavos, data },
        "POST",
      )
      showToast("Lançamento adicionado.", { variant: "success" })
      setAberto(false)
      setDescricao("")
      setValor("")
      window.dispatchEvent(new Event(TRANSACOES_ATUALIZADAS))
      router.refresh()
      onSaved?.()
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui salvar. Tente novamente.")
    } finally {
      salvando.current = false
      setEnviando(false)
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(proximo) => {
        if (proximo) {
          if (salvando.current) return
          setTela("menu")
        }
        setAberto(proximo)
      }}
    >
      <div className={cn(
        compacto ? "inline-flex" : ancorado
          ? "relative flex items-center justify-center"
          : "fixed bottom-24 right-4 z-40 lg:hidden",
      )}>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label="Adicionar"
            className={cn(
              "ios-tap flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground shadow-alta motion-reduce:!transform-none motion-reduce:!transition-none",
              focoVisivel,
              compacto ? "min-h-11 px-4 py-2 text-sm font-medium" : ancorado ? "size-12" : "size-14",
            )}
          >
            <Plus aria-hidden="true" className="size-6 shrink-0" />
            {compacto && <span>Adicionar</span>}
          </button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-w-[420px]">
        {tela === "menu" ? (
          <>
            <DialogHeader>
              <DialogTitle>Adicionar</DialogTitle>
              <DialogDescription>Escolha como registrar seu dinheiro.</DialogDescription>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-1">
              <button type="button" onClick={abrirFormulario} className={acaoMenu}>
                <Receipt aria-hidden="true" className="size-5 shrink-0 text-muted-fg" />
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">Registrar gasto</span>
                  <span className="text-[13px] text-muted-fg">Preencha os dados manualmente.</span>
                </span>
              </button>
              <Link href="/capturas" onClick={() => setAberto(false)} className={acaoMenu}>
                <Zap aria-hidden="true" className="size-5 shrink-0 text-muted-fg" />
                Anotar com texto
              </Link>
              <Link href="/importar" onClick={() => setAberto(false)} className={acaoMenu}>
                <Upload aria-hidden="true" className="size-5 shrink-0 text-muted-fg" />
                Importar extrato
              </Link>
            </DialogBody>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle ref={tituloFormulario} tabIndex={-1} className="outline-none">Registrar gasto</DialogTitle>
              <DialogDescription>Informe a conta, o tipo e os dados do lançamento.</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <form onSubmit={salvar} className="flex flex-col gap-4" aria-busy={enviando}>
                {erro && <p id={`${id}-erro`} role="alert" className="text-sm text-negativo">{erro}</p>}
                <fieldset disabled={enviando} className="flex min-w-0 flex-col gap-4">
                  <fieldset className="min-w-0">
                    <legend className="mb-2 text-sm font-medium">Tipo de lançamento</legend>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        aria-pressed={tipo === "DESPESA"}
                        onClick={() => setTipo("DESPESA")}
                        className={cn(
                          "min-h-11 rounded-[var(--raio-campo)] border px-3 py-2 text-[13px] font-medium",
                          focoVisivel,
                          tipo === "DESPESA" ? "border-negativo/40 bg-negativo/10 text-negativo" : "border-pauta text-muted-fg hover:bg-foreground/[0.04]",
                        )}
                      >Despesa</button>
                      <button
                        type="button"
                        aria-pressed={tipo === "RECEITA"}
                        onClick={() => setTipo("RECEITA")}
                        className={cn(
                          "min-h-11 rounded-[var(--raio-campo)] border px-3 py-2 text-[13px] font-medium",
                          focoVisivel,
                          tipo === "RECEITA" ? "border-positivo/40 bg-positivo/10 text-positivo" : "border-pauta text-muted-fg hover:bg-foreground/[0.04]",
                        )}
                      >Receita</button>
                    </div>
                  </fieldset>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`${id}-conta`}>Conta</Label>
                    <SelectNative
                      id={`${id}-conta`}
                      value={contaId}
                      onChange={(e) => setContaId(e.target.value)}
                      disabled={estadoContas !== "pronto" || contas.length === 0}
                      aria-describedby={`${id}-estado-contas`}
                      className="min-h-11"
                      required
                    >
                      {estadoContas !== "pronto" || contas.length === 0 ? (
                        <option value="">{estadoContas === "carregando" ? "Carregando contas…" : "Nenhuma conta disponível"}</option>
                      ) : contas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}
                    </SelectNative>
                    <p id={`${id}-estado-contas`} role="status" className="text-[13px] text-muted-fg">
                      {estadoContas === "carregando" ? "Carregando suas contas…"
                        : estadoContas === "erro" ? "Não foi possível carregar suas contas. Tente novamente ou gerencie suas contas nas configurações."
                          : contas.length === 0 ? "Cadastre uma conta nas configurações para registrar seu primeiro gasto."
                            : "Escolha a conta deste lançamento."}
                    </p>
                    {(estadoContas === "erro" || (estadoContas === "pronto" && contas.length === 0)) && (
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEstadoContas("carregando")
                            setTentativa((atual) => atual + 1)
                          }}
                          className={cn("min-h-11 rounded-lg px-2 text-sm underline underline-offset-4", focoVisivel)}
                        >Tentar novamente</button>
                        <Link href="/configuracoes" onClick={() => setAberto(false)} className={cn("inline-flex min-h-11 items-center rounded-lg px-2 text-sm underline underline-offset-4", focoVisivel)}>
                          {estadoContas === "erro" ? "Gerenciar contas" : "Cadastrar conta"}
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`${id}-descricao`}>Descrição</Label>
                    <Input id={`${id}-descricao`} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: mercado" className="motion-reduce:transition-none" required />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex min-w-0 flex-col gap-2">
                      <Label htmlFor={`${id}-valor`}>Valor (R$)</Label>
                      <Input
                        ref={campoValor}
                        id={`${id}-valor`}
                        value={valor}
                        onChange={(e) => {
                          setValor(e.target.value)
                          if (erroValor) {
                            setErroValor(false)
                            setErro(null)
                          }
                        }}
                        placeholder="52,30"
                        inputMode="decimal"
                        aria-invalid={erroValor}
                        aria-describedby={cn(`${id}-valor-ajuda`, erroValor && `${id}-erro`)}
                        className="motion-reduce:transition-none"
                        required
                      />
                      <p id={`${id}-valor-ajuda`} className="text-[13px] text-muted-fg">Ex.: 52,30 ou 1.234,56.</p>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2">
                      <Label htmlFor={`${id}-data`}>Data</Label>
                      <Input id={`${id}-data`} type="date" value={data} onChange={(e) => setData(e.target.value)} className="min-w-0 motion-reduce:transition-none" required />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!contaPronta || enviando}
                    className={cn("ios-tap min-h-11 w-full rounded-[var(--raio-pilula)] bg-primary px-4 py-2.5 text-[14px] font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:!transform-none motion-reduce:!transition-none", focoVisivel)}
                  >{enviando ? "Salvando…" : "Salvar"}</button>
                </fieldset>
                <p role="status" className="sr-only">{enviando ? "Salvando lançamento. Aguarde." : ""}</p>
              </form>
            </DialogBody>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, MinusCircle, Plus, PlusCircle, Upload, Zap } from "lucide-react"

import { buscar, enviar, TRANSACOES_ATUALIZADAS } from "@/lib/cliente"
import { lerTextoLivre } from "@/lib/captura/notificacao"
import { sinaisDaFrase } from "@/lib/captura/fala"
import { formatarMoeda } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DitarGasto } from "@/components/ditar-gasto"
import { showToast } from "@/components/ui/toast"
import estilos from "./fab-adicionar.module.css"

interface Conta {
  id: string
  nome: string
  tipo?: string
}

interface Categoria {
  id: string
  nome: string
  tipo: "DESPESA" | "RECEITA" | string
}

interface FabAdicionarProps {
  /** Mantém o botão dentro da barra de navegação; por padrão, flutua no celular. */
  ancorado?: boolean
  /** Renderiza um botão com texto no fluxo, inclusive no desktop; prevalece sobre ancorado. */
  inline?: boolean
  onSaved?: () => void
}

type Tipo = "DESPESA" | "RECEITA"

function dataLocal(dia = new Date()): string {
  return `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, "0")}-${String(dia.getDate()).padStart(2, "0")}`
}

/** "2026-09-24" → "24 de setembro de 2026", sem depender do idioma do navegador. */
function dataPorExtenso(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number)
  if (!ano || !mes || !dia) return iso
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(ano, mes - 1, dia)))
}

/**
 * O botão "+" e a tela de nova transação (Davi, 24/09, com um print de
 * referência): abre direto no lançamento, sem o menu que vinha antes. Saída
 * ou entrada, o valor grande, e as linhas de descrição, data, categoria e
 * conta — mais o microfone, que preenche tudo a partir da fala.
 *
 * O valor é digitado como nos apps de banco: os dígitos entram pela direita
 * (5, 52, 5,23, 52,30). Não há vírgula a acertar nem formato para errar.
 *
 * O que foi falado não é salvo sozinho: a fala só preenche os campos, e a
 * pessoa confere antes de tocar em "Adicionar". É a mesma regra da fila de
 * capturas — entre a voz e o número existe uma transcrição, e transcrição
 * erra.
 */
export function FabAdicionar({ ancorado = false, inline: compacto = false, onSaved }: FabAdicionarProps) {
  const router = useRouter()
  const salvando = useRef(false)
  const [aberto, setAberto] = useState(false)
  const [contas, setContas] = useState<Conta[] | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [erroContas, setErroContas] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [tipo, setTipo] = useState<Tipo>("DESPESA")
  const [centavos, setCentavos] = useState(0)
  const [descricao, setDescricao] = useState("")
  const [data, setData] = useState(dataLocal)
  const [categoriaId, setCategoriaId] = useState("")
  const [contaId, setContaId] = useState("")
  const [ouvido, setOuvido] = useState<string | null>(null)

  useEffect(() => {
    if (!aberto) return
    const controlador = new AbortController()
    setErroContas(false)
    Promise.all([
      buscar<Conta[]>("/api/contas", { signal: controlador.signal }),
      buscar<Categoria[]>("/api/categorias", { signal: controlador.signal }).catch(() => []),
    ])
      .then(([listaContas, listaCategorias]) => {
        if (controlador.signal.aborted) return
        // Investimento não recebe gasto do dia a dia; ele se movimenta pela
        // tela de investimentos, por transferência.
        const usaveis = listaContas.filter((conta) => conta.tipo !== "INVESTIMENTO")
        setContas(usaveis)
        setContaId((atual) => (usaveis.some((conta) => conta.id === atual) ? atual : usaveis[0]?.id ?? ""))
        setCategorias(Array.isArray(listaCategorias) ? listaCategorias : [])
      })
      .catch(() => {
        if (controlador.signal.aborted) return
        setContas([])
        setErroContas(true)
      })
    return () => controlador.abort()
  }, [aberto])

  function limpar() {
    setTipo("DESPESA")
    setCentavos(0)
    setDescricao("")
    setData(dataLocal())
    setCategoriaId("")
    setErro(null)
    setOuvido(null)
  }

  /** A fala vira campos preenchidos, e nada além disso. */
  function preencherPelaFala(texto: string) {
    const frase = texto.trim()
    if (!frase) return
    setOuvido(frase)
    const lido = lerTextoLivre(frase)
    const sinais = sinaisDaFrase(frase, new Date())
    if (lido.valorCentavos && lido.valorCentavos > 0) setCentavos(lido.valorCentavos)
    if (lido.estabelecimento) setDescricao(lido.estabelecimento)
    setTipo(sinais.tipo)
    setData(dataLocal(sinais.data))
    setErro(lido.valorCentavos ? null : "Não entendi o valor. Digite-o acima ou fale de novo.")
  }

  const categoriasDoTipo = categorias.filter((categoria) => categoria.tipo === tipo)
  const pronto = centavos > 0 && descricao.trim().length > 0 && !!contaId

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (salvando.current) return
    if (!pronto) {
      setErro(!centavos ? "Informe o valor." : !descricao.trim() ? "Informe uma descrição." : "Escolha a conta.")
      return
    }
    salvando.current = true
    setEnviando(true)
    setErro(null)
    try {
      await enviar(
        "/api/transacoes",
        // Sem categoria escolhida, o servidor categoriza pelas regras da casa.
        { contaId, tipo, descricao: descricao.trim(), valorCentavos: centavos, data, ...(categoriaId ? { categoriaId } : {}) },
        "POST",
      )
      showToast(tipo === "DESPESA" ? "Saída adicionada." : "Entrada adicionada.", { variant: "success" })
      setAberto(false)
      limpar()
      window.dispatchEvent(new Event(TRANSACOES_ATUALIZADAS))
      router.refresh()
      onSaved?.()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui salvar. Tente novamente.")
    } finally {
      salvando.current = false
      setEnviando(false)
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(proximo) => {
        if (!proximo && salvando.current) return
        if (proximo) setData((atual) => (centavos || descricao ? atual : dataLocal()))
        setAberto(proximo)
      }}
    >
      <div className={cn(compacto ? "inline-flex" : ancorado ? "relative flex items-center justify-center" : "fixed bottom-24 right-4 z-40 lg:hidden")}>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label="Adicionar"
            className={cn(
              "ios-tap flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground shadow-alta motion-reduce:!transform-none motion-reduce:!transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acao focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              compacto ? "min-h-11 px-4 py-2 text-sm font-medium" : ancorado ? "size-11 sm:size-10" : "size-14",
            )}
          >
            <Plus aria-hidden="true" strokeWidth={2} className="size-5 shrink-0" />
            {compacto && <span>Adicionar</span>}
          </button>
        </DialogTrigger>
      </div>

      <DialogContent largura="curta" className={estilos.folha}>
        <form onSubmit={salvar} className={estilos.formulario} aria-busy={enviando} data-tipo={tipo}>
          <DialogTitle className={estilos.titulo}>Nova transação</DialogTitle>
          <DialogDescription className="sr-only">Saída ou entrada, valor, descrição, data, categoria e conta. O microfone preenche pela fala.</DialogDescription>

          <div className={estilos.tipos} role="radiogroup" aria-label="Tipo">
            <button type="button" role="radio" aria-checked={tipo === "DESPESA"} onClick={() => { setTipo("DESPESA"); setCategoriaId("") }}>
              <MinusCircle aria-hidden /> Saída
            </button>
            <button type="button" role="radio" aria-checked={tipo === "RECEITA"} onClick={() => { setTipo("RECEITA"); setCategoriaId("") }}>
              <PlusCircle aria-hidden /> Entrada
            </button>
          </div>

          <div className={estilos.valor}>
            <input
              aria-label="Valor"
              inputMode="numeric"
              value={formatarMoeda(centavos)}
              onChange={(evento) => {
                const digitos = evento.target.value.replace(/\D/g, "").slice(0, 11)
                setCentavos(Number(digitos || "0"))
              }}
              onFocus={(evento) => evento.target.select()}
            />
            <DitarGasto compacto rotulo="a transação" aoTranscrever={preencherPelaFala} className={estilos.microfone} />
          </div>
          <p className={estilos.dica}>
            {ouvido ? <>Ouvi: “{ouvido}”. Confira os campos antes de adicionar.</> : <>Toque no microfone e fale: “mercado cinquenta e dois e trinta, ontem”.</>}
          </p>

          <div className={estilos.linhas}>
            <label>
              <span>Descrição</span>
              <input value={descricao} onChange={(evento) => setDescricao(evento.target.value)} placeholder="Nome da transação…" />
            </label>
            <label>
              <span>Data</span>
              <span className={estilos.escolha}>
                {dataPorExtenso(data)}
                <ChevronRight aria-hidden />
                {/* O seletor nativo fica por cima, invisível: a data aparece
                    por extenso em português, e o toque abre o calendário do
                    celular. O campo de data mostrava 09/24/2026, no formato
                    do navegador. */}
                <input type="date" value={data} max={dataLocal()} onChange={(evento) => evento.target.value && setData(evento.target.value)} aria-label="Data" />
              </span>
            </label>
            <label>
              <span>Categoria</span>
              <span className={estilos.escolha}>
                {categoriasDoTipo.find((categoria) => categoria.id === categoriaId)?.nome ?? "Automática"}
                <ChevronRight aria-hidden />
                <select value={categoriaId} onChange={(evento) => setCategoriaId(evento.target.value)} aria-label="Categoria">
                  <option value="">Automática (pelas suas regras)</option>
                  {categoriasDoTipo.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}
                </select>
              </span>
            </label>
            <label>
              <span>Conta</span>
              <span className={estilos.escolha}>
                {contas === null ? "Carregando…" : contas.find((conta) => conta.id === contaId)?.nome ?? "Nenhuma conta"}
                <ChevronRight aria-hidden />
                <select value={contaId} onChange={(evento) => setContaId(evento.target.value)} aria-label="Conta" disabled={!contas?.length}>
                  {contas?.map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}
                </select>
              </span>
            </label>
          </div>

          {(erroContas || contas?.length === 0) && (
            <p className={estilos.aviso}>
              {erroContas ? "Não consegui carregar suas contas." : "Cadastre uma conta para lançar."}{" "}
              <Link href="/configuracoes" onClick={() => setAberto(false)}>Gerenciar contas</Link>
            </p>
          )}
          {erro && <p role="alert" className={estilos.aviso}>{erro}</p>}

          <button type="submit" className={estilos.adicionar} disabled={!pronto || enviando}>
            {enviando ? "Adicionando…" : tipo === "DESPESA" ? "Adicionar saída" : "Adicionar entrada"}
          </button>

          <div className={estilos.outros}>
            <Link href="/capturas" onClick={() => setAberto(false)}><Zap aria-hidden />Anotar vários de uma vez</Link>
            <Link href="/importar" onClick={() => setAberto(false)}><Upload aria-hidden />Importar extrato</Link>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

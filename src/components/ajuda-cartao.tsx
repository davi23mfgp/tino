"use client"

import { useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, CircleDollarSign, ListChecks, PiggyBank } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { enviar } from "@/lib/cliente"
import estilos from "./ajuda-cartao.module.css"
import { resumoDoMes, type DadosCartao } from "@/lib/cartoes"
import { formatarMoeda } from "@/lib/dinheiro"
import { PontosCartao } from "@/components/pontos-cartao"


const OBJETIVOS = [
  { id: "economia", nome: "Economizar", Icone: PiggyBank },
  { id: "pontos", nome: "Pontos e milhas", Icone: CircleDollarSign },
  { id: "fatura", nome: "Conferir fatura", Icone: ListChecks },
]

/**
 * As ferramentas do cartão. A aba Ajuda saiu em 26/09 e cada uma foi para onde
 * a pessoa já está: `objetivos` escolhe quais aparecem (conferir e pontos no
 * botão "Conferir" das compras) e `semCabecalho` tira o título, que o diálogo
 * em volta já dá.
 */
export function AjudaCartao({ cartao, mes, aoAbrir, objetivos = ["economia", "pontos", "fatura"], semCabecalho = false }: { cartao: DadosCartao; mes: string; aoAbrir: (aba: string) => void; objetivos?: string[]; semCabecalho?: boolean }) {
  const router = useRouter()
  const [objetivo, setObjetivo] = useState(objetivos[0])
  const [reducao, setReducao] = useState(10)
  const [categoriaId, setCategoriaId] = useState("")
  const [estado, setEstado] = useState("")

  const resumo = resumoDoMes(cartao, mes)
  const categoria = resumo.categorias.find((linha) => linha.id === categoriaId) ?? resumo.categorias[0]
  const economia = Math.round((categoria?.totalCentavos ?? 0) * reducao / 100)
  const teto = (categoria?.totalCentavos ?? 0) - economia

  // Depois de aplicar, a tela precisa dizer como a decisão está indo — senão a
  // pessoa aplica o teto e nunca mais sabe se ele está sendo respeitado.
  const tetoSalvo = cartao.orcamentos
    ?.find((plano) => plano.competencia === mes)
    ?.categorias.find((linha) => linha.categoriaId === categoria?.id)
    ?.limiteCentavos ?? null
  const gastoDaCategoria = categoria?.totalCentavos ?? 0
  const usoDoTeto = tetoSalvo && tetoSalvo > 0 ? Math.min(100, Math.round((gastoDaCategoria / tetoSalvo) * 100)) : null

  const semCategoria = resumo.compras.filter((compra) => !compra.categoriaId).length
  const categorizadas = resumo.compras.length - semCategoria

  async function aplicarTeto() {
    if (!categoria || categoria.id === "sem" || estado === "Salvando…") return
    setEstado("Salvando…")
    const plano = cartao.orcamentos?.find((linha) => linha.competencia === mes)
    const categorias = [...(plano?.categorias ?? []).filter((linha) => linha.categoriaId !== categoria.id), { categoriaId: categoria.id, limiteCentavos: teto }]
    const totalCentavos = Math.max(plano?.totalCentavos ?? resumo.gastos, categorias.reduce((soma, linha) => soma + linha.limiteCentavos, 0))
    try {
      await enviar(`/api/cartoes/${cartao.id}/orcamento`, { competencia: mes, totalCentavos, categorias }, "PUT")
      setEstado("Teto salvo no orçamento deste mês.")
      // Sem isso o acompanhamento abaixo continuaria mostrando o plano antigo.
      router.refresh()
    } catch (erro) {
      setEstado(erro instanceof Error ? erro.message : "Não foi possível salvar. Tente novamente.")
    }
  }

  return (
    <section className={estilos.painel}>
      {!semCabecalho && <header>
        <h2>Seu próximo passo</h2>
        <p>Escolha o que você quer deste cartão agora.</p>
      </header>}

      {objetivos.length > 1 && <div className={estilos.objetivos} role="group" aria-label="Objetivo">
        {OBJETIVOS.filter(({ id }) => objetivos.includes(id)).map(({ id, nome, Icone }) => (
          <button key={id} type="button" aria-pressed={objetivo === id} onClick={() => setObjetivo(id)}>
            <Icone size={16} aria-hidden />{nome}
          </button>
        ))}
      </div>}

      {objetivo === "economia" && (
        <div className={estilos.resultado}>
          <div className={estilos.contexto}>
            <small>Onde você quer reduzir</small>
            <Select value={categoria?.id ?? ""} onValueChange={(valor) => { setCategoriaId(valor); setEstado("") }}>
              <SelectTrigger aria-label="Categoria para economizar"><SelectValue /></SelectTrigger>
              <SelectContent>
                {resumo.categorias.map((linha) => <SelectItem key={linha.id} value={linha.id}>{linha.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <p>{categoria ? `${formatarMoeda(categoria.totalCentavos)} registrado neste mês` : "Registre compras para definir seu plano."}</p>
            <label className={estilos.reducao}>
              Cortar <b>{reducao}%</b> deste gasto
              <input
                aria-label="Percentual de redução"
                type="range"
                min={0}
                max={50}
                value={reducao}
                style={{ "--progresso": `${reducao * 2}%` } as CSSProperties}
                onChange={(evento) => { setReducao(Number(evento.target.value)); setEstado("") }}
              />
            </label>
          </div>
          <div className={estilos.meta}>
            <small>Você economiza</small>
            <strong>{formatarMoeda(economia)}</strong>
            <p>O teto da categoria passa a ser {formatarMoeda(teto)} neste mês.</p>
            <Button disabled={!categoria || categoria.id === "sem" || estado === "Salvando…"} onClick={() => void aplicarTeto()}>
              Aplicar teto na categoria <ArrowRight size={15} />
            </Button>
            <span role="status">{estado}</span>
            {tetoSalvo !== null && (
              <div className={estilos.acompanhamento}>
                <p>
                  Teto em vigor: <b>{formatarMoeda(tetoSalvo)}</b> · já usou <b>{formatarMoeda(gastoDaCategoria)}</b>
                </p>
                <Trilho valor={usoDoTeto ?? 0} rotulo={`Uso do teto de ${categoria?.nome ?? "categoria"}`} estourou={gastoDaCategoria > tetoSalvo} />
                <p>{gastoDaCategoria > tetoSalvo ? `Passou ${formatarMoeda(gastoDaCategoria - tetoSalvo)} do teto.` : `Ainda cabem ${formatarMoeda(tetoSalvo - gastoDaCategoria)}.`}</p>
              </div>
            )}
            <small>Compras já feitas não são alteradas.</small>
          </div>
        </div>
      )}

      {objetivo === "pontos" && <PontosCartao key={cartao.id} cartao={cartao} mes={mes} />}

      {objetivo === "fatura" && (
        <div className={estilos.resultado}>
          <div className={estilos.contexto}>
            <small>Conferência de compras</small>
            <h3>{semCategoria ? `${semCategoria} para categorizar` : "Categorias em dia"}</h3>
            <Trilho valor={resumo.compras.length ? Math.round((categorizadas / resumo.compras.length) * 100) : 0} rotulo="Compras categorizadas" />
            <p>{categorizadas} de {resumo.compras.length} categorizadas</p>
            <Button variant="outline" onClick={() => aoAbrir(semCategoria ? "compras" : "importar")}>
              {semCategoria ? "Revisar compras" : "Importar fatura para conferir"}<ArrowRight size={15} />
            </Button>
          </div>
          <div className={estilos.meta}>
            <small>Fatura deste mês</small>
            <strong>{formatarMoeda(resumo.saldo)}</strong>
            <p>{cartao.diaVencimento ? `Vence dia ${cartao.diaVencimento}` : "Vencimento não informado"}</p>
            <small>{formatarMoeda(resumo.creditos)} em créditos · {formatarMoeda(resumo.previsto)} em parcelas previstas, contados separadamente.</small>
          </div>
        </div>
      )}
    </section>
  )
}

/**
 * Trilho fino do próprio desenho.
 *
 * O `<progress>` nativo trazia a aparência do sistema operacional para dentro
 * de uma tela que não se parece com ele; e a cor sozinha não contava que o
 * gasto passou do teto — por isso o texto ao lado sempre diz o mesmo.
 */
function Trilho({ valor, rotulo, estourou = false }: { valor: number; rotulo: string; estourou?: boolean }) {
  return (
    <span
      className={estilos.trilho}
      role="progressbar"
      aria-label={rotulo}
      aria-valuenow={valor}
      aria-valuemin={0}
      aria-valuemax={100}
      data-estourou={estourou}
    >
      <i style={{ width: `${Math.max(0, Math.min(100, valor))}%` }} />
    </span>
  )
}

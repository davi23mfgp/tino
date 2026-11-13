"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Check, FileText, PenLine } from "lucide-react"

import { SeletorInstituicao } from "@/components/seletor-instituicao"
import { BASE_CONTAS_FIXAS } from "@/lib/base-contas-fixas"
import { enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"

export interface EstadoDoRoteiro {
  /** Contas, renda, contas fixas, limites, extrato: o que os dados já mostram feito. */
  feitos: boolean[]
  contas: { id: string; nome: string; tipo: string; instituicao: string | null }[]
  categorias: { id: string; nome: string; tipo: string }[]
  competencia: string
}

const TITULOS = ["Onde fica o seu dinheiro?", "Quanto entra por mês?", "Quais contas chegam todo mês?", "Quanto pode ir para cada coisa?", "Traga o extrato do banco"]
const APOIOS = [
  "Conte as contas do banco e os cartões que você usa. Dá para mudar depois.",
  "Pode ser aproximado. Dá para mudar depois.",
  "Toque nas que você paga. O valor vem em seguida.",
  "Um limite por mês para o que mais pesa no dia a dia. Deixe em branco o que não quiser limitar.",
  "O Tino lê o arquivo do banco e mostra antes de gravar. Nada entra sem você conferir.",
]
/// Gastos do dia a dia que mais variam: é onde o limite ajuda. Conta fixa já
/// tem valor certo e não precisa de limite.
const LIMITES = ["Supermercado", "Restaurante", "Delivery", "Combustível", "Farmácia", "Lazer e eventos"]

// Letra e toque grandes de propósito: a pergunta é o que importa na tela, e
// quem tem 65 anos precisa ler sem óculos de perto (visão de produto, 05/10).
const CAMPO = "min-h-14 w-full rounded-[18px] border border-pauta bg-transparent px-4 text-[calc(20px*var(--escala-letra))] outline-none focus:border-acao/60"
const ROTULO = "grid gap-1.5 text-[calc(15px*var(--escala-letra))] text-muted-fg"
const CHIP = "min-h-12 rounded-full border px-4 text-[calc(15px*var(--escala-letra))]"

function valorValido(texto: string) {
  const centavos = paraCentavos(texto)
  return Number.isSafeInteger(centavos) && centavos > 0 && centavos <= 2147483647 ? centavos : null
}

export function Roteiro({ estado, passoInicial = null }: { estado: EstadoDoRoteiro; passoInicial?: number | null }) {
  const router = useRouter()
  const [feitos, setFeitos] = useState(estado.feitos)
  const [contas, setContas] = useState(estado.contas)
  const primeiro = estado.feitos.findIndex((feito) => !feito)
  const [passo, setPasso] = useState(passoInicial ?? (primeiro === -1 ? 0 : primeiro))
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState("")
  const [aviso, setAviso] = useState("")

  // Passo 1
  const [tipo, setTipo] = useState<"CORRENTE" | "CARTAO_CREDITO" | "DINHEIRO">("CORRENTE")
  const [banco, setBanco] = useState("")
  const [valorConta, setValorConta] = useState("")
  const [vencimento, setVencimento] = useState("")
  // Passo 2
  const [renda, setRenda] = useState("")
  const [diaRenda, setDiaRenda] = useState("5")
  // Passo 3
  const [escolhidas, setEscolhidas] = useState<string[]>([])
  const [valoresFixas, setValoresFixas] = useState<Record<string, { valor: string; dia: string }>>({})
  const [detalhando, setDetalhando] = useState(false)
  // Passo 4
  const [limites, setLimites] = useState<Record<string, string>>({})

  const categoria = (nome: string) => estado.categorias.find((linha) => linha.nome === nome)?.id ?? null
  // Renda e conta fixa caem na conta do banco; sem ela, na Carteira que o
  // cadastro cria, e só por último num cartão.
  const contaDoDia = contas.find((conta) => conta.tipo === "CORRENTE" && conta.instituicao) ?? contas.find((conta) => conta.tipo === "CORRENTE") ?? contas.find((conta) => conta.tipo !== "CARTAO_CREDITO") ?? contas[0]

  function marcar(indice: number) {
    setFeitos((atual) => atual.map((feito, i) => (i === indice ? true : feito)))
  }
  function seguir() {
    setErro("")
    setAviso("")
    setDetalhando(false)
    if (passo < 4) setPasso(passo + 1)
    else {
      // Fim do roteiro conta no funil (achado 14). Falha calada: medir não segura a pessoa.
      void enviar("/api/funil/roteiro", {}).catch(() => {})
      router.push("/painel")
      router.refresh()
    }
  }
  /** Devolve se deu certo, para o "guardar e continuar" só seguir quando gravou. */
  async function tentar(acao: () => Promise<void>): Promise<boolean> {
    setOcupado(true)
    setErro("")
    try {
      await acao()
      return true
    } catch (excecao) {
      setErro(excecao instanceof Error && excecao.message ? excecao.message : "Não consegui guardar. Tente de novo.")
      return false
    } finally {
      setOcupado(false)
    }
  }

  const guardarConta = () =>
    tentar(async () => {
      if (tipo !== "DINHEIRO" && !banco) throw new Error("Escolha o banco.")
      const centavos = valorConta.trim() ? valorValido(valorConta) : 0
      if (centavos === null) throw new Error("Confira o valor: use 1.234,56.")
      if (tipo === "CARTAO_CREDITO" && vencimento && !(Number(vencimento) >= 1 && Number(vencimento) <= 31)) throw new Error("O dia vai de 1 a 31.")
      const nome = tipo === "DINHEIRO" ? "Carteira" : tipo === "CARTAO_CREDITO" ? `Cartão ${banco}` : banco
      const criada = await enviar<{ id: string }>("/api/contas", {
        nome,
        tipo,
        instituicao: tipo === "DINHEIRO" ? undefined : banco,
        ...(tipo === "CARTAO_CREDITO"
          ? { limiteCentavos: centavos || undefined, diaVencimento: vencimento ? Number(vencimento) : undefined }
          : { saldoInicialCentavos: centavos }),
      })
      setContas((atual) => [...atual, { id: criada.id, nome, tipo, instituicao: tipo === "DINHEIRO" ? null : banco }])
      setBanco("")
      setValorConta("")
      setVencimento("")
      setAviso(`${nome} guardada.`)
      marcar(0)
    })

  const guardarRenda = () =>
    tentar(async () => {
      if (!contaDoDia) throw new Error("Cadastre antes uma conta no passo 1: é nela que a renda entra.")
      const centavos = valorValido(renda)
      if (!centavos) throw new Error("Escreva quanto entra, por exemplo 4.200,00.")
      const dia = Number(diaRenda)
      if (!(dia >= 1 && dia <= 31)) throw new Error("O dia vai de 1 a 31.")
      await enviar("/api/recorrencias", { descricao: "Salário", valorCentavos: centavos, tipo: "RECEITA", diaVencimento: dia, contaId: contaDoDia.id, categoriaId: categoria("Salário") })
      setRenda("")
      setAviso(`Renda de ${formatarMoeda(centavos)} todo dia ${dia} guardada.`)
      marcar(1)
    })

  const guardarFixas = () =>
    tentar(async () => {
      if (!contaDoDia) throw new Error("Cadastre antes uma conta no passo 1: é dela que as contas saem.")
      const linhas = escolhidas.map((id) => {
        const base = BASE_CONTAS_FIXAS.find((conta) => conta.id === id)!
        const dados = valoresFixas[id] ?? { valor: "", dia: "" }
        const centavos = valorValido(dados.valor)
        const dia = Number(dados.dia)
        if (!centavos) throw new Error(`Escreva o valor de ${base.nome}.`)
        if (!(dia >= 1 && dia <= 31)) throw new Error(`Escreva o dia em que ${base.nome} vence (1 a 31).`)
        return { base, centavos, dia }
      })
      for (const linha of linhas) {
        await enviar("/api/recorrencias", {
          descricao: linha.base.nome,
          valorCentavos: linha.centavos,
          tipo: "DESPESA",
          diaVencimento: linha.dia,
          contaId: contaDoDia.id,
          categoriaId: categoria(linha.base.categoria),
          valorVariavel: linha.base.variavel,
        })
      }
      marcar(2)
      seguir()
    })

  const guardarLimites = () =>
    tentar(async () => {
      const linhas: { categoriaId: string; limiteCentavos: number }[] = []
      for (const nome of LIMITES) {
        const texto = (limites[nome] ?? "").trim()
        if (!texto) continue
        const centavos = valorValido(texto)
        if (!centavos) throw new Error(`Confira o valor de ${nome}.`)
        const id = categoria(nome)
        if (id) linhas.push({ categoriaId: id, limiteCentavos: centavos })
      }
      if (!linhas.length) throw new Error("Escreva pelo menos um limite, ou toque em Pular.")
      // Um ano para a frente: limite de mercado não muda todo mês, e refazer
      // no dia 1º é o tipo de tarefa que faz a pessoa largar o app.
      await enviar("/api/orcamento", { competencia: estado.competencia, linhas, repetirMeses: 11 }, "PUT")
      marcar(3)
      seguir()
    })

  const botaoPrincipal = (texto: string, acao: () => void, desligado = false) => (
    <button
      type="button"
      onClick={acao}
      disabled={ocupado || desligado}
      className="min-h-14 w-full rounded-full bg-acao text-[calc(17px*var(--escala-letra))] font-bold text-background disabled:opacity-50"
    >
      {ocupado ? "guardando…" : texto}
    </button>
  )
  const botaoLeve = (texto: string, acao: () => void) => (
    <button type="button" onClick={acao} disabled={ocupado} className="min-h-14 w-full rounded-full border border-pauta text-[calc(16px*var(--escala-letra))] font-semibold">
      {texto}
    </button>
  )

  let corpo: React.ReactNode = null
  let rodape: React.ReactNode = null

  if (passo === 0) {
    corpo = (
      <>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo">
          {([["CORRENTE", "Conta no banco"], ["CARTAO_CREDITO", "Cartão de crédito"], ["DINHEIRO", "Dinheiro vivo"]] as const).map(([valor, nome]) => (
            <button key={valor} type="button" role="radio" aria-checked={tipo === valor} onClick={() => setTipo(valor)} className={cn(CHIP, tipo === valor ? "border-acao/60 bg-acao/10 text-acao" : "border-pauta")}>
              {nome}
            </button>
          ))}
        </div>
        {tipo !== "DINHEIRO" && <SeletorInstituicao valor={banco} aoEscolher={setBanco} />}
        <label className={ROTULO}>
          {tipo === "CARTAO_CREDITO" ? "Limite do cartão (se souber)" : "Quanto tem hoje"}
          <input className={CAMPO} inputMode="decimal" placeholder="0,00" value={valorConta} onChange={(evento) => setValorConta(evento.target.value)} />
        </label>
        {tipo === "CARTAO_CREDITO" && (
          <label className={ROTULO}>
            Dia em que a fatura vence
            <input className={CAMPO} inputMode="numeric" placeholder="10" value={vencimento} onChange={(evento) => setVencimento(evento.target.value.replace(/\D/g, "").slice(0, 2))} />
          </label>
        )}
        {contas.some((conta) => conta.instituicao || conta.tipo === "CARTAO_CREDITO") && (
          <ul className="grid gap-1.5" aria-label="Já guardadas">
            {contas.filter((conta) => conta.instituicao || conta.tipo === "CARTAO_CREDITO").map((conta) => (
              <li key={conta.id} className="flex items-center gap-2 text-[calc(15px*var(--escala-letra))]"><Check className="size-4 text-acao" aria-hidden />{conta.nome}</li>
            ))}
          </ul>
        )}
      </>
    )
    rodape = (
      <>
        {botaoPrincipal(feitos[0] ? "Guardar mais esta" : "Guardar", guardarConta)}
        {feitos[0] && botaoLeve("Pronto, continuar", seguir)}
      </>
    )
  } else if (passo === 1) {
    corpo = (
      <>
        <label className={ROTULO}>
          Salário, depois dos descontos
          <input className={CAMPO} inputMode="decimal" placeholder="4.200,00" value={renda} onChange={(evento) => setRenda(evento.target.value)} />
        </label>
        <label className={ROTULO}>
          Todo dia
          <input className={CAMPO} inputMode="numeric" value={diaRenda} onChange={(evento) => setDiaRenda(evento.target.value.replace(/\D/g, "").slice(0, 2))} />
        </label>
      </>
    )
    rodape = feitos[1] ? (
      <>
        {botaoLeve("Guardar outra renda", guardarRenda)}
        {botaoPrincipal("Continuar", seguir)}
      </>
    ) : (
      botaoPrincipal("Guardar e continuar", () => void guardarRenda().then((certo) => { if (certo) seguir() }))
    )
  } else if (passo === 2 && !detalhando) {
    corpo = (
      <div className="flex flex-wrap gap-2">
        {BASE_CONTAS_FIXAS.map((conta) => {
          const ligada = escolhidas.includes(conta.id)
          return (
            <button
              key={conta.id}
              type="button"
              aria-pressed={ligada}
              onClick={() => setEscolhidas((atual) => (ligada ? atual.filter((id) => id !== conta.id) : [...atual, conta.id]))}
              className={cn(CHIP, ligada ? "border-acao/60 bg-acao/10 text-acao" : "border-pauta")}
            >
              {ligada && <Check className="mr-1 inline size-4" aria-hidden />}
              {conta.nome}
            </button>
          )
        })}
      </div>
    )
    rodape = botaoPrincipal(escolhidas.length ? `Continuar com ${escolhidas.length}` : "Escolha pelo menos uma", () => setDetalhando(true), !escolhidas.length)
  } else if (passo === 2) {
    corpo = (
      <div className="grid gap-4">
        {escolhidas.map((id) => {
          const base = BASE_CONTAS_FIXAS.find((conta) => conta.id === id)!
          const dados = valoresFixas[id] ?? { valor: "", dia: "" }
          const mudar = (campo: "valor" | "dia", texto: string) => setValoresFixas((atual) => ({ ...atual, [id]: { ...dados, [campo]: texto } }))
          return (
            <fieldset key={id} className="grid gap-2 rounded-[22px] border border-pauta p-4">
              <legend className="px-1 text-[calc(17px*var(--escala-letra))] font-semibold">{base.nome}</legend>
              <div className="grid grid-cols-[1fr_96px] gap-2">
                <label className={ROTULO}>Valor<input className={CAMPO} inputMode="decimal" placeholder="0,00" value={dados.valor} onChange={(evento) => mudar("valor", evento.target.value)} /></label>
                <label className={ROTULO}>Dia<input className={CAMPO} inputMode="numeric" placeholder="10" value={dados.dia} onChange={(evento) => mudar("dia", evento.target.value.replace(/\D/g, "").slice(0, 2))} /></label>
              </div>
              {base.dica && <p className="text-[calc(13.5px*var(--escala-letra))] leading-snug text-muted-fg">{base.dica}</p>}
            </fieldset>
          )
        })}
      </div>
    )
    rodape = (
      <>
        {botaoPrincipal("Guardar e continuar", guardarFixas)}
        {botaoLeve("Voltar à lista", () => setDetalhando(false))}
      </>
    )
  } else if (passo === 3) {
    corpo = (
      <div className="grid gap-3">
        {LIMITES.filter((nome) => categoria(nome)).map((nome) => (
          <label key={nome} className="grid grid-cols-[1fr_150px] items-center gap-3 text-[calc(17px*var(--escala-letra))]">
            {nome}
            <input className={CAMPO} inputMode="decimal" placeholder="0,00" aria-label={`Limite de ${nome}`} value={limites[nome] ?? ""} onChange={(evento) => setLimites((atual) => ({ ...atual, [nome]: evento.target.value }))} />
          </label>
        ))}
      </div>
    )
    rodape = botaoPrincipal("Guardar e continuar", guardarLimites)
  } else {
    corpo = (
      <div className="grid gap-3">
        <Link href="/importar" className="flex min-h-20 items-center gap-4 rounded-[22px] border border-acao/50 bg-acao/10 px-5">
          <FileText className="size-7 shrink-0 text-acao" aria-hidden />
          <span className="text-[calc(17px*var(--escala-letra))] font-semibold">Trazer o extrato ou a fatura<small className="block text-[calc(14px*var(--escala-letra))] font-normal text-muted-fg">PDF, OFX ou CSV, do site ou app do banco</small></span>
        </Link>
        <Link href="/capturas" className="flex min-h-20 items-center gap-4 rounded-[22px] border border-pauta px-5">
          <PenLine className="size-7 shrink-0" aria-hidden />
          <span className="text-[calc(17px*var(--escala-letra))] font-semibold">Anotar um gasto agora<small className="block text-[calc(14px*var(--escala-letra))] font-normal text-muted-fg">escreva ou fale, como "mercado 52,30"</small></span>
        </Link>
      </div>
    )
    rodape = botaoPrincipal(feitos[4] ? "Terminar" : "Fazer depois e ir para o Início", seguir)
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-1 py-4 md:grid-cols-[280px_1fr] md:py-10">
      {/* No computador, a lista dos 5 ao lado; no celular, só a barra. */}
      <aside className="hidden md:block">
        <p className="mb-4 text-[calc(19px*var(--escala-letra))] font-bold">Montar o seu Tino</p>
        <ol className="grid gap-1">
          {TITULOS.map((titulo, indice) => (
            <li key={titulo}>
              <button type="button" onClick={() => { setPasso(indice); setDetalhando(false); setErro(""); setAviso("") }} className={cn("flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-[calc(15px*var(--escala-letra))]", indice === passo && "bg-acao/10 font-semibold text-acao")}>
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border text-[13px]", feitos[indice] ? "border-acao bg-acao text-background" : "border-pauta")}>{feitos[indice] ? <Check className="size-4" aria-hidden /> : indice + 1}</span>
                {titulo}
              </button>
            </li>
          ))}
        </ol>
      </aside>

      <section className="mx-auto flex min-h-[calc(100dvh-180px)] w-full max-w-[480px] flex-col gap-5" aria-labelledby="pergunta">
        <div className="flex items-center justify-between text-[calc(15px*var(--escala-letra))] text-muted-fg">
          <span>Passo {passo + 1} de 5</span>
          <button type="button" onClick={seguir} disabled={ocupado} className="min-h-11 px-2">{passo === 4 ? "Fechar" : "Pular"}</button>
        </div>
        <div className="flex gap-1.5" aria-hidden>
          {TITULOS.map((titulo, indice) => <i key={titulo} className={cn("h-1.5 flex-1 rounded-full", indice <= passo ? "bg-acao" : "bg-[color-mix(in_oklab,var(--foreground),transparent_88%)]")} />)}
        </div>
        <div>
          <h1 id="pergunta" className="text-[calc(29px*var(--escala-letra))] font-bold leading-tight tracking-tight">{TITULOS[passo]}</h1>
          <p className="mt-2 text-[calc(16.5px*var(--escala-letra))] leading-relaxed text-muted-fg">{passo === 2 && detalhando ? "O valor da última conta e o dia em que vence." : APOIOS[passo]}</p>
        </div>
        <div className="grid gap-4">{corpo}</div>
        {aviso && <p role="status" className="text-[calc(15px*var(--escala-letra))] text-acao">{aviso}</p>}
        {erro && <p role="alert" className="text-[calc(15px*var(--escala-letra))] text-negativo">{erro}</p>}
        <span className="flex-1" />
        {/* No celular a barra de baixo flutua por cima: sem esta folga ela cobria o segundo botão. */}
        <div className="grid gap-2 pb-28 md:pb-4">{rodape}</div>
      </section>
    </div>
  )
}

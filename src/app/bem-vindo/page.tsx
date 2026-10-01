"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react"
import { enviar } from "@/lib/cliente"
import { paraCentavos } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"
import { OBJETIVOS_FINANCEIROS, PERFIS_DE_RISCO } from "@/lib/perfil-inicial"
import { SeletorInstituicao } from "@/components/seletor-instituicao"

interface ContaForm { tipo: "CORRENTE" | "POUPANCA" | "DINHEIRO" | "INVESTIMENTO"; instituicao: string; saldo: string; negativa: boolean }
interface CartaoForm { instituicao: string; limite: string; vencimento: string }
const campo = "w-full rounded-[var(--raio-campo)] border border-pauta bg-background px-4 py-3 text-sm outline-none focus:border-acao/50"

export default function BemVindo() {
  const router = useRouter()
  const [passo, setPasso] = useState(0)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [renda, setRenda] = useState("")
  const [diaInicioMes, setDiaInicioMes] = useState("1")
  const [contas, setContas] = useState<ContaForm[]>([{ tipo: "CORRENTE", instituicao: "", saldo: "", negativa: false }])
  const [cartoes, setCartoes] = useState<CartaoForm[]>([])
  const [objetivosFinanceiros, setObjetivos] = useState<string[]>([])
  const [perfilDeRisco, setPerfil] = useState("NAO_SEI")
  const [tipoLar, setTipoLar] = useState("SOLO")
  const [quantidadeConvites, setQuantidadeConvites] = useState("1")
  const [emailsConvite, setEmailsConvite] = useState<string[]>([])
  const [convites, setConvites] = useState<{ email: string; link: string; enviado: boolean }[] | null>(null)
  async function concluir() {
    setSalvando(true); setErro(null)
    try {
      const valores = [renda, ...contas.map((conta) => conta.saldo), ...cartoes.map((cartao) => cartao.limite)]
      if (valores.some((valor) => valor.trim() && (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:[,.]\d{1,2})?$/.test(valor.trim()) || paraCentavos(valor) > 2147483647))) throw new Error("Confira os valores: use 1.234,56 ou 1234.56.")
      if (contas.some((conta) => conta.tipo !== "DINHEIRO" && !conta.instituicao && conta.saldo)) throw new Error("Escolha o banco de cada conta com saldo informado.")
      if (cartoes.some((cartao) => !cartao.instituicao)) throw new Error("Escolha a instituição de cada cartão ou remova o cartão vazio.")
      const quantidade = tipoLar === "SOLO" ? 0 : Number(quantidadeConvites)
      const emails = Array.from({ length: quantidade }, (_, indice) => (emailsConvite[indice] ?? "").trim().toLowerCase())
      if (emails.some((email) => !email)) throw new Error("Preencha o e-mail de cada pessoa que deseja convidar.")
      if (new Set(emails).size !== emails.length) throw new Error("Informe um e-mail diferente para cada pessoa.")
      if (emails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || emails.length > 10) throw new Error("Informe um e-mail válido para cada pessoa (até dez convites).")
      await enviar("/api/onboarding", {
        rendaMensalCentavos: renda ? paraCentavos(renda) : undefined, diaInicioMes: Number(diaInicioMes), tipoLar, objetivosFinanceiros, perfilDeRisco,
        contas: contas.filter((conta) => conta.instituicao || conta.tipo === "DINHEIRO").map((conta) => ({
          nome: conta.tipo === "DINHEIRO" ? "Carteira" : conta.tipo === "POUPANCA" ? `Poupança ${conta.instituicao}` : conta.tipo === "INVESTIMENTO" ? `Investimentos ${conta.instituicao}` : conta.instituicao,
          tipo: conta.tipo, instituicao: conta.tipo === "DINHEIRO" ? undefined : conta.instituicao,
          saldoCentavos: conta.saldo ? paraCentavos(conta.saldo) * (conta.negativa ? -1 : 1) : 0,
        })),
        cartoes: cartoes.map((cartao) => ({ nome: `Cartão ${cartao.instituicao}`, instituicao: cartao.instituicao, limiteCentavos: cartao.limite ? paraCentavos(cartao.limite) : undefined, diaVencimento: cartao.vencimento ? Number(cartao.vencimento) : undefined })),
      })
      if (emails.length) {
        const links = await enviar<{ email: string; link: string; enviado: boolean }[]>("/api/convites", { emails })
        setConvites(links); setSalvando(false); return
      }
      router.push("/painel"); router.refresh()
    } catch (e) { setErro(e instanceof Error ? e.message : "Não consegui salvar."); setSalvando(false) }
  }
  async function pular() {
    setSalvando(true); setErro(null)
    try { await enviar("/api/onboarding", {}, "PATCH"); router.push("/painel"); router.refresh() }
    catch (e) { setErro(e instanceof Error ? e.message : "Não consegui continuar."); setSalvando(false) }
  }
  function atualizar<T>(definir: React.Dispatch<React.SetStateAction<T[]>>, indice: number, mudanca: Partial<T>) { definir((lista) => lista.map((item, i) => i === indice ? { ...item, ...mudanca } : item)) }
  function remover<T>(definir: React.Dispatch<React.SetStateAction<T[]>>, indice: number) { definir((lista) => lista.filter((_, i) => i !== indice)) }
  const passos = [
    { titulo: "Qual é sua renda mensal?", texto: "Informe sua renda e o dia em que recebe. Os gastos serão calculados pelos seus lançamentos.", conteudo: <div className="space-y-3">
      <label className="block space-y-1.5"><span className="text-xs uppercase tracking-widest text-muted-fg">Renda mensal</span><input className={campo} inputMode="decimal" placeholder="5.000,00" value={renda} onChange={(e) => setRenda(e.target.value)} /></label>
      <label className="block space-y-1.5"><span className="text-xs uppercase tracking-widest text-muted-fg">Em que dia do mês você recebe?</span><select className={campo} value={diaInicioMes} onChange={(e) => setDiaInicioMes(e.target.value)}>{Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>Dia {i + 1}</option>)}</select><span className="block text-xs text-muted-fg">Seu mês financeiro começa nesse dia.</span></label>
    </div> },
    { titulo: "Onde está seu dinheiro?", texto: "Escolha a instituição, o tipo de conta e o saldo de hoje.", conteudo: <div className="space-y-3">
      {contas.map((conta, indice) => <div key={indice} className="space-y-3 rounded-[var(--raio-cartao)] border border-pauta p-3">
        {conta.tipo !== "DINHEIRO" && <SeletorInstituicao valor={conta.instituicao} aoEscolher={(instituicao) => atualizar(setContas, indice, { instituicao })} />}
        <label className="block space-y-1 text-sm">Tipo de conta<select className={campo} value={conta.tipo} onChange={(e) => atualizar(setContas, indice, { tipo: e.target.value as ContaForm["tipo"], negativa: false })}><option value="CORRENTE">Conta corrente</option><option value="POUPANCA">Poupança</option><option value="DINHEIRO">Dinheiro em espécie</option><option value="INVESTIMENTO">Investimento</option></select></label>
        <label className="block space-y-1 text-sm">Saldo de hoje (R$)<input className={campo} inputMode="decimal" placeholder="0,00" value={conta.saldo} onChange={(e) => atualizar(setContas, indice, { saldo: e.target.value })} /></label>
        <div className="flex items-center justify-between">{conta.tipo === "CORRENTE" ? <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={conta.negativa} onChange={(e) => atualizar(setContas, indice, { negativa: e.target.checked })} />Conta no negativo</label> : <span />}<button type="button" aria-label={`Remover conta ${indice + 1}`} className="grid size-11 place-items-center text-muted-fg" onClick={() => remover(setContas, indice)}><Trash2 className="size-4" /></button></div>
      </div>)}<BotaoAdicionar onClick={() => setContas([...contas, { tipo: "CORRENTE", instituicao: "", saldo: "", negativa: false }])}>Adicionar conta</BotaoAdicionar>
    </div> },
    { titulo: "Quais cartões você usa?", texto: "Escolha a instituição, o limite e o dia de vencimento. As compras e parcelas entram quando você importar a fatura.", conteudo: <div className="space-y-3">
      {cartoes.map((cartao, indice) => <div key={indice} className="space-y-3 rounded-[var(--raio-cartao)] border border-pauta p-3"><SeletorInstituicao valor={cartao.instituicao} aoEscolher={(instituicao) => atualizar(setCartoes, indice, { instituicao })} />
        <label className="block space-y-1 text-sm">Limite total (R$)<input className={campo} inputMode="decimal" placeholder="6.000,00" value={cartao.limite} onChange={(e) => atualizar(setCartoes, indice, { limite: e.target.value })} /></label>
        <label className="block space-y-1 text-sm">Dia de vencimento<select className={campo} value={cartao.vencimento} onChange={(e) => atualizar(setCartoes, indice, { vencimento: e.target.value })}><option value="">Selecione o dia</option>{Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>Dia {i + 1}</option>)}</select><span className="block text-xs text-muted-fg">O dia escolhido será usado nos vencimentos mensais.</span></label>
        <button type="button" aria-label={`Remover cartão ${indice + 1}`} className="flex min-h-11 items-center gap-2 text-sm text-muted-fg" onClick={() => remover(setCartoes, indice)}><Trash2 className="size-4" />Remover cartão</button>
      </div>)}<BotaoAdicionar onClick={() => setCartoes([...cartoes, { instituicao: "", limite: "", vencimento: "" }])}>Adicionar cartão</BotaoAdicionar>
    </div> },
    { titulo: "O que você quer para sua vida financeira?", texto: "Pode escolher mais de uma prioridade. As metas com valores ficam para depois, na área de Metas.", conteudo: <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2">{OBJETIVOS_FINANCEIROS.map((objetivo) => <button type="button" key={objetivo.valor} aria-pressed={objetivosFinanceiros.includes(objetivo.valor)} onClick={() => setObjetivos((atual) => atual.includes(objetivo.valor) ? atual.filter((item) => item !== objetivo.valor) : [...atual, objetivo.valor])} className={cn("min-h-16 rounded-[var(--raio-campo)] border p-3 text-left text-sm", objetivosFinanceiros.includes(objetivo.valor) ? "border-acao bg-acao/10" : "border-pauta")}>{objetivo.rotulo}</button>)}</div>
      <div><h2 className="mb-3 text-sm font-medium">Como você se sente em relação a investimentos?</h2><div className="grid grid-cols-2 gap-2">{PERFIS_DE_RISCO.map((perfil) => <button type="button" key={perfil.valor} aria-pressed={perfilDeRisco === perfil.valor} onClick={() => setPerfil(perfil.valor)} className={cn("min-h-20 rounded-[var(--raio-campo)] border p-3 text-left", perfilDeRisco === perfil.valor ? "border-acao bg-acao/10" : "border-pauta")}><span className="block text-sm">{perfil.rotulo}</span><span className="mt-1 block text-xs text-muted-fg">{perfil.descricao}</span></button>)}</div></div>
    </div> },
    { titulo: "Quem vai usar este espaço?", texto: "Individual, casal ou família. Quem aceitar seu convite terá acesso completo a este espaço.", conteudo: <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">{[{ valor: "SOLO", nome: "Só eu" }, { valor: "CASAL", nome: "Casal" }, { valor: "FAMILIA", nome: "Família" }].map((tipo) => <button type="button" key={tipo.valor} aria-pressed={tipoLar === tipo.valor} onClick={() => setTipoLar(tipo.valor)} className={cn("min-h-16 rounded-[var(--raio-campo)] border p-3 text-sm", tipoLar === tipo.valor ? "border-acao bg-acao/10" : "border-pauta")}>{tipo.nome}</button>)}</div>
      {tipoLar !== "SOLO" && <div className="space-y-3">
        <label className="block space-y-2 text-sm">Quantas pessoas você quer convidar?<select className={campo} value={quantidadeConvites} onChange={(e) => setQuantidadeConvites(e.target.value)}><option value="0">Convidar depois</option>{Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? "pessoa" : "pessoas"}</option>)}</select><span className="block text-xs text-muted-fg">Conte apenas as pessoas que serão convidadas, sem incluir você.</span></label>
        {Array.from({ length: Number(quantidadeConvites) }, (_, indice) => <label key={indice} className="block space-y-2 text-sm">E-mail da pessoa {indice + 1}<input type="email" className={campo} value={emailsConvite[indice] ?? ""} placeholder="nome@email.com" onChange={(e) => setEmailsConvite((atual) => { const novos = [...atual]; novos[indice] = e.target.value; return novos })} /></label>)}
        <p className="text-xs text-muted-fg">A pessoa entra com o e-mail convidado, inclusive pelo Google, e aceita o link. Você também poderá copiar o link para compartilhar.</p>
      </div>}
    </div> },
  ]
  if (convites) return <div className="mt-8 space-y-4"><h1 className="text-2xl font-bold">Seu espaço está pronto</h1>{convites.map((convite) => <div key={convite.email} className="space-y-2 rounded-[var(--raio-cartao)] border border-pauta p-3"><p className="text-sm">{convite.email}</p><p className="text-xs text-muted-fg">{convite.enviado ? "Convite enviado por e-mail." : "Copie o link abaixo e envie à pessoa. O envio de e-mail não está disponível."}</p><input readOnly aria-label={`Link de convite para ${convite.email}`} className={campo} value={convite.link} onFocus={(e) => e.target.select()} /></div>)}<button type="button" className="rounded-full bg-primary px-5 py-3 text-primary-foreground" onClick={() => { router.push("/painel"); router.refresh() }}>Abrir painel</button></div>
  const atual = passos[passo]
  return <div className="mx-auto mt-6 w-full max-w-3xl rounded-[24px] border border-pauta bg-papel-1 p-5 shadow-lg sm:p-8"><div className="mb-6 flex gap-1.5">{passos.map((_, i) => <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i <= passo ? "bg-primary" : "bg-papel-2")} />)}</div>
    <p className="text-xs uppercase tracking-widest text-muted-fg">Passo {passo + 1} de {passos.length}</p><h1 className="mt-2 text-2xl font-bold tracking-tight">{atual.titulo}</h1><p className="mt-2 text-sm text-muted-fg">{atual.texto}</p><div className="mt-6">{atual.conteudo}</div>
    {erro && <p role="alert" className="mt-4 text-sm text-negativo">{erro}</p>}
    <div className="mt-8 flex items-center justify-between"><button disabled={salvando} onClick={() => passo === 0 ? pular() : setPasso(passo - 1)} className="flex min-h-11 items-center gap-2 rounded-full border border-pauta px-4 py-2.5 text-sm text-muted-fg">{passo === 0 ? "pular por agora" : <><ArrowLeft className="size-4" />voltar</>}</button><button disabled={salvando} onClick={() => passo === passos.length - 1 ? concluir() : setPasso(passo + 1)} className="flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">{passo === passos.length - 1 ? salvando ? "Salvando…" : "Concluir" : "Continuar"}{passo !== passos.length - 1 && <ArrowRight className="size-4" />}</button></div>
  </div>
}
function BotaoAdicionar({ children, onClick }: { children: React.ReactNode; onClick: () => void }) { return <button type="button" onClick={onClick} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-pauta py-3 text-sm text-muted-fg"><Plus className="size-4" />{children}</button> }

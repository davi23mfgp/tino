"use client"

import { useEffect, useState } from "react"
import { CheckCircle2 } from "lucide-react"

import { FichaPadrao, LinhaDaFicha } from "@/components/ficha-padrao"
import { Input } from "@/components/ui/input"
import { formatarDecimal, formatarMoeda, formatarPercentual, paraCentavos } from "@/lib/dinheiro"

/**
 * A ficha de uma dívida (passo 57, opção A). Antes não havia como mudar nem
 * apagar uma dívida: errou o juro ou quitou, ela ficava no plano para sempre.
 */
export interface DividaDaFicha {
  id: string
  credor: string
  saldoDevedorCentavos: number
  jurosMensalBps: number
  parcelaCentavos: number
  parcelasTotal: number | null
  parcelasPagas: number
  diaVencimento: number
}

export type EdicaoDeDivida = Partial<Omit<DividaDaFicha, "id">> & { quitada?: boolean }

interface Props {
  divida: DividaDaFicha | null
  aoFechar: () => void
  aoSalvar: (id: string, parcial: EdicaoDeDivida) => Promise<boolean>
  aoExcluir: (divida: DividaDaFicha) => void
}

const texto = (centavos: number) => (centavos ? formatarDecimal(centavos / 100, 2) : "")

export function FichaDivida({ divida, aoFechar, aoSalvar, aoExcluir }: Props) {
  const [editando, setEditando] = useState(false)
  const [campos, setCampos] = useState({ credor: "", saldo: "", juros: "", parcela: "", pagas: "", total: "", dia: "" })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  useEffect(() => {
    if (!divida) return
    setEditando(false)
    setErro("")
    setCampos({
      credor: divida.credor, saldo: texto(divida.saldoDevedorCentavos), juros: divida.jurosMensalBps ? formatarDecimal(divida.jurosMensalBps / 100, 2) : "",
      parcela: texto(divida.parcelaCentavos), pagas: String(divida.parcelasPagas), total: divida.parcelasTotal ? String(divida.parcelasTotal) : "", dia: String(divida.diaVencimento),
    })
  }, [divida])

  if (!divida) return <FichaPadrao aberta={false} aoFechar={aoFechar} titulo="Dívida"><span /></FichaPadrao>

  async function salvar() {
    if (!divida) return
    if (!campos.credor.trim()) return setErro("Escreva para quem você deve.")
    const saldo = paraCentavos(campos.saldo || "0")
    // A pessoa digita "2,5" pensando em 2,5% ao mês; o banco guarda pontos-base.
    const juros = campos.juros ? Math.round(Number(campos.juros.replace(/\./g, "").replace(",", ".")) * 100) : 0
    if (!Number.isFinite(juros) || juros < 0) return setErro("Juros: escreva só o número, como 2,5.")
    const dia = Number(campos.dia) || 10
    if (dia < 1 || dia > 31) return setErro("O dia do vencimento vai de 1 a 31.")
    setSalvando(true)
    setErro("")
    const ok = await aoSalvar(divida.id, {
      credor: campos.credor.trim(), saldoDevedorCentavos: saldo, jurosMensalBps: juros, parcelaCentavos: campos.parcela ? paraCentavos(campos.parcela) : 0,
      parcelasPagas: Number(campos.pagas) || 0, parcelasTotal: campos.total ? Number(campos.total) : null, diaVencimento: dia,
    })
    setSalvando(false)
    if (ok) setEditando(false)
    else setErro("Não consegui salvar. Confira e tente de novo.")
  }

  const campo = (chave: keyof typeof campos, rotulo: string, modo: "decimal" | "numeric" | "text" = "decimal") => (
    <label className="grid gap-1.5 text-sm text-muted-fg">{rotulo}
      <Input value={campos[chave]} inputMode={modo} onChange={(e) => setCampos({ ...campos, [chave]: e.target.value })} />
    </label>
  )

  const rodapeEdicao = (
    <div className="grid gap-2.5">
      {erro && <p role="alert" className="text-sm text-negativo">{erro}</p>}
      <div className="flex gap-2.5">
        <button type="button" disabled={salvando} onClick={() => void salvar()} className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-full bg-[oklch(var(--primary))] px-5 text-[15.5px] font-bold text-[oklch(var(--primary-foreground))] disabled:opacity-50">{salvando ? "Salvando…" : "Salvar"}</button>
        <button type="button" disabled={salvando} onClick={() => { setEditando(false); setErro("") }} className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-full border border-pauta px-5 text-[15.5px] font-semibold">Cancelar</button>
      </div>
    </div>
  )

  return (
    <FichaPadrao
      aberta
      aoFechar={aoFechar}
      titulo={editando ? "Editar dívida" : divida.credor}
      descricao={editando ? "Mude o que precisar e toque em Salvar. O plano de pagamento se refaz sozinho." : "Toque fora para fechar."}
      aoEditar={() => setEditando(true)}
      aoExcluir={() => aoExcluir(divida)}
      rodape={editando ? rodapeEdicao : undefined}
    >
      {editando ? (
        <div className="grid gap-3">
          {campo("credor", "Para quem você deve", "text")}
          <div className="grid grid-cols-2 gap-3">{campo("saldo", "Saldo a quitar (R$)")}{campo("juros", "Juros ao mês (%)")}</div>
          <div className="grid grid-cols-2 gap-3">{campo("parcela", "Parcela (R$)")}{campo("dia", "Vence dia", "numeric")}</div>
          <div className="grid grid-cols-2 gap-3">{campo("pagas", "Parcelas pagas", "numeric")}{campo("total", "Total de parcelas", "numeric")}</div>
        </div>
      ) : (
        <>
          <div>
            <p className="text-sm text-muted-fg">Saldo a quitar</p>
            <p className="numero valor-sensivel text-[40px] font-light leading-tight tracking-tight">{formatarMoeda(divida.saldoDevedorCentavos)}</p>
          </div>
          <div>
            <LinhaDaFicha rotulo="Juros ao mês">{divida.jurosMensalBps > 0 ? formatarPercentual(divida.jurosMensalBps) : <span className="text-muted-fg">não informado</span>}</LinhaDaFicha>
            <LinhaDaFicha rotulo="Parcela">{divida.parcelaCentavos > 0 ? formatarMoeda(divida.parcelaCentavos) : <span className="text-muted-fg">não informada</span>}</LinhaDaFicha>
            {divida.parcelasTotal ? <LinhaDaFicha rotulo="Parcelas pagas">{divida.parcelasPagas} de {divida.parcelasTotal}</LinhaDaFicha> : null}
            <LinhaDaFicha rotulo="Vence">dia {divida.diaVencimento}</LinhaDaFicha>
          </div>
          <button type="button" onClick={() => void aoSalvar(divida.id, { quitada: true }).then((ok) => ok && aoFechar())}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-pauta text-[15px] font-semibold text-positivo">
            <CheckCircle2 aria-hidden className="size-[18px]" />Já quitei esta dívida
          </button>
        </>
      )}
    </FichaPadrao>
  )
}

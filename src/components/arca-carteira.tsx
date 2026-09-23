"use client"

import { useCallback, useEffect, useState } from "react"
import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { aporteQueReequilibra, corteViraPatrimonio, LETRAS_DO_ARCA, posicaoDoArca, type ClasseDeAtivo } from "@/lib/tino/investir"
import { SelectNative } from "@/components/ui/select-native"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface Objetivo {
  valorMensalCentavos: number
  prazoAnos: number
}

/// Rendimento real (acima da inflação) usado na projeção. Conservador de
/// propósito: é hipótese, não promessa.
const RENDIMENTO_REAL_ANUAL_BPS = 400

/**
 * A carteira lida contra o método ARCA, a partir de um objetivo assumido.
 *
 * Três perguntas na ordem em que alguém que investe as faz: quanto eu separo
 * por mês, onde esse dinheiro entra, e no que isso dá. O objetivo fica gravado
 * porque é decisão, não simulação — quem volta na semana seguinte precisa ver
 * o que assumiu, não um campo vazio.
 *
 * Escrito sob a regra de `docs/PRINCIPIO-DE-TELA.md`: rótulo e número, e o
 * texto que sobra é instrução. A única ressalva que fica é a de cálculo x
 * recomendação — indicar investimento exige registro na CVM.
 */
export function ArcaCarteira({
  carteira,
  contas = [],
}: {
  carteira: { classe: ClasseDeAtivo; valorCentavos: number }[]
  /// Contas de investimento, para escolher onde cada fatia entra.
  contas?: { id: string; nome: string; classeDeAtivo?: string | null }[]
}) {
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null)
  const [rascunho, setRascunho] = useState("")
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")
  // A divisão proposta abre para conferência antes de virar objetivo: é a
  // pessoa que decide onde o dinheiro entra, não a regra.
  const [propondo, setPropondo] = useState<number | null>(null)
  const [destinos, setDestinos] = useState<Record<string, string>>({})

  const carregar = useCallback(async () => {
    try { setObjetivo(await buscar<Objetivo | null>("/api/investir/objetivo")) }
    catch { setErro("Não consegui carregar seu objetivo.") }
  }, [])
  useEffect(() => { void carregar() }, [carregar])

  const { letras, totalCentavos, foraDoMetodoCentavos } = posicaoDoArca(carteira)
  const aporte = objetivo?.valorMensalCentavos ?? 0
  const prazo = objetivo?.prazoAnos ?? 10
  const destino = aporteQueReequilibra(aporte, carteira).filter((parte) => parte.valorCentavos > 0)
  const futuro = corteViraPatrimonio({ cortePorMesCentavos: aporte, anos: prazo, rendimentoRealAnualBps: RENDIMENTO_REAL_ANUAL_BPS })
  const semClasse = carteira.filter((item) => item.classe === "OUTROS").length

  /** O valor digitado abre a proposta; nada é gravado ainda. */
  function propor() {
    const valor = paraCentavos(rascunho)
    if (!Number.isFinite(valor) || valor <= 0) { setErro("Informe um valor."); return }
    setErro("")
    setPropondo(valor)
  }

  async function confirmar() {
    if (propondo === null) return
    setSalvando(true); setErro("")
    try {
      await enviar("/api/investir/objetivo", { valorMensalCentavos: propondo, prazoAnos: prazo }, "PUT")
      setPropondo(null)
      setEditando(false)
      await carregar()
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível salvar.") }
    finally { setSalvando(false) }
  }

  return (
    <section className="rounded-2xl border border-pauta bg-papel-2 p-4 sm:p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold">Separar por mês</h3>
        {objetivo && !editando && (
          <button type="button" className="min-h-11 rounded-xl px-3 text-sm font-medium text-acao hover:bg-papel-2" onClick={() => { setRascunho((aporte / 100).toFixed(2).replace(".", ",")); setEditando(true) }}>
            Alterar valor
          </button>
        )}
      </header>

      {objetivo && !editando ? (
        <>
          <p className="numero mt-1 text-[calc(28px*var(--escala-letra))] font-semibold tracking-tight">{formatarMoeda(aporte)}</p>
          <p className="mt-1 text-xs text-muted-fg">
            Em {prazo} anos: <b className="numero text-foreground">{formatarMoeda(futuro.patrimonioCentavos)}</b>
            {" · "}{formatarMoeda(futuro.jurosCentavos)} de rendimento
          </p>
        </>
      ) : (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="min-w-[140px] flex-1 text-sm">
            <Input
              inputMode="decimal"
              value={rascunho}
              onChange={(evento) => setRascunho(evento.target.value)}
              placeholder="R$ 0,00"
              aria-label="Quanto separar por mês"
            />
          </label>
          <Button disabled={salvando} onClick={propor}>Ver divisão</Button>
          {objetivo && <Button variant="outline" onClick={() => setEditando(false)}>Cancelar</Button>}
        </div>
      )}
      {erro && <p role="alert" className="mt-2 text-xs text-negativo">{erro}</p>}

      {destino.length > 0 && (
        <>
          <h4 className="mt-5 border-t border-pauta pt-4 text-sm font-medium">Onde entra</h4>
          <ul className="mt-2 grid gap-1.5">
            {destino.map((parte) => (
              <li key={parte.rotulo} className="flex items-baseline justify-between gap-3 text-sm">
                <span>{parte.rotulo}</span>
                <span className="numero font-medium">{formatarMoeda(parte.valorCentavos)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {totalCentavos > 0 && (
        <>
          <h4 className="mt-5 border-t border-pauta pt-4 text-sm font-medium">Sua carteira hoje</h4>
          <ul className="mt-2 grid gap-3">
            {letras.map((letra) => {
              const atual = letra.atualBps / 100
              const pontos = Math.round(atual - letra.alvoBps / 100)
              return (
                <li key={letra.rotulo}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-sm">{letra.rotulo}</span>
                    <span className="numero text-sm">
                      {formatarMoeda(letra.atualCentavos)}
                      <span className="ml-2 text-muted-fg">{atual.toFixed(0)}%</span>
                      {pontos !== 0 && (
                        <span className={pontos < 0 ? "ml-2 text-negativo" : "ml-2 text-positivo"}>
                          {pontos > 0 ? "+" : "−"}{Math.abs(pontos)} p.p.
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="relative mt-1.5 h-1.5 rounded-full bg-papel-3">
                    <span className="absolute inset-y-0 left-0 rounded-full bg-acao" style={{ width: `${Math.min(100, atual)}%` }} />
                    <span aria-hidden className="absolute inset-y-[-3px] w-px bg-[color:var(--texto-2)]" style={{ left: `${letra.alvoBps / 100}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <Dialog open={propondo !== null} onOpenChange={(aberto) => { if (!aberto && !salvando) setPropondo(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Onde entra {formatarMoeda(propondo ?? 0)}</DialogTitle>
            <DialogDescription>Pelo ARCA, com a sua carteira de hoje. Mude o destino se quiser.</DialogDescription>
          </DialogHeader>

          <ul className="grid gap-2">
            {aporteQueReequilibra(propondo ?? 0, carteira).filter((parte) => parte.valorCentavos > 0).map((parte) => {
              const classes = LETRAS_DO_ARCA.find((letra) => letra.rotulo === parte.rotulo)?.classes ?? []
              const candidatas = contas.filter((conta) => classes.includes((conta.classeDeAtivo ?? "") as ClasseDeAtivo))
              return (
                <li key={parte.rotulo} className="rounded-2xl border border-pauta bg-papel-2 p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">{parte.rotulo}</span>
                    <span className="numero text-sm font-semibold">{formatarMoeda(parte.valorCentavos)}</span>
                  </div>
                  {candidatas.length > 0 ? (
                    <SelectNative
                      aria-label={`Onde aplicar a parte de ${parte.rotulo}`}
                      className="mt-2"
                      value={destinos[parte.rotulo] ?? candidatas[0]?.id ?? ""}
                      onChange={(evento) => setDestinos((atual) => ({ ...atual, [parte.rotulo]: evento.target.value }))}
                    >
                      {candidatas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}
                    </SelectNative>
                  ) : (
                    <p className="mt-1 text-xs text-muted-fg">Sem investimento cadastrado nesta classe.</p>
                  )}
                </li>
              )
            })}
          </ul>

          {erro && <p role="alert" className="text-xs text-negativo">{erro}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPropondo(null)} disabled={salvando}>Mudar</Button>
            <Button onClick={() => void confirmar()} disabled={salvando}>{salvando ? "Salvando…" : "Confirmar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <footer className="mt-4 flex flex-wrap gap-x-3 text-xs text-muted-fg">
        <span>Cálculo, não recomendação.</span>
        <span>ARCA, de Thiago Nigro.</span>
        <span>{RENDIMENTO_REAL_ANUAL_BPS / 100}% ao ano acima da inflação.</span>
        {foraDoMetodoCentavos > 0 && <span>{formatarMoeda(foraDoMetodoCentavos)} fora do método.</span>}
        {semClasse > 0 && <span>{semClasse} sem classe.</span>}
      </footer>
    </section>
  )
}

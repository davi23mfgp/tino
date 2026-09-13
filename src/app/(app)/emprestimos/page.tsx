"use client"

import estilos from "../analise/avancadas.module.css"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, formatarPercentual, paraCentavos } from "@/lib/dinheiro"
import { Cartao, Metrica, Vazio } from "@/components/ui/painel"
import { cn } from "@/lib/utils"

/**
 * Decisão de empréstimo.
 *
 * O número que decide não é a taxa anunciada, é o CET: ele inclui IOF, tarifa e
 * seguro, que é justamente onde a diferença entre duas propostas aparece. Por
 * isso o CET fica em destaque e a taxa nominal só como referência.
 */

interface Linha {
  parcela: number
  jurosCentavos: number
  amortizacaoCentavos: number
  prestacaoCentavos: number
  saldoCentavos: number
}

interface Analise {
  parcelaCentavos: number
  totalPagoCentavos: number
  totalJurosCentavos: number
  cetMensalBps: number
  cetAnualBps: number
  liberadoCentavos: number
  comprometimentoBps: number
  veredito: "APROVAR" | "CUIDADO" | "EVITAR"
  motivos: string[]
  alternativas: string[]
  tabela: Linha[]
}

interface Simulacao {
  id: string
  titulo: string
  valorCentavos: number
  parcelas: number
  jurosMensalBps: number
  veredito: string | null
  resultado: { parcelaCentavos: number; cetMensalBps: number; totalJurosCentavos: number }
  criadoEm: string
}

const VEREDITO = {
  APROVAR: { texto: "Cabe no seu orçamento", tom: "text-positivo", borda: "border-positivo/40 bg-positivo/10" },
  CUIDADO: { texto: "Dá, mas aperta", tom: "text-atencao", borda: "border-atencao/40 bg-atencao/10" },
  EVITAR: { texto: "Não recomendo", tom: "text-negativo", borda: "border-negativo/40 bg-negativo/10" },
}

const campo = "w-full rounded-[var(--raio-campo)] border border-pauta bg-background px-3.5 py-2.5 text-[13px] outline-none focus:border-acao/50"

export default function Emprestimos() {
  const [valor, setValor] = useState("")
  const [parcelas, setParcelas] = useState("12")
  const [juros, setJuros] = useState("2,5")
  const [custos, setCustos] = useState("")
  const [titulo, setTitulo] = useState("")
  const [analise, setAnalise] = useState<Analise | null>(null)
  const [salvas, setSalvas] = useState<Simulacao[]>([])
  const [verTabela, setVerTabela] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    buscar<Simulacao[]>("/api/emprestimos").then(setSalvas).catch(() => setSalvas([]))
  }, [])

  async function simular(salvar = false) {
    if (!valor) return
    setOcupado(true)
    setErro(null)

    try {
      const resposta = await enviar<Analise>("/api/emprestimos", {
        titulo: titulo || undefined,
        valorCentavos: paraCentavos(valor),
        parcelas: Number(parcelas) || 12,
        jurosMensalBps: Math.round(Number(juros.replace(",", ".")) * 100),
        custosExtrasCentavos: custos ? paraCentavos(custos) : 0,
        salvar,
      })
      setAnalise(resposta)
      if (salvar) setSalvas(await buscar<Simulacao[]>("/api/emprestimos"))
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não consegui simular.")
    } finally {
      setOcupado(false)
    }
  }

  const parecer = analise ? VEREDITO[analise.veredito] : null

  return (
    <div className={cn(estilos.pagina, "space-y-4")}>
      <Cartao titulo="Vale a pena esse empréstimo?">
        <p className="text-[13px] leading-relaxed text-muted-fg">
          Veja quanto recebe, quanto devolve e o impacto na renda.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5">
            <span className="text-[11px] uppercase tracking-widest text-muted-fg">Valor</span>
            <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="10.000,00" className={campo} inputMode="decimal" />
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] uppercase tracking-widest text-muted-fg">Parcelas</span>
            <input value={parcelas} onChange={(e) => setParcelas(e.target.value)} placeholder="24" className={campo} inputMode="numeric" />
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] uppercase tracking-widest text-muted-fg">Juros % ao mês</span>
            <input value={juros} onChange={(e) => setJuros(e.target.value)} placeholder="2,5" className={campo} inputMode="decimal" />
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] uppercase tracking-widest text-muted-fg">IOF e tarifas</span>
            <input value={custos} onChange={(e) => setCustos(e.target.value)} placeholder="opcional" className={campo} inputMode="decimal" />
          </label>
        </div>

        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          aria-label="Nome da proposta" placeholder="Nome da proposta (opcional)"
          className={cn(campo, "mt-2")}
        />

        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => simular(false)}
            disabled={ocupado || !valor}
            className="rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground disabled:opacity-40"
          >
            {ocupado ? "Calculando…" : "Simular"}
          </Button>
          {analise && (
            <Button
              onClick={() => simular(true)}
              disabled={ocupado}
              className="rounded-full border border-pauta px-4 py-2.5 text-[13px] text-muted-fg transition hover:text-foreground"
            >
              guardar para comparar
            </Button>
          )}
        </div>

        {erro && <p className="mt-3 text-[13px] text-negativo">{erro}</p>}
      </Cartao>

      {analise && parecer && (
        <>
          <Cartao titulo="O custo completo">
            <div className="grade-valores mb-4">
              <Metrica rotulo="Você recebe" valor={formatarMoeda(analise.liberadoCentavos)} />
              <Metrica rotulo="Você devolve" valor={formatarMoeda(analise.totalPagoCentavos)} detalhe={"Em " + analise.tabela.length + " parcelas"} />
              <Metrica rotulo="Custo além do recebido" valor={formatarMoeda(analise.totalPagoCentavos - analise.liberadoCentavos)} detalhe="Diferença entre receber e devolver" />
            </div>
            <div className={cn("rounded-2xl border p-4", parecer.borda)}>
              <p className={cn("text-[15px] font-semibold", parecer.tom)}>{parecer.texto}</p>
              <ul className="mt-2 space-y-1.5">
                {analise.motivos.map((motivo) => (
                  <li key={motivo} className="text-[13px] leading-relaxed">
                    {motivo}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 grade-valores">
              <Metrica rotulo="Parcela" valor={formatarMoeda(analise.parcelaCentavos)} />
              <Metrica
                rotulo="CET ao mês"
                valor={formatarPercentual(analise.cetMensalBps)}
                detalhe={`${formatarPercentual(analise.cetAnualBps)} ao ano`}
                tom={analise.cetMensalBps > 500 ? "negativo" : analise.cetMensalBps > 250 ? "atencao" : "neutro"}
              />
              <Metrica rotulo="Total de juros" valor={formatarMoeda(analise.totalJurosCentavos)} tom="atencao" />
              <Metrica
                rotulo="Renda comprometida"
                valor={`${(analise.comprometimentoBps / 100).toFixed(0)}%`}
                detalhe="da sua renda, com as dívidas atuais"
                tom={analise.comprometimentoBps > 3000 ? "negativo" : "neutro"}
              />
            </div>

            <p className="mt-3 text-[12px] text-muted-fg">
              Você recebe <span className="valor-inteiro">{formatarMoeda(analise.liberadoCentavos)}</span> e devolve{" "}
              <span className="valor-inteiro">{formatarMoeda(analise.totalPagoCentavos)}</span> ao longo de {analise.tabela.length} meses.
            </p>

            {analise.alternativas.length > 0 && (
              <div className="mt-4 rounded-[var(--raio-cartao)] border border-pauta p-3.5">
                <p className="text-[11px] uppercase tracking-widest text-muted-fg">Antes de assinar</p>
                <ul className="mt-2 space-y-1.5">
                  {analise.alternativas.map((alternativa) => (
                    <li key={alternativa} className="text-[13px] leading-relaxed">
                      {alternativa}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Cartao>

          <Cartao
            titulo="Como a dívida evolui"
            acao={
              <Button onClick={() => setVerTabela((atual) => !atual)}>
                {verTabela ? "esconder" : "ver todas as parcelas"}
              </Button>
            }
          >
            <div className="space-y-1.5">
              {(verTabela ? analise.tabela : analise.tabela.slice(0, 6)).map((linha) => (
                <div key={linha.parcela} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-b border-pauta py-3 text-[12px] sm:grid-cols-[2rem_minmax(0,1fr)_auto_auto]">
                  <span className="w-8 shrink-0 text-muted-fg">{linha.parcela}ª</span>
                  <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-foreground/[0.06]">
                    {/* Juros em laranja, amortização em verde: mostra de relance
                        quanto de cada parcela some sem abater a dívida. */}
                    {/* Math.max evita divisão por zero: prestação zerada
                        renderizaria width "NaN%" e quebraria a barra. */}
                    <div
                      className="h-full bg-atencao"
                      style={{ width: `${(linha.jurosCentavos / Math.max(1, linha.prestacaoCentavos)) * 100}%` }}
                    />
                    <div
                      className="h-full bg-positivo"
                      style={{ width: `${(linha.amortizacaoCentavos / Math.max(1, linha.prestacaoCentavos)) * 100}%` }}
                    />
                  </div>
                  <span className="whitespace-nowrap text-right tabular-nums text-muted-fg">
                    Juros <span className="valor-inteiro">{formatarMoeda(linha.jurosCentavos)}</span>
                  </span>
                  <span className="whitespace-nowrap text-right tabular-nums">Resta <span className="valor-inteiro">{formatarMoeda(linha.saldoCentavos)}</span></span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-fg">
              Cada linha mostra juros pagos e saldo restante.
            </p>
          </Cartao>
        </>
      )}

      {salvas.length > 0 && (
        <Cartao titulo="Propostas guardadas">
          <div className="space-y-2">
            {salvas.map((simulacao) => (
              <div key={simulacao.id} className="flex flex-wrap items-center gap-3 rounded-[var(--raio-cartao)] border border-pauta p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px]">{simulacao.titulo}</p>
                  <p className="text-[11px] text-muted-fg">
                    <span className="valor-inteiro">{formatarMoeda(simulacao.valorCentavos)}</span> em {simulacao.parcelas}x ·{" "}
                    {formatarPercentual(simulacao.jurosMensalBps)} a.m. nominal
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] tabular-nums"><span className="valor-inteiro">{formatarMoeda(simulacao.resultado.parcelaCentavos)}</span>/mês</p>
                  <p className="text-[11px] text-muted-fg">
                    CET {formatarPercentual(simulacao.resultado.cetMensalBps)} a.m.
                  </p>
                </div>
                {simulacao.veredito && (
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px]",
                      VEREDITO[simulacao.veredito as keyof typeof VEREDITO]?.borda,
                      VEREDITO[simulacao.veredito as keyof typeof VEREDITO]?.tom,
                    )}
                  >
                    {VEREDITO[simulacao.veredito as keyof typeof VEREDITO]?.texto}
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-muted-fg">
            Guarde as propostas de bancos diferentes e compare pelo CET, não pela taxa anunciada.
          </p>
        </Cartao>
      )}

      {!analise && salvas.length === 0 && (
        <Cartao>
          <Vazio
            titulo="Nenhuma simulação ainda"
            texto="Preencha a proposta acima para conhecer o custo total."
          />
        </Cartao>
      )}
    </div>
  )
}

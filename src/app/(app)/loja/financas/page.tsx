"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, formatarPercentual } from "@/lib/dinheiro"
import { TrilhaLoja } from "@/components/trilha-loja"
import { Input } from "@/components/ui/input"
import { showToast } from "@/components/ui/toast"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import estilos from "./financas.module.css"

/**
 * Finanças da loja — H2 do canvas (Davi, 29/09/2026): a conta do período em
 * quatro quadros grandes, o gráfico das vendas contra o empate e seis
 * indicadores menores (ticket médio, vendas feitas, maquininha, o que ainda vai
 * cair, fiado na rua e a maior conta). Cada número vem com o do período
 * anterior do mesmo tamanho: sozinho, nenhum deles diz se o mês foi bom.
 *
 * DRE só da empresa — nunca lê conta nem transação pessoal do dono (ver
 * `src/lib/loja/demonstrativo.ts`).
 */

interface Indicadores {
  brutoCentavos: number
  taxasCentavos: number
  receitaLiquidaCentavos: number
  cmvCentavos: number
  despesasCentavos: number
  lucroCentavos: number
  pecasSemCusto: number
  vendas: number
  ticketMedioCentavos: number | null
  sobraBps: number | null
  empateCentavos: number | null
  cartaoSemTaxa: number
  maiorConta: { descricao: string; valorCentavos: number } | null
}

interface Resposta {
  dias: number
  hoje: string
  de: string
  deAnterior: string
  ateAnterior: string
  atual: Indicadores & { aReceberCentavos: number; fiadoCentavos: number }
  anterior: Indicadores
  serie: number[]
}

const JANELAS = [
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
  { dias: 365, rotulo: "12 meses" },
]

const ddmm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`
const comSinal = (centavos: number) => `${centavos < 0 ? "−" : centavos > 0 ? "+" : ""}${formatarMoeda(Math.abs(centavos))}`
const menos = (centavos: number) => (centavos === 0 ? formatarMoeda(0) : `−${formatarMoeda(centavos)}`)
const pct = (bps: number | null) => (bps === null ? "sem dado" : formatarPercentual(bps, bps % 100 === 0 ? 0 : 1))

/** Seta da comparação: verde quando melhorou, vermelha quando piorou. */
function Antes({ atual, anterior, texto, maiorEhMelhor = true }: { atual: number | null; anterior: number | null; texto: string; maiorEhMelhor?: boolean }) {
  if (anterior === null || atual === null) return <small>sem período anterior para comparar</small>
  const diferenca = atual - anterior
  const tom = diferenca === 0 ? undefined : diferenca > 0 === maiorEhMelhor ? "bom" : "ruim"
  return (
    <small>
      {diferenca !== 0 && <i data-tom={tom}>{diferenca > 0 ? "▲ " : "▼ "}</i>}
      antes {texto}
    </small>
  )
}

function Grafico({ serie, empate }: { serie: number[]; empate: number | null }) {
  const total = serie[serie.length - 1] ?? 0
  // Escala pela maior das duas pontas, com folga no alto para o rótulo.
  const escala = Math.max(total, empate ?? 0, 1) / 0.9
  const y = (valor: number) => 100 - (valor / escala) * 100
  const passo = serie.length > 1 ? 100 / (serie.length - 1) : 100
  const pontos = serie.map((valor, indice) => `${(indice * passo).toFixed(2)},${y(valor).toFixed(2)}`).join(" ")
  return (
    <div className={estilos.grafico}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Vendas acumuladas: ${formatarMoeda(total)}${empate ? `; empate em ${formatarMoeda(empate)}` : ""}`}>
        <defs>
          <linearGradient id="area-vendas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity=".16" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {empate !== null && empate > 0 && (
          <line x1="0" y1="100" x2="100" y2={y(empate)} stroke="currentColor" strokeOpacity=".4" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        )}
        <polygon points={`0,100 ${pontos} 100,100`} fill="url(#area-vendas)" />
        <polyline points={pontos} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {empate !== null && empate > 0 && <small>empate {formatarMoeda(empate)}</small>}
    </div>
  )
}

/** Valor em reais com os centavos menores, como no desenho. */
function Reais({ centavos, sinal = "" }: { centavos: number; sinal?: string }) {
  const texto = formatarMoeda(Math.abs(centavos))
  const virgula = texto.lastIndexOf(",")
  return (
    <>
      {sinal}
      {texto.slice(0, virgula)}
      <span>{texto.slice(virgula)}</span>
    </>
  )
}

function Quadro({ rotulo, children, apoio, tom, grande }: { rotulo: string; children: React.ReactNode; apoio?: React.ReactNode; tom?: "negativo" | "positivo"; grande?: boolean }) {
  return (
    <section className={`${estilos.bloco} ${estilos.quadro}`} data-grande={grande ? "" : undefined}>
      <span className={estilos.rotulo}>{rotulo}</span>
      <strong className={estilos.numero} data-tom={tom}>
        {children}
      </strong>
      {apoio}
    </section>
  )
}

export default function FinancasDaLoja() {
  const [dias, setDias] = useState(30)
  const [dados, setDados] = useState<Resposta | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [taxas, setTaxas] = useState(false)

  const carregar = useCallback(async () => {
    try {
      setDados(await buscar<Resposta>(`/api/loja/demonstrativo?dias=${dias}`))
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui carregar as finanças da loja.")
    }
  }, [dias])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const atual = dados?.atual
  // Loja que começou agora não tem "antes": comparar com zero mostraria seta de
  // melhora em tudo, o que é número inventado com outra cara.
  const anterior = dados && (dados.anterior.vendas > 0 || dados.anterior.despesasCentavos > 0) ? dados.anterior : null
  const taxaBps = (item?: Indicadores) => (item && item.brutoCentavos > 0 ? Math.round((item.taxasCentavos / item.brutoCentavos) * 10_000) : null)

  let frase: React.ReactNode = null
  if (atual) {
    if (atual.despesasCentavos === 0) frase = "nenhuma conta da loja paga no período"
    else if (atual.empateCentavos === null) frase = "com a sobra de hoje, nenhuma venda cobre as contas"
    else if (atual.brutoCentavos < atual.empateCentavos)
      frase = (
        <>
          faltam <b>{formatarMoeda(atual.empateCentavos - atual.brutoCentavos)}</b> para empatar
        </>
      )
    else
      frase = (
        <>
          passou <b>{formatarMoeda(atual.brutoCentavos - atual.empateCentavos)}</b> do empate
        </>
      )
  }

  const pedacoDasVendas = (centavos: number) => (atual && atual.brutoCentavos > 0 ? `${pct(Math.round((centavos / atual.brutoCentavos) * 10_000))} das vendas` : "sem vendas")

  return (
    <div className={estilos.pagina}>
      <TrilhaLoja pagina="Finanças da loja" />

      <div className={estilos.abas} role="group" aria-label="Período">
        {JANELAS.map((janela) => (
          <button key={janela.dias} type="button" aria-pressed={dias === janela.dias} onClick={() => setDias(janela.dias)}>
            {janela.rotulo}
          </button>
        ))}
      </div>

      {erro && <p className={estilos.erro}>{erro}</p>}

      {atual && dados && (
        <>
          {/* A conta do período em quatro quadros: o resultado e o que o explica. */}
          <div className={estilos.quatro}>
            <Quadro
              grande
              rotulo={atual.lucroCentavos < 0 ? "Prejuízo" : "Lucro"}
              tom={atual.lucroCentavos < 0 ? "negativo" : "positivo"}
              apoio={<Antes atual={atual.lucroCentavos} anterior={anterior?.lucroCentavos ?? null} texto={anterior ? comSinal(anterior.lucroCentavos) : ""} />}
            >
              <Reais centavos={atual.lucroCentavos} sinal={atual.lucroCentavos < 0 ? "−" : ""} />
            </Quadro>
            <Quadro grande rotulo="Sobra de cada venda" apoio={<Antes atual={atual.sobraBps} anterior={anterior?.sobraBps ?? null} texto={pct(anterior?.sobraBps ?? null)} />}>
              {pct(atual.sobraBps)}
            </Quadro>
            <Quadro
              grande
              rotulo="Contas da loja"
              apoio={<Antes atual={atual.despesasCentavos} anterior={anterior?.despesasCentavos ?? null} texto={formatarMoeda(anterior?.despesasCentavos ?? 0)} maiorEhMelhor={false} />}
            >
              <Reais centavos={atual.despesasCentavos} />
            </Quadro>
            <Quadro grande rotulo="Custo das peças" apoio={<small>{pedacoDasVendas(atual.cmvCentavos)}</small>}>
              <Reais centavos={atual.cmvCentavos} />
            </Quadro>
          </div>

          <div className={estilos.meio}>
            <section className={`${estilos.bloco} ${estilos.vendas}`} aria-label="Vendas do período">
              <div>
                <span className={estilos.rotulo}>
                  Vendas · {ddmm(dados.de)} a {ddmm(dados.hoje)}
                </span>
                <strong className={estilos.grande}>
                  <Reais centavos={atual.brutoCentavos} />
                </strong>
                <p className={estilos.frase}>
                  {frase} · <Antes atual={atual.brutoCentavos} anterior={anterior?.brutoCentavos ?? null} texto={formatarMoeda(anterior?.brutoCentavos ?? 0)} />
                </p>
              </div>
              <Grafico serie={dados.serie} empate={atual.empateCentavos} />
              <div className={estilos.eixo}>
                <span>{ddmm(dados.de)}</span>
                <span>hoje</span>
              </div>
            </section>

            <div className={estilos.seis}>
              <Quadro
                rotulo="Ticket médio"
                apoio={
                  <Antes atual={atual.ticketMedioCentavos} anterior={anterior?.ticketMedioCentavos ?? null} texto={anterior?.ticketMedioCentavos ? formatarMoeda(anterior.ticketMedioCentavos) : "sem dado"} />
                }
              >
                {atual.ticketMedioCentavos === null ? "sem venda" : <Reais centavos={atual.ticketMedioCentavos} />}
              </Quadro>
              <Quadro rotulo="Vendas feitas" apoio={<Antes atual={atual.vendas} anterior={anterior?.vendas ?? null} texto={String(anterior?.vendas ?? 0)} />}>
                {atual.vendas}
              </Quadro>
              <Quadro
                rotulo="Maquininha"
                apoio={<Antes atual={taxaBps(atual)} anterior={taxaBps(anterior ?? undefined)} texto={`${pct(taxaBps(anterior ?? undefined))} · ${formatarMoeda(atual.taxasCentavos)}`} maiorEhMelhor={false} />}
              >
                {pct(taxaBps(atual))}
              </Quadro>
              <Quadro rotulo="Ainda vai cair" apoio={<small>cartão já vendido</small>}>
                <Reais centavos={atual.aReceberCentavos} />
              </Quadro>
              <Quadro
                rotulo="Fiado na rua"
                apoio={
                  <small>
                    <Link href="/loja/fiado" className={estilos.link}>
                      ver quem deve
                    </Link>
                  </small>
                }
              >
                <Reais centavos={atual.fiadoCentavos} />
              </Quadro>
              <Quadro rotulo="Maior conta" apoio={<small className={estilos.corte}>{atual.maiorConta?.descricao ?? "nenhuma conta paga"}</small>}>
                {atual.maiorConta && atual.despesasCentavos > 0 ? formatarPercentual(Math.round((atual.maiorConta.valorCentavos / atual.despesasCentavos) * 10_000), 0) : "nenhuma"}
              </Quadro>
            </div>
          </div>

          {(atual.pecasSemCusto > 0 || atual.cartaoSemTaxa > 0) && (
            <div className={estilos.avisos}>
              {atual.cartaoSemTaxa > 0 && (
                <p className={estilos.aviso}>
                  <i aria-hidden />
                  <span>
                    <b>
                      {atual.cartaoSemTaxa} {atual.cartaoSemTaxa === 1 ? "pagamento no cartão entrou" : "pagamentos no cartão entraram"} sem taxa.
                    </b>{" "}
                    A taxa da maquininha não estava cadastrada: o resultado aparece melhor do que é.{" "}
                    <button type="button" onClick={() => setTaxas(true)}>
                      Cadastrar as taxas
                    </button>
                  </span>
                </p>
              )}
              {atual.pecasSemCusto > 0 && (
                <p className={estilos.aviso}>
                  <i aria-hidden />
                  <span>
                    <b>
                      {atual.pecasSemCusto} {atual.pecasSemCusto === 1 ? "peça vendida" : "peças vendidas"} sem custo cadastrado.
                    </b>{" "}
                    Entram como se não tivessem custado nada: o resultado real é pior.{" "}
                    <Link href="/loja/estoque" className={estilos.link}>
                      Abrir a Prateleira
                    </Link>
                  </span>
                </p>
              )}
            </div>
          )}
        </>
      )}

      <button type="button" className={estilos.taxasLink} onClick={() => setTaxas(true)}>
        Taxas da maquininha
      </button>

      <TaxasDaMaquininha aberta={taxas} aoFechar={() => setTaxas(false)} />
    </div>
  )
}

const FORMAS_NO_CARTAO = [
  { forma: "DEBITO", rotulo: "Débito" },
  { forma: "CREDITO_VISTA", rotulo: "Crédito à vista" },
  { forma: "CREDITO_PARCELADO", rotulo: "Crédito parcelado" },
  { forma: "PIX", rotulo: "Pix" },
] as const

/** "1,99" → 199 bps. A pessoa digita a taxa como está no contrato da maquininha. */
function lerTaxa(texto: string): number | null {
  const numero = Number(texto.replace(/\s|%/g, "").replace(",", "."))
  return Number.isFinite(numero) && numero >= 0 && numero < 100 ? Math.round(numero * 100) : null
}

/**
 * A taxa e o prazo de cada forma de pagamento. Existia na API desde a fase 5,
 * mas nenhuma tela gravava: toda venda no cartão entrava com taxa zero e como
 * já recebida no dia. Vale para as próximas vendas; a taxa das antigas fica
 * como foi gravada, de propósito (ver `PagamentoVenda.taxaBps`).
 */
function TaxasDaMaquininha({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const [linhas, setLinhas] = useState<Record<string, { taxa: string; prazo: string }>>({})
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!aberta) return
    buscar<{ regras: { forma: string; taxaBps: number; prazoDias: number }[] }>("/api/loja")
      .then((resposta) => {
        const inicial: Record<string, { taxa: string; prazo: string }> = {}
        for (const { forma } of FORMAS_NO_CARTAO) {
          const regra = resposta.regras.find((item) => item.forma === forma)
          inicial[forma] = { taxa: regra ? (regra.taxaBps / 100).toFixed(2).replace(".", ",") : "", prazo: regra ? String(regra.prazoDias) : "" }
        }
        setLinhas(inicial)
      })
      .catch(() => setErro("Não consegui ler as taxas cadastradas."))
  }, [aberta])

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)
    const regras = []
    for (const { forma, rotulo } of FORMAS_NO_CARTAO) {
      const linha = linhas[forma]
      if (!linha || (linha.taxa === "" && linha.prazo === "")) continue
      const taxaBps = lerTaxa(linha.taxa || "0")
      const prazoDias = Number(linha.prazo || "0")
      if (taxaBps === null || !Number.isInteger(prazoDias) || prazoDias < 0 || prazoDias > 365) {
        setErro(`Confira a taxa e o prazo de ${rotulo.toLowerCase()}.`)
        return
      }
      regras.push({ forma, taxaBps, prazoDias })
    }
    setOcupado(true)
    try {
      await enviar("/api/loja", { regras }, "PUT")
      showToast("Taxas salvas. Valem para as próximas vendas.")
      aoFechar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui salvar.")
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Dialog open={aberta} onOpenChange={(abrir) => !abrir && aoFechar()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Taxas da maquininha</DialogTitle>
          <DialogDescription>Como está no contrato: a taxa de cada forma e em quantos dias o dinheiro cai.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={salvar} className={estilos.form}>
            <div className={`${estilos.forma} ${estilos.cabecalho}`}>
              <span />
              <span>Taxa (%)</span>
              <span>Cai em (dias)</span>
            </div>
            {FORMAS_NO_CARTAO.map(({ forma, rotulo }) => (
              <div key={forma} className={estilos.forma}>
                <span>{rotulo}</span>
                <Input
                  inputMode="decimal"
                  aria-label={`Taxa de ${rotulo}`}
                  placeholder="0,00"
                  value={linhas[forma]?.taxa ?? ""}
                  onChange={(evento) => setLinhas({ ...linhas, [forma]: { ...(linhas[forma] ?? { prazo: "" }), taxa: evento.target.value } })}
                />
                <Input
                  inputMode="numeric"
                  aria-label={`Prazo de ${rotulo}`}
                  placeholder="0"
                  value={linhas[forma]?.prazo ?? ""}
                  onChange={(evento) => setLinhas({ ...linhas, [forma]: { ...(linhas[forma] ?? { taxa: "" }), prazo: evento.target.value } })}
                />
              </div>
            ))}
            <p className={estilos.dica}>Vale para as próximas vendas. As que já foram feitas ficam com a taxa que tinham no dia.</p>
            {erro && <p className={estilos.erro}>{erro}</p>}
            <button type="submit" className={estilos.botao} disabled={ocupado}>
              Salvar taxas
            </button>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

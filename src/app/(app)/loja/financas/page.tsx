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
 * Finanças da loja — G2 do canvas (Davi, 29/09/2026), com os indicadores que
 * ele pediu a mais: sobra de cada venda, ticket médio, taxa da maquininha, o
 * que ainda vai cair e o fiado na rua. Cada número vem com o do período
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
const pct = (bps: number | null) => (bps === null ? "—" : formatarPercentual(bps, bps % 100 === 0 ? 0 : 1))

/** Seta da comparação: verde quando melhorou, vermelha quando piorou. */
function Antes({ atual, anterior, texto, maiorEhMelhor = true }: { atual: number | null; anterior: number | null; texto: string; maiorEhMelhor?: boolean }) {
  if (anterior === null || atual === null) return <small>antes: sem dado</small>
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
  const anterior = dados?.anterior
  const [inteiro, centavos] = (() => {
    const texto = formatarMoeda(atual?.brutoCentavos ?? 0)
    const virgula = texto.lastIndexOf(",")
    return [texto.slice(0, virgula), texto.slice(virgula)]
  })()

  let frase: React.ReactNode = null
  if (atual) {
    if (atual.despesasCentavos === 0) frase = "Nenhuma conta da loja paga no período."
    else if (atual.empateCentavos === null) frase = "Com o que sobra de cada venda hoje, nenhuma venda cobre as contas."
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

  const periodoAnterior = dados ? `${ddmm(dados.deAnterior)} a ${ddmm(dados.ateAnterior)}` : ""
  const taxaBps = (item?: Indicadores) => (item && item.brutoCentavos > 0 ? Math.round((item.taxasCentavos / item.brutoCentavos) * 10_000) : null)

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

      <div className={estilos.grade}>
        <div className={estilos.coluna}>
          <section className={`${estilos.bloco} ${estilos.vendas}`} aria-label="Vendas do período">
            <div>
              <span className={estilos.rotulo}>Vendas{dados ? ` · ${ddmm(dados.de)} a ${ddmm(dados.hoje)}` : ""}</span>
              <strong className={estilos.grande}>
                {inteiro}
                <span>{centavos}</span>
              </strong>
              {frase && <p className={estilos.frase}>{frase}</p>}
            </div>
            {dados && <Grafico serie={dados.serie} empate={atual?.empateCentavos ?? null} />}
            {dados && (
              <div className={estilos.eixo}>
                <span>{ddmm(dados.de)}</span>
                <span>hoje</span>
              </div>
            )}
          </section>

          {atual && (atual.pecasSemCusto > 0 || atual.cartaoSemTaxa > 0) && (
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
        </div>

        <div className={estilos.coluna}>
          {atual && anterior && (
            <section className={`${estilos.bloco} ${estilos.secao}`} aria-labelledby="titulo-resultado">
              <h2 id="titulo-resultado">Resultado</h2>
              <div className={estilos.linha}>
                <span>Vendas</span>
                <span className={estilos.valor}>{formatarMoeda(atual.brutoCentavos)}</span>
              </div>
              <div className={estilos.linha}>
                <span>Maquininha</span>
                <span className={estilos.valor}>{menos(atual.taxasCentavos)}</span>
              </div>
              <div className={estilos.linha}>
                <span>Custo das peças</span>
                <span className={estilos.valor}>{menos(atual.cmvCentavos)}</span>
              </div>
              <div className={estilos.linha}>
                <span>Contas da loja</span>
                <span className={estilos.valor}>{menos(atual.despesasCentavos)}</span>
              </div>
              <div className={estilos.linha} data-forte>
                <span>{atual.lucroCentavos < 0 ? "Prejuízo" : "Lucro"}</span>
                <span className={estilos.valor}>
                  <span className={atual.lucroCentavos < 0 ? estilos.negativo : estilos.positivo}>{comSinal(atual.lucroCentavos)}</span>
                  <Antes atual={atual.lucroCentavos} anterior={anterior.lucroCentavos} texto={`${comSinal(anterior.lucroCentavos)} (${periodoAnterior})`} />
                </span>
              </div>
            </section>
          )}

          {atual && anterior && (
            <section className={`${estilos.bloco} ${estilos.secao}`} aria-labelledby="titulo-indicadores">
              <h2 id="titulo-indicadores">Indicadores</h2>
              <div className={estilos.linha}>
                <span>Sobra de cada venda</span>
                <span className={estilos.valor}>
                  {pct(atual.sobraBps)}
                  <Antes atual={atual.sobraBps} anterior={anterior.sobraBps} texto={pct(anterior.sobraBps)} />
                </span>
              </div>
              <div className={estilos.linha}>
                <span>Ticket médio</span>
                <span className={estilos.valor}>
                  {atual.ticketMedioCentavos === null ? "—" : formatarMoeda(atual.ticketMedioCentavos)}
                  <Antes
                    atual={atual.ticketMedioCentavos}
                    anterior={anterior.ticketMedioCentavos}
                    texto={anterior.ticketMedioCentavos === null ? "—" : formatarMoeda(anterior.ticketMedioCentavos)}
                  />
                </span>
              </div>
              <div className={estilos.linha}>
                <span>Número de vendas</span>
                <span className={estilos.valor}>
                  {atual.vendas}
                  <Antes atual={atual.vendas} anterior={anterior.vendas} texto={String(anterior.vendas)} />
                </span>
              </div>
              <div className={estilos.linha}>
                <span>Maquininha</span>
                <span className={estilos.valor}>
                  {pct(taxaBps(atual))} das vendas
                  <Antes atual={taxaBps(atual)} anterior={taxaBps(anterior)} texto={pct(taxaBps(anterior))} maiorEhMelhor={false} />
                </span>
              </div>
              {atual.maiorConta && atual.despesasCentavos > 0 && (
                <div className={estilos.linha}>
                  <span>Maior conta</span>
                  <span className={estilos.valor}>
                    {atual.maiorConta.descricao}
                    <small>{formatarPercentual(Math.round((atual.maiorConta.valorCentavos / atual.despesasCentavos) * 10_000), 0)} das contas</small>
                  </span>
                </div>
              )}
              <div className={estilos.linha}>
                <span>Ainda vai cair</span>
                <span className={estilos.valor}>
                  {formatarMoeda(atual.aReceberCentavos)}
                  <small>cartão já vendido</small>
                </span>
              </div>
              <div className={estilos.linha}>
                <span>Fiado na rua</span>
                <span className={estilos.valor}>
                  {formatarMoeda(atual.fiadoCentavos)}
                  <small>
                    <Link href="/loja/fiado" className={estilos.link}>
                      ver quem deve
                    </Link>
                  </small>
                </span>
              </div>
            </section>
          )}

          <button type="button" className={estilos.taxasLink} onClick={() => setTaxas(true)}>
            Taxas da maquininha
          </button>
        </div>
      </div>

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

"use client"
import { useCallback, useEffect, useState } from "react"
import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { Vazio } from "@/components/ui/painel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SelectNative } from "@/components/ui/select-native"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import type { IndicadorDoMercado, Periodo, SerieDeAtivo } from "@/lib/mercado"
import { CLASSES, type ClasseDeAtivo } from "@/lib/tino/investir"
import { PainelDaCarteira } from "@/components/painel-da-carteira"
import { CartoesDeAtivos, MercadoAgora } from "@/components/mercado"

interface RespostaDoMercado {
  ativos: SerieDeAtivo[]
  indices: IndicadorDoMercado[]
  dolar: number | null
  atualizadoEm: string
}

interface Conta {
  id: string
  nome: string
  instituicao: string | null
  tipo: string
  saldoCentavos: number
  ticker?: string | null
  quantidadeMilesimos?: number | null
  classeDeAtivo?: string | null
}

export function CarteiraInvestimentos() {
  const [contas, setContas] = useState<Conta[]>([])
  const [mercado, setMercado] = useState<RespostaDoMercado | null>(null)
  const [periodo, setPeriodo] = useState<Periodo>("1mo")
  const [atualizando, setAtualizando] = useState(true)
  const [abrir, setAbrir] = useState(false)
  const [movimento, setMovimento] = useState<Conta | null>(null)
  const [erro, setErro] = useState("")
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(async () => {
    try { setContas(await buscar<Conta[]>("/api/contas")) }
    catch { setErro("Não foi possível carregar os investimentos.") }
  }, [])
  useEffect(() => { void carregar() }, [carregar])

  const ativos = contas.filter((conta) => conta.tipo === "INVESTIMENTO")
  const origens = contas.filter((conta) => !["CARTAO_CREDITO", "INVESTIMENTO"].includes(conta.tipo))
  const tickers = ativos.map((conta) => conta.ticker?.trim().toUpperCase()).filter(Boolean).join(",")

  // Cotações, histórico do período e o mercado do dia numa chamada só. Chega
  // sozinha ao abrir a tela e ao trocar o período; a resposta de um período
  // antigo que chegue atrasada é descartada.
  useEffect(() => {
    let valendo = true
    setAtualizando(true)
    buscar<RespostaDoMercado>(`/api/mercado?tickers=${encodeURIComponent(tickers)}&periodo=${periodo}`)
      .then((resposta) => { if (valendo) setMercado(resposta) })
      .catch(() => { /* sem mercado a tela mostra os valores cadastrados */ })
      .finally(() => { if (valendo) setAtualizando(false) })
    return () => { valendo = false }
  }, [tickers, periodo])

  const series = mercado?.ativos ?? []
  const serieDe = (conta: Conta) => series.find((linha) => linha.ticker === conta.ticker?.trim().toUpperCase())

  /**
   * Valor de mercado em reais. Ativo cotado em dólar só vira reais com o
   * câmbio do dia; sem câmbio, fica no valor cadastrado — supor um dólar
   * seria inventar o número.
   */
  function mercadoDe(conta: Conta): number | null {
    const serie = serieDe(conta)
    if (!serie || !conta.quantidadeMilesimos) return null
    const cambio = serie.moeda === "BRL" ? 1 : serie.moeda === "USD" ? mercado?.dolar ?? null : null
    if (cambio === null) return null
    return Math.round(((serie.preco * conta.quantidadeMilesimos) / 1000) * cambio * 100)
  }

  /**
   * Sem a classe, o investimento não entra em nenhuma letra do ARCA — a conta
   * do método simplesmente não o enxerga. Por isso a escolha fica no cartão do
   * ativo, e não escondida numa tela de edição.
   */
  async function classificar(contaId: string, classe: string) {
    try {
      await enviar(`/api/contas/${contaId}`, { classeDeAtivo: classe || null }, "PATCH")
      await carregar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar a classe.")
    }
  }

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const dados = new FormData(evento.currentTarget)
    setOcupado(true); setErro("")
    try {
      if (movimento) {
        const retirada = dados.get("direcao") === "resgate"
        await enviar("/api/transacoes", {
          contaId: retirada ? movimento.id : dados.get("conta"),
          contaDestinoId: retirada ? dados.get("conta") : movimento.id,
          tipo: "TRANSFERENCIA",
          valorCentavos: paraCentavos(String(dados.get("valor"))),
          descricao: `${retirada ? "Resgate" : "Aporte"} — ${movimento.nome}`,
          data: new Date().toISOString().slice(0, 10),
        })
      } else {
        const quantidade = String(dados.get("quantidade") ?? "").replace(",", ".")
        const quantidadeMilesimos = quantidade.trim() ? Math.round(Number(quantidade) * 1000) : undefined
        await enviar("/api/contas", {
          nome: dados.get("nome"),
          instituicao: dados.get("instituicao"),
          tipo: "INVESTIMENTO",
          saldoInicialCentavos: paraCentavos(String(dados.get("valor"))),
          ticker: String(dados.get("ticker") ?? "").trim() || undefined,
          classeDeAtivo: String(dados.get("classeDeAtivo") ?? "") || undefined,
          quantidadeMilesimos: Number.isFinite(quantidadeMilesimos) ? quantidadeMilesimos : undefined,
        })
      }
      setAbrir(false); setMovimento(null); await carregar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar.")
    } finally { setOcupado(false) }
  }

  const cadastrar = <Button onClick={() => setAbrir(true)}>Cadastrar</Button>

  const cartoes = (
    <CartoesDeAtivos
      ativos={ativos.map((conta) => ({
        id: conta.id,
        nome: conta.nome,
        instituicao: conta.instituicao,
        classe: (conta.classeDeAtivo as ClasseDeAtivo | null) ?? null,
        ticker: conta.ticker ?? null,
        quantidadeMilesimos: conta.quantidadeMilesimos ?? null,
        valorCentavos: mercadoDe(conta) ?? conta.saldoCentavos,
        aportadoCentavos: conta.saldoCentavos,
      }))}
      series={series}
      dolar={mercado?.dolar ?? null}
      periodo={periodo}
      aoMudarPeriodo={setPeriodo}
      carregando={atualizando}
      aoAbrir={(id) => {
        const conta = ativos.find((linha) => linha.id === id)
        if (conta) {
          setMovimento(conta)
          setAbrir(true)
        }
      }}
    />
  )

  // Blocos soltos, e não um cartão com tudo dentro: o mercado, o resumo, os
  // ativos e o próximo aporte respondem perguntas diferentes (Davi, 23/09).
  return (
    <div className="grid items-start gap-3 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <MercadoAgora indices={mercado?.indices ?? []} atualizadoEm={mercado?.atualizadoEm ?? null} carregando={atualizando} />
      </div>

      {ativos.length > 0 ? (
        <PainelDaCarteira
          acao={cadastrar}
          depoisDoResumo={cartoes}
          posicoes={ativos.map((conta) => ({
            id: conta.id,
            nome: conta.nome,
            classe: (conta.classeDeAtivo as ClasseDeAtivo | null) ?? null,
            valorCentavos: mercadoDe(conta) ?? conta.saldoCentavos,
            aportadoCentavos: conta.saldoCentavos,
            ticker: conta.ticker,
            variacaoPercentual: serieDe(conta)?.variacaoPercentual ?? null,
          }))}
        />
      ) : (
        <section className="ficha grid gap-2 rounded-[var(--raio-bloco)] p-5 lg:col-span-2">
          <Vazio titulo="Cadastre o que você já investe" texto="Use o nome do ativo ou da aplicação. Com o código na bolsa (PETR4, AAPL) e a quantidade, o preço e o gráfico entram sozinhos." />
          <div className="flex justify-center">{cadastrar}</div>
        </section>
      )}

      {erro && !abrir && <p role="alert" className="text-negativo lg:col-span-2">{erro}</p>}

      <Dialog open={abrir} onOpenChange={(aberto) => { if (!ocupado) { setAbrir(aberto); if (!aberto) setMovimento(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{movimento ? movimento.nome : "Novo investimento"}</DialogTitle>
            <DialogDescription>{movimento ? "Movimente entre a carteira e sua conta." : "Informe o valor que já possui nessa aplicação."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-4">
            {movimento ? (
              <>
                <label className="block text-sm">Movimento<SelectNative name="direcao"><option value="aporte">Aporte</option><option value="resgate">Resgate</option></SelectNative></label>
                <label className="block text-sm">Conta de origem ou destino<SelectNative name="conta" required><option value="">Escolha uma conta</option>{origens.map((conta) => <option value={conta.id} key={conta.id}>{conta.nome}</option>)}</SelectNative></label>
              </>
            ) : (
              <>
                <label className="block text-sm">Investimento<Input name="nome" required placeholder="Ex.: CDB, Tesouro, fundo ou ação" /></label>
                <label className="block text-sm">Banco ou corretora<Input name="instituicao" /></label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">Código na bolsa<Input name="ticker" placeholder="Ex.: PETR4" autoCapitalize="characters" /></label>
                  <label className="block text-sm">Quantidade<Input name="quantidade" inputMode="decimal" placeholder="Ex.: 100" /></label>
                </div>
                <label className="block text-sm">Classe na carteira<SelectNative name="classeDeAtivo"><option value="">Escolher depois</option>{CLASSES.map((linha) => <option key={linha.classe} value={linha.classe}>{linha.rotulo} — {linha.explicacao}</option>)}</SelectNative></label>
                <p className="text-xs text-muted-fg">Com código e quantidade, o preço do dia entra sozinho e a carteira mostra o valor de mercado. Sem eles, vale o valor que você informar.</p>
              </>
            )}
            <label className="block text-sm">Valor {movimento ? "" : "já aplicado "}(R$)<Input name="valor" required inputMode="decimal" /></label>
            {erro && <p role="alert" className="text-negativo">{erro}</p>}
            <Button disabled={ocupado} type="submit">{ocupado ? "Salvando…" : "Salvar"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"
import { useCallback, useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { Cartao, Vazio } from "@/components/ui/painel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SelectNative } from "@/components/ui/select-native"
import { IdentidadeBanco } from "@/components/banco-perfil"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import type { PrecoDeAtivo } from "@/lib/cotacoes"
import { ArcaCarteira } from "@/components/arca-carteira"
import { CLASSES, type ClasseDeAtivo } from "@/lib/tino/investir"

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
  const [precos, setPrecos] = useState<PrecoDeAtivo[]>([])
  const [atualizando, setAtualizando] = useState(false)
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
  const comTicker = ativos.filter((conta) => conta.ticker && conta.quantidadeMilesimos)

  // As cotações chegam sozinhas quando há posição cadastrada. Antes a tela
  // avisava que "cotações não são atualizadas automaticamente" e deixava o
  // trabalho para a pessoa.
  const atualizarPrecos = useCallback(async () => {
    if (!comTicker.length) return
    setAtualizando(true)
    try { setPrecos(await buscar<PrecoDeAtivo[]>(`/api/cotacoes?tickers=${comTicker.map((c) => c.ticker).join(",")}`)) }
    catch { /* sem preço a tela mostra só o saldo cadastrado */ }
    finally { setAtualizando(false) }
  }, [comTicker.map((c) => c.ticker).join(",")]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void atualizarPrecos() }, [atualizarPrecos])

  function mercadoDe(conta: Conta): number | null {
    const preco = precos.find((linha) => linha.ticker === conta.ticker?.toUpperCase())
    if (!preco || !conta.quantidadeMilesimos) return null
    return Math.round((preco.preco * conta.quantidadeMilesimos) / 1000 * 100)
  }

  const totalCadastrado = ativos.reduce((soma, conta) => soma + conta.saldoCentavos, 0)
  // Cada ativo entra pelo valor de mercado quando existe preço, e pelo saldo
  // cadastrado quando não existe — nunca por uma estimativa.
  const totalHoje = ativos.reduce((soma, conta) => soma + (mercadoDe(conta) ?? conta.saldoCentavos), 0)
  const diferenca = totalHoje - totalCadastrado
  const fonte = precos[0]?.fonte

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

  return (
    <Cartao
      titulo="Sua carteira"
      acao={<Button onClick={() => setAbrir(true)}>Cadastrar investimento</Button>}
    >
      <p className="text-3xl font-semibold tracking-tight">{formatarMoeda(totalHoje)}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-fg">
        {comTicker.length ? (
          <>
            <span>
              Valor de hoje.{" "}
              {diferenca !== 0 && (
                <span className={diferenca > 0 ? "text-positivo" : "text-negativo"}>
                  {diferenca > 0 ? "+" : "−"}{formatarMoeda(Math.abs(diferenca))} sobre o que você aportou.
                </span>
              )}
            </span>
            {fonte && <span className="text-[color:var(--texto-3)]">Fonte: {fonte}</span>}
            <button type="button" onClick={() => void atualizarPrecos()} className="inline-flex items-center gap-1 text-acao" disabled={atualizando}>
              <RefreshCw className={atualizando ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden />
              {atualizando ? "Atualizando…" : "Atualizar agora"}
            </button>
          </>
        ) : (
          <span>Saldo cadastrado e movimentações. Informe o código do ativo para o preço vir sozinho.</span>
        )}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {ativos.map((conta) => {
          const mercado = mercadoDe(conta)
          const preco = precos.find((linha) => linha.ticker === conta.ticker?.toUpperCase())
          return (
            <div key={conta.id} className="rounded-2xl border border-pauta bg-papel-2 p-4">
              <div className="flex items-center gap-3">
                <IdentidadeBanco instituicao={conta.instituicao} />
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{conta.nome}</h3>
                  <p className="text-xs text-muted-fg">
                    {conta.ticker ? `${conta.ticker}${conta.quantidadeMilesimos ? ` · ${(conta.quantidadeMilesimos / 1000).toLocaleString("pt-BR")} cotas` : ""}` : conta.instituicao ?? "Instituição não informada"}
                  </p>
                </div>
              </div>
              <p className="my-3 text-xl font-semibold">{formatarMoeda(mercado ?? conta.saldoCentavos)}</p>
              {mercado !== null && preco && (
                <p className="mb-3 text-xs text-muted-fg">
                  R$ {preco.preco.toFixed(2).replace(".", ",")} por cota
                  {preco.variacaoPercentual !== null && (
                    <span className={preco.variacaoPercentual >= 0 ? " text-positivo" : " text-negativo"}>
                      {" "}({preco.variacaoPercentual >= 0 ? "+" : ""}{preco.variacaoPercentual.toFixed(2).replace(".", ",")}% hoje)
                    </span>
                  )}
                  <span className="block">Aportado: {formatarMoeda(conta.saldoCentavos)}</span>
                </p>
              )}
              <label className="mb-3 block text-xs text-muted-fg">
                Classe na carteira
                <SelectNative
                  value={conta.classeDeAtivo ?? ""}
                  aria-label={`Classe de ${conta.nome}`}
                  onChange={(evento) => void classificar(conta.id, evento.target.value)}
                >
                  <option value="">Escolha a classe</option>
                  {CLASSES.map((linha) => <option key={linha.classe} value={linha.classe}>{linha.rotulo}</option>)}
                </SelectNative>
              </label>
              <Button variant="outline" onClick={() => { setMovimento(conta); setAbrir(true) }}>Aportar ou resgatar</Button>
            </div>
          )
        })}
      </div>

      <ArcaCarteira
        carteira={ativos.map((conta) => ({
          // Quem ainda não escolheu a classe entra como "outros": some da conta
          // do método, mas não some da carteira nem do total.
          classe: (conta.classeDeAtivo ?? "OUTROS") as ClasseDeAtivo,
          valorCentavos: mercadoDe(conta) ?? conta.saldoCentavos,
        }))}
      />

      {!ativos.length && <Vazio titulo="Cadastre o que você já investe" texto="Use o nome do ativo ou da aplicação. O saldo passa a compor seu patrimônio." />}
      {erro && !abrir && <p role="alert" className="text-negativo">{erro}</p>}

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
    </Cartao>
  )
}

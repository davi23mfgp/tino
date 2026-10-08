"use client"

import { useEffect, useState } from "react"
import { Check, Minus } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, formatarPercentual } from "@/lib/dinheiro"
import { descontoAnualBps, type Plano } from "@/lib/planos"
import { Aviso, Cartao, Vazio } from "@/components/ui/painel"
import { Abertura } from "@/components/abertura"
import { PricingToggle } from "@/components/ui/pricing-toggle"
import { EsqueletoLinhas } from "@/components/ui/skeleton"

/**
 * Plano, situação de pagamento e troca de plano.
 *
 * A tela responde três perguntas, nessa ordem: o que estou pagando, quando sai
 * a próxima cobrança, e como saio disso. Esconder o cancelamento é o que faz o
 * cliente ligar para o banco e pedir estorno, o que custa mais caro que o
 * cancelamento.
 *
 * O status vem do banco, escrito pelo webhook do provedor. A tela nunca decide
 * se alguém está pago — nem a volta do checkout decide, porque o navegador volta
 * antes de o pagamento ser confirmado.
 */

type Provedor = "MERCADO_PAGO" | "STRIPE"
type Ciclo = "MENSAL" | "ANUAL"

interface Cobranca {
  id: string
  status: "PENDENTE" | "PAGA" | "FALHOU" | "ESTORNADA"
  valorCentavos: number
  motivoFalha: string | null
  criadoEm: string
  pagaEm: string | null
}

interface Assinatura {
  id: string
  provedor: Provedor
  status: "TESTE" | "PENDENTE" | "ATIVA" | "INADIMPLENTE" | "CANCELADA"
  planoId: string
  ciclo: Ciclo
  valorCentavos: number
  proximaCobrancaEm: string | null
  testeAteEm: string | null
  canceladaEm: string | null
  motivoFalha: string | null
  cobrancas: Cobranca[]
}

interface Gateway {
  provedor: Provedor
  rotulo: string
  formasDePagamento: string
  configurado: boolean
}

interface Situacao {
  assinatura: Assinatura | null
  planos: (Plano & { precoEditado: boolean })[]
  diasDeTeste: number
  gateways: Gateway[]
  uso: { dividas: number; gastos: number; pelotelegram: number; metas: number }
  planoSugerido: string
}

const DIA_MS = 86_400_000
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

const ROTULO_STATUS = {
  TESTE: "Em teste",
  PENDENTE: "Aguardando confirmação do pagamento",
  ATIVA: "Ativa",
  INADIMPLENTE: "Pagamento em atraso",
  CANCELADA: "Cancelada",
} as const

const TOM_STATUS = {
  TESTE: "text-muted-fg",
  PENDENTE: "text-atencao",
  ATIVA: "text-positivo",
  INADIMPLENTE: "text-negativo",
  CANCELADA: "text-muted-fg",
} as const

export default function Assinatura() {
  const [situacao, setSituacao] = useState<Situacao | null>(null)
  const [ciclo, setCiclo] = useState<Ciclo>("ANUAL")
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function recarregar() {
    setSituacao(await buscar<Situacao>("/api/assinatura"))
  }

  useEffect(() => {
    recarregar().catch(() => setErro("Não consegui carregar sua assinatura."))
  }, [])

  async function contratar(provedor: Provedor, planoId: string) {
    setOcupado(true)
    setErro(null)
    try {
      const { url } = await enviar<{ url: string }>("/api/assinatura", { provedor, planoId, ciclo })
      // O pagamento acontece no domínio do provedor. Cartão nunca passa por
      // servidor nosso: seria PCI-DSS e uma superfície de vazamento sem motivo.
      window.location.href = url
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não consegui abrir o pagamento.")
      setOcupado(false)
    }
  }

  async function cancelar() {
    setOcupado(true)
    setErro(null)
    try {
      await buscar("/api/assinatura", { method: "DELETE" })
      await recarregar()
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não consegui cancelar.")
    } finally {
      setOcupado(false)
    }
  }

  if (!situacao) {
    return (
      <Cartao>
        <EsqueletoLinhas linhas={3} />
      </Cartao>
    )
  }

  const { assinatura, planos, gateways, diasDeTeste, uso, planoSugerido } = situacao
  const emTeste = !assinatura || assinatura.status === "TESTE"
  if (emTeste) {
    return (
      <TelaDoTeste
        situacao={situacao}
        ciclo={ciclo}
        setCiclo={setCiclo}
        escolhido={escolhido ?? planoSugerido}
        setEscolhido={setEscolhido}
        ocupado={ocupado}
        erro={erro}
        contratar={contratar}
      />
    )
  }
  const disponiveis = gateways.filter((linha) => linha.configurado)
  const ativa = assinatura?.status === "ATIVA"
  const maiorDesconto = Math.max(0, ...planos.map((linha) => descontoAnualBps(linha)))

  return (
    <div className="space-y-4">
      {erro && <Aviso tom="critico">{erro}</Aviso>}

      {/* ── Onde a pessoa está hoje ── */}
      {/* Plano, valor e status eram uma frase de três partes separadas por
          ponto médio. Qual plano e quando renova é a resposta da tela. */}
      <Abertura
        rotulo="Assinatura"
        titulo={
          assinatura ? (
            <>Você está no <em>{planos.find((linha) => linha.codigo === assinatura.planoId)?.nome ?? assinatura.planoId}</em>, {formatarMoeda(assinatura.valorCentavos)} {assinatura.ciclo === "ANUAL" ? "por ano" : "por mês"}.</>
          ) : (
            <>Você ainda não tem uma assinatura ativa.</>
          )
        }
        apoio={
          assinatura?.proximaCobrancaEm && assinatura.status !== "CANCELADA" ? (
            <><b>{ROTULO_STATUS[assinatura.status]}</b> · próxima cobrança em {new Date(assinatura.proximaCobrancaEm).toLocaleDateString("pt-BR")}.</>
          ) : assinatura ? (
            <><b>{ROTULO_STATUS[assinatura.status]}</b></>
          ) : undefined
        }
      />

      <Cartao titulo="Sua assinatura">
        {assinatura ? (
          <>
            <p className="text-[calc(13px*var(--escala-letra))]">
              <span className={TOM_STATUS[assinatura.status]}>{ROTULO_STATUS[assinatura.status]}</span>
              {" · "}
              {planos.find((linha) => linha.codigo === assinatura.planoId)?.nome ?? assinatura.planoId}
              {" · "}
              <span className="numero">{formatarMoeda(assinatura.valorCentavos)}</span>{" "}
              {assinatura.ciclo === "ANUAL" ? "por ano" : "por mês"}
            </p>

            {assinatura.proximaCobrancaEm && assinatura.status !== "CANCELADA" && (
              <p className="mt-1.5 text-[calc(13px*var(--escala-letra))] text-muted-fg">
                Próxima cobrança em {new Date(assinatura.proximaCobrancaEm).toLocaleDateString("pt-BR")}.
              </p>
            )}

            {assinatura.status === "PENDENTE" && (
              <p className="mt-1.5 text-[calc(13px*var(--escala-letra))] text-muted-fg">
                O provedor ainda não confirmou. Isso costuma levar alguns minutos, e a tela atualiza sozinha quando você
                voltar aqui.
              </p>
            )}

            {assinatura.status === "INADIMPLENTE" && (
              <div className="mt-3">
                <Aviso tom="critico">
                  {assinatura.motivoFalha ?? "A última cobrança foi recusada."} Atualize o cartão no provedor ou
                  contrate de novo abaixo. Seus dados continuam aqui.
                </Aviso>
              </div>
            )}

            {assinatura.canceladaEm && (
              <p className="mt-1.5 text-[calc(13px*var(--escala-letra))] text-muted-fg">
                Cancelada em {new Date(assinatura.canceladaEm).toLocaleDateString("pt-BR")}.
              </p>
            )}

            {assinatura.status !== "CANCELADA" && (
              <button
                onClick={cancelar}
                disabled={ocupado}
                className="mt-4 rounded-full border border-pauta px-5 py-2.5 text-[calc(13px*var(--escala-letra))] text-muted-fg transition-colors hover:border-negativo/40 hover:text-negativo disabled:opacity-50"
              >
                Cancelar assinatura
              </button>
            )}
          </>
        ) : (
          <Vazio
            titulo={`Você está no teste de ${diasDeTeste} dias`}
            texto="Nenhuma cobrança foi feita. Escolha um plano abaixo quando quiser continuar."
          />
        )}
      </Cartao>

      {/* ── Escolher ou trocar de plano ── */}
      {!ativa && (
        <Cartao
          titulo="Planos"
          acao={
            <PricingToggle
              valor={ciclo}
              aoMudar={setCiclo}
              rotuloDesconto={maiorDesconto > 0 ? `-${formatarPercentual(maiorDesconto, 0)}` : undefined}
            />
          }
        >
          {disponiveis.length === 0 && (
            <div className="mb-4">
              <Aviso tom="atencao">
                Nenhum meio de pagamento está configurado ainda. Enquanto isso, o app continua funcionando inteiro, só
                a contratação está fora do ar.
              </Aviso>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {planos.map((linha) => {
              const valorCentavos = ciclo === "ANUAL" ? linha.anualCentavos : linha.mensalCentavos

              return (
                <div key={linha.codigo} className="rounded-[var(--raio-cartao)] border border-pauta bg-papel-2 p-5">
                  <p className="text-[calc(15px*var(--escala-letra))] font-semibold">{linha.nome}</p>
                  <p className="mt-1 text-[calc(12px*var(--escala-letra))] leading-relaxed text-muted-fg">{linha.chamada}</p>

                  <p className="numero mt-4 text-[calc(28px*var(--escala-letra))] font-bold leading-none">
                    {formatarMoeda(valorCentavos)}
                    <span className="ml-1.5 font-sans text-[calc(12px*var(--escala-letra))] font-normal text-muted-fg">
                      {ciclo === "ANUAL" ? "por ano" : "por mês"}
                    </span>
                  </p>
                  {ciclo === "ANUAL" && (
                    <p className="mt-1 text-[calc(12px*var(--escala-letra))] text-positivo">
                      {formatarPercentual(descontoAnualBps(linha), 0)} de desconto sobre o mensal
                    </p>
                  )}

                  <ul className="mt-4 space-y-1.5">
                    {linha.inclui.map((item) => (
                      <li key={item} className="flex gap-2 text-[calc(12px*var(--escala-letra))]">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-positivo" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <ul className="mt-3 space-y-1">
                    {linha.naoInclui.map((item) => (
                      <li key={item} className="flex gap-2 text-[calc(12px*var(--escala-letra))] text-muted-fg">
                        <Minus className="mt-0.5 size-3.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 space-y-2">
                    {gateways.map((opcao) => (
                      <div key={opcao.provedor}>
                        <button
                          onClick={() => contratar(opcao.provedor, linha.codigo)}
                          disabled={!opcao.configurado || ocupado}
                          className="w-full rounded-full bg-primary px-5 py-2.5 text-[calc(13px*var(--escala-letra))] font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Pagar com {opcao.rotulo}
                        </button>
                        <p className="mt-1 text-center text-[max(10px,calc(12px*var(--escala-letra)))] text-muted-fg">
                          {opcao.configurado
                            ? opcao.formasDePagamento
                            : `${opcao.rotulo} ainda não está disponível neste app.`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Cartao>
      )}

      {/* ── O que já foi cobrado ── */}
      {assinatura && assinatura.cobrancas.length > 0 && (
        <Cartao titulo="Cobranças">
          <div className="divide-y divide-pauta">
            {assinatura.cobrancas.map((cobranca) => (
              <div key={cobranca.id} className="flex items-start justify-between gap-3 py-2.5 text-[calc(13px*var(--escala-letra))]">
                <div>
                  <p>{new Date(cobranca.pagaEm ?? cobranca.criadoEm).toLocaleDateString("pt-BR")}</p>
                  {cobranca.motivoFalha && <p className="text-[calc(12px*var(--escala-letra))] text-negativo">{cobranca.motivoFalha}</p>}
                </div>
                <span
                  className={`numero ${cobranca.status === "PAGA" ? "text-positivo" : cobranca.status === "FALHOU" ? "text-negativo" : "text-muted-fg"}`}
                >
                  {formatarMoeda(cobranca.valorCentavos)}
                </span>
              </div>
            ))}
          </div>
        </Cartao>
      )}
    </div>
  )
}

/**
 * A tela de quem ainda está no teste, opção A do passo 52 (Davi, 08/10/2026).
 * Abre pelo que a pessoa já guardou no Tino, porque é isso que ela perde se
 * não assinar; depois diz quando o teste acaba e que nada é cobrado sozinho,
 * que é o medo de quem testa. O anual aparece dividido por mês, com o total
 * do ano e o mensal ao lado: esconder o total seria o truque que faz o
 * cliente se sentir enganado na fatura.
 */
function TelaDoTeste({ situacao, ciclo, setCiclo, escolhido, setEscolhido, ocupado, erro, contratar }: {
  situacao: Situacao
  ciclo: Ciclo
  setCiclo: (ciclo: Ciclo) => void
  escolhido: string
  setEscolhido: (codigo: string) => void
  ocupado: boolean
  erro: string | null
  contratar: (provedor: Provedor, planoId: string) => void
}) {
  const { assinatura, planos, gateways, diasDeTeste, uso, planoSugerido } = situacao
  const fim = assinatura?.testeAteEm ? new Date(assinatura.testeAteEm) : null
  // Dia do teste contado a partir do fim gravado; sem data (conta antiga), não há dia a mostrar.
  const diaDoTeste = fim ? Math.min(diasDeTeste, Math.max(1, diasDeTeste - Math.ceil((fim.getTime() - Date.now()) / DIA_MS) + 1)) : null
  const gateway = gateways.find((linha) => linha.configurado && linha.provedor === "MERCADO_PAGO") ?? gateways.find((linha) => linha.configurado)
  const plano = planos.find((linha) => linha.codigo === escolhido) ?? planos[0]
  const itens = [
    uso.dividas > 0 && { valor: plural(uso.dividas, "dívida cadastrada", "dívidas cadastradas"), nota: "com o plano para pagar" },
    uso.gastos > 0 && { valor: plural(uso.gastos, "gasto anotado", "gastos anotados"), nota: uso.pelotelegram > 0 ? `${plural(uso.pelotelegram, "pelo Telegram", "pelo Telegram")}` : "no seu extrato" },
    uso.metas > 0 && { valor: plural(uso.metas, "meta", "metas"), nota: "juntando dinheiro" },
  ].filter(Boolean) as { valor: string; nota: string }[]

  return (
    <div className="space-y-4">
      {erro && <Aviso tom="critico">{erro}</Aviso>}
      {/* O título "Assinatura" já vem do cabeçalho do app; aqui só o dia do teste. */}
      <header>
        <p className="text-[calc(13px*var(--escala-letra))] text-muted-fg">
          {diaDoTeste ? `teste grátis · dia ${diaDoTeste} de ${diasDeTeste}` : `teste grátis de ${diasDeTeste} dias`}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <Cartao titulo="No teste, você já">
          {itens.length > 0 ? (
            <ul className="divide-y divide-pauta">
              {itens.map((item) => (
                <li key={item.valor} className="flex items-baseline justify-between gap-3 py-2.5">
                  <span className="text-[calc(15px*var(--escala-letra))]">{item.valor}</span>
                  <span className="text-right text-[calc(12px*var(--escala-letra))] text-muted-fg">{item.nota}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[calc(13px*var(--escala-letra))] text-muted-fg">Ainda nada guardado. Cadastre uma dívida, um gasto ou uma meta para o Tino começar a ajudar.</p>
          )}
          <p className="mt-4 border-t border-pauta pt-3 text-[calc(13px*var(--escala-letra))] leading-relaxed">
            {fim ? <>O teste acaba em <b>{fim.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</b>. </> : null}
            Nada é cobrado sozinho: sem escolher um plano, a conta fica só para leitura, e você continua podendo ver e exportar tudo.
          </p>
        </Cartao>

        <Cartao
          titulo="Escolha o plano"
          acao={
            <div role="radiogroup" aria-label="Ciclo" className="flex rounded-full border border-pauta p-0.5 text-[calc(12px*var(--escala-letra))]">
              {(["ANUAL", "MENSAL"] as const).map((opcao) => (
                <button key={opcao} type="button" role="radio" aria-checked={ciclo === opcao} onClick={() => setCiclo(opcao)}
                  className={`rounded-full px-3 py-1 ${ciclo === opcao ? "bg-primary text-primary-foreground" : "text-muted-fg"}`}>
                  {opcao === "ANUAL" ? "Anual" : "Mensal"}
                </button>
              ))}
            </div>
          }
        >
          <div role="radiogroup" aria-label="Plano" className="grid gap-3 sm:grid-cols-2">
            {planos.map((linha) => {
              const porMes = ciclo === "ANUAL" ? Math.round(linha.anualCentavos / 12) : linha.mensalCentavos
              const marcado = linha.codigo === plano?.codigo
              return (
                <button key={linha.codigo} type="button" role="radio" aria-checked={marcado} onClick={() => setEscolhido(linha.codigo)}
                  className={`rounded-[var(--raio-cartao)] border p-4 text-left transition-colors ${marcado ? "border-primary bg-primary/5" : "border-pauta bg-papel-2"}`}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[calc(15px*var(--escala-letra))] font-semibold">{linha.nome}</span>
                    {linha.codigo === planoSugerido && <span className="rounded-full bg-positivo/10 px-2 py-0.5 text-[calc(11px*var(--escala-letra))] text-positivo">o que você usa</span>}
                  </span>
                  <span className="mt-1 block text-[calc(12px*var(--escala-letra))] leading-relaxed text-muted-fg">{linha.chamada}</span>
                  <span className="numero mt-3 block text-[calc(26px*var(--escala-letra))] font-light leading-none">
                    {formatarMoeda(porMes)}<span className="ml-1.5 font-sans text-[calc(12px*var(--escala-letra))] text-muted-fg">por mês</span>
                  </span>
                  <span className="mt-1.5 block text-[calc(12px*var(--escala-letra))] text-muted-fg">
                    {ciclo === "ANUAL"
                      ? <>{formatarMoeda(linha.anualCentavos)} por ano, ou {formatarMoeda(linha.mensalCentavos)} no mensal</>
                      : <>ou {formatarMoeda(Math.round(linha.anualCentavos / 12))} por mês no anual ({formatarPercentual(descontoAnualBps(linha), 0)} a menos)</>}
                  </span>
                </button>
              )
            })}
          </div>

          {plano && (
            <ul className="mt-4 space-y-1.5">
              {plano.inclui.map((item) => (
                <li key={item} className="flex gap-2 text-[calc(12px*var(--escala-letra))]"><Check className="mt-0.5 size-3.5 shrink-0 text-positivo" />{item}</li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => gateway && plano && contratar(gateway.provedor, plano.codigo)}
            disabled={!gateway || !plano || ocupado}
            className="mt-5 w-full rounded-full bg-primary px-5 py-3 text-[calc(14px*var(--escala-letra))] font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            Assinar o {plano?.nome ?? "plano"}
          </button>
          <p className="mt-1.5 text-center text-[calc(12px*var(--escala-letra))] text-muted-fg">
            {gateway
              ? `${gateway.formasDePagamento}, pelo ${gateway.rotulo}. Cancela quando quiser.`
              : "O pagamento ainda não está disponível neste app. Enquanto isso, o Tino continua funcionando inteiro."}
          </p>
        </Cartao>
      </div>
    </div>
  )
}

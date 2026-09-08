"use client"

import { useEffect, useState } from "react"
import { Check, Minus } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, formatarPercentual } from "@/lib/dinheiro"
import { descontoAnualBps, type Plano } from "@/lib/planos"
import { Aviso, Cartao, Vazio } from "@/components/ui/painel"
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
}

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
  const [ciclo, setCiclo] = useState<Ciclo>("MENSAL")
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

  const { assinatura, planos, gateways, diasDeTeste } = situacao
  const disponiveis = gateways.filter((linha) => linha.configurado)
  const ativa = assinatura?.status === "ATIVA"
  const maiorDesconto = Math.max(0, ...planos.map((linha) => descontoAnualBps(linha)))

  return (
    <div className="space-y-4">
      {erro && <Aviso tom="critico">{erro}</Aviso>}

      {/* ── Onde a pessoa está hoje ── */}
      <Cartao titulo="Sua assinatura">
        {assinatura ? (
          <>
            <p className="text-[13px]">
              <span className={TOM_STATUS[assinatura.status]}>{ROTULO_STATUS[assinatura.status]}</span>
              {" · "}
              {planos.find((linha) => linha.codigo === assinatura.planoId)?.nome ?? assinatura.planoId}
              {" · "}
              <span className="numero">{formatarMoeda(assinatura.valorCentavos)}</span>{" "}
              {assinatura.ciclo === "ANUAL" ? "por ano" : "por mês"}
            </p>

            {assinatura.proximaCobrancaEm && assinatura.status !== "CANCELADA" && (
              <p className="mt-1.5 text-[13px] text-muted-fg">
                Próxima cobrança em {new Date(assinatura.proximaCobrancaEm).toLocaleDateString("pt-BR")}.
              </p>
            )}

            {assinatura.status === "PENDENTE" && (
              <p className="mt-1.5 text-[13px] text-muted-fg">
                O provedor ainda não confirmou. Isso costuma levar alguns minutos — a tela atualiza sozinha quando você
                voltar aqui.
              </p>
            )}

            {assinatura.status === "INADIMPLENTE" && (
              <div className="mt-3">
                <Aviso tom="critico">
                  {assinatura.motivoFalha ?? "A última cobrança foi recusada."} Atualize o cartão no provedor ou
                  contrate de novo abaixo — seus dados continuam aqui.
                </Aviso>
              </div>
            )}

            {assinatura.canceladaEm && (
              <p className="mt-1.5 text-[13px] text-muted-fg">
                Cancelada em {new Date(assinatura.canceladaEm).toLocaleDateString("pt-BR")}.
              </p>
            )}

            {assinatura.status !== "CANCELADA" && (
              <button
                onClick={cancelar}
                disabled={ocupado}
                className="mt-4 rounded-full border border-pauta px-5 py-2.5 text-[13px] text-muted-fg transition-colors hover:border-negativo/40 hover:text-negativo disabled:opacity-50"
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
                Nenhum meio de pagamento está configurado ainda. Enquanto isso, o app continua funcionando inteiro — só
                a contratação está fora do ar.
              </Aviso>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {planos.map((linha) => {
              const valorCentavos = ciclo === "ANUAL" ? linha.anualCentavos : linha.mensalCentavos

              return (
                <div key={linha.codigo} className="rounded-[var(--raio-cartao)] border border-pauta bg-papel-2 p-5">
                  <p className="text-[15px] font-semibold">{linha.nome}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-fg">{linha.chamada}</p>

                  <p className="numero mt-4 text-[28px] font-bold leading-none">
                    {formatarMoeda(valorCentavos)}
                    <span className="ml-1.5 font-sans text-[12px] font-normal text-muted-fg">
                      {ciclo === "ANUAL" ? "por ano" : "por mês"}
                    </span>
                  </p>
                  {ciclo === "ANUAL" && (
                    <p className="mt-1 text-[12px] text-positivo">
                      {formatarPercentual(descontoAnualBps(linha), 0)} de desconto sobre o mensal
                    </p>
                  )}

                  <ul className="mt-4 space-y-1.5">
                    {linha.inclui.map((item) => (
                      <li key={item} className="flex gap-2 text-[12px]">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-positivo" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <ul className="mt-3 space-y-1">
                    {linha.naoInclui.map((item) => (
                      <li key={item} className="flex gap-2 text-[12px] text-muted-fg">
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
                          className="w-full rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Pagar com {opcao.rotulo}
                        </button>
                        <p className="mt-1 text-center text-[11px] text-muted-fg">
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
              <div key={cobranca.id} className="flex items-start justify-between gap-3 py-2.5 text-[13px]">
                <div>
                  <p>{new Date(cobranca.pagaEm ?? cobranca.criadoEm).toLocaleDateString("pt-BR")}</p>
                  {cobranca.motivoFalha && <p className="text-[12px] text-negativo">{cobranca.motivoFalha}</p>}
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

import Link from "next/link"
import { CreditCard } from "lucide-react"

import { prisma } from "@/lib/prisma"
import { sessaoDaPagina } from "@/lib/pagina"
import { competenciaAtual, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { compromissosFuturos } from "@/lib/parcelamentos"
import { cn } from "@/lib/utils"
import { Cartao, Metrica, Valor, Vazio } from "@/components/ui/painel"

export const dynamic = "force-dynamic"

export default async function Cartoes() {
  const sessao = await sessaoDaPagina()

  const cartoes = await prisma.conta.findMany({
    where: { larId: sessao.larId, tipo: "CARTAO_CREDITO", arquivada: false },
    include: {
      parcelamentos: { where: { ativo: true }, include: { parcelas: { where: { paga: false } } } },
      conexao: { select: { instituicao: true, ultimaSync: true } },
    },
  })

  const movimentos = await prisma.transacao.groupBy({
    by: ["contaId", "tipo"],
    where: { larId: sessao.larId, contaId: { in: cartoes.map((cartao) => cartao.id) } },
    _sum: { valorCentavos: true },
  })

  const compromissos = await compromissosFuturos(sessao.larId, 12)
  const competencia = competenciaAtual()

  const detalhados = cartoes.map((cartao) => {
    const gastos = movimentos.find((m) => m.contaId === cartao.id && m.tipo === "DESPESA")?._sum.valorCentavos ?? 0
    const pagamentos = movimentos.find((m) => m.contaId === cartao.id && m.tipo === "RECEITA")?._sum.valorCentavos ?? 0
    const faturaAberta = Math.max(0, gastos - pagamentos)

    // Parcela futura já consome limite hoje, mesmo sem ter entrado em fatura:
    // é por isso que o limite "some" sem o gasto aparecer no extrato do mês.
    const parcelasFuturas = cartao.parcelamentos
      .flatMap((parcelamento) => parcelamento.parcelas)
      .reduce((soma, parcela) => soma + parcela.valorCentavos, 0)

    const usado = faturaAberta + parcelasFuturas
    return { cartao, faturaAberta, parcelasFuturas, usado, disponivel: (cartao.limiteCentavos ?? 0) - usado }
  })

  const faturaTotal = detalhados.reduce((soma, linha) => soma + linha.faturaAberta, 0)

  return (
    <div className="space-y-4">
      <Cartao titulo="Fatura atual">
        <Valor>{formatarMoeda(faturaTotal)}</Valor>
        <p className="mt-1 text-sm text-muted-fg">
          Somando {detalhados.length} cartão(ões). Parcelas futuras não entram aqui — elas aparecem no mês em que caem.
        </p>
      </Cartao>

      <div className="grid gap-4 lg:grid-cols-2">
        {detalhados.map(({ cartao, faturaAberta, parcelasFuturas, usado, disponivel }) => {
          const percentualUsado = cartao.limiteCentavos ? (usado / cartao.limiteCentavos) * 100 : 0
          // Os quatro dígitos só aparecem quando a pessoa já os escreveu no nome
          // do cartão. O banco não guarda número de cartão, e desenhar um
          // "•••• 4321" inventado seria número falso na tela — o defeito que
          // esta base mais evita.
          const finalNoNome = cartao.nome.match(/\b(\d{4})\b/)?.[1]

          return (
            <Cartao key={cartao.id} className="p-0" estatico>
              {/* A FACE DO CARTÃO.
                  É o único gradiente do app, e ele é o MATERIAL do objeto, não
                  enfeite: cartão de crédito é uma placa escura e brilhante, e
                  a tela ganha em reconhecimento ao parecer com a coisa.

                  A informação não está no gradiente — está na barra de limite
                  em cima dele, que segue a regra de cor de sempre. Um gradiente
                  e uma cor que informa; a ousadia fica num lugar só. */}
              <div className="relative overflow-hidden bg-[linear-gradient(135deg,oklch(0.34_0_0),oklch(0.19_0_0))] p-6 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold tracking-[-0.012em]">{cartao.nome}</p>
                    <p className="mt-0.5 text-[12px] text-white/65">
                      {cartao.instituicao ?? cartao.conexao?.instituicao ?? "cartão de crédito"}
                      {cartao.diaVencimento ? ` · vence dia ${cartao.diaVencimento}` : ""}
                    </p>
                  </div>
                  <CreditCard className="size-6 shrink-0 text-white/40" aria-hidden />
                </div>

                {finalNoNome && (
                  <p className="numero mt-6 text-[17px] tracking-[0.18em] text-white/80">•••• {finalNoNome}</p>
                )}

                <div className={finalNoNome ? "mt-5" : "mt-8"}>
                  <p className="text-[11px] uppercase tracking-[0.08em] text-white/55">Fatura em aberto</p>
                  <p className="numero mt-1 text-[28px] font-semibold leading-[1.1] tracking-[-0.03em]">
                    {formatarMoeda(faturaAberta)}
                  </p>
                </div>

                {cartao.limiteCentavos ? (
                  <div className="mt-5 space-y-2">
                    {/* Trilha clara sobre a placa escura: a trilha do sistema é
                        escura e sumiria aqui. */}
                    <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          percentualUsado > 100
                            ? "bg-negativo"
                            : percentualUsado >= 80
                              ? "bg-atencao"
                              : "bg-white",
                        )}
                        style={{ width: `${Math.max(2, Math.min(100, percentualUsado))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[12px] text-white/70">
                      <span>
                        usado {formatarMoeda(usado)} de {formatarMoeda(cartao.limiteCentavos)}
                      </span>
                      <span className={disponivel < 0 ? "text-negativo" : "text-white"}>
                        {disponivel < 0 ? "estourado" : `sobram ${formatarMoeda(disponivel)}`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 text-[12px] text-white/70">
                    Limite não informado. Cadastre em Configurações para o Tino acompanhar quanto sobra.
                  </p>
                )}
              </div>

              {parcelasFuturas > 0 && (
                <p className="px-6 py-4 text-[13px] leading-relaxed text-[color:var(--texto-2)]">
                  <span className="font-medium text-atencao">{formatarMoeda(parcelasFuturas)}</span> em parcelas já
                  compradas ainda vão cair nas próximas faturas. Esse valor já saiu do seu limite.
                </p>
              )}
            </Cartao>
          )
        })}

        {/* Dentro de um Cartao, e não solto sobre o fundo: sem a superfície
            embaixo, o estado vazio flutuava entre dois cartões e parecia um
            erro de layout em vez de uma resposta da tela.

            O texto parou de oferecer Open Finance. O adaptador existe em
            `src/lib/open-finance/`, mas o Davi tirou do menu e não vai usar —
            oferecer um caminho que não existe na interface é mandar a pessoa
            procurar por algo que ela não vai achar. */}
        {detalhados.length === 0 && (
          <Cartao>
            <Vazio
              titulo="Nenhum cartão cadastrado"
              texto="Cadastre o primeiro em Configurações para o Tino acompanhar a fatura."
              acao={
                <Link
                  href="/configuracoes"
                  className="ios-tap inline-block rounded-[var(--raio-pilula)] bg-primary px-5 py-2.5 text-[14px] font-medium text-primary-foreground"
                >
                  Cadastrar cartão
                </Link>
              }
            />
          </Cartao>
        )}
      </div>

      <Cartao titulo="Faturas projetadas">
        <div className="space-y-2">
          {compromissos.map((linha) => (
            <div key={linha.competencia} className="flex items-center justify-between text-sm">
              <span className={linha.competencia === competencia ? "font-medium" : "text-muted-fg"}>
                {rotuloCompetencia(linha.competencia)}
              </span>
              <span>{formatarMoeda(linha.totalCentavos)}</span>
            </div>
          ))}
          {compromissos.length === 0 && <Vazio titulo="Sem parcelas futuras registradas" />}
        </div>
        <p className="mt-3 text-[12px] text-muted-fg">
          Só parcelas já contratadas. Compras novas entram conforme forem lançadas.
        </p>
      </Cartao>
    </div>
  )
}

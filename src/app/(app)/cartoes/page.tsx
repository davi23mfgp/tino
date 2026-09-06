import Link from "next/link"

import { prisma } from "@/lib/prisma"
import { sessaoDaPagina } from "@/lib/pagina"
import { competenciaAtual, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { compromissosFuturos } from "@/lib/parcelamentos"
import { Barra, Cartao, Metrica, Valor, Vazio } from "@/components/ui/painel"

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
        {detalhados.map(({ cartao, faturaAberta, parcelasFuturas, usado, disponivel }) => (
          <Cartao key={cartao.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{cartao.nome}</p>
                <p className="text-[12px] text-muted-fg">
                  {cartao.instituicao ?? cartao.conexao?.instituicao ?? "cartão de crédito"}
                  {cartao.diaVencimento ? ` · vence dia ${cartao.diaVencimento}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="numero text-2xl font-semibold">{formatarMoeda(faturaAberta)}</p>
                <p className="text-[12px] text-muted-fg">fatura em aberto</p>
              </div>
            </div>

            {cartao.limiteCentavos ? (
              <div className="mt-4 space-y-2">
                <Barra percentual={(usado / cartao.limiteCentavos) * 100} />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-fg">
                    usado {formatarMoeda(usado)} de {formatarMoeda(cartao.limiteCentavos)}
                  </span>
                  <span className="text-positivo">disponível {formatarMoeda(disponivel)}</span>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-[12px] text-muted-fg">Limite não informado.</p>
            )}

            {parcelasFuturas > 0 && (
              <p className="mt-3 rounded-xl border border-atencao/30 bg-atencao/10 p-2.5 text-xs text-atencao">
                {formatarMoeda(parcelasFuturas)} em parcelas já compradas ainda vão cair nas próximas faturas.
              </p>
            )}
          </Cartao>
        ))}

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

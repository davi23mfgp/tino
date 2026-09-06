import Link from "next/link"

import { sessaoDeAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { formatarMoeda, formatarPercentual } from "@/lib/dinheiro"
import { arpuCentavos, churnBps, contarPorStatus, mrrCentavos, mrrEmRiscoCentavos } from "@/lib/metricas"
import { opcoesDeGateway } from "@/lib/pagamento"
import { Aviso, Cartao, Metrica, Vazio } from "@/components/ui/painel"

/**
 * A primeira tela do dono.
 *
 * A ordem segue o que os painéis de assinatura brasileiros põem primeiro
 * (Superlógica, Vindi): dinheiro recorrente, depois base de clientes, depois o
 * que está quebrado. Vaidade — total de acessos, gráfico bonito — não entra:
 * o dono abre isto para decidir preço e para saber quem parou de pagar.
 */

export const dynamic = "force-dynamic"

export default async function VisaoGeralAdmin() {
  await sessaoDeAdmin()

  const inicioDoMes = new Date()
  inicioDoMes.setUTCDate(1)
  inicioDoMes.setUTCHours(0, 0, 0, 0)

  const [assinaturas, totalContas, canceladasNoMes, chamadosAbertos, falhasRecentes] = await Promise.all([
    prisma.assinatura.findMany({ select: { status: true, ciclo: true, valorCentavos: true } }),
    prisma.usuario.count(),
    prisma.assinatura.count({ where: { status: "CANCELADA", canceladaEm: { gte: inicioDoMes } } }),
    prisma.chamado.count({ where: { status: "ABERTO" } }),
    prisma.cobranca.count({ where: { status: "FALHOU", criadoEm: { gte: inicioDoMes } } }),
  ])

  const porStatus = contarPorStatus(assinaturas)
  const mrr = mrrCentavos(assinaturas)
  const risco = mrrEmRiscoCentavos(assinaturas)
  // A base do início do mês é a de hoje mais quem cancelou desde então — quem
  // cancelou já saiu da contagem de ATIVA.
  const churn = churnBps(canceladasNoMes, porStatus.ATIVA + canceladasNoMes)

  const semGateway = opcoesDeGateway().filter((opcao) => !opcao.configurado)

  return (
    <div className="space-y-4">
      {semGateway.length > 0 && (
        <Aviso tom="atencao">
          {semGateway.length === 2
            ? "Nenhum meio de pagamento está configurado: ninguém consegue assinar. Falta colar as chaves do Mercado Pago e da Stripe nas variáveis de ambiente."
            : `${semGateway[0].rotulo} sem chave configurada — o botão dele aparece desabilitado para o cliente.`}
        </Aviso>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica
          rotulo="MRR"
          valor={formatarMoeda(mrr)}
          detalhe={`${porStatus.ATIVA} assinatura(s) ativa(s) · anual entra pelo duodécimo`}
          tom={mrr > 0 ? "positivo" : "neutro"}
        />
        <Metrica
          rotulo="Em atraso"
          valor={formatarMoeda(risco)}
          detalhe={`${porStatus.INADIMPLENTE} conta(s) com cobrança recusada`}
          tom={risco > 0 ? "negativo" : "neutro"}
        />
        <Metrica
          rotulo="Churn do mês"
          valor={formatarPercentual(churn, 1)}
          detalhe={`${canceladasNoMes} cancelamento(s) desde o dia 1 · abaixo de 3% é saudável`}
          tom={churn > 300 ? "negativo" : churn > 0 ? "atencao" : "neutro"}
        />
        <Metrica
          rotulo="Receita por conta"
          valor={formatarMoeda(arpuCentavos(assinaturas))}
          detalhe="MRR dividido pelas assinaturas ativas"
        />
      </div>

      <Cartao titulo="Base de contas">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { rotulo: "Contas", valor: totalContas },
            { rotulo: "Em teste", valor: porStatus.TESTE },
            { rotulo: "Aguardando", valor: porStatus.PENDENTE },
            { rotulo: "Ativas", valor: porStatus.ATIVA },
            { rotulo: "Em atraso", valor: porStatus.INADIMPLENTE },
            { rotulo: "Canceladas", valor: porStatus.CANCELADA },
          ].map((linha) => (
            <div key={linha.rotulo} className="rounded-[var(--raio-cartao)] border border-pauta bg-papel-2 px-4 py-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-fg">{linha.rotulo}</p>
              <p className="numero mt-1 text-[22px] font-semibold leading-none">{linha.valor}</p>
            </div>
          ))}
        </div>

        {assinaturas.length === 0 && (
          <div className="mt-4">
            <Vazio
              titulo="Nenhuma assinatura ainda"
              texto="Os números aparecem quando a primeira contratação passar pelo webhook do provedor."
            />
          </div>
        )}
      </Cartao>

      <Cartao titulo="O que precisa de você">
        <ul className="space-y-2 text-[13px]">
          <li className="flex items-center justify-between gap-3 border-b border-pauta pb-2">
            <span>Chamados abertos no suporte</span>
            <Link href="/admin/suporte" className="numero text-acao">
              {chamadosAbertos}
            </Link>
          </li>
          <li className="flex items-center justify-between gap-3 border-b border-pauta pb-2">
            <span>Cobranças recusadas neste mês</span>
            <Link href="/admin/pagamentos" className="numero text-acao">
              {falhasRecentes}
            </Link>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span>Contas com pagamento em atraso</span>
            <Link href="/admin/contas" className="numero text-acao">
              {porStatus.INADIMPLENTE}
            </Link>
          </li>
        </ul>
      </Cartao>
    </div>
  )
}

import type { Metadata } from "next"
import type { CSSProperties } from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle2, ReceiptText, WalletCards } from "lucide-react"

import estilos from "./painel.module.css"
import { sessaoDaPagina } from "@/lib/pagina"
import { prisma } from "@/lib/prisma"
import { corDoBanco } from "@/lib/bancos-perfil"
import { competenciaAtual, competenciaMaisMeses, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { montarPanorama } from "@/lib/tino/panorama"
import { montarDiagnostico } from "@/lib/tino/diagnostico"
import { compromissosFuturos, resumoParcelamentos } from "@/lib/parcelamentos"
import { FluxoDeCaixaNoTempo, RoscaCategorias } from "@/components/graficos"
import { montarFluxoDeCaixa } from "@/lib/fluxo-caixa"
import { projetarComParcelas } from "@/lib/projecao-com-parcelas"
import { Barra } from "@/components/ui/painel"
import { IdentidadeBanco } from "@/components/banco-perfil"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Início — Tino", robots: { index: false, follow: false } }

const CORES = ["#34c759", "#5ac8fa", "#af52de", "#ff9f0a", "#ff375f", "#8e8e93"]

function valorDoMes(transacoes: { competencia: string; tipo: string; valorCentavos: number }[], competencia: string) {
  return transacoes.filter((linha) => linha.competencia === competencia).reduce((total, linha) => total + (linha.tipo === "DESPESA" ? linha.valorCentavos : -linha.valorCentavos), 0)
}

export default async function Painel() {
  const sessao = await sessaoDaPagina()
  const competencia = competenciaAtual()
  const mesesFuturos = [competencia, competenciaMaisMeses(competencia, 1), competenciaMaisMeses(competencia, 2)]
  const [panorama, pendentes, totaisPendentes, cartoes, recentes, compromissos, parcelamentos] = await Promise.all([
    montarPanorama(sessao.larId, competencia),
    prisma.captura.findMany({ where: { larId: sessao.larId, status: "PENDENTE" }, orderBy: { criadoEm: "desc" }, take: 4 }),
    prisma.captura.aggregate({ where: { larId: sessao.larId, status: "PENDENTE" }, _count: { _all: true }, _sum: { valorCentavos: true } }),
    prisma.conta.findMany({
      where: { larId: sessao.larId, tipo: "CARTAO_CREDITO", arquivada: false }, orderBy: { criadoEm: "asc" },
      include: {
        transacoes: { where: { competencia: { in: mesesFuturos }, tipo: { in: ["DESPESA", "RECEITA"] } } },
        parcelamentos: { where: { ativo: true }, include: { parcelas: { where: { competencia: { in: mesesFuturos }, paga: false } } } },
      },
    }),
    prisma.transacao.findMany({
      where: { larId: sessao.larId, pago: true, tipo: "DESPESA", competencia }, orderBy: [{ data: "desc" }, { criadoEm: "desc" }], take: 8,
      include: { conta: { select: { nome: true, tipo: true } }, categoria: { select: { nome: true, icone: true } } },
    }),
    compromissosFuturos(sessao.larId, 36), resumoParcelamentos(sessao.larId),
  ])

  // Depende do saldo, entao vem depois do panorama: a linha do caixa tem que
  // passar pelo mesmo numero que aparece no topo da tela.
  const fluxo = await montarFluxoDeCaixa(sessao.larId, panorama.saldoTotalCentavos, projetarComParcelas(panorama, compromissos))
  const diagnostico = montarDiagnostico(panorama, { compromissos, parcelamentosRestanteCentavos: parcelamentos.restanteCentavos })
  const categorias = panorama.mes.despesasPorCategoria.slice(0, 5)
  const maiorCategoria = Math.max(1, ...categorias.map((linha) => linha.totalCentavos))
  // Quantidade e total vêm da fila inteira; a lista abaixo mostra só as quatro mais recentes.
  const quantidadePendente = totaisPendentes._count._all
  const totalPendente = totaisPendentes._sum.valorCentavos ?? 0
  const comprasCredito = recentes.filter((linha) => linha.conta.tipo === "CARTAO_CREDITO").slice(0, 4)
  const despesasConta = recentes.filter((linha) => linha.conta.tipo !== "CARTAO_CREDITO").slice(0, 4)

  return <div className={estilos.pagina}>
    <section className={estilos.resumo} aria-labelledby="resumo-mes">
      <div><p className={estilos.sobretitulo} id="resumo-mes">Resultado de {rotuloCompetencia(competencia)}</p><p className={estilos.saldo}>{formatarMoeda(panorama.mes.sobraCentavos)}</p><p className={estilos.apoio}>Saldo disponível: {formatarMoeda(panorama.saldoTotalCentavos)}</p></div>
      <dl className={estilos.metricas}><div><dt>Entrou</dt><dd className="text-positivo">{formatarMoeda(panorama.mes.receitasCentavos)}</dd></div><div><dt>Saiu</dt><dd className="text-negativo">{formatarMoeda(panorama.mes.despesasCentavos)}</dd></div><div><dt>Saúde</dt><dd>{diagnostico.nota}<small>/100</small></dd></div></dl>
    </section>

    <section className={estilos.painel} aria-labelledby="cartoes-titulo">
      <Cabecalho rotulo="Crédito" titulo="Cartões e faturas" id="cartoes-titulo" href="/cartoes" acao="Ver cartões" />
      {cartoes.length ? <div className={estilos.listaCartoes}>{cartoes.map((cartao) => {
        const atual = valorDoMes(cartao.transacoes, competencia)
        // Fecha, vence e a proxima fatura: as tres perguntas de quem olha um
        // cartao. Lancado e parcela ainda nao lancada somam, e o rotulo avisa
        // quando ha previsao no meio — antes um escondia o outro.
        const proximaCompetencia = mesesFuturos[1]
        const confirmadoProximo = valorDoMes(cartao.transacoes, proximaCompetencia)
        const previstoProximo = cartao.parcelamentos.flatMap((p) => p.parcelas).filter((p) => p.competencia === proximaCompetencia).reduce((soma, p) => soma + p.valorCentavos, 0)
        const proxima = confirmadoProximo + previstoProximo
        return <Link href="/cartoes" key={cartao.id} className={estilos.cartaoBanco} style={{ "--cor-banco": corDoBanco(cartao.instituicao) } as CSSProperties}><IdentidadeBanco instituicao={cartao.instituicao} nome={cartao.nome} className={estilos.iconeBanco} /><span className={estilos.dadosLinha}><strong>{cartao.nome}</strong><small>{cartao.instituicao ?? "Cartão de crédito"}</small></span><span className={estilos.faturaAtual}><small>Fatura atual</small><strong>{formatarMoeda(Math.max(0, atual))}</strong></span><span className={estilos.proximas}><span><small>Fecha</small><b>{cartao.diaFechamento ? `dia ${cartao.diaFechamento}` : "—"}</b></span><span><small>Vence</small><b>{cartao.diaVencimento ? `dia ${cartao.diaVencimento}` : "—"}</b></span><span><small title={previstoProximo ? `Inclui ${formatarMoeda(previstoProximo)} em parcelas previstas` : undefined}>{rotuloCompetencia(proximaCompetencia, true)}{previstoProximo ? " · prev." : ""}</small><b>{formatarMoeda(Math.max(0, proxima))}</b></span></span><ArrowRight className={estilos.seta} /></Link>
      })}</div> : <Link href="/configuracoes" className={estilos.vazio}>Cadastrar primeiro cartão <ArrowRight /></Link>}
    </section>

    {pendentes.length > 0 && <section className={estilos.painel} aria-labelledby="conferir-titulo">
      <header className={estilos.cabecalhoSecao}><div><p className={estilos.sobretitulo}>Antes de entrar no saldo</p><h2 id="conferir-titulo">{quantidadePendente} {quantidadePendente === 1 ? "compra para conferir" : "compras para conferir"}</h2></div><div className={estilos.totalPendente}><small>Total</small><strong>{formatarMoeda(totalPendente)}</strong></div></header>
      <div className={estilos.listaCompacta}>{pendentes.map((linha) => <Link href="/capturas" key={linha.id}><span className={estilos.iconeLinha}><ReceiptText /></span><span className={estilos.dadosLinha}><strong>{linha.estabelecimento ?? "Sem descrição"}</strong><small>Notificação bancária</small></span><b>{formatarMoeda(linha.valorCentavos ?? 0)}</b><ArrowRight /></Link>)}</div>
      <Link href="/capturas" className={estilos.acaoSecundaria}>{quantidadePendente > pendentes.length ? `Conferir as ${quantidadePendente}` : "Conferir agora"} <ArrowRight /></Link>
    </section>}

    <div className={estilos.duasColunas}>
      <section className={estilos.painel}><Cabecalho rotulo="Este mês" titulo="Para onde foi" href="/transacoes" acao="Ver extrato" />
        {categorias.length ? <div className={estilos.categorias}><div className={estilos.rosca}><RoscaCategorias dados={categorias} legenda={false} /></div><ul>{categorias.map((linha, indice) => {
          const orcamento = panorama.orcamento.linhas.find((item) => item.categoriaId === linha.categoriaId)
          const percentual = orcamento ? Math.round(linha.totalCentavos / Math.max(1, orcamento.limiteCentavos) * 100) : Math.round(linha.totalCentavos / maiorCategoria * 100)
          return <li key={linha.categoriaId ?? linha.nome}><Link href={`/transacoes?categoriaId=${linha.categoriaId ?? "sem"}`}><span className={estilos.cor} style={{ background: CORES[indice % CORES.length] }} /><span className={estilos.dadosLinha}><strong>{linha.nome}</strong><small>{orcamento ? `${percentual}% do orçamento` : "Definir orçamento"}</small></span><b>{formatarMoeda(linha.totalCentavos)}</b></Link><Barra percentual={percentual} /></li>
        })}</ul></div> : <p className={estilos.vazio}>Os gastos do mês aparecem aqui.</p>}
      </section>
      <section className={estilos.painel}><Cabecalho rotulo="Últimos movimentos" titulo="Compras recentes" href="/transacoes" acao="Ver todas" />
        <div className={estilos.movimentos}>{[{ titulo: "No crédito", linhas: comprasCredito }, { titulo: "Em conta", linhas: despesasConta }].map((grupo) => <div key={grupo.titulo}><h3>{grupo.titulo}</h3>{grupo.linhas.length ? grupo.linhas.map((linha) => <Link href="/transacoes" key={linha.id}><span className={estilos.iconeLinha}>{linha.categoria?.icone && !linha.categoria.icone.includes("circle") ? linha.categoria.icone : <WalletCards />}</span><span className={estilos.dadosLinha}><strong>{linha.descricao}</strong><small>{linha.conta.nome}</small></span><b>{formatarMoeda(linha.valorCentavos)}</b></Link>) : <p>Nenhuma compra no período.</p>}</div>)}</div>
      </section>
    </div>

    <div className={estilos.duasColunas}>
      <section className={estilos.painel}><Cabecalho rotulo="O que entra, o que sai e o que sobra" titulo="Fluxo de caixa" href="/projecao" acao="Ver projeção" /><FluxoDeCaixaNoTempo series={fluxo} altura={230} /></section>
      <section className={estilos.painel}><Cabecalho rotulo="O que você tem e deve" titulo="Balanço" href="/analise" acao="Ver análise" />
        <dl className={estilos.balanco}><div><dt>Ativos</dt><dd>{formatarMoeda(diagnostico.balanco.ativoTotalCentavos)}</dd></div><div><dt>Dívidas</dt><dd>{formatarMoeda(diagnostico.balanco.passivoTotalCentavos)}</dd></div><div><dt>Patrimônio</dt><dd className={diagnostico.balanco.patrimonioLiquidoCentavos < 0 ? "text-negativo" : "text-positivo"}>{formatarMoeda(diagnostico.balanco.patrimonioLiquidoCentavos)}</dd></div></dl>
        <div className={estilos.saude}><div className={estilos.anel} style={{ "--nota": `${diagnostico.nota * 3.6}deg` } as CSSProperties}><span>{diagnostico.nota}<small>saúde</small></span></div><div><strong>{diagnostico.situacao === "SAUDAVEL" ? "Seu dinheiro está saudável" : "Seu dinheiro pede atenção"}</strong><p>{diagnostico.prioridades[0]?.titulo ?? "Continue acompanhando seu mês."}</p><Link href="/analise">Ver próxima ação <ArrowRight /></Link></div></div>
      </section>
    </div>

    {panorama.dividas.lista.length > 0 && <section className={estilos.painel}><Cabecalho rotulo="Plano de saída" titulo="Dívidas" href="/dividas" acao="Organizar dívidas" /><div className={estilos.dividas}>{panorama.dividas.lista.slice(0, 3).map((divida, indice) => <Link href="/dividas" key={divida.id}><span className={estilos.numeroEtapa}>{indice + 1}</span><span className={estilos.dadosLinha}><strong>{divida.credor}</strong><small>Parcela {formatarMoeda(divida.parcelaCentavos)}</small></span><b>{formatarMoeda(divida.saldoDevedorCentavos)}</b>{indice === 0 ? <span className={estilos.proxima}><CheckCircle2 /> Próxima ação</span> : <ArrowRight />}</Link>)}</div></section>}
  </div>
}

function Cabecalho({ rotulo, titulo, id, href, acao }: { rotulo: string; titulo: string; id?: string; href: string; acao: string }) {
  return <header className={estilos.cabecalhoSecao}><div><p className={estilos.sobretitulo}>{rotulo}</p><h2 id={id}>{titulo}</h2></div><Link href={href}>{acao} <ArrowRight /></Link></header>
}

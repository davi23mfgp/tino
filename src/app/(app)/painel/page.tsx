import type { Metadata } from "next"
import type { CSSProperties } from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle2, CreditCard, Plus, ReceiptText, TrendingUp } from "lucide-react"

import estilos from "./painel.module.css"
import { sessaoDaPagina } from "@/lib/pagina"
import { prisma } from "@/lib/prisma"
import { corDoBanco } from "@/lib/bancos-perfil"
import { iconeDaCategoria } from "@/lib/icone-categoria"
import { BotaoOcultarValores } from "@/components/ocultar-valores"
import { competenciaAtual, competenciaMaisMeses, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"
import { montarPanorama } from "@/lib/tino/panorama"
import { montarDiagnostico } from "@/lib/tino/diagnostico"
import { compromissosFuturos, resumoParcelamentos } from "@/lib/parcelamentos"
import { FluxoDeCaixaNoTempo } from "@/components/graficos"
import { ReguaDoIndicador } from "@/components/regua-do-indicador"
import { montarFluxoDeCaixa } from "@/lib/fluxo-caixa"
import { projetarComParcelas } from "@/lib/projecao-com-parcelas"
import { Barra } from "@/components/ui/painel"
import { AcoesDaConta } from "@/components/barra-topo"
import { ROTULO_BANDEIRA, finalDoCartao } from "@/lib/bandeiras"
import { CarteiraCartoes } from "@/components/carteira-cartoes"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Início — Tino", robots: { index: false, follow: false } }

const CORES_FAIXA: Record<string, string> = { BOM: "text-positivo", ATENCAO: "text-atencao", CRITICO: "text-negativo", SEM_DADO: "text-muted-fg" }
const CORES = ["#34c759", "#5ac8fa", "#af52de", "#ff9f0a", "#ff375f", "#8e8e93"]


function valorDoMes(transacoes: { competencia: string; tipo: string; valorCentavos: number }[], competencia: string) {
  return transacoes.filter((linha) => linha.competencia === competencia).reduce((total, linha) => total + (linha.tipo === "DESPESA" ? linha.valorCentavos : -linha.valorCentavos), 0)
}

export default async function Painel() {
  const sessao = await sessaoDaPagina()
  const competencia = competenciaAtual()
  const mesesFuturos = [competencia, competenciaMaisMeses(competencia, 1), competenciaMaisMeses(competencia, 2)]
  const [panorama, pendentes, totaisPendentes, cartoes, recentes, compromissos, parcelamentos, usuario] = await Promise.all([
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
      where: { larId: sessao.larId, pago: true, tipo: "DESPESA", competencia }, orderBy: [{ data: "desc" }, { criadoEm: "desc" }], take: 24,
      include: { conta: { select: { nome: true, tipo: true } }, categoria: { select: { nome: true, icone: true } } },
    }),
    compromissosFuturos(sessao.larId, 36), resumoParcelamentos(sessao.larId),
    // Para o sino e a conta dentro do cartão do topo, no celular.
    prisma.usuario.findUnique({ where: { id: sessao.usuarioId }, select: { admin: true, avatarUrl: true } }),
  ])

  // Depende do saldo, entao vem depois do panorama: a linha do caixa tem que
  // passar pelo mesmo numero que aparece no topo da tela.
  const fluxo = await montarFluxoDeCaixa(sessao.larId, panorama.saldoTotalCentavos, projetarComParcelas(panorama, compromissos))
  const diagnostico = montarDiagnostico(panorama, { compromissos, parcelamentosRestanteCentavos: parcelamentos.restanteCentavos })
  const categorias = panorama.mes.despesasPorCategoria.slice(0, 5)
  const maiorCategoria = Math.max(1, ...categorias.map((linha) => linha.totalCentavos))
  const totalCategorias = categorias.reduce((soma, linha) => soma + linha.totalCentavos, 0)
  // Quantidade e total vêm da fila inteira; a lista abaixo mostra só as quatro mais recentes.
  const quantidadePendente = totaisPendentes._count._all
  const totalPendente = totaisPendentes._sum.valorCentavos ?? 0
  const primeiroNome = sessao.nome.trim().split(" ")[0] || "você"
  // Data no fuso de quem usa o app: o servidor roda em UTC, e às 22h de
  // Brasília ele já diria que é amanhã.
  const hoje = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date())
  const comprasCredito = recentes.filter((linha) => linha.conta.tipo === "CARTAO_CREDITO").slice(0, 6)
  const despesasConta = recentes.filter((linha) => linha.conta.tipo !== "CARTAO_CREDITO").slice(0, 6)

  const atalhos = <>
    <Link href="/lancar"><span><Plus aria-hidden /></span>Anotar</Link>
    <Link href="/transacoes"><span><ReceiptText aria-hidden /></span>Extrato</Link>
    <Link href="/cartoes"><span><CreditCard aria-hidden /></span>Faturas</Link>
    <Link href="/analise"><span><TrendingUp aria-hidden /></span>Análise</Link>
  </>

  return <div className={estilos.pagina}>
    {/* O topo é um cartão, como o de um banco (Davi, 23/09, depois de três
        rodadas no canvas): "tino." no canto, o leão ao fundo e só o que se lê
        de relance — quem é, o saldo e o mês. Branco com texto escuro no tema
        claro; verde-escuro com texto branco no escuro, porque branco no meio
        do escuro apagava o resto da tela e o verde claro ficou feio.

        No celular o sino e a conta moram aqui dentro e a barra de cima some
        (ver .app-header-inicio); os atalhos ficam logo abaixo. No computador
        a barra continua e os atalhos entram no cartão, onde sobrava espaço. */}
    <section className={estilos.cartaoTopo} aria-labelledby="ola">
      {/* eslint-disable-next-line @next/next/no-img-element -- desenho decorativo, sem ganho do otimizador */}
      <img src="/mascote/tino-leao-marca.png" alt="" aria-hidden className={estilos.leao} />
      <div className={estilos.cartaoCabeca}>
        <span className={estilos.marca}>tino.</span>
        <div className={estilos.acoesCartao}>
          <AcoesDaConta nome={sessao.nome} admin={usuario?.admin ?? false} avatarUrl={usuario?.avatarUrl ?? null} />
        </div>
      </div>
      <div className={estilos.cartaoCorpo}>
        <div className="min-w-0">
          <h2 id="ola" className={estilos.ola}>Olá, {primeiroNome}!</h2>
          <p className={estilos.hoje}>{hoje}</p>
          <div className={estilos.rotuloSaldo}><p>Saldo disponível</p><BotaoOcultarValores /></div>
          <p className={cn(estilos.saldoCartao, "valor-sensivel")}>{formatarMoeda(panorama.saldoTotalCentavos)}</p>
          {/* Três colunas numa linha só: em texto corrido, com centavos, o mês
              quebrava em duas linhas no celular. */}
          <dl className={estilos.mesCartao}>
            <div><dt>Entrou</dt><dd className="valor-sensivel">{formatarMoeda(panorama.mes.receitasCentavos)}</dd></div>
            <div><dt>Saiu</dt><dd className="valor-sensivel">{formatarMoeda(panorama.mes.despesasCentavos)}</dd></div>
            <div><dt>{panorama.mes.sobraCentavos >= 0 ? "Sobrou" : "Faltou"}</dt><dd className="valor-sensivel">{formatarMoeda(Math.abs(panorama.mes.sobraCentavos))}</dd></div>
          </dl>
        </div>
        <nav className={cn(estilos.atalhos, estilos.atalhosDentro)} aria-label="Atalhos">{atalhos}</nav>
      </div>
    </section>

    <nav className={cn(estilos.atalhos, estilos.atalhosFora)} aria-label="Atalhos">{atalhos}</nav>

    <section className={estilos.painel} aria-labelledby="cartoes-titulo">
      <Cabecalho titulo="Cartões e faturas" id="cartoes-titulo" href="/cartoes" acao="Ver cartões" />
      {/* Cartões numa carteira (Davi, 23/09): um atrás do outro, o tocado
          levanta. Os números saem daqui, do servidor; a pilha só anima. */}
      {cartoes.length ? <CarteiraCartoes cartoes={cartoes.map((cartao) => {
        const atual = valorDoMes(cartao.transacoes, competencia)
        // Fecha, vence e a proxima fatura: as tres perguntas de quem olha um
        // cartao. Lancado e parcela ainda nao lancada somam, e o rotulo avisa
        // quando ha previsao no meio — antes um escondia o outro.
        const proximaCompetencia = mesesFuturos[1]
        const confirmadoProximo = valorDoMes(cartao.transacoes, proximaCompetencia)
        const previstoProximo = cartao.parcelamentos.flatMap((p) => p.parcelas).filter((p) => p.competencia === proximaCompetencia).reduce((soma, p) => soma + p.valorCentavos, 0)
        const dias = diasAteVencer(cartao.diaVencimento)
        return {
          id: cartao.id,
          nome: cartao.nome.replace(/\s*\(?final\s*\d{4}\)?/i, ""),
          instituicao: cartao.instituicao,
          cor: corDoBanco(cartao.instituicao),
          final: finalDoCartao(cartao.nome),
          bandeira: cartao.bandeira ? ROTULO_BANDEIRA[cartao.bandeira] ?? "" : "",
          faturaAtualCentavos: Math.max(0, atual),
          vencimento: dias === null ? "vencimento não informado" : `vence em ${dias} ${dias === 1 ? "dia" : "dias"}`,
          proximaRotulo: rotuloCompetencia(proximaCompetencia, true),
          proximaCentavos: Math.max(0, confirmadoProximo + previstoProximo),
          previstoProximoCentavos: previstoProximo,
        }
      })} /> : <Link href="/configuracoes" className={estilos.vazio}>Cadastrar primeiro cartão <ArrowRight /></Link>}
    </section>

    {pendentes.length > 0 && <section className={estilos.painel} aria-labelledby="conferir-titulo">
      <header className={estilos.cabecalhoSecao}><div><h2 id="conferir-titulo">{quantidadePendente} {quantidadePendente === 1 ? "compra para conferir" : "compras para conferir"}</h2><p className={estilos.apoioSecao}>Antes de entrar no saldo</p></div><div className={estilos.totalPendente}><small>Total</small><strong>{formatarMoeda(totalPendente)}</strong></div></header>
      <div className={estilos.listaCompacta}>{pendentes.map((linha) => <Link href="/capturas" key={linha.id}><span className={estilos.iconeLinha}><ReceiptText /></span><span className={estilos.dadosLinha}><strong>{linha.estabelecimento ?? "Sem descrição"}</strong><small>{new Date(linha.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · notificação do banco</small></span><b>{formatarMoeda(linha.valorCentavos ?? 0)}</b><ArrowRight /></Link>)}</div>
      <Link href="/capturas" className={estilos.acaoSecundaria}>{quantidadePendente > pendentes.length ? `Conferir as ${quantidadePendente}` : "Conferir agora"} <ArrowRight /></Link>
    </section>}

    <div className={estilos.duasColunas}>
      <section className={estilos.painel}><Cabecalho titulo="Para onde foi" href="/transacoes" acao="Ver extrato" />
        {categorias.length ? <div className={estilos.categorias}>
          {/* Sem rosca. O gráfico do Recharts nascia com largura zero no
              celular: sobrava meia tela preta e um valor perdido no meio. A
              mesma pergunta — "o mês repartido" — cabe numa faixa empilhada,
              que não depende de medir o container para existir. */}
          <div className={estilos.topoCategorias}>
            <strong className="numero valor-sensivel">{formatarMoeda(totalCategorias)}</strong>
            <small>gasto até hoje</small>
          </div>
          <div className={estilos.faixaCategorias} aria-hidden>
            {categorias.map((linha, indice) => (
              <i
                key={linha.categoriaId ?? linha.nome}
                style={{ background: CORES[indice % CORES.length], width: `${(linha.totalCentavos / Math.max(1, totalCategorias)) * 100}%` }}
              />
            ))}
          </div>
          <ul>{categorias.map((linha, indice) => {
          const orcamento = panorama.orcamento.linhas.find((item) => item.categoriaId === linha.categoriaId)
          const percentual = orcamento ? Math.round(linha.totalCentavos / Math.max(1, orcamento.limiteCentavos) * 100) : Math.round(linha.totalCentavos / maiorCategoria * 100)
          return <li key={linha.categoriaId ?? linha.nome}><Link href={`/transacoes?categoriaId=${linha.categoriaId ?? "sem"}`}><span className={estilos.cor} style={{ background: CORES[indice % CORES.length] }} /><span className={estilos.dadosLinha}><strong>{linha.nome}</strong><small>{orcamento ? `${percentual}% do orçamento` : "Definir orçamento"}</small></span><b>{formatarMoeda(linha.totalCentavos)}</b></Link><Barra percentual={percentual} /></li>
        })}</ul></div> : <p className={estilos.vazio}>Os gastos do mês aparecem aqui.</p>}
      </section>
      <section className={estilos.painel}><Cabecalho titulo="Compras recentes" href="/transacoes" acao="Ver todas" />
        <div className={estilos.movimentos}>{[{ titulo: "No crédito", linhas: comprasCredito }, { titulo: "Em conta", linhas: despesasConta }].map((grupo) => <div key={grupo.titulo}><h3>{grupo.titulo}</h3>{grupo.linhas.length ? grupo.linhas.map((linha) => { const Icone = iconeDaCategoria(linha.categoria, "DESPESA"); return <Link href="/transacoes" key={linha.id}><span className={estilos.iconeLinha}><Icone /></span><span className={estilos.dadosLinha}><strong>{linha.descricao}</strong><small>{new Date(linha.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" })} · {linha.conta.nome}</small></span><b>{formatarMoeda(linha.valorCentavos)}</b></Link> }) : <p>Nenhuma compra no período.</p>}</div>)}</div>
      </section>
    </div>

    <>
      <section className={estilos.painel}><Cabecalho rotulo="O que entra, o que sai e o que sobra" titulo="Fluxo de caixa" href="/projecao" acao="Ver projeção" /><FluxoDeCaixaNoTempo series={fluxo} altura={230} /></section>
      <section className={estilos.painel}><Cabecalho rotulo="O que você tem e deve" titulo="Balanço" href="/analise" acao="Ver análise" />
        <dl className={estilos.balanco}><div><dt>Ativos</dt><dd>{formatarMoeda(diagnostico.balanco.ativoTotalCentavos)}</dd></div><div><dt>Dívidas</dt><dd>{formatarMoeda(diagnostico.balanco.passivoTotalCentavos)}</dd></div><div><dt>Patrimônio</dt><dd className={diagnostico.balanco.patrimonioLiquidoCentavos < 0 ? "text-negativo" : "text-positivo"}>{formatarMoeda(diagnostico.balanco.patrimonioLiquidoCentavos)}</dd></div></dl>
        <div className={estilos.saude}><div className={estilos.anel} style={{ "--nota": `${diagnostico.nota * 3.6}deg` } as CSSProperties}><span>{diagnostico.nota}<small>saúde</small></span></div><div><strong>{diagnostico.situacao === "SAUDAVEL" ? "Seu dinheiro está saudável" : "Seu dinheiro pede atenção"}</strong><p>{diagnostico.parecer}</p><Link href="/analise">Ver próxima ação <ArrowRight /></Link></div></div>

      </section>
    </>

    <section className={estilos.painel}>
      <Cabecalho rotulo="Por que a nota é essa" titulo="O que está bom e o que precisa melhorar" href="/analise" acao="Ver análise" />
        {/* Os indicadores que sustentam a nota: o que já está bom e o que
            puxa para baixo, cada um com a régua da referência que o
            classifica. */}
        <div className={estilos.indicadores}>
          {diagnostico.indicadores.filter((linha) => linha.faixa !== "SEM_DADO").slice(0, 4).map((linha) => (
            <div key={linha.chave} data-faixa={linha.faixa}>
              <span className={estilos.pilulaFaixa}>{linha.faixa === "BOM" ? "está bom" : linha.faixa === "CRITICO" ? "precisa melhorar" : "dá para melhorar"}</span>
              <dt>{linha.nome}</dt>
              <dd>{linha.valor}</dd>
              {/* A frase de leitura e a referência saíram, como na análise: a
                  régua mostra a distância até a próxima faixa, que é o que as
                  duas linhas de texto tentavam dizer em palavras. */}
              {linha.escala && <ReguaDoIndicador numero={linha.numero} escala={linha.escala} cor={CORES_FAIXA[linha.faixa]} />}
            </div>
          ))}
        </div>

        {diagnostico.prioridades.length > 0 && (
          <ol className={estilos.proximosPassos}>
            {diagnostico.prioridades.slice(0, 3).map((passo) => (
              <li key={passo.ordem}>
                <span className={estilos.numeroEtapa}>{passo.ordem}</span>
                <span>
                  <strong>{passo.titulo}</strong>
                  <small>{passo.porque}</small>
                </span>
                {passo.impactoMensalCentavos ? <b>{formatarMoeda(passo.impactoMensalCentavos)}<small>por mês</small></b> : null}
              </li>
            ))}
          </ol>
        )}
    </section>

    {panorama.dividas.lista.length > 0 && <section className={estilos.painel}><Cabecalho titulo="Dívidas" href="/dividas" acao="Organizar dívidas" /><div className={estilos.dividas}>{panorama.dividas.lista.slice(0, 3).map((divida, indice) => <Link href="/dividas" key={divida.id}><span className={estilos.numeroEtapa}>{indice + 1}</span><span className={estilos.dadosLinha}><strong>{divida.credor}</strong><small>Parcela {formatarMoeda(divida.parcelaCentavos)}</small></span><b>{formatarMoeda(divida.saldoDevedorCentavos)}</b>{indice === 0 ? <span className={estilos.proxima}><CheckCircle2 /> Próxima ação</span> : <ArrowRight />}</Link>)}</div></section>}
  </div>
}

/**
 * Cabeçalho de seção.
 *
 * O rótulo em caixa alta acima do título saiu. Eram seis só nesta tela
 * ("CRÉDITO" acima de "Cartões e faturas", "ESTE MÊS" acima de "Para onde
 * foi"), quase sempre dizendo em outra palavra o que o título já dizia. Caixa
 * alta cansa de ler e, repetida, deixa de significar qualquer coisa.
 *
 * O texto vira apoio em caixa normal, abaixo do título, e só quando ele
 * acrescenta alguma coisa — "o que entra, o que sai e o que sobra" explica;
 * "crédito" não.
 */
/**
 * Quantos dias faltam para a fatura vencer.
 *
 * "vence dia 6" é insumo: obriga a pessoa a olhar o calendário para saber se é
 * agora ou daqui a três semanas. A tela responde a pergunta que ela ia fazer.
 */
function diasAteVencer(dia: number | null) {
  if (!dia) return null
  const hoje = new Date()
  const alvo = new Date(hoje.getFullYear(), hoje.getMonth(), dia)
  if (alvo < hoje) alvo.setMonth(alvo.getMonth() + 1)
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000)
}

function Cabecalho({ rotulo, titulo, id, href, acao }: { rotulo?: string; titulo: string; id?: string; href: string; acao: string }) {
  return <header className={estilos.cabecalhoSecao}><div><h2 id={id}>{titulo}</h2>{rotulo && <p className={estilos.apoioSecao}>{rotulo}</p>}</div><Link href={href}>{acao} <ArrowRight /></Link></header>
}

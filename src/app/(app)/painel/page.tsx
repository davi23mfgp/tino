import type { Metadata } from "next"
import type { CSSProperties } from "react"
import Link from "next/link"
import { ArrowRight, CreditCard, Plus, ReceiptText, TrendingUp } from "lucide-react"

import estilos from "./painel.module.css"
import e from "./inicio.module.css"
import { AbasDoInicio } from "./abas-do-inicio"
import { ConferirNoInicio, type CapturaNoInicio } from "./conferir-no-inicio"
import { LogoDaCompra } from "./logo-da-compra"
import { sessaoDaPagina } from "@/lib/pagina"
import { prisma } from "@/lib/prisma"
import { iconeDaCategoria } from "@/lib/icone-categoria"
import { BotaoOcultarValores } from "@/components/ocultar-valores"
import { competenciaAtual, competenciaMaisMeses, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda, formatarPercentual } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"
import { montarPanorama } from "@/lib/tino/panorama"
import { montarDiagnostico, type Indicador } from "@/lib/tino/diagnostico"
import { compromissosFuturos, resumoParcelamentos } from "@/lib/parcelamentos"
import { montarFluxoDeCaixa } from "@/lib/fluxo-caixa"
import { projetarComParcelas } from "@/lib/projecao-com-parcelas"
import { AcoesDaConta } from "@/components/barra-topo"
import { ROTULO_BANDEIRA, finalDoCartao } from "@/lib/bandeiras"
import { corDoBanco } from "@/lib/bancos-perfil"
import { CarteiraCartoes } from "@/components/carteira-cartoes"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Início · Tino", robots: { index: false, follow: false } }

const CORES = ["#34c759", "#5ac8fa", "#af52de", "#ff9f0a", "#ff375f", "#8e8e93"]


function valorDoMes(transacoes: { competencia: string; tipo: string; valorCentavos: number }[], competencia: string) {
  return transacoes.filter((linha) => linha.competencia === competencia).reduce((total, linha) => total + (linha.tipo === "DESPESA" ? linha.valorCentavos : -linha.valorCentavos), 0)
}

export default async function Painel() {
  const sessao = await sessaoDaPagina()
  const competencia = competenciaAtual()
  const mesesFuturos = [competencia, competenciaMaisMeses(competencia, 1), competenciaMaisMeses(competencia, 2)]
  const [panorama, pendentes, totaisPendentes, cartoes, recentes, compromissos, parcelamentos, usuario, contaPadrao, usoCartoes] = await Promise.all([
    montarPanorama(sessao.larId, competencia),
    prisma.captura.findMany({ where: { larId: sessao.larId, status: "PENDENTE" }, orderBy: { criadoEm: "desc" }, take: 10 }),
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
    // Conta para lançar a compra confirmada quando a captura não disse qual: a
    // mesma escolha da tela Anotar, a primeira conta que não é cartão.
    prisma.conta.findFirst({ where: { larId: sessao.larId, arquivada: false, tipo: { not: "CARTAO_CREDITO" } }, orderBy: { criadoEm: "asc" }, select: { id: true } }),
    prisma.transacao.groupBy({
      by: ["contaId"],
      where: { larId: sessao.larId, tipo: "DESPESA", data: { gte: new Date(Date.now() - 90 * 86400000) }, conta: { tipo: "CARTAO_CREDITO", arquivada: false } },
      _count: { _all: true },
    }),
  ])
  // Frequência de compras, não tamanho da dívida: mais usado fica aberto à frente.
  const usoPorCartao = new Map(usoCartoes.map((linha) => [linha.contaId, linha._count._all]))
  cartoes.sort((a, b) => (usoPorCartao.get(b.id) ?? 0) - (usoPorCartao.get(a.id) ?? 0))

  // Depende do saldo, entao vem depois do panorama: a linha do caixa tem que
  // passar pelo mesmo numero que aparece no topo da tela.
  const fluxo = await montarFluxoDeCaixa(sessao.larId, panorama.saldoTotalCentavos, projetarComParcelas(panorama, compromissos))
  const diagnostico = montarDiagnostico(panorama, { compromissos, parcelamentosRestanteCentavos: parcelamentos.restanteCentavos })
  const nomesDeCategoria = new Map((await prisma.categoria.findMany({
    where: { id: { in: pendentes.map((linha) => linha.categoriaId).filter((id): id is string => Boolean(id)) } },
    select: { id: true, nome: true },
  })).map((linha) => [linha.id, linha.nome]))
  const capturasNoInicio: CapturaNoInicio[] = pendentes.map((linha) => ({
    id: linha.id,
    estabelecimento: linha.estabelecimento,
    valorCentavos: linha.valorCentavos,
    quando: new Date(linha.data ?? linha.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" }),
    via: linha.origem === "TELEGRAM" ? "pelo Telegram" : linha.origem === "NOTIFICACAO" ? `aviso ${linha.instituicao ? "do " + linha.instituicao : "do banco"}` : "anotado",
    contaId: linha.contaId,
    categoriaId: linha.categoriaId,
    categoriaNome: linha.categoriaId ? nomesDeCategoria.get(linha.categoriaId) ?? null : null,
  }))

  // Para onde foi: as cinco maiores categorias e o resto junto, numa rosca
  // (Davi: "o para onde foi dá para fazer aquele circulozinho").
  const porCategoria = panorama.mes.despesasPorCategoria
  const fatias = [
    ...porCategoria.slice(0, 5).map((linha, indice) => ({ nome: linha.nome, centavos: linha.totalCentavos, cor: CORES[indice] })),
    ...(porCategoria.length > 5 ? [{ nome: "Outras", centavos: porCategoria.slice(5).reduce((soma, linha) => soma + linha.totalCentavos, 0), cor: CORES[5] }] : []),
  ]
  const totalFatias = fatias.reduce((soma, fatia) => soma + fatia.centavos, 0)
  let angulo = 0
  const gradienteDaRosca = fatias.map((fatia) => {
    const fim = angulo + (fatia.centavos / Math.max(1, totalFatias)) * 360
    const trecho = `${fatia.cor} ${(angulo + 1).toFixed(1)}deg ${(fim - 1).toFixed(1)}deg, transparent ${(fim - 1).toFixed(1)}deg ${(fim + 1).toFixed(1)}deg`
    angulo = fim
    return trecho
  }).join(", ")
  const estouros = panorama.orcamento.linhas.filter((linha) => linha.estourou).sort((a, b) => b.percentual - a.percentual).slice(0, 4)

  // Fluxo: seis meses que aconteceram e seis de projeção, uma barra por mês
  // com o valor escrito (Davi: "está muito escalonado, espaçado").
  const mesesFluxo = fluxo.mes.map((ponto) => ({ chave: ponto.chave, rotulo: ponto.rotulo.split("/")[0].split(" ")[0].toLowerCase().slice(0, 3), sobra: ponto.entrouCentavos - ponto.saiuCentavos, futuro: ponto.futuro }))
  // Uma régua só para o que sobrou e o que faltou: 120 px dão a distância do
  // maior mês positivo ao maior negativo, e cada lado ocupa só o que precisa.
  const maiorSobra = Math.max(0, ...mesesFluxo.map((mes) => mes.sobra))
  const maiorFalta = Math.max(0, ...mesesFluxo.map((mes) => -mes.sobra))
  const pxPorCentavo = 120 / Math.max(1, maiorSobra + maiorFalta)
  const proximoMes = mesesFluxo.find((mes) => mes.futuro)
  const indicadores = diagnostico.indicadores.filter((linha) => linha.faixa !== "SEM_DADO").slice(0, 4)

  // Quantidade e total vêm da fila inteira; a lista abaixo mostra só as quatro mais recentes.
  const quantidadePendente = totaisPendentes._count._all
    const primeiroNome = sessao.nome.trim().split(" ")[0] || "você"
  // Data no fuso de quem usa o app: o servidor roda em UTC, e às 22h de
  // Brasília ele já diria que é amanhã.
  const hoje = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date())

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
      <img src="/mascote/tino-leao-marca.webp" alt="" aria-hidden className={estilos.leao} />
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

    <AbasDoInicio carteira={
<section className={estilos.painel} data-area="cartoes" data-multiplos={cartoes.length > 1 ? "sim" : "nao"} aria-labelledby="cartoes-titulo">
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
    }>
      <div className={e.grupo} data-grupo="hoje">
        {capturasNoInicio.length > 0 && <ConferirNoInicio capturas={capturasNoInicio} total={quantidadePendente} contaPadraoId={contaPadrao?.id ?? null} />}


        <section className={e.bloco} data-area="recentes" aria-labelledby="recentes-titulo">
          <Cabeca id="recentes-titulo" titulo="Compras recentes" href="/transacoes" acao="Ver todas" />
          {recentes.length ? <ul className={e.lista}>{recentes.slice(0, 6).map((linha) => {
            const Icone = iconeDaCategoria(linha.categoria, "DESPESA")
            return <li key={linha.id}><Link href="/transacoes">
              <LogoDaCompra nome={linha.descricao}><span className={e.icone}><Icone aria-hidden /></span></LogoDaCompra>
              <span className="min-w-0"><strong>{linha.descricao}</strong><small>{linha.categoria?.nome ?? "Sem categoria"} · {new Date(linha.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" })}</small></span>
              <b className="valor-sensivel">{formatarMoeda(-linha.valorCentavos)}</b>
            </Link></li>
          })}</ul> : <p className={e.vazio}>As compras do mês aparecem aqui.</p>}
        </section>
      </div>

      <div className={e.grupo} data-grupo="mes">
        <section className={e.bloco} data-area="onde" aria-labelledby="onde-titulo">
          <Cabeca id="onde-titulo" titulo="Para onde foi" href="/transacoes" acao="Ver extrato" />
          {fatias.length ? <>
            <div className={e.rosca}>
              <div className={e.circulo} style={{ background: `conic-gradient(${gradienteDaRosca})` }} aria-hidden />
              <div className={e.centro}><small>gasto em {rotuloCompetencia(competencia).split(" ")[0].toLowerCase()}</small><Reais centavos={panorama.mes.despesasCentavos} tamanho="medio" />{panorama.mes.receitasCentavos > 0 && <small>{Math.round((panorama.mes.despesasCentavos / panorama.mes.receitasCentavos) * 100)}% do que entrou</small>}</div>
            </div>
            <ul className={e.legenda}>{fatias.map((fatia) => (
              <li key={fatia.nome}><i style={{ background: fatia.cor }} /><span>{fatia.nome}</span><small>{Math.round((fatia.centavos / Math.max(1, totalFatias)) * 100)}%</small><b className="valor-sensivel">{formatarMoeda(fatia.centavos)}</b></li>
            ))}</ul>
            {estouros.length > 0 && <p className={e.estouros}><span>passaram do orçamento:</span>{estouros.map((linha) => <Link key={linha.categoriaId} href="/orcamento" className={e.chip} data-tom="negativo">{linha.nome} {linha.percentual}%</Link>)}</p>}
          </> : <p className={e.vazio}>Os gastos do mês aparecem aqui.</p>}
        </section>

        <section className={cn(e.bloco, e.saudeBloco)} data-area="indicadores" aria-labelledby="saude-titulo">
          <div className={e.saudeTopo}>
            <h2 id="saude-titulo">Saúde do dinheiro</h2>
            <Link href="/analise" className={e.linkCabeca}>Ver análise →</Link>
          </div>
          <div className={e.saudeCorpo}>
            <div className={e.anelNota} style={{ "--nota": `${diagnostico.nota * 3.6}deg` } as CSSProperties} data-situacao={diagnostico.situacao}>
              <span className={e.notaLinha}><strong>{diagnostico.nota}</strong><small className={e.notaMaximo}>/ 100</small></span>
            </div>
            <div className={e.indicadores}>{indicadores.map((linha) => (
              <div key={linha.chave} className={e.indicador} data-faixa={linha.faixa}>
                <ReguaIndicador indicador={linha} />
                <div className={e.indicadorTexto}><strong>{linha.nome}</strong><b>{linha.valor}</b><span className={e.estadoIndicador}>{linha.faixa === "BOM" ? "Dentro do parâmetro" : linha.faixa === "CRITICO" ? "Precisa de cuidado" : "Atenção"}</span><small>{linha.referencia}</small></div>
              </div>
            ))}</div>
          </div>
          {diagnostico.prioridades[0] && <Link href="/analise" className={e.proximaAcao}>
            <span>1</span>
            <span className="min-w-0"><strong>{diagnostico.prioridades[0].titulo}</strong><small>{diagnostico.prioridades[0].porque}</small></span>
            {diagnostico.prioridades[0].impactoMensalCentavos ? <b>{formatarMoeda(diagnostico.prioridades[0].impactoMensalCentavos)}<small>por mês</small></b> : null}
          </Link>}
        </section>
      </div>

      <div className={e.grupo} data-grupo="futuro">
        <section className={e.bloco} data-area="fluxo" aria-labelledby="fluxo-titulo">
          <Cabeca id="fluxo-titulo" titulo="Fluxo de caixa" href="/projecao" acao="Ver projeção" apoio="o que sobra ou falta em cada mês" />
          <div className={e.numerosFluxo}>
            <div><small>Sobra média, 6 meses</small><Reais centavos={panorama.medias.sobraCentavos} tamanho="grande" sinal tom={panorama.medias.sobraCentavos >= 0 ? "positivo" : "negativo"} /></div>
            {proximoMes && <div><small>Se nada mudar, em {proximoMes.rotulo}</small><Reais centavos={proximoMes.sobra} tamanho="medio" sinal tom={proximoMes.sobra >= 0 ? "positivo" : "negativo"} /></div>}
          </div>
          <div className={e.barrasFluxo} role="img" aria-label={mesesFluxo.map((mes) => `${mes.rotulo}: ${formatarMoeda(mes.sobra)}${mes.futuro ? " previsto" : ""}`).join("; ")}>
            {mesesFluxo.map((mes) => (
              <div key={mes.chave} data-futuro={mes.futuro || undefined} data-sinal={mes.sobra >= 0 ? "mais" : "menos"}>
                <span className={e.metade} data-lado="cima" style={{ height: maiorSobra ? maiorSobra * pxPorCentavo + 18 : 0 }}>{mes.sobra >= 0 && <><em>{abreviar(mes.sobra)}</em><i style={{ height: Math.max(3, mes.sobra * pxPorCentavo) }} /></>}</span>
                <span className={e.metade} data-lado="baixo" style={{ height: maiorFalta ? maiorFalta * pxPorCentavo + 18 : 0 }}>{mes.sobra < 0 && <><i style={{ height: Math.max(3, -mes.sobra * pxPorCentavo) }} /><em>{abreviar(mes.sobra)}</em></>}</span>
                <small>{mes.rotulo}</small>
              </div>
            ))}
          </div>
          <p className={e.legendaFluxo}><span data-tipo="real" />já aconteceu <span data-tipo="previsto" />projeção</p>
        </section>

        {panorama.dividas.lista.length > 0 && <section className={cn(e.bloco, e.dividasBloco)} data-area="dividas" aria-labelledby="dividas-titulo">
          <header className={e.cabecaDividas}>
            <div><h2 id="dividas-titulo">Dívidas</h2><span className={e.totalDividas}><Reais centavos={panorama.dividas.totalCentavos} tamanho="grande" /></span></div>
            <Link href="/dividas">{panorama.dividas.lista.length} em aberto · Ver todas →</Link>
          </header>
          <ul className={e.cartoesDividas}>{panorama.dividas.lista.slice(0, 4).map((divida) => (
            <li key={divida.id}><Link href="/dividas" className={e.cartaoDivida}>
              <div className={e.nomeDivida}><strong>{divida.credor}</strong><ArrowRight aria-hidden /></div>
              <div className={e.saldoDivida}><small>Saldo devedor</small><b className="valor-sensivel">{formatarMoeda(divida.saldoDevedorCentavos)}</b></div>
              <div className={e.detalhesDivida}>
                <span><small>Juros ao mês</small><b><i data-peso={pesoDoJuro(divida.jurosMensalBps)} className={e.corDivida} />{formatarPercentual(divida.jurosMensalBps, 2)}</b></span>
                <span><small>Vencimento</small><b>Dia {divida.diaVencimento}</b></span>
                {divida.parcelasTotal !== null && divida.parcelasTotal > 0 && <span><small>Parcelas pagas</small><b>{divida.parcelasPagas}/{divida.parcelasTotal}</b></span>}
              </div>
            </Link></li>
          ))}</ul>
        </section>}
      </div>
    </AbasDoInicio>
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

/** Número grande e fino, centavos menores: o padrão das telas novas. */
function Reais({ centavos, tamanho, sinal, tom }: { centavos: number; tamanho: "medio" | "grande"; sinal?: boolean; tom?: "positivo" | "negativo" }) {
  const texto = (sinal && centavos > 0 ? "+ " : "") + formatarMoeda(centavos)
  const virgula = texto.lastIndexOf(",")
  return <span className={cn(e.reais, "valor-sensivel")} data-tamanho={tamanho} data-tom={tom}>{texto.slice(0, virgula)}<small>{texto.slice(virgula)}</small></span>
}

function Cabeca({ id, titulo, href, acao, apoio }: { id: string; titulo: string; href: string; acao: string; apoio?: string }) {
  return <header className={e.cabeca}><div><h2 id={id}>{titulo}</h2>{apoio && <p>{apoio}</p>}</div><Link href={href}>{acao} →</Link></header>
}

/** "+2,2 mil", "−334": o rótulo em cima da barra, curto para caber. */
function abreviar(centavos: number) {
  const sinal = centavos < 0 ? "−" : "+"
  const reais = Math.abs(centavos) / 100
  return sinal + (reais >= 1000 ? `${(reais / 1000).toFixed(1).replace(".", ",")} mil` : Math.round(reais).toString())
}

/** Faixas de custo da dívida, as mesmas da tela Dívidas: acima de 5% ao mês é caro. */
function pesoDoJuro(bps: number) {
  return bps > 500 ? "caro" : bps >= 200 ? "médio" : "leve"
}

function ReguaIndicador({ indicador }: { indicador: Indicador }) {
  const escala = indicador.escala
  if (!escala) return null
  const porcentagem = (valor: number) => Math.max(0, Math.min(100, valor / escala.maximo * 100))
  const inicio = porcentagem(Math.min(escala.bom, escala.atencao))
  const fim = porcentagem(Math.max(escala.bom, escala.atencao))
  // Reserva o espaço do marcador nas pontas para não recortá-lo em 0%/100%.
  return <div className={e.reguaIndicador} aria-hidden="true" style={{
    "--primeiro-limite": `${inicio}%`, "--segundo-limite": `${fim}%`,
    "--posicao": `${porcentagem(indicador.numero)}%`,
    "--primeira-cor": escala.menorMelhor ? "var(--positivo)" : "var(--negativo)",
    "--ultima-cor": escala.menorMelhor ? "var(--negativo)" : "var(--positivo)",
  } as CSSProperties}><span /></div>
}

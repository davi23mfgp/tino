import type { Metadata } from "next"
import type { CSSProperties } from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle2, ReceiptText, WalletCards } from "lucide-react"

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
import { ONDE_RESOLVER } from "@/lib/tino/onde-resolver"
import { AvisoNoHeroi } from "@/components/aviso-no-heroi"
import { IdentidadeBanco } from "@/components/banco-perfil"

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
      where: { larId: sessao.larId, pago: true, tipo: "DESPESA", competencia }, orderBy: [{ data: "desc" }, { criadoEm: "desc" }], take: 24,
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
  const totalCategorias = categorias.reduce((soma, linha) => soma + linha.totalCentavos, 0)
  // Quantidade e total vêm da fila inteira; a lista abaixo mostra só as quatro mais recentes.
  const quantidadePendente = totaisPendentes._count._all
  const totalPendente = totaisPendentes._sum.valorCentavos ?? 0
  const primeiraPrioridade = diagnostico.prioridades[0]
  const proximoPasso = primeiraPrioridade ? ONDE_RESOLVER[primeiraPrioridade.chave] : undefined
  const comprasCredito = recentes.filter((linha) => linha.conta.tipo === "CARTAO_CREDITO").slice(0, 6)
  const despesasConta = recentes.filter((linha) => linha.conta.tipo !== "CARTAO_CREDITO").slice(0, 6)

  return <div className={estilos.pagina}>
    <section className={estilos.visaoGeral} aria-labelledby="resumo-mes">
      <div className={estilos.resumo}>
      <div><div className={estilos.tituloResumo}><p className={estilos.sobretitulo} id="resumo-mes">{panorama.mes.sobraCentavos >= 0 ? "Sobrou" : "Faltou"} em {rotuloCompetencia(competencia)}</p><BotaoOcultarValores /></div><p className={cn(estilos.saldo, "valor-sensivel")}>{formatarMoeda(panorama.mes.sobraCentavos)}</p><p className={estilos.apoio}>Saldo disponível: <span className="valor-sensivel">{formatarMoeda(panorama.saldoTotalCentavos)}</span>{panorama.aplicadoCentavos > 0 && <> · aplicado: <span className="valor-sensivel">{formatarMoeda(panorama.aplicadoCentavos)}</span></>}</p>
      {/* O número sozinho diz como você está, não o que fazer. A primeira
          prioridade do diagnóstico já existia e só aparecia lá dentro da
          Análise — aqui ela vira o próximo passo, com o destino junto. */}
      <AvisoNoHeroi /></div>
      </div>

    {/* O resultado e a decisão ficam na mesma superfície. A faixa branca anterior
        ocupava uma dobra inteira e quebrava a leitura do mês em duas peças. */}
    {proximoPasso && primeiraPrioridade && (
      <div className={estilos.passoIntegrado}>
        <p className={estilos.sobretitulo}>Seu próximo passo</p>
        <h2>{primeiraPrioridade.titulo}</h2>
        <p>{primeiraPrioridade.acao}</p>
        <Link href={proximoPasso.href}>{proximoPasso.texto}<ArrowRight size={16} aria-hidden /></Link>
      </div>
    )}

    {/* Os valores de apoio explicam o resultado sem competir com ele. */}
      <dl className={estilos.numerosDeApoio}><div><dt>Entrou</dt><dd className="text-positivo valor-sensivel">{formatarMoeda(panorama.mes.receitasCentavos)}</dd></div><div><dt>Saiu</dt><dd className="text-negativo valor-sensivel">{formatarMoeda(panorama.mes.despesasCentavos)}</dd></div><div><dt>Saúde</dt><dd>{diagnostico.nota}<small>/100</small></dd></div></dl>
    </section>

    <section className={estilos.painel} aria-labelledby="cartoes-titulo">
      <Cabecalho titulo="Cartões e faturas" id="cartoes-titulo" href="/cartoes" acao="Ver cartões" />
      {cartoes.length ? <div className={estilos.listaCartoes}>{cartoes.map((cartao) => {
        const atual = valorDoMes(cartao.transacoes, competencia)
        // Fecha, vence e a proxima fatura: as tres perguntas de quem olha um
        // cartao. Lancado e parcela ainda nao lancada somam, e o rotulo avisa
        // quando ha previsao no meio — antes um escondia o outro.
        const proximaCompetencia = mesesFuturos[1]
        const confirmadoProximo = valorDoMes(cartao.transacoes, proximaCompetencia)
        const previstoProximo = cartao.parcelamentos.flatMap((p) => p.parcelas).filter((p) => p.competencia === proximaCompetencia).reduce((soma, p) => soma + p.valorCentavos, 0)
        const proxima = confirmadoProximo + previstoProximo
        return <Link href="/cartoes" key={cartao.id} className={estilos.cartaoBanco} style={{ "--cor-banco": corDoBanco(cartao.instituicao) } as CSSProperties}><IdentidadeBanco instituicao={cartao.instituicao} nome={cartao.nome} className={estilos.iconeBanco} /><span className={estilos.dadosLinha}><strong>{cartao.nome}</strong><small>{cartao.instituicao ?? "Cartão de crédito"}</small></span><span className={estilos.faturaAtual}><small>Fatura atual</small><strong>{formatarMoeda(Math.max(0, atual))}</strong></span><span className={estilos.proximas}><span><small>{diasAteVencer(cartao.diaVencimento) === null ? "Vencimento" : "Vence em"}</small><b>{diasAteVencer(cartao.diaVencimento) === null ? "não informado" : `${diasAteVencer(cartao.diaVencimento)} dias`}</b></span><span><small title={previstoProximo ? `Inclui ${formatarMoeda(previstoProximo)} em parcelas previstas` : undefined}>{rotuloCompetencia(proximaCompetencia, true)}</small><b>{formatarMoeda(Math.max(0, proxima))}</b></span></span><ArrowRight className={estilos.seta} /></Link>
      })}</div> : <Link href="/configuracoes" className={estilos.vazio}>Cadastrar primeiro cartão <ArrowRight /></Link>}
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

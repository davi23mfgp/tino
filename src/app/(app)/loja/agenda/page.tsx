"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CalendarDays, Phone, Plus, Square, SquareCheck, Wrench } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { numeroDaOrdem, prazoDaOrdem, rotuloDaEtapa, type Etapa, type ItemDaAgenda } from "@/lib/loja/agenda"
import { TrilhaLoja } from "@/components/trilha-loja"
import { showToast } from "@/components/ui/toast"

import { Reais, Selo } from "../clientes/comum"
import base from "../clientes/clientes.module.css"
import { NovoCompromisso, OrdemDeServico, type ClienteSimples, type ModoAssistencia, type OrdemParaEditar } from "./dialogos"
import { tipoDaSubarea } from "@/lib/loja/assistencia"
import { FichaDaOrdem } from "./ficha-os"
import { PecaAoTino } from "./peca-ao-tino"
import estilos from "./agenda.module.css"

interface OrdemDaLista {
  id: string
  numero: number
  objeto: string
  servico: string
  etapa: Etapa
  prazoEm: string | null
  valorCentavos: number | null
  cliente: { id: string; nome: string; telefone: string | null }
}

interface DadosDaAgenda {
  loja: { nome: string; area: string | null; subarea: string | null }
  modelosUsados: string[]
  hoje: string
  dia: string
  semana: { dia: string; nome: string; numero: string; quantidade: number }[]
  itens: ItemDaAgenda[]
  ordens: OrdemDaLista[]
  clientes: ClienteSimples[]
}

const NOMES = { dom: "domingo", seg: "segunda", ter: "terça", qua: "quarta", qui: "quinta", sex: "sexta", "sáb": "sábado" } as Record<string, string>
const ICONES = { compromisso: CalendarDays, os: Wrench, retorno: Phone }

/**
 * Agenda, opção A do passo 37 (Davi, 05/10/2026): o dia em linha do tempo.
 * Junta o compromisso marcado, o prazo da OS e o retorno combinado com o
 * cliente; embaixo, as OS abertas. No computador, a semana fica à esquerda e
 * a ficha da OS à direita; no celular, a ficha toma a tela.
 */
export default function PaginaAgenda() {
  return (
    <Suspense fallback={null}>
      <AgendaDoDia />
    </Suspense>
  )
}

function AgendaDoDia() {
  const parametros = useSearchParams()
  const [dados, setDados] = useState<DadosDaAgenda | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [dia, setDia] = useState<string | null>(null)
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)
  const [compromisso, setCompromisso] = useState(false)
  const [ordemDialogo, setOrdemDialogo] = useState<{ orcamentoId?: string | null; ordem?: OrdemParaEditar | null } | null>(null)

  const carregar = useCallback(async (escolhido?: string | null) => {
    try {
      setErro(null)
      setDados(await buscar<DadosDaAgenda>(`/api/loja/agenda${escolhido ? `?dia=${escolhido}` : ""}`))
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui abrir a agenda.")
    }
  }, [])

  useEffect(() => {
    void carregar(dia)
  }, [carregar, dia])

  // ?os=<id> abre a ficha; ?nova-os=<orçamento> abre a OS a partir do
  // orçamento aprovado (o botão "Abrir OS" do aviso do sino). Pelo hook, e não
  // só na montagem: o sino pode ser tocado com a Agenda já aberta, e aí o
  // endereço muda sem a página recarregar.
  const pedidoOs = parametros.get("os")
  const pedidoNovaOs = parametros.get("nova-os")
  useEffect(() => {
    if (pedidoOs) setSelecionada(pedidoOs)
  }, [pedidoOs])
  useEffect(() => {
    if (pedidoNovaOs) setOrdemDialogo({ orcamentoId: pedidoNovaOs })
  }, [pedidoNovaOs])

  // No computador a ficha não fica vazia: abre a primeira OS aberta.
  useEffect(() => {
    if (!dados || selecionada) return
    if (window.matchMedia("(min-width: 1024px)").matches) {
      const primeira = dados.ordens.find((ordem) => ordem.etapa !== "ENTREGUE")
      if (primeira) setSelecionada(primeira.id)
    }
  }, [dados, selecionada])

  function abrir(id: string | null) {
    setSelecionada(id)
    const url = new URL(window.location.href)
    url.searchParams.delete("nova-os")
    if (id) url.searchParams.set("os", id)
    else url.searchParams.delete("os")
    window.history.replaceState(null, "", url)
    if (id && !window.matchMedia("(min-width: 1024px)").matches) window.scrollTo({ top: 0 })
  }

  async function marcar(item: ItemDaAgenda) {
    try {
      await enviar(`/api/loja/agenda/compromissos/${item.id}`, { feito: !item.feito }, "PATCH")
      await carregar(dia)
    } catch (falha) {
      showToast(falha instanceof Error ? falha.message : "Não consegui marcar.", { variant: "error" })
    }
  }

  // A área Assistência abre a OS pela entrada do aparelho (passo 39).
  const assistencia = useMemo<ModoAssistencia | null>(
    () => (dados?.loja.area === "assistencia" ? { tipoInicial: tipoDaSubarea(dados.loja.subarea), modelosUsados: dados.modelosUsados } : null),
    [dados],
  )
  const abertas = useMemo(() => dados?.ordens.filter((ordem) => ordem.etapa !== "ENTREGUE") ?? [], [dados])
  const diaAtual = dados?.semana.find((linha) => linha.dia === dados.dia)
  const tituloDoDia = dados && diaAtual
    ? `${dados.dia === dados.hoje ? "Hoje, " : ""}${NOMES[diaAtual.nome] ?? diaAtual.nome} ${diaAtual.numero}/${dados.dia.slice(5, 7)}`
    : ""

  const linhaDoItem = (item: ItemDaAgenda) => {
    const Icone = ICONES[item.tipo]
    const conteudo = (
      <>
        <span className={estilos.icone}><Icone aria-hidden /></span>
        <span>
          <b>{item.titulo}</b>
          {item.sub && <small>{item.sub}</small>}
          {item.selo && <span className={estilos.selo} style={{ display: "block" }}><Selo texto={item.selo.texto} tom={item.selo.tom === "neutro" ? undefined : item.selo.tom} /></span>}
        </span>
      </>
    )
    return (
      <div key={`${item.tipo}-${item.id}`} className={estilos.linha}>
        <span className={estilos.hora}>{item.hora ?? "dia"}</span>
        {item.tipo === "compromisso" ? (
          <div className={`${base.bloco} ${estilos.item}`} data-feito={item.feito ? "" : undefined}>
            {conteudo}
            <button type="button" className={estilos.marcar} aria-pressed={item.feito} aria-label={item.feito ? `Desmarcar: ${item.titulo}` : `Feito: ${item.titulo}`} onClick={() => void marcar(item)}>
              {item.feito ? <SquareCheck aria-hidden /> : <Square aria-hidden />}
            </button>
          </div>
        ) : item.tipo === "os" ? (
          <button type="button" className={`${base.bloco} ${estilos.item}`} onClick={() => abrir(item.id)}>{conteudo}</button>
        ) : (
          <Link className={`${base.bloco} ${estilos.item}`} href={`/loja/clientes?cliente=${item.id}`}>{conteudo}</Link>
        )}
      </div>
    )
  }

  return (
    <div className={base.pagina}>
      <TrilhaLoja pagina="Agenda" />

      <div className={base.topo}>
        <p>O que fazer hoje, e em que pé está cada serviço.</p>
        <div className={base.botoes}>
          <button type="button" className={base.botao} onClick={() => setCompromisso(true)}><Plus aria-hidden />Compromisso</button>
          <button type="button" className={base.botao} data-principal onClick={() => setOrdemDialogo({})}><Plus aria-hidden />Nova OS</button>
        </div>
      </div>

      {erro && <p className={base.erro}>{erro}</p>}
      {!dados && !erro && <p className={`${base.bloco} ${base.vazio}`}>Carregando a agenda…</p>}

      {dados && (
        <div className={estilos.grade} data-ficha={selecionada ? "" : undefined}>
          <nav className={estilos.dias} aria-label="Dias da semana">
            <p>Esta semana</p>
            {dados.semana.map((linha) => (
              <button key={linha.dia} type="button" className={estilos.diaLista} aria-pressed={linha.dia === dados.dia} onClick={() => setDia(linha.dia)}>
                <span>{linha.nome} {linha.numero}/{linha.dia.slice(5, 7)}</span>
                <small>{linha.quantidade || "livre"}</small>
              </button>
            ))}
          </nav>

          <div className={estilos.meio}>
            <PecaAoTino aoMarcar={(marcado) => { if (marcado === dados.dia) void carregar(dia); else setDia(marcado) }} />

            <div className={estilos.faixa} role="group" aria-label="Dias da semana">
              {dados.semana.map((linha) => (
                <button key={linha.dia} type="button" className={estilos.diaFaixa} aria-pressed={linha.dia === dados.dia} data-hoje={linha.dia === dados.hoje ? "" : undefined} onClick={() => setDia(linha.dia)} aria-label={`${NOMES[linha.nome] ?? linha.nome} ${linha.numero}, ${linha.quantidade} na agenda`}>
                  <span>{linha.nome}</span>
                  <b>{linha.numero}</b>
                  <i aria-hidden>{Array.from({ length: Math.min(linha.quantidade, 3) }, (_, i) => <em key={i} className={estilos.ponto} />)}</i>
                </button>
              ))}
            </div>

            <div className={base.titulo}><h2>{tituloDoDia}</h2><span>{dados.itens.length} na agenda</span></div>
            {dados.itens.length === 0 ? (
              <p className={`${base.bloco} ${base.vazio}`}>Nada marcado para este dia. Compromisso, prazo de OS e retorno de cliente aparecem aqui.</p>
            ) : (
              dados.itens.map(linhaDoItem)
            )}

            <div className={base.titulo} style={{ marginTop: 8 }}><h2>Ordens de serviço abertas</h2><span>{abertas.length}</span></div>
            {abertas.length === 0 ? (
              <p className={`${base.bloco} ${base.vazio}`}>Nenhuma OS aberta. Abra uma quando um aparelho ficar com a loja.</p>
            ) : (
              <div className={`${base.bloco} ${base.lista}`}>
                {abertas.map((ordem) => {
                  const prazo = prazoDaOrdem(ordem.prazoEm ? new Date(ordem.prazoEm) : null, ordem.etapa, new Date())
                  return (
                    <button key={ordem.id} type="button" className={estilos.ordemLinha} aria-current={ordem.id === selecionada} onClick={() => abrir(ordem.id)}>
                      <span>{numeroDaOrdem(ordem.numero)}</span>
                      <span><b className={base.nome}>{ordem.cliente.nome}</b><span className={base.sub}>{ordem.objeto}, {ordem.servico.toLowerCase()} · <span style={prazo.tom === "atencao" ? { color: "var(--atencao)" } : undefined}>{prazo.texto}</span></span></span>
                      <span>
                        {ordem.valorCentavos !== null ? <span className={base.valor} style={{ fontSize: "calc(15px * var(--escala-letra))" }}><Reais centavos={ordem.valorCentavos} /></span> : <span className={base.sub}>sem preço ainda</span>}
                        <Selo texto={rotuloDaEtapa(ordem.etapa).toLowerCase()} tom={ordem.etapa === "PRONTO" ? "positivo" : prazo.tom === "atencao" ? "atencao" : undefined} />
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className={estilos.lado}>
            {selecionada ? (
              <FichaDaOrdem
                id={selecionada}
                atualizar={versao}
                aoVoltar={() => abrir(null)}
                aoMudar={() => void carregar(dia)}
                aoEditar={(ordem) => setOrdemDialogo({ ordem })}
              />
            ) : (
              <p className={`${base.bloco} ${base.vazio}`}>Escolha uma ordem de serviço para ver a ficha.</p>
            )}
          </div>
        </div>
      )}

      <NovoCompromisso
        aberto={compromisso}
        aoFechar={() => setCompromisso(false)}
        aoSalvar={() => { setCompromisso(false); void carregar(dia) }}
        dia={dados?.dia ?? ""}
        clientes={dados?.clientes ?? []}
        ordens={abertas.map((ordem) => ({ id: ordem.id, numero: ordem.numero, objeto: ordem.objeto, cliente: ordem.cliente }))}
      />
      <OrdemDeServico
        aberto={ordemDialogo !== null}
        aoFechar={() => setOrdemDialogo(null)}
        aoSalvar={(id) => { setOrdemDialogo(null); abrir(id); setVersao((atual) => atual + 1); void carregar(dia) }}
        clientes={dados?.clientes ?? []}
        orcamentoId={ordemDialogo?.orcamentoId ?? null}
        ordem={ordemDialogo?.ordem ?? null}
        assistencia={assistencia}
      />
    </div>
  )
}

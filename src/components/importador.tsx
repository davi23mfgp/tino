"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check, ChevronDown, FileText, Mail, Upload } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { Checkbox } from "@/components/ui/checkbox"
import { SeletorCategoria, type CategoriaSelecionavel } from "@/components/seletor-categoria"
import estilos from "./importador.module.css"

interface Conta {
  id: string
  nome: string
  tipo: string
}

interface LancamentoPrevia {
  data: string
  descricao: string
  descricaoSugerida: string
  valorCentavos: number
  tipo: "RECEITA" | "DESPESA"
  possivelDuplicada?: boolean
  hashImport: string
  duplicada: boolean
  categoriaId?: string
  categoriaNome?: string
  confianca: number
  dataCompra?: string
  parcelaAtual?: number
  parcelasTotal?: number
  categoriaPelaIa?: boolean
}

interface Previa {
  formato: "ofx" | "csv" | "pdf"
  total: number
  novas: number
  duplicadas: number
  semCategoria: number
  lancamentos: LancamentoPrevia[]
  avisos: string[]
  conferencia?: { informadoCentavos: number; lidoCentavos: number }
  faturaPdf?: boolean
  lidoPelaIa?: boolean
  competenciaFatura?: string
  diaVencimento?: number
  parcelasFuturas?: { compras: number; totalCentavos: number; porMes: { competencia: string; totalCentavos: number }[] }
  futuroInformadoCentavos?: number
}

type Filtro = "todos" | "sem-categoria" | "existiam"
const diaCurto = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" })
const tamanho = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`)

/**
 * Importar extrato ou fatura (Davi, 28/09: opção A do canvas, passo a passo,
 * com a linha de conta da B).
 *
 * Três passos à vista — arquivo, conferir, pronto — porque é isso que a
 * pessoa faz, e a barra diz em qual ela está. Na conferência, o resumo em
 * uma frase (quantos, quanto entra, quanto sai) no lugar das quatro caixas
 * de números; a lista por dia, como no extrato; e a categoria de cada linha
 * dá para escolher ali mesmo, sem importar e corrigir depois.
 *
 * `contaInicial` fixa a conta: é a aba Importar do cartão.
 */
export function Importador({ contaInicial = "", aoConcluir }: { contaInicial?: string; aoConcluir?: () => void }) {
  const [contas, setContas] = useState<Conta[]>([])
  const [categorias, setCategorias] = useState<CategoriaSelecionavel[]>([])
  const [contaId, setContaId] = useState(contaInicial)
  const [recebidoId, setRecebidoId] = useState<string | null>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [faturaCartao, setFaturaCartao] = useState(Boolean(contaInicial))
  const [previa, setPrevia] = useState<Previa | null>(null)
  const [senhaPdf, setSenhaPdf] = useState("")
  const [pedirSenha, setPedirSenha] = useState<{ senhaIncorreta: boolean; erro: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [importadas, setImportadas] = useState<number | null>(null)
  const [filtro, setFiltro] = useState<Filtro>("todos")
  const [arrastando, setArrastando] = useState(false)

  useEffect(() => {
    buscar<Conta[]>("/api/contas").then((lista) => {
      setContas(lista)
      const inicial = lista.find((c) => c.id === contaInicial) ?? lista[0]
      setContaId(inicial?.id ?? "")
      setFaturaCartao(inicial?.tipo === "CARTAO_CREDITO")
    }).catch(() => setErro("Não foi possível carregar as contas. Recarregue a página."))
    buscar<CategoriaSelecionavel[]>("/api/categorias").then(setCategorias).catch(() => {})
  }, [contaInicial])

  const conta = contas.find((c) => c.id === contaId)

  function trocarConta(id: string) {
    setContaId(id)
    // Conta de cartão já diz que o arquivo é fatura: ninguém precisa lembrar
    // de ligar a chave. Continua dando para desligar.
    setFaturaCartao(contas.find((c) => c.id === id)?.tipo === "CARTAO_CREDITO")
    setPrevia(null)
    setRecebidoId(null)
    setArquivo(null)
  }

  function escolher(novo: File | null, recebido: string | null = null) {
    setArquivo(novo)
    setRecebidoId(recebido)
    setPrevia(null)
    setPedirSenha(null)
    setSenhaPdf("")
    setErro(null)
    setImportadas(null)
  }

  async function analisar() {
    if (!arquivo || !contaId) return
    setOcupado(true)
    setErro(null)

    const formulario = new FormData()
    formulario.append("arquivo", arquivo)
    formulario.append("contaId", contaId)
    if (faturaCartao) formulario.append("faturaCartao", "1")
    if (senhaPdf) formulario.append("senhaPdf", senhaPdf)

    try {
      const resposta = await fetch("/api/importar", { method: "POST", body: formulario })
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.erro)

      // PDF cifrado não é erro: é uma pergunta. A tela mostra o campo de senha
      // em vez de uma falha genérica que não diz o que fazer.
      if (dados.precisaSenha) {
        setPedirSenha({ senhaIncorreta: dados.senhaIncorreta, erro: dados.erro })
        setPrevia(null)
        return
      }

      setPedirSenha(null)
      setFiltro("todos")
      setPrevia(dados)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha ao ler o arquivo.")
    } finally {
      setOcupado(false)
    }
  }

  async function confirmar() {
    if (!previa || !arquivo) return
    setOcupado(true)
    setErro(null)

    try {
      const resultado = await enviar<{ importadas: number }>(
        "/api/importar",
        {
          contaId,
          arquivoNome: arquivo.name,
          formato: previa.formato,
          competenciaFatura: previa.competenciaFatura,
          diaVencimento: previa.diaVencimento,
          lancamentos: previa.lancamentos.map((lancamento) => ({
            data: lancamento.data,
            descricao: lancamento.descricaoSugerida,
            descricaoOriginal: lancamento.descricao,
            valorCentavos: lancamento.valorCentavos,
            tipo: lancamento.tipo,
            categoriaId: lancamento.categoriaId ?? null,
            hashImport: lancamento.hashImport,
            duplicada: lancamento.duplicada,
            parcelaAtual: lancamento.parcelaAtual,
            parcelasTotal: lancamento.parcelasTotal,
            dataCompra: lancamento.dataCompra,
          })),
        },
        "PUT",
      )
      if (recebidoId) {
        await enviar(`/api/faturas-email/${recebidoId}`, {}, "DELETE")
        setRecebidoId(null)
      }
      aoConcluir?.()
      setImportadas(resultado.importadas)
      setPrevia(null)
      setArquivo(null)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha ao importar.")
    } finally {
      setOcupado(false)
    }
  }

  /** Muda uma linha da prévia e refaz as contagens a partir da lista. */
  function mudarLinha(hash: string, mudanca: Partial<LancamentoPrevia>) {
    setPrevia((atual) => {
      if (!atual) return atual
      const lancamentos = atual.lancamentos.map((l) => (l.hashImport === hash ? { ...l, ...mudanca } : l))
      return {
        ...atual,
        lancamentos,
        novas: lancamentos.filter((l) => !l.duplicada).length,
        duplicadas: lancamentos.filter((l) => l.duplicada).length,
        semCategoria: lancamentos.filter((l) => !l.categoriaId && !l.duplicada).length,
      }
    })
  }

  const etapa = importadas !== null ? 3 : previa ? 2 : 1

  return (
    <div className={estilos.pagina}>
      <ol className={estilos.passos} aria-label="Etapas da importação">
        {["Arquivo", "Conferir", "Pronto"].map((nome, indice) => (
          <li key={nome} aria-current={etapa === indice + 1 ? "step" : undefined} data-feito={etapa > indice + 1 || undefined}>
            <i>{etapa > indice + 1 ? <Check className="size-3" strokeWidth={3} /> : indice + 1}</i>{nome}
          </li>
        ))}
      </ol>

      {etapa === 1 && (
        <div className={estilos.coluna} style={{ maxWidth: 620 }}>
          <section className={estilos.bloco}>
            {/* A linha de conta da opção B (Davi, 28/09): "Conta · Conta
                corrente", no lugar das pílulas de cada conta. */}
            <label className={estilos.campo}>
              <span>Conta</span>
              <select value={contaId} disabled={Boolean(contaInicial) || ocupado} onChange={(evento) => trocarConta(evento.target.value)}>
                {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              {!contaInicial && <ChevronDown aria-hidden />}
            </label>

            {arquivo ? (
              <div className={estilos.arquivo}>
                <span aria-hidden><FileText /></span>
                <div><strong>{arquivo.name}</strong><small>{tamanho(arquivo.size)}{recebidoId ? " · recebido por e-mail" : ""}</small></div>
                <button type="button" onClick={() => escolher(null)}>trocar</button>
              </div>
            ) : (
              <label
                className={estilos.zona}
                data-arrastando={arrastando || undefined}
                onDragOver={(evento) => { evento.preventDefault(); setArrastando(true) }}
                onDragLeave={() => setArrastando(false)}
                onDrop={(evento) => { evento.preventDefault(); setArrastando(false); const solto = evento.dataTransfer.files[0]; if (solto) escolher(solto) }}
              >
                <input type="file" accept=".ofx,.qfx,.csv,.txt,.pdf" onChange={(evento) => escolher(evento.target.files?.[0] ?? null)} aria-label="Escolher arquivo do extrato ou da fatura" />
                <span aria-hidden><Upload /></span>
                <strong>Escolher arquivo</strong>
                <small>OFX, CSV ou PDF do banco · ou solte aqui</small>
              </label>
            )}

            {pedirSenha && (
              <div className={estilos.senha}>
                <p>{pedirSenha.erro}</p>
                <input type="password" value={senhaPdf} onChange={(evento) => setSenhaPdf(evento.target.value)} placeholder="senha do arquivo" autoComplete="off" aria-label="Senha do PDF" />
                <small>A senha é usada só para abrir o arquivo agora e não fica guardada em lugar nenhum.</small>
              </div>
            )}

            <button type="button" role="switch" aria-checked={faturaCartao} className={estilos.interruptor} onClick={() => setFaturaCartao((atual) => !atual)}>
              <span><strong>É fatura de cartão</strong><small>todo lançamento é gasto, menos estorno</small></span>
              <span className={estilos.chave} aria-hidden><i /></span>
            </button>
          </section>

          {contaId && <ReceberPorEmail contaId={contaId} aoEscolher={(recebido, id) => escolher(recebido, id)} />}

          {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
          <button type="button" className={estilos.principal} onClick={() => void analisar()} disabled={!arquivo || !contaId || ocupado}>
            {ocupado ? "Lendo…" : pedirSenha ? "Abrir com a senha" : "Ler arquivo"}
          </button>
        </div>
      )}

      {etapa === 2 && previa && arquivo && (
        <Conferencia
          previa={previa}
          arquivo={arquivo}
          conta={conta?.nome ?? ""}
          categorias={categorias}
          filtro={filtro}
          aoFiltrar={setFiltro}
          aoMudar={mudarLinha}
          aoTrocar={() => { setPrevia(null) }}
          aoImportar={() => void confirmar()}
          ocupado={ocupado}
          erro={erro}
        />
      )}

      {etapa === 3 && (
        <section className={`${estilos.bloco} ${estilos.pronto}`} style={{ maxWidth: 620 }}>
          <span aria-hidden><Check /></span>
          <strong>{importadas === 1 ? "1 lançamento importado" : `${importadas} lançamentos importados`}</strong>
          <p className={estilos.apoio}>Já estão no extrato de {conta?.nome ?? "sua conta"}.</p>
          <div className={estilos.botoes}>
            <Link href="/transacoes" className={estilos.secundario}>Ver no extrato</Link>
            <button type="button" className={estilos.principal} onClick={() => setImportadas(null)}>Importar outro</button>
          </div>
        </section>
      )}
    </div>
  )
}

function Conferencia({ previa, arquivo, conta, categorias, filtro, aoFiltrar, aoMudar, aoTrocar, aoImportar, ocupado, erro }: {
  previa: Previa
  arquivo: File
  conta: string
  categorias: CategoriaSelecionavel[]
  filtro: Filtro
  aoFiltrar: (filtro: Filtro) => void
  aoMudar: (hash: string, mudanca: Partial<LancamentoPrevia>) => void
  aoTrocar: () => void
  aoImportar: () => void
  ocupado: boolean
  erro: string | null
}) {
  const novos = previa.lancamentos.filter((l) => !l.duplicada)
  const entra = novos.filter((l) => l.tipo === "RECEITA").reduce((soma, l) => soma + l.valorCentavos, 0)
  const sai = novos.filter((l) => l.tipo === "DESPESA").reduce((soma, l) => soma + l.valorCentavos, 0)
  const datas = previa.lancamentos.map((l) => l.data).sort()
  const periodo = datas.length ? (diaCurto(datas[0]) === diaCurto(datas[datas.length - 1]) ? `em ${diaCurto(datas[0])}` : `de ${diaCurto(datas[0])} a ${diaCurto(datas[datas.length - 1])}`) : ""

  const visiveis = previa.lancamentos.filter((l) => filtro === "todos" || (filtro === "sem-categoria" ? !l.categoriaId && !l.duplicada : l.duplicada))
  // Agrupado por dia, na ordem em que o banco mandou (a mais nova primeiro).
  const porDia = new Map<string, LancamentoPrevia[]>()
  for (const l of visiveis) porDia.set(l.data.slice(0, 10), [...(porDia.get(l.data.slice(0, 10)) ?? []), l])
  const dias = [...porDia.entries()]

  const fecha = previa.conferencia && previa.conferencia.lidoCentavos === previa.conferencia.informadoCentavos

  return (
    <div className={estilos.conferir}>
      <div className={estilos.coluna}>
        <div className={estilos.arquivo}>
          <span aria-hidden><FileText /></span>
          <div><strong>{arquivo.name}</strong><small>{conta}{periodo ? ` · ${periodo}` : ""}</small></div>
          <button type="button" onClick={aoTrocar}>trocar</button>
        </div>

        <section className={estilos.bloco}>
          <div className={estilos.resumo}>
            <strong>{previa.novas === 1 ? "1 lançamento novo" : `${previa.novas} lançamentos novos`}</strong>
            <p className="valor-sensivel">
              {entra > 0 && <>entram <b data-tom="entra">{formatarMoeda(entra)}</b> · </>}
              saem <b>{formatarMoeda(sai)}</b>
              {previa.duplicadas > 0 && <> · {previa.duplicadas} já {previa.duplicadas === 1 ? "existia" : "existiam"} e fica{previa.duplicadas === 1 ? "" : "m"} de fora</>}
            </p>
          </div>

          {fecha && <p className={estilos.nota} data-tom="bom">A soma do que foi lido fecha com o total da fatura: {formatarMoeda(previa.conferencia!.informadoCentavos)}.</p>}
          {previa.parcelasFuturas && previa.parcelasFuturas.compras > 0 && (
            <div className={estilos.nota}>
              {previa.parcelasFuturas.compras} compra(s) parcelada(s) seguem nas próximas faturas: {formatarMoeda(previa.parcelasFuturas.totalCentavos)} ao todo.
              {previa.futuroInformadoCentavos !== undefined && <> O banco informa {formatarMoeda(previa.futuroInformadoCentavos)} comprometidos.</>}
              {previa.parcelasFuturas.porMes.length > 0 && (
                <ul>{previa.parcelasFuturas.porMes.slice(0, 6).map((mes) => <li key={mes.competencia}><span>{rotuloCompetencia(mes.competencia, true)}</span><span>{formatarMoeda(mes.totalCentavos)}</span></li>)}</ul>
              )}
            </div>
          )}
          {previa.avisos.map((aviso) => <p key={aviso} className={estilos.nota} data-tom="atencao">{aviso}</p>)}

          {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
          <button type="button" className={estilos.principal} onClick={aoImportar} disabled={ocupado || previa.novas === 0}>
            {ocupado ? "Importando…" : previa.novas === 1 ? "Importar 1 lançamento" : `Importar ${previa.novas} lançamentos`}
          </button>
        </section>
      </div>

      <section className={estilos.bloco}>
        <div className={estilos.filtros} role="group" aria-label="Filtrar a prévia">
          <button type="button" aria-pressed={filtro === "todos"} onClick={() => aoFiltrar("todos")}>Todos · {previa.total}</button>
          <button type="button" aria-pressed={filtro === "sem-categoria"} data-alerta={previa.semCategoria > 0 || undefined} onClick={() => aoFiltrar("sem-categoria")}>Sem categoria · {previa.semCategoria}</button>
          <button type="button" aria-pressed={filtro === "existiam"} onClick={() => aoFiltrar("existiam")}>Já existiam · {previa.duplicadas}</button>
        </div>
        {dias.length === 0 ? (
          <p className={estilos.vazio}>{filtro === "sem-categoria" ? "Todos os lançamentos novos têm categoria." : "Nenhum lançamento aqui."}</p>
        ) : (
          <div className={estilos.lista}>
            {dias.map(([dia, linhas]) => (
              <div key={dia} className={estilos.dia}>
                <p>{diaCurto(dia)}</p>
                {linhas.map((l) => (
                  <div key={l.hashImport} className={estilos.linha} data-fora={l.duplicada || undefined}>
                    <div>
                      <strong>{l.descricaoSugerida}</strong>
                      {l.duplicada && !l.possivelDuplicada ? (
                        <small>já importado antes</small>
                      ) : (
                        <SeletorCategoria
                          desabilitado={ocupado || l.duplicada}
                          rotulo={`Categoria de ${l.descricaoSugerida}`}
                          vazio="escolher categoria"
                          opcoes={categorias.filter((c) => !c.tipo || c.tipo === l.tipo)}
                          valor={l.categoriaId ?? null}
                          aoMudar={(id) => aoMudar(l.hashImport, { categoriaId: id ?? undefined, categoriaNome: categorias.find((c) => c.id === id)?.nome, categoriaPelaIa: false })}
                          className={l.categoriaId ? estilos.etiqueta : `${estilos.etiqueta} ${estilos.etiquetaVazia}`}
                        />
                      )}
                      {/* Sugestão da IA fica dita: é palpite, e a pessoa confere. */}
                      {l.categoriaPelaIa && l.categoriaId && <small>categoria sugerida pela IA</small>}
                      {l.dataCompra && <small>compra em {new Date(l.dataCompra).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</small>}
                      {l.possivelDuplicada && (
                        <label className={estilos.incluir}>
                          <Checkbox aria-label={`Incluir ${l.descricaoSugerida} mesmo com possível repetição`} checked={!l.duplicada} onChange={(evento) => aoMudar(l.hashImport, { duplicada: !evento.target.checked })} />
                          possível repetição do celular · incluir
                        </label>
                      )}
                    </div>
                    <b data-tipo={l.tipo} className="valor-sensivel">{l.tipo === "RECEITA" ? "+ " : "− "}{formatarMoeda(l.valorCentavos)}</b>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

interface FaturasRecebidas { configurado: boolean; endereco: string | null; arquivos: { id: string; arquivoNome: string; criadoEm: string }[] }

/**
 * Receber a fatura por e-mail: uma linha. Antes era um cartão inteiro no topo
 * da tela, antes do que a pessoa veio fazer, mesmo desligado.
 */
function ReceberPorEmail({ contaId, aoEscolher }: { contaId: string; aoEscolher: (arquivo: File, id: string) => void }) {
  const [dados, setDados] = useState<FaturasRecebidas | null>(null)
  const [erro, setErro] = useState("")
  const [abrindo, setAbrindo] = useState(false)

  useEffect(() => {
    const controle = new AbortController()
    setDados(null)
    buscar<FaturasRecebidas>(`/api/faturas-email?contaId=${encodeURIComponent(contaId)}`, { signal: controle.signal })
      .then(setDados)
      .catch(() => { if (!controle.signal.aborted) setErro("Não foi possível carregar as faturas recebidas.") })
    return () => controle.abort()
  }, [contaId])

  async function abrir(id: string, nome: string) {
    setAbrindo(true)
    setErro("")
    try {
      const resposta = await fetch(`/api/faturas-email/${id}`)
      if (!resposta.ok) throw new Error()
      aoEscolher(new File([await resposta.blob()], nome, { type: nome.endsWith(".pdf") ? "application/pdf" : "application/octet-stream" }), id)
    } catch {
      setErro("Não foi possível abrir o arquivo.")
    } finally {
      setAbrindo(false)
    }
  }

  if (!dados && !erro) return null
  return (
    <section className={`${estilos.bloco} ${estilos.email}`} data-desligado={!dados?.configurado || undefined}>
      <div>
        <span aria-hidden><Mail /></span>
        <p>
          Receber por e-mail
          <small>{dados?.configurado ? (dados.endereco ? <>encaminhe a fatura para <code>{dados.endereco}</code></> : "ligado") : "ainda não ativado no servidor"}</small>
        </p>
      </div>
      {dados?.arquivos.map((recebido) => (
        <div key={recebido.id}>
          <span aria-hidden><FileText /></span>
          <p>{recebido.arquivoNome}<small>chegou em {new Date(recebido.criadoEm).toLocaleDateString("pt-BR")}</small></p>
          <button type="button" disabled={abrindo} onClick={() => void abrir(recebido.id, recebido.arquivoNome)}>Conferir</button>
        </div>
      ))}
      {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
    </section>
  )
}

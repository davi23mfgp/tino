"use client"

import { useEffect, useState } from "react"
import { ChevronRight, Plus, Search, Store } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { ICONES_ESCOLHIVEIS } from "@/lib/icone-categoria"
import { MARCAS } from "@/lib/marcas"
import { Input } from "@/components/ui/input"
import { SeletorEmoji } from "@/components/ui/seletor-emoji"
import { showToast } from "@/components/ui/toast"
import { SimboloCategoria } from "@/components/seletor-categoria"
import { useIdentidades } from "@/components/identidades-visuais"
import { LogosDasLojas } from "@/components/logos-das-lojas"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import estilos from "./categorias.module.css"

interface Categoria {
  id: string
  nome: string
  grupo: string
  tipo: "RECEITA" | "DESPESA"
  icone: string | null
  essencial: boolean
  sistema: boolean
  _count?: { transacoes: number }
}
type Tipo = Categoria["tipo"]
type Rascunho = Omit<Categoria, "id" | "sistema" | "_count"> & { id?: string; sistema?: boolean; _count?: Categoria["_count"] }

/// Todos os grupos do banco (`GrupoCategoria`), na ordem da lista. Renda e
/// negócio só fazem sentido para entrada; o resto, para saída.
const GRUPOS: [string, string][] = [
  ["MORADIA", "Moradia"], ["ALIMENTACAO", "Alimentação"], ["TRANSPORTE", "Transporte"], ["SAUDE", "Saúde"], ["EDUCACAO", "Educação"],
  ["LAZER", "Lazer"], ["PESSOAL", "Pessoal"], ["SERVICOS", "Serviços"], ["DIVIDAS", "Dívidas"], ["IMPOSTOS", "Impostos"],
  ["INVESTIMENTO", "Investimento"], ["RENDA", "Renda"], ["NEGOCIO_MEI", "Negócio (MEI)"], ["OUTROS", "Outros"],
]
const DE_ENTRADA = new Set(["RENDA", "NEGOCIO_MEI", "INVESTIMENTO", "OUTROS"])
const gruposDo = (tipo: Tipo) => GRUPOS.filter(([chave]) => (tipo === "RECEITA" ? DE_ENTRADA.has(chave) : chave !== "RENDA"))
const nomeDoGrupo = (chave: string) => GRUPOS.find(([valor]) => valor === chave)?.[1] ?? "Outros"
const SEM_ACENTO = new RegExp("[\\u0300-\\u036f]", "g")
const normalizar = (texto: string) => texto.normalize("NFD").replace(SEM_ACENTO, "").toLowerCase()
const EH_EMOJI = new RegExp("\\p{Extended_Pictographic}|\\p{Regional_Indicator}", "u")
const ICONES_VISIVEIS = 13

/** No computador a edição fica ao lado da lista; no celular, numa folha. */
function useLargo() {
  const [largo, setLargo] = useState(false)
  useEffect(() => {
    const consulta = window.matchMedia("(min-width: 1024px)")
    const mudar = () => setLargo(consulta.matches)
    mudar()
    consulta.addEventListener("change", mudar)
    return () => consulta.removeEventListener("change", mudar)
  }, [])
  return largo
}

/**
 * Categorias (Davi, 28/09: opção A do canvas).
 *
 * A tela antiga só renomeava e trocava emoji: não criava categoria, não mudava
 * grupo, não marcava essencial — que é o que o plano de corte e a reserva
 * usam — e não excluía, embora a API fizesse tudo isso. Agora é uma lista por
 * grupo, dividida em saídas e entradas, e a edição tem tudo. Os logos das
 * lojas viraram uma linha que abre o próprio diálogo, em vez de um cartão
 * aberto no topo antes das categorias.
 */
export default function CategoriasPagina() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const [tentativa, setTentativa] = useState(0)
  const [busca, setBusca] = useState("")
  const [tipo, setTipo] = useState<Tipo>("DESPESA")
  const [editando, setEditando] = useState<Rascunho | null>(null)
  const [logosAbertos, setLogosAbertos] = useState(false)
  const largo = useLargo()
  const { lista: logos } = useIdentidades()

  useEffect(() => {
    const controle = new AbortController()
    setCarregando(true)
    setErro(false)
    buscar<Categoria[]>("/api/categorias", { signal: controle.signal })
      .then((lista) => { if (!controle.signal.aborted) setCategorias(lista) })
      .catch(() => { if (!controle.signal.aborted) setErro(true) })
      .finally(() => { if (!controle.signal.aborted) setCarregando(false) })
    return () => controle.abort()
  }, [tentativa])

  const doTipo = categorias.filter((categoria) => categoria.tipo === tipo)
  const visiveis = doTipo.filter((categoria) => normalizar(categoria.nome).includes(normalizar(busca)))
  const porGrupo = GRUPOS.map(([chave, nome]) => [nome, visiveis.filter((categoria) => categoria.grupo === chave)] as const).filter(([, lista]) => lista.length > 0)
  const conta = (valor: Tipo) => categorias.filter((categoria) => categoria.tipo === valor).length

  function nova() {
    setEditando({ nome: "", grupo: tipo === "RECEITA" ? "RENDA" : "OUTROS", tipo, icone: null, essencial: false })
  }

  function aoSalvar(salva: Categoria) {
    setCategorias((lista) => lista.some((item) => item.id === salva.id) ? lista.map((item) => (item.id === salva.id ? { ...item, ...salva } : item)) : [...lista, { ...salva, _count: { transacoes: 0 } }])
    setEditando(largo ? { ...salva } : null)
    showToast(`${salva.nome} salva`)
  }

  function aoExcluir(id: string, nome: string, movidos: number) {
    setCategorias((lista) => lista.filter((item) => item.id !== id))
    setEditando(null)
    showToast(`${nome} excluída`, { description: movidos ? `${movidos} lançamento(s) mudaram de categoria.` : undefined })
    if (movidos) setTentativa((numero) => numero + 1)
  }

  const editor = editando && (
    <Editor key={editando.id ?? "nova"} rascunho={editando} categorias={categorias} aoSalvar={aoSalvar} aoExcluir={aoExcluir} aoFechar={() => setEditando(null)} />
  )
  const linhaLogos = (
    <button type="button" className={`${estilos.bloco} ${estilos.logosLinha}`} onClick={() => setLogosAbertos(true)}>
      <span aria-hidden><Store /></span>
      <span><strong>Logos das lojas</strong><small>{logos.length ? `${logos.length} seus · ` : ""}{MARCAS.length} reconhecidas sozinhas</small></span>
      <ChevronRight aria-hidden />
    </button>
  )

  return (
    <div className={estilos.pagina}>
      <div className={estilos.corpo}>
        <div className={estilos.coluna}>
          <div className={estilos.barra}>
            <label className={estilos.busca}>
              <Search aria-hidden />
              <input value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar categoria" aria-label="Buscar categoria" />
            </label>
            <button type="button" className={estilos.nova} onClick={nova}><Plus aria-hidden />Nova</button>
          </div>
          <div className={estilos.segmento} role="tablist" aria-label="Saídas ou entradas">
            <button type="button" role="tab" aria-selected={tipo === "DESPESA"} onClick={() => setTipo("DESPESA")}>Saídas · {conta("DESPESA")}</button>
            <button type="button" role="tab" aria-selected={tipo === "RECEITA"} onClick={() => setTipo("RECEITA")}>Entradas · {conta("RECEITA")}</button>
          </div>

          <section className={`${estilos.bloco} ${estilos.lista}`}>
            {carregando ? (
              <p role="status" className={estilos.vazio}>Carregando categorias…</p>
            ) : erro ? (
              <div role="alert" className={estilos.vazio}>Não foi possível carregar as categorias. <button type="button" onClick={() => setTentativa((numero) => numero + 1)}>Tentar de novo</button></div>
            ) : porGrupo.length === 0 ? (
              <p className={estilos.vazio}>Nenhuma categoria com esse nome.</p>
            ) : porGrupo.map(([grupo, lista]) => (
              <div key={grupo} className={estilos.grupo}>
                <p>{grupo} · {lista.length}</p>
                {lista.map((categoria) => (
                  <button key={categoria.id} type="button" className={estilos.linha} aria-current={editando?.id === categoria.id} onClick={() => setEditando({ ...categoria })}>
                    <span className={estilos.circulo}><SimboloCategoria categoria={categoria} tipo={categoria.tipo} /></span>
                    <span>
                      <strong>{categoria.nome}</strong>
                      <small>{categoria._count?.transacoes ?? 0} lançamento{categoria._count?.transacoes === 1 ? "" : "s"}{categoria.essencial && <span className={estilos.selo}>essencial</span>}</small>
                    </span>
                    <ChevronRight aria-hidden />
                  </button>
                ))}
              </div>
            ))}
          </section>
          {!largo && linhaLogos}
        </div>

        {largo && (
          <div className={estilos.coluna}>
            <section className={estilos.bloco}>
              {editor ?? (
                <div className={estilos.dica}>
                  <strong>Escolha uma categoria</strong>
                  <p className={estilos.apoio}>
                    {doTipo.filter((categoria) => categoria.essencial).length} de {doTipo.length} {tipo === "DESPESA" ? "saídas" : "entradas"} são essenciais. Toque numa para mudar nome, ícone, grupo ou se é essencial, ou crie uma nova.
                  </p>
                </div>
              )}
            </section>
            {linhaLogos}
          </div>
        )}
      </div>

      {!largo && (
        <Dialog open={Boolean(editando)} onOpenChange={(aberto) => { if (!aberto) setEditando(null) }}>
          <DialogContent className={estilos.dialogo}>
            <DialogHeader className="sr-only"><DialogTitle>{editando?.id ? `Editar ${editando.nome}` : "Nova categoria"}</DialogTitle><DialogDescription>Nome, ícone, grupo e se é essencial.</DialogDescription></DialogHeader>
            <DialogBody>{editor}</DialogBody>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={logosAbertos} onOpenChange={setLogosAbertos}>
        <DialogContent className={estilos.dialogo}>
          <DialogHeader><DialogTitle>Logos das lojas</DialogTitle><DialogDescription>O logo aparece ao lado da compra no extrato, no cartão e em Anotar.</DialogDescription></DialogHeader>
          <DialogBody><LogosDasLojas /></DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Editor({ rascunho, categorias, aoSalvar, aoExcluir, aoFechar }: {
  rascunho: Rascunho
  categorias: Categoria[]
  aoSalvar: (categoria: Categoria) => void
  aoExcluir: (id: string, nome: string, movidos: number) => void
  aoFechar: () => void
}) {
  const [nome, setNome] = useState(rascunho.nome)
  // O banco guarda "circle" de versões antigas: não é emoji nem ícone
  // escolhido, então entra vazio.
  const [icone, setIcone] = useState(rascunho.icone && (ICONES_ESCOLHIVEIS[rascunho.icone] || EH_EMOJI.test(rascunho.icone)) ? rascunho.icone : "")
  const [grupo, setGrupo] = useState(rascunho.grupo)
  const [essencial, setEssencial] = useState(rascunho.essencial)
  const [todosIcones, setTodosIcones] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [destino, setDestino] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState("")

  const nova = !rascunho.id
  const lancamentos = rascunho._count?.transacoes ?? 0
  const mudou = nova || nome !== rascunho.nome || icone !== (rascunho.icone ?? "") || grupo !== rascunho.grupo || essencial !== rascunho.essencial
  const chaves = Object.keys(ICONES_ESCOLHIVEIS)
  const emoji = EH_EMOJI.test(icone) ? icone : ""

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!nome.trim()) { setErro("Informe o nome da categoria."); return }
    setOcupado(true)
    setErro("")
    try {
      const dados = { nome: nome.trim(), icone: icone || "circle", grupo, essencial: rascunho.tipo === "DESPESA" && essencial }
      const salva = nova
        ? await enviar<Categoria>("/api/categorias", { ...dados, tipo: rascunho.tipo })
        : await enviar<Categoria>(`/api/categorias/${rascunho.id}`, dados, "PATCH")
      aoSalvar(salva)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar.")
    } finally {
      setOcupado(false)
    }
  }

  async function excluir() {
    if (!rascunho.id) return
    setOcupado(true)
    setErro("")
    try {
      const resposta = await enviar<{ lancamentosMovidos: number }>(`/api/categorias/${rascunho.id}${destino ? `?moverPara=${destino}` : ""}`, {}, "DELETE")
      aoExcluir(rascunho.id, rascunho.nome, resposta.lancamentosMovidos)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível excluir.")
    } finally {
      setOcupado(false)
    }
  }

  return (
    <form className={estilos.editor} onSubmit={salvar}>
      <div className={estilos.cabecalho}>
        <span className={estilos.circulo} data-grande><SimboloCategoria categoria={{ nome: nome || rascunho.nome, grupo, icone }} tipo={rascunho.tipo} /></span>
        <span style={{ minWidth: 0 }}>
          <strong>{nome.trim() || (nova ? "Nova categoria" : rascunho.nome)}</strong>
          <small>{nova ? (rascunho.tipo === "RECEITA" ? "de entrada" : "de saída") : `${lancamentos} lançamento${lancamentos === 1 ? "" : "s"}${rascunho.sistema ? " · categoria padrão" : ""}`}</small>
        </span>
      </div>

      <label className={estilos.campo}>
        Nome
        <Input value={nome} onChange={(evento) => setNome(evento.target.value)} maxLength={60} disabled={ocupado} autoFocus={nova} />
      </label>

      <div className={estilos.campo}>
        Ícone
        <div className={estilos.icones}>
          {(todosIcones ? chaves : chaves.slice(0, ICONES_VISIVEIS)).map((chave) => {
            const Icone = ICONES_ESCOLHIVEIS[chave]
            return <button key={chave} type="button" aria-pressed={icone === chave} aria-label={chave.slice(2)} onClick={() => setIcone(icone === chave ? "" : chave)}><Icone aria-hidden /></button>
          })}
          {!todosIcones && <button type="button" className={estilos.mais} onClick={() => setTodosIcones(true)}>+{chaves.length - ICONES_VISIVEIS}</button>}
          <SeletorEmoji valor={emoji} aoMudar={(valor) => setIcone(valor)} desabilitado={ocupado} />
        </div>
      </div>

      <div className={estilos.campo}>
        Grupo
        <div className={estilos.chips}>
          {gruposDo(rascunho.tipo).map(([chave, rotulo]) => <button key={chave} type="button" aria-pressed={grupo === chave} onClick={() => setGrupo(chave)}>{rotulo}</button>)}
        </div>
      </div>

      {rascunho.tipo === "DESPESA" && (
        <button type="button" role="switch" aria-checked={essencial} className={estilos.interruptor} onClick={() => setEssencial((atual) => !atual)}>
          {/* O que a chave muda, dito na hora: é ela que decide onde o plano
              de corte mexe primeiro e quanto a reserva precisa cobrir. */}
          <span><strong>Essencial</strong><small>o plano de corte mexe nela por último, e ela conta na reserva de emergência</small></span>
          <span className={estilos.chave} aria-hidden><i /></span>
        </button>
      )}

      {excluindo && (
        <div className={estilos.confirmar}>
          {lancamentos > 0 ? (
            <label className={estilos.campo}>
              {lancamentos === 1 ? "O lançamento dela vai para:" : `Os ${lancamentos} lançamentos dela vão para:`}
              <select value={destino} onChange={(evento) => setDestino(evento.target.value)}>
                <option value="">ficar sem categoria</option>
                {categorias.filter((categoria) => categoria.tipo === rascunho.tipo && categoria.id !== rascunho.id).map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}
              </select>
            </label>
          ) : <p>Nenhum lançamento usa esta categoria.</p>}
          <p className={estilos.nota}>O limite de orçamento e as regras de categoria dela também saem.</p>
        </div>
      )}

      {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
      <div className={estilos.botoes}>
        {nova ? (
          <button type="button" onClick={aoFechar} disabled={ocupado}>Cancelar</button>
        ) : excluindo ? (
          <button type="button" onClick={() => setExcluindo(false)} disabled={ocupado}>Não excluir</button>
        ) : (
          <button type="button" onClick={() => setExcluindo(true)} disabled={ocupado || rascunho.sistema}>Excluir</button>
        )}
        {excluindo
          ? <button type="button" data-perigo onClick={() => void excluir()} disabled={ocupado}>Excluir de vez</button>
          : <button type="submit" disabled={ocupado || !mudou}>{ocupado ? "Salvando…" : nova ? "Criar" : "Salvar"}</button>}
      </div>
      {rascunho.sistema && <p className={estilos.nota}>Categoria padrão: dá para renomear e ajustar, não para excluir.</p>}
    </form>
  )
}

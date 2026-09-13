"use client"

import { EditorIdentidades } from "@/components/identidades-visuais"
import { useEffect, useState } from "react"
import Link from "next/link"
import { buscar, enviar } from "@/lib/cliente"
import { Cartao } from "@/components/ui/painel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SelectNative } from "@/components/ui/select-native"
import { SimboloCategoria, GRUPOS_CATEGORIA, type CategoriaSelecionavel } from "@/components/seletor-categoria"

function EditarCategoria({ categoria, aoSalvar }: { categoria: CategoriaSelecionavel; aoSalvar: (categoria: CategoriaSelecionavel) => void }) {
  const [icone, setIcone] = useState(categoria.icone ?? "")
  const [nome, setNome] = useState(categoria.nome)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState("")
  async function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!nome.trim()) { setErro("Informe o nome da categoria."); return }
    if (icone !== categoria.icone && icone && !/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(icone)) { setErro("Escolha um emoji ou deixe o campo vazio."); return }
    setOcupado(true); setErro("")
    try {
      const atualizada = await enviar<CategoriaSelecionavel>(`/api/categorias/${categoria.id}`, { nome: nome.trim(), icone: icone || "circle" }, "PATCH")
      aoSalvar(atualizada)
    } catch { setErro("Não foi possível salvar. Tente novamente.") }
    finally { setOcupado(false) }
  }
  return <form onSubmit={salvar} className="flex flex-wrap items-end gap-3 border-b border-pauta py-4">
    <SimboloCategoria categoria={{...categoria, icone}} />
    <label className="min-w-0 flex-1 basis-36 text-sm">Nome<Input value={nome} onChange={e => setNome(e.target.value)} disabled={ocupado} maxLength={80} /></label>
    <label className="w-24 text-sm">Emoji<Input aria-label={`Emoji de ${categoria.nome}`} value={icone} onChange={e => setIcone(e.target.value)} disabled={ocupado} maxLength={24} placeholder="🏠" /></label>
    <Button type="submit" disabled={ocupado || (nome === categoria.nome && icone === (categoria.icone ?? ""))}>{ocupado ? "Salvando…" : "Salvar"}</Button>
    {erro && <p role="alert" className="w-full text-sm text-negativo">{erro}</p>}
  </form>
}
export default function CategoriasPagina() {
  const [categorias, setCategorias] = useState<CategoriaSelecionavel[]>([])
  const [busca, setBusca] = useState("")
  const [grupo, setGrupo] = useState("")
  const [erro, setErro] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    const controle = new AbortController()
    setCarregando(true); setErro(false)
    buscar<CategoriaSelecionavel[]>("/api/categorias", {signal: controle.signal}).then(lista => {if(!controle.signal.aborted) setCategorias(lista)}).catch(() => {if(!controle.signal.aborted) setErro(true)}).finally(() => {if(!controle.signal.aborted) setCarregando(false)})
    return () => controle.abort()
  }, [tentativa])
  const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  const visiveis = categorias.filter(categoria => (!grupo || categoria.grupo === grupo) && normalizar(categoria.nome).includes(normalizar(busca)))
  return <div className="space-y-5"><EditorIdentidades/><Cartao titulo="Suas categorias">
    <p className="mb-4 text-sm text-muted-fg">Personalize nomes e emojis. Seus registros continuam preservados.</p>
    <div className="flex flex-wrap gap-3">
      <Input className="min-w-0 flex-1 basis-40" aria-label="Buscar categorias" placeholder="Buscar categoria" value={busca} onChange={e => setBusca(e.target.value)} />
      <SelectNative aria-label="Grupo de categorias" value={grupo} onChange={e => setGrupo(e.target.value)}><option value="">Todos os grupos</option>{Object.entries(GRUPOS_CATEGORIA).map(([id,nome]) => <option key={id} value={id}>{nome}</option>)}</SelectNative>
    </div>
    {carregando ? <p role="status" className="py-6">Carregando categorias…</p> : erro ? <div role="alert" className="py-6"><p>Não foi possível carregar as categorias.</p><Button onClick={() => setTentativa(n => n+1)}>Tentar novamente</Button></div> : <>
      <p role="status" className="mt-4 text-sm">{visiveis.length} categorias</p>
      {visiveis.map(categoria => <EditarCategoria key={categoria.id} categoria={categoria} aoSalvar={atualizada => setCategorias(lista => lista.map(item => item.id === atualizada.id ? atualizada : item))} />)}
    </>}
    <Button asChild variant="link" className="mt-4"><Link href="/transacoes">Voltar ao extrato</Link></Button>
  </Cartao></div>
}

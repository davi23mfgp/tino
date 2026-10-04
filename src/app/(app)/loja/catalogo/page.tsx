"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { TrilhaLoja } from "@/components/trilha-loja"
import { Input } from "@/components/ui/input"
import { SelectNative } from "@/components/ui/select-native"

import estilos from "./catalogo.module.css"

interface Categoria { id: string; nome: string; imagemUrl: string | null; arquivada: boolean; _count: { produtos: number; servicos: number } }
interface Fornecedor { id: string; nome: string; telefone: string | null; email: string | null; documento: string | null; _count: { produtos: number } }
interface Servico { id: string; nome: string; descricao: string | null; precoCentavos: number; custoEstimadoCentavos: number | null; duracaoMinutos: number | null; categoriaId: string | null; imagemUrl: string | null; ativo: boolean }
interface Produto { id: string; nome: string; sku: string | null; categoriaId: string | null; fornecedorId: string | null; precoCentavos: number }
interface Catalogo { categorias: Categoria[]; fornecedores: Fornecedor[]; servicos: Servico[]; produtos: Produto[] }
type Aba = "produtos" | "servicos" | "categorias" | "fornecedores"

const ABAS: { id: Aba; nome: string }[] = [
  { id: "produtos", nome: "Produtos" },
  { id: "servicos", nome: "Serviços" },
  { id: "categorias", nome: "Categorias" },
  { id: "fornecedores", nome: "Fornecedores" },
]

export default function PaginaCatalogo() {
  const [dados, setDados] = useState<Catalogo | null>(null)
  const [aba, setAba] = useState<Aba>("produtos")
  const [busca, setBusca] = useState("")
  const [categoriaEscolhida, setCategoriaEscolhida] = useState("")
  const [nome, setNome] = useState("")
  const [imagem, setImagem] = useState("")
  const [preco, setPreco] = useState("")
  const [duracao, setDuracao] = useState("")
  const [telefone, setTelefone] = useState("")
  const [email, setEmail] = useState("")
  const [descricao, setDescricao] = useState("")
  const [custo, setCusto] = useState("")
  const [documento, setDocumento] = useState("")
  const [editando, setEditando] = useState<{ tipo: "servico" | "fornecedor"; id: string } | null>(null)
  const [novoAberto, setNovoAberto] = useState(false)
  const [editandoCategoriaId, setEditandoCategoriaId] = useState<string | null>(null)
  const [nomeEdicao, setNomeEdicao] = useState("")
  const [imagemEdicao, setImagemEdicao] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState("")
  const [aviso, setAviso] = useState("")

  const carregar = useCallback(async () => setDados(await buscar<Catalogo>("/api/loja/catalogo")), [])
  useEffect(() => { void carregar().catch((falha) => setErro(falha instanceof Error ? falha.message : "Não consegui abrir o catálogo.")) }, [carregar])

  function limparFormulario() {
    setNome(""); setImagem(""); setPreco(""); setDuracao(""); setTelefone(""); setEmail(""); setDescricao(""); setCusto(""); setDocumento(""); setCategoriaEscolhida(""); setNovoAberto(false); setEditando(null)
  }

  async function executar(operacao: () => Promise<unknown>, sucesso: string) {
    setOcupado(true); setErro(""); setAviso("")
    try { await operacao(); await carregar(); setAviso(sucesso); return true }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não consegui salvar."); return false }
    finally { setOcupado(false) }
  }

  async function salvarNovo(evento: React.FormEvent) {
    evento.preventDefault()
    if (ocupado || !nome.trim()) return
    const salvo = await executar(async () => {
      if (aba === "categorias") await enviar("/api/loja/catalogo", { tipo: "categoria", nome: nome.trim(), imagemUrl: imagem.trim() || null })
      const metodo = editando ? "PATCH" : "POST"
      const identificador = editando ? { id: editando.id } : {}
      if (aba === "fornecedores") await enviar("/api/loja/catalogo", { tipo: "fornecedor", ...identificador, nome: nome.trim(), telefone: telefone.trim() || null, email: email.trim() || null, documento: documento.trim() || null }, metodo)
      if (aba === "servicos") await enviar("/api/loja/catalogo", { tipo: "servico", ...identificador, nome: nome.trim(), descricao: descricao.trim() || null, precoCentavos: paraCentavos(preco), custoEstimadoCentavos: custo ? paraCentavos(custo) : null, duracaoMinutos: duracao ? Number(duracao) : null, categoriaId: categoriaEscolhida || null, imagemUrl: imagem.trim() || null }, metodo)
    }, editando ? "Cadastro atualizado." : "Cadastro salvo.")
    // Só fecha depois de o servidor confirmar: se falhar, os dados digitados ficam.
    if (salvo) limparFormulario()
  }

  async function atualizarProduto(produto: Produto, campo: "categoriaId" | "fornecedorId", valor: string) {
    await executar(() => enviar(`/api/loja/produtos/${produto.id}`, { [campo]: valor || null }, "PATCH"), "Produto atualizado.")
  }

  function abrirEdicao(tipo: "servico" | "fornecedor", registro: Servico | Fornecedor) {
    limparFormulario()
    setAba(tipo === "servico" ? "servicos" : "fornecedores")
    setEditando({ tipo, id: registro.id }); setNome(registro.nome); setNovoAberto(true)
    if (tipo === "servico") {
      const servico = registro as Servico
      setDescricao(servico.descricao ?? ""); setPreco((servico.precoCentavos / 100).toFixed(2).replace(".", ","))
      setCusto(servico.custoEstimadoCentavos === null ? "" : (servico.custoEstimadoCentavos / 100).toFixed(2).replace(".", ","))
      setDuracao(servico.duracaoMinutos?.toString() ?? ""); setCategoriaEscolhida(servico.categoriaId ?? ""); setImagem(servico.imagemUrl ?? "")
    } else {
      const fornecedor = registro as Fornecedor
      setTelefone(fornecedor.telefone ?? ""); setEmail(fornecedor.email ?? ""); setDocumento(fornecedor.documento ?? "")
    }
  }

  const categoriasAtivas = dados?.categorias.filter((categoria) => !categoria.arquivada) ?? []
  const lista = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR")
    if (!dados) return []
    const registros = dados[aba]
    return registros.filter((item) => item.nome.toLocaleLowerCase("pt-BR").includes(termo) && (aba !== "produtos" || !categoriaEscolhida || (item as Produto).categoriaId === categoriaEscolhida))
  }, [dados, aba, busca, categoriaEscolhida])

  return (
    <div className={estilos.pagina}>
      <TrilhaLoja pagina="Catálogo" />
      <header className={estilos.cabeca}>
        <div><h1>Catálogo</h1><p>Produtos, serviços e categorias em um lugar.</p></div>
        {aba === "produtos" ? <Link className={estilos.principal} href="/loja/estoque">Abrir Prateleira</Link> : <button type="button" className={estilos.principal} onClick={() => { limparFormulario(); setNovoAberto(true) }}><Plus aria-hidden /> {aba === "servicos" ? "Novo serviço" : aba === "categorias" ? "Nova categoria" : "Novo fornecedor"}</button>}
      </header>

      <nav className={estilos.abas} aria-label="Seções do catálogo">
        {ABAS.map((item) => <button key={item.id} type="button" aria-current={aba === item.id ? "page" : undefined} onClick={() => { setAba(item.id); setBusca(""); setCategoriaEscolhida(""); limparFormulario() }}>{item.nome}<span>{dados?.[item.id].length ?? 0}</span></button>)}
      </nav>

      <div className={estilos.filtros}>
        <Input value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder={`Buscar ${aba}`} aria-label={`Buscar ${aba}`} />
        {aba === "produtos" && <SelectNative value={categoriaEscolhida} onChange={(evento) => setCategoriaEscolhida(evento.target.value)} aria-label="Filtrar por categoria"><option value="">Todas as categorias</option>{categoriasAtivas.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}</SelectNative>}
      </div>

      {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
      {aviso && <p role="status" className={estilos.aviso}>{aviso}</p>}

      {novoAberto && aba !== "produtos" && <form className={estilos.formulario} onSubmit={(evento) => void salvarNovo(evento)}>
        <h2>{editando ? `Editar ${aba === "servicos" ? "serviço" : "fornecedor"}` : aba === "servicos" ? "Novo serviço" : aba === "categorias" ? "Nova categoria" : "Novo fornecedor"}</h2>
        <label>Nome<Input value={nome} onChange={(evento) => setNome(evento.target.value)} required maxLength={aba === "categorias" ? 80 : 120} autoFocus /></label>
        {aba === "categorias" && <label>Imagem (opcional)<Input type="url" value={imagem} onChange={(evento) => setImagem(evento.target.value)} placeholder="https://..." /></label>}
        {aba === "servicos" && <div className={estilos.gradeCampos}>
          <label>Preço (R$)<Input inputMode="decimal" value={preco} onChange={(evento) => setPreco(evento.target.value)} required placeholder="0,00" /></label>
          <label>Duração em minutos (opcional)<Input type="number" min={1} max={1440} value={duracao} onChange={(evento) => setDuracao(evento.target.value)} /></label>
          <label>Categoria<SelectNative value={categoriaEscolhida} onChange={(evento) => setCategoriaEscolhida(evento.target.value)}><option value="">Sem categoria</option>{categoriasAtivas.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}</SelectNative></label>
          <label>Custo estimado (R$)<Input inputMode="decimal" value={custo} onChange={(evento) => setCusto(evento.target.value)} placeholder="Opcional" /></label>
          <label>Imagem (opcional)<Input type="url" value={imagem} onChange={(evento) => setImagem(evento.target.value)} placeholder="https://..." /></label>
          <label>Descrição<Input value={descricao} onChange={(evento) => setDescricao(evento.target.value)} maxLength={500} /></label>
        </div>}
        {aba === "fornecedores" && <div className={estilos.gradeCampos}><label>Telefone (opcional)<Input type="tel" value={telefone} onChange={(evento) => setTelefone(evento.target.value)} /></label><label>E-mail (opcional)<Input type="email" value={email} onChange={(evento) => setEmail(evento.target.value)} /></label><label>CPF/CNPJ (opcional)<Input value={documento} onChange={(evento) => setDocumento(evento.target.value)} maxLength={20} /></label></div>}
        <div className={estilos.acoes}><button type="button" onClick={limparFormulario}>Cancelar</button><button disabled={ocupado} className={estilos.principal}>{ocupado ? "Salvando…" : "Salvar"}</button></div>
      </form>}

      <section className={estilos.lista} aria-label={ABAS.find((item) => item.id === aba)?.nome}>
        {!dados && <p className={estilos.vazio}>Carregando catálogo…</p>}
        {dados && lista.length === 0 && <p className={estilos.vazio}>{busca ? "Nada encontrado nessa busca." : "Nada cadastrado ainda nesta seção."}</p>}
        {aba === "produtos" && lista.map((registro) => { const produto = registro as Produto; return <article key={produto.id} className={estilos.linha}>
          <div className={estilos.identidade}><strong>{produto.nome}</strong><small>{produto.sku || "Sem SKU"} · {formatarMoeda(produto.precoCentavos)}</small></div>
          <label>Categoria<SelectNative value={produto.categoriaId ?? ""} onChange={(evento) => void atualizarProduto(produto, "categoriaId", evento.target.value)} disabled={ocupado}><option value="">Sem categoria</option>{categoriasAtivas.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}</SelectNative></label>
          <label>Fornecedor<SelectNative value={produto.fornecedorId ?? ""} onChange={(evento) => void atualizarProduto(produto, "fornecedorId", evento.target.value)} disabled={ocupado}><option value="">Sem fornecedor</option>{dados?.fornecedores.map((fornecedor) => <option key={fornecedor.id} value={fornecedor.id}>{fornecedor.nome}</option>)}</SelectNative></label>
        </article> })}
        {aba === "categorias" && lista.map((registro) => { const categoria = registro as Categoria; return <article key={categoria.id} className={`${estilos.linha} ${estilos.categoriaLinha}`}>
          {categoria.imagemUrl && <img className={estilos.imagemCategoria} src={categoria.imagemUrl} alt="" />}
          <div className={estilos.identidade}><strong>{categoria.nome}</strong><small>{categoria._count.produtos} produtos · {categoria._count.servicos} serviços{categoria.arquivada ? " · arquivada" : ""}</small></div>
          <button type="button" onClick={() => { setEditandoCategoriaId(categoria.id); setNomeEdicao(categoria.nome); setImagemEdicao(categoria.imagemUrl ?? "") }}>Editar</button>
          <button type="button" onClick={() => void executar(() => enviar("/api/loja/catalogo", { tipo: "categoria", id: categoria.id, arquivada: !categoria.arquivada }, "PATCH"), categoria.arquivada ? "Categoria reativada." : "Categoria arquivada.")}>{categoria.arquivada ? "Reativar" : "Arquivar"}</button>
          {editandoCategoriaId === categoria.id && <form className={estilos.edicaoCategoria} onSubmit={(evento) => { evento.preventDefault(); void executar(() => enviar("/api/loja/catalogo", { tipo: "categoria", id: categoria.id, nome: nomeEdicao.trim(), imagemUrl: imagemEdicao.trim() || null }, "PATCH"), "Categoria atualizada.").then((salvo) => { if (salvo) setEditandoCategoriaId(null) }) }}>
            <label>Nome<Input value={nomeEdicao} onChange={(evento) => setNomeEdicao(evento.target.value)} maxLength={80} required /></label>
            <label>Imagem (opcional)<Input type="url" value={imagemEdicao} onChange={(evento) => setImagemEdicao(evento.target.value)} placeholder="https://..." /></label>
            <div className={estilos.acoes}><button type="button" onClick={() => setEditandoCategoriaId(null)}>Cancelar</button><button className={estilos.principal} disabled={ocupado}>Salvar</button></div>
          </form>}
        </article> })}
        {aba === "fornecedores" && lista.map((registro) => { const fornecedor = registro as Fornecedor; return <article key={fornecedor.id} className={estilos.linha}><div className={estilos.identidade}><strong>{fornecedor.nome}</strong><small>{fornecedor._count.produtos} produtos · {fornecedor.telefone || fornecedor.email || "Sem contato"}</small></div><button type="button" onClick={() => abrirEdicao("fornecedor", fornecedor)}>Editar</button></article> })}
        {aba === "servicos" && lista.map((registro) => { const servico = registro as Servico; return <article key={servico.id} className={estilos.linha}><div className={estilos.identidade}><strong>{servico.nome}</strong><small>{servico.duracaoMinutos ? `${servico.duracaoMinutos} min · ` : ""}{categoriasAtivas.find((categoria) => categoria.id === servico.categoriaId)?.nome || "Sem categoria"}{servico.ativo ? "" : " · pausado"}</small></div><b>{formatarMoeda(servico.precoCentavos)}</b><button type="button" onClick={() => abrirEdicao("servico", servico)}>Editar</button><button type="button" onClick={() => void executar(() => enviar("/api/loja/catalogo", { tipo: "servico", id: servico.id, ativo: !servico.ativo }, "PATCH"), servico.ativo ? "Serviço pausado." : "Serviço ativado.")}>{servico.ativo ? "Pausar" : "Ativar"}</button></article> })}
      </section>
    </div>
  )
}

"use client"

import { useState } from "react"
import { enviar } from "@/lib/cliente"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody } from "@/components/ui/dialog"
import { iconeDaCategoria } from "@/lib/icone-categoria"

export interface CategoriaSelecionavel {
  id: string
  nome: string
  grupo?: string | null
  icone?: string | null
  tipo?: string
}
export const GRUPOS_CATEGORIA: Record<string, string> = {
  MORADIA: "Moradia", SERVICOS: "Serviços", ALIMENTACAO: "Alimentação",
  TRANSPORTE: "Transporte", SAUDE: "Saúde", EDUCACAO: "Educação",
  LAZER: "Lazer", PESSOAL: "Pessoal", DIVIDAS: "Dívidas", RENDA: "Renda", OUTROS: "Outros",
}
export function SimboloCategoria({ categoria, tipo }: { categoria?: Partial<CategoriaSelecionavel> | null; tipo?: "RECEITA" | "DESPESA" | "TRANSFERENCIA" }) {
  const Icone = iconeDaCategoria(categoria, tipo)
  const escolhido = categoria?.icone ?? ""
  // Emoji só quando a PESSOA escolheu um. O padrão é o ícone da família que o
  // resto do app usa: a lista misturava emoji (🏠, 💡) com ícone de traço na
  // mesma coluna, e duas famílias na mesma lista leem como duas listas.
  const ehEmoji = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(escolhido)
  return (
    <span aria-hidden className="simbolo-categoria">
      {ehEmoji ? <span className="text-[19px] leading-none">{escolhido}</span> : <Icone className="size-[19px]" strokeWidth={1.75} />}
    </span>
  )
}
export function SeletorCategoria({ opcoes, valor, aoMudar, rotulo = "Categoria", vazio = "Sem categoria", desabilitado = false, className }: {
  opcoes: CategoriaSelecionavel[]
  valor: string | null
  aoMudar: (id: string | null) => void
  rotulo?: string
  vazio?: string
  desabilitado?: boolean
  className?: string
}) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState("")
  // Categoria criada aqui entra na lista na hora, sem esperar a tela recarregar.
  const [criadas, setCriadas] = useState<CategoriaSelecionavel[]>([])
  const [criando, setCriando] = useState(false)
  const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  opcoes = [...opcoes, ...criadas.filter(c => !opcoes.some(o => o.id === c.id))]
  const selecionada = opcoes.find(categoria => categoria.id === valor)
  // "Transferência" existe como entrada e como saída; com o mesmo nome duas
  // vezes na lista, a pessoa não sabia qual escolher.
  const repetidos = new Set(opcoes.map(c => c.nome).filter((nome, i, todos) => todos.indexOf(nome) !== i))
  const nomeDe = (c: CategoriaSelecionavel) => repetidos.has(c.nome) && c.tipo ? `${c.nome} (${c.tipo === "RECEITA" ? "entrada" : c.tipo === "DESPESA" ? "saída" : "entre contas"})` : c.nome
  const grupos = new Map<string, CategoriaSelecionavel[]>()
  for (const categoria of opcoes) {
    const grupo = GRUPOS_CATEGORIA[categoria.grupo ?? "OUTROS"] ?? categoria.grupo ?? "Outros"
    if (!normalizar(categoria.nome + " " + grupo).includes(normalizar(busca))) continue
    grupos.set(grupo, [...(grupos.get(grupo) ?? []), categoria])
  }
  // Fecha a janela antes de avisar a tela. Na prévia da importação, com o
  // filtro "Sem categoria", a escolha tira a linha da lista e desmonta este
  // seletor: desmontado com a janela aberta, o diálogo deixava a página toda
  // sem clique (relatório de primeiro uso, 21/10/2026).
  async function criar(nome: string) {
    setCriando(true)
    try {
      const tipo = opcoes.find(o => o.tipo)?.tipo === "RECEITA" ? "RECEITA" : "DESPESA"
      const nova = await enviar<CategoriaSelecionavel>("/api/categorias", { nome, tipo })
      setCriadas(atuais => [...atuais, { ...nova, tipo }])
      escolher(nova.id)
    } finally { setCriando(false) }
  }
  function escolher(id: string | null) { setAberto(false); window.setTimeout(() => aoMudar(id), 180) }
  return <Dialog open={aberto} onOpenChange={valor => { setAberto(valor); if(valor) setBusca("") }}>
    <DialogTrigger asChild><Button variant="outline" disabled={desabilitado} aria-label={rotulo} className={className}>
      <span className="truncate">{selecionada ? `${selecionada.icone && /\p{Extended_Pictographic}/u.test(selecionada.icone) ? selecionada.icone + " " : ""}${nomeDe(selecionada)}` : vazio}</span>
    </Button></DialogTrigger>
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>{rotulo}</DialogTitle><DialogDescription>Busque pelo nome ou escolha um grupo.</DialogDescription></DialogHeader>
      <DialogBody>
        {/* Enter escolhe o primeiro resultado: cada lançamento eram três cliques. */}
        <Input aria-label="Buscar categoria" placeholder="Buscar categoria ou grupo" value={busca} onChange={evento => setBusca(evento.target.value)}
          onKeyDown={evento => { if (evento.key !== "Enter") return; evento.preventDefault(); const primeira = [...grupos.values()][0]?.[0]; if (primeira) escolher(primeira.id) }} />
        <div className="mt-3 flex max-h-[50dvh] flex-col gap-4 overflow-y-auto">
          <Button variant="ghost" onClick={() => escolher(null)}>{vazio}</Button>
          {grupos.size === 0 && <div role="status" className="grid gap-2 py-4 text-sm"><p>Nenhuma categoria encontrada.</p>
            {busca.trim() && <Button variant="secondary" disabled={criando} onClick={() => void criar(busca.trim())}>Criar a categoria “{busca.trim()}”</Button>}</div>}
          {[...grupos].map(([grupo, categorias]) => <section key={grupo} aria-label={grupo}>
            <h3 className="mb-1 text-sm font-semibold">{grupo}</h3>
            {categorias.map(categoria => <Button key={categoria.id} variant={categoria.id === valor ? "secondary" : "ghost"} aria-pressed={categoria.id === valor} onClick={() => escolher(categoria.id)} className="h-auto min-h-11 w-full justify-start whitespace-normal py-2 text-left">
              <SimboloCategoria categoria={categoria} /><span className="min-w-0 break-words">{nomeDe(categoria)}</span>
            </Button>)}
          </section>)}
        </div>
      </DialogBody>
    </DialogContent>
  </Dialog>
}

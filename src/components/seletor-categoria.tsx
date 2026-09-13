"use client"

import { useState } from "react"
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
  const nome=(categoria?.nome??"").toLowerCase()
  const padroes:[RegExp,string][]=[[/aluguel|moradia|condom/,"🏠"],[/mercado|alimenta/,"🛒"],[/restaurante/,"🍽️"],[/delivery/,"🛵"],[/combust|posto/,"⛽"],[/transporte|uber/,"🚕"],[/saúde|saude/,"🩺"],[/farm/,"💊"],[/educa/,"📚"],[/lazer/,"🎟️"],[/viagem/,"✈️"],[/salário|salario|receita/,"💰"],[/assinatura|stream/,"📺"],[/energia/,"💡"],[/água|agua/,"💧"],[/pet/,"🐾"]]
  const emojiPadrao=padroes.find(([padrao])=>padrao.test(nome))?.[1]??(tipo==="RECEITA"?"💰":tipo==="TRANSFERENCIA"?"↔️":"🧾")
  // Identificadores antigos do Lucide continuam válidos; emojis são texto, nunca HTML.
  return <span aria-hidden className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-papel-2 text-xl">
    {categoria?.icone && /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(categoria.icone) ? categoria.icone : emojiPadrao}
  </span>
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
  const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  const selecionada = opcoes.find(categoria => categoria.id === valor)
  const grupos = new Map<string, CategoriaSelecionavel[]>()
  for (const categoria of opcoes) {
    const grupo = GRUPOS_CATEGORIA[categoria.grupo ?? "OUTROS"] ?? categoria.grupo ?? "Outros"
    if (!normalizar(categoria.nome + " " + grupo).includes(normalizar(busca))) continue
    grupos.set(grupo, [...(grupos.get(grupo) ?? []), categoria])
  }
  function escolher(id: string | null) { aoMudar(id); setAberto(false) }
  return <Dialog open={aberto} onOpenChange={valor => { setAberto(valor); if(valor) setBusca("") }}>
    <DialogTrigger asChild><Button variant="outline" disabled={desabilitado} aria-label={rotulo} className={className}>
      <span className="truncate">{selecionada ? `${selecionada.icone && /\p{Extended_Pictographic}/u.test(selecionada.icone) ? selecionada.icone + " " : ""}${selecionada.nome}` : vazio}</span>
    </Button></DialogTrigger>
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>{rotulo}</DialogTitle><DialogDescription>Busque pelo nome ou escolha um grupo.</DialogDescription></DialogHeader>
      <DialogBody>
        <Input aria-label="Buscar categoria" placeholder="Buscar categoria ou grupo" value={busca} onChange={evento => setBusca(evento.target.value)} />
        <div className="mt-3 flex max-h-[50dvh] flex-col gap-4 overflow-y-auto">
          <Button variant="ghost" onClick={() => escolher(null)}>{vazio}</Button>
          {grupos.size === 0 && <p role="status" className="py-4 text-sm">Nenhuma categoria encontrada.</p>}
          {[...grupos].map(([grupo, categorias]) => <section key={grupo} aria-label={grupo}>
            <h3 className="mb-1 text-sm font-semibold">{grupo}</h3>
            {categorias.map(categoria => <Button key={categoria.id} variant={categoria.id === valor ? "secondary" : "ghost"} aria-pressed={categoria.id === valor} onClick={() => escolher(categoria.id)} className="h-auto min-h-11 w-full justify-start whitespace-normal py-2 text-left">
              <SimboloCategoria categoria={categoria} /><span className="min-w-0 break-words">{categoria.nome}</span>
            </Button>)}
          </section>)}
        </div>
      </DialogBody>
    </DialogContent>
  </Dialog>
}

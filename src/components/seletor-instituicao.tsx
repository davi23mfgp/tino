"use client"

import { useState } from "react"
import { BANCOS_PERFIL, normalizarBanco } from "@/lib/bancos-perfil"
import { IdentidadeBanco } from "@/components/banco-perfil"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

/** O mesmo catálogo do perfil evita pedir que a pessoa digite o banco de novo. */
export function SeletorInstituicao({ valor, aoEscolher }: { valor: string; aoEscolher: (nome: string) => void }) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState("")
  const termo = normalizarBanco(busca)
  const bancos = BANCOS_PERFIL.filter((banco) => [banco.nome, ...banco.aliases].some((nome) => normalizarBanco(nome).includes(termo)))
  function escolher(nome: string) { aoEscolher(nome); setAberto(false); setBusca("") }
  return <>
    <button type="button" onClick={() => setAberto(true)} className="flex min-h-11 w-full items-center gap-3 rounded-[var(--raio-campo)] border border-pauta px-4 py-3 text-left text-sm">
      <IdentidadeBanco instituicao={valor || null} />
      <span className="flex-1">{valor || "Escolher banco ou instituição"}</span><span className="text-muted-fg">{valor ? "Trocar" : "Escolher"}</span>
    </button>
    <Dialog open={aberto} onOpenChange={setAberto}><DialogContent><DialogHeader><DialogTitle>Escolher instituição</DialogTitle></DialogHeader><DialogBody>
      <Input aria-label="Buscar instituição" placeholder="Buscar banco, inclusive internacional" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {bancos.map((banco) => <button type="button" key={banco.nome} onClick={() => escolher(banco.nome)} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-[var(--raio-campo)] border border-pauta p-2 text-xs hover:bg-papel-2"><IdentidadeBanco instituicao={banco.nome} /><span>{banco.nome}</span></button>)}
      </div>
      {busca.trim() && <button type="button" className="mt-4 min-h-11 text-sm" onClick={() => escolher(busca.trim())}>Usar outra instituição: {busca.trim()}</button>}
    </DialogBody></DialogContent></Dialog>
  </>
}

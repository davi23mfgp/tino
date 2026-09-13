"use client"

import { useIdentidadeVisual } from "@/components/identidades-visuais"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BANCOS_PERFIL, encontrarBanco, normalizarBanco } from "@/lib/bancos-perfil"

export function IdentidadeBanco({ instituicao, nome, className }: { instituicao: string | null; nome?: string; className?: string }) {
  const rotulo = instituicao?.trim() || nome?.trim() || "Banco"
  const personalizada=useIdentidadeVisual(rotulo)
  const banco = encontrarBanco(instituicao ?? "")
  const iniciais = rotulo.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase() || "?"
  return <Avatar key={personalizada?.logoUrl ?? banco?.logoUrl ?? rotulo} className={cn("size-10 shrink-0", className)}>
    {(personalizada?.logoUrl||banco?.logoUrl) && <AvatarImage src={personalizada?.logoUrl??banco?.logoUrl} alt="" referrerPolicy="no-referrer" className="object-contain" />}
    <AvatarFallback>{personalizada?.emoji??iniciais}</AvatarFallback>
  </Avatar>
}

export function BuscaBancoPerfil({ valor, aoMudar, nomesExistentes, desabilitado }: {
  valor: string; aoMudar: (nome: string) => void; nomesExistentes: string[]; desabilitado: boolean
}) {
  const [mostrando, setMostrando] = useState(false)
  const nomes = [...BANCOS_PERFIL.map((banco) => banco.nome)]
  for (const nome of nomesExistentes) {
    if (!nomes.some((atual) => normalizarBanco(atual) === normalizarBanco(nome))) nomes.push(nome)
  }
  const resultados = nomes.filter((nome) => {
    const banco = encontrarBanco(nome)
    return [nome, ...(banco?.aliases ?? [])].some((apelido) => normalizarBanco(apelido).includes(normalizarBanco(valor)))
  })
  return <div className="flex flex-col gap-2">
    <div className="flex items-center gap-3">
      {valor && <IdentidadeBanco instituicao={valor} />}
      <Input id="conta-instituicao" value={valor} disabled={desabilitado} autoComplete="off"
        placeholder="Buscar banco ou digitar outro" aria-describedby="banco-ajuda"
        onFocus={() => setMostrando(true)} onChange={(evento) => { aoMudar(evento.target.value); setMostrando(true) }} />
    </div>
    {mostrando && <div className="max-h-48 overflow-y-auto rounded-xl border border-pauta" aria-label="Bancos encontrados">
      {resultados.map((nome) => <Button key={nome} type="button" variant="ghost" disabled={desabilitado}
        className="h-auto min-h-11 w-full justify-start whitespace-normal px-3 py-2"
        onClick={() => { aoMudar(nome); setMostrando(false) }}>
        <IdentidadeBanco instituicao={nome} /><span className="min-w-0 break-words text-left">{nome}</span>
      </Button>)}
      {resultados.length === 0 && <p className="p-3 text-sm text-muted-fg">Use o nome digitado para cadastrar outra instituição.</p>}
    </div>}
    <p id="banco-ajuda" className="text-xs text-muted-fg">Escolha um banco ou mantenha o nome digitado.</p>
  </div>
}

"use client"

import { createContext, useContext, useEffect, useState } from "react"

import { buscar } from "@/lib/cliente"
import { marcaDaCompra } from "@/lib/marcas"

export interface Identidade {
  id: string
  nome: string
  logoUrl: string | null
  emoji: string | null
}

const Contexto = createContext<{ lista: Identidade[]; recarregar: () => void }>({ lista: [], recarregar: () => {} })

export function IdentidadesProvider({ children }: { children: React.ReactNode }) {
  const [lista, setLista] = useState<Identidade[]>([])
  function recarregar() {
    buscar<Identidade[]>("/api/identidades").then(setLista).catch(() => {})
  }
  useEffect(recarregar, [])
  return <Contexto.Provider value={{ lista, recarregar }}>{children}</Contexto.Provider>
}

const SEM_ACENTO = new RegExp("[\\u0300-\\u036f]", "g")
const normalizar = (texto: string) => texto.normalize("NFD").replace(SEM_ACENTO, "").toLowerCase()

export function useIdentidadeVisual(nome: string) {
  const { lista } = useContext(Contexto)
  return [...lista]
    .sort((a, b) => b.nome.length - a.nome.length)
    .find((item) => normalizar(nome).includes(normalizar(item.nome)))
}

/**
 * O logo da compra: primeiro o que a pessoa associou; sem isso, o da lista de
 * lojas conhecidas (`src/lib/marcas.ts`), puxado da internet pelo servidor.
 * Banco fica de fora — `banco-perfil` tem os logos próprios, locais.
 */
export function useMarca(nome: string): { nome: string; logoUrl: string | null; emoji: string | null; automatica: boolean } | null {
  const propria = useIdentidadeVisual(nome)
  if (propria) return { ...propria, automatica: false }
  const conhecida = marcaDaCompra(nome)
  return conhecida ? { nome: conhecida.nome, logoUrl: `/api/logo/${conhecida.site}`, emoji: null, automatica: true } : null
}

export function MarcaPersonalizada({ nome }: { nome: string }) {
  const encontrada = useMarca(nome)
  // Logo que não carregou (serviço fora do ar, rede bloqueada) some, e o
  // ícone da categoria volta: quadrado quebrado na lista é pior que ícone.
  const [falhou, setFalhou] = useState<string | null>(null)
  if (!encontrada) return null
  if (encontrada.logoUrl) {
    if (falhou === encontrada.logoUrl) return null
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={encontrada.logoUrl} alt={encontrada.nome} onError={() => setFalhou(encontrada.logoUrl)} className="size-9 shrink-0 rounded-[10px] object-contain" />
  }
  return (
    <span aria-label={encontrada.nome} className="grid size-9 shrink-0 place-items-center text-xl">
      {encontrada.emoji ?? encontrada.nome.slice(0, 2).toUpperCase()}
    </span>
  )
}

/** A lista de logos associados e o jeito de recarregá-la depois de salvar. */
export function useIdentidades() {
  return useContext(Contexto)
}

"use client"

import { createContext, useContext, useEffect, useState } from "react"

import { buscar } from "@/lib/cliente"
import { chaveDaDescricao, marcaDaCompra } from "@/lib/marcas"

export interface Identidade {
  id: string
  nome: string
  logoUrl: string | null
  emoji: string | null
}

/// Loja que a IA identificou numa compra (camada 4, `lib/marcas-ia.ts`).
export interface Descoberta {
  chave: string
  situacao: "IDENTIFICADA" | "SUGERIDA"
  marcaNome: string | null
  site: string | null
  logoUrl: string | null
}

const Contexto = createContext<{ lista: Identidade[]; descobertas: Descoberta[]; recarregar: () => void }>({
  lista: [],
  descobertas: [],
  recarregar: () => {},
})

export function IdentidadesProvider({ children }: { children: React.ReactNode }) {
  const [lista, setLista] = useState<Identidade[]>([])
  const [descobertas, setDescobertas] = useState<Descoberta[]>([])
  function recarregar() {
    buscar<Identidade[]>("/api/identidades").then(setLista).catch(() => {})
  }
  useEffect(recarregar, [])
  // Uma leitura por visita: a IA só descobre loja nova uma vez por dia.
  useEffect(() => {
    buscar<Descoberta[]>("/api/marcas/descobertas").then(setDescobertas).catch(() => {})
  }, [])
  return <Contexto.Provider value={{ lista, descobertas, recarregar }}>{children}</Contexto.Provider>
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
 * O logo da compra, em quatro camadas (28/09/2026), da mais certa para a
 * menos:
 * 1. o que a pessoa associou (inclusive com um toque em "Qual loja é esta?");
 * 2. a lista de lojas conhecidas (`src/lib/marcas.ts`), que já entende o
 *    intermediário na frente do nome ("EBW*SPOTIFY") — por isso recebe o
 *    texto original do banco quando houver;
 * 3. a loja que a IA identificou com segurança (só as IDENTIFICADAS; as
 *    SUGERIDAS esperam a pessoa confirmar).
 * Banco fica de fora — `banco-perfil` tem os logos próprios, locais.
 */
export function useMarca(
  nome: string,
  original?: string | null,
): { nome: string; logoUrl: string | null; emoji: string | null; automatica: boolean } | null {
  const propria = useIdentidadeVisual(nome)
  const { descobertas } = useContext(Contexto)
  if (propria) return { ...propria, automatica: false }
  const conhecida = (original ? marcaDaCompra(original) : null) ?? marcaDaCompra(nome)
  // Logo guardado no app vem primeiro: não depende do serviço de ícones.
  if (conhecida) return { nome: conhecida.nome, logoUrl: conhecida.logo ?? `/api/logo/${conhecida.site}`, emoji: null, automatica: true }
  const chaves = [original, nome].filter(Boolean).map((texto) => chaveDaDescricao(texto as string))
  const descoberta = descobertas.find((item) => item.situacao === "IDENTIFICADA" && chaves.includes(item.chave))
  return descoberta?.marcaNome ? { nome: descoberta.marcaNome, logoUrl: descoberta.logoUrl, emoji: null, automatica: true } : null
}

/** O palpite da IA para uma compra, identificado ou só sugerido. */
export function useSugestaoDaIA(nome: string, original?: string | null): Descoberta | null {
  const { descobertas } = useContext(Contexto)
  const chaves = [original, nome].filter(Boolean).map((texto) => chaveDaDescricao(texto as string))
  return descobertas.find((item) => chaves.includes(item.chave)) ?? null
}

export function MarcaPersonalizada({ nome, original }: { nome: string; original?: string | null }) {
  const encontrada = useMarca(nome, original)
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

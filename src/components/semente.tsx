"use client"

import { createContext, useContext, useRef } from "react"

/**
 * Entrega à tela os dados que o servidor já buscou (`lib/dados-iniciais.ts`).
 *
 * Cada endereço vale uma vez: a primeira leitura usa a semente, e qualquer
 * recarga depois (trocar o mês, salvar, voltar à aba) vai ao servidor como
 * sempre. Dado financeiro velho é pior que dado ausente.
 */
type Gaveta = { dados: Record<string, unknown>; usados: Set<string> }
const Contexto = createContext<Gaveta | null>(null)

export function Semente({ dados, children }: { dados: Record<string, unknown>; children: React.ReactNode }) {
  const gaveta = useRef<Gaveta>({ dados, usados: new Set() })
  return <Contexto.Provider value={gaveta.current}>{children}</Contexto.Provider>
}

/** Lê sem gastar: serve para o valor inicial do estado. */
export function useSemente<T>(endereco: string): T | undefined {
  const gaveta = useContext(Contexto)
  if (!gaveta || gaveta.usados.has(endereco)) return undefined
  return gaveta.dados[endereco] as T | undefined
}

/** Gasta a semente: devolve verdadeiro uma vez se ela existia, para a tela pular a primeira busca. */
export function useGastarSemente() {
  const gaveta = useContext(Contexto)
  return (endereco: string) => {
    if (!gaveta || gaveta.usados.has(endereco) || !(endereco in gaveta.dados)) return false
    gaveta.usados.add(endereco)
    return true
  }
}

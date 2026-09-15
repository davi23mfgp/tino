"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { buscar, enviar } from "@/lib/cliente"

/**
 * Os alertas do Tino, buscados uma vez por carregamento.
 *
 * Quatro componentes da mesma página pediam `/api/tino/alertas` cada um por
 * conta própria — a barra do topo, a faixa crítica, o recado do Tino e o dock.
 * Eram cinco a seis requisições idênticas por abertura de tela, e o pior não
 * era o custo: era a divergência. Cada resposta chegava num instante diferente,
 * então o sininho podia dizer "3 avisos" enquanto a faixa já mostrava o quarto,
 * e marcar um como lido no topo não apagava nada nos outros três.
 *
 * Aqui a busca é uma só e o estado é um só. Marcar como lido atualiza todo
 * mundo junto, porque todo mundo lê da mesma lista.
 *
 * O provedor **não** derruba a tela quando a busca falha: alerta é acessório,
 * e um erro aqui não pode apagar o saldo. Quem consome decide o que mostrar
 * com `erro`.
 */

export interface Alerta {
  id: string
  tipo?: string
  titulo: string
  texto: string
  lido?: boolean
  severidade: "INFO" | "ATENCAO" | "CRITICO"
  acaoRota?: string | null
  criadoEm?: string
}

interface Contexto {
  alertas: Alerta[]
  carregando: boolean
  erro: boolean
  recarregar: () => Promise<void>
  /** Sem `ids`, marca todos. */
  marcarLidos: (ids?: string[]) => Promise<void>
  dispensarTodos: () => Promise<void>
}

const AlertasContexto = createContext<Contexto | null>(null)

export function AlertasProvider({ children }: { children: React.ReactNode }) {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    try {
      setAlertas(await buscar<Alerta[]>("/api/tino/alertas"))
      setErro(false)
    } catch {
      setErro(true)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  const marcarLidos = useCallback(async (ids?: string[]) => {
    // Pinta primeiro, confirma depois: marcar como lido é reversível e
    // esperar o servidor para apagar a bolinha faz o toque parecer perdido.
    setAlertas((lista) => lista.map((alerta) => (!ids || ids.includes(alerta.id) ? { ...alerta, lido: true } : alerta)))
    await enviar("/api/tino/alertas", ids ? { ids } : {}, "PATCH")
  }, [])

  const dispensarTodos = useCallback(async () => {
    setAlertas([])
    await enviar("/api/tino/alertas", { dispensar: true }, "PATCH")
  }, [])

  const valor = useMemo(
    () => ({ alertas, carregando, erro, recarregar, marcarLidos, dispensarTodos }),
    [alertas, carregando, erro, recarregar, marcarLidos, dispensarTodos],
  )

  return <AlertasContexto.Provider value={valor}>{children}</AlertasContexto.Provider>
}

/**
 * Lê os alertas do provedor.
 *
 * Fora do provedor devolve lista vazia em vez de quebrar: componentes de
 * alerta aparecem em telas soltas (a landing, o login) que não montam o
 * provedor, e explodir ali seria pior do que não mostrar aviso nenhum.
 */
export function usarAlertas(): Contexto {
  const contexto = useContext(AlertasContexto)
  return (
    contexto ?? {
      alertas: [],
      carregando: false,
      erro: false,
      recarregar: async () => {},
      marcarLidos: async () => {},
      dispensarTodos: async () => {},
    }
  )
}

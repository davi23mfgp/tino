"use client"

/** Chamadas de API do lado do cliente, com erro já traduzido para a tela. */
export async function buscar<T>(rota: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(rota, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    // Dado financeiro nunca vem de cache: saldo velho é pior que saldo ausente.
    cache: "no-store",
  })

  const texto = await resposta.text()
  const dados = texto ? JSON.parse(texto) : null

  if (!resposta.ok) throw new Error(dados?.erro ?? "Não consegui completar a operação.")
  return dados as T
}

export const enviar = <T>(rota: string, corpo: unknown, metodo: "POST" | "PUT" | "PATCH" | "DELETE" = "POST") =>
  buscar<T>(rota, { method: metodo, body: JSON.stringify(corpo) })

/** Atualiza as listas quando qualquer botao da navegacao cria um gasto. */
export const TRANSACOES_ATUALIZADAS = "tino:transacoes-atualizadas"

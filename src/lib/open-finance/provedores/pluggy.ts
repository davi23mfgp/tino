/**
 * Provedor Pluggy — agregador brasileiro autorizado no Open Finance.
 *
 * Implementa o mesmo contrato do sandbox. As chaves ficam só no servidor:
 * client secret em código de cliente vazaria acesso aos dados bancários de
 * todos os usuários.
 */

import type { Conexao, ContaExterna, ProvedorOpenFinance, TransacaoExterna } from "@/lib/open-finance/tipos"

const BASE = process.env.OPEN_FINANCE_BASE_URL || "https://api.pluggy.ai"

/**
 * A apiKey da Pluggy vale 2 horas. Guardar em memória do processo evita um
 * /auth por requisição; a margem de 5 minutos impede usar um token que expira
 * no meio da chamada seguinte.
 */
let tokenCache: { valor: string; expiraEm: number } | null = null

async function apiKey(): Promise<string> {
  if (tokenCache && tokenCache.expiraEm > Date.now() + 5 * 60_000) return tokenCache.valor

  // Dois nomes aceitos: PLUGGY_* (o que está no `.env.example` e no README) e
  // OPEN_FINANCE_* (que já existia). Assim um `.env` antigo continua valendo.
  const clientId = process.env.PLUGGY_CLIENT_ID || process.env.OPEN_FINANCE_CLIENT_ID
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET || process.env.OPEN_FINANCE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("Open Finance: PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET não configurados.")
  }

  const resposta = await fetch(`${BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  })
  if (!resposta.ok) throw new Error(`Open Finance: falha ao autenticar (${resposta.status}).`)

  const dados = (await resposta.json()) as { apiKey: string }
  tokenCache = { valor: dados.apiKey, expiraEm: Date.now() + 2 * 60 * 60_000 }
  return dados.apiKey
}

async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(`${BASE}${caminho}`, {
    ...init,
    headers: { "X-API-KEY": await apiKey(), "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  })
  if (!resposta.ok) {
    const corpo = await resposta.text()
    throw new Error(`Open Finance ${resposta.status}: ${corpo.slice(0, 200)}`)
  }
  return (await resposta.json()) as T
}

const paraCentavos = (valor: number) => Math.round(valor * 100)

const TIPOS: Record<string, ContaExterna["tipo"]> = {
  BANK: "CORRENTE",
  CHECKING: "CORRENTE",
  SAVINGS: "POUPANCA",
  CREDIT: "CARTAO_CREDITO",
  INVESTMENT: "INVESTIMENTO",
}

export const provedorPluggy: ProvedorOpenFinance = {
  nome: "pluggy",

  async urlConsentimento({ larId, retornoUrl }) {
    const dados = await chamar<{ accessToken: string }>("/connect_token", {
      method: "POST",
      body: JSON.stringify({ clientUserId: larId }),
    })
    const url = new URL("https://connect.pluggy.ai")
    url.searchParams.set("connect_token", dados.accessToken)
    url.searchParams.set("redirect_url", retornoUrl)
    return url.toString()
  },

  async concluirConsentimento({ codigo }) {
    const item = await chamar<{
      id: string
      connector: { name: string }
      status: string
      consentExpiresAt?: string
      error?: { message: string }
    }>(`/items/${codigo}`)

    return {
      itemId: item.id,
      instituicao: item.connector?.name ?? "Instituição",
      status: item.status === "UPDATED" || item.status === "UPDATING" ? "ATIVA" : "ERRO",
      consentimentoExpiraEm: item.consentExpiresAt ? new Date(item.consentExpiresAt) : undefined,
      erroMensagem: item.error?.message,
    }
  },

  async listarContas(itemId) {
    const dados = await chamar<{
      results: {
        id: string
        name: string
        type: string
        subtype?: string
        number?: string
        balance: number
        creditData?: { creditLimit?: number }
        currencyCode: string
      }[]
    }>(`/accounts?itemId=${encodeURIComponent(itemId)}`)

    return dados.results.map((conta) => ({
      id: conta.id,
      nome: conta.name,
      tipo: TIPOS[conta.subtype ?? conta.type] ?? "CORRENTE",
      instituicao: "",
      numero: conta.number,
      saldoCentavos: paraCentavos(conta.balance),
      limiteCentavos: conta.creditData?.creditLimit ? paraCentavos(conta.creditData.creditLimit) : undefined,
      moeda: conta.currencyCode ?? "BRL",
    }))
  },

  async listarTransacoes({ contaExternaId, de, ate }) {
    const parametros = new URLSearchParams({
      accountId: contaExternaId,
      from: de.toISOString().slice(0, 10),
      to: ate.toISOString().slice(0, 10),
      pageSize: "500",
    })

    const transacoes: TransacaoExterna[] = []
    let pagina = 1
    // Paginação é obrigatória: um mês de cartão passa fácil de 500 linhas e o
    // que ficasse de fora sumiria do extrato sem nenhum aviso.
    for (;;) {
      parametros.set("page", String(pagina))
      const dados = await chamar<{
        results: { id: string; date: string; description: string; amount: number; category?: string }[]
        totalPages: number
      }>(`/transactions?${parametros.toString()}`)

      for (const item of dados.results) {
        const centavos = paraCentavos(item.amount)
        transacoes.push({
          id: item.id,
          contaExternaId,
          data: new Date(item.date),
          descricao: item.description,
          valorCentavos: Math.abs(centavos),
          tipo: centavos < 0 ? "DESPESA" : "RECEITA",
          categoriaProvedor: item.category,
        })
      }

      if (pagina >= (dados.totalPages ?? 1)) break
      pagina += 1
    }
    return transacoes
  },

  async revogar(itemId) {
    await chamar(`/items/${itemId}`, { method: "DELETE" })
  },
}

/**
 * Fachada de Open Finance para as telas.
 *
 * Existe por um motivo só: a tela nunca deve saber qual agregador está ligado,
 * nem se existe algum. Ela pergunta o estado, e recebe uma de três respostas —
 * conectado, pronto para conectar, ou "ainda não configurado". Cada uma tem um
 * caminho de verdade na interface, e nenhuma delas inventa dado.
 *
 * Regra que não se negocia: quando não há credencial de agregador, o Tino NÃO
 * simula conexão. Ele diz que a conexão automática ainda não está ligada e
 * manda para o import de arquivo (OFX/CSV/PDF), que funciona hoje e é grátis.
 */

import { prisma } from "@/lib/prisma"
import { sincronizarConexao, type ResultadoSync } from "@/lib/open-finance"
import type { ProvedorOpenFinance } from "@/lib/open-finance/tipos"
import { provedorPluggy } from "@/lib/open-finance/provedores/pluggy"
import { provedorSandbox } from "@/lib/open-finance/provedores/sandbox"

/**
 * `nao-configurado` é o padrão de fábrica. O modo `sandbox` (dado fictício)
 * continua existindo para desenvolvimento, mas só quando alguém pede por
 * escrito com OPEN_FINANCE_PROVIDER=sandbox.
 */
export type ModoOpenFinance = "pluggy" | "sandbox" | "nao-configurado"

/** Aceita os dois nomes: os do spec (PLUGGY_*) e os que já existiam no `.env`. */
export function credenciaisPluggy(): { clientId?: string; clientSecret?: string } {
  return {
    clientId: process.env.PLUGGY_CLIENT_ID || process.env.OPEN_FINANCE_CLIENT_ID || undefined,
    clientSecret: process.env.PLUGGY_CLIENT_SECRET || process.env.OPEN_FINANCE_CLIENT_SECRET || undefined,
  }
}

export function modoAtual(): ModoOpenFinance {
  const pedido = (process.env.OPEN_FINANCE_PROVIDER || "").toLowerCase()

  // Dado fictício em produção seria o usuário tomando decisão com número
  // inventado. Sandbox só vale fora de produção, e só quando pedido.
  if (pedido === "sandbox" && process.env.NODE_ENV !== "production") return "sandbox"

  const { clientId, clientSecret } = credenciaisPluggy()
  if (clientId && clientSecret) return "pluggy"

  return "nao-configurado"
}

/** Erro de configuração ausente — a tela usa isto para oferecer o import. */
export class OpenFinanceNaoConfigurado extends Error {
  constructor() {
    super("A conexão automática com o banco ainda não está ligada neste Tino.")
    this.name = "OpenFinanceNaoConfigurado"
  }
}

function provedorDoModo(modo: ModoOpenFinance): ProvedorOpenFinance {
  if (modo === "nao-configurado") throw new OpenFinanceNaoConfigurado()
  return modo === "pluggy" ? provedorPluggy : provedorSandbox
}

export interface ContaConectada {
  id: string
  nome: string
  tipo: string
  instituicao: string | null
  saldoCentavos: number
}

export interface EstadoOpenFinance {
  modo: ModoOpenFinance
  /** Verdadeiro só quando existe agregador de verdade atrás. */
  configurado: boolean
  /** Verdadeiro quando os números vêm de gerador, não de banco. */
  dadoFicticio: boolean
  conexoes: {
    id: string
    instituicao: string
    status: string
    ultimaSync: string | null
    erroMensagem: string | null
  }[]
  contas: ContaConectada[]
}

/**
 * Estado completo para a tela `/conectar` e para a faixa do topo.
 *
 * O saldo é derivado dos lançamentos, igual a `/api/contas` — campo de saldo
 * gravado desatualiza no primeiro lançamento editado.
 */
export async function estadoOpenFinance(larId: string): Promise<EstadoOpenFinance> {
  const modo = modoAtual()

  const conexoes = await prisma.conexaoOpenFinance.findMany({
    where: { larId, status: { not: "REVOGADA" } },
    orderBy: { criadoEm: "desc" },
  })

  const contas = conexoes.length ? await listarContas(larId) : []

  return {
    modo,
    configurado: modo !== "nao-configurado",
    dadoFicticio: modo === "sandbox",
    conexoes: conexoes.map((conexao) => ({
      id: conexao.id,
      instituicao: conexao.instituicao,
      status: conexao.status,
      ultimaSync: conexao.ultimaSync ? conexao.ultimaSync.toISOString() : null,
      erroMensagem: conexao.erroMensagem,
    })),
    contas,
  }
}

/** Contas que chegaram por conexão bancária, com saldo calculado. */
export async function listarContas(larId: string): Promise<ContaConectada[]> {
  const contas = await prisma.conta.findMany({
    where: { larId, arquivada: false, conexaoId: { not: null } },
    orderBy: { criadoEm: "asc" },
    include: { conexao: { select: { instituicao: true } } },
  })
  if (contas.length === 0) return []

  const movimentos = await prisma.transacao.groupBy({
    by: ["contaId", "tipo"],
    where: { larId, pago: true, tipo: { in: ["RECEITA", "DESPESA"] } },
    _sum: { valorCentavos: true },
  })
  const transferencias = await prisma.transacao.findMany({
    where: { larId, pago: true, tipo: "TRANSFERENCIA" },
    select: { contaId: true, valorCentavos: true, transferenciaParId: true },
  })

  const somar = (contaId: string, tipo: string) =>
    movimentos.find((m) => m.contaId === contaId && m.tipo === tipo)?._sum.valorCentavos ?? 0

  return contas.map((conta) => ({
    id: conta.id,
    nome: conta.nome,
    tipo: conta.tipo,
    instituicao: conta.instituicao ?? conta.conexao?.instituicao ?? null,
    saldoCentavos:
      conta.saldoInicialCentavos +
      somar(conta.id, "RECEITA") -
      somar(conta.id, "DESPESA") +
      transferencias
        .filter((linha) => linha.contaId === conta.id)
        .reduce((soma, linha) => soma + (linha.transferenciaParId ? linha.valorCentavos : -linha.valorCentavos), 0),
  }))
}

/**
 * Começa o consentimento. Devolve a URL onde a pessoa autentica NO BANCO —
 * senha bancária nunca passa pelo Tino.
 *
 * Sem agregador configurado, estoura `OpenFinanceNaoConfigurado` em vez de
 * devolver uma URL de mentira.
 */
export async function iniciarConexao(params: { larId: string; retornoUrl: string }): Promise<{ url: string }> {
  const provedor = provedorDoModo(modoAtual())
  const url = await provedor.urlConsentimento(params)
  return { url }
}

/** Sincroniza uma conexão (ou todas as ativas do lar). */
export async function sincronizar(params: { larId: string; conexaoId?: string }): Promise<ResultadoSync> {
  provedorDoModo(modoAtual())

  const alvos = params.conexaoId
    ? [{ id: params.conexaoId }]
    : await prisma.conexaoOpenFinance.findMany({
        where: { larId: params.larId, status: "ATIVA" },
        select: { id: true },
      })

  const total: ResultadoSync = { contasCriadas: 0, transacoesNovas: 0, transacoesDuplicadas: 0 }
  for (const alvo of alvos) {
    const parcial = await sincronizarConexao({ larId: params.larId, conexaoId: alvo.id })
    total.contasCriadas += parcial.contasCriadas
    total.transacoesNovas += parcial.transacoesNovas
    total.transacoesDuplicadas += parcial.transacoesDuplicadas
  }
  return total
}

/** Existe pelo menos um banco ligado? Usado pela faixa do topo. */
export async function temBancoConectado(larId: string): Promise<boolean> {
  const quantas = await prisma.conexaoOpenFinance.count({
    where: { larId, status: { in: ["ATIVA", "ERRO"] } },
  })
  return quantas > 0
}

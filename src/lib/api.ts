/**
 * Utilidades das rotas de API.
 *
 * Centraliza autenticação e formato de erro para que cada rota cuide só da
 * sua regra de negócio, e para que nenhuma delas devolva stack trace ao
 * cliente por engano.
 */

import { NextResponse } from "next/server"

import { getSessao, type Sessao } from "@/lib/auth"
import { estadoDoAcesso } from "@/lib/acesso-assinatura"
import { rotaPermitida, type PapelDeAcesso } from "@/lib/acesso"

export class ErroDeUso extends Error {
  constructor(
    mensagem: string,
    readonly status = 400,
  ) {
    super(mensagem)
  }
}

export function ok<T>(dados: T, status = 200) {
  return NextResponse.json(dados, { status })
}

export function erro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: mensagem }, { status })
}

/**
 * Envolve o handler: injeta a sessão e traduz exceções em resposta HTTP.
 * Erro inesperado vira 500 genérico — a mensagem real fica no log do servidor.
 */
/**
 * Rotas que continuam aceitando escrita com o acesso bloqueado.
 *
 * Contratar o plano, e os direitos do titular: exportar os dados e apagar a
 * conta (LGPD, art. 18). Sair também — deixar alguém preso na sessão seria
 * mesquinho e inútil.
 */
const ESCRITA_SEMPRE_LIVRE = ["/api/assinatura", "/api/usuario", "/api/auth", "/api/suporte"]

/// Convidado (ex.: contador externo) vê e não edita. Pode sair, pedir ajuda e
/// exercer os próprios direitos de titular — os dados dele, não os do lar.
const CONVIDADO_PODE_ESCREVER = ["/api/usuario", "/api/auth", "/api/suporte"]

export function comSessao<T>(handler: (sessao: Sessao, requisicao: Request, contexto: T) => Promise<Response>) {
  return async (requisicao: Request, contexto: T): Promise<Response> => {
    const sessao = await getSessao()
    if (!sessao) return erro("Sessão expirada. Entre novamente.", 401)

    const caminhoDaRota = new URL(requisicao.url).pathname
    const escrita = requisicao.method !== "GET" && requisicao.method !== "HEAD"

    // Controle de acesso por papel, no servidor. O proxy já barra a URL, mas
    // regra de acesso que só existe numa camada é regra que um dia some.
    if (!rotaPermitida(sessao.papel as PapelDeAcesso, caminhoDaRota)) return erro("Não encontrado.", 404)
    if (sessao.papel === "CONVIDADO" && escrita && !CONVIDADO_PODE_ESCREVER.some((p) => caminhoDaRota.startsWith(p))) {
      return erro("Seu acesso a este lar é só de leitura.", 403)
    }

    // Teto geral por pessoa. As rotas caras e o login têm limite próprio, mais
    // apertado; este segura o laço em qualquer outra rota (raspagem, script
    // travado, sessão roubada varrendo a API).
    try {
      const { consumirLimite, REGRAS } = await import("@/lib/limite")
      await consumirLimite(
        `api:${escrita ? "escrita" : "leitura"}:${sessao.usuarioId}`,
        escrita ? REGRAS.apiEscrita : REGRAS.apiLeitura,
      )
    } catch (excecao) {
      if (excecao instanceof ErroDeUso) return erro(excecao.message, excecao.status)
      throw excecao
    }

    // A parede da tela é o que a pessoa vê; esta é a que vale. Sem ela, quem
    // soubesse montar um POST continuaria escrevendo no Tino depois do teste
    // vencido. Só leitura passa: ver o que já é seu não é o que se cobra.
    if (escrita) {
      if (!ESCRITA_SEMPRE_LIVRE.some((livre) => caminhoDaRota.startsWith(livre))) {
        const acesso = await estadoDoAcesso(sessao.usuarioId)
        if (!acesso.liberado) {
          return erro("Seu acesso está pausado. Escolha um plano para continuar.", 402)
        }
      }
    }

    try {
      return await handler(sessao, requisicao, contexto)
    } catch (excecao) {
      if (excecao instanceof ErroDeUso) return erro(excecao.message, excecao.status)
      // Só o caminho: a query pode trazer chave, token ou dado pessoal, e log
      // vive mais e é visto por mais gente do que o banco.
      console.error("[tino] falha na rota", requisicao.method, caminhoDaRota, excecao)
      return erro("Algo deu errado. Tente de novo em instantes.", 500)
    }
  }
}

/** Lê e valida o corpo JSON, com mensagem em português quando vier vazio. */
export async function corpo<T = unknown>(
  requisicao: Request,
  limites: { bytes?: number; itens?: number; texto?: number } = {},
): Promise<T> {
  const maxBytes = limites.bytes ?? TAMANHO_MAXIMO_JSON
  // Teto antes de ler: JSON gigante é memória e CPU de graça para quem ataca.
  // Arquivo (extrato, fatura) não passa por aqui — vai por formData com teto próprio.
  const declarado = Number(requisicao.headers.get("content-length") ?? 0)
  if (declarado > maxBytes) throw new ErroDeUso("Requisição grande demais.", 413)
  let texto: string
  try {
    texto = await requisicao.text()
  } catch {
    throw new ErroDeUso("Corpo da requisição inválido.")
  }
  if (texto.length > maxBytes) throw new ErroDeUso("Requisição grande demais.", 413)
  let bruto: unknown
  try {
    // Descarta chaves que envenenam protótipo se o objeto for espalhado depois.
    bruto = JSON.parse(texto, (chave, valor) =>
      chave === "__proto__" || chave === "constructor" || chave === "prototype" ? undefined : valor,
    )
  } catch {
    throw new ErroDeUso("Corpo da requisição inválido.")
  }
  conferirFormato(bruto, 0, limites.itens ?? 2_000, limites.texto ?? 5_000)
  return bruto as T
}

/**
 * Teto genérico de formato, antes de qualquer regra da rota.
 *
 * Cada rota valida os próprios campos; esta camada garante o mínimo mesmo na
 * rota que esqueceu: nenhum texto de romance num campo de nome, nenhuma lista
 * de um milhão de itens, nenhum JSON aninhado até estourar a pilha.
 */
function conferirFormato(valor: unknown, profundidade: number, maxItens: number, maxTexto: number) {
  if (profundidade > 10) throw new ErroDeUso("Requisição com formato inválido.")
  if (typeof valor === "string") {
    if (valor.length > maxTexto) throw new ErroDeUso("Texto longo demais.")
  } else if (Array.isArray(valor)) {
    if (valor.length > maxItens) throw new ErroDeUso("Lista longa demais.")
    for (const item of valor) conferirFormato(item, profundidade + 1, maxItens, maxTexto)
  } else if (valor && typeof valor === "object") {
    for (const item of Object.values(valor)) conferirFormato(item, profundidade + 1, maxItens, maxTexto)
  }
}

/// 256 KB: o maior JSON legítimo do Tino (confirmação de importação com
/// centenas de linhas) fica bem abaixo disso.
const TAMANHO_MAXIMO_JSON = 256 * 1024

export function exigir<T>(valor: T | null | undefined, mensagem: string): T {
  if (valor === null || valor === undefined || valor === "") throw new ErroDeUso(mensagem)
  return valor
}

/** Competência no formato YYYY-MM, com validação. */
export function lerCompetencia(valor: string | null, padrao: string): string {
  if (!valor) return padrao
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(valor)) throw new ErroDeUso("Competência inválida. Use o formato AAAA-MM.")
  return valor
}

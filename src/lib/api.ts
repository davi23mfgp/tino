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

export function comSessao<T>(handler: (sessao: Sessao, requisicao: Request, contexto: T) => Promise<Response>) {
  return async (requisicao: Request, contexto: T): Promise<Response> => {
    const sessao = await getSessao()
    if (!sessao) return erro("Sessão expirada. Entre novamente.", 401)

    // A parede da tela é o que a pessoa vê; esta é a que vale. Sem ela, quem
    // soubesse montar um POST continuaria escrevendo no Tino depois do teste
    // vencido. Só leitura passa: ver o que já é seu não é o que se cobra.
    if (requisicao.method !== "GET") {
      const caminho = new URL(requisicao.url).pathname
      if (!ESCRITA_SEMPRE_LIVRE.some((livre) => caminho.startsWith(livre))) {
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
      console.error("[tino] falha na rota", requisicao.url, excecao)
      return erro("Algo deu errado. Tente de novo em instantes.", 500)
    }
  }
}

/** Lê e valida o corpo JSON, com mensagem em português quando vier vazio. */
export async function corpo<T>(requisicao: Request): Promise<T> {
  try {
    return (await requisicao.json()) as T
  } catch {
    throw new ErroDeUso("Corpo da requisição inválido.")
  }
}

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

/**
 * Registro de erros do servidor e das telas (29/09/2026).
 *
 * Antes, erro de servidor ia só para o `console.error` da Vercel, que some em
 * horas e não diz quantas vezes aconteceu; erro de tela não ia para lugar
 * nenhum. Agora os dois caem em `ErroRegistrado`, agrupados, para o admin ver
 * em /admin/erros.
 *
 * O que NÃO entra: corpo da requisição, valor digitado, saldo. A mensagem e a
 * pilha passam por `semDadosPessoais` antes de gravar — mensagem de erro às
 * vezes carrega o e-mail ou o CPF que causou o problema, e o registro existe
 * para achar o defeito, não para guardar dado de cliente (LGPD, art. 6º, III).
 */

import { createHash } from "node:crypto"

import { prisma } from "@/lib/prisma"

const LIMITE_MENSAGEM = 500
const LIMITE_PILHA = 4000

/** Troca o que identifica uma pessoa ou abre uma conta por um marcador. */
export function semDadosPessoais(texto: string): string {
  return (
    texto
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [chave]")
      .replace(/\b(sk|pk|rk|gsk|re|whsec|sk-ant)[-_][A-Za-z0-9_-]{8,}/g, "[chave]")
      .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, "[token]")
      .replace(/postgres(ql)?:\/\/[^\s"']+/gi, "[banco]")
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[e-mail]")
      .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[cpf]")
      .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[cnpj]")
      .replace(/(\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g, "[telefone]")
  )
}

/**
 * O que faz dois erros serem "o mesmo defeito": o tipo, a mensagem sem os
 * pedaços que mudam a cada vez (números, ids) e o primeiro trecho da pilha
 * que é código nosso. Sem tirar os números, "Conta cm1abc não encontrada" e
 * "Conta cm2xyz não encontrada" virariam dois defeitos.
 */
export function impressaoDoErro(origem: string, mensagem: string, pilha?: string | null): string {
  const mensagemFixa = mensagem
    .replace(/\b[a-z0-9]{20,}\b/gi, "#")
    .replace(/\d+/g, "#")
    .slice(0, 200)
  const linhaNossa = (pilha ?? "")
    .split("\n")
    .map((linha) => linha.trim())
    .find((linha) => linha.startsWith("at ") && !linha.includes("node_modules") && !linha.includes("node:"))
    ?.replace(/:\d+:\d+\)?$/, "")
  return createHash("sha256").update(`${origem}|${mensagemFixa}|${linhaNossa ?? ""}`).digest("hex").slice(0, 32)
}

export interface ErroParaRegistrar {
  origem: "SERVIDOR" | "NAVEGADOR"
  mensagem: string
  pilha?: string | null
  rota?: string | null
  metodo?: string | null
  usuarioId?: string | null
}

/**
 * Grava (ou soma mais uma ocorrência). Nunca lança: falhar ao registrar um erro
 * não pode virar um segundo erro na tela de quem já está tendo um.
 */
export async function registrarErro(erro: ErroParaRegistrar) {
  try {
    const mensagem = semDadosPessoais(erro.mensagem || "Erro sem mensagem").slice(0, LIMITE_MENSAGEM)
    const pilha = erro.pilha ? semDadosPessoais(erro.pilha).slice(0, LIMITE_PILHA) : null
    const impressao = impressaoDoErro(erro.origem, mensagem, pilha)
    // A rota perde o que vem depois do "?": consulta às vezes leva e-mail ou token.
    const rota = erro.rota ? erro.rota.split("?")[0].slice(0, 200) : null
    const agora = new Date()
    await prisma.erroRegistrado.upsert({
      where: { impressao },
      create: { impressao, origem: erro.origem, mensagem, pilha, rota, metodo: erro.metodo ?? null, usuarioId: erro.usuarioId ?? null },
      // Voltou depois de resolvido: reabre, porque a correção não pegou.
      update: { ocorrencias: { increment: 1 }, ultimoEm: agora, status: "NOVO", rota, usuarioId: erro.usuarioId ?? undefined },
    })
  } catch (falha) {
    console.error("[tino] não consegui registrar o erro", falha)
  }
}

/** Registro do que o admin fez. Mesmo cuidado: falhar aqui não derruba a tela. */
export async function registrarAcaoDoAdmin(adminId: string, acao: string, alvoId?: string | null, detalhe?: string | null) {
  try {
    await prisma.registroAdmin.create({ data: { adminId, acao, alvoId: alvoId ?? null, detalhe: detalhe ? detalhe.slice(0, 300) : null } })
  } catch (falha) {
    console.error("[tino] não consegui registrar a ação do admin", falha)
  }
}

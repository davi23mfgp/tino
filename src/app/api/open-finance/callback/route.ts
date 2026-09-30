import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessao } from "@/lib/auth"
import { criarProvedor, sincronizarConexao } from "@/lib/open-finance"

/**
 * Retorno do consentimento.
 *
 * O banco redireciona o navegador para cá com um código. Trocamos o código pela
 * conexão, gravamos e já disparamos a primeira sincronização — o usuário volta
 * para o app com os dados na tela, não com uma tela vazia e um botão.
 */
export async function GET(requisicao: Request) {
  const sessao = await getSessao()
  const url = new URL(requisicao.url)
  const destino = new URL("/contas", url.origin)

  if (!sessao) {
    destino.searchParams.set("erro", "sessao")
    return NextResponse.redirect(destino)
  }

  const codigo = url.searchParams.get("codigo") ?? url.searchParams.get("item_id") ?? url.searchParams.get("itemId")
  if (!codigo) {
    destino.searchParams.set("erro", "consentimento-cancelado")
    return NextResponse.redirect(destino)
  }

  try {
    const provedor = criarProvedor()
    const conexao = await provedor.concluirConsentimento({ codigo, larId: sessao.larId })

    const gravada = await prisma.conexaoOpenFinance.upsert({
      where: {
        larId_provedor_itemId: { larId: sessao.larId, provedor: provedor.nome, itemId: conexao.itemId },
      },
      // Reconectar o mesmo banco atualiza a conexão existente em vez de criar
      // uma segunda, o que duplicaria contas e lançamentos.
      update: {
        status: conexao.status,
        instituicao: conexao.instituicao,
        consentimentoExpiraEm: conexao.consentimentoExpiraEm ?? null,
        erroMensagem: conexao.erroMensagem ?? null,
      },
      create: {
        larId: sessao.larId,
        provedor: provedor.nome,
        itemId: conexao.itemId,
        instituicao: conexao.instituicao,
        status: conexao.status,
        consentimentoExpiraEm: conexao.consentimentoExpiraEm ?? null,
      },
    })

    await sincronizarConexao({ larId: sessao.larId, conexaoId: gravada.id })
    destino.searchParams.set("conectado", gravada.instituicao)
  } catch (excecao) {
    console.error("[tino] falha no callback de Open Finance", excecao instanceof Error ? excecao.name : "Erro")
    destino.searchParams.set("erro", "falha-conexao")
  }

  return NextResponse.redirect(destino)
}

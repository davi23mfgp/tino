/**
 * Guarda do painel de administração.
 *
 * Rota de admin para quem não é admin devolve **404, não 403**. 403 confirma
 * que o endereço existe: quem varre um site procurando painel aprende, pela
 * diferença entre as duas respostas, exatamente onde insistir. Com 404 a rota é
 * indistinguível de uma que nunca existiu.
 *
 * O papel é um campo na conta do próprio usuário — não há login separado. Não
 * existe tela que promova ninguém a admin: a conta de `ADMIN_EMAIL` é
 * garantida no build (`scripts/garantir-admin.mjs`), e qualquer outra é um
 * comando no banco (`docs/PAGAMENTO-E-ADMIN.md`). Uma tela que concede
 * privilégio é uma tela a mais para dar errado.
 */

import { notFound } from "next/navigation"
import { NextResponse } from "next/server"

import { getSessao, type Sessao } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function ehAdmin(usuarioId: string): Promise<boolean> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { admin: true },
  })
  return usuario?.admin === true
}

/**
 * Para páginas do admin. Sem sessão ou sem o papel, a página não existe.
 *
 * A flag é lida do banco a cada requisição, e não do token: o token vale 30
 * dias, e tirar o papel de alguém precisa valer no próximo clique, não no
 * próximo mês.
 */
export async function sessaoDeAdmin(): Promise<Sessao> {
  const sessao = await getSessao()
  if (!sessao) notFound()
  if (!(await ehAdmin(sessao.usuarioId))) notFound()
  return sessao
}

/** Para rotas de API do admin. Mesmo 404, mesma razão. */
export function comAdmin<T>(handler: (sessao: Sessao, requisicao: Request, contexto: T) => Promise<Response>) {
  return async (requisicao: Request, contexto: T): Promise<Response> => {
    const sessao = await getSessao()
    if (!sessao || !(await ehAdmin(sessao.usuarioId))) {
      return NextResponse.json({ erro: "Não encontrado." }, { status: 404 })
    }

    try {
      return await handler(sessao, requisicao, contexto)
    } catch (excecao) {
      console.error("[tino] falha na rota do admin", requisicao.method, new URL(requisicao.url).pathname, excecao)
      const { registrarErro } = await import("@/lib/erros")
      await registrarErro({
        origem: "SERVIDOR",
        mensagem: excecao instanceof Error ? `${excecao.name}: ${excecao.message}` : String(excecao),
        pilha: excecao instanceof Error ? excecao.stack : null,
        rota: new URL(requisicao.url).pathname,
        metodo: requisicao.method,
        usuarioId: sessao.usuarioId,
      })
      return NextResponse.json({ erro: "Algo deu errado." }, { status: 500 })
    }
  }
}

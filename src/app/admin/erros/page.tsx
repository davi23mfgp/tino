import Link from "next/link"

import { sessaoDeAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { Cartao, Vazio } from "@/components/ui/painel"
import { BotaoResolverErro } from "./botao"

/**
 * Erros do servidor e das telas, agrupados (29/09/2026, ver `@/lib/erros`).
 *
 * Os mais frequentes nos últimos dias primeiro: é o que mais gente está vendo.
 * A mensagem e a pilha já chegam sem e-mail, CPF, telefone ou chave.
 */
export const dynamic = "force-dynamic"

export default async function ErrosAdmin({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  await sessaoDeAdmin()
  const { ver } = await searchParams
  const resolvidos = ver === "resolvidos"

  const [erros, novos, ultimas24h] = await Promise.all([
    prisma.erroRegistrado.findMany({
      where: { status: resolvidos ? "RESOLVIDO" : "NOVO" },
      orderBy: resolvidos ? { ultimoEm: "desc" } : [{ ultimoEm: "desc" }],
      take: 100,
    }),
    prisma.erroRegistrado.count({ where: { status: "NOVO" } }),
    prisma.erroRegistrado.count({ where: { ultimoEm: { gte: new Date(Date.now() - 86_400_000) } } }),
  ])
  const usuarios = await prisma.usuario.findMany({
    where: { id: { in: [...new Set(erros.map((erro) => erro.usuarioId).filter((id): id is string => Boolean(id)))] } },
    select: { id: true, email: true },
  })
  const emailDe = new Map(usuarios.map((usuario) => [usuario.id, usuario.email]))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cartao>
          <p className="text-[calc(12px*var(--escala-letra))] text-muted-fg">Erros em aberto</p>
          <p className="numero text-2xl font-light">{novos}</p>
        </Cartao>
        <Cartao>
          <p className="text-[calc(12px*var(--escala-letra))] text-muted-fg">Aconteceram nas últimas 24 h</p>
          <p className="numero text-2xl font-light">{ultimas24h}</p>
        </Cartao>
      </div>

      <Cartao titulo={resolvidos ? "Erros resolvidos" : "Erros em aberto"}>
        <div className="mb-3 flex gap-3 text-[calc(13px*var(--escala-letra))]">
          <Link href="/admin/erros" className={resolvidos ? "text-muted-fg" : "font-semibold underline underline-offset-4"}>
            Em aberto
          </Link>
          <Link href="/admin/erros?ver=resolvidos" className={resolvidos ? "font-semibold underline underline-offset-4" : "text-muted-fg"}>
            Resolvidos
          </Link>
        </div>
        {erros.length === 0 ? (
          <Vazio titulo={resolvidos ? "Nenhum erro resolvido ainda" : "Nenhum erro em aberto"} texto="Erro do servidor ou de alguma tela aparece aqui sozinho, agrupado." />
        ) : (
          <div className="divide-y divide-pauta">
            {erros.map((erro) => (
              <div key={erro.id} className="grid gap-2 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-mono text-[calc(13px*var(--escala-letra))]">{erro.mensagem}</p>
                    <p className="mt-1 text-[calc(12px*var(--escala-letra))] text-muted-fg">
                      {erro.origem === "SERVIDOR" ? "servidor" : "tela"}
                      {erro.metodo && ` · ${erro.metodo}`}
                      {erro.rota && ` · ${erro.rota}`} · {erro.ocorrencias} {erro.ocorrencias === 1 ? "vez" : "vezes"} · primeira em{" "}
                      {erro.primeiroEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · última em {erro.ultimoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                      {erro.usuarioId && emailDe.get(erro.usuarioId) && (
                        <>
                          {" · "}
                          <Link href={`/admin/contas/${erro.usuarioId}`} className="underline underline-offset-2">
                            {emailDe.get(erro.usuarioId)}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  <BotaoResolverErro id={erro.id} status={erro.status} />
                </div>
                {erro.pilha && (
                  <details className="text-[calc(12px*var(--escala-letra))] text-muted-fg">
                    <summary className="cursor-pointer">pilha</summary>
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-papel-2 p-3">{erro.pilha}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </Cartao>
    </div>
  )
}

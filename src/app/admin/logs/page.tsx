import Link from "next/link"

import { sessaoDeAdmin } from "@/lib/admin"
import { GUARDA_REGISTRO_ACESSO_DIAS } from "@/lib/registro-acesso"
import { prisma } from "@/lib/prisma"
import { Cartao, Vazio } from "@/components/ui/painel"

/**
 * Logs: quem entrou (registro de acesso do Marco Civil, 6 meses) e o que o
 * admin fez (`RegistroAdmin`, prestação de contas da LGPD).
 *
 * O IP aparece inteiro porque este é o uso que justifica guardá-lo: investigar
 * acesso indevido. Ver esta página também fica registrado.
 */
export const dynamic = "force-dynamic"

export default async function LogsAdmin({ searchParams }: { searchParams: Promise<{ ver?: string; q?: string }> }) {
  const sessao = await sessaoDeAdmin()
  const { ver, q } = await searchParams
  const doAdmin = ver === "admin"
  const busca = (q ?? "").trim()

  const filtrados = busca
    ? await prisma.usuario.findMany({ where: { email: { contains: busca, mode: "insensitive" } }, select: { id: true }, take: 50 })
    : null
  const ids = filtrados?.map((usuario) => usuario.id)

  const [acessos, acoes] = await Promise.all([
    doAdmin
      ? Promise.resolve([])
      : prisma.registroAcesso.findMany({ where: ids ? { usuarioId: { in: ids } } : undefined, orderBy: { criadoEm: "desc" }, take: 200 }),
    doAdmin
      ? prisma.registroAdmin.findMany({ where: ids ? { alvoId: { in: ids } } : undefined, orderBy: { criadoEm: "desc" }, take: 200 })
      : Promise.resolve([]),
  ])
  const pessoas = await prisma.usuario.findMany({
    where: { id: { in: [...new Set([...acessos.map((a) => a.usuarioId), ...acoes.flatMap((a) => [a.adminId, a.alvoId ?? ""])])] } },
    select: { id: true, email: true, nome: true },
  })
  const quem = new Map(pessoas.map((pessoa) => [pessoa.id, pessoa]))
  await prisma.registroAdmin.create({ data: { adminId: sessao.usuarioId, acao: doAdmin ? "viu o log do admin" : "viu o log de acessos", detalhe: busca || null } }).catch(() => {})

  return (
    <div className="space-y-4">
      <Cartao titulo={doAdmin ? "O que o admin fez" : "Acessos"}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-3 text-[calc(13px*var(--escala-letra))]">
            <Link href={`/admin/logs${busca ? `?q=${encodeURIComponent(busca)}` : ""}`} className={doAdmin ? "text-muted-fg" : "font-semibold underline underline-offset-4"}>
              Acessos
            </Link>
            <Link href={`/admin/logs?ver=admin${busca ? `&q=${encodeURIComponent(busca)}` : ""}`} className={doAdmin ? "font-semibold underline underline-offset-4" : "text-muted-fg"}>
              Ações do admin
            </Link>
          </div>
          <form method="get" className="flex gap-2">
            {doAdmin && <input type="hidden" name="ver" value="admin" />}
            <input name="q" defaultValue={busca} placeholder="e-mail" className="rounded-[var(--raio-campo)] border border-pauta bg-background px-3 py-2 text-sm" />
            <button className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Filtrar</button>
          </form>
        </div>

        {(doAdmin ? acoes.length : acessos.length) === 0 ? (
          <Vazio titulo="Nada registrado" texto={busca ? `Nada para "${busca}".` : undefined} />
        ) : doAdmin ? (
          <div className="divide-y divide-pauta text-[calc(13px*var(--escala-letra))]">
            {acoes.map((acao) => (
              <div key={acao.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                <span>
                  <b className="font-medium">{quem.get(acao.adminId)?.nome ?? "admin"}</b> {acao.acao}
                  {acao.alvoId && quem.get(acao.alvoId) && (
                    <>
                      {" · "}
                      <Link href={`/admin/contas/${acao.alvoId}`} className="underline underline-offset-2">
                        {quem.get(acao.alvoId)?.email}
                      </Link>
                    </>
                  )}
                  {acao.detalhe && <span className="text-muted-fg"> · {acao.detalhe}</span>}
                </span>
                <span className="text-muted-fg">{acao.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[calc(13px*var(--escala-letra))]">
              <thead>
                <tr className="border-b border-pauta text-left text-[calc(12px*var(--escala-letra))] text-muted-fg">
                  <th className="py-2 pr-3 font-normal">Quando</th>
                  <th className="py-2 pr-3 font-normal">Conta</th>
                  <th className="py-2 pr-3 font-normal">Evento</th>
                  <th className="py-2 font-normal">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pauta">
                {acessos.map((acesso) => (
                  <tr key={acesso.id}>
                    <td className="py-2 pr-3 text-muted-fg">{acesso.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
                    <td className="py-2 pr-3">
                      {quem.get(acesso.usuarioId) ? (
                        <Link href={`/admin/contas/${acesso.usuarioId}`} className="underline underline-offset-2">
                          {quem.get(acesso.usuarioId)?.email}
                        </Link>
                      ) : (
                        <span className="text-muted-fg">conta apagada</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">{acesso.evento === "LOGIN" ? "entrou" : "criou a conta"}</td>
                    <td className="py-2 font-mono text-[calc(12px*var(--escala-letra))]">{acesso.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-[calc(12px*var(--escala-letra))] text-muted-fg">
          {doAdmin
            ? "Cada ficha aberta, chamado respondido e erro marcado fica aqui. Até 200 linhas, das mais recentes."
            : `Registro de acesso guardado por ${GUARDA_REGISTRO_ACESSO_DIAS} dias (Marco Civil, art. 15) e apagado depois, todo dia. Até 200 linhas.`}
        </p>
      </Cartao>
    </div>
  )
}

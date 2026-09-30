import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getSessao } from "@/lib/auth"
import { hashDoConvite, tokenDeConviteValido } from "@/lib/convites"
import { AceitarConvite } from "./aceitar"
export const metadata = { title: "Convite · Tino", robots: { index: false, follow: false }, referrer: "no-referrer" as const }
export default async function Convite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const convite = tokenDeConviteValido(token) ? await prisma.conviteLar.findUnique({ where: { tokenHash: hashDoConvite(token) }, include: { lar: { select: { nome: true } } } }) : null
  const sessao = await getSessao()
  const valido = convite && convite.expiraEm > new Date() && (!convite.aceitoEm || sessao?.larId === convite.larId)
  return <main className="mx-auto max-w-lg space-y-5 px-4 py-12"><p className="text-xs uppercase tracking-widest text-muted-fg">Tino</p><h1 className="text-2xl font-bold">{valido ? "Vamos compartilhar este espaço?" : "Convite indisponível"}</h1>
    {valido ? <><p>Você recebeu um convite para {convite.lar.nome}. Ao aceitar, terá acesso completo às contas, lançamentos e demais dados deste espaço.</p>{sessao ? <AceitarConvite token={token} /> : <><p className="text-sm text-muted-fg">Entre ou crie sua conta com o e-mail que recebeu o convite. Você também pode usar o Google.</p><Link className="inline-block rounded-full bg-primary px-5 py-3 text-primary-foreground" href={`/convite/${token}/entrar`}>Entrar para aceitar</Link></>}</> : <p>O link expirou ou já foi utilizado. Peça um novo convite.</p>}
  </main>
}

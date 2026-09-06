import { redirect } from "next/navigation"

import { getSessao } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { competenciaAtual, rotuloCompetencia } from "@/lib/datas"
import { Navegacao } from "@/components/navegacao"
import { TinoDock } from "@/components/tino-dock"
import { BarraTopo } from "@/components/barra-topo"

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const sessao = await getSessao()
  if (!sessao) redirect("/login")

  const [lar, usuario] = await Promise.all([
    prisma.lar.findUnique({
      where: { id: sessao.larId },
      select: { onboardingEm: true, meiPerfil: { select: { id: true } } },
    }),
    // O papel vem do banco, não do token: o token vale 30 dias, e tirar o papel
    // de alguém precisa valer no próximo clique.
    prisma.usuario.findUnique({ where: { id: sessao.usuarioId }, select: { admin: true } }),
  ])

  // Lar apagado com token ainda válido: manda para o login em vez de estourar.
  // A mesma checagem existe em `sessaoDaPagina`, porque o Next renderiza layout
  // e página em paralelo e a página consulta o banco por conta própria.
  if (!lar) redirect("/login?sessao=invalida")

  // Painel vazio não diz nada a quem acabou de chegar. Antes de mostrar
  // qualquer tela, o Tino pergunta o essencial — e o usuário pode pular.
  if (!lar.onboardingEm) redirect("/bem-vindo")

  return (
    <div className="area-do-app min-h-screen">
      <Navegacao mei={Boolean(lar.meiPerfil)} />

      <div className="mx-auto w-full max-w-6xl px-4 pb-28 md:pb-10">
        {/* A competência vem daqui, do servidor, e não de dentro da barra: no
            cliente ela sairia do relógio do navegador, e na virada do mês a
            barra diria um mês e o painel outro. */}
        <BarraTopo
          nome={sessao.nome}
          admin={usuario?.admin ?? false}
          competencia={rotuloCompetencia(competenciaAtual())}
        />
        <main className="animate-page-enter">{children}</main>
      </div>

      <TinoDock />
    </div>
  )
}

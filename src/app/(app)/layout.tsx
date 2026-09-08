import { redirect } from "next/navigation"

import { getSessao } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { competenciaAtual, rotuloCompetencia } from "@/lib/datas"
import { Navegacao, SubAbas } from "@/components/navegacao"
import { TinoDock } from "@/components/tino-dock"
import { BarraTopo } from "@/components/barra-topo"
import { AvisoCritico } from "@/components/aviso-critico"
import { Toaster } from "@/components/ui/toast"
import { BuscaPaginasProvider } from "@/components/buscar-paginas"

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const sessao = await getSessao()
  if (!sessao) redirect("/login")

  const [lar, usuario] = await Promise.all([
    prisma.lar.findUnique({
      where: { id: sessao.larId },
      select: { onboardingEm: true, meiPerfil: { select: { id: true } } },
    }),
    // O papel vem do banco, não do token: o token vale 30 dias, e tirar o papel
    // de alguém precisa valer no próximo clique. `avatarUrl` pela mesma razão:
    // trocar a foto não deveria esperar o token vencer para aparecer.
    prisma.usuario.findUnique({ where: { id: sessao.usuarioId }, select: { admin: true, avatarUrl: true } }),
  ])

  // Lar apagado com token ainda válido: manda para o login em vez de estourar.
  // A mesma checagem existe em `sessaoDaPagina`, porque o Next renderiza layout
  // e página em paralelo e a página consulta o banco por conta própria.
  if (!lar) redirect("/login?sessao=invalida")

  // Painel vazio não diz nada a quem acabou de chegar. Antes de mostrar
  // qualquer tela, o Tino pergunta o essencial — e o usuário pode pular.
  if (!lar.onboardingEm) redirect("/bem-vindo")

  return (
    // O diálogo de busca (Ctrl+K) e o gatilho compacto do trilho/cabeçalho
    // móvel, além do campo "Buscar..." da BarraTopo, dividem UM Provider —
    // ver comentário completo em `buscar-paginas.tsx` sobre o diálogo
    // duplicado que existia antes dele.
    <BuscaPaginasProvider mei={Boolean(lar.meiPerfil)}>
      <div className="area-do-app min-h-screen">
        <AvisoCritico />
        <div className="mx-auto w-full max-w-6xl px-4 pb-28 md:pb-10">
          {/* O trilho fixo (fora do fluxo) e as abas do topo (dentro dele,
              por isso moram no mesmo container de largura da página) — ver
              `components/navegacao.tsx`. */}
          <Navegacao mei={Boolean(lar.meiPerfil)} nome={sessao.nome} avatarUrl={usuario?.avatarUrl ?? null} />

          {/* A competência vem daqui, do servidor, e não de dentro da barra: no
              cliente ela sairia do relógio do navegador, e na virada do mês a
              barra diria um mês e o painel outro. */}
          <BarraTopo
            nome={sessao.nome}
            admin={usuario?.admin ?? false}
            avatarUrl={usuario?.avatarUrl ?? null}
            competencia={rotuloCompetencia(competenciaAtual())}
          />
          <SubAbas mei={Boolean(lar.meiPerfil)} />
          <main className="animate-page-enter">{children}</main>
        </div>

        <TinoDock />
        <Toaster />
      </div>
    </BuscaPaginasProvider>
  )
}

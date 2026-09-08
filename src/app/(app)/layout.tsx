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
import { FaixaConectar } from "@/components/faixa-conectar"
import { temBancoConectado } from "@/lib/open-finance/provedor"

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const sessao = await getSessao()
  if (!sessao) redirect("/login")

  const [lar, usuario, bancoConectado] = await Promise.all([
    prisma.lar.findUnique({
      where: { id: sessao.larId },
      select: { onboardingEm: true, meiPerfil: { select: { id: true } } },
    }),
    // O papel vem do banco, não do token: o token vale 30 dias, e tirar o papel
    // de alguém precisa valer no próximo clique. `avatarUrl` pela mesma razão:
    // trocar a foto não deveria esperar o token vencer para aparecer.
    prisma.usuario.findUnique({ where: { id: sessao.usuarioId }, select: { admin: true, avatarUrl: true } }),
    // Quem já ligou o banco não precisa mais do convite. A consulta é do
    // servidor porque a faixa aparece no primeiro paint: decidir isso no
    // cliente faria a página inteira pular para baixo depois de montada.
    temBancoConectado(sessao.larId),
  ])

  // Lar apagado com token ainda válido: manda para o login em vez de estourar.
  // A mesma checagem existe em `sessaoDaPagina`, porque o Next renderiza layout
  // e página em paralelo e a página consulta o banco por conta própria.
  if (!lar) redirect("/login?sessao=invalida")

  const apenasLoja = sessao.papel === "FUNCIONARIO_LOJA"

  // Painel vazio não diz nada a quem acabou de chegar. Antes de mostrar
  // qualquer tela, o Tino pergunta o essencial — e o usuário pode pular.
  //
  // O funcionário da loja nunca cai aqui: essa conversa é sobre a vida
  // pessoal do dono, e `middleware.ts` barra `/bem-vindo` para esse papel —
  // sem a exceção abaixo, um lar sem onboarding feito entraria em loop de
  // redirecionamento (layout manda para lá, middleware manda de volta).
  if (!lar.onboardingEm && !apenasLoja) redirect("/bem-vindo")

  return (
    // O diálogo de busca (Ctrl+K) e o gatilho compacto do trilho/cabeçalho
    // móvel, além do campo "Buscar..." da BarraTopo, dividem UM Provider —
    // ver comentário completo em `buscar-paginas.tsx` sobre o diálogo
    // duplicado que existia antes dele.
    <BuscaPaginasProvider mei={Boolean(lar.meiPerfil) && !apenasLoja}>
      <div className="area-do-app min-h-screen">
        <AvisoCritico />
        <div className="mx-auto w-full max-w-6xl px-4 pb-28 md:pb-10">
          {/* O trilho fixo (fora do fluxo) e as abas do topo (dentro dele,
              por isso moram no mesmo container de largura da página) — ver
              `components/navegacao.tsx`. `apenasLoja` vem do merge com main
              (fase 7): funcionário do balcão só vê o grupo Loja, nunca o
              menu pessoal — mesmo corte que `middleware.ts` já aplica por
              URL, aqui é só o menu não oferecer o que a rota recusaria. */}
          <Navegacao
            mei={Boolean(lar.meiPerfil)}
            apenasLoja={apenasLoja}
            nome={sessao.nome}
            avatarUrl={usuario?.avatarUrl ?? null}
          />

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
          <FaixaConectar conectado={bancoConectado} />
          <main className="animate-page-enter">{children}</main>
        </div>

        {/* O "+" agora mora no meio da barra do polegar (`navegacao.tsx`),
            não mais flutuando sobre o canto — PARTE 4.2 do spec. */}
        <TinoDock />
        <Toaster />
      </div>
    </BuscaPaginasProvider>
  )
}

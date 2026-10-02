import { IdentidadesProvider } from "@/components/identidades-visuais"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { cookies, headers } from "next/headers"
import { rotaPermitidaNoMei } from "@/lib/acesso"
import { COOKIE_CONVITE, tokenDeConviteValido } from "@/lib/convites"
import { getSessao } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { competenciaAtual, rotuloCompetencia } from "@/lib/datas"
import { Navegacao, SubAbas } from "@/components/navegacao"

import { BarraTopo } from "@/components/barra-topo"
import { Toaster } from "@/components/ui/toast"
import { BuscaPaginasProvider } from "@/components/buscar-paginas"



export const metadata: Metadata = { robots: { index: false, follow: false } }

import { RenovarAtalhoDeLancar } from "@/components/atalho-de-lancar"
import { AlertasProvider } from "@/components/alertas-provider"
import { OuvidoDeErros } from "@/components/ouvido-de-erros"
import { AvisoDeTermos } from "@/components/aviso-de-termos"
import { MUDANCAS_DA_VERSAO, precisaVerTermos } from "@/lib/termos"
import { ParedeDeAssinatura } from "@/components/parede-de-assinatura"
import { estadoDoAcesso } from "@/lib/acesso-assinatura"

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const sessao = await getSessao()
  if (!sessao) redirect("/login")
  const convitePendente = (await cookies()).get(COOKIE_CONVITE)?.value
  if (convitePendente && tokenDeConviteValido(convitePendente)) redirect(`/convite/${convitePendente}`)

  const [lar, usuario] = await Promise.all([
    prisma.lar.findUnique({
      where: { id: sessao.larId },
      select: { onboardingEm: true, meiPerfil: { select: { id: true } } },
    }),
    // O papel vem do banco, não do token: o token vale 30 dias, e tirar o papel
    // de alguém precisa valer no próximo clique. `avatarUrl` pela mesma razão:
    // trocar a foto não deveria esperar o token vencer para aparecer.
    prisma.usuario.findUnique({ where: { id: sessao.usuarioId }, select: { admin: true, avatarUrl: true, termosVersao: true } }),
  ])

  // Lar apagado com token ainda válido: manda para o login em vez de estourar.
  // A mesma checagem existe em `sessaoDaPagina`, porque o Next renderiza layout
  // e página em paralelo e a página consulta o banco por conta própria.
  if (!lar) redirect("/login?sessao=invalida")

  // Uma consulta por navegação. O resultado embrulha o conteúdo, não o menu.
  const acesso = await estadoDoAcesso(sessao.usuarioId)

  const apenasLoja = sessao.papel === "FUNCIONARIO_LOJA"
  const mei = Boolean(lar.meiPerfil)
  if (mei && !rotaPermitidaNoMei((await headers()).get("x-caminho") ?? "")) redirect("/loja")

  // Painel vazio não diz nada a quem acabou de chegar. Antes de mostrar
  // qualquer tela, o Tino pergunta o essencial — e o usuário pode pular.
  //
  // O funcionário da loja nunca cai aqui: essa conversa é sobre a vida
  // pessoal do dono, e `middleware.ts` barra `/bem-vindo` para esse papel —
  // sem a exceção abaixo, um lar sem onboarding feito entraria em loop de
  // redirecionamento (layout manda para lá, middleware manda de volta).
  if (!lar.onboardingEm && !apenasLoja && !mei) redirect("/bem-vindo")

  const area = <div className="area-do-app min-h-screen">
        <div className="app-content mx-auto w-full max-w-6xl px-4">
          {/* O trilho fixo (fora do fluxo) e as abas do topo (dentro dele,
              por isso moram no mesmo container de largura da página) — ver
              `components/navegacao.tsx`. `apenasLoja` vem do merge com main
              (fase 7): funcionário do balcão só vê o grupo Loja, nunca o
              menu pessoal — mesmo corte que `middleware.ts` já aplica por
              URL, aqui é só o menu não oferecer o que a rota recusaria. */}
          <Navegacao
            mei={mei}
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
            apenasLoja={apenasLoja}
            mei={mei}
          />
          <SubAbas mei={mei} apenasLoja={apenasLoja} />

          {/* A parede da assinatura embrulha só o conteúdo: o menu, a busca e
              a barra do topo continuam de pé, porque sair e ir para
              Configurações precisa continuar possível. */}
          <main className="animate-page-enter">
            {/* O funcionário da loja não tem acesso a /api/usuario (ver
                `@/lib/acesso`): o aviso é para o titular da conta. */}
            {!apenasLoja && precisaVerTermos(usuario?.termosVersao) && <AvisoDeTermos mudancas={MUDANCAS_DA_VERSAO} />}
            <ParedeDeAssinatura acesso={acesso} mei={mei}>{children}</ParedeDeAssinatura>
          </main>
          {/* Renova o atalho na barra de notificações de quem já o ligou. */}
          {!mei && !apenasLoja && <RenovarAtalhoDeLancar />}
        </div>

        {/* O "+" agora mora no meio da barra do polegar (`navegacao.tsx`),
            não mais flutuando sobre o canto — PARTE 4.2 do spec. */}

        <Toaster />
      </div>

  return <BuscaPaginasProvider mei={mei} apenasLoja={apenasLoja}>
    <OuvidoDeErros />
    {mei || apenasLoja ? area : <AlertasProvider><IdentidadesProvider>{area}</IdentidadesProvider></AlertasProvider>}
  </BuscaPaginasProvider>
}

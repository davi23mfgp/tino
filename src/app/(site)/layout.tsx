import { redirect } from "next/navigation"

import { getSessao } from "@/lib/auth"
import { fonteCorpo, fonteDisplay } from "./tipografia"
import "./vitrine.css"
import "./redesign.css"

/**
 * A vitrine só existe para quem não entrou.
 *
 * Quem já tem sessão vai direto para o painel: mostrar a página de vendas a
 * quem já é cliente é pedir para a pessoa se perguntar se está pagando por algo
 * que já tem.
 *
 * A tipografia e o CSS próprios entram AQUI, e não em `app/layout.tsx`: o app
 * inteiro continua na pilha do sistema e na skin acromática. A vitrine é a
 * única parte com voz visual própria, e o escopo `.vitrine` garante que ela
 * não vaze para dentro do produto.
 */
export default async function LayoutSite({ children }: { children: React.ReactNode }) {
  const sessao = await getSessao()
  if (sessao) redirect("/painel")

  return <div className={`vitrine ${fonteDisplay.variable} ${fonteCorpo.variable}`}>{children}</div>
}

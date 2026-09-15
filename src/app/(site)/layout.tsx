import { fonteCorpo, fonteDisplay } from "./tipografia"
import "./vitrine.css"
import "./landing.css"

/**
 * A vitrine só existe para quem não entrou.
 *
 * Quem já tem sessão vai direto para o painel — mostrar a página de vendas a
 * quem já é cliente é pedir para a pessoa se perguntar se está pagando por algo
 * que já tem. Esse desvio mora em `src/proxy.ts`, e não aqui: ler a sessão
 * neste layout tornava a vitrine dinâmica, e o Next não guarda em cache uma
 * página que decide pelo cookie. O resultado era uma consulta ao banco por
 * visitante só para ler o preço do plano.
 *
 * A tipografia e o CSS próprios entram AQUI, e não em `app/layout.tsx`: o app
 * inteiro continua na pilha do sistema e na skin acromática. A vitrine é a
 * única parte com voz visual própria, e o escopo `.vitrine` garante que ela
 * não vaze para dentro do produto.
 */
export default function LayoutSite({ children }: { children: React.ReactNode }) {
  return <div className={`vitrine ${fonteDisplay.variable} ${fonteCorpo.variable}`}>{children}</div>
}

/**
 * O que cada papel de acesso pode abrir.
 *
 * Funcionário da loja loga com usuário próprio (ver docs/TINO-MEI.md, Fase 7),
 * mas nunca deveria ver conta pessoal, dívida ou saldo do dono — quem atende o
 * balcão não é sócio da vida financeira de quem contratou.
 *
 * A checagem mora aqui, pura, porque tanto o `middleware.ts` (barra a URL)
 * quanto o menu (esconde o item) precisam da mesma resposta. Dois lugares
 * decidindo o mesmo por conta própria é a receita para um deles ficar
 * desatualizado e abrir uma porta que o outro achava fechada.
 *
 * MEI e DAS ficam de fora do funcionário de propósito: é situação tributária
 * do dono, não operação de balcão.
 */

export type PapelDeAcesso = "TITULAR" | "CONJUGE" | "DEPENDENTE" | "CONVIDADO" | "FUNCIONARIO_LOJA"

// "/api/erros": a tela do funcionário também quebra, e o erro dele tem de
// chegar ao registro do admin como o de qualquer um.
const LIBERADO_PARA_FUNCIONARIO = ["/loja", "/api/loja", "/o", "/s", "/api/orcamento-publico", "/api/servico-publico", "/login", "/seguranca", "/api/auth/mfa", "/api/auth/logout", "/termos", "/privacidade", "/api/erros"]

/// Vive sob "/loja" mas é resultado/lucro do negócio, não operação de balcão —
/// checado antes do prefixo geral, senão "começa com /loja" liberaria sozinho.
const BLOQUEADO_MESMO_NA_LOJA = ["/loja/financas", "/api/loja/demonstrativo", "/api/loja/funcionario", "/loja/minha-conta", "/loja/dados", "/loja/painel", "/loja/dados", "/api/loja/painel", "/api/loja/cadastro", "/api/loja/meta", "/loja/clientes", "/api/loja/clientes", "/api/loja/orcamentos", "/loja/agenda", "/api/loja/agenda", "/api/loja/ordens", "/api/loja/avisos", "/loja/comecar", "/api/loja/negocios", "/api/loja/area"]

function combinaAlgumPrefixo(caminho: string, prefixos: string[]): boolean {
  return prefixos.some((prefixo) => caminho === prefixo || caminho.startsWith(`${prefixo}/`))
}

export function rotaPermitida(papel: PapelDeAcesso, caminho: string): boolean {
  if (papel !== "FUNCIONARIO_LOJA") return true
  if (combinaAlgumPrefixo(caminho, BLOQUEADO_MESMO_NA_LOJA)) return false

  return combinaAlgumPrefixo(caminho, LIBERADO_PARA_FUNCIONARIO)
}

// A conta MEI usa o mesmo mecanismo de login, mas suas telas e APIs são do
// negócio. Bloquear por URL evita que um link antigo abra a vida pessoal.
const LIBERADO_PARA_MEI = ["/loja", "/mei", "/assinatura", "/seguranca", "/termos", "/privacidade", "/api/loja", "/api/mei", "/api/assinatura", "/api/usuario", "/api/auth", "/api/seguranca", "/api/suporte", "/api/erros"]

export function rotaPermitidaNoMei(caminho: string): boolean {
  return combinaAlgumPrefixo(caminho, LIBERADO_PARA_MEI)
}

/**
 * Qual Tino a sessão abre: o pessoal ou o MEI.
 *
 * A mesma conta serve os dois (Davi, 04/10/2026: "o mesmo email pode ser
 * usado, mas tem que entrar em logins diferentes"). Antes o modo saía do lar:
 * bastava ter perfil MEI para todo login cair na loja, inclusive o feito pela
 * tela do Tino pessoal. Agora quem decide é a tela onde a pessoa entrou, e o
 * token guarda a escolha.
 *
 * O perfil MEI continua obrigatório para o modo MEI: sem ele não há loja para
 * abrir, e a sessão fica no pessoal.
 *
 * Token emitido antes desta regra não tem `produto`. Para ele vale o que a
 * conta indica: com MEI e sem a conversa de boas-vindas do pessoal, a pessoa
 * só usa a loja, e jogá-la no pessoal a mandaria para um cadastro que ela
 * nunca pediu. Qualquer outro caso abre o pessoal.
 */
export type Produto = "pessoal" | "mei"

export function produtoDaSessao(doToken: unknown, conta: { temMei: boolean; onboardingFeito: boolean }): Produto {
  if (doToken === "mei" || doToken === "pessoal") return doToken
  return conta.temMei && !conta.onboardingFeito ? "mei" : "pessoal"
}

export function sessaoEmModoMei(produto: Produto, temMei: boolean): boolean {
  return produto === "mei" && temMei
}

/// A conta existe, mas nunca ligou o MEI. Entrar no modo MEI sem perfil não
/// teria loja para abrir; e cair no pessoal calado é o defeito que esta regra
/// corrige, só que ao contrário.
export const SEM_MEI = "Esta conta ainda não tem o Tino MEI. Entre pelo login do Tino pessoal."

/**
 * Admin entra por uma porta só (Davi, 06/10/2026: "o admin não vai ser
 * acessado pela landing page nem pelo login comum").
 *
 * Conta de admin no login comum recebe a mesma recusa de senha errada, e
 * conta comum na entrada do admin também: a resposta não pode contar a quem
 * varre e-mails quais contas são de admin. O Google nunca abre conta de admin.
 */
export function entradaPermitida(porta: "comum" | "admin", contaEhAdmin: boolean): boolean {
  return porta === "admin" ? contaEhAdmin : !contaEhAdmin
}

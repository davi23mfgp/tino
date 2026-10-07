import {
  CalendarDays,
  BarChart3,
  CreditCard,
  Flag,
  LineChart,
  ListOrdered,
  NotebookPen,
  Package,
  PieChart,
  ListChecks,
  PiggyBank,
  Receipt,
  Repeat,
  Settings,
  TrendingDown,
  Tags,
  ShoppingBag,
  Users,
  Sprout,
  Store,
  Target,
  Upload,
  User,
  Wallet,
  Wand2,
  Zap,
} from "lucide-react"

import { rotaPermitida } from "@/lib/acesso"

/**
 * A IA de navegação, reestruturada em 07/09/2026 na direção "Calen" (ver
 * `docs/PROMPT-REDESIGN-CALEN.md`): duas camadas, não uma.
 *
 * ANTES desta rodada: seis abas de peso igual sempre visíveis no topo
 * (Hoje/Movimento/Planejar/Dívidas/Futuro/Parecer) — já era uma melhoria
 * sobre as dezoito telas soltas de antes, mas ainda pedia que a pessoa
 * decidisse entre seis opções toda vez que olhava pro topo da tela.
 *
 * AGORA: um NÚCLEO de 4 itens sempre visíveis (o que cobre "ver que tá tudo
 * bem" sem abrir mais nada — Calen usa Início/Calendário/Contas/Perfil,
 * aqui vira Início/Movimento/Cartões/Perfil) + um NÍVEL 2 atrás de um único
 * ponto de entrada ("Mais"), agrupado por INTENÇÃO (Planejar/Dívidas/
 * Analisar), não por ordem de criação. Regras e Assinatura não entram em
 * nenhuma lista aqui — já viraram cards dentro de Configurações numa sessão
 * anterior, e continuam lá.
 *
 * Este módulo continua sendo a ÚNICA fonte da IA: núcleo, menu "Mais",
 * gaveta do celular e busca de telas leem daqui.
 */

export interface ItemNav {
  rota: string
  rotulo: string
  Icone: typeof BarChart3
}

export interface GrupoNav {
  chave: string
  titulo: string
  /**
   * O que existe dentro do grupo, em uma linha.
   *
   * Era uma PERGUNTA generica ("Quanto eu posso gastar?", "Como eu estou?").
   * Quatro perguntas retoricas empilhadas na gaveta nao ajudam a escolher --
   * quem abriu o menu ja sabe que quer decidir alguma coisa, precisa saber
   * qual tela tem o que procura. Agora a linha lista os destinos.
   */
  pergunta: string
  itens: ItemNav[]
}

/**
 * Núcleo — nível 1, sempre visível (trilho no desktop, barra do polegar no
 * celular). Cada entrada é um `GrupoNav` (não só um `ItemNav`) mesmo quando
 * tem 1 item só, porque "Movimento" tem irmãos (Anotar, Importar) que
 * aparecem como sub-navegação (`<SubAbas>`) quando a pessoa já está numa
 * dessas telas — o mesmo mecanismo que os grupos do nível 2 usam.
 */
export const NUCLEO: GrupoNav[] = [
  {
    chave: "inicio",
    titulo: "Início",
    pergunta: "Saldo, resultado do mes e o que decidir",
    itens: [{ rota: "/painel", rotulo: "Início", Icone: BarChart3 }],
  },
  {
    chave: "movimento",
    titulo: "Extrato",
    pergunta: "Extrato, anotar e importar",
    itens: [
      { rota: "/transacoes", rotulo: "Transações", Icone: Receipt },
      // "Entrada automática" saiu em 28/09/2026: sem Open Finance (decisão do
      // Davi), a tela só repetia os caminhos que já moram em Anotar e Importar.
      { rota: "/capturas", rotulo: "Anotar", Icone: Zap },
      { rota: "/importar", rotulo: "Importar", Icone: Upload },
    ],
  },
  {
    chave: "cartoes",
    titulo: "Cartões",
    pergunta: "Faturas, limites e parcelas",
    itens: [{ rota: "/cartoes", rotulo: "Cartões", Icone: CreditCard }, { rota: "/milhas", rotulo: "Pontos e milhas", Icone: Flag }],
  },
  {
    chave: "perfil",
    titulo: "Perfil",
    pergunta: "Seus dados e preferencias",
    itens: [{ rota: "/configuracoes", rotulo: "Perfil", Icone: User }],
  },
]

/**
 * Nível 2 — atrás do único ponto de entrada "Mais" (`MenuMais`). Rotulado
 * por INTENÇÃO, igual ao Calen (lá: Planejar/Analisar/Ajustes). Nenhuma
 * rota nova: são as mesmas telas que já existiam nos grupos antigos
 * "planejar"/"dívidas"/"futuro"/"parecer", só que fora do olhar constante.
 */
export const GRUPOS_NAV: GrupoNav[] = [
  {
    chave: "planejar",
    titulo: "Planejar",
    pergunta: "Orcamento, contas fixas, metas e reserva",
    itens: [
      { rota: "/orcamento", rotulo: "Orçamento", Icone: PiggyBank },
      { rota: "/recorrencias", rotulo: "Contas fixas", Icone: Repeat },
      { rota: "/metas", rotulo: "Metas", Icone: Target },
      { rota: "/reserva", rotulo: "Reserva de emergência", Icone: Wallet },
    ],
  },
  {
    chave: "dividas",
    titulo: "Dívidas",
    pergunta: "Dividas, plano de pagamento e emprestimo",
    itens: [
      { rota: "/dividas", rotulo: "Dívidas", Icone: TrendingDown },
      { rota: "/plano", rotulo: "Plano de pagamento", Icone: ListChecks },
      { rota: "/emprestimos", rotulo: "Empréstimo", Icone: CreditCard },
    ],
  },
  {
    chave: "analisar",
    titulo: "Analisar",
    pergunta: "Analise, fluxo de caixa, simulador e investimentos",
    itens: [
      { rota: "/analise", rotulo: "Análise", Icone: PieChart },
      { rota: "/projecao", rotulo: "Fluxo de caixa", Icone: LineChart },
      { rota: "/simulador", rotulo: "Simulador", Icone: Wand2 },
      { rota: "/investir", rotulo: "Investimentos", Icone: Sprout },
    ],
  },
  {
    chave: "ajustes",
    titulo: "Ajustes",
    pergunta: "Configuracoes e categorias",
    itens: [{ rota: "/configuracoes", rotulo: "Configurações", Icone: Settings }, { rota: "/categorias", rotulo: "Categorias e ícones", Icone: Tags }],
  },
]

/**
 * A loja não está no brief do Calen (app de finanças pessoais genérico,
 * sem MEI) — mas é funcionalidade real de quem tem CNPJ. Entra como seção
 * a mais no menu "Mais", só pra quem é MEI.
 *
 * "Finanças da loja" (DRE, fase 8 de `docs/TINO-MEI.md`) voltou pro grupo no
 * merge com `main` de 08/09/2026 — a tela já existia em `/loja/financas`,
 * só nunca tinha entrado nesta lista porque foi construída depois que este
 * módulo (linhagem do redesign Calen) se separou de `main`.
 */
export const GRUPO_LOJA: GrupoNav = {
  chave: "loja",
  titulo: "Loja",
  pergunta: "Balcao, prateleira, fiado e MEI",
  itens: [
    { rota: "/loja/painel", rotulo: "Visão geral", Icone: BarChart3 },
    { rota: "/loja", rotulo: "Balcão", Icone: ShoppingBag },
    // Terceiro de propósito: na barra do celular aparecem os três primeiros,
    // e o canvas do passo 36 pôs Clientes ali (Catálogo vai para "Mais").
    { rota: "/loja/clientes", rotulo: "Clientes", Icone: Users },
    { rota: "/loja/agenda", rotulo: "Agenda", Icone: CalendarDays },
    { rota: "/loja/catalogo", rotulo: "Catálogo", Icone: Tags },
    { rota: "/loja/estoque", rotulo: "Prateleira", Icone: Package },
    { rota: "/loja/fiado", rotulo: "Fiado", Icone: NotebookPen },
    { rota: "/loja/contas", rotulo: "Contas a pagar", Icone: Receipt },
    { rota: "/loja/financas", rotulo: "Finanças da loja", Icone: Wallet },
    { rota: "/mei", rotulo: "MEI e DAS", Icone: Store },
    { rota: "/loja/dados", rotulo: "Dados da empresa", Icone: Settings },
  ],
}

/**
 * O que o FUNCIONÁRIO do balcão vê — sempre um subconjunto de `GRUPO_LOJA`,
 * filtrado por `rotaPermitida` em vez de mantido como lista solta ao lado.
 *
 * Existe por causa de `lib/acesso.ts`: o comentário de lá já avisa que ter
 * DOIS lugares decidindo "o que o funcionário pode ver" é a receita para um
 * deles ficar desatualizado e abrir uma porta que o outro achava fechada —
 * então o menu pergunta pra `acesso.ts`, nunca duplica a lista (MEI/DAS e
 * Finanças da loja ficam de fora sozinhos, sem precisar repetir os dois
 * nomes de rota aqui).
 */
export const GRUPO_LOJA_FUNCIONARIO: GrupoNav = {
  ...GRUPO_LOJA,
  itens: GRUPO_LOJA.itens.filter((item) => rotaPermitida("FUNCIONARIO_LOJA", item.rota)),
}

/** As seções do menu "Mais" (nível 2), com Loja anexada só pra quem é MEI. */
export function gruposPara(mei: boolean): GrupoNav[] {
  return mei ? [GRUPO_LOJA] : GRUPOS_NAV
}

/** Todo grupo que existe pra essa pessoa — núcleo + nível 2 — usado por
    `estaAtivo`/`grupoDoCaminho`/busca, que não distinguem camada. */
export function todosOsGrupos(mei: boolean): GrupoNav[] {
  return mei ? [GRUPO_LOJA] : [...NUCLEO, ...GRUPOS_NAV]
}

/** startsWith cobre subrota (/transacoes/123) sem marcar tudo em "/". */
export function estaAtivo(caminho: string, rota: string): boolean {
  if (rota === "/loja") return caminho === "/loja"
  return caminho === rota || caminho.startsWith(`${rota}/`)
}

export function grupoDoCaminho(grupos: GrupoNav[], caminho: string): GrupoNav | null {
  return grupos.find((grupo) => grupo.itens.some((item) => estaAtivo(caminho, item.rota))) ?? null
}

/** Título da página no cabeçalho — mesma lista das abas, nunca um mapa à parte. */
/** Telas que não estão no menu mas precisam de título no topo; sem nome aqui, o topo dizia só "Tino" (inventário de 07/10/2026). */
const TITULOS_FORA_DO_MENU: Record<string, string> = {
  "/loja/comecar": "Seu negócio",
  "/loja/simples": "Início",
  "/loja/minha-conta": "Minha conta",
  "/lancar": "Anotar",
  "/regras": "Regras",
  "/assinatura": "Assinatura",
}

export function tituloDaRota(grupos: GrupoNav[], caminho: string): string | null {
  if (TITULOS_FORA_DO_MENU[caminho]) return TITULOS_FORA_DO_MENU[caminho]
  for (const grupo of grupos) {
    for (const item of grupo.itens) {
      if (estaAtivo(caminho, item.rota)) return item.rotulo
    }
  }
  return null
}

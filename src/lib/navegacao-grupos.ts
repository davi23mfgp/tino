import {
  BarChart3,
  CreditCard,
  Flag,
  LineChart,
  ListOrdered,
  NotebookPen,
  Package,
  PieChart,
  Receipt,
  Repeat,
  Settings,
  ShoppingBag,
  Sprout,
  Store,
  Target,
  Upload,
  User,
  Wand2,
  Zap,
} from "lucide-react"

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
  /** A pergunta que o grupo responde — usada como subtítulo/tooltip. */
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
    pergunta: "O que eu faço agora?",
    itens: [{ rota: "/painel", rotulo: "Início", Icone: BarChart3 }],
  },
  {
    chave: "movimento",
    titulo: "Movimento",
    pergunta: "Para onde foi meu dinheiro?",
    itens: [
      { rota: "/transacoes", rotulo: "Transações", Icone: Receipt },
      { rota: "/capturas", rotulo: "Anotar", Icone: Zap },
      { rota: "/importar", rotulo: "Importar", Icone: Upload },
    ],
  },
  {
    chave: "cartoes",
    titulo: "Cartões",
    pergunta: "Como estão meus cartões?",
    itens: [{ rota: "/cartoes", rotulo: "Cartões", Icone: CreditCard }],
  },
  {
    chave: "perfil",
    titulo: "Perfil",
    pergunta: "Sua conta",
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
    pergunta: "Quanto eu posso gastar?",
    itens: [
      { rota: "/orcamento", rotulo: "Orçamento", Icone: Target },
      { rota: "/recorrencias", rotulo: "Contas fixas", Icone: Repeat },
      { rota: "/parcelamentos", rotulo: "Parcelamentos", Icone: ListOrdered },
      { rota: "/metas", rotulo: "Metas", Icone: Flag },
    ],
  },
  {
    chave: "dividas",
    titulo: "Dívidas",
    pergunta: "Como eu saio disso?",
    itens: [
      { rota: "/dividas", rotulo: "Dívidas", Icone: Flag },
      { rota: "/plano", rotulo: "Plano de pagamento", Icone: Flag },
      { rota: "/emprestimos", rotulo: "Empréstimo", Icone: CreditCard },
    ],
  },
  {
    chave: "analisar",
    titulo: "Analisar",
    pergunta: "Como eu estou?",
    itens: [
      { rota: "/analise", rotulo: "Análise", Icone: PieChart },
      { rota: "/projecao", rotulo: "Projeção", Icone: LineChart },
      { rota: "/simulador", rotulo: "Simulador", Icone: Wand2 },
      { rota: "/investir", rotulo: "Longo prazo", Icone: Sprout },
    ],
  },
  {
    chave: "ajustes",
    titulo: "Ajustes",
    pergunta: "Configurar o app",
    itens: [{ rota: "/configuracoes", rotulo: "Configurações", Icone: Settings }],
  },
]

/**
 * A loja não está no brief do Calen (app de finanças pessoais genérico,
 * sem MEI) — mas é funcionalidade real de quem tem CNPJ. Entra como seção
 * a mais no menu "Mais", só pra quem é MEI.
 */
export const GRUPO_LOJA: GrupoNav = {
  chave: "loja",
  titulo: "Loja",
  pergunta: "Como vai o negócio?",
  itens: [
    { rota: "/loja", rotulo: "Balcão", Icone: ShoppingBag },
    { rota: "/loja/estoque", rotulo: "Prateleira", Icone: Package },
    { rota: "/loja/fiado", rotulo: "Fiado", Icone: NotebookPen },
    { rota: "/loja/contas", rotulo: "Contas a pagar", Icone: Receipt },
    { rota: "/mei", rotulo: "MEI e DAS", Icone: Store },
  ],
}

/** As seções do menu "Mais" (nível 2), com Loja anexada só pra quem é MEI. */
export function gruposPara(mei: boolean): GrupoNav[] {
  return mei ? [...GRUPOS_NAV, GRUPO_LOJA] : GRUPOS_NAV
}

/** Todo grupo que existe pra essa pessoa — núcleo + nível 2 — usado por
    `estaAtivo`/`grupoDoCaminho`/busca, que não distinguem camada. */
export function todosOsGrupos(mei: boolean): GrupoNav[] {
  return [...NUCLEO, ...gruposPara(mei)]
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
export function tituloDaRota(grupos: GrupoNav[], caminho: string): string | null {
  for (const grupo of grupos) {
    for (const item of grupo.itens) {
      if (estaAtivo(caminho, item.rota)) return item.rotulo
    }
  }
  return null
}

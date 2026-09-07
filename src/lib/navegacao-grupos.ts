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
  ShoppingBag,
  Sprout,
  Store,
  Target,
  Upload,
  Wand2,
  Zap,
} from "lucide-react"

/**
 * A IA nova do app, decidida em 07/09/2026: seis perguntas em vez de dezoito
 * telas soltas. Nenhuma rota foi removida — cada uma continua respondendo
 * pelo próprio endereço, só reagrupada por PERGUNTA do usuário em vez de por
 * tipo de ferramenta. Ver `docs/REDESIGN-EM-CURSO.md` para o brief completo
 * e o que ficou de fora dele por enquanto.
 *
 * Este módulo é a ÚNICA fonte da IA: o trilho lateral, as abas do topo, a
 * gaveta do celular e a barra do polegar leem daqui. Duas listas escritas à
 * mão é como o item novo vira "Fixa" no cabeçalho de uma tela e continua
 * certo em outra — já aconteceu no Fixa, não repete aqui.
 */

export interface ItemNav {
  rota: string
  rotulo: string
  Icone: typeof BarChart3
}

export interface GrupoNav {
  chave: string
  titulo: string
  /** A pergunta que a aba responde — usada como subtítulo/tooltip. */
  pergunta: string
  itens: ItemNav[]
}

export const GRUPOS_NAV: GrupoNav[] = [
  {
    chave: "hoje",
    titulo: "Hoje",
    pergunta: "O que eu faço agora?",
    itens: [
      { rota: "/painel", rotulo: "Visão geral", Icone: BarChart3 },
      { rota: "/capturas", rotulo: "Anotar", Icone: Zap },
    ],
  },
  {
    chave: "movimento",
    titulo: "Movimento",
    pergunta: "Para onde foi meu dinheiro?",
    itens: [
      { rota: "/transacoes", rotulo: "Transações", Icone: Receipt },
      { rota: "/cartoes", rotulo: "Cartões", Icone: CreditCard },
      { rota: "/importar", rotulo: "Importar", Icone: Upload },
    ],
  },
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
    chave: "futuro",
    titulo: "Futuro",
    pergunta: "Onde isso vai dar?",
    itens: [
      { rota: "/projecao", rotulo: "Projeção", Icone: LineChart },
      { rota: "/simulador", rotulo: "Simulador", Icone: Wand2 },
      { rota: "/investir", rotulo: "Longo prazo", Icone: Sprout },
    ],
  },
  {
    chave: "parecer",
    titulo: "Parecer",
    pergunta: "Como eu estou?",
    itens: [{ rota: "/analise", rotulo: "Análise", Icone: PieChart }],
  },
]

/**
 * A loja não está no brief (ele descreve um app de finanças pessoais
 * genérico, sem MEI) — mas é funcionalidade real de quem tem CNPJ, e "nada é
 * removido" vale pra ela também. Entra como sétima aba só pra quem é MEI.
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

export function gruposPara(mei: boolean): GrupoNav[] {
  return mei ? [...GRUPOS_NAV, GRUPO_LOJA] : GRUPOS_NAV
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

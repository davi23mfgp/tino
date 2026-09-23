import {
  ArrowLeftRight,
  BadgePercent,
  Banknote,
  CalendarClock,
  BarChart3,
  LineChart,
  CircleHelp,
  ClipboardList,
  Coins,
  CreditCard,
  FileText,
  Flag,
  Gauge,
  Landmark,
  type LucideIcon,
  PiggyBank,
  Receipt,
  Repeat,
  Scale,
  ShoppingBag,
  Store,
  Tags,
  Target,
  TrendingUp,
  Upload,
  Users,
  Wallet,
} from "lucide-react"

/**
 * O ícone de cada ferramenta do app (aba de tela, atalho do menu).
 *
 * Existe porque as abas eram só texto: "Compras Parcelas Categorias Orçamento
 * Ajuda Importar" numa fileira lê como uma frase, não como seis destinos. Com
 * ícone, o olho encontra a aba que quer sem ler as outras cinco.
 *
 * A busca é pelo RÓTULO, normalizado sem acento: as abas são montadas em três
 * lugares diferentes do app (Tabs dos cartões, `AbasInternas`, trilho de
 * grupo), e passar o ícone à mão nos três deixaria um sem ícone no dia em que
 * alguém criasse a quarta.
 *
 * Sem correspondência devolve `null`, e a aba fica só com texto. Ícone
 * errado é pior do que ícone nenhum: ele ensina a coisa errada.
 */
const POR_ROTULO: Array<[RegExp, LucideIcon]> = [
  [/^compras?$/, ShoppingBag],
  [/^parcelas?$|parcelamento/, CalendarClock],
  [/^categorias?$/, Tags],
  [/orcamento/, Target],
  [/^ajuda$|duvida/, CircleHelp],
  [/importar|extrato do banco/, Upload],
  [/indicadores/, Gauge],
  [/^dre$|resultado/, FileText],
  [/balanco/, Scale],
  [/graficos?/, BarChart3],
  [/analise|parecer/, LineChart],
  [/fluxo de caixa|projecao/, TrendingUp],
  [/simulador|hipotese/, Repeat],
  [/investir|longo prazo|carteira/, Landmark],
  [/^metas?$/, Flag],
  [/^dividas?$|divida/, BadgePercent],
  [/emprestimo/, Banknote],
  [/reserva/, PiggyBank],
  [/^plano|pagamento/, ClipboardList],
  [/^contas?$|^conta /, Wallet],
  [/^cartoes?$|^cartao/, CreditCard],
  [/transacoes|lancamentos/, ArrowLeftRight],
  [/recorrencias|contas fixas|fixas/, Repeat],
  [/^regras?$/, ClipboardList],
  [/^loja$|balcao|venda/, Store],
  [/estoque|prateleira/, Coins],
  [/fiado|clientes?/, Users],
  [/^mei$|imposto|das\b/, Receipt],
]

export function iconeDaFerramenta(rotulo: string): LucideIcon | null {
  const limpo = rotulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
  return POR_ROTULO.find(([padrao]) => padrao.test(limpo))?.[1] ?? null
}

/** O ícone já montado, no tamanho e traço da barra de ferramentas. */
export function IconeFerramenta({ rotulo }: { rotulo: string }) {
  const Icone = iconeDaFerramenta(rotulo)
  return Icone ? <Icone className="size-[17px] shrink-0" strokeWidth={1.75} aria-hidden /> : null
}

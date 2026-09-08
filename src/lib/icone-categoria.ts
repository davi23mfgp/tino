import {
  ArrowLeftRight,
  Banknote,
  BookOpen,
  Car,
  CreditCard,
  Dog,
  Dumbbell,
  Home,
  Landmark,
  Package,
  Percent,
  Pill,
  Plane,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tv,
  Utensils,
  Wifi,
  Zap,
} from "lucide-react"

type Icone = typeof Receipt

/**
 * O ícone de cada linha de lista.
 *
 * Existe por causa da PARTE 1.5 do `docs/SPEC-CALEN-PRECISO.md`: as listas do
 * Tino eram texto puro em duas colunas ("Centauro … R$ 89,90"), e uma pilha
 * dessas obriga a LER cada linha pra saber onde uma acaba e a outra começa.
 * Na referência toda linha tem um círculo com ícone à esquerda, e é ele que
 * deixa escanear sem ler.
 *
 * A escolha vem do GRUPO da categoria, não do nome: grupo é um enum do banco
 * (`CategoriaGrupo`), então vale para categoria que a pessoa criou com nome
 * qualquer, e não quebra quando alguém escreve "mercadin" em vez de
 * "Supermercado". O nome só é consultado DEPOIS, para separar irmãs dentro do
 * mesmo grupo (farmácia e academia são as duas SAUDE, mas um comprimido e um
 * haltere contam coisas diferentes num relance).
 */
const POR_GRUPO: Record<string, Icone> = {
  MORADIA: Home,
  SERVICOS: Wifi,
  ALIMENTACAO: ShoppingCart,
  TRANSPORTE: Car,
  SAUDE: Pill,
  EDUCACAO: BookOpen,
  LAZER: Sparkles,
  PESSOAL: ShoppingBag,
  DIVIDAS: Percent,
  RENDA: Banknote,
  OUTROS: Package,
}

/** Casos em que o nome diz mais que o grupo. Comparado sem acento e em minúscula. */
const POR_NOME: [RegExp, Icone][] = [
  [/restaurante|delivery|lanche|padaria|almoco|jantar/, Utensils],
  [/academia|gym/, Dumbbell],
  [/streaming|assinatura|netflix|spotify/, Tv],
  [/viagem|passagem|hotel/, Plane],
  [/pet|veterinari/, Dog],
  [/cartao|fatura/, CreditCard],
  [/emprestimo|financiamento|banco/, Landmark],
  [/energia|luz|agua|gas/, Zap],
]

// A faixa dos acentos combinantes vem por `RegExp` de string, e não por
// literal `/.../`: escrita direta, ela guardaria caractere invisível no
// arquivo, que qualquer conversão de codificação estraga sem avisar.
const ACENTOS = new RegExp("[\\u0300-\\u036f]", "g")

function semAcento(texto: string) {
  return texto.normalize("NFD").replace(ACENTOS, "").toLowerCase()
}

export function iconeDaCategoria(
  categoria?: { nome?: string | null; grupo?: string | null } | null,
  tipo?: "RECEITA" | "DESPESA" | "TRANSFERENCIA" | null,
): Icone {
  if (categoria?.nome) {
    const nome = semAcento(categoria.nome)
    for (const [padrao, icone] of POR_NOME) if (padrao.test(nome)) return icone
  }
  if (categoria?.grupo && POR_GRUPO[categoria.grupo]) return POR_GRUPO[categoria.grupo]

  // Sem categoria o tipo ainda diz alguma coisa, e é melhor que um círculo
  // vazio: transferência anda de lado, receita é dinheiro entrando, o resto é
  // um comprovante.
  if (tipo === "TRANSFERENCIA") return ArrowLeftRight
  if (tipo === "RECEITA") return Banknote
  return Receipt
}

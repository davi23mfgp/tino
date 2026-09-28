import {
  ArrowLeftRight,
  Baby,
  Banknote,
  Bus,
  Coffee,
  Droplet,
  Gamepad2,
  Gift,
  Heart,
  Music,
  Wrench,
  BookOpen,
  Car,
  CreditCard,
  Dog,
  Dumbbell,
  Fuel,
  Home,
  Landmark,
  Package,
  Percent,
  Pill,
  Plane,
  Receipt,
  Shirt,
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
  // Onde só o nome chega (os totais por categoria das abas do cartão não
  // carregam o grupo), os nomes mais comuns não podem cair no comprovante. Antes da energia:
  // "gas" pegaria "gasolina".
  [/supermercado|mercado|feira/, ShoppingCart],
  [/combustivel|gasolina|posto/, Fuel],
  [/vestuario|roupa/, Shirt],
  [/farmacia|remedio/, Pill],
  [/energia|luz|agua|gas/, Zap],
]

/**
 * Ícones que a pessoa escolhe para a categoria. Ficam gravados no campo
 * `icone` com o prefixo "i:" — o mesmo campo guarda emoji, e o banco ainda tem
 * "circle" de versões antigas, que não é nenhum dos dois. Escolhido, vale
 * antes do nome e do grupo.
 */
export const ICONES_ESCOLHIVEIS: Record<string, Icone> = {
  "i:casa": Home, "i:luz": Zap, "i:agua": Droplet, "i:mercado": ShoppingCart, "i:talheres": Utensils, "i:cafe": Coffee,
  "i:carro": Car, "i:combustivel": Fuel, "i:onibus": Bus, "i:viagem": Plane, "i:remedio": Pill, "i:academia": Dumbbell,
  "i:saude": Heart, "i:livro": BookOpen, "i:tv": Tv, "i:jogo": Gamepad2, "i:musica": Music, "i:lazer": Sparkles,
  "i:roupa": Shirt, "i:sacola": ShoppingBag, "i:presente": Gift, "i:bebe": Baby, "i:pet": Dog, "i:internet": Wifi,
  "i:conserto": Wrench, "i:juros": Percent, "i:banco": Landmark, "i:cartao": CreditCard, "i:dinheiro": Banknote, "i:caixa": Package,
}

// A faixa dos acentos combinantes vem por `RegExp` de string, e não por
// literal `/.../`: escrita direta, ela guardaria caractere invisível no
// arquivo, que qualquer conversão de codificação estraga sem avisar.
const ACENTOS = new RegExp("[\\u0300-\\u036f]", "g")

function semAcento(texto: string) {
  return texto.normalize("NFD").replace(ACENTOS, "").toLowerCase()
}

export function iconeDaCategoria(
  categoria?: { nome?: string | null; grupo?: string | null; icone?: string | null } | null,
  tipo?: "RECEITA" | "DESPESA" | "TRANSFERENCIA" | null,
): Icone {
  if (categoria?.icone && ICONES_ESCOLHIVEIS[categoria.icone]) return ICONES_ESCOLHIVEIS[categoria.icone]
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

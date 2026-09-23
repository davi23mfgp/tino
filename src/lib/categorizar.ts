/**
 * Categorização automática.
 *
 * Duas camadas, nesta ordem:
 * 1. regras do lar (aprendidas ou escritas pelo usuário) — sempre vencem;
 * 2. dicionário embutido de comerciantes brasileiros — cobre o primeiro
 *    extrato, quando o usuário ainda não ensinou nada ao Tino.
 *
 * O que a camada 2 acerta vira sugestão; o que o usuário corrigir vira regra
 * na camada 1, com prioridade acima do dicionário.
 */

import { regexSegura } from "@/lib/regex-segura"
import type { GrupoCategoria } from "@prisma/client"

export interface RegraAplicavel {
  id: string
  padrao: string
  regex: boolean
  categoriaId: string
  membroId: string | null
  renomearPara: string | null
  tags: string[]
  prioridade: number
  ativa: boolean
}

export interface Sugestao {
  categoriaId?: string
  /// Nome de categoria do dicionário, quando ainda não há id resolvido.
  categoriaNome?: string
  grupo?: GrupoCategoria
  descricaoLimpa: string
  membroId?: string | null
  tags: string[]
  regraId?: string
  /// 0 a 100. Abaixo de 60 a tela pede confirmação em vez de aplicar direto.
  confianca: number
}

/**
 * Limpa o ruído do extrato: prefixos de adquirente, numeração de parcela,
 * cidade e código de estabelecimento. "PAG*IFOOD 12/34 SAO PAULO BR" -> "IFOOD".
 */
export function limparDescricao(bruta: string): string {
  let texto = bruta.toUpperCase().trim()

  // O "DE" só sai como palavra inteira: sem o espaço exigido, "PAGAMENTO DEB
  // AUTOMATIC" perdia o "DE" de "DEB" e virava "b Automatic".
  texto = texto.replace(/^(COMPRA|PAGAMENTO|PAGTO|DEBITO|DÉBITO|CREDITO|CRÉDITO|TRANSF|TED|DOC|PIX)\s+(?:(?:DE|PARA|A)\s+)?/g, "")
  texto = texto.replace(/^(PAG\*|PG\*|MP\*|MERCPAGO\*|PAYPAL\s*\*|IFD\*|EC\*|APL\*)/g, "")
  texto = texto.replace(/\s*\d{1,2}\s*\/\s*\d{1,2}\s*$/g, "") // "3/12"
  texto = texto.replace(/\s*-?\s*PARCELA\s*\d+(\s*DE\s*\d+)?/g, "")
  texto = texto.replace(/\s+\d{6,}\s*/g, " ") // códigos longos
  texto = texto.replace(/\s+(BR|BRA|BRASIL)\s*$/g, "")
  texto = texto.replace(/\s{2,}/g, " ").trim()

  return texto || bruta.trim()
}

interface EntradaDicionario {
  termos: string[]
  categoria: string
  grupo: GrupoCategoria
  nomeBonito?: string
}

/**
 * Dicionário de partida. Não pretende ser exaustivo — cobre o que aparece na
 * maioria dos extratos brasileiros para o primeiro import não vir todo em branco.
 */
export const DICIONARIO: EntradaDicionario[] = [
  // "IFD*" é como o iFood aparece na fatura do Itaú.
  { termos: ["IFOOD", "IFD*", "RAPPI", "UBER EATS", "AIQFOME", "ZE DELIVERY", "ZÉ DELIVERY"], categoria: "Delivery", grupo: "ALIMENTACAO" },
  { termos: ["UBER", "99APP", "99 TAXI", "99 RIDE", "CABIFY", "BLABLACAR"], categoria: "Aplicativos de transporte", grupo: "TRANSPORTE" },
  { termos: ["SHELL", "IPIRANGA", "PETROBRAS", "BR MANIA", "POSTO", "ALE COMBUS"], categoria: "Combustível", grupo: "TRANSPORTE" },
  { termos: ["ESTACIONAMENTO", "ESTAPAR", "ZONA AZUL", "SEM PARAR", "CONECTCAR", "VELOE"], categoria: "Estacionamento e pedágio", grupo: "TRANSPORTE" },
  { termos: ["CARREFOUR", "PAO DE ACUCAR", "PÃO DE AÇÚCAR", "EXTRA", "ASSAI", "ASSAÍ", "ATACADAO", "ATACADÃO", "BIG BOMPRECO", "SUPERMERC", "MERCADO", "HORTIFRUTI", "SAMS CLUB"], categoria: "Supermercado", grupo: "ALIMENTACAO" },
  { termos: ["PADARIA", "PANIFIC", "CAFETERIA", "STARBUCKS", "CAFE "], categoria: "Padaria e café", grupo: "ALIMENTACAO" },
  { termos: ["RESTAURANTE", "PIZZARIA", "PIZZA", "LANCHES", "BURGER", "MC DONALD", "MCDONALD", "BURGER KING", "SUBWAY", "OUTBACK", "HABIBS", "BOB S", "GIRAFFAS"], categoria: "Restaurante", grupo: "ALIMENTACAO" },
  { termos: ["DROGARIA", "DROGASIL", "RAIA", "PACHECO", "PAGUE MENOS", "FARMACIA", "FARMÁCIA", "ULTRAFARMA", "PANVEL"], categoria: "Farmácia", grupo: "SAUDE" },
  { termos: ["UNIMED", "AMIL", "BRADESCO SAUDE", "SULAMERICA SAUDE", "HAPVIDA", "NOTREDAME", "PORTO SEGURO SAUDE"], categoria: "Plano de saúde", grupo: "SAUDE" },
  { termos: ["LABORATORIO", "FLEURY", "DASA", "HOSPITAL", "CLINICA", "CLÍNICA", "ODONTO", "DENTISTA", "PSICOL"], categoria: "Consultas e exames", grupo: "SAUDE" },
  { termos: ["NETFLIX", "SPOTIFY", "DISNEY", "HBO", "MAX ", "PRIME VIDEO", "GLOBOPLAY", "DEEZER", "YOUTUBE PREMIUM", "PARAMOUNT", "APPLE.COM/BILL", "APPLE TV"], categoria: "Assinaturas e streaming", grupo: "LAZER" },
  // "ACADEMI" e não "ACADEMIA": o Itaú corta o nome em 14 letras ("SKYFIT ACADEMI").
  { termos: ["SMART FIT", "SMARTFIT", "SKYFIT", "ACADEMI", "BLUEFIT", "GYMPASS", "TOTALPASS", "WELLHUB"], categoria: "Academia", grupo: "SAUDE" },
  { termos: ["VIVO", "CLARO", "TIM ", "OI FIXO", "OI MOVEL", "NEXTEL", "ALGAR"], categoria: "Telefone e internet", grupo: "SERVICOS" },
  { termos: ["ENEL", "CEMIG", "COPEL", "LIGHT ", "CPFL", "ELEKTRO", "EQUATORIAL", "NEOENERGIA", "CELESC", "ENERGISA"], categoria: "Energia elétrica", grupo: "MORADIA" },
  { termos: ["SABESP", "CEDAE", "COPASA", "SANEPAR", "CAESB", "EMBASA", "CAGECE"], categoria: "Água", grupo: "MORADIA" },
  { termos: ["COMGAS", "COMGÁS", "NATURGY", "GAS NATURAL", "ULTRAGAZ", "LIQUIGAS"], categoria: "Gás", grupo: "MORADIA" },
  { termos: ["ALUGUEL", "IMOBILIARIA", "IMOBILIÁRIA", "CONDOMINIO", "CONDOMÍNIO"], categoria: "Aluguel e condomínio", grupo: "MORADIA" },
  { termos: ["IPTU", "IPVA", "DETRAN", "LICENCIAMENTO", "DARF", "RECEITA FEDERAL", "DAS ", "SIMPLES NACIONAL"], categoria: "Impostos e taxas", grupo: "IMPOSTOS" },
  { termos: ["AMAZON", "MERCADO LIVRE", "MERCADOLIVRE", "SHOPEE", "MAGAZINE LUIZA", "MAGALU", "AMERICANAS", "CASAS BAHIA", "ALIEXPRESS", "SHEIN"], categoria: "Compras online", grupo: "PESSOAL" },
  { termos: ["RENNER", "C&A", "RIACHUELO", "ZARA", "HERING", "CENTAURO", "NIKE", "ADIDAS"], categoria: "Vestuário", grupo: "PESSOAL" },
  { termos: ["ESCOLA", "COLEGIO", "COLÉGIO", "FACULDADE", "UNIVERSIDADE", "UDEMY", "ALURA", "COURSERA", "CURSO"], categoria: "Educação", grupo: "EDUCACAO" },
  { termos: ["CINEMA", "CINEMARK", "UCI ", "INGRESSO.COM", "TICKET360", "SYMPLA", "EVENTIM"], categoria: "Lazer e eventos", grupo: "LAZER" },
  { termos: ["LATAM", "GOL LINHAS", "AZUL LINHAS", "DECOLAR", "BOOKING", "AIRBNB", "HOTEL", "123MILHAS", "CVC", "BUSER", "CLICKBUS"], categoria: "Viagem", grupo: "LAZER" },
  { termos: ["SALARIO", "SALÁRIO", "PAGAMENTO SALARIO", "PROVENTOS", "FOLHA PGTO", "REMUNERACAO"], categoria: "Salário", grupo: "RENDA" },
  { termos: ["RENDIMENTO", "JUROS SOBRE", "DIVIDENDO", "RESGATE CDB", "TESOURO DIRETO", "CDB ", "LCI ", "LCA "], categoria: "Rendimentos", grupo: "INVESTIMENTO" },
  { termos: ["EMPRESTIMO", "EMPRÉSTIMO", "CREDITO PESSOAL", "CONSIGNADO", "FINANCIAMENTO", "CDC "], categoria: "Empréstimos", grupo: "DIVIDAS" },
  { termos: ["JUROS ROTATIVO", "ENCARGOS", "IOF", "MULTA", "TARIFA", "ANUIDADE", "CESTA DE SERVICOS"], categoria: "Tarifas e juros", grupo: "DIVIDAS" },
  { termos: ["SEGURO", "SEG CARTAO", "PORTO SEGURO", "ALLIANZ", "AZUL SEGUROS", "PRUDENTIAL", "METLIFE"], categoria: "Seguros", grupo: "SERVICOS" },
  { termos: ["PETZ", "COBASI", "PET SHOP", "VETERINAR"], categoria: "Pet", grupo: "PESSOAL" },
  { termos: ["MERCADO PAGO", "PICPAY", "PAGSEGURO", "STONE", "CIELO", "GETNET", "INFINITEPAY", "SUMUP"], categoria: "Recebimentos de vendas", grupo: "NEGOCIO_MEI" },
]

const NORMALIZAR = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()

/**
 * Aplica regras do lar e, se nenhuma pegar, o dicionário.
 * `mapaCategorias` traduz nome de categoria do dicionário para o id do lar.
 */
export function categorizar(
  descricaoBruta: string,
  regras: RegraAplicavel[],
  mapaCategorias?: Map<string, string>,
): Sugestao {
  const limpa = limparDescricao(descricaoBruta)
  const alvo = NORMALIZAR(descricaoBruta)

  const ativas = regras.filter((regra) => regra.ativa).sort((a, b) => b.prioridade - a.prioridade)
  for (const regra of ativas) {
    let bateu = false
    if (regra.regex) {
      // Regra antiga, salva antes da checagem na criação, ainda pode ser perigosa.
      if (!regexSegura(regra.padrao)) continue
      try {
        bateu = new RegExp(regra.padrao, "i").test(descricaoBruta)
      } catch {
        // Regex inválida salva pelo usuário não pode derrubar a importação inteira.
        bateu = false
      }
    } else {
      bateu = alvo.includes(NORMALIZAR(regra.padrao))
    }

    if (bateu) {
      return {
        categoriaId: regra.categoriaId,
        descricaoLimpa: regra.renomearPara ?? limpa,
        membroId: regra.membroId,
        tags: regra.tags,
        regraId: regra.id,
        confianca: 100,
      }
    }
  }

  for (const entrada of DICIONARIO) {
    const termo = entrada.termos.find((t) => alvo.includes(NORMALIZAR(t)))
    if (!termo) continue
    return {
      categoriaId: mapaCategorias?.get(entrada.categoria),
      categoriaNome: entrada.categoria,
      grupo: entrada.grupo,
      descricaoLimpa: entrada.nomeBonito ?? capitalizar(limpa),
      tags: [],
      // Alta, mas não 100: dicionário genérico erra em nome ambíguo
      // ("MERCADO" pode ser mercadinho ou Mercado Pago).
      confianca: 80,
    }
  }

  return { descricaoLimpa: capitalizar(limpa), tags: [], confianca: 0 }
}

/**
 * Ramo que o banco imprime ao lado da compra (hoje, o Itaú). Vem do código de
 * atividade do lojista, então acerta onde o nome truncado não diz nada:
 * "PERCI MATIELOSAO JOSE D" é restaurante. Entra só depois das regras e do
 * dicionário, e só para ramos que apontam uma categoria sem ambiguidade —
 * "saúde" pode ser farmácia ou consulta; "serviços" e "outros" não dizem nada.
 */
const CATEGORIA_DO_RAMO: Record<string, string> = {
  VESTUARIO: "Vestuário",
  LAZER: "Lazer e eventos",
  SUPERMERCADO: "Supermercado",
  RESTAURANTE: "Restaurante",
  EDUCACAO: "Educação",
  HOSPEDAGEM: "Viagem",
  TURISMO: "Viagem",
}

export function categoriaPeloRamo(ramo: string): string | undefined {
  return CATEGORIA_DO_RAMO[NORMALIZAR(ramo).trim()]
}

export function capitalizar(texto: string): string {
  return texto
    .toLowerCase()
    .split(" ")
    .map((palavra) => (palavra.length <= 2 ? palavra : palavra.charAt(0).toUpperCase() + palavra.slice(1)))
    .join(" ")
}

/**
 * Gera a regra a partir de uma correção do usuário.
 * O padrão sai da descrição limpa (sem parcela, sem cidade), senão a regra
 * pegaria só aquele lançamento e nunca mais.
 */
export function regraAPartirDeCorrecao(params: {
  descricaoOriginal: string
  categoriaId: string
  membroId?: string | null
  renomearPara?: string
}): { padrao: string; categoriaId: string; membroId: string | null; renomearPara: string | null; prioridade: number } {
  const limpa = limparDescricao(params.descricaoOriginal)
  // Duas primeiras palavras costumam bastar para identificar o comerciante
  // sem colar a regra num único lançamento.
  const padrao = limpa.split(" ").slice(0, 2).join(" ")
  return {
    padrao: padrao.length >= 3 ? padrao : limpa,
    categoriaId: params.categoriaId,
    membroId: params.membroId ?? null,
    renomearPara: params.renomearPara ?? null,
    prioridade: 100,
  }
}

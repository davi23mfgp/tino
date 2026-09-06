/**
 * Leitor de notificação de compra.
 *
 * Cada banco escreve o aviso de um jeito, mas todos dizem as mesmas quatro
 * coisas: quanto, onde, em qual cartão e quando. O leitor extrai isso do texto
 * cru e devolve o que entendeu com um grau de confiança — nada é lançado
 * automaticamente abaixo de um limiar, porque notificação erra:
 *
 * - compra negada gera aviso igual ao de compra aprovada em vários bancos;
 * - posto de combustível pré-autoriza um valor e cobra outro;
 * - estorno chega como "compra" em alguns aplicativos.
 *
 * Por isso a captura entra numa fila de conferência em vez de virar lançamento.
 */

import { lerData } from "@/lib/datas"
import { paraCentavos } from "@/lib/dinheiro"

export interface NotificacaoLida {
  valorCentavos: number | null
  estabelecimento: string | null
  cartaoFinal: string | null
  instituicao: string | null
  data: Date | null
  parcelaNumero: number | null
  parcelaTotal: number | null
  /// True quando o texto indica que NÃO houve gasto (negada, estorno, aviso).
  ignorar: boolean
  motivoIgnorar?: string
  /// 0 a 100. Abaixo de 70 a tela pede conferência explícita.
  confianca: number
}

const NORMALIZAR = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()

/** Instituições reconhecidas pelo texto do aviso. */
const INSTITUICOES: { termos: string[]; nome: string }[] = [
  { termos: ["NUBANK", "NU PAGAMENTOS", "ROXINHO"], nome: "Nubank" },
  { termos: ["ITAU", "ITAÚ", "ITAUCARD"], nome: "Itaú" },
  { termos: ["BRADESCO", "NEXT"], nome: "Bradesco" },
  { termos: ["SANTANDER"], nome: "Santander" },
  { termos: ["BANCO DO BRASIL", "BB "], nome: "Banco do Brasil" },
  { termos: ["CAIXA"], nome: "Caixa" },
  { termos: ["INTER"], nome: "Inter" },
  { termos: ["C6 BANK", "C6BANK", "C6 "], nome: "C6 Bank" },
  { termos: ["PICPAY"], nome: "PicPay" },
  { termos: ["MERCADO PAGO", "MERCADOPAGO"], nome: "Mercado Pago" },
  { termos: ["WILL BANK", "WILLBANK"], nome: "Will Bank" },
  { termos: ["NEON"], nome: "Neon" },
  { termos: ["ORIGINAL"], nome: "Banco Original" },
  { termos: ["BTG"], nome: "BTG" },
]

/**
 * Frases que indicam que nada saiu da conta.
 *
 * Sem esta lista, uma compra negada viraria despesa e o usuário passaria a
 * desconfiar de todo o extrato — o dano de um lançamento falso é maior que o
 * de um lançamento perdido.
 */
const NAO_E_GASTO: { padrao: RegExp; motivo: string }[] = [
  // "não aprovada" anda junto de "não autorizada": qual das duas o banco usa
  // varia, e o texto da recusa é quase idêntico ao da compra aprovada — muda
  // uma palavra. Cobrir só uma das formas deixa recusa virar gasto.
  { padrao: /\b(negad[ao]|recusad[ao]|n[ãa]o (autorizad|aprovad)[ao])\b/i, motivo: "compra negada" },
  { padrao: /\b(estorn|reembols|devoluç|devoluc|cancelad[ao])/i, motivo: "estorno ou cancelamento" },
  // Palavras entram no meio da frase ("fatura de setembro fechou"), então o
  // padrão precisa aceitar um trecho entre "fatura" e o verbo.
  {
    padrao: /\bfatura\b[^.]{0,40}\b(fechou|fechada|fecha|disponivel|disponível|vence|venceu|em aberto)\b/i,
    motivo: "aviso de fatura, não é compra",
  },
  { padrao: /\b(voce recebeu|você recebeu|recebeu um pix|pix recebido|credito de|crédito de)\b/i, motivo: "entrada de dinheiro" },
  { padrao: /\b(saldo|extrato|limite (disponivel|disponível)|aprovado o aumento)\b/i, motivo: "aviso informativo" },
  { padrao: /\b(tentativa|suspeit|golpe|senha|codigo|código de verificacao|verificação)\b/i, motivo: "aviso de segurança" },
]

/** Valor monetário em qualquer forma que os bancos escrevem. */
const VALOR = /R\$\s*([\d.]+,\d{2}|\d+[.,]\d{2}|\d{1,3}(?:\.\d{3})*)/i

/**
 * Estabelecimento: o que vem depois de "em", "no", "na" ou "-".
 * Ordem importa — "compra aprovada no IFOOD" e "COMPRA EM PADARIA X" usam
 * preposições diferentes, e o primeiro padrão que casar vence.
 */
const ESTABELECIMENTO = [
  // Logo depois do valor é o lugar mais confiável: "R$ 52,30 em ASSAI".
  // Vem primeiro porque o texto do banco costuma citar o cartão antes do valor,
  // e ler da esquerda para a direita pegaria o cartão em vez da loja.
  /R\$\s*[\d.,]+\s*(?:-|–|em|no|na|para)\s+([^.,\n]{2,60})/i,
  /(?:compra|pagamento|pag(?:to)?|transacao|transação|débito|debito|gasto)\s+(?:aprovad[ao]\s+)?(?:de\s+R\$\s*[\d.,]+\s+)?(?:em|no|na)\s+([^.,\n]{2,60})/i,
  /(?:em|no|na)\s+([A-Z0-9][^.,\n]{2,60}?)(?:\s+(?:no dia|em|às|as)\b|[.,\n]|$)/i,
  /^([A-Z0-9][A-Z0-9\s*&.'-]{3,40})\s+R\$/m,
]

/**
 * Trechos que descrevem o cartão ou a operação, não o comércio.
 *
 * Sem isto, "no cartão final 4213: R$ 52,30 em ASSAI" viraria o estabelecimento
 * "cartão final 4213" — valor certo com nome errado, que é pior que nome nenhum
 * porque parece confiável e ainda ensina uma regra de categoria errada.
 */
const NAO_E_ESTABELECIMENTO = /^(cart[aã]o|final|conta|d[eé]bito|cr[eé]dito|parcelad|sua|seu|voc[eê])\b/i

const CARTAO_FINAL = /(?:final|fim|terminad[oa] em|com final|cartão|cartao)\s*(?:n[ºo°]?\s*)?(\d{4})\b/i
const PARCELA = /(\d{1,2})\s*(?:\/|\s+de\s+)\s*(\d{1,2})\s*(?:x|vezes|parcelas?)?/i
const DATA_TEXTO = /(\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?)/

export function lerNotificacao(texto: string, agora = new Date()): NotificacaoLida {
  const limpo = texto.replace(/\s+/g, " ").trim()
  const alvo = NORMALIZAR(limpo)

  const vazio: NotificacaoLida = {
    valorCentavos: null,
    estabelecimento: null,
    cartaoFinal: null,
    instituicao: null,
    data: null,
    parcelaNumero: null,
    parcelaTotal: null,
    ignorar: false,
    confianca: 0,
  }

  // O descarte vem antes de qualquer extração: se não é gasto, o resto do
  // texto não interessa e insistir só produziria um lançamento errado.
  for (const regra of NAO_E_GASTO) {
    if (regra.padrao.test(limpo)) {
      return { ...vazio, ignorar: true, motivoIgnorar: regra.motivo, confianca: 90 }
    }
  }

  const casaValor = VALOR.exec(limpo)
  if (!casaValor) return { ...vazio, confianca: 0 }

  const valorCentavos = paraCentavos(casaValor[1])
  if (valorCentavos <= 0) return { ...vazio, confianca: 0 }

  let estabelecimento: string | null = null
  for (const padrao of ESTABELECIMENTO) {
    const casado = padrao.exec(limpo)
    if (!casado?.[1]) continue

    const candidato = casado[1]
      .replace(/\b(no dia|hoje|agora|às|as)\b.*$/i, "")
      // O parcelamento é lido em campo próprio. Deixá-lo grudado no nome faria
      // "Magazine Luiza" e "Magazine Luiza parcelada em 3/10" virarem dois
      // estabelecimentos diferentes para as regras de categoria.
      .replace(/\s*(?:parcelad[ao]\s*)?(?:em\s+)?\d{1,2}\s*(?:\/|\s+de\s+)\s*\d{1,2}\s*(?:x|vezes|parcelas?)?\s*$/i, "")
      .replace(/\s*(?:em|no|na)?\s*\d+\s*x\s*$/i, "")
      .replace(/[*_:-]+$/g, "")
      .trim()

    if (candidato.length >= 2 && !NAO_E_ESTABELECIMENTO.test(candidato)) {
      estabelecimento = candidato
      break
    }
  }

  const instituicao = INSTITUICOES.find((banco) => banco.termos.some((termo) => alvo.includes(termo)))?.nome ?? null
  const cartaoFinal = CARTAO_FINAL.exec(limpo)?.[1] ?? null

  // A parcela só é aceita quando o texto fala de parcelamento: "12/2026" numa
  // data viraria "parcela 12 de 2026" sem essa checagem.
  const casaParcela = /parcel|vezes|\dx\b/i.test(limpo) ? PARCELA.exec(limpo) : null
  const parcelaNumero = casaParcela ? Number(casaParcela[1]) : null
  const parcelaTotal = casaParcela ? Number(casaParcela[2]) : null

  const hoje = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()))

  // O trecho da parcela sai do texto antes da busca por data: "parcelada em
  // 3/10" tem a mesma cara de "3 de outubro", e ler como data jogaria a compra
  // para um mês futuro — o gasto sumiria do mês em que realmente aconteceu.
  const semParcela = casaParcela ? limpo.replace(casaParcela[0], " ") : limpo

  const dataTexto = DATA_TEXTO.exec(semParcela)?.[1]
  const lida = dataTexto
    ? lerData(dataTexto.length <= 5 ? `${dataTexto}/${agora.getUTCFullYear()}` : dataTexto)
    : null

  // Notificação chega no instante da compra. Uma data futura no texto é quase
  // sempre leitura errada (número de parcela, vencimento), então hoje vence.
  const data = lida && lida <= hoje ? lida : hoje

  // Confiança composta: valor é obrigatório, e cada pista adicional aumenta a
  // chance de o lançamento estar certo sem conferência linha a linha.
  let confianca = 40
  if (estabelecimento) confianca += 30
  if (instituicao) confianca += 10
  if (cartaoFinal) confianca += 10
  if (/compra|pagamento|pag(to)?|debito|débito|aprovad/i.test(limpo)) confianca += 10

  return {
    valorCentavos,
    estabelecimento,
    cartaoFinal,
    instituicao,
    data,
    parcelaNumero,
    parcelaTotal,
    ignorar: false,
    confianca: Math.min(100, confianca),
  }
}

/**
 * Texto digitado à mão ("mercado 52,30", "uber 18").
 * É o caminho mais rápido de todos: o usuário escreve como falaria.
 */
export function lerTextoLivre(texto: string, agora = new Date()): NotificacaoLida {
  const limpo = texto.replace(/\s+/g, " ").trim()

  // Aceita "52,30", "52.30", "R$ 52", "52" — o número solto no fim ou no começo.
  const casaValor = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+\.\d{2}|\d+)\s*$/.exec(limpo)
  const casaValorInicio = /^(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+\.\d{2}|\d+)\s+/.exec(limpo)
  const casado = casaValor ?? casaValorInicio
  if (!casado) return { ...lerNotificacao(limpo, agora) }

  const valorCentavos = paraCentavos(casado[1])
  const estabelecimento = limpo.replace(casado[0], "").replace(/^(gastei|paguei|comprei)\s+(em|no|na)?\s*/i, "").trim()

  return {
    valorCentavos,
    estabelecimento: estabelecimento || null,
    cartaoFinal: null,
    instituicao: null,
    data: new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate())),
    parcelaNumero: null,
    parcelaTotal: null,
    ignorar: false,
    // Digitado pela própria pessoa: não há ambiguidade sobre ter acontecido.
    confianca: estabelecimento ? 95 : 70,
  }
}

/**
 * Movimento entre as próprias contas da pessoa, que não é gasto nem renda
 * (relatório de primeiro uso, 21/10/2026: pagamento de fatura e "crédito
 * liberado" do Pix no crédito entravam como gasto e renda e inflavam o mês).
 *
 * Três casos, cada um tratado do jeito que mantém o saldo certo:
 * - Na fatura do cartão, o pagamento da fatura anterior fica fora: o dinheiro
 *   já sai pelo extrato da conta, e contar de novo dobraria.
 * - No extrato, o Pix no crédito aparece como um par no mesmo dia e valor:
 *   "crédito liberado" entrando e o Pix saindo. O par se anula, e o gasto de
 *   verdade vem na fatura do cartão; os dois ficam fora.
 * - No extrato, o pagamento de fatura de cartão vira transferência: o saldo da
 *   conta desce (o dinheiro saiu), mas não conta como gasto do mês.
 *
 * Fora não é apagado: a prévia mostra o motivo e deixa incluir.
 */
export interface MovimentoDoArquivo { data: Date; descricao: string; valorCentavos: number; tipo: "RECEITA" | "DESPESA" | "TRANSFERENCIA" }

export type DecisaoInterna = { acao: "fora"; motivo: string } | { acao: "transferencia"; motivo: string }

const PAGAMENTO_NA_FATURA = /^(pagamento|pgto|pag(?:amento)? (?:de )?fatura|pagto)\b|deb(ito)? automatic|pagamento on ?line|pagamento via conta|pagamento efetuado|fatura paga/i
const CREDITO_DO_PIX = /credito liberad|pix origem cartao|pix no credito/i
const PAGAMENTO_DE_CARTAO_NO_EXTRATO = /(pag(amento)?|pgto)\s*(de\s*)?fatura|fatura (cartao|cart)|(pag boleto|pagto) (nu pagamentos|banco inter|itau unibanco cartao|banco itaucard|mercado pago)|pgto cartao|pagamento cartao/i

const dia = (data: Date) => data.toISOString().slice(0, 10)

export function movimentosInternos(linhas: MovimentoDoArquivo[], faturaCartao: boolean): Map<number, DecisaoInterna> {
  const decisoes = new Map<number, DecisaoInterna>()
  if (faturaCartao) {
    linhas.forEach((linha, i) => {
      if (linha.tipo === "RECEITA" && PAGAMENTO_NA_FATURA.test(linha.descricao.trim())) {
        decisoes.set(i, { acao: "fora", motivo: "pagamento da fatura: o dinheiro já sai pelo extrato da conta" })
      }
    })
    return decisoes
  }
  linhas.forEach((linha, i) => {
    if (linha.tipo !== "RECEITA" || !CREDITO_DO_PIX.test(linha.descricao)) return
    const par = linhas.findIndex((outra, j) => j !== i && !decisoes.has(j) && outra.tipo === "DESPESA" && outra.valorCentavos === linha.valorCentavos && dia(outra.data) === dia(linha.data))
    if (par < 0) return
    const motivo = "Pix no crédito: entrada e saída iguais no mesmo dia; o gasto vem na fatura do cartão"
    decisoes.set(i, { acao: "fora", motivo })
    decisoes.set(par, { acao: "fora", motivo })
  })
  linhas.forEach((linha, i) => {
    if (!decisoes.has(i) && linha.tipo === "DESPESA" && PAGAMENTO_DE_CARTAO_NO_EXTRATO.test(linha.descricao)) {
      decisoes.set(i, { acao: "transferencia", motivo: "pagamento de fatura: sai da conta, mas não é gasto (os gastos estão na fatura)" })
    }
  })
  return decisoes
}

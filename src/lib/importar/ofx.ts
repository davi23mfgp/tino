/**
 * Leitor de OFX (Money 2000 / OFX 1.x SGML e 2.x XML).
 *
 * Bancos brasileiros exportam OFX 1.x, que é SGML: tags sem fechamento
 * (<MEMO>compra</MEMO> é opcional). Parser de XML quebra nesses arquivos, então
 * a leitura é feita por varredura de tags, tolerante a fechamento ausente.
 */

import { lerData } from "@/lib/datas"
import { paraCentavos } from "@/lib/dinheiro"

export interface LancamentoBruto {
  data: Date
  descricao: string
  valorCentavos: number
  tipo: "RECEITA" | "DESPESA"
  identificadorExterno?: string
  documento?: string
  /// Compra parcelada em fatura de cartão: "10/12" vira atual 10, total 12.
  parcelaAtual?: number
  parcelasTotal?: number
  /// Data original da compra, quando difere de `data` (parcela 2 em diante).
  dataCompra?: Date
  /// Categoria que o próprio banco imprime na fatura ("restaurante", "vestuário").
  categoriaBanco?: string
}

export interface ExtratoOfx {
  banco?: string
  agencia?: string
  conta?: string
  moeda?: string
  saldoFinalCentavos?: number
  dataSaldo?: Date
  lancamentos: LancamentoBruto[]
}

/** Valor de uma tag SGML/XML: pega até o fechamento ou até a próxima tag. */
function tag(bloco: string, nome: string): string | undefined {
  const casado = new RegExp(`<${nome}>([^<\\r\\n]*)`, "i").exec(bloco)
  return casado?.[1]?.trim() || undefined
}

/** OFX grava data como YYYYMMDDHHMMSS[.xxx][fuso]. Só o dia importa. */
function lerDataOfx(bruta?: string): Date | null {
  if (!bruta) return null
  const digitos = bruta.replace(/\D/g, "")
  if (digitos.length < 8) return null
  return lerData(digitos.slice(0, 8))
}

export function lerOfx(conteudo: string): ExtratoOfx {
  // OFX 1.x traz um cabeçalho de chave:valor antes do SGML. Cortar no primeiro
  // <OFX> evita que esse cabeçalho confunda a varredura de tags.
  const inicio = conteudo.indexOf("<OFX>")
  const corpo = inicio >= 0 ? conteudo.slice(inicio) : conteudo

  const lancamentos: LancamentoBruto[] = []
  const blocos = corpo.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? []

  for (const bloco of blocos) {
    const data = lerDataOfx(tag(bloco, "DTPOSTED"))
    const valorBruto = tag(bloco, "TRNAMT")
    if (!data || valorBruto === undefined) continue

    const centavos = paraCentavos(valorBruto)
    // MEMO costuma ter o texto legível; NAME vem truncado em alguns bancos.
    const descricao = tag(bloco, "MEMO") || tag(bloco, "NAME") || "Lançamento sem descrição"
    const trntype = (tag(bloco, "TRNTYPE") || "").toUpperCase()

    // O sinal de TRNAMT é a fonte da verdade; TRNTYPE só desempata quando o
    // valor vem zerado ou o banco manda tudo positivo.
    const negativo = centavos < 0 || (centavos === 0 && trntype === "DEBIT")
    lancamentos.push({
      data,
      descricao,
      valorCentavos: Math.abs(centavos),
      tipo: negativo ? "DESPESA" : "RECEITA",
      identificadorExterno: tag(bloco, "FITID"),
      documento: tag(bloco, "CHECKNUM") || tag(bloco, "REFNUM"),
    })
  }

  const saldo = tag(corpo, "BALAMT")
  return {
    banco: tag(corpo, "BANKID") || tag(corpo, "ORG"),
    agencia: tag(corpo, "BRANCHID"),
    conta: tag(corpo, "ACCTID"),
    moeda: tag(corpo, "CURDEF"),
    saldoFinalCentavos: saldo !== undefined ? paraCentavos(saldo) : undefined,
    dataSaldo: lerDataOfx(tag(corpo, "DTASOF")) ?? undefined,
    lancamentos,
  }
}

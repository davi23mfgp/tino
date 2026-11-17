/**
 * Leitor de CSV de extrato e de fatura de cartão.
 *
 * Cada banco exporta um CSV diferente: separador `,` ou `;`, cabeçalho em
 * português ou inglês, valor em coluna única com sinal ou em duas colunas
 * (débito/crédito). O leitor detecta tudo isso em vez de exigir um formato,
 * porque pedir ao usuário que "ajuste a planilha" é onde ele desiste.
 */

import { lerData } from "@/lib/datas"
import { paraCentavos } from "@/lib/dinheiro"
import type { LancamentoBruto } from "@/lib/importar/ofx"

export interface ResultadoCsv {
  lancamentos: LancamentoBruto[]
  cabecalho: string[]
  /// Linhas que não viraram lançamento, com o motivo — o usuário vê o que ficou de fora.
  descartadas: { linha: number; conteudo: string; motivo: string }[]
  /// Verdadeiro quando as datas vieram no formato americano (mês/dia/ano).
  datasAmericanas?: boolean
}

/**
 * Lê o arquivo inteiro para decidir se a data é dia/mês (Brasil) ou mês/dia
 * (Estados Unidos, que é como exportam conta no exterior, Wise e alguns
 * cartões). Um "03/15/2026" só existe como mês/dia; se alguma linha assim
 * aparece e nenhuma tem o primeiro número acima de 12, o arquivo é americano.
 * Antes o "03/15" era descartado e o "03/04" virava 3 de abril em silêncio.
 * Quando nada decide (todas as datas com os dois números até 12), fica o
 * jeito brasileiro, que é o caso de quase todo arquivo que chega aqui.
 */
export function datasSaoAmericanas(celulas: string[]): boolean {
  let primeiroPassa = false
  let segundoPassa = false
  for (const celula of celulas) {
    const partes = /^(\d{1,2})[\/.-](\d{1,2})[\/.-]\d{2,4}/.exec(celula.trim())
    if (!partes) continue
    if (Number(partes[1]) > 12) primeiroPassa = true
    if (Number(partes[2]) > 12) segundoPassa = true
  }
  return segundoPassa && !primeiroPassa
}

function trocarDiaEMes(celula: string): string {
  return celula.replace(/^(\d{1,2})([\/.-])(\d{1,2})([\/.-])/, "$3$2$1$4")
}

/** Separador é o candidato que mais aparece na primeira linha não vazia. */
export function detectarSeparador(linha: string): string {
  const candidatos = [";", ",", "\t", "|"]
  let melhor = ","
  let maior = 0
  for (const candidato of candidatos) {
    const quantidade = linha.split(candidato).length - 1
    if (quantidade > maior) {
      maior = quantidade
      melhor = candidato
    }
  }
  return melhor
}

/** Divide respeitando aspas — descrição com vírgula dentro é comum. */
export function dividirLinha(linha: string, separador: string): string[] {
  const campos: string[] = []
  let atual = ""
  let dentroDeAspas = false

  for (let i = 0; i < linha.length; i += 1) {
    const char = linha[i]
    if (char === '"') {
      // "" dentro de aspas é uma aspa literal, não o fim do campo.
      if (dentroDeAspas && linha[i + 1] === '"') {
        atual += '"'
        i += 1
      } else {
        dentroDeAspas = !dentroDeAspas
      }
    } else if (char === separador && !dentroDeAspas) {
      campos.push(atual.trim())
      atual = ""
    } else {
      atual += char
    }
  }
  campos.push(atual.trim())
  return campos
}

const NORMALIZAR = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()

const SINONIMOS = {
  data: ["data", "date", "data lancamento", "data da compra", "data movimento", "dt", "data transacao"],
  descricao: ["descricao", "historico", "description", "lancamento", "titulo", "estabelecimento", "detalhe", "memo", "movimento"],
  valor: ["valor", "amount", "montante", "valor (r$)", "valor rs", "vlr"],
  debito: ["debito", "saida", "despesa", "pagamento"],
  credito: ["credito", "entrada", "receita", "deposito"],
  documento: ["documento", "doc", "numero do documento", "identificador", "id"],
  categoria: ["categoria", "category", "tipo"],
}

export function acharColuna(cabecalho: string[], chaves: string[]): number {
  const normalizado = cabecalho.map(NORMALIZAR)
  for (const chave of chaves) {
    const exato = normalizado.indexOf(chave)
    if (exato >= 0) return exato
  }
  // Sem correspondência exata, aceita conter — cobre "Data do lançamento".
  for (const chave of chaves) {
    const parcial = normalizado.findIndex((coluna) => coluna.includes(chave))
    if (parcial >= 0) return parcial
  }
  return -1
}

export function lerCsv(conteudo: string): ResultadoCsv {
  // BOM do Excel entra como caractere invisível no primeiro cabeçalho e faz
  // "Data" virar "﻿Data", que nenhum sinônimo casa.
  const texto = conteudo.replace(/^﻿/, "")
  const linhas = texto.split(/\r?\n/).filter((linha) => linha.trim().length > 0)
  if (linhas.length === 0) return { lancamentos: [], cabecalho: [], descartadas: [] }

  const separador = detectarSeparador(linhas[0])

  // Alguns bancos põem título e período antes do cabeçalho real. A linha do
  // cabeçalho é a primeira que tem data e (valor ou débito).
  let indiceCabecalho = 0
  for (let i = 0; i < Math.min(linhas.length, 15); i += 1) {
    const campos = dividirLinha(linhas[i], separador)
    const temData = acharColuna(campos, SINONIMOS.data) >= 0
    const temValor = acharColuna(campos, SINONIMOS.valor) >= 0 || acharColuna(campos, SINONIMOS.debito) >= 0
    if (temData && temValor) {
      indiceCabecalho = i
      break
    }
  }

  const cabecalho = dividirLinha(linhas[indiceCabecalho], separador)
  const colData = acharColuna(cabecalho, SINONIMOS.data)
  const colDescricao = acharColuna(cabecalho, SINONIMOS.descricao)
  const colValor = acharColuna(cabecalho, SINONIMOS.valor)
  const colDebito = acharColuna(cabecalho, SINONIMOS.debito)
  const colCredito = acharColuna(cabecalho, SINONIMOS.credito)
  const colDocumento = acharColuna(cabecalho, SINONIMOS.documento)

  const lancamentos: LancamentoBruto[] = []
  const descartadas: ResultadoCsv["descartadas"] = []
  const americanas = colData >= 0 && datasSaoAmericanas(linhas.slice(indiceCabecalho + 1).map((linha) => dividirLinha(linha, separador)[colData] ?? ""))

  for (let i = indiceCabecalho + 1; i < linhas.length; i += 1) {
    const campos = dividirLinha(linhas[i], separador)
    const bruta = campos[colData] ?? ""
    // Banco que exporta "15/03/2026 14:22" perdia a linha inteira como "data
    // não reconhecida" (auditoria, Lote 5): a hora sai antes de ler a data.
    const semHora = bruta.trim().replace(/[\sT]+\d{1,2}:\d{2}(:\d{2})?.*$/, "")
    const data = colData >= 0 ? lerData(americanas ? trocarDiaEMes(semHora) : semHora) : null

    if (!data) {
      descartadas.push({ linha: i + 1, conteudo: linhas[i].slice(0, 120), motivo: "data não reconhecida" })
      continue
    }

    let centavos = 0
    if (colValor >= 0 && campos[colValor]) {
      centavos = paraCentavos(campos[colValor])
    } else {
      const debito = colDebito >= 0 ? paraCentavos(campos[colDebito] ?? "") : 0
      const credito = colCredito >= 0 ? paraCentavos(campos[colCredito] ?? "") : 0
      centavos = credito - Math.abs(debito)
    }

    if (centavos === 0) {
      descartadas.push({ linha: i + 1, conteudo: linhas[i].slice(0, 120), motivo: "valor zerado ou ilegível" })
      continue
    }

    lancamentos.push({
      data,
      descricao: (colDescricao >= 0 ? campos[colDescricao] : "") || "Lançamento sem descrição",
      valorCentavos: Math.abs(centavos),
      tipo: centavos < 0 ? "DESPESA" : "RECEITA",
      documento: colDocumento >= 0 ? campos[colDocumento] : undefined,
    })
  }

  return { lancamentos, cabecalho, descartadas, datasAmericanas: americanas }
}

/**
 * Fatura de cartão em CSV vem sem sinal: toda linha é gasto, e só estorno é
 * crédito. Interpretar pelo sinal viraria fatura inteira como receita.
 */
export function lerCsvFaturaCartao(conteudo: string): ResultadoCsv {
  const resultado = lerCsv(conteudo)
  return {
    ...resultado,
    lancamentos: resultado.lancamentos.map((lancamento) => ({
      ...lancamento,
      // "Crédito" só no começo: no meio, casava "EMPRESTIMO CREDITO PESSOAL"
      // e a cobrança virava renda (auditoria, Lote 5).
      tipo: /\b(estorno|reembolso)\b|^\s*cr[eé]dito\b|pagamento recebido/i.test(lancamento.descricao)
        ? ("RECEITA" as const)
        : ("DESPESA" as const),
    })),
  }
}

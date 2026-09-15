/**
 * "Você acha o comprovante do aluguel?"
 *
 * **O que o Tino realmente guarda, e é menos do que parece:** faturas que
 * chegaram por e-mail (`FaturaRecebida`, com o arquivo inteiro), o nome dos
 * arquivos já importados (`Importacao`, sem o arquivo) e o lançamento em si.
 * Não existe lugar onde a pessoa anexe um recibo qualquer — descobrir isso
 * mudou o tamanho desta peça.
 *
 * Então a resposta honesta tem duas partes: entrega o arquivo quando ele
 * existe, e quando não existe **mostra o lançamento** — que é o registro de
 * que aquilo foi pago — dizendo com todas as letras que o comprovante não
 * está guardado. Inventar que "não achei" quando o gasto está lá seria pior:
 * a pessoa procuraria de novo.
 */

import { prisma } from "@/lib/prisma"
import { formatarMoeda } from "@/lib/dinheiro"
import { formatarData } from "@/lib/datas"

/// Palavras que fazem a pergunta ser sobre um papel, e não sobre dinheiro.
const COISAS = ["comprovante", "recibo", "nota fiscal", "notinha", "boleto", "fatura", "documento", "arquivo", "extrato"]

/// Verbo de procura. Sem ele, "a fatura fechou?" viraria busca de arquivo.
const PROCURAS = ["acha", "achar", "cade", "cadê", "onde esta", "onde está", "me manda", "manda", "procura", "encontra", "busca", "tem o", "tem a"]

/// Palavras que não ajudam a identificar nada e só sujam a busca.
const VAZIAS = new Set([
  ...COISAS.flatMap((coisa) => coisa.split(" ")),
  ...PROCURAS.flatMap((procura) => procura.split(" ")),
  "o", "a", "os", "as", "de", "do", "da", "dos", "das", "meu", "minha", "meus", "minhas",
  "um", "uma", "voce", "você", "vc", "pra", "para", "por", "favor", "ai", "aí", "the",
])

function achatar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

/** A pergunta é sobre um papel? Precisa da coisa E do verbo de procura. */
export function ehBuscaDeDocumento(texto: string): boolean {
  const limpo = achatar(texto)
  return COISAS.some((coisa) => limpo.includes(achatar(coisa))) && PROCURAS.some((procura) => limpo.includes(achatar(procura)))
}

/**
 * O que a pessoa está procurando, sem as palavras que todo mundo usa.
 *
 * "acha o comprovante do aluguel" → "aluguel". Se sobrar nada, a busca vira
 * "os últimos documentos", que ainda é útil — melhor que pedir para repetir.
 */
export function termoDaBusca(texto: string): string | null {
  const palavras = achatar(texto)
    .replace(/[?!.,]/g, " ")
    .split(/\s+/)
    .filter((palavra) => palavra.length > 2 && !VAZIAS.has(palavra))

  return palavras.length ? palavras.join(" ") : null
}

export interface Achado {
  tipo: "FATURA" | "IMPORTACAO" | "LANCAMENTO"
  titulo: string
  detalhe: string
  rota: string
}

/** Monta a frase de resposta a partir do que foi achado. */
export function redigirResposta(termo: string | null, achados: Achado[]): string {
  const alvo = termo ? `“${termo}”` : "documentos recentes"

  if (achados.length === 0) {
    return [
      `Não achei nada sobre ${alvo}.`,
      "",
      "Vale lembrar que eu ainda não guardo comprovante avulso — o que tenho são as faturas que chegam por e-mail, os arquivos que você importou e os lançamentos.",
    ].join("\n")
  }

  const arquivos = achados.filter((achado) => achado.tipo === "FATURA")
  const lancamentos = achados.filter((achado) => achado.tipo === "LANCAMENTO")

  const linhas = achados.map((achado) => `• ${achado.titulo} — ${achado.detalhe}`)

  const remate =
    arquivos.length > 0
      ? "O arquivo da fatura está guardado: abra em Cartões para ver."
      : lancamentos.length > 0
        ? "O comprovante em si eu não guardo — isto é o lançamento, que é o registro de que foi pago."
        : "Isto é o que consta do arquivo importado; o arquivo em si não fica guardado."

  return [`Sobre ${alvo}, achei:`, "", ...linhas, "", remate].join("\n")
}

/** Procura de verdade, no que existe. */
export async function procurarDocumento(larId: string, pergunta: string): Promise<string> {
  const termo = termoDaBusca(pergunta)
  const achados: Achado[] = []

  const filtro = termo ? { contains: termo.split(" ")[0], mode: "insensitive" as const } : undefined

  const [faturas, importacoes, lancamentos] = await Promise.all([
    prisma.faturaRecebida.findMany({
      where: { larId, ...(filtro ? { arquivoNome: filtro } : {}) },
      orderBy: { criadoEm: "desc" },
      take: 3,
      select: { arquivoNome: true, criadoEm: true },
    }),
    prisma.importacao.findMany({
      where: { larId, ...(filtro ? { arquivoNome: filtro } : {}) },
      orderBy: { criadoEm: "desc" },
      take: 3,
      select: { arquivoNome: true, criadoEm: true, importadas: true },
    }),
    termo
      ? prisma.transacao.findMany({
          where: { larId, descricao: { contains: termo.split(" ")[0], mode: "insensitive" } },
          orderBy: { data: "desc" },
          take: 3,
          select: { descricao: true, data: true, valorCentavos: true },
        })
      : Promise.resolve([]),
  ])

  for (const fatura of faturas) {
    achados.push({
      tipo: "FATURA",
      titulo: fatura.arquivoNome,
      detalhe: `fatura recebida em ${formatarData(fatura.criadoEm)}`,
      rota: "/cartoes",
    })
  }

  for (const importacao of importacoes) {
    achados.push({
      tipo: "IMPORTACAO",
      titulo: importacao.arquivoNome,
      detalhe: `importado em ${formatarData(importacao.criadoEm)}, ${importacao.importadas} lançamento(s)`,
      rota: "/importar",
    })
  }

  for (const lancamento of lancamentos) {
    achados.push({
      tipo: "LANCAMENTO",
      titulo: lancamento.descricao,
      detalhe: `${formatarMoeda(lancamento.valorCentavos)} em ${formatarData(lancamento.data)}`,
      rota: "/transacoes",
    })
  }

  return redigirResposta(termo, achados)
}

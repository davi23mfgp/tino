/**
 * Orquestra a importação de extrato: detecta formato, lê, deduplica,
 * categoriza e grava — tudo numa transação só.
 */

import { createHash } from "crypto"

import { prisma } from "@/lib/prisma"
import { competenciaDe } from "@/lib/datas"
import { categoriaPeloRamo, categorizar, type RegraAplicavel } from "@/lib/categorizar"
import { formatarMoeda } from "@/lib/dinheiro"
import { lerOfx, type LancamentoBruto } from "@/lib/importar/ofx"
import { lerCsv, lerCsvFaturaCartao } from "@/lib/importar/csv"
import { lerPdf, type ConferenciaFatura } from "@/lib/importar/pdf"

export type FormatoImportacao = "ofx" | "csv" | "pdf"

export function detectarFormato(nomeArquivo: string, conteudo?: string): FormatoImportacao {
  const extensao = nomeArquivo.toLowerCase().split(".").pop()
  if (extensao === "ofx" || extensao === "qfx") return "ofx"
  if (extensao === "pdf") return "pdf"
  if (extensao === "csv" || extensao === "txt") {
    // Alguns bancos entregam OFX com extensão .txt.
    return conteudo?.includes("<OFX>") || conteudo?.includes("OFXHEADER") ? "ofx" : "csv"
  }
  return "csv"
}

/**
 * Impressão digital do lançamento. Conta + dia + valor + descrição normalizada
 * identificam o mesmo lançamento entre dois arquivos que se sobrepõem — é o que
 * permite ao usuário reimportar o extrato do mês inteiro sem duplicar nada.
 *
 * O identificador do banco (FITID), quando existe, é usado sozinho: é estável e
 * não muda se o banco reescrever a descrição.
 */
export function impressaoDigital(params: {
  contaId: string
  data: Date
  valorCentavos: number
  descricao: string
  identificadorExterno?: string
}): string {
  const base = params.identificadorExterno
    ? `${params.contaId}|fitid|${params.identificadorExterno}`
    : [
        params.contaId,
        params.data.toISOString().slice(0, 10),
        params.valorCentavos,
        params.descricao
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, ""),
      ].join("|")

  return createHash("sha256").update(base).digest("hex").slice(0, 32)
}

export interface PreviaLancamento extends LancamentoBruto {
  hashImport: string
  possivelDuplicada?: boolean
  duplicada: boolean
  categoriaId?: string
  categoriaNome?: string
  descricaoSugerida: string
  confianca: number
}

export interface PreviaImportacao {
  formato: FormatoImportacao
  total: number
  novas: number
  duplicadas: number
  semCategoria: number
  lancamentos: PreviaLancamento[]
  avisos: string[]
  /// Fatura em PDF: soma lida contra o total que a própria fatura declara.
  conferencia?: ConferenciaFatura
}

/**
 * Lê o arquivo e devolve o que aconteceria, sem gravar nada.
 * O usuário confere e confirma — importação silenciosa é como um extrato
 * errado entra no sistema e ninguém percebe por três meses.
 */
export async function previaImportacao(params: {
  larId: string
  contaId: string
  arquivoNome: string
  conteudo: ArrayBuffer
  faturaCartao?: boolean
  /// Senha do PDF, quando a fatura vem cifrada. Nunca é gravada: serve só para
  /// abrir o arquivo nesta requisição.
  senhaPdf?: string
}): Promise<PreviaImportacao> {
  const texto = new TextDecoder("utf-8").decode(params.conteudo)
  const formato = detectarFormato(params.arquivoNome, texto)
  const avisos: string[] = []

  let brutos: LancamentoBruto[] = []
  let conferencia: ConferenciaFatura | undefined
  if (formato === "ofx") {
    brutos = lerOfx(texto).lancamentos
  } else if (formato === "pdf") {
    const resultado = await lerPdf(params.conteudo, { senha: params.senhaPdf, faturaCartao: params.faturaCartao })
    brutos = resultado.lancamentos
    conferencia = resultado.conferencia
    if (resultado.naoReconhecidas.length > 0) {
      avisos.push(
        `${resultado.naoReconhecidas.length} linha(s) do PDF não foram reconhecidas. Confira o extrato antes de confirmar.`,
      )
    }
    // A fatura declara o próprio total. Se a soma lida não fecha com ele, o
    // leitor perdeu ou inventou lançamento — e isso tem de aparecer antes de
    // gravar, não três meses depois no saldo.
    if (conferencia && conferencia.lidoCentavos !== conferencia.informadoCentavos) {
      const diferenca = Math.abs(conferencia.lidoCentavos - conferencia.informadoCentavos)
      avisos.push(
        `Os lançamentos lidos somam ${formatarMoeda(conferencia.lidoCentavos)}, mas a fatura informa ${formatarMoeda(conferencia.informadoCentavos)}. ` +
          `Diferença de ${formatarMoeda(diferenca)}: confira a fatura antes de importar.`,
      )
    }
  } else {
    const resultado = params.faturaCartao ? lerCsvFaturaCartao(texto) : lerCsv(texto)
    brutos = resultado.lancamentos
    if (resultado.descartadas.length > 0) {
      avisos.push(`${resultado.descartadas.length} linha(s) do CSV foram ignoradas (data ou valor ilegível).`)
    }
  }

  if (brutos.length === 0) avisos.push("Nenhum lançamento encontrado no arquivo.")

  const [regras, categorias] = await Promise.all([
    prisma.regraCategorizacao.findMany({ where: { larId: params.larId, ativa: true } }),
    prisma.categoria.findMany({ where: { larId: params.larId }, select: { id: true, nome: true } }),
  ])
  const mapaCategorias = new Map(categorias.map((categoria) => [categoria.nome, categoria.id]))

  const hashes = brutos.map((bruto) =>
    impressaoDigital({
      contaId: params.contaId,
      data: bruto.data,
      valorCentavos: bruto.valorCentavos,
      descricao: bruto.descricao,
      identificadorExterno: bruto.identificadorExterno,
    }),
  )

  const jaExistem = new Set(
    (
      await prisma.transacao.findMany({
        where: { larId: params.larId, hashImport: { in: hashes } },
        select: { hashImport: true },
      })
    ).map((transacao) => transacao.hashImport as string),
  )

  const capturados=await prisma.transacao.findMany({where:{larId:params.larId,contaId:params.contaId,observacao:{startsWith:"Capturado do celular"},valorCentavos:{in:brutos.map(b=>Math.abs(b.valorCentavos))}},select:{data:true,valorCentavos:true,descricao:true}})
  const normalizar=(t:string)=>t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"")
  const nomePorId = new Map(categorias.map((categoria) => [categoria.id, categoria.nome]))
  const lancamentos: PreviaLancamento[] = brutos.map((bruto, indice) => {
    const sugestao = categorizar(bruto.descricao, regras as unknown as RegraAplicavel[], mapaCategorias)
    if (!sugestao.categoriaId && !sugestao.categoriaNome && bruto.categoriaBanco) {
      const nome = categoriaPeloRamo(bruto.categoriaBanco)
      if (nome) {
        sugestao.categoriaNome = nome
        sugestao.categoriaId = mapaCategorias.get(nome)
        sugestao.confianca = 60
      }
    }
    // Regra do lar devolve só o id; sem o nome, a prévia mostrava a compra
    // como se estivesse sem categoria.
    if (sugestao.categoriaId && !sugestao.categoriaNome) sugestao.categoriaNome = nomePorId.get(sugestao.categoriaId)
    // A limpeza tira o "10/12" do nome para a regra aprendida valer para
    // todas as parcelas; na descrição gravada ele volta, senão ninguém sabe
    // se aquela é a primeira ou a décima.
    const parcela = bruto.parcelasTotal ? ` (${bruto.parcelaAtual}/${bruto.parcelasTotal})` : ""
    sugestao.descricaoLimpa += parcela
    const possivelDuplicada=capturados.some(c=>c.data.toISOString().slice(0,10)===bruto.data.toISOString().slice(0,10)&&c.valorCentavos===Math.abs(bruto.valorCentavos)&&normalizar(c.descricao).length>=3&&normalizar(bruto.descricao).includes(normalizar(c.descricao)))
    return {
      ...bruto,
      possivelDuplicada,
      hashImport: hashes[indice],
      duplicada: jaExistem.has(hashes[indice]) || possivelDuplicada,
      categoriaId: sugestao.categoriaId,
      categoriaNome: sugestao.categoriaNome,
      descricaoSugerida: sugestao.descricaoLimpa,
      confianca: sugestao.confianca,
    }
  })

  if(lancamentos.some(l=>l.possivelDuplicada))avisos.push("Há possíveis repetições de gastos recebidos do celular. Foram desmarcadas; confira e selecione apenas se forem compras diferentes.")
  return {
    formato,
    total: lancamentos.length,
    novas: lancamentos.filter((lancamento) => !lancamento.duplicada).length,
    duplicadas: lancamentos.filter((lancamento) => lancamento.duplicada).length,
    semCategoria: lancamentos.filter((lancamento) => !lancamento.categoriaId && !lancamento.duplicada).length,
    lancamentos,
    avisos,
    conferencia,
  }
}

/** Grava os lançamentos confirmados pelo usuário. Duplicados nunca entram. */
export async function confirmarImportacao(params: {
  larId: string
  contaId: string
  arquivoNome: string
  formato: FormatoImportacao
  membroId?: string | null
  lancamentos: {
    data: string
    descricao: string
    descricaoOriginal?: string
    valorCentavos: number
    tipo: "RECEITA" | "DESPESA"
    categoriaId?: string | null
    hashImport: string
    duplicada?: boolean
  }[]
}) {
  const aGravar = params.lancamentos.filter((lancamento) => !lancamento.duplicada)

  return prisma.$transaction(async (tx) => {
    const importacao = await tx.importacao.create({
      data: {
        larId: params.larId,
        contaId: params.contaId,
        arquivoNome: params.arquivoNome,
        formato: params.formato,
        totalLinhas: params.lancamentos.length,
        importadas: aGravar.length,
        duplicadas: params.lancamentos.length - aGravar.length,
      },
    })

    if (aGravar.length > 0) {
      await tx.transacao.createMany({
        data: aGravar.map((lancamento) => {
          const data = new Date(lancamento.data)
          return {
            larId: params.larId,
            contaId: params.contaId,
            categoriaId: lancamento.categoriaId ?? null,
            membroId: params.membroId ?? null,
            data,
            descricao: lancamento.descricao,
            descricaoOriginal: lancamento.descricaoOriginal ?? lancamento.descricao,
            valorCentavos: Math.abs(lancamento.valorCentavos),
            tipo: lancamento.tipo,
            competencia: competenciaDe(data),
            origem:
              params.formato === "ofx" ? "IMPORT_OFX" : params.formato === "pdf" ? "IMPORT_PDF" : "IMPORT_CSV",
            hashImport: lancamento.hashImport,
            importacaoId: importacao.id,
          }
        }),
        // Corrida entre duas importações simultâneas do mesmo arquivo cairia no
        // índice único; pular é o comportamento certo, não abortar o lote.
        skipDuplicates: true,
      })
    }

    return importacao
  })
}

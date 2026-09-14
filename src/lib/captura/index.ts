/**
 * Recebimento de capturas: valida a chave, lê o texto, adivinha conta e
 * categoria, e guarda para conferência.
 */

import { createHash, randomBytes } from "crypto"

import { prisma } from "@/lib/prisma"
import { competenciaDe } from "@/lib/datas"
import { categorizar, type RegraAplicavel } from "@/lib/categorizar"
import { lerNotificacao, lerTextoLivre, type NotificacaoLida } from "@/lib/captura/notificacao"
import type { OrigemCaptura } from "@prisma/client"
import { ErroDeUso } from "@/lib/api"
import { competenciaDoCartao } from "@/lib/competencia-cartao"

/// Confiança mínima para o app propor o lançamento já pronto para um toque.
export const CONFIANCA_MINIMA = 70

export async function descartarCaptura(larId: string, capturaId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${capturaId}))`
    const captura = await tx.captura.findFirst({ where: { id: capturaId, larId } })
    if (!captura) throw new ErroDeUso("Captura não encontrada.", 404)
    if (captura.transacaoId || captura.status === "CONFIRMADA") throw new ErroDeUso("Compra já confirmada. Edite o lançamento no extrato.", 409)
    if (captura.status !== "DESCARTADA") await tx.captura.update({ where: { id: captura.id }, data: { status: "DESCARTADA", decididoEm: new Date() } })
  })
}

/** A chave viaja em claro só uma vez; no banco fica o hash. */
export function gerarChave(): { valor: string; hash: string; sufixo: string } {
  const valor = `pcap_${randomBytes(24).toString("base64url")}`
  return { valor, hash: hashDeChave(valor), sufixo: valor.slice(-6) }
}

export function hashDeChave(valor: string): string {
  return createHash("sha256").update(valor).digest("hex")
}

export async function autenticarChave(valor: string | null | undefined) {
  if (!valor) return null

  const chave = await prisma.chaveCaptura.findUnique({
    where: { chaveHash: hashDeChave(valor) },
    include: { lar: { select: { id: true } } },
  })
  if (!chave || !chave.ativa) return null

  await prisma.chaveCaptura.update({
    where: { id: chave.id },
    data: { ultimoUso: new Date(), usos: { increment: 1 } },
  })

  return chave
}

export interface ResultadoCaptura {
  id: string
  status: "PENDENTE" | "CONFIRMADA" | "DESCARTADA" | "NAO_ENTENDIDA"
  leitura: NotificacaoLida
  /// Mensagem curta para o bot ou o atalho responder no celular.
  resposta: string
}

/**
 * Registra uma captura.
 *
 * O texto bruto é sempre guardado, mesmo quando não é entendido: é assim que dá
 * para melhorar o leitor depois vendo o que realmente chega dos bancos, sem
 * precisar pedir ao usuário que reproduza o problema.
 */
export async function registrarCaptura(params: {
  larId: string
  chaveId?: string | null
  texto: string
  origem: OrigemCaptura
  /// Texto digitado pela pessoa aceita formato livre ("mercado 52,30").
  textoLivre?: boolean
  eventoId?: string | null
}): Promise<ResultadoCaptura> {
  return prisma.$transaction(async (banco) => {
  const leitura = params.textoLivre ? lerTextoLivre(params.texto) : lerNotificacao(params.texto)
  const eventoId = params.eventoId ? createHash("sha256").update(JSON.stringify([params.larId, params.origem, params.chaveId ?? null, params.eventoId])).digest("hex") : null
  if (eventoId) {
    await banco.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${eventoId}))`
    const anterior = await banco.captura.findUnique({ where: { eventoId } })
    if (anterior) return { id: anterior.id, status: anterior.status as ResultadoCaptura["status"], leitura, resposta: "Este aviso já foi recebido." }
  }

  if (leitura.ignorar) {
    const captura = await banco.captura.create({
      data: {
        larId: params.larId,
        eventoId,
        chaveId: params.chaveId ?? null,
        origem: params.origem,
        status: "DESCARTADA",
        textoBruto: params.texto,
        confianca: leitura.confianca,
        decididoEm: new Date(),
      },
    })
    return {
      id: captura.id,
      status: "DESCARTADA",
      leitura,
      resposta: `Ignorei: ${leitura.motivoIgnorar}.`,
    }
  }

  if (!leitura.valorCentavos) {
    const captura = await banco.captura.create({
      data: {
        larId: params.larId,
        eventoId,
        chaveId: params.chaveId ?? null,
        origem: params.origem,
        status: "NAO_ENTENDIDA",
        textoBruto: params.texto,
        confianca: 0,
      },
    })
    return {
      id: captura.id,
      status: "NAO_ENTENDIDA",
      leitura,
      resposta: "Não achei um valor nessa mensagem. Guardei para você conferir no app.",
    }
  }

  const [contas, regras, categorias] = await Promise.all([
    banco.conta.findMany({ where: { larId: params.larId, arquivada: false } }),
    banco.regraCategorizacao.findMany({ where: { larId: params.larId, ativa: true } }),
    banco.categoria.findMany({ where: { larId: params.larId }, select: { id: true, nome: true } }),
  ])

  // A conta sai do final do cartão quando o aviso traz; senão, do nome do banco.
  const porFinal = leitura.cartaoFinal
    ? contas.find((conta) => conta.nome.includes(leitura.cartaoFinal as string))
    : undefined
  const porBanco = leitura.instituicao
    ? contas.find(
        (conta) =>
          conta.instituicao?.toLowerCase() === leitura.instituicao?.toLowerCase() ||
          conta.nome.toLowerCase().includes((leitura.instituicao as string).toLowerCase()),
      )
    : undefined

  const conta = porFinal ?? porBanco ?? contas.find((c) => c.tipo === "CARTAO_CREDITO") ?? contas[0]

  const sugestao = leitura.estabelecimento
    ? categorizar(
        leitura.estabelecimento,
        regras as unknown as RegraAplicavel[],
        new Map(categorias.map((categoria) => [categoria.nome, categoria.id])),
      )
    : null

  const captura = await banco.captura.create({
    data: {
      larId: params.larId,
        eventoId,
      chaveId: params.chaveId ?? null,
      origem: params.origem,
      status: "PENDENTE",
      textoBruto: params.texto,
      valorCentavos: leitura.valorCentavos,
      estabelecimento: sugestao?.descricaoLimpa ?? leitura.estabelecimento,
      data: leitura.data,
      cartaoFinal: leitura.cartaoFinal,
      instituicao: leitura.instituicao,
      parcelaNumero: leitura.parcelaNumero,
      parcelaTotal: leitura.parcelaTotal,
      contaId: conta?.id ?? null,
      categoriaId: sugestao?.categoriaId ?? null,
      confianca: leitura.confianca,
    },
  })

  const valorFormatado = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    leitura.valorCentavos / 100,
  )

  return {
    id: captura.id,
    status: "PENDENTE",
    leitura,
    resposta: `Anotei ${valorFormatado}${captura.estabelecimento ? ` em ${captura.estabelecimento}` : ""}${
      sugestao?.categoriaNome || sugestao?.categoriaId ? "" : " — falta a categoria"
    }.`,
  }
  })
}

/** Transforma a captura conferida em lançamento de verdade. */
export async function confirmarCaptura(params: {
  larId: string
  capturaId: string
  contaId?: string
  categoriaId?: string | null
  valorCentavos?: number
  descricao?: string
  membroId?: string | null
}) {
  const captura = await prisma.captura.findFirstOrThrow({
    where: { id: params.capturaId, larId: params.larId },
  })

  const contaId = params.contaId ?? captura.contaId
  if (!contaId) throw new Error("Escolha em qual conta esse gasto entra.")

  const conta = await prisma.conta.findFirst({where:{id:contaId,larId:params.larId,arquivada:false}})
  if (!conta) throw new ErroDeUso("Conta inválida.")
  const categoriaId=params.categoriaId??captura.categoriaId
  if(categoriaId&&!await prisma.categoria.findFirst({where:{id:categoriaId,larId:params.larId}}))throw new Error("Categoria inválida.")
  const valorCentavos = params.valorCentavos ?? captura.valorCentavos ?? 0
  if (!Number.isSafeInteger(valorCentavos) || valorCentavos <= 0 || valorCentavos > 2147483647) throw new Error("Informe o valor do gasto.")

  const data = captura.data ?? new Date()

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${captura.id}))`
    const atual=await tx.captura.findUniqueOrThrow({where:{id:captura.id}})
    if (atual.status === "DESCARTADA") throw new ErroDeUso("Esta captura foi descartada. Registre novamente para confirmar.", 409)
    if(atual.transacaoId)return tx.transacao.findUniqueOrThrow({where:{id:atual.transacaoId}})
    if (atual.status !== "PENDENTE" && atual.status !== "NAO_ENTENDIDA") throw new ErroDeUso("Esta captura já foi decidida.", 409)
    const transacao = await tx.transacao.create({
      data: {
        larId: params.larId,
        contaId,
        categoriaId: params.categoriaId ?? captura.categoriaId,
        membroId: params.membroId ?? null,
        data,
        descricao: params.descricao ?? captura.estabelecimento ?? "Gasto",
        descricaoOriginal: captura.textoBruto.slice(0, 200),
        valorCentavos,
        tipo: "DESPESA",
        competencia: competenciaDe(data),
        competenciaFatura: competenciaDoCartao(data, conta),
        origem: "MANUAL",
        observacao: `Capturado do celular (${captura.origem.toLowerCase()}).`,
      },
    })

    await tx.captura.update({
      where: { id: captura.id },
      data: { status: "CONFIRMADA", transacaoId: transacao.id, decididoEm: new Date() },
    })

    return transacao
  })
}


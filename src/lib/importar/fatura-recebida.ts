/**
 * Fatura que chegou por e-mail: ler sozinha, avisar, e lançar com um toque.
 *
 * Pedido do Davi (10/11/2026): "deixa a senha e quando chegar no e-mail o Tino
 * pega automaticamente e já confere". A regra 5 continua valendo: o Tino lê,
 * tira o duplicado e confere a soma com o total impresso, mas quem lança é a
 * pessoa, num toque. Lançar calado ficou de fora por decisão dele no mesmo dia.
 */

import type { Prisma } from "@prisma/client"

import { ErroDeUso } from "@/lib/api"
import { abrirSegredo, cifrarSegredo } from "@/lib/criptografia"
import { confirmarImportacao, dadosParaConfirmar, detectarFormato, previaImportacao } from "@/lib/importar"
import { PdfProtegido } from "@/lib/importar/pdf"
import { resumoDaPrevia, type ResumoDaFatura } from "@/lib/importar/resumo-fatura"
import { prisma } from "@/lib/prisma"
import { empurrar } from "@/lib/push"

// O id da conta entra na cifra: senha copiada de uma linha para outra do banco
// não abre, então vazamento de uma conta não serve para a fatura de outra.
const contexto = (contaId: string) => `senha-fatura:${contaId}`

export function cifrarSenhaDaFatura(contaId: string, senha: string): string {
  return cifrarSegredo(senha, contexto(contaId))
}

function senhaGuardada(conta: { id: string; senhaFaturaCifrada: string | null }): string | undefined {
  if (!conta.senhaFaturaCifrada) return undefined
  try {
    return abrirSegredo(conta.senhaFaturaCifrada, contexto(conta.id))
  } catch {
    // Chave do servidor trocada: a senha guardada não abre mais. Tratar como
    // "sem senha" faz a tela pedir de novo, em vez de travar a leitura.
    return undefined
  }
}

async function ler(fatura: { larId: string; contaId: string; arquivoNome: string; conteudo: Uint8Array }) {
  const conta = await prisma.conta.findFirst({ where: { id: fatura.contaId, larId: fatura.larId, arquivada: false } })
  if (!conta) throw new ErroDeUso("Conta não encontrada.", 404)
  const dados = Buffer.from(fatura.conteudo)
  const previa = await previaImportacao({
    larId: fatura.larId,
    contaId: conta.id,
    arquivoNome: fatura.arquivoNome,
    conteudo: dados.buffer.slice(dados.byteOffset, dados.byteOffset + dados.byteLength) as ArrayBuffer,
    faturaCartao: conta.tipo === "CARTAO_CREDITO",
    senhaPdf: senhaGuardada(conta),
  })
  return { conta, previa }
}

/**
 * Lê a fatura recebida e guarda o resumo. Nunca lança nada.
 * Com `avisar`, manda a notificação quando a fatura fica pronta ou pede senha.
 */
export async function prepararFaturaRecebida(id: string, opcoes: { avisar?: boolean } = {}): Promise<ResumoDaFatura | null> {
  const fatura = await prisma.faturaRecebida.findFirst({ where: { id, status: "PENDENTE" } })
  if (!fatura) return null

  let resumo: ResumoDaFatura
  let nomeDaConta = "cartão"
  try {
    const { conta, previa } = await ler(fatura)
    nomeDaConta = conta.nome
    resumo = resumoDaPrevia(previa)
  } catch (excecao) {
    resumo =
      excecao instanceof PdfProtegido
        ? excecao.senhaIncorreta
          ? { situacao: "SENHA_ERRADA", texto: "A senha guardada não abriu esse arquivo. Guarde a senha certa." }
          : { situacao: "PRECISA_SENHA", texto: "O arquivo tem senha. Guarde a senha da fatura uma vez e o Tino lê as próximas sozinho." }
        : { situacao: "ERRO", texto: "Não consegui ler esse arquivo sozinho. Abra em Conferir." }
  }

  await prisma.faturaRecebida.update({ where: { id }, data: { leitura: resumo as unknown as Prisma.InputJsonValue } })

  if (opcoes.avisar && resumo.situacao !== "NADA_NOVO") {
    const titulo =
      resumo.situacao === "PRONTA"
        ? `Fatura do ${nomeDaConta} chegou e está conferida`
        : resumo.situacao === "PRECISA_SENHA" || resumo.situacao === "SENHA_ERRADA"
          ? `Fatura do ${nomeDaConta} chegou: falta a senha`
          : `Fatura do ${nomeDaConta} chegou: confira`
    const inscricoes = await prisma.inscricaoPush.findMany({ where: { usuario: { larId: fatura.larId } } })
    for (const inscricao of inscricoes) {
      await empurrar(inscricao, { tipo: "aviso", id: `fatura:${id}`, titulo, rota: `/cartoes?cartao=${fatura.contaId}&aba=importar` }).catch(() => false)
    }
  }
  return resumo
}

/**
 * O toque de "Confirmar". Relê o arquivo na hora (o extrato pode ter mudado
 * desde a chegada) e só lança se a leitura continuar fechando com o total.
 */
export async function confirmarFaturaRecebida(params: { larId: string; id: string; membroId?: string | null }) {
  const fatura = await prisma.faturaRecebida.findFirst({ where: { id: params.id, larId: params.larId, status: "PENDENTE" } })
  if (!fatura) throw new ErroDeUso("Fatura não encontrada ou já importada.", 404)

  let lida: Awaited<ReturnType<typeof ler>>
  try {
    lida = await ler(fatura)
  } catch (excecao) {
    if (excecao instanceof PdfProtegido) throw new ErroDeUso("O arquivo tem senha. Guarde a senha da fatura e tente de novo.")
    throw excecao
  }
  const resumo = resumoDaPrevia(lida.previa)
  if (resumo.situacao !== "PRONTA") {
    await prisma.faturaRecebida.update({ where: { id: fatura.id }, data: { leitura: resumo as unknown as Prisma.InputJsonValue } })
    throw new ErroDeUso(resumo.texto, 409)
  }

  const importacao = await confirmarImportacao({
    larId: params.larId,
    contaId: fatura.contaId,
    arquivoNome: fatura.arquivoNome,
    formato: detectarFormato(fatura.arquivoNome),
    membroId: params.membroId ?? null,
    ...dadosParaConfirmar(lida.previa),
  })
  // O arquivo some depois de lançado: fatura guardada é dado de sobra parado no banco.
  await prisma.faturaRecebida.update({ where: { id: fatura.id }, data: { status: "CONCLUIDA", conteudo: Buffer.alloc(0) } })
  return { importacao, resumo }
}

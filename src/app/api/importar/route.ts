import { comSessao, corpo, erro, ok, ErroDeUso } from "@/lib/api"
import { consumirLimite, REGRAS } from "@/lib/limite"
import { confirmarImportacao, previaImportacao, type FormatoImportacao } from "@/lib/importar"
import { PdfProtegido } from "@/lib/importar/pdf"
import { prisma } from "@/lib/prisma"
import { doLar } from "@/lib/validar"
import { saldosDasContas } from "@/lib/saldos-das-contas"

/// Extrato de um ano cabe folgado em 10 MB; acima disso é arquivo errado.
const TAMANHO_MAXIMO = 10 * 1024 * 1024

/**
 * Prévia da importação. Recebe o arquivo, devolve o que aconteceria.
 * Nada é gravado aqui — a gravação só ocorre no PUT, depois da conferência.
 */
/// O mesmo teto que a confirmação aceita. Antes a prévia mostrava 12 mil linhas
/// e o botão de confirmar recusava com "valores inválidos", sem dizer o motivo.
const LINHAS_MAXIMAS = 10_000

export const POST = comSessao(async (sessao, requisicao) => {
  // O tamanho é conferido pelo cabeçalho antes de ler o corpo: `formData()`
  // carrega o arquivo inteiro na memória, e um arquivo de 500 MB derrubava a
  // função antes de chegar ao teto de 10 MB logo abaixo. A folga cobre o
  // envelope do formulário (nome da conta, senha do PDF).
  const declarado = Number(requisicao.headers.get("content-length") ?? 0)
  if (declarado > TAMANHO_MAXIMO + 64 * 1024) return erro("Arquivo muito grande (limite de 10 MB).", 413)
  const formulario = await requisicao.formData()
  const arquivo = formulario.get("arquivo")
  const contaId = String(formulario.get("contaId") ?? "")
  const faturaCartao = formulario.get("faturaCartao") === "1"
  const senhaPdf = String(formulario.get("senhaPdf") ?? "") || undefined

  if (!(arquivo instanceof File)) return erro("Envie um arquivo de extrato (OFX, CSV ou PDF).")
  if (arquivo.size > TAMANHO_MAXIMO) return erro("Arquivo muito grande (limite de 10 MB).")
  if (!contaId) return erro("Escolha em qual conta o extrato será importado.")

  const conta = await prisma.conta.findFirst({ where: { id: contaId, larId: sessao.larId } })
  if (!conta) throw new ErroDeUso("Conta não encontrada.", 404)

  // A prévia pode chamar a IA (categoria das lojas, releitura de PDF), que é
  // paga por chamada: sem teto, reenviar o arquivo em laço vira conta do dono.
  await consumirLimite(`caro:importar:${sessao.usuarioId}`, REGRAS.caro)

  try {
    const previa = await previaImportacao({
      larId: sessao.larId,
      contaId,
      arquivoNome: arquivo.name,
      conteudo: await arquivo.arrayBuffer(),
      // Arquivo importado numa conta de cartão é fatura, marcada a caixa ou não.
      // Sem isso a compra entrava como receita.
      faturaCartao: faturaCartao || conta.tipo === "CARTAO_CREDITO",
      senhaPdf,
    })
    // Para a prévia dizer o que a importação faz com a conta (saldo antes e
    // depois). Cartão não tem saldo de conta: lá o que muda é a fatura.
    const saldoAntesCentavos = conta.tipo === "CARTAO_CREDITO" ? null : ((await saldosDasContas(sessao.larId, [conta])).get(conta.id) ?? null)
    if (previa.novas > LINHAS_MAXIMAS) {
      throw new ErroDeUso(`O arquivo tem ${previa.novas.toLocaleString("pt-BR")} lançamentos novos, e o limite é ${LINHAS_MAXIMAS.toLocaleString("pt-BR")} por vez. Exporte do banco um período menor (um ano, por exemplo) e importe em partes.`)
    }
    return ok({ ...previa, saldoAntesCentavos })
  } catch (excecao) {
    // A tela precisa distinguir "faltou senha" de "arquivo quebrado": só no
    // primeiro caso faz sentido mostrar o campo de senha.
    if (excecao instanceof PdfProtegido) {
      return ok({ precisaSenha: true, senhaIncorreta: excecao.senhaIncorreta, erro: excecao.message }, 200)
    }
    throw excecao
  }
})

/** Confirma a importação com os ajustes que o usuário fez na prévia. */
export const PUT = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{
    contaId: string
    arquivoNome: string
    formato: FormatoImportacao
    membroId?: string | null
    competenciaFatura?: string
    diaVencimento?: number
    lancamentos: Parameters<typeof confirmarImportacao>[0]["lancamentos"]
  }>(requisicao, { bytes: 5 * 1024 * 1024, itens: 10_000 })

  if (!dados.lancamentos?.length) return erro("Nenhum lançamento para importar.")

  if(!await prisma.conta.findFirst({where:{id:dados.contaId,larId:sessao.larId,arquivada:false}}))throw new ErroDeUso("Conta inválida.")
  await doLar(sessao.larId, { membro: dados.membroId })
  if(dados.lancamentos.length>LINHAS_MAXIMAS||dados.lancamentos.some(l=>!Number.isSafeInteger(l.valorCentavos)||l.valorCentavos<=0||l.valorCentavos>2147483647))throw new ErroDeUso("Valores do arquivo inválidos.")
  // Sem a impressão digital, o índice único não pega a repetição (nulo não
  // colide) e o mesmo lançamento entrava duas vezes (auditoria, Lote 5).
  if (dados.lancamentos.some((l) => typeof l.hashImport !== "string" || !/^[a-f0-9]{16,128}$/.test(l.hashImport))) throw new ErroDeUso("Refaça a prévia do arquivo antes de confirmar.")
  if (dados.competenciaFatura != null && !/^\d{4}-(0[1-9]|1[0-2])$/.test(dados.competenciaFatura)) throw new ErroDeUso("Mês da fatura inválido.")
  if (dados.diaVencimento != null && !(Number.isInteger(dados.diaVencimento) && dados.diaVencimento >= 1 && dados.diaVencimento <= 31)) throw new ErroDeUso("Dia de vencimento inválido.")
  const parcelaValida = (l: (typeof dados.lancamentos)[number]) =>
    l.parcelasTotal == null ||
    (Number.isInteger(l.parcelasTotal) && Number.isInteger(l.parcelaAtual) && l.parcelasTotal >= 2 && l.parcelasTotal <= 120 &&
      (l.parcelaAtual as number) >= 1 && (l.parcelaAtual as number) <= l.parcelasTotal &&
      (l.dataCompra == null || !Number.isNaN(new Date(l.dataCompra).getTime())))
  if (!dados.lancamentos.every(parcelaValida)) throw new ErroDeUso("Parcela inválida.")
  const ids=[...new Set(dados.lancamentos.flatMap(l=>l.categoriaId?[l.categoriaId]:[]))]
  if(await prisma.categoria.count({where:{id:{in:ids},larId:sessao.larId}})!==ids.length)throw new ErroDeUso("Categoria inválida.")
  const importacao = await confirmarImportacao({
    larId: sessao.larId,
    contaId: dados.contaId,
    arquivoNome: dados.arquivoNome,
    formato: dados.formato,
    membroId: dados.membroId ?? sessao.membroId,
    competenciaFatura: dados.competenciaFatura ?? undefined,
    diaVencimento: dados.diaVencimento ?? undefined,
    lancamentos: dados.lancamentos,
  })

  return ok(importacao, 201)
})

export const GET = comSessao(async (sessao) =>
  ok(
    await prisma.importacao.findMany({
      where: { larId: sessao.larId },
      orderBy: { criadoEm: "desc" },
      take: 20,
    }),
  ),
)

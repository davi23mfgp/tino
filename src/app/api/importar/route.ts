import { comSessao, corpo, erro, ok, ErroDeUso } from "@/lib/api"
import { confirmarImportacao, previaImportacao, type FormatoImportacao } from "@/lib/importar"
import { PdfProtegido } from "@/lib/importar/pdf"
import { prisma } from "@/lib/prisma"
import { doLar } from "@/lib/validar"

/// Extrato de um ano cabe folgado em 10 MB; acima disso é arquivo errado.
const TAMANHO_MAXIMO = 10 * 1024 * 1024

/**
 * Prévia da importação. Recebe o arquivo, devolve o que aconteceria.
 * Nada é gravado aqui — a gravação só ocorre no PUT, depois da conferência.
 */
export const POST = comSessao(async (sessao, requisicao) => {
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
    return ok(previa)
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
    lancamentos: Parameters<typeof confirmarImportacao>[0]["lancamentos"]
  }>(requisicao, { bytes: 5 * 1024 * 1024, itens: 10_000 })

  if (!dados.lancamentos?.length) return erro("Nenhum lançamento para importar.")

  if(!await prisma.conta.findFirst({where:{id:dados.contaId,larId:sessao.larId,arquivada:false}}))throw new ErroDeUso("Conta inválida.")
  await doLar(sessao.larId, { membro: dados.membroId })
  if(dados.lancamentos.length>10000||dados.lancamentos.some(l=>!Number.isSafeInteger(l.valorCentavos)||l.valorCentavos<=0||l.valorCentavos>2147483647))throw new ErroDeUso("Valores do arquivo inválidos.")
  const ids=[...new Set(dados.lancamentos.flatMap(l=>l.categoriaId?[l.categoriaId]:[]))]
  if(await prisma.categoria.count({where:{id:{in:ids},larId:sessao.larId}})!==ids.length)throw new ErroDeUso("Categoria inválida.")
  const importacao = await confirmarImportacao({
    larId: sessao.larId,
    contaId: dados.contaId,
    arquivoNome: dados.arquivoNome,
    formato: dados.formato,
    membroId: dados.membroId ?? sessao.membroId,
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

import { prisma } from "@/lib/prisma"
import { comSessao, ErroDeUso, ok } from "@/lib/api"
import { validarAnexo } from "@/lib/loja/relatorio-mei"

export const dynamic = "force-dynamic"

/** A venda tem de ser de um negócio deste lar: o id sozinho não prova isso. */
const vendaDoLar = (larId: string, vendaId: string) => prisma.vendaLoja.findFirst({ where: { id: vendaId, loja: { larId } }, select: { id: true } })

/**
 * Anexa a nota à venda (passo 41): com a nota anexada a venda passa de
 * "pendente de nota" para "com nota". Anexar de novo troca a anterior.
 */
export const POST = comSessao(async (sessao, requisicao) => {
  const formulario = await requisicao.formData().catch(() => null)
  const vendaId = formulario?.get("vendaId")
  const arquivo = formulario?.get("arquivo")
  if (typeof vendaId !== "string" || !(arquivo instanceof File)) throw new ErroDeUso("Escolha a venda e o arquivo da nota.")
  const venda = await vendaDoLar(sessao.larId, vendaId)
  if (!venda) throw new ErroDeUso("Venda não encontrada.", 404)
  const lido = validarAnexo({ nome: arquivo.name, tipo: arquivo.type, tamanho: arquivo.size })
  if (!lido.ok) throw new ErroDeUso(lido.erro)
  const conteudo = Buffer.from(await arquivo.arrayBuffer())
  const dados = { nome: lido.valor.nome, tipo: lido.valor.tipo, tamanhoBytes: conteudo.length, conteudo }
  // Quem anexa a nota respondeu que teve: a marca "não teve nota" sai, e se a nota for tirada depois a venda volta a pendente, não a "sem nota".
  await prisma.$transaction([
    prisma.notaAnexada.upsert({ where: { vendaId: venda.id }, create: { vendaId: venda.id, ...dados }, update: dados }),
    prisma.vendaLoja.update({ where: { id: venda.id }, data: { semNota: false } }),
  ])
  return ok({ ok: true })
})

/** Baixa a nota anexada. `nosniff` e `attachment`: o arquivo é de quem anexou, nunca é aberto como página do Tino. */
export const GET = comSessao(async (sessao, requisicao) => {
  const vendaId = new URL(requisicao.url).searchParams.get("vendaId") ?? ""
  const anexo = await prisma.notaAnexada.findFirst({ where: { vendaId, venda: { loja: { larId: sessao.larId } } } })
  if (!anexo) throw new ErroDeUso("Nenhuma nota anexada nesta venda.", 404)
  return new Response(new Uint8Array(anexo.conteudo), {
    headers: {
      "Content-Type": anexo.tipo,
      "Content-Disposition": `attachment; filename="${anexo.nome.replace(/[^\x20-\x7E]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(anexo.nome)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  })
})

export const DELETE = comSessao(async (sessao, requisicao) => {
  const vendaId = new URL(requisicao.url).searchParams.get("vendaId") ?? ""
  const venda = await vendaDoLar(sessao.larId, vendaId)
  if (!venda) throw new ErroDeUso("Venda não encontrada.", 404)
  await prisma.notaAnexada.deleteMany({ where: { vendaId: venda.id } })
  return ok({ ok: true })
})

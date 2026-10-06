import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ErroDeUso, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { campo, validar, z } from "@/lib/validar"

/**
 * Marca um compromisso. Sem hora é do dia inteiro. O dia vem como
 * AAAA-MM-DD e a hora como HH:MM no relógio do aparelho, que a tela já
 * converteu para o instante certo (`inicioEm`).
 */
export const POST = comSessao(async (sessao, requisicao) => {
  const dados = validar(
    z.object({
      titulo: campo.textoObrigatorio(120),
      detalhe: campo.texto(300).optional(),
      dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      inicioEm: campo.data().optional(),
      clienteId: campo.id().optional(),
      ordemId: campo.id().optional(),
    }),
    await corpo(requisicao),
  )
  const loja = await lojaDoLar(sessao.larId)
  if (dados.clienteId && !(await prisma.clienteLoja.count({ where: { id: dados.clienteId, lojaId: loja.id } }))) throw new ErroDeUso("Cliente não encontrado.", 404)
  if (dados.ordemId && !(await prisma.ordemServicoLoja.count({ where: { id: dados.ordemId, lojaId: loja.id } }))) throw new ErroDeUso("Ordem de serviço não encontrada.", 404)
  const compromisso = await prisma.compromissoLoja.create({
    data: {
      lojaId: loja.id,
      titulo: dados.titulo,
      detalhe: dados.detalhe || null,
      inicioEm: dados.inicioEm ?? new Date(`${dados.dia}T00:00:00Z`),
      diaInteiro: !dados.inicioEm,
      clienteId: dados.clienteId ?? null,
      ordemId: dados.ordemId ?? null,
    },
  })
  return ok({ compromisso }, 201)
})

import { comSessao, corpo, ok } from "@/lib/api"
import { validar, z } from "@/lib/validar"
import { criarConvites } from "@/lib/convites"

export const POST = comSessao(async (sessao, requisicao) => {
  const { emails } = validar(z.object({ emails: z.array(z.string().trim().toLowerCase().email().max(254)).min(1).max(10) }).strict(), await corpo(requisicao))
  return ok(await criarConvites(sessao, emails, new URL(requisicao.url).origin))
})

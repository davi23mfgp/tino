import { comSessao, ok } from "@/lib/api"
import { gravarEtapa } from "@/lib/funil-gravar"

/** Fim do Montar o seu Tino. Vale uma vez por pessoa (único no banco). */
export const POST = comSessao(async (sessao) => {
  await gravarEtapa("ROTEIRO_TERMINADO", { usuarioId: sessao.usuarioId })
  return ok({ gravado: true })
})

import { comSessao, corpo, ok } from "@/lib/api"
import { anoDoMei } from "@/lib/loja/mei-ano"
import { LIMITE_MEI_2026_CENTAVOS, responderTributario } from "@/lib/regras-mei"
import { campo, validar, z } from "@/lib/validar"

export const dynamic = "force-dynamic"

/**
 * A dúvida tributária do MEI (item 3.3), respondida pelo catálogo de regras
 * com fonte e data, usando os números da tela MEI. O que o catálogo não
 * cobre volta como "caso de contador".
 */
export const POST = comSessao(async (sessao, requisicao) => {
  const { pergunta } = validar(z.object({ pergunta: campo.textoObrigatorio(400) }), await corpo(requisicao))
  const ano = await anoDoMei(sessao.larId)
  return ok(responderTributario(pergunta, {
    faturadoNoAnoCentavos: ano ? ano.situacao.faturamentoAnoCentavos : null,
    limiteAnualCentavos: ano?.perfil.limiteAnualEfetivoCentavos ?? LIMITE_MEI_2026_CENTAVOS,
    atividade: ano?.perfil.atividade ?? null,
  }))
})

import { comSessao, corpo, ok } from "@/lib/api"
import { contextoTributario } from "@/lib/loja/mei-ano"
import { ehPerguntaTributaria, responderTributario, textoDaResposta } from "@/lib/regras-mei"
import { campo, validar, z } from "@/lib/validar"

export const dynamic = "force-dynamic"

/**
 * A dúvida tributária do MEI (item 3.3), respondida pelo catálogo de regras
 * com fonte e data, usando os números da tela MEI. É a conversa do Tino da
 * conta MEI (passo 49, opção C): o que é de imposto e o catálogo não cobre
 * volta como "caso de contador"; o que não é de imposto recebe a lista do
 * que dá para perguntar aqui, em vez de um chute.
 */
export const POST = comSessao(async (sessao, requisicao) => {
  const { pergunta } = validar(z.object({ pergunta: campo.textoObrigatorio(400) }), await corpo(requisicao))
  const resposta = responderTributario(pergunta, await contextoTributario(sessao.larId))
  if (resposta.chave === "contador" && !ehPerguntaTributaria(pergunta)) {
    return ok({
      chave: "fora",
      texto: "Aqui eu respondo dúvidas do MEI: quanto é e quando vence o DAS, o limite do ano, o que acontece se passar dele, nota fiscal, declaração anual e funcionário. Para marcar horário, use \"Peça ao Tino\" na Agenda.",
      procureContador: false,
    })
  }
  return ok({ ...resposta, texto: textoDaResposta(resposta) })
})

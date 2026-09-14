/**
 * Transcrição de áudio.
 *
 * Existe para um caso só: a pessoa manda um audiozinho no lugar de digitar
 * ("paguei sete e cinquenta no pão"), e isso precisa virar o mesmo texto que
 * ela teria escrito — daí em diante o caminho é o de sempre.
 *
 * **Por que Groq, e não o modelo do resto do app:** os modelos Claude não
 * aceitam áudio como entrada, então a `ANTHROPIC_API_KEY` não resolve isto.
 * O Groq dá acesso ao Whisper, e já é provedor conhecido do app — nenhum
 * fornecedor novo entra no produto por causa deste arquivo.
 *
 * **Duas chaves, de propósito.** `GROQ_API_KEY` sozinha faz o Groq assumir
 * também as respostas do assessor, na frente do Claude (`modelo.ts`). Quem
 * quer só a transcrição põe a chave em `GROQ_API_KEY_AUDIO`: o áudio passa a
 * funcionar e a conversa continua onde estava.
 *
 * Sem a chave, quem manda áudio recebe um recado dizendo para escrever. O app
 * inteiro continua funcionando: isto é opcional, como o resto da camada de
 * modelo.
 */

const ENDERECO = "https://api.groq.com/openai/v1/audio/transcriptions"

/// Áudio de recado é curto. Acima disso é outra coisa (música, gravação de
/// reunião), e transcrever sairia caro para devolver lixo.
const TAMANHO_MAXIMO = 8 * 1024 * 1024

/// Whisper alucina texto inteiro quando recebe silêncio ou ruído. Abaixo de
/// um segundo e meio de fala não há o que aproveitar, e o custo de aceitar é
/// um lançamento inventado.
const TAMANHO_MINIMO = 1024

export class AudioIndisponivel extends Error {}
export class AudioLongoDemais extends Error {}
export class AudioVazio extends Error {}

/** A do áudio primeiro; a geral só como herança de quem já tinha uma só. */
function chave(): string | undefined {
  return process.env.GROQ_API_KEY_AUDIO || process.env.GROQ_API_KEY
}

export function transcricaoDisponivel(): boolean {
  return Boolean(chave())
}

/**
 * Devolve o que foi falado, em texto.
 *
 * `language: pt` é explícito de propósito: sem isso o Whisper detecta idioma
 * por conta e, em áudio curto com número ("dezoito e noventa"), às vezes
 * decide que é espanhol e devolve a frase traduzida — com o valor trocado.
 */
export async function transcrever(conteudo: ArrayBuffer, nome = "audio.ogg"): Promise<string> {
  if (!transcricaoDisponivel()) throw new AudioIndisponivel()
  if (conteudo.byteLength > TAMANHO_MAXIMO) throw new AudioLongoDemais()
  if (conteudo.byteLength < TAMANHO_MINIMO) throw new AudioVazio()

  const formulario = new FormData()
  formulario.append("file", new Blob([conteudo]), nome)
  formulario.append("model", process.env.GROQ_MODELO_AUDIO || "whisper-large-v3-turbo")
  formulario.append("language", "pt")
  formulario.append("response_format", "json")
  // Dá ao Whisper o vocabulário do assunto: sem isto "pix" vira "picks" e
  // "ifood" vira "e food" com frequência alta em áudio de celular.
  formulario.append(
    "prompt",
    "Gasto do dia a dia em português do Brasil. Pode conter: pix, boleto, iFood, Uber, mercado, farmácia, cartão, parcela, reais, centavos.",
  )

  const resposta = await fetch(ENDERECO, {
    method: "POST",
    signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Bearer ${chave()}` },
    body: formulario,
  })

  if (!resposta.ok) throw new Error(`Groq recusou a transcrição (${resposta.status}).`)

  const dados = (await resposta.json()) as { text?: string }
  const texto = (dados.text ?? "").trim()
  if (!texto) throw new AudioVazio()

  return texto
}

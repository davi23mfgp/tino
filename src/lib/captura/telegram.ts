/**
 * Ponte com o Telegram.
 *
 * É o caminho mais curto para mandar fatura e anotar gasto sem abrir o app:
 * encaminhar o PDF do banco para uma conversa, ou digitar "mercado 52,30".
 * Funciona em qualquer celular, não exige instalar nada além do Telegram e
 * não depende de loja de aplicativos.
 */

const BASE = "https://api.telegram.org"

function token(): string {
  const valor = process.env.TELEGRAM_BOT_TOKEN
  if (!valor) throw new Error("TELEGRAM_BOT_TOKEN não configurado.")
  return valor
}

export function telegramDisponivel(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN)
}

export async function responder(chatId: string | number, texto: string) {
  await fetch(`${BASE}/bot${token()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: "HTML" }),
  })
}

/**
 * Manda um aviso e diz se chegou. `responder` não olha a resposta, e para o
 * aviso isso importa: o que não chegou tem de continuar pendente. Sem
 * `parse_mode`, porque título de aviso traz nome de loja ("C&A") e o HTML do
 * Telegram recusaria a mensagem inteira por um "&".
 */
export async function enviarAviso(chatId: string, texto: string): Promise<boolean> {
  if (!telegramDisponivel()) return false
  try {
    const resposta = await fetch(`${BASE}/bot${token()}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: texto }),
    })
    return resposta.ok
  } catch {
    return false
  }
}

/** Baixa um arquivo enviado ao bot. */
export async function baixarArquivo(fileId: string): Promise<{ nome: string; conteudo: ArrayBuffer }> {
  const resposta = await fetch(`${BASE}/bot${token()}/getFile?file_id=${encodeURIComponent(fileId)}`)
  const dados = (await resposta.json()) as { ok: boolean; result?: { file_path: string } }

  if (!dados.ok || !dados.result?.file_path) throw new Error("Não consegui baixar o arquivo do Telegram.")

  const arquivo = await fetch(`${BASE}/file/bot${token()}/${dados.result.file_path}`)
  if (!arquivo.ok) throw new Error("Não consegui baixar o arquivo do Telegram.")

  return {
    nome: dados.result.file_path.split("/").pop() ?? "arquivo",
    conteudo: await arquivo.arrayBuffer(),
  }
}

export interface AtualizacaoTelegram {
  /** Número que o Telegram dá a cada atualização. É único por bot e é o que
   *  identifica o mesmo aviso reentregue depois de um erro de rede. */
  update_id?: number
  message?: {
    chat: { id: number }
    from?: { first_name?: string }
    text?: string
    caption?: string
    document?: { file_id: string; file_name?: string; mime_type?: string; file_size?: number }
    photo?: { file_id: string; file_size?: number }[]
    /** Gravado na hora, o botão do microfone. */
    voice?: { file_id: string; mime_type?: string; duration?: number }
    /** Arquivo de áudio anexado, que o Telegram entrega em campo separado. */
    audio?: { file_id: string; mime_type?: string; duration?: number }
  }
}

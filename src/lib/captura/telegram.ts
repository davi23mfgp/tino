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
  message?: {
    chat: { id: number }
    from?: { first_name?: string }
    text?: string
    caption?: string
    document?: { file_id: string; file_name?: string; mime_type?: string; file_size?: number }
    photo?: { file_id: string; file_size?: number }[]
  }
}

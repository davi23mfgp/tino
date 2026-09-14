/**
 * Ponte com o WhatsApp.
 *
 * Usa a Cloud API oficial da Meta, e não uma biblioteca que se conecta pelo
 * WhatsApp Web lendo QR code. As não oficiais são grátis e funcionam, mas
 * violam os termos da Meta e o número pode ser banido sem aviso — num produto
 * vendido a terceiros, o número banido seria o do cliente.
 *
 * O que isso exige, e não tem como contornar:
 * - um número **dedicado** ao bot, que deixa de funcionar no app comum;
 * - conta na Meta Business com o número verificado;
 * - webhook em HTTPS público, o que só existe depois de publicar o app.
 *
 * Custo: conversa iniciada pelo usuário abre uma janela de serviço de 24h, que
 * a Meta não cobra. Como aqui quem escreve primeiro é sempre a pessoa, o uso
 * normal não gera cobrança.
 */

const BASE = "https://graph.facebook.com/v21.0"

function token(): string {
  const valor = process.env.WHATSAPP_TOKEN
  if (!valor) throw new Error("WHATSAPP_TOKEN não configurado.")
  return valor
}

function numeroDoBot(): string {
  const valor = process.env.WHATSAPP_PHONE_ID
  if (!valor) throw new Error("WHATSAPP_PHONE_ID não configurado.")
  return valor
}

export function whatsappDisponivel(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID)
}

/**
 * Responde à pessoa.
 *
 * O WhatsApp não aceita HTML: negrito é *asterisco*. As mensagens do app são
 * escritas em HTML por causa do Telegram, então a conversão acontece aqui, num
 * lugar só, em vez de espalhar dois textos por todo o código.
 */
export async function responder(telefone: string, texto: string) {
  await fetch(`${BASE}/${numeroDoBot()}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: telefone,
      type: "text",
      text: { body: paraWhatsApp(texto), preview_url: false },
    }),
  })
}

/** `<b>` do Telegram vira `*` do WhatsApp; o resto das marcações cai fora. */
export function paraWhatsApp(texto: string): string {
  return texto
    .replace(/<\/?b>/g, "*")
    .replace(/<\/?strong>/g, "*")
    .replace(/<\/?i>/g, "_")
    .replace(/<\/?code>/g, "`")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
}

/**
 * Baixa um arquivo recebido.
 *
 * São duas chamadas: a primeira troca o id da mídia por uma URL temporária, a
 * segunda busca o conteúdo — e essa segunda também exige o token, ao contrário
 * do Telegram, onde a URL do arquivo já é pública.
 */
export async function baixarMidia(mediaId: string): Promise<{ nome: string; conteudo: ArrayBuffer }> {
  const meta = await fetch(`${BASE}/${mediaId}`, { headers: { Authorization: `Bearer ${token()}` } })
  const dados = (await meta.json()) as { url?: string; mime_type?: string; file_size?: number }

  if (!dados.url) throw new Error("Não consegui localizar o arquivo no WhatsApp.")

  const arquivo = await fetch(dados.url, { headers: { Authorization: `Bearer ${token()}` } })
  if (!arquivo.ok) throw new Error("Não consegui baixar o arquivo do WhatsApp.")

  return {
    nome: `arquivo${extensaoDe(dados.mime_type)}`,
    conteudo: await arquivo.arrayBuffer(),
  }
}

/** O nome do arquivo vem no corpo da mensagem, não aqui; isto é só o fallback. */
function extensaoDe(mime?: string): string {
  if (!mime) return ""
  if (mime.includes("pdf")) return ".pdf"
  if (mime.includes("csv") || mime.includes("comma")) return ".csv"
  if (mime.includes("ofx")) return ".ofx"
  // O recado de voz do WhatsApp vem sempre em ogg/opus; os outros aparecem
  // quando a pessoa anexa um arquivo de áudio em vez de gravar.
  if (mime.includes("ogg")) return ".ogg"
  if (mime.includes("mpeg") || mime.includes("mp3")) return ".mp3"
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) return ".m4a"
  if (mime.includes("wav")) return ".wav"
  return ""
}

export interface MensagemWhatsApp {
  /** Telefone de quem escreveu, com código do país e sem sinais. */
  from: string
  id: string
  type: string
  text?: { body: string }
  document?: { id: string; filename?: string; mime_type?: string }
  /** Recado de voz e áudio anexado chegam no mesmo campo. */
  audio?: { id: string; mime_type?: string; voice?: boolean }
  image?: { id: string; mime_type?: string }
}

/** Formato que a Meta entrega no webhook. Só o que este app usa. */
export interface EventoWhatsApp {
  entry?: {
    changes?: {
      value?: {
        messages?: MensagemWhatsApp[]
      }
    }[]
  }[]
}

/** Puxa a primeira mensagem do envelope, que vem aninhado em três níveis. */
export function primeiraMensagem(evento: EventoWhatsApp): MensagemWhatsApp | null {
  return evento.entry?.[0]?.changes?.[0]?.value?.messages?.[0] ?? null
}

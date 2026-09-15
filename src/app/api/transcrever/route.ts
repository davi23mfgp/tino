import { comSessao, ok, ErroDeUso } from "@/lib/api"
import { consumirLimite, REGRAS } from "@/lib/limite"
import {
  AudioIndisponivel,
  AudioLongoDemais,
  AudioVazio,
  transcrever,
  transcricaoDisponivel,
} from "@/lib/captura/transcricao"

export const dynamic = "force-dynamic"

/**
 * O que foi falado, em texto.
 *
 * Só transcreve: não lança, não guarda, não decide nada. O texto volta para a
 * tela e segue pelo caminho que a pessoa já usava para anotar digitando — que
 * é onde ela confere antes de confirmar.
 *
 * **Por que no servidor, e não no navegador:** o reconhecimento do próprio
 * navegador (`DitarGasto`) só existe no Chrome e some no iPhone, que é onde a
 * pessoa mais grava recado. Com esta rota o áudio sobe e volta entendido em
 * qualquer aparelho.
 *
 * Atrás de sessão: sem isso o app viraria serviço de transcrição aberto para
 * qualquer um pagar com a nossa chave.
 */
export const POST = comSessao(async (sessao, requisicao) => {
  // Cada chamada gasta Groq. Sem teto, um laço vira conta para o dono pagar.
  await consumirLimite(`transcrever:${sessao.usuarioId}`, REGRAS.caro)

  if (!transcricaoDisponivel()) {
    throw new ErroDeUso("A transcrição de áudio não está configurada neste servidor.")
  }

  const formulario = await requisicao.formData().catch(() => null)
  const arquivo = formulario?.get("audio")
  if (!(arquivo instanceof Blob)) throw new ErroDeUso("Nenhum áudio recebido.")

  try {
    return ok({ texto: await transcrever(await arquivo.arrayBuffer(), nomeDe(arquivo)) })
  } catch (excecao) {
    if (excecao instanceof AudioIndisponivel) throw new ErroDeUso("A transcrição de áudio não está configurada.")
    if (excecao instanceof AudioLongoDemais) throw new ErroDeUso("Áudio comprido demais. Grave só o gasto.")
    if (excecao instanceof AudioVazio) throw new ErroDeUso("Não consegui ouvir nada. Grave de novo.")
    throw excecao
  }
})

/** O Whisper decide o formato pela extensão, então ela precisa chegar certa. */
function nomeDe(arquivo: Blob): string {
  const tipo = (arquivo as File).type || ""
  if (tipo.includes("webm")) return "audio.webm"
  if (tipo.includes("ogg")) return "audio.ogg"
  if (tipo.includes("mp4") || tipo.includes("m4a") || tipo.includes("aac")) return "audio.m4a"
  if (tipo.includes("wav")) return "audio.wav"
  if (tipo.includes("mpeg")) return "audio.mp3"
  return "audio.webm"
}

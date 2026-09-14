import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"

import {
  AudioIndisponivel,
  AudioLongoDemais,
  AudioVazio,
  transcrever,
  transcricaoDisponivel,
} from "@/lib/captura/transcricao"

const chaveOriginal = process.env.GROQ_API_KEY
const buscaOriginal = globalThis.fetch

afterEach(() => {
  if (chaveOriginal === undefined) delete process.env.GROQ_API_KEY
  else process.env.GROQ_API_KEY = chaveOriginal
  globalThis.fetch = buscaOriginal
})

/** Áudio de verdade não importa aqui: o que vale é o tamanho. */
function audioDe(bytes: number): ArrayBuffer {
  return new ArrayBuffer(bytes)
}

describe("transcrição de áudio", () => {
  it("sem chave, não escuta — e diz isso em vez de estourar genérico", async () => {
    delete process.env.GROQ_API_KEY
    assert.equal(transcricaoDisponivel(), false)
    await assert.rejects(() => transcrever(audioDe(50_000)), AudioIndisponivel)
  })

  it("recusa áudio comprido antes de gastar chamada", async () => {
    process.env.GROQ_API_KEY = "teste"
    let chamou = false
    globalThis.fetch = (async () => {
      chamou = true
      return new Response("{}")
    }) as typeof fetch

    await assert.rejects(() => transcrever(audioDe(9 * 1024 * 1024)), AudioLongoDemais)
    assert.equal(chamou, false, "não pode chamar a API para um áudio que já sabemos que é grande demais")
  })

  it("recusa áudio mudo — silêncio é o que faz o Whisper inventar frase", async () => {
    process.env.GROQ_API_KEY = "teste"
    await assert.rejects(() => transcrever(audioDe(200)), AudioVazio)
  })

  it("devolve o que foi falado, sem espaço sobrando", async () => {
    process.env.GROQ_API_KEY = "teste"
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ text: "  mercado 52,30  " }), {
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch

    assert.equal(await transcrever(audioDe(50_000)), "mercado 52,30")
  })

  it("manda português explícito, senão número curto vira espanhol traduzido", async () => {
    process.env.GROQ_API_KEY = "teste"
    let enviado: FormData | null = null
    globalThis.fetch = (async (_url: unknown, opcoes: { body?: unknown } = {}) => {
      enviado = opcoes.body as FormData
      return new Response(JSON.stringify({ text: "pão 7,50" }), {
        headers: { "Content-Type": "application/json" },
      })
    }) as unknown as typeof fetch

    await transcrever(audioDe(50_000))
    assert.equal(enviado!.get("language"), "pt")
  })

  it("resposta vazia da API não vira lançamento em branco", async () => {
    process.env.GROQ_API_KEY = "teste"
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ text: "   " }), {
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch

    await assert.rejects(() => transcrever(audioDe(50_000)), AudioVazio)
  })
})

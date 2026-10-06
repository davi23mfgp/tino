import assert from "node:assert/strict"
import { test } from "node:test"

import { codificarOrigem, decidirOrigem, decodificarOrigem, lerChegada, origemDaRequisicao, temMarca } from "../src/lib/origem-cadastro"

const agora = new Date("2026-10-06T12:00:00Z")

test("lê campanha e indicação do link, e só o domínio do site de fora", () => {
  const chegada = lerChegada(new URL("https://tino.app/para-mei?utm_source=instagram&utm_medium=anuncio&utm_campaign=assistencia&ref=carlos"), "https://www.google.com/search?q=maria+silva", agora)
  assert.deepEqual(chegada, { fonte: "instagram", meio: "anuncio", campanha: "assistencia", ref: "carlos", entrada: "/para-mei", site: "www.google.com", em: agora.toISOString() })
})

test("o próprio Tino não conta como site de origem", () => {
  const chegada = lerChegada(new URL("https://tino.app/cadastro"), "https://tino.app/", agora)
  assert.equal(chegada.site, undefined)
  assert.equal(temMarca(chegada), false)
})

test("vale a primeira chegada; a marcada substitui a sem marca, nunca o contrário", () => {
  const busca = lerChegada(new URL("https://tino.app/"), "https://www.google.com/", agora)
  const anuncio = lerChegada(new URL("https://tino.app/?utm_source=instagram"), null, agora)
  const indicacao = lerChegada(new URL("https://tino.app/?ref=ana"), null, agora)
  assert.equal(decidirOrigem(null, busca), busca)
  assert.equal(decidirOrigem(busca, anuncio), anuncio)
  // A busca depois do anúncio não apaga o anúncio.
  assert.equal(decidirOrigem(anuncio, busca), null)
  // A primeira marcada fica: a indicação depois do anúncio não troca.
  assert.equal(decidirOrigem(anuncio, indicacao), null)
  assert.equal(decidirOrigem(busca, busca), null)
})

test("valor montado por qualquer um sai limpo e curto", () => {
  const chegada = lerChegada(new URL(`https://tino.app/?utm_source=${encodeURIComponent("<script>alert(1)</script>")}&ref=${"x".repeat(500)}`), null, agora)
  assert.equal(chegada.fonte, "scriptalert1/script")
  assert.equal(chegada.ref?.length, 80)
})

test("o cookie vai e volta, e cookie estragado não quebra o cadastro", () => {
  const origem = lerChegada(new URL("https://tino.app/para-mei?utm_source=contador"), null, agora)
  assert.deepEqual(decodificarOrigem(codificarOrigem(origem)), origem)
  assert.equal(decodificarOrigem("lixo"), null)
  assert.equal(decodificarOrigem(Buffer.from(JSON.stringify({ fonte: "x" })).toString("base64url")), null)
  assert.equal(decodificarOrigem(undefined), null)
  const requisicao = new Request("https://tino.app/api/auth/cadastro", { headers: { cookie: `outro=1; tino_origem=${codificarOrigem(origem)}` } })
  assert.deepEqual(origemDaRequisicao(requisicao), origem)
})

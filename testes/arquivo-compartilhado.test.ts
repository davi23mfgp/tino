import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { arquivoAceito, compartilhadoVencido, nomeSeguro } from "../src/lib/importar/arquivo-compartilhado"

describe("arquivo que chega pelo Compartilhar do celular", () => {
  it("aceita PDF, CSV e OFX de até 10 MB", () => {
    assert.equal(arquivoAceito("Fatura Nubank.PDF", 300_000), true)
    assert.equal(arquivoAceito("extrato.ofx", 1), true)
    assert.equal(arquivoAceito("foto.jpg", 300_000), false)
    assert.equal(arquivoAceito("fatura.pdf", 0), false)
    assert.equal(arquivoAceito("fatura.pdf", 11 * 1024 * 1024), false)
  })
  it("limpa o nome antes de devolver", () => {
    assert.equal(nomeSeguro("../../etc/passwd.pdf"), "passwd.pdf")
    assert.equal(nomeSeguro('fatura"\r\nX-Injetado: 1.pdf'), "fatura___X-Injetado_ 1.pdf")
  })
  it("vence em uma hora", () => {
    const agora = new Date("2026-11-16T12:00:00Z")
    assert.equal(compartilhadoVencido(new Date("2026-11-16T11:30:00Z"), agora), false)
    assert.equal(compartilhadoVencido(new Date("2026-11-16T10:59:00Z"), agora), true)
  })
})

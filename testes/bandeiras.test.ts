import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { finalDoCartao } from "@/lib/bandeiras"

describe("final do cartão", () => {
  it("lê os quatro dígitos escritos no nome", () => {
    assert.equal(finalDoCartao("Cartão Platinum (final 8842)"), "8842")
    assert.equal(finalDoCartao("Nubank FINAL3317"), "3317")
  })

  it("sem final no nome não inventa número", () => {
    assert.equal(finalDoCartao("Cartão da Marina"), null)
    assert.equal(finalDoCartao("final 12"), null)
  })
})

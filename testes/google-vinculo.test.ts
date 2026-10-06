import assert from "node:assert/strict"
import { test } from "node:test"

import { podeLigarGoogleSozinho } from "../src/lib/google-login"

test("Google liga sozinho só conta comum, de Gmail, ainda sem Google", () => {
  assert.equal(podeLigarGoogleSozinho("pessoa@gmail.com", { googleId: null, admin: false }), true)
  assert.equal(podeLigarGoogleSozinho("Pessoa@Gmail.com", { googleId: null, admin: false }), true)
  // Outro domínio pode trocar de dono.
  assert.equal(podeLigarGoogleSozinho("pessoa@empresa.com.br", { googleId: null, admin: false }), false)
  // Já ligada a outro Google: não troca.
  assert.equal(podeLigarGoogleSozinho("pessoa@gmail.com", { googleId: "g-1", admin: false }), false)
})

test("Google nunca se liga sozinho à conta de admin", () => {
  // Quem criasse o Gmail do admin ganharia o painel inteiro (06/10/2026).
  assert.equal(podeLigarGoogleSozinho("admin.tino@gmail.com", { googleId: null, admin: true }), false)
})

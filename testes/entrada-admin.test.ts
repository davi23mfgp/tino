import assert from "node:assert/strict"
import { test } from "node:test"

import { entradaPermitida } from "../src/lib/acesso"

test("admin entra só pela porta dele, e conta comum só pela comum", () => {
  assert.equal(entradaPermitida("admin", true), true)
  assert.equal(entradaPermitida("comum", false), true)
  // Admin no login comum: recusado como senha errada (06/10/2026).
  assert.equal(entradaPermitida("comum", true), false)
  // Conta comum na entrada do admin: recusada também.
  assert.equal(entradaPermitida("admin", false), false)
})

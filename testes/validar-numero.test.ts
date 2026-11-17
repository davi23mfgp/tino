import { test } from "node:test"
import assert from "node:assert/strict"
import type { ZodType } from "zod"

// Os campos ficam num arquivo sem servidor, por isso o teste carrega direto.
const carregar = () => import("../src/lib/campos")
const ok = (esquema: ZodType, valor: unknown) => esquema.safeParse(valor)

test("valor vazio não vira zero", async () => {
  const { campo } = await carregar()
  for (const vazio of [null, "", "  ", true, false]) assert.equal(ok(campo.centavos(), vazio).success, false, JSON.stringify(vazio))
  assert.equal(ok(campo.bps(), null).success, false)
  assert.equal(ok(campo.dia(), "").success, false)
})

test("número e texto numérico continuam valendo", async () => {
  const { campo } = await carregar()
  assert.equal(ok(campo.centavos(), 1250).data, 1250)
  assert.equal(ok(campo.centavos(), "1250").data, 1250)
  assert.equal(ok(campo.bps(), " 250 ").data, 250)
  assert.equal(ok(campo.centavos(), 0).data, 0)
  assert.equal(ok(campo.centavos(), "12,50").success, false)
  assert.equal(ok(campo.centavos(), 12.5).success, false)
})

test("opcional vazio fica ausente, e nulo continua nulo onde é aceito", async () => {
  const { campo } = await carregar()
  assert.equal(ok(campo.centavos().optional(), "").data, undefined)
  assert.equal(ok(campo.centavos().optional(), undefined).data, undefined)
  assert.equal(ok(campo.centavos().nullish(), null).data, null)
})

test("data vazia não vira 1970", async () => {
  const { campo } = await carregar()
  assert.equal(ok(campo.data(), null).success, false)
  assert.equal(ok(campo.data(), "").success, false)
  assert.equal(ok(campo.data(), "não é data").success, false)
  assert.equal((ok(campo.data(), "2026-11-10").data as Date).toISOString().slice(0, 10), "2026-11-10")
  assert.equal(ok(campo.data().nullish(), null).data, null)
})

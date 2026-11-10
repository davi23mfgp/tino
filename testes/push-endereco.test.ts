import { test } from "node:test"
import assert from "node:assert/strict"

import { enderecoDePushValido } from "../src/lib/push-endereco"

test("aceita os serviços de notificação dos navegadores", () => {
  for (const url of [
    "https://fcm.googleapis.com/fcm/send/abc:123",
    "https://updates.push.services.mozilla.com/wpush/v2/gAAA",
    "https://web.push.apple.com/QK3f",
    "https://wns2-bl2p.notify.windows.com/w/?token=x",
  ]) assert.ok(enderecoDePushValido(url), url)
})

test("recusa endereço que faria o servidor chamar outro lugar", () => {
  for (const url of [
    "http://fcm.googleapis.com/fcm/send/abc",
    "https://169.254.169.254/latest/meta-data",
    "https://localhost:3100/api/admin",
    "https://fcm.googleapis.com.atacante.com/x",
    "https://atacante.com/fcm.googleapis.com",
    "https://usuario:senha@fcm.googleapis.com/x",
    "https://fcm.googleapis.com:8443/x",
    "não é url",
    42,
  ]) assert.equal(enderecoDePushValido(url), null, String(url))
})

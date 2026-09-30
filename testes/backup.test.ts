import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"

// A execução real com pg_dump/pg_restore é feita pelo job de backup. Aqui
// exercita envelope, integridade, credenciais e falha sem copiar dados reais.
const carregar = () => import("../scripts/copia-segura.mjs")

test("backup cifra o fluxo, autentica o arquivo e recusa chave errada/adulteração", async () => {
  const { criarCopia, verificarCopia } = await carregar()
  const diretorio = await mkdtemp(join(tmpdir(), "tino-backup-"))
  try {
    const programa = join(diretorio, "dump-falso")
    await writeFile(programa, '#!/bin/sh\nprintf "registro privado de teste"\n', { mode: 0o700 })
    const destino = join(diretorio, "copia.enc"), chave = randomBytes(32)
    await criarCopia({ destino, chave, ambiente: process.env, programa })
    const bytes = await readFile(destino)
    assert.ok(!bytes.includes(Buffer.from("registro privado")))
    await verificarCopia(destino, chave)
    await assert.rejects(verificarCopia(destino, randomBytes(32)))
    bytes[bytes.length - 18] ^= 1
    await writeFile(destino, bytes)
    await assert.rejects(verificarCopia(destino, chave))
  } finally { await rm(diretorio, { recursive: true, force: true }) }
})

test("credenciais Postgres não entram nos argumentos e banco remoto exige TLS", async () => {
  const { ambientePostgres, lerChaveBackup } = await carregar()
  const ambiente = ambientePostgres("postgresql://leitura:senha%40segura@localhost:5549/tino")
  assert.equal(ambiente.PGPASSWORD, "senha@segura")
  assert.equal(ambiente.PGDATABASE, "tino")
  assert.throws(() => ambientePostgres("postgresql://u:p@banco.example/db?sslmode=disable"))
  assert.equal(ambientePostgres("postgresql://u:p@banco.example/db").PGSSLMODE, "verify-full")
  assert.throws(() => lerChaveBackup("curta"))
  assert.equal(lerChaveBackup("a".repeat(64)).length, 32)
})

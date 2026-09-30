import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"
import { createReadStream, createWriteStream } from "node:fs"
import { open, stat, unlink, appendFile } from "node:fs/promises"
import { spawn } from "node:child_process"
import { pipeline } from "node:stream/promises"

const MARCA = Buffer.from("TINO-BACKUP-v1\n")

export function lerChaveBackup(texto) {
  if (!/^[a-fA-F0-9]{64}$/.test(texto ?? "")) throw new Error("Configure BACKUP_CHAVE_CRIPTOGRAFIA com 32 bytes em hexadecimal.")
  return Buffer.from(texto, "hex")
}

/** Credenciais vão no ambiente do cliente Postgres, nunca nos argumentos/logs. */
export function ambientePostgres(endereco) {
  const url = new URL(endereco)
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Endereço do banco inválido.")
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  const ssl = url.searchParams.get("sslmode") ?? (local ? "disable" : "verify-full")
  if (!local && !["require", "verify-full", "verify-ca"].includes(ssl)) throw new Error("Banco remoto exige TLS.")
  return { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGSSLMODE: ssl, PGCONNECT_TIMEOUT: "15" }
}

function executar(programa, argumentos, ambiente, entrada = "ignore") {
  const processo = spawn(programa, argumentos, { env: ambiente, stdio: [entrada, "pipe", "ignore"] })
  const terminou = new Promise((resolve, reject) => {
    processo.once("error", () => reject(new Error(`Não foi possível executar ${programa}.`)))
    processo.once("close", (codigo) => codigo === 0 ? resolve() : reject(new Error(`${programa} falhou; verifique acesso, versão do cliente e integridade do arquivo.`)))
  })
  // O consumidor pode estar abrindo o arquivo antes de aguardar a promessa.
  terminou.catch(() => {})
  return { processo, terminou }
}

export async function criarCopia({ destino, chave, ambiente, programa = "pg_dump", argumentos = ["--format=custom", "--no-owner", "--no-privileges"] }) {
  const nonce = randomBytes(12)
  const arquivo = await open(destino, "wx", 0o600)
  await arquivo.write(Buffer.concat([MARCA, nonce]))
  await arquivo.close()
  const cifra = createCipheriv("aes-256-gcm", chave, nonce)
  cifra.setAAD(MARCA)
  const { processo, terminou } = executar(programa, argumentos, ambiente)
  try {
    await Promise.all([terminou, pipeline(processo.stdout, cifra, createWriteStream(destino, { flags: "a", mode: 0o600 }))])
    await appendFile(destino, cifra.getAuthTag())
  } catch (falha) {
    processo.kill("SIGTERM")
    await unlink(destino).catch(() => {})
    throw falha
  }
}

async function abrirCopia(origem, chave) {
  const tamanho = (await stat(origem)).size
  if (tamanho <= MARCA.length + 12 + 16) throw new Error("Backup incompleto.")
  const arquivo = await open(origem, "r")
  const cabecalho = Buffer.alloc(MARCA.length + 12), tag = Buffer.alloc(16)
  try { await arquivo.read(cabecalho, 0, cabecalho.length, 0); await arquivo.read(tag, 0, 16, tamanho - 16) }
  finally { await arquivo.close() }
  if (!cabecalho.subarray(0, MARCA.length).equals(MARCA)) throw new Error("Formato de backup inválido.")
  const cifra = createDecipheriv("aes-256-gcm", chave, cabecalho.subarray(MARCA.length))
  cifra.setAAD(MARCA); cifra.setAuthTag(tag)
  return { entrada: createReadStream(origem, { start: cabecalho.length, end: tamanho - 17 }), cifra }
}

export async function verificarCopia(origem, chave) {
  const { entrada, cifra } = await abrirCopia(origem, chave)
  // Valida a tag sem gravar texto aberto. A restauração só começa depois
  // disso: pg_restore não pode confirmar dados de um arquivo adulterado.
  await pipeline(entrada, cifra, async (fluxo) => { for await (const _trecho of fluxo) { /* descarta */ } })
}

export async function restaurarCopia({ origem, chave, ambiente, programa = "pg_restore" }) {
  await verificarCopia(origem, chave)
  const { entrada, cifra } = await abrirCopia(origem, chave)
  const { processo, terminou } = executar(programa, ["--dbname", ambiente.PGDATABASE, "--exit-on-error", "--single-transaction", "--no-owner", "--no-privileges"], ambiente, "pipe")
  processo.stdout.resume()
  try { await Promise.all([terminou, pipeline(entrada, cifra, processo.stdin)]) }
  catch (falha) { processo.kill("SIGTERM"); throw falha }
}

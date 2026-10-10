import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, it } from "node:test"

import { crc32, montarZip, nomeSeguro } from "@/lib/zip"
import { escaparHtml } from "@/lib/loja/relatorio-arquivos"

const texto = (valor: string) => new TextEncoder().encode(valor)

describe("zip do pacote do contador", () => {
  it("o CRC32 bate com o valor conhecido de '123456789'", () => {
    assert.equal(crc32(texto("123456789")), 0xcbf43926)
  })
  it("o nome do arquivo não sai da pasta do pacote", () => {
    assert.equal(nomeSeguro("../../etc/passwd"), "etc/passwd")
    assert.equal(nomeSeguro("/abs/x.pdf"), "abs/x.pdf")
    assert.equal(nomeSeguro("notas\\\\venda-1.pdf"), "notas/venda-1.pdf")
  })
  it("o Python abre o zip e confere o conteúdo, inclusive nome com acento", () => {
    const pasta = mkdtempSync(join(tmpdir(), "zip-"))
    try {
      const caminho = join(pasta, "pacote.zip")
      writeFileSync(caminho, montarZip([{ nome: "relatório.html", conteudo: texto("<p>oi</p>") }, { nome: "notas/venda-1-João.pdf", conteudo: new Uint8Array([37, 80, 68, 70, 0, 255]) }]))
      let saida: string
      try {
        saida = execFileSync("python3", ["-I", "-c", "import sys,zipfile;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print('|'.join(f'{i.filename}:{len(z.read(i))}' for i in z.infolist()))", caminho], { encoding: "utf8" }).trim()
      } catch (excecao) {
        if ((excecao as NodeJS.ErrnoException).code === "ENOENT") return
        throw excecao
      }
      assert.equal(saida, "relatório.html:9|notas/venda-1-João.pdf:6")
    } finally { rmSync(pasta, { recursive: true, force: true }) }
  })
  it("escapa HTML: nome de cliente com tag não vira código na folha do contador", () => {
    assert.equal(escaparHtml(`<img src=x onerror="alert(1)">&'`), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;")
  })
})

import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import ts from "typescript"

import { semTravessao } from "@/lib/tino/chat"

// Davi, 29/09/2026: "não quero nenhum texto com travessão". Vale para o que
// aparece na tela, no Telegram e nas respostas do assistente. Comentário de
// código fica de fora: ninguém lê isso no app.

describe("texto sem travessão", () => {
  it("nenhuma string, template ou texto de JSX em src/ tem travessão", () => {
    // Aspas simples não são glob no cmd.exe; a lista ficava vazia no Windows
    // e o teste tentava ler o caminho "" em vez de conferir os textos.
    const arquivos = execFileSync("git", ["ls-files", "src"], { encoding: "utf8" })
      .split(/\r?\n/)
      .filter((arquivo) => /^src\/.*\.tsx?$/.test(arquivo))
    const achados: string[] = []
    for (const arquivo of arquivos) {
      const fonte = readFileSync(arquivo, "utf8")
      if (!fonte.includes("—")) continue
      const raiz = ts.createSourceFile(arquivo, fonte, ts.ScriptTarget.Latest, true, arquivo.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
      const visitar = (no: ts.Node) => {
        const texto =
          ts.isStringLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no) || ts.isTemplateLiteralToken(no) || ts.isJsxText(no) ? no.getText(raiz) : ""
        // console.* é log de servidor, não texto de tela.
        const deLog = no.parent !== undefined && ts.isCallExpression(no.parent) && /^console\./.test(no.parent.expression.getText(raiz))
        if (texto.includes("—") && !deLog) achados.push(`${arquivo}:${raiz.getLineAndCharacterOfPosition(no.getStart(raiz)).line + 1}`)
        ts.forEachChild(no, visitar)
      }
      visitar(raiz)
    }
    assert.deepEqual(achados, [])
  })

  it("resposta do modelo perde o travessão sem perder a frase", () => {
    assert.equal(semTravessao("Sua sobra é R$ 10 — boa."), "Sua sobra é R$ 10, boa.")
    assert.equal(semTravessao("Veja — isto — agora"), "Veja, isto, agora")
    assert.equal(semTravessao("— item um\n— item dois"), "• item um\n• item dois")
    assert.equal(semTravessao("fim —."), "fim.")
    assert.equal(semTravessao("Nada a trocar."), "Nada a trocar.")
  })
})

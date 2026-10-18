import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { agruparPorAssunto, resumoDoGrupo, assuntoDoAviso, ASSUNTO_OUTROS, type AvisoAgrupavel } from "@/lib/tino/assunto-do-aviso"

const aviso = (id: string, tipo: string, severidade: AvisoAgrupavel["severidade"], lido = false): AvisoAgrupavel => ({ id, tipo, titulo: `t-${id}`, severidade, lido })

describe("assunto do aviso", () => {
  it("junta os tipos parecidos no mesmo assunto", () => {
    assert.equal(assuntoDoAviso("orcamento_estourado"), "Orçamento")
    assert.equal(assuntoDoAviso("orcamento_perto"), "Orçamento")
    assert.equal(assuntoDoAviso("mei_das_atrasado"), "MEI e DAS")
    assert.equal(assuntoDoAviso("mei_estouro_grave"), "MEI e DAS")
    assert.equal(assuntoDoAviso("caixa_negativo"), "Fluxo de caixa")
  })
  it("tipo novo ou ausente cai em Outros avisos, não some", () => {
    assert.equal(assuntoDoAviso("tipo_que_ninguem_listou"), ASSUNTO_OUTROS)
    assert.equal(assuntoDoAviso(undefined), ASSUNTO_OUTROS)
  })
})

describe("agrupar por assunto", () => {
  it("quatro categorias estouradas viram um grupo de quatro", () => {
    const grupos = agruparPorAssunto([1, 2, 3, 4].map((n) => aviso(String(n), "orcamento_estourado", "ATENCAO")))
    assert.equal(grupos.length, 1)
    assert.equal(grupos[0].avisos.length, 4)
  })
  it("o grupo com o aviso mais grave vem primeiro, mesmo sendo menor", () => {
    const grupos = agruparPorAssunto([
      ...[1, 2, 3, 4].map((n) => aviso(`o${n}`, "orcamento_estourado", "ATENCAO")),
      aviso("d", "mei_das_atrasado", "CRITICO"),
      aviso("m", "meta_atrasada", "INFO"),
    ])
    assert.deepEqual(grupos.map((g) => g.assunto), ["MEI e DAS", "Orçamento", "Reserva e metas"])
    assert.equal(grupos[0].severidade, "CRITICO")
  })
  it("a severidade do grupo é a pior e a contagem de não lidos ignora os lidos", () => {
    const [grupo] = agruparPorAssunto([aviso("a", "reserva_baixa", "ATENCAO", true), aviso("b", "meta_atrasada", "INFO")])
    assert.equal(grupo.severidade, "ATENCAO")
    assert.equal(grupo.naoLidos, 1)
    assert.equal(grupo.avisos[0].id, "a")
  })
  it("nenhum aviso se perde no agrupamento", () => {
    const entrada = ["caixa_negativo", "xyz", "divida_alta", "mei_atencao", "orcamento_perto"].map((tipo, i) => aviso(String(i), tipo, "INFO"))
    const total = agruparPorAssunto(entrada).reduce((soma, g) => soma + g.avisos.length, 0)
    assert.equal(total, entrada.length)
  })
})

describe("resumo do grupo", () => {
  it("um aviso mostra o título; vários mostram o mais grave e quantos vêm junto", () => {
    const [um] = agruparPorAssunto([aviso("a", "caixa_negativo", "CRITICO")])
    assert.equal(resumoDoGrupo(um), "t-a")
    const [varios] = agruparPorAssunto([aviso("a", "orcamento_estourado", "INFO"), aviso("b", "orcamento_estourado", "ATENCAO"), aviso("c", "orcamento_perto", "INFO")])
    assert.equal(resumoDoGrupo(varios), "t-b e mais 2")
  })
})

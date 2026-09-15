import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { dentroDaJanela, escolherAvisos, type Situacao } from "@/lib/tino/avisar"

const MEIO_DIA = new Date(2026, 8, 14, 12, 0, 0)

function situacao(mudancas: Partial<Situacao> = {}): Situacao {
  return {
    canal: "WHATSAPP",
    limiteDiario: 3,
    horaInicio: 9,
    horaFim: 21,
    severidadeMinima: "ATENCAO",
    jaMandados: 0,
    pendentes: [
      { id: "a1", tipo: "vencimento_proximo", titulo: "Fatura vence amanhã", texto: "R$ 1.200 no Nubank.", severidade: "CRITICO" },
      { id: "a2", tipo: "orcamento_estourado", titulo: "Mercado passou de 80%", texto: "Faltam 12 dias no mês.", severidade: "ATENCAO" },
    ],
    agora: MEIO_DIA,
    ...mudancas,
  }
}

describe("janela de horário", () => {
  it("dia normal: fala dentro, cala fora", () => {
    assert.equal(dentroDaJanela(12, 9, 21), true)
    assert.equal(dentroDaJanela(8, 9, 21), false)
    assert.equal(dentroDaJanela(21, 9, 21), false, "o fim é exclusivo")
  })

  it("janela que cruza a meia-noite é intervalo de fora", () => {
    assert.equal(dentroDaJanela(23, 22, 7), true)
    assert.equal(dentroDaJanela(3, 22, 7), true)
    assert.equal(dentroDaJanela(12, 22, 7), false)
  })
})

describe("quem fala e quem espera", () => {
  it("silêncio é o padrão: sem canal, nada sai", () => {
    const escolha = escolherAvisos(situacao({ canal: "NENHUM" }))
    assert.deepEqual(escolha.avisos, [])
    assert.match(escolha.motivo ?? "", /não pediu/)
  })

  it("de madrugada o aviso espera", () => {
    const escolha = escolherAvisos(situacao({ agora: new Date(2026, 8, 14, 3, 0, 0) }))
    assert.equal(escolha.avisos.length, 0)
    assert.match(escolha.motivo ?? "", /janela de horário/)
  })

  it("respeita o teto do dia, e conta o que já saiu", () => {
    assert.equal(escolherAvisos(situacao({ limiteDiario: 1 })).avisos.length, 1)
    assert.equal(escolherAvisos(situacao({ limiteDiario: 3, jaMandados: 2 })).avisos.length, 1)
    assert.equal(escolherAvisos(situacao({ limiteDiario: 3, jaMandados: 3 })).avisos.length, 0)
  })

  it("teto alcançado diz por quê, em vez de sumir calado", () => {
    assert.match(escolherAvisos(situacao({ jaMandados: 9 })).motivo ?? "", /Teto/)
  })

  it("severidade mínima filtra o que não vale interromper", () => {
    const so_critico = escolherAvisos(situacao({ severidadeMinima: "CRITICO" }))
    assert.deepEqual(
      so_critico.avisos.map((aviso) => aviso.alertaId),
      ["a1"],
    )
  })

  it("nada acima do corte não é erro — é silêncio com motivo", () => {
    const escolha = escolherAvisos(
      situacao({
        severidadeMinima: "CRITICO",
        pendentes: [{ id: "a3", tipo: "sem_categoria", titulo: "Sem categoria", texto: "5 lançamentos.", severidade: "INFO" }],
      }),
    )
    assert.equal(escolha.avisos.length, 0)
    assert.match(escolha.motivo ?? "", /justifique interromper/)
  })

  it("com folga, manda o que cabe, o mais grave primeiro", () => {
    const escolha = escolherAvisos(situacao())
    assert.deepEqual(
      escolha.avisos.map((aviso) => aviso.alertaId),
      ["a1", "a2"],
    )
    assert.equal(escolha.motivo, undefined)
  })

  it("um assunto, uma mensagem: dois alertas do mesmo tipo viram um", () => {
    // O motor gera um alerta por período; como lista fazem sentido lado a
    // lado, como mensagem seriam duas interrupções dizendo quase o mesmo.
    const escolha = escolherAvisos(
      situacao({
        pendentes: [
          { id: "f1", tipo: "caixa_negativo", titulo: "Falta dinheiro pela frente", texto: "…em fevereiro.", severidade: "CRITICO" },
          { id: "f2", tipo: "caixa_negativo", titulo: "Falta dinheiro pela frente", texto: "…em março.", severidade: "CRITICO" },
          { id: "f3", tipo: "juros_abusivo", titulo: "Dívida cara parada", texto: "12% ao mês.", severidade: "ATENCAO" },
        ],
      }),
    )
    assert.deepEqual(
      escolha.avisos.map((aviso) => aviso.alertaId),
      ["f1", "f3"],
    )
  })

  it("nada pendente não vira mensagem vazia", () => {
    assert.equal(escolherAvisos(situacao({ pendentes: [] })).avisos.length, 0)
  })
})

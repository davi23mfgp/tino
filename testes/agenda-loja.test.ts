import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { contarPorDia, itensDoDia, lembretes, lerChecklist, prazoDaOrdem, semanaDe, type OrdemDia } from "@/lib/loja/agenda"
import { rotaPermitida } from "@/lib/acesso"

const SP = "America/Sao_Paulo"
// Segunda, 05/10/2026, 14h em São Paulo.
const AGORA = new Date("2026-10-05T17:00:00Z")

const ordem = (parte: Partial<OrdemDia> = {}): OrdemDia => ({
  id: "os8", numero: 8, cliente: "Juliana Prado", objeto: "Moto G", servico: "troca de bateria", etapa: "FAZENDO",
  prazoEm: new Date("2026-10-05T21:00:00Z"), valorCentavos: 18_000, ...parte,
})

describe("semana e prazo", () => {
  it("a semana vai de segunda a domingo, mesmo começando no domingo", () => {
    assert.deepEqual(semanaDe("2026-10-11").map((d) => `${d.nome} ${d.numero}`), ["seg 05", "ter 06", "qua 07", "qui 08", "sex 09", "sáb 10", "dom 11"])
  })

  it("prazo pelo dia no fuso: 18h de hoje em São Paulo já é amanhã em UTC, e continua 'hoje'", () => {
    assert.deepEqual(prazoDaOrdem(new Date("2026-10-05T21:00:00Z"), "FAZENDO", AGORA, SP), { texto: "prazo hoje", tom: "atencao" })
    assert.deepEqual(prazoDaOrdem(new Date("2026-10-03T21:00:00Z"), "FAZENDO", AGORA, SP), { texto: "atrasou 2 dias", tom: "atencao" })
    assert.equal(prazoDaOrdem(new Date("2026-10-07T21:00:00Z"), "ESPERANDO_PECA", AGORA, SP).texto, "prazo qua 07/10")
    assert.equal(prazoDaOrdem(new Date("2026-10-05T20:00:00Z"), "PRONTO", AGORA, SP).texto, "entregar hoje, 17h")
  })
})

describe("o dia em linha do tempo", () => {
  const fontes = {
    compromissos: [
      { id: "c1", titulo: "Buscar a tela", detalhe: null, inicioEm: new Date("2026-10-05T12:00:00Z"), diaInteiro: false, feitoEm: null, cliente: null, ordemNumero: 7 },
      { id: "c2", titulo: "Pagar DAS", detalhe: null, inicioEm: new Date("2026-10-05T00:00:00Z"), diaInteiro: true, feitoEm: null, cliente: null, ordemNumero: null },
    ],
    ordens: [ordem(), ordem({ id: "os6", numero: 6, etapa: "ENTREGUE" })],
    passos: [{ clienteId: "m", cliente: "Marcos Lima", proximoPasso: "Ligar", proximoPassoEm: new Date("2026-10-05T18:00:00Z") }],
  }

  it("dia inteiro primeiro, depois pela hora; OS entregue não ocupa a agenda", () => {
    const itens = itensDoDia("2026-10-05", fontes, AGORA, SP)
    assert.deepEqual(itens.map((i) => [i.hora, i.titulo]), [
      [null, "Pagar DAS"],
      ["09:00", "Buscar a tela"],
      ["15:00", "Marcos Lima"],
      ["18:00", "OS 0008 · Juliana Prado"],
    ])
    assert.equal(itens[1]!.sub, "para a OS 0007")
  })

  it("compromisso de dia inteiro não muda de dia por causa do fuso", () => {
    // Meia-noite UTC do dia 05 é 21h do dia 04 em São Paulo: pelo fuso, o DAS
    // cairia no domingo. Os 4 itens no dia 05 provam que não cai.
    assert.equal(contarPorDia(semanaDe("2026-10-05"), fontes, AGORA, SP)["2026-10-05"], 4)
  })
})

describe("lembretes do sino", () => {
  it("a chave leva o dia: o mesmo lembrete não nasce duas vezes no dia", () => {
    const avisos = lembretes({ ordens: [ordem()], orcamentos: [] }, AGORA, SP)
    assert.equal(avisos.length, 1)
    assert.equal(avisos[0]!.chave, "os-vence:os8:2026-10-05")
    assert.equal(avisos[0]!.titulo, "OS 0008 vence hoje")
  })

  it("OS pronta não vira lembrete de prazo; orçamento que vence amanhã vira", () => {
    const avisos = lembretes({
      ordens: [ordem({ etapa: "PRONTO" })],
      orcamentos: [{ id: "o2", numero: 2, cliente: "Juliana", clienteId: "j", status: "ENVIADO", validoAte: new Date("2026-10-06T00:00:00Z"), aberturas: 0 }],
    }, AGORA, SP)
    assert.deepEqual(avisos.map((a) => a.titulo), ["Orçamento 0002 de Juliana vence amanhã"])
  })
})

describe("checklist e acesso", () => {
  it("o que não tiver a forma certa fica de fora", () => {
    assert.deepEqual(lerChecklist([{ texto: "Trocar a tela", feito: true }, { feito: true }, "x"]), [{ texto: "Trocar a tela", feito: true }])
  })
  it("funcionário não abre agenda nem OS, mas abre o link do serviço", () => {
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/loja/agenda"), false)
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/api/loja/ordens/x"), false)
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/s/abc"), true)
  })
})

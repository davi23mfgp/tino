import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { idadeDoFiado, montarDevedores, nomeDeTratamento, resumirFiado, textoDeCobranca } from "@/lib/loja/fiado"
import { formatarMoeda } from "@/lib/dinheiro"

const HOJE = new Date("2026-09-01T12:00:00.000Z")
const dias = (quantos: number) => new Date(HOJE.getTime() - quantos * 86_400_000)

const cliente = (
  nome: string,
  vendas: { numero: number; valor: number; diasAtras: number; recebido?: boolean; forma?: string }[],
) => ({
  id: nome.toLowerCase(),
  nome,
  telefone: null,
  vendas: vendas.map((venda) => ({
    id: `v${venda.numero}`,
    numero: venda.numero,
    criadoEm: dias(venda.diasAtras),
    pagamentos: [
      {
        forma: venda.forma ?? "FIADO",
        valorCentavos: venda.valor,
        recebidoEm: venda.recebido ? dias(0) : null,
      },
    ],
  })),
})

describe("quem deve", () => {
  it("o mesmo cliente cadastrado duas vezes vira uma pessoa só, com a dívida inteira", () => {
    // Até 28/09/2026 cada venda fiado criava um cadastro novo: a Dona Cida de
    // duas compras aparecia duas vezes, cada uma com metade.
    const repetida = { ...cliente("Dona Cida", [{ numero: 2, valor: 2200, diasAtras: 20 }]), id: "cida-2" }
    const devedores = montarDevedores([cliente("Dona Cida", [{ numero: 1, valor: 3850, diasAtras: 75 }]), repetida, cliente("dona  cida ", [{ numero: 3, valor: 100, diasAtras: 1 }])], HOJE)

    assert.equal(devedores.length, 1)
    assert.equal(devedores[0].devendoCentavos, 3850 + 2200 + 100)
    assert.equal(devedores[0].vendas.length, 3)
    assert.equal(devedores[0].diasDaMaisAntiga, 75)
  })

  it("soma as compras em aberto do cliente", () => {
    const devedores = montarDevedores(
      [cliente("Ana", [{ numero: 1, valor: 5000, diasAtras: 10 }, { numero: 2, valor: 3000, diasAtras: 5 }])],
      HOJE,
    )

    assert.equal(devedores[0].devendoCentavos, 8000)
    assert.equal(devedores[0].vendas.length, 2)
  })

  it("compra já paga sai da conta", () => {
    const devedores = montarDevedores(
      [cliente("Bia", [{ numero: 1, valor: 5000, diasAtras: 10, recebido: true }, { numero: 2, valor: 3000, diasAtras: 5 }])],
      HOJE,
    )

    assert.equal(devedores[0].devendoCentavos, 3000)
  })

  it("quem pagou tudo não aparece na lista", () => {
    const devedores = montarDevedores([cliente("Caio", [{ numero: 1, valor: 5000, diasAtras: 10, recebido: true }])], HOJE)
    assert.equal(devedores.length, 0)
  })

  it("venda paga no cartão não é fiado", () => {
    const devedores = montarDevedores(
      [cliente("Dan", [{ numero: 1, valor: 9000, diasAtras: 3, forma: "CREDITO_VISTA" }])],
      HOJE,
    )

    assert.equal(devedores.length, 0)
  })

  it("conta os dias pela compra mais antiga ainda em aberto", () => {
    const devedores = montarDevedores(
      [cliente("Eva", [{ numero: 1, valor: 5000, diasAtras: 45 }, { numero: 2, valor: 1000, diasAtras: 2 }])],
      HOJE,
    )

    assert.equal(devedores[0].diasDaMaisAntiga, 45)
  })

  it("o mais antigo vem primeiro, não o maior valor", () => {
    // Quem deve pouco há muito tempo costuma ser quem não vai pagar, e é essa
    // cobrança que precisa sair antes.
    const devedores = montarDevedores(
      [
        cliente("Rico", [{ numero: 1, valor: 90000, diasAtras: 3 }]),
        cliente("Antigo", [{ numero: 2, valor: 2000, diasAtras: 120 }]),
      ],
      HOJE,
    )

    assert.equal(devedores[0].nome, "Antigo")
  })
})

describe("resumo do fiado", () => {
  const devedores = montarDevedores(
    [
      cliente("Ana", [{ numero: 1, valor: 5000, diasAtras: 10 }]),
      cliente("Bia", [{ numero: 2, valor: 8000, diasAtras: 60 }]),
    ],
    HOJE,
  )

  it("soma o total e conta os clientes", () => {
    const resumo = resumirFiado(devedores)
    assert.equal(resumo.totalCentavos, 13000)
    assert.equal(resumo.clientes, 2)
  })

  it("separa o que passou de trinta dias", () => {
    const resumo = resumirFiado(devedores)
    assert.equal(resumo.atrasadoCentavos, 8000)
  })

  it("sem ninguém devendo, tudo é zero", () => {
    const resumo = resumirFiado([])
    assert.equal(resumo.totalCentavos, 0)
    assert.equal(resumo.clientes, 0)
    assert.equal(resumo.atrasadoCentavos, 0)
  })
})

describe("texto de cobrança", () => {
  it("trata uma compra no singular e várias no plural", () => {
    const [uma] = montarDevedores([cliente("Ana Paula", [{ numero: 1, valor: 5000, diasAtras: 10 }])], HOJE)
    const [varias] = montarDevedores(
      [cliente("João Silva", [{ numero: 1, valor: 5000, diasAtras: 10 }, { numero: 2, valor: 2000, diasAtras: 4 }])],
      HOJE,
    )

    assert.match(textoDeCobranca(uma, "Box 24", formatarMoeda), /da sua compra/)
    assert.match(textoDeCobranca(varias, "Box 24", formatarMoeda), /de 2 compras/)
  })

  it("chama a pessoa pelo primeiro nome", () => {
    const [devedor] = montarDevedores([cliente("Ana Paula", [{ numero: 1, valor: 5000, diasAtras: 10 }])], HOJE)
    assert.match(textoDeCobranca(devedor, "Box 24", formatarMoeda), /^Oi, Ana!/)
  })
})

describe("idade do fiado", () => {
  it("cada compra cai na faixa da própria idade, e a soma fecha com o total", () => {
    const devedores = montarDevedores(
      [
        cliente("Dona Cida", [{ numero: 1, valor: 3850, diasAtras: 75 }, { numero: 2, valor: 2200, diasAtras: 20 }]),
        cliente("Seu Jorge", [{ numero: 3, valor: 6400, diasAtras: 42 }]),
        cliente("Bruno", [{ numero: 4, valor: 1200, diasAtras: 30 }, { numero: 5, valor: 999, diasAtras: 91 }]),
      ],
      HOJE,
    )
    const faixas = idadeDoFiado(devedores, HOJE)

    assert.deepEqual(faixas.map((faixa) => faixa.totalCentavos), [2200 + 1200, 6400, 3850, 999])
    assert.deepEqual(faixas[0].clientes.sort(), ["Bruno", "Dona Cida"])
    assert.equal(faixas.reduce((soma, faixa) => soma + faixa.totalCentavos, 0), resumirFiado(devedores).totalCentavos)
  })
})

describe("como chamar o cliente", () => {
  it("tratamento não é nome: Dona Cida, Seu Jorge; o resto, o primeiro nome", () => {
    assert.equal(nomeDeTratamento("Dona Cida"), "Dona Cida")
    assert.equal(nomeDeTratamento("seu Jorge da banca"), "seu Jorge")
    assert.equal(nomeDeTratamento("Sr. Antônio"), "Sr. Antônio")
    assert.equal(nomeDeTratamento("Paula Menezes"), "Paula")
    assert.equal(nomeDeTratamento("Dona"), "Dona")
  })

  it("a mensagem usa o tratamento", () => {
    const [devedor] = montarDevedores([cliente("Dona Cida", [{ numero: 1, valor: 3850, diasAtras: 10 }])], HOJE)
    assert.match(textoDeCobranca(devedor, "Minha loja", formatarMoeda), /^Oi, Dona Cida!/)
  })
})

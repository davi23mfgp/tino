import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { produtoDaSessao, rotaPermitida, rotaPermitidaNoMei, sessaoEmModoMei } from "@/lib/acesso"

describe("rota permitida por papel", () => {
  it("titular abre qualquer rota", () => {
    assert.equal(rotaPermitida("TITULAR", "/painel"), true)
    assert.equal(rotaPermitida("TITULAR", "/loja"), true)
    assert.equal(rotaPermitida("TITULAR", "/dividas"), true)
  })

  it("cônjuge e dependente abrem qualquer rota — só o funcionário é restrito", () => {
    assert.equal(rotaPermitida("CONJUGE", "/dividas"), true)
    assert.equal(rotaPermitida("DEPENDENTE", "/cartoes"), true)
  })

  it("funcionário da loja abre /loja e subrotas", () => {
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/loja"), true)
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/loja/estoque"), true)
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/loja/fiado"), true)
  })

  it("funcionário da loja abre a API da loja", () => {
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/api/loja"), true)
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/api/loja/vendas"), true)
  })

  it("funcionário da loja é barrado de tela pessoal", () => {
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/painel"), false)
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/dividas"), false)
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/api/panorama"), false)
  })

  it("funcionário da loja é barrado de API pessoal, mesmo com nome parecido", () => {
    // Guarda contra bug de startsWith sem checar a barra: "/lojas" não é "/loja".
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/lojas-vizinhas"), false)
  })

  it("funcionário da loja pode sempre sair", () => {
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/login"), true)
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/api/auth/logout"), true)
  })

  it("MEI e DAS ficam fora do funcionário — é dado do dono, não do balcão", () => {
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/mei"), false)
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/api/mei"), false)
  })

  it("finanças da loja (DRE/lucro) fica fora mesmo vivendo sob /loja", () => {
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/loja/financas"), false)
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/api/loja/demonstrativo"), false)
    // Continua podendo abrir o resto da loja normalmente.
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/loja/estoque"), true)
  })

  it("gerenciar quem tem acesso também fica fora — funcionário não cria outro funcionário", () => {
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/api/loja/funcionario"), false)
  })
})

// A conta MEI nunca deve cair no app pessoal, mesmo por link guardado.
describe("rotas da conta MEI", () => {
  it("mantém as telas e APIs do negócio acessíveis", () => {
    for (const caminho of ["/loja", "/loja/estoque", "/loja/minha-conta", "/mei", "/api/loja/vendas", "/api/mei", "/api/usuario/dados"]) {
      assert.equal(rotaPermitidaNoMei(caminho), true, caminho)
    }
  })
  it("abre Investimentos, igual ao pessoal, com as APIs que a tela usa", () => {
    for (const caminho of ["/investir", "/api/investir/objetivo", "/api/carteira/retrato", "/api/cdi", "/api/mercado", "/api/contas", "/api/transacoes"]) {
      assert.equal(rotaPermitidaNoMei(caminho), true, caminho)
    }
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/investir"), false)
  })
  it("recusa telas e APIs pessoais", () => {
    for (const caminho of ["/painel", "/cartoes", "/configuracoes", "/api/panorama", "/api/orcamento", "/lojas-vizinhas"]) {
      assert.equal(rotaPermitidaNoMei(caminho), false, caminho)
    }
  })
  it("funcionário não abre a conta do dono", () => {
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/loja/minha-conta"), false)
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/loja/painel"), false)
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/loja/dados"), false)
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/api/loja/cadastro"), false)
  })
})

// Davi, 04/10/2026: entrou pela tela do Tino pessoal e caiu na loja, porque o
// modo saía do lar ter MEI. A mesma conta tem de abrir o produto da tela usada.
describe("produto da sessão", () => {
  const ambos = { temMei: true, onboardingFeito: true }

  it("conta com os dois: o login pessoal abre o pessoal, o do MEI abre a loja", () => {
    assert.equal(sessaoEmModoMei(produtoDaSessao("pessoal", ambos), ambos.temMei), false)
    assert.equal(sessaoEmModoMei(produtoDaSessao("mei", ambos), ambos.temMei), true)
  })

  it("sem perfil MEI nunca entra no modo MEI, mesmo que o token peça", () => {
    assert.equal(sessaoEmModoMei(produtoDaSessao("mei", { temMei: false, onboardingFeito: true }), false), false)
  })

  it("token antigo, sem produto: só a conta que usa apenas a loja abre o MEI", () => {
    assert.equal(produtoDaSessao(undefined, { temMei: true, onboardingFeito: false }), "mei")
    assert.equal(produtoDaSessao(undefined, ambos), "pessoal")
    assert.equal(produtoDaSessao(undefined, { temMei: false, onboardingFeito: false }), "pessoal")
  })

  it("valor estranho no token é tratado como ausente", () => {
    assert.equal(produtoDaSessao("loja", ambos), "pessoal")
  })
})

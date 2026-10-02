import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { rotaPermitida, rotaPermitidaNoMei } from "@/lib/acesso"

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
  it("recusa telas e APIs pessoais", () => {
    for (const caminho of ["/painel", "/cartoes", "/configuracoes", "/api/panorama", "/api/transacoes", "/lojas-vizinhas"]) {
      assert.equal(rotaPermitidaNoMei(caminho), false, caminho)
    }
  })
  it("funcionário não abre a conta do dono", () => {
    assert.equal(rotaPermitida("FUNCIONARIO_LOJA", "/loja/minha-conta"), false)
  })
})

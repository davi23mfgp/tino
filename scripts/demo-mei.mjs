/**
 * Demonstração permanente do Tino MEI. Só cria o lar se o e-mail reservado
 * ainda não existir; um redeploy não apaga vendas feitas durante a visita.
 *
 * Entrar em /login/mei: demo-mei@tino.local / demo12345
 * Nenhuma conta de cliente é consultada ou modificada.
 */
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const banco = new PrismaClient()
const email = "demo-mei@tino.local"
const senha = "demo12345"
const dia = (mesesAtras, numero) => {
  const hoje = new Date()
  return new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - mesesAtras, numero, 15))
}
const competencia = (data) => `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}`

async function criar() {
  const senhaHash = await bcrypt.hash(senha, 12)
  return banco.$transaction(async (tx) => {
    // Dois builds simultâneos precisam ver a mesma decisão de criar ou manter.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${email}))::text`
    if (await tx.usuario.findUnique({ where: { email }, select: { id: true } })) return "existente"

    const lar = await tx.lar.create({ data: { nome: "Café da Vila · demonstração", tipo: "SOLO", onboardingEm: new Date() } })
    const membro = await tx.membro.create({ data: { larId: lar.id, nome: "Ana", papel: "TITULAR" } })
    await tx.usuario.create({ data: { larId: lar.id, membroId: membro.id, nome: "Ana · demonstração MEI", email, senhaHash } })
    // Como a demo pessoal, esta conta pública não recebe assinatura de teste:
    // ela precisa continuar navegável depois dos 14 dias do cadastro comum.
    await tx.meiPerfil.create({ data: { larId: lar.id, atividade: "COMERCIO", razaoSocial: "Café da Vila · dados fictícios" } })
    const loja = await tx.loja.create({ data: { larId: lar.id, nome: "Café da Vila" } })
    await tx.formaRecebimento.createMany({ data: [
      { lojaId: loja.id, forma: "DINHEIRO", taxaBps: 0, prazoDias: 0 },
      { lojaId: loja.id, forma: "PIX", taxaBps: 0, prazoDias: 0 },
      { lojaId: loja.id, forma: "DEBITO", taxaBps: 149, prazoDias: 1 },
      { lojaId: loja.id, forma: "CREDITO_VISTA", taxaBps: 349, prazoDias: 30 },
    ] })

    const produtos = new Map()
    for (const item of [
      { nome: "Café 500 g", preco: 1800, custo: 1100, quantidade: 24, minimo: 8 },
      { nome: "Arroz 5 kg", preco: 2800, custo: 2050, quantidade: 12, minimo: 10 },
      { nome: "Leite 1 L", preco: 600, custo: 390, quantidade: 32, minimo: 10 },
      { nome: "Sabonete", preco: 500, custo: 280, quantidade: 18, minimo: 5 },
    ]) {
      const produto = await tx.produtoLoja.create({ data: {
        lojaId: loja.id, nome: item.nome, precoCentavos: item.preco,
        custoCentavos: item.custo, estoqueMinimo: item.minimo,
      } })
      await tx.movimentoEstoque.create({ data: {
        produtoId: produto.id, tipo: "ENTRADA", quantidade: item.quantidade,
        custoUnitarioCentavos: item.custo, motivo: "Estoque inicial fictício", criadoEm: dia(1, 2),
      } })
      produtos.set(item.nome, { id: produto.id, preco: item.preco })
    }

    const caixaAntigo = await tx.caixa.create({ data: {
      lojaId: loja.id, abertoEm: dia(0, 1), fechadoEm: new Date(dia(0, 1).getTime() + 8 * 3_600_000),
      // R$ 100 de troco + R$ 12 da venda em dinheiro; o Pix não entra na gaveta.
      aberturaCentavos: 10000, fechamentoInformadoCentavos: 11200,
    } })
    const caixaAtual = await tx.caixa.create({ data: {
      lojaId: loja.id, abertoEm: new Date(), aberturaCentavos: 10000,
    } })
    const clientes = new Map()
    for (const nome of ["Dona Cida", "João da oficina", "Marina da rua de cima"]) {
      clientes.set(nome, (await tx.clienteLoja.create({ data: { lojaId: loja.id, nome } })).id)
    }

    const faturamento = new Map()
    let numero = 0
    for (const venda of [
      { meses: 4, dia: 12, produto: "Café 500 g", quantidade: 2, forma: "PIX" },
      { meses: 3, dia: 8, produto: "Arroz 5 kg", quantidade: 2, forma: "DINHEIRO" },
      { meses: 2, dia: 17, produto: "Leite 1 L", quantidade: 4, forma: "DEBITO" },
      { meses: 1, dia: 10, produto: "Sabonete", quantidade: 5, forma: "CREDITO_VISTA" },
      { meses: 0, dia: 1, produto: "Café 500 g", quantidade: 3, forma: "PIX", caixaId: caixaAntigo.id },
      { meses: 0, dia: 1, produto: "Leite 1 L", quantidade: 2, forma: "DINHEIRO", caixaId: caixaAntigo.id },
      { meses: 0, dia: 2, produto: "Arroz 5 kg", quantidade: 1, forma: "FIADO", cliente: "Dona Cida" },
      { meses: 0, dia: 2, produto: "Café 500 g", quantidade: 1, forma: "FIADO", cliente: "João da oficina" },
      { meses: 0, dia: 2, produto: "Sabonete", quantidade: 2, forma: "FIADO", cliente: "Marina da rua de cima" },
      { meses: 0, dia: 2, produto: "Leite 1 L", quantidade: 3, forma: "PIX", caixaId: caixaAtual.id },
    ]) {
      const data = dia(venda.meses, venda.dia)
      const produto = produtos.get(venda.produto)
      const total = produto.preco * venda.quantidade
      const taxaBps = venda.forma === "DEBITO" ? 149 : venda.forma === "CREDITO_VISTA" ? 349 : 0
      const previsao = new Date(data.getTime() + (venda.forma === "CREDITO_VISTA" ? 30 : venda.forma === "DEBITO" ? 1 : 0) * 86_400_000)
      numero += 1
      const criada = await tx.vendaLoja.create({ data: {
        lojaId: loja.id, caixaId: venda.caixaId ?? null, numero,
        clienteId: venda.cliente ? clientes.get(venda.cliente) : null,
        totalCentavos: total, criadoEm: data,
        itens: { create: { produtoId: produto.id, descricao: venda.produto, quantidade: venda.quantidade, precoUnitarioCentavos: produto.preco, totalCentavos: total } },
        pagamentos: { create: {
          forma: venda.forma, valorCentavos: total, taxaBps,
          valorLiquidoCentavos: total - Math.round(total * taxaBps / 10_000),
          previsaoRecebimentoEm: previsao,
          recebidoEm: venda.forma === "FIADO" || venda.forma === "CREDITO_VISTA" ? null : previsao,
        } },
      } })
      await tx.movimentoEstoque.create({ data: {
        produtoId: produto.id, tipo: "SAIDA", quantidade: venda.quantidade,
        vendaId: criada.id, motivo: `Venda ${numero}`, criadoEm: data,
      } })
      const chave = competencia(data)
      faturamento.set(chave, (faturamento.get(chave) ?? 0) + total)
    }
    for (const [chave, receitaComercioCentavos] of faturamento) {
      await tx.meiCompetencia.create({ data: { larId: lar.id, competencia: chave, receitaComercioCentavos } })
    }
    for (const conta of [
      { descricao: "Aluguel do ponto", categoria: "ALUGUEL", valorCentavos: 120000, diaVencimento: 10, mensal: true },
      { descricao: "Energia elétrica", categoria: "ENERGIA", valorCentavos: 18500, diaVencimento: 15, mensal: true },
      { descricao: "Fornecedor de café", categoria: "FORNECEDOR", valorCentavos: 42000, diaVencimento: 20, mensal: false },
    ]) {
      await tx.contaDaLoja.create({ data: {
        lojaId: loja.id, descricao: conta.descricao, categoria: conta.categoria,
        valorCentavos: conta.valorCentavos, vencimento: dia(0, conta.diaVencimento), mensal: conta.mensal,
      } })
    }
    return "criada"
  }, { timeout: 30_000 })
}

try {
  console.log(`Demonstração MEI ${await criar()}.`)
} finally {
  await banco.$disconnect()
}

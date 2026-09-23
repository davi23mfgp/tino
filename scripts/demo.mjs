/**
 * Conta de demonstração.
 *
 * Cria um lar fictício com seis meses de histórico para ver todas as telas
 * funcionando com dados de verdade — gráficos com série temporal, orçamento
 * estourando em algumas categorias, parcelamentos em andamento, dívida cara e
 * projeção furando o zero.
 *
 * Os valores são inventados e coerentes entre si: a soma dos lançamentos bate
 * com os saldos, e as parcelas batem com as faturas. Número de demonstração que
 * não fecha ensina a desconfiar da tela.
 *
 *   node scripts/demo.mjs          cria (ou recria) a conta
 *   node scripts/demo.mjs --limpar remove a conta
 *
 * Entrar: demo@tino.local / demo12345
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const EMAIL = "demo@tino.local"
const SENHA = "demo12345"

const reais = (valor) => Math.round(valor * 100)
const dia = (ano, mes, d) => new Date(Date.UTC(ano, mes - 1, d))
const competenciaDe = (data) => `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}`

/** Competência YYYY-MM somada de N meses. */
function competenciaMais(competencia, meses) {
  const [ano, mes] = competencia.split("-").map(Number)
  const total = ano * 12 + (mes - 1) + meses
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`
}

/**
 * Sorteio determinístico: rodar duas vezes gera exatamente os mesmos dados.
 * Sem isso, cada execução mudaria os números e nada poderia ser conferido.
 */
function sorteio(semente) {
  let estado = semente
  return () => {
    estado = (estado * 1_664_525 + 1_013_904_223) % 4_294_967_296
    return estado / 4_294_967_296
  }
}

const proximo = sorteio(20260824)

/** Varia um valor base em ±percentual, mantendo o resultado plausível. */
const variar = (base, percentual = 0.25) =>
  Math.round(base * (1 - percentual + proximo() * percentual * 2))

async function limpar() {
  const removidos = await prisma.lar.deleteMany({
    where: { usuarios: { some: { email: EMAIL } } },
  })
  return removidos.count
}

async function main() {
  if (process.argv.includes("--limpar")) {
    console.log(`Conta de demonstração removida (${await limpar()}).`)
    return
  }

  await limpar()

  const hoje = new Date()
  const anoAtual = hoje.getUTCFullYear()
  const mesAtual = hoje.getUTCMonth() + 1
  const competenciaAtual = `${anoAtual}-${String(mesAtual).padStart(2, "0")}`

  // ── Lar e usuário ────────────────────────────────────────
  const lar = await prisma.lar.create({
    data: {
      nome: "Casa da Marina",
      tipo: "CASAL",
      diaInicioMes: 1,
      mesesReserva: 6,
      estrategiaDivida: "AVALANCHE",
      onboardingEm: new Date(),
      custoEstimadoCentavos: reais(5200),
    },
  })

  const marina = await prisma.membro.create({
    data: { larId: lar.id, nome: "Marina", papel: "TITULAR", rendaMensalCentavos: reais(5200), cor: "purple" },
  })

  const rafael = await prisma.membro.create({
    data: { larId: lar.id, nome: "Rafael", papel: "CONJUGE", rendaMensalCentavos: reais(3400), cor: "teal" },
  })

  await prisma.usuario.create({
    data: {
      email: EMAIL,
      nome: "Marina",
      senhaHash: await bcrypt.hash(SENHA, 12),
      larId: lar.id,
      membroId: marina.id,
    },
  })

  // ── Categorias ───────────────────────────────────────────
  const { CATEGORIAS_PADRAO } = await import("../src/lib/semear.ts").catch(() => ({ CATEGORIAS_PADRAO: null }))

  // O seed de categorias vive em TypeScript e este script roda em Node puro.
  // Repetir a lista mínima aqui evita depender de compilação só para a demo.
  const modelo = CATEGORIAS_PADRAO ?? [
    { nome: "Aluguel e condomínio", grupo: "MORADIA", essencial: true },
    { nome: "Energia elétrica", grupo: "MORADIA", essencial: true },
    { nome: "Água", grupo: "MORADIA", essencial: true },
    { nome: "Telefone e internet", grupo: "SERVICOS", essencial: true },
    { nome: "Supermercado", grupo: "ALIMENTACAO", essencial: true },
    { nome: "Restaurante", grupo: "ALIMENTACAO" },
    { nome: "Delivery", grupo: "ALIMENTACAO" },
    { nome: "Combustível", grupo: "TRANSPORTE", essencial: true },
    { nome: "Aplicativos de transporte", grupo: "TRANSPORTE" },
    { nome: "Plano de saúde", grupo: "SAUDE", essencial: true },
    { nome: "Farmácia", grupo: "SAUDE", essencial: true },
    { nome: "Academia", grupo: "SAUDE" },
    { nome: "Educação", grupo: "EDUCACAO", essencial: true },
    { nome: "Assinaturas e streaming", grupo: "LAZER" },
    { nome: "Lazer e eventos", grupo: "LAZER" },
    { nome: "Viagem", grupo: "LAZER" },
    { nome: "Vestuário", grupo: "PESSOAL" },
    { nome: "Compras online", grupo: "PESSOAL" },
    { nome: "Pet", grupo: "PESSOAL" },
    { nome: "Tarifas e juros", grupo: "DIVIDAS" },
    { nome: "Empréstimos", grupo: "DIVIDAS" },
    { nome: "Salário", grupo: "RENDA", tipo: "RECEITA" },
    { nome: "Outras receitas", grupo: "RENDA", tipo: "RECEITA" },
    { nome: "Outros", grupo: "OUTROS" },
  ]

  await prisma.categoria.createMany({
    data: modelo.map((linha, ordem) => ({
      larId: lar.id,
      nome: linha.nome,
      grupo: linha.grupo,
      tipo: linha.tipo ?? "DESPESA",
      essencial: linha.essencial ?? false,
      icone: linha.icone ?? "circle",
      cor: linha.cor ?? "blue",
      sistema: true,
      ordem,
    })),
    skipDuplicates: true,
  })

  const categorias = await prisma.categoria.findMany({ where: { larId: lar.id } })
  const cat = (nome) => categorias.find((linha) => linha.nome === nome)?.id ?? null

  // ── Contas ───────────────────────────────────────────────
  const corrente = await prisma.conta.create({
    data: {
      larId: lar.id,
      membroId: marina.id,
      nome: "Conta corrente",
      instituicao: "Banco do Brasil",
      tipo: "CORRENTE",
      // Negativo de propósito: é o que aciona o alerta de cheque especial e
      // faz a tela de análise mostrar a prioridade número um.
      saldoInicialCentavos: reais(-1850),
      cor: "yellow",
    },
  })

  const poupanca = await prisma.conta.create({
    data: {
      larId: lar.id,
      nome: "Poupança",
      instituicao: "Banco do Brasil",
      tipo: "POUPANCA",
      saldoInicialCentavos: reais(4300),
      cor: "green",
    },
  })

  const cartao = await prisma.conta.create({
    data: {
      larId: lar.id,
      membroId: marina.id,
      nome: "Cartão Platinum (final 8842)",
      instituicao: "Banco do Brasil",
      tipo: "CARTAO_CREDITO",
      limiteCentavos: reais(12000),
      diaFechamento: 28,
      diaVencimento: 6,
      cor: "purple",
      bandeira: "VISA",
    },
  })

  const cartaoRafael = await prisma.conta.create({
    data: {
      larId: lar.id,
      membroId: rafael.id,
      nome: "Cartão Gold (final 3317)",
      instituicao: "Nubank",
      tipo: "CARTAO_CREDITO",
      limiteCentavos: reais(4500),
      diaVencimento: 10,
      cor: "purple",
      bandeira: "MASTERCARD",
    },
  })

  // ── Investimentos ────────────────────────────────────────
  // Uma carteira pequena e desequilibrada de propósito: quase tudo em renda
  // fixa, nada fora do país. É o que faz a tela de investimentos ter o que
  // mostrar no ARCA — uma carteira certinha não exercita nenhum aviso.
  await prisma.conta.createMany({
    data: [
      { larId: lar.id, nome: "Tesouro Selic 2029", instituicao: "Nubank", tipo: "INVESTIMENTO", classeDeAtivo: "RENDA_FIXA", saldoInicialCentavos: reais(8500), cor: "green" },
      { larId: lar.id, nome: "CDB Liquidez Diária", instituicao: "Banco Inter", tipo: "INVESTIMENTO", classeDeAtivo: "CAIXA", saldoInicialCentavos: reais(3200), cor: "orange" },
      { larId: lar.id, nome: "BOVA11", instituicao: "XP", tipo: "INVESTIMENTO", classeDeAtivo: "ACOES", ticker: "BOVA11", quantidadeMilesimos: 20_000, saldoInicialCentavos: reais(2640), cor: "blue" },
      { larId: lar.id, nome: "HGLG11", instituicao: "XP", tipo: "INVESTIMENTO", classeDeAtivo: "FII", ticker: "HGLG11", quantidadeMilesimos: 8_000, saldoInicialCentavos: reais(1270), cor: "blue" },
    ],
  })

  // ── Seis meses de lançamentos ────────────────────────────
  // Modelos com valor típico e frequência mensal. A variação de ±25% dá ao
  // gráfico de evolução um formato realista, sem inventar meses absurdos.
  const modelos = [
    { descricao: "Aluguel", categoria: "Aluguel e condomínio", valor: 1850, vezes: 1, conta: corrente.id, dia: 5 },
    { descricao: "Energia elétrica", categoria: "Energia elétrica", valor: 210, vezes: 1, conta: corrente.id, dia: 12 },
    { descricao: "Água", categoria: "Água", valor: 88, vezes: 1, conta: corrente.id, dia: 15 },
    { descricao: "Internet e celular", categoria: "Telefone e internet", valor: 189, vezes: 1, conta: corrente.id, dia: 16 },
    { descricao: "Plano de saúde", categoria: "Plano de saúde", valor: 640, vezes: 1, conta: corrente.id, dia: 8 },
    { descricao: "Escola do Téo", categoria: "Educação", valor: 780, vezes: 1, conta: corrente.id, dia: 10 },
    { descricao: "Supermercado Pão de Açúcar", categoria: "Supermercado", valor: 320, vezes: 4, conta: cartao.id },
    { descricao: "iFood", categoria: "Delivery", valor: 62, vezes: 6, conta: cartao.id },
    { descricao: "Restaurante", categoria: "Restaurante", valor: 118, vezes: 3, conta: cartao.id },
    { descricao: "Posto Ipiranga", categoria: "Combustível", valor: 240, vezes: 2, conta: cartao.id },
    { descricao: "Uber", categoria: "Aplicativos de transporte", valor: 28, vezes: 7, conta: cartaoRafael.id },
    { descricao: "Drogaria Raia", categoria: "Farmácia", valor: 96, vezes: 2, conta: cartao.id },
    { descricao: "Smart Fit", categoria: "Academia", valor: 129, vezes: 1, conta: cartaoRafael.id, dia: 20 },
    { descricao: "Netflix", categoria: "Assinaturas e streaming", valor: 55, vezes: 1, conta: cartao.id, dia: 18 },
    { descricao: "Spotify", categoria: "Assinaturas e streaming", valor: 35, vezes: 1, conta: cartao.id, dia: 22 },
    { descricao: "Cinema e bar", categoria: "Lazer e eventos", valor: 145, vezes: 2, conta: cartaoRafael.id },
    { descricao: "Petz", categoria: "Pet", valor: 180, vezes: 1, conta: cartao.id, dia: 14 },
    { descricao: "Renner", categoria: "Vestuário", valor: 260, vezes: 1, conta: cartao.id, dia: 24 },
    { descricao: "Amazon", categoria: "Compras online", valor: 190, vezes: 2, conta: cartaoRafael.id },
    { descricao: "Juros do cheque especial", categoria: "Tarifas e juros", valor: 142, vezes: 1, conta: corrente.id, dia: 28 },
  ]

  const lancamentos = []

  for (let atras = 5; atras >= 0; atras -= 1) {
    const competencia = competenciaMais(competenciaAtual, -atras)
    const [ano, mes] = competencia.split("-").map(Number)
    const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
    // No mês corrente só existe movimento até hoje: gerar o mês inteiro faria a
    // comparação com os meses anteriores mentir para pior.
    const limiteDoDia = atras === 0 ? hoje.getUTCDate() : ultimoDia

    // Salários
    lancamentos.push({
      contaId: corrente.id,
      membroId: marina.id,
      categoriaId: cat("Salário"),
      data: dia(ano, mes, Math.min(5, limiteDoDia)),
      descricao: "Salário Marina",
      valorCentavos: reais(5200),
      tipo: "RECEITA",
      competencia,
    })

    if (limiteDoDia >= 5) {
      lancamentos.push({
        contaId: corrente.id,
        membroId: rafael.id,
        categoriaId: cat("Salário"),
        data: dia(ano, mes, Math.min(5, limiteDoDia)),
        descricao: "Salário Rafael",
        valorCentavos: reais(3400),
        tipo: "RECEITA",
        competencia,
      })
    }

    // Freela do Rafael em alguns meses — dá irregularidade à série de receita.
    if (atras % 2 === 1 && limiteDoDia >= 18) {
      lancamentos.push({
        contaId: corrente.id,
        membroId: rafael.id,
        categoriaId: cat("Outras receitas"),
        data: dia(ano, mes, 18),
        descricao: "Freela de design",
        valorCentavos: reais(variar(1200, 0.3)),
        tipo: "RECEITA",
        competencia,
      })
    }

    for (const modelo of modelos) {
      for (let n = 0; n < modelo.vezes; n += 1) {
        const diaDoMes = modelo.dia ?? Math.min(ultimoDia, 2 + Math.floor(proximo() * 26))
        if (diaDoMes > limiteDoDia) continue

        lancamentos.push({
          contaId: modelo.conta,
          membroId: modelo.conta === cartaoRafael.id ? rafael.id : marina.id,
          categoriaId: cat(modelo.categoria),
          data: dia(ano, mes, diaDoMes),
          descricao: modelo.descricao,
          descricaoOriginal: modelo.descricao,
          valorCentavos: reais(variar(modelo.valor)),
          tipo: "DESPESA",
          competencia,
        })
      }
    }
  }

  await prisma.transacao.createMany({ data: lancamentos.map((linha) => ({ larId: lar.id, ...linha })) })

  // ── Pagamento das faturas ────────────────────────────────
  // Sem isso o dinheiro do cartão nunca saía da conta corrente: o saldo subia
  // mês a mês e a fatura ficava aberta para sempre. Pagamento de fatura é
  // transferência, não despesa — a compra já foi lançada quando aconteceu, e
  // lançar de novo contaria o mesmo gasto duas vezes no demonstrativo.
  for (const cartaoAtual of [cartao, cartaoRafael]) {
    for (let atras = 5; atras >= 1; atras -= 1) {
      const competenciaGasto = competenciaMais(competenciaAtual, -atras)
      const competenciaPagamento = competenciaMais(competenciaAtual, -atras + 1)
      const [ano, mes] = competenciaPagamento.split("-").map(Number)

      const doMes = lancamentos.filter(
        (linha) => linha.contaId === cartaoAtual.id && linha.competencia === competenciaGasto,
      )
      const total = doMes.reduce((soma, linha) => soma + linha.valorCentavos, 0)
      if (total === 0) continue

      const dataPagamento = dia(ano, mes, cartaoAtual.diaVencimento ?? 6)
      if (dataPagamento > hoje) continue

      const saida = await prisma.transacao.create({
        data: {
          larId: lar.id,
          contaId: corrente.id,
          data: dataPagamento,
          descricao: `Pagamento fatura ${cartaoAtual.nome}`,
          valorCentavos: total,
          tipo: "TRANSFERENCIA",
          competencia: competenciaPagamento,
        },
      })

      await prisma.transacao.create({
        data: {
          larId: lar.id,
          contaId: cartaoAtual.id,
          data: dataPagamento,
          descricao: `Pagamento recebido`,
          valorCentavos: total,
          tipo: "TRANSFERENCIA",
          competencia: competenciaPagamento,
          transferenciaParId: saida.id,
        },
      })
    }
  }

  // Aportes na poupança — dinheiro guardado sai da corrente de verdade.
  for (let atras = 5; atras >= 0; atras -= 1) {
    const competencia = competenciaMais(competenciaAtual, -atras)
    const [ano, mes] = competencia.split("-").map(Number)
    const dataAporte = dia(ano, mes, 6)
    if (dataAporte > hoje) continue

    const saida = await prisma.transacao.create({
      data: {
        larId: lar.id,
        contaId: corrente.id,
        data: dataAporte,
        descricao: "Aporte na reserva",
        valorCentavos: reais(400),
        tipo: "TRANSFERENCIA",
        competencia,
      },
    })

    await prisma.transacao.create({
      data: {
        larId: lar.id,
        contaId: poupanca.id,
        data: dataAporte,
        descricao: "Aporte na reserva",
        valorCentavos: reais(400),
        tipo: "TRANSFERENCIA",
        competencia,
        transferenciaParId: saida.id,
      },
    })
  }

  // ── Parcelamentos ────────────────────────────────────────
  const parcelados = [
    { descricao: "Notebook Dell", total: 4800, parcelas: 10, pagas: 3, conta: cartao.id, categoria: "Compras online" },
    { descricao: "Passagens para Salvador", total: 3200, parcelas: 8, pagas: 2, conta: cartao.id, categoria: "Viagem" },
    { descricao: "Curso de inglês", total: 2400, parcelas: 12, pagas: 5, conta: cartaoRafael.id, categoria: "Educação" },
    { descricao: "Geladeira", total: 3600, parcelas: 6, pagas: 4, conta: cartao.id, categoria: "Outros" },
  ]

  for (const item of parcelados) {
    const totalCentavos = reais(item.total)
    const base = Math.floor(totalCentavos / item.parcelas)
    const sobra = totalCentavos - base * item.parcelas
    const primeira = competenciaMais(competenciaAtual, -item.pagas)

    await prisma.parcelamento.create({
      data: {
        larId: lar.id,
        contaId: item.conta,
        categoriaId: cat(item.categoria),
        descricao: item.descricao,
        valorTotalCentavos: totalCentavos,
        parcelaCentavos: base + (sobra > 0 ? 1 : 0),
        parcelasTotal: item.parcelas,
        parcelasPagas: item.pagas,
        dataCompra: dia(anoAtual, mesAtual, 1),
        primeiraCompetencia: primeira,
        parcelas: {
          create: Array.from({ length: item.parcelas }, (_, indice) => {
            const competencia = competenciaMais(primeira, indice)
            const [ano, mes] = competencia.split("-").map(Number)
            return {
              numero: indice + 1,
              competencia,
              vencimento: dia(ano, mes, 6),
              valorCentavos: base + (indice < sobra ? 1 : 0),
              paga: indice < item.pagas,
            }
          }),
        },
      },
    })
  }

  // ── Dívidas ──────────────────────────────────────────────
  await prisma.divida.create({
    data: {
      larId: lar.id,
      contaId: corrente.id,
      credor: "Conta corrente — cheque especial",
      tipo: "CHEQUE_ESPECIAL",
      saldoDevedorCentavos: reais(1850),
      jurosMensalBps: 780,
      diaVencimento: 5,
      observacao: "Taxa conforme extrato do banco.",
    },
  })

  await prisma.divida.create({
    data: {
      larId: lar.id,
      credor: "Empréstimo pessoal — Banco do Brasil",
      tipo: "EMPRESTIMO_PESSOAL",
      saldoDevedorCentavos: reais(8400),
      jurosMensalBps: 289,
      parcelaCentavos: reais(620),
      parcelasTotal: 24,
      parcelasPagas: 9,
      diaVencimento: 15,
    },
  })

  await prisma.divida.create({
    data: {
      larId: lar.id,
      credor: "Financiamento do carro",
      tipo: "FINANCIAMENTO_VEICULO",
      saldoDevedorCentavos: reais(21500),
      jurosMensalBps: 158,
      parcelaCentavos: reais(890),
      parcelasTotal: 48,
      parcelasPagas: 19,
      diaVencimento: 20,
    },
  })

  // ── Contas fixas ─────────────────────────────────────────
  const fixas = [
    { descricao: "Aluguel", valor: 1850, dia: 5, categoria: "Aluguel e condomínio" },
    { descricao: "Plano de saúde", valor: 640, dia: 8, categoria: "Plano de saúde" },
    { descricao: "Escola do Téo", valor: 780, dia: 10, categoria: "Educação" },
    { descricao: "Internet e celular", valor: 189, dia: 16, categoria: "Telefone e internet" },
    { descricao: "Netflix", valor: 55, dia: 18, categoria: "Assinaturas e streaming" },
    { descricao: "Spotify", valor: 35, dia: 22, categoria: "Assinaturas e streaming" },
    { descricao: "Smart Fit", valor: 129, dia: 20, categoria: "Academia" },
  ]

  for (const conta of fixas) {
    const jaPassou = hoje.getUTCDate() > conta.dia
    await prisma.recorrencia.create({
      data: {
        larId: lar.id,
        descricao: conta.descricao,
        valorCentavos: reais(conta.valor),
        tipo: "DESPESA",
        periodicidade: "MENSAL",
        diaVencimento: conta.dia,
        proximaData: dia(anoAtual, mesAtual + (jaPassou ? 1 : 0), conta.dia),
        contaId: corrente.id,
        categoriaId: cat(conta.categoria),
      },
    })
  }

  await prisma.recorrencia.create({
    data: {
      larId: lar.id,
      descricao: "Salário Marina",
      valorCentavos: reais(5200),
      tipo: "RECEITA",
      periodicidade: "MENSAL",
      diaVencimento: 5,
      proximaData: dia(anoAtual, mesAtual + 1, 5),
      contaId: corrente.id,
      categoriaId: cat("Salário"),
    },
  })

  // ── Orçamento do mês ─────────────────────────────────────
  // Alguns limites de propósito abaixo do gasto real, para a tela mostrar
  // estouro — orçamento de demonstração todo verde não ensina a ler a tela.
  const limites = [
    { categoria: "Supermercado", valor: 1200 },
    { categoria: "Delivery", valor: 250 },
    { categoria: "Restaurante", valor: 300 },
    { categoria: "Combustível", valor: 450 },
    { categoria: "Lazer e eventos", valor: 250 },
    { categoria: "Compras online", valor: 300 },
    { categoria: "Vestuário", valor: 200 },
    { categoria: "Aplicativos de transporte", valor: 180 },
  ]

  for (const limite of limites) {
    const categoriaId = cat(limite.categoria)
    if (!categoriaId) continue
    await prisma.orcamento.create({
      data: {
        larId: lar.id,
        competencia: competenciaAtual,
        categoriaId,
        limiteCentavos: reais(limite.valor),
      },
    })
  }

  // ── Metas ────────────────────────────────────────────────
  await prisma.meta.create({
    data: {
      larId: lar.id,
      nome: "Reserva de emergência",
      tipo: "RESERVA_EMERGENCIA",
      alvoCentavos: reais(31200),
      // Bate com a poupança: 4.300 iniciais mais seis aportes de 400. Meta e
      // conta mostrando valores diferentes é o tipo de incoerência que faz o
      // usuário parar de confiar no app.
      saldoCentavos: reais(4300 + 400 * 6),
      aporteMensalCentavos: reais(400),
      contaId: poupanca.id,
      prioridade: 100,
      icone: "shield",
      cor: "teal",
    },
  })

  await prisma.meta.create({
    data: {
      larId: lar.id,
      nome: "Viagem para Portugal",
      tipo: "VIAGEM",
      alvoCentavos: reais(18000),
      saldoCentavos: reais(2600),
      aporteMensalCentavos: reais(500),
      dataAlvo: dia(anoAtual + 1, 7, 1),
      prioridade: 50,
      icone: "plane",
      cor: "blue",
    },
  })

  await prisma.meta.create({
    data: {
      larId: lar.id,
      nome: "Aposentadoria",
      tipo: "APOSENTADORIA",
      alvoCentavos: reais(1200000),
      saldoCentavos: reais(38000),
      aporteMensalCentavos: reais(600),
      rendimentoAnualBps: 550,
      dataAlvo: dia(anoAtual + 27, 1, 1),
      prioridade: 10,
      icone: "trending-up",
      cor: "green",
    },
  })

  // ── Regras aprendidas ────────────────────────────────────
  const regras = [
    { padrao: "IFOOD", categoria: "Delivery", renomearPara: "iFood", acertos: 34 },
    { padrao: "UBER", categoria: "Aplicativos de transporte", renomearPara: "Uber", acertos: 41 },
    { padrao: "PAO DE ACUCAR", categoria: "Supermercado", acertos: 22 },
    { padrao: "NETFLIX", categoria: "Assinaturas e streaming", renomearPara: "Netflix", acertos: 6 },
    { padrao: "IPIRANGA", categoria: "Combustível", acertos: 12 },
    { padrao: "DROGARIA", categoria: "Farmácia", acertos: 9 },
  ]

  for (const regra of regras) {
    const categoriaId = cat(regra.categoria)
    if (!categoriaId) continue
    await prisma.regraCategorizacao.create({
      data: {
        larId: lar.id,
        padrao: regra.padrao,
        categoriaId,
        renomearPara: regra.renomearPara ?? null,
        prioridade: 100,
        acertos: regra.acertos,
      },
    })
  }

  // ── Capturas esperando conferência ───────────────────────
  const pendentes = [
    { texto: "Nubank — Compra aprovada: R$ 74,90 em ASSAI ATACADISTA", valor: 7490, nome: "Assai Atacadista", categoria: "Supermercado", confianca: 90 },
    { texto: "Banco do Brasil — Compra aprovada de R$ 32,00 em PADARIA REAL", valor: 3200, nome: "Padaria Real", categoria: null, confianca: 80 },
    { texto: "Nubank — Compra aprovada: R$ 219,90 em CENTAURO", valor: 21990, nome: "Centauro", categoria: null, confianca: 80 },
  ]

  for (const captura of pendentes) {
    await prisma.captura.create({
      data: {
        larId: lar.id,
        origem: "NOTIFICACAO",
        status: "PENDENTE",
        textoBruto: captura.texto,
        valorCentavos: captura.valor,
        estabelecimento: captura.nome,
        data: hoje,
        contaId: cartao.id,
        categoriaId: captura.categoria ? cat(captura.categoria) : null,
        confianca: captura.confianca,
      },
    })
  }

  // ── Simulação de empréstimo guardada ─────────────────────
  await prisma.simulacaoEmprestimo.create({
    data: {
      larId: lar.id,
      titulo: "Proposta do gerente — 15 mil em 24x",
      valorCentavos: reais(15000),
      parcelas: 24,
      jurosMensalBps: 349,
      custosExtrasCentavos: reais(420),
      resultado: {
        parcelaCentavos: 93_400,
        totalPagoCentavos: 2_241_600,
        totalJurosCentavos: 741_600,
        cetMensalBps: 372,
        cetAnualBps: 5490,
        comprometimentoBps: 2870,
      },
      veredito: "CUIDADO",
    },
  })

  const totais = await prisma.transacao.groupBy({
    by: ["tipo"],
    where: { larId: lar.id },
    _sum: { valorCentavos: true },
  })

  console.log("Conta de demonstração criada.")
  console.log(`  entrar: ${EMAIL} / ${SENHA}`)
  console.log(`  lançamentos: ${lancamentos.length} em 6 meses`)
  for (const linha of totais) {
    console.log(`  ${linha.tipo.toLowerCase()}: R$ ${((linha._sum.valorCentavos ?? 0) / 100).toFixed(2)}`)
  }
}

main()
  .catch((erro) => {
    console.error(erro)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

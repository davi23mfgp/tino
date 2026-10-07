/**
 * Ajuda tributária do MEI (item 3.3, estudo em
 * `docs/pesquisas/2026-10-07-fase-3-assessor.md`).
 *
 * Um catálogo fechado de regras, cada uma com a fonte e a data em que foi
 * conferida. O que a regra escrita não responde não ganha resposta: ganha
 * "é caso de contador". Chute em assunto de imposto é pior que silêncio,
 * porque a pessoa age em cima dele.
 *
 * Os números de 2026 (limite, DAS, salário mínimo) mudam por lei. Quando
 * mudarem, a data da regra sobe junto, e a tela mostra a data.
 */

export interface Fonte { nome: string; url: string }

export interface ContextoDoMei {
  faturadoNoAnoCentavos: number | null
  limiteAnualCentavos: number
  /** Como está no perfil MEI (`AtividadeMei`). */
  atividade: "COMERCIO" | "SERVICOS" | "COMERCIO_E_SERVICOS" | "INDUSTRIA" | "TRANSPORTE_CARGA" | null
}

export interface RespostaTributaria {
  chave: string
  pergunta: string
  resposta: string
  fontes: Fonte[]
  conferidaEm: string
  /** A regra responde, mas a decisão pede contador (desenquadramento, por exemplo). */
  procureContador: boolean
}

export interface CasoDeContador { chave: "contador"; resposta: string; procureContador: true }

import { formatarMoeda } from "@/lib/dinheiro"

const LC123: Fonte = { nome: "Lei Complementar 123/2006", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm" }
const CGSN140: Fonte = { nome: "Resolução CGSN 140/2018", url: "http://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=92278" }
const PORTAL: Fonte = { nome: "Portal do Empreendedor (gov.br)", url: "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor" }

const CONFERIDA = "2026-10-07"
export const LIMITE_MEI_2026_CENTAVOS = 8_100_000
export const SALARIO_MINIMO_2026_CENTAVOS = 162_100

/**
 * INSS (5% do mínimo) mais R$ 1 de ICMS no comércio e R$ 5 de ISS no serviço.
 * O MEI caminhoneiro tem conta própria (12% do mínimo) e fica de fora: a
 * tela não mostra número que não confere.
 */
export function dasDoMes(atividade: ContextoDoMei["atividade"]): number | null {
  if (!atividade || atividade === "TRANSPORTE_CARGA") return null
  const inss = Math.round(SALARIO_MINIMO_2026_CENTAVOS * 5 / 100)
  const icms = atividade === "SERVICOS" ? 0 : 100
  const iss = atividade === "COMERCIO" || atividade === "INDUSTRIA" ? 0 : 500
  return inss + icms + iss
}

const reais = (centavos: number) => formatarMoeda(centavos).replace(/\u00a0/g, " ")

interface Regra {
  chave: string
  pergunta: string
  /** Palavras (sem acento) que apontam para a regra; a que mais casa responde. */
  palavras: string[]
  fontes: Fonte[]
  responder: (contexto: ContextoDoMei) => { resposta: string; procureContador?: boolean }
}

export const REGRAS: Regra[] = [
  {
    chave: "limite", pergunta: "Quanto o MEI pode faturar por ano?",
    palavras: ["limite", "faturar", "faturamento", "teto", "quanto posso", "81"],
    fontes: [LC123, PORTAL],
    responder: (c) => {
      const base = `O limite do MEI é ${reais(c.limiteAnualCentavos)} por ano (em quem abriu no meio do ano, ${reais(Math.round(c.limiteAnualCentavos / 12))} por mês de atividade). Há projeto no Congresso para subir o teto (PLP 108/2021), mas até a data abaixo ele não tinha virado lei.`
      if (c.faturadoNoAnoCentavos === null) return { resposta: base }
      const falta = c.limiteAnualCentavos - c.faturadoNoAnoCentavos
      return { resposta: `${base} Este ano você faturou ${reais(c.faturadoNoAnoCentavos)}: ${falta >= 0 ? `ainda cabem ${reais(falta)}.` : `passou ${reais(-falta)} do limite.`}` }
    },
  },
  {
    chave: "excesso", pergunta: "E se eu passar do limite?",
    palavras: ["passar do limite", "passei do limite", "estourar o limite", "estourei o limite", "passar", "passei", "estourar", "estourei", "ultrapassar", "ultrapassei", "excesso", "desenquadr"],
    fontes: [LC123, CGSN140],
    responder: (c) => {
      const vinte = Math.round(c.limiteAnualCentavos * 120 / 100)
      const regra = `Se passar do limite em até 20% (até ${reais(vinte)}), você deixa de ser MEI a partir de 1º de janeiro do ano seguinte e paga um DAS a mais sobre o que passou. Se passar de 20%, a saída volta para janeiro do ano em que passou, e os impostos do ano todo são recalculados como microempresa. Nos dois casos, avise a Receita até o último dia útil do mês seguinte (LC 123, art. 18-A, § 7º).`
      if (c.faturadoNoAnoCentavos === null || c.faturadoNoAnoCentavos <= c.limiteAnualCentavos) return { resposta: regra, procureContador: false }
      const caso = c.faturadoNoAnoCentavos <= vinte ? "Você está na faixa de até 20%." : "Você passou de 20%: a saída é retroativa a janeiro."
      return { resposta: `${regra} ${caso} Converse com um contador antes de comunicar: o que fazer agora muda o imposto do ano.`, procureContador: true }
    },
  },
  {
    chave: "das-valor", pergunta: "Quanto é o DAS?",
    palavras: ["das", "quanto pago", "valor do das", "boleto", "guia", "imposto mensal"],
    fontes: [LC123, PORTAL],
    responder: (c) => {
      const tabela = `Em 2026, com o salário mínimo de ${reais(SALARIO_MINIMO_2026_CENTAVOS)}: ${reais(dasDoMes("COMERCIO")!)} para comércio ou indústria, ${reais(dasDoMes("SERVICOS")!)} para serviços e ${reais(dasDoMes("COMERCIO_E_SERVICOS")!)} para quem faz os dois. É 5% do mínimo para o INSS, mais R$ 1,00 de ICMS (comércio) e R$ 5,00 de ISS (serviço).`
      const seu = dasDoMes(c.atividade)
      return { resposta: seu ? `${tabela} O seu, pela atividade cadastrada: ${reais(seu)}.` : tabela }
    },
  },
  {
    chave: "das-prazo", pergunta: "Até quando pago o DAS?",
    palavras: ["vence", "vencimento", "dia 20", "prazo do das", "atrasado", "atrasar", "multa do das"],
    fontes: [CGSN140, PORTAL],
    responder: () => ({ resposta: "O DAS vence todo dia 20, e paga o mês anterior (o de setembro vence em 20 de outubro). Atrasado, tem multa e juros, e o mês sem pagar não conta para o INSS (aposentadoria, auxílio-doença, salário-maternidade)." }),
  },
  {
    chave: "declaracao", pergunta: "Quando entrego a declaração anual?",
    palavras: ["declaracao", "dasn", "anual", "31 de maio", "maio"],
    fontes: [CGSN140, PORTAL],
    responder: () => ({ resposta: "A declaração anual (DASN-SIMEI) do ano passado vai até 31 de maio, no Portal do Empreendedor. Atrasada, a multa é de 2% ao mês sobre os impostos declarados, no mínimo R$ 50,00. O Tino já soma o faturamento do ano para você conferir antes de declarar." }),
  },
  {
    chave: "nota", pergunta: "Preciso emitir nota fiscal?",
    palavras: ["nota", "nota fiscal", "nfs", "nfse", "nfe", "emitir"],
    fontes: [CGSN140, { nome: "NFS-e Nacional (gov.br)", url: "https://www.gov.br/nfse/pt-br" }],
    responder: () => ({ resposta: "Para empresa (CNPJ), sim: a nota é obrigatória. Para pessoa física, o MEI é dispensado, a não ser que o cliente peça. Nota de serviço é emitida no padrão nacional (NFS-e Nacional), obrigatório para o MEI desde 1º de setembro de 2023." }),
  },
  {
    chave: "empregado", pergunta: "Posso contratar alguém?",
    palavras: ["empregado", "funcionario", "contratar", "ajudante", "registrar"],
    fontes: [LC123],
    responder: () => ({ resposta: "Pode ter um empregado, que ganhe o salário mínimo ou o piso da categoria (LC 123, art. 18-C). A contratação tem eSocial, FGTS e INSS a pagar: o primeiro registro vale fazer com um contador.", procureContador: true }),
  },
]

const normalizar = (texto: string) => texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()

/**
 * Responde pela regra que mais casa com a pergunta. Sem nenhuma palavra em
 * comum, devolve o "caso de contador", com a frase pronta: o Tino não chuta.
 */
export function responderTributario(pergunta: string, contexto: ContextoDoMei): RespostaTributaria | CasoDeContador {
  // Sem pontuação: "o DAS?" tem de casar com a palavra "das".
  const texto = ` ${normalizar(pergunta).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()} `
  // Pontua pelo tamanho do que casou: "passar do limite" diz mais que "limite" sozinho.
  const pontos = REGRAS.map((regra) => ({
    regra,
    pontos: regra.palavras.filter((palavra) => texto.includes(palavra.length <= 3 ? ` ${palavra} ` : palavra)).reduce((soma, palavra) => soma + palavra.length, 0),
  }))
  const melhor = pontos.sort((a, b) => b.pontos - a.pontos)[0]
  if (!melhor || melhor.pontos === 0) {
    return { chave: "contador", resposta: "Isso passa do que a regra escrita responde, e um chute aqui pode custar caro. É caso de contador: leve a pergunta e o resumo do ano que o Tino monta.", procureContador: true }
  }
  const { resposta, procureContador } = melhor.regra.responder(contexto)
  return { chave: melhor.regra.chave, pergunta: melhor.regra.pergunta, resposta, fontes: melhor.regra.fontes, conferidaEm: CONFERIDA, procureContador: Boolean(procureContador) }
}

/**
 * Captura que já chega separada em campos, sem texto de banco para ler.
 *
 * É o que o app Atalhos do iPhone entrega na automação "Transação" (o cartão
 * foi usado na Carteira): valor, loja e nome do cartão, cada um na sua
 * variável. Passar isso pelo leitor de notificação seria montar uma frase só
 * para desmontar de novo, e o leitor erraria loja com "em" no nome.
 */

import { paraCentavos } from "@/lib/dinheiro"
import type { NotificacaoLida } from "@/lib/captura/notificacao"

export interface CamposDaCaptura {
  valor?: unknown
  loja?: unknown
  cartao?: unknown
}

export interface CapturaEstruturada {
  leitura: NotificacaoLida
  /// Nome do cartão como a Carteira escreve ("Nubank Mastercard"). Não é o
  /// final: a Carteira não entrega os quatro dígitos ao Atalhos.
  cartaoNome: string | null
  /// O que fica guardado como texto bruto, para a pessoa reconhecer na fila.
  texto: string
}

const texto = (valor: unknown, limite: number) =>
  typeof valor === "string" || typeof valor === "number" ? String(valor).trim().slice(0, limite) : ""

export function lerEstruturada(campos: CamposDaCaptura): CapturaEstruturada | null {
  const bruto = campos.valor
  if (typeof bruto !== "string" && typeof bruto !== "number") return null

  // Estorno chega negativo na Carteira. Não é gasto, e lançar o módulo dele
  // como despesa dobraria o erro: fica de fora, como no leitor de aviso.
  const centavos = paraCentavos(bruto)
  if (!Number.isSafeInteger(centavos) || centavos <= 0 || centavos > 2147483647) return null

  const loja = texto(campos.loja, 80) || null
  const cartao = texto(campos.cartao, 60) || null
  const final = cartao?.match(/(\d{4})\s*$/)?.[1] ?? null
  const valorEscrito = (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  return {
    leitura: {
      valorCentavos: centavos,
      estabelecimento: loja,
      cartaoFinal: final,
      instituicao: null,
      data: null,
      parcelaNumero: null,
      parcelaTotal: null,
      ignorar: false,
      // Valor vindo do sistema é certo; sem a loja ainda falta dizer o que foi.
      confianca: loja ? 95 : 60,
    },
    cartaoNome: final ? null : cartao,
    texto: `Atalho: ${valorEscrito}${loja ? ` em ${loja}` : ""}${cartao ? ` (cartão ${cartao})` : ""}`,
  }
}

interface ContaParaEscolher {
  id: string
  nome: string
  instituicao: string | null
  tipo: string
}

const plano = (valor: string) =>
  valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()

/**
 * Em qual conta o gasto entra, e se a escolha é certa.
 *
 * "Certa" quer dizer que a captura apontou a conta (final do cartão, banco ou
 * nome do cartão) e só uma conta atende. O palpite (primeiro cartão do lar)
 * serve para preencher a tela de conferência, mas nunca para lançar sozinho:
 * gasto na conta errada é o tipo de erro que a pessoa só acha no fim do mês.
 */
export function escolherConta<C extends ContaParaEscolher>(
  contas: C[],
  pista: { cartaoFinal?: string | null; instituicao?: string | null; cartaoNome?: string | null },
): { conta: C | undefined; certa: boolean } {
  if (pista.cartaoFinal) {
    const porFinal = contas.filter((conta) => conta.nome.includes(pista.cartaoFinal as string))
    if (porFinal.length > 0) return { conta: porFinal[0], certa: porFinal.length === 1 }
  }

  if (pista.instituicao) {
    const banco = plano(pista.instituicao)
    const porBanco = contas.filter(
      (conta) => (conta.instituicao && plano(conta.instituicao) === banco) || plano(conta.nome).includes(banco),
    )
    // Mesmo banco costuma ter conta e cartão: o aviso sem final não diz qual.
    if (porBanco.length > 0) return { conta: porBanco[0], certa: porBanco.length === 1 }
  }

  if (pista.cartaoNome) {
    const nome = plano(pista.cartaoNome)
    // Cartão da Carteira nunca é investimento nem poupança: sem este corte, o
    // Tesouro guardado no mesmo banco tirava a certeza do cartão.
    const pagam = contas.filter((conta) => conta.tipo !== "INVESTIMENTO" && conta.tipo !== "POUPANCA")
    const porNome = pagam.filter((conta) => {
      const daConta = plano(conta.nome)
      const banco = conta.instituicao ? plano(conta.instituicao) : ""
      return nome.includes(daConta) || daConta.includes(nome) || (banco.length >= 3 && nome.includes(banco))
    })
    if (porNome.length > 0) {
      // A Carteira guarda cartão, então entre conta e cartão do mesmo banco o
      // cartão é o provável; ainda assim, com dois candidatos, não é certeza.
      const cartao = porNome.find((conta) => conta.tipo === "CARTAO_CREDITO")
      return { conta: cartao ?? porNome[0], certa: porNome.length === 1 }
    }
  }

  return { conta: contas.find((conta) => conta.tipo === "CARTAO_CREDITO") ?? contas[0], certa: false }
}

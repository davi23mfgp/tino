import { prisma } from "@/lib/prisma"

import { ErroDeUso } from "@/lib/api"

/**
 * Limite de tentativas.
 *
 * Segura duas coisas diferentes com o mesmo mecanismo:
 *
 * 1. **Força bruta de senha.** Sem limite, dá para tentar senha em laço até
 *    acertar, e bcrypt custo 12 atrasa o atacante mas não o impede.
 * 2. **Abuso de rota cara.** `/api/transcrever` gasta Groq a cada chamada e
 *    `/api/tino/chat` também — sem teto, um laço vira conta para o dono pagar.
 *
 * O contador mora no banco, não na memória do processo: em serverless cada
 * requisição pode cair numa instância nova, e contador em memória zera a cada
 * partida — ou seja, não conta nada.
 *
 * A janela é fixa, não deslizante. Janela deslizante é mais justa e precisa de
 * uma linha por tentativa; para o volume do Tino isso seria uma tabela grande
 * para ganhar pouco.
 */

export interface Regra {
  /** Quantas tentativas cabem na janela. */
  maximo: number
  /** Tamanho da janela, em segundos. */
  janelaSegundos: number
  /** Quanto tempo fica bloqueado depois de estourar. */
  bloqueioSegundos: number
}

export const REGRAS = {
  /// Seis tentativas de senha por 15 minutos, depois 15 minutos parado. Erra-se
  /// senha de verdade duas ou três vezes; seis já é folga para quem é dono da
  /// conta e é pouco para quem está varrendo.
  login: { maximo: 6, janelaSegundos: 900, bloqueioSegundos: 900 },
  /// Cadastro: segura criação de conta em massa.
  cadastro: { maximo: 5, janelaSegundos: 3600, bloqueioSegundos: 3600 },
  /// Rotas que gastam dinheiro por chamada.
  caro: { maximo: 30, janelaSegundos: 3600, bloqueioSegundos: 600 },
  /// Captura por chave: um aviso de banco por compra, com folga para rajada.
  captura: { maximo: 120, janelaSegundos: 3600, bloqueioSegundos: 300 },
  /// Teto geral de toda rota autenticada, por pessoa. Uma tela do Tino dispara
  /// umas dez leituras; 300 por minuto é navegação muito rápida com folga.
  apiLeitura: { maximo: 300, janelaSegundos: 60, bloqueioSegundos: 60 },
  apiEscrita: { maximo: 60, janelaSegundos: 60, bloqueioSegundos: 120 },
  /// Webhooks e rotas públicas sem sessão, por IP.
  publico: { maximo: 120, janelaSegundos: 60, bloqueioSegundos: 120 },
} satisfies Record<string, Regra>

export class LimiteEstourado extends ErroDeUso {
  constructor(readonly segundos: number) {
    super(
      `Muitas tentativas. Tente de novo em ${segundos < 120 ? `${segundos} segundos` : `${Math.ceil(segundos / 60)} minutos`}.`,
      429,
    )
  }
}

/**
 * Conta mais uma tentativa e falha quando passou do teto.
 *
 * Chamar **antes** de fazer o trabalho: contar depois deixaria o trabalho caro
 * acontecer na tentativa que já deveria ter sido recusada.
 */
export async function consumirLimite(chave: string, regra: Regra) {
  const agora = new Date()

  const atual = await prisma.limiteAcesso.findUnique({ where: { chave } })

  if (atual?.bloqueadoAte && atual.bloqueadoAte > agora) {
    throw new LimiteEstourado(Math.ceil((atual.bloqueadoAte.getTime() - agora.getTime()) / 1000))
  }

  const janelaVelha = !atual || agora.getTime() - atual.janelaInicio.getTime() > regra.janelaSegundos * 1000
  const tentativas = janelaVelha ? 1 : atual.tentativas + 1
  const estourou = tentativas > regra.maximo

  await prisma.limiteAcesso.upsert({
    where: { chave },
    create: { chave, tentativas, janelaInicio: agora },
    update: {
      tentativas,
      ...(janelaVelha ? { janelaInicio: agora, bloqueadoAte: null } : {}),
      ...(estourou ? { bloqueadoAte: new Date(agora.getTime() + regra.bloqueioSegundos * 1000) } : {}),
    },
  })

  if (estourou) throw new LimiteEstourado(regra.bloqueioSegundos)
}

/**
 * Zera o contador depois de um acerto.
 *
 * Sem isto, quem erra a senha cinco vezes, acerta na sexta e volta a errar mais
 * uma no dia seguinte seria bloqueado — o contador não tem por que lembrar de
 * tentativas que terminaram bem.
 */
export async function liberarLimite(chave: string) {
  await prisma.limiteAcesso.deleteMany({ where: { chave } })
}

/**
 * De onde veio a requisição.
 *
 * Atrás da Vercel o IP real vem no `x-forwarded-for`; o primeiro da lista é o
 * cliente. Sem cabeçalho nenhum (teste local, chamada interna) devolve
 * "desconhecido" — que vira uma chave só, compartilhada, e é o
 * comportamento seguro: limita demais em vez de não limitar nada.
 */
export function ipDaRequisicao(requisicao: Request) {
  // Na Vercel, `x-vercel-forwarded-for` e `x-real-ip` são gravados pela borda e
  // não aceitam valor do cliente. `x-forwarded-for` fica por último: fora da
  // Vercel, o primeiro item dele pode ser forjado para escapar do limite.
  const daBorda = requisicao.headers.get("x-vercel-forwarded-for") ?? requisicao.headers.get("x-real-ip")
  if (daBorda) return daBorda.split(",")[0]!.trim()
  const encaminhado = requisicao.headers.get("x-forwarded-for")
  if (encaminhado) return encaminhado.split(",")[0]!.trim()
  return requisicao.headers.get("x-real-ip") ?? "desconhecido"
}

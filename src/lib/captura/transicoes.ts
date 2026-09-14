/**
 * Quais transições de uma captura são permitidas.
 *
 * Fica separado do banco de propósito: é a única parte da máquina de estados
 * que dá para provar sem subir um Postgres, e é onde mora a regra que estava
 * faltando. Antes, descartar e confirmar eram dois UPDATEs que não olhavam o
 * estado anterior — confirmar e depois descartar deixava o lançamento no
 * extrato com a captura marcada como descartada, e o caminho inverso criava um
 * segundo lançamento para uma compra já negada.
 */

export type StatusCaptura = "PENDENTE" | "NAO_ENTENDIDA" | "CONFIRMADA" | "DESCARTADA"

/** Estados em que a captura ainda espera uma decisão da pessoa. */
const DECIDIVEIS: StatusCaptura[] = ["PENDENTE", "NAO_ENTENDIDA"]

export type Veredito =
  /** Pode seguir e gravar. */
  | { permite: true; jaFeito?: false }
  /** Já estava nesse estado; repetir não é erro, e não grava nada de novo. */
  | { permite: true; jaFeito: true }
  /** Não pode: a mensagem é a que a pessoa vê. */
  | { permite: false; motivo: string; status: number }

/**
 * Uma captura já confirmada não é descartada por aqui.
 *
 * O lançamento no extrato tem vida própria depois de criado — pode ter sido
 * editado, conciliado, pago. Desfazer em silêncio é pior do que mandar a
 * pessoa ao extrato, onde ela vê o que está apagando.
 */
export function podeDescartar(status: StatusCaptura, temTransacao: boolean): Veredito {
  if (status === "DESCARTADA") return { permite: true, jaFeito: true }
  if (temTransacao || status === "CONFIRMADA") {
    return {
      permite: false,
      motivo: "Essa compra já virou lançamento. Apague pelo extrato se não for sua.",
      status: 409,
    }
  }
  if (!DECIDIVEIS.includes(status)) return { permite: false, motivo: "Essa captura já foi decidida.", status: 409 }
  return { permite: true }
}

/**
 * Uma captura descartada não vira lançamento.
 *
 * Quem descartou decidiu que aquilo não é gasto dele. Se mudou de ideia,
 * registra de novo — o caminho de volta existe e é explícito.
 *
 * Confirmar duas vezes devolve o mesmo lançamento (`jaFeito`), porque o toque
 * repetido e a rede instável não podem virar gasto dobrado.
 */
export function podeConfirmar(status: StatusCaptura, temTransacao: boolean): Veredito {
  if (temTransacao) return { permite: true, jaFeito: true }
  if (status === "DESCARTADA") {
    return {
      permite: false,
      motivo: "Essa captura foi descartada. Registre a compra de novo se ela existir.",
      status: 409,
    }
  }
  if (!DECIDIVEIS.includes(status)) return { permite: false, motivo: "Essa captura já foi decidida.", status: 409 }
  return { permite: true }
}

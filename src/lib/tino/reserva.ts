/**
 * Quantos meses de reserva esta pessoa precisa.
 *
 * "Seis meses" é a regra de bolso repetida em todo lugar, e ela erra nos dois
 * sentidos: é demais para quem tem salário estável e uma segunda renda em
 * casa, e é pouco para quem vive de renda variável e sustenta outras pessoas.
 * O que muda o número é quanto tempo a renda pode sumir e quantas bocas
 * dependem dela.
 *
 * A conta é explicada para quem lê — cada acréscimo vem com o motivo — porque
 * um alvo que a pessoa não entende ela não persegue.
 */

export type TipoDeRenda = "ASSALARIADO" | "MISTA" | "VARIAVEL"

export interface PerfilDeReserva {
  tipoDeRenda: TipoDeRenda
  /** Pessoas que dependem financeiramente de quem responde. */
  dependentes: number
  /** A renda da casa vem de uma pessoa só. */
  rendaUnica: boolean
  /** Tem plano de saúde pago (reduz o risco de um gasto grande e súbito). */
  planoDeSaude: boolean
}

export interface AlvoDeReserva {
  meses: number
  /** Cada parcela do cálculo, na ordem, para a tela mostrar a conta. */
  partes: { rotulo: string; meses: number }[]
}

const PISO = 3
const TETO = 18

export function mesesDeReservaSugeridos(perfil: PerfilDeReserva): AlvoDeReserva {
  const partes: { rotulo: string; meses: number }[] = []

  // Base: quanto tempo costuma levar para a renda voltar.
  const base = perfil.tipoDeRenda === "ASSALARIADO" ? 6 : perfil.tipoDeRenda === "MISTA" ? 9 : 12
  partes.push({
    rotulo:
      perfil.tipoDeRenda === "ASSALARIADO"
        ? "Renda de salário, que costuma voltar em alguns meses"
        : perfil.tipoDeRenda === "MISTA"
          ? "Parte da renda é variável"
          : "Renda variável, que pode cair de um mês para o outro",
    meses: base,
  })

  // Cada dependente estica o tempo em que a casa precisa se sustentar sem
  // renda, mas o efeito satura: a partir do terceiro, o que muda a conta é o
  // custo mensal, que já entra pelo outro lado da multiplicação.
  const porDependentes = Math.min(3, perfil.dependentes)
  if (porDependentes > 0) {
    partes.push({ rotulo: `${perfil.dependentes} ${perfil.dependentes === 1 ? "pessoa depende" : "pessoas dependem"} de você`, meses: porDependentes })
  }

  if (perfil.rendaUnica) {
    partes.push({ rotulo: "A casa depende de uma renda só", meses: 1 })
  }

  if (perfil.planoDeSaude) {
    partes.push({ rotulo: "Plano de saúde reduz o risco de gasto grande e súbito", meses: -1 })
  }

  const soma = partes.reduce((total, parte) => total + parte.meses, 0)
  return { meses: Math.min(TETO, Math.max(PISO, soma)), partes }
}

/** Alvo em centavos, dado o custo essencial de um mês. */
export function alvoEmCentavos(custoEssencialCentavos: number, meses: number): number {
  return Math.max(0, Math.round(custoEssencialCentavos * meses))
}

/**
 * Até que dia a reserva paga o essencial, se a renda parar em `hoje`.
 *
 * Meses inteiros andam no calendário e a fração vira dias do mês seguinte:
 * 1,2 mês a partir de 23/09 é 23/10 mais um quinto de novembro, e não 36
 * dias corridos. É assim que a pessoa conta ("dá até o fim de outubro").
 *
 * Sem custo essencial conhecido devolve `null`: dividir por um número
 * inventado daria uma data com cara de fato.
 */
export function dataAteQuandoAguenta(hoje: string, reservadoCentavos: number, essencialMensalCentavos: number): string | null {
  if (essencialMensalCentavos <= 0) return null
  const meses = Math.max(0, reservadoCentavos) / essencialMensalCentavos
  const inteiros = Math.floor(meses)
  const [ano, mes, dia] = hoje.split("-").map(Number)
  const depoisDosInteiros = somarMesesNoCalendario(ano, mes, dia, inteiros)
  const proximo = somarMesesNoCalendario(ano, mes, dia, inteiros + 1)
  const diasDaFracao = Math.floor(((proximo.getTime() - depoisDosInteiros.getTime()) / 86_400_000) * (meses - inteiros))
  return new Date(depoisDosInteiros.getTime() + diasDaFracao * 86_400_000).toISOString().slice(0, 10)
}

/** Dia 31 + 1 mês cai no último dia do mês seguinte, não no dia 1 do outro. */
function somarMesesNoCalendario(ano: number, mes: number, dia: number, meses: number): Date {
  const alvo = new Date(Date.UTC(ano, mes - 1 + meses, 1))
  const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate()
  return new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth(), Math.min(dia, ultimoDia)))
}

/**
 * As formas de juntar o que falta (Davi, 23/09: "flexibilize a forma de
 * juntar"). Todas respondem as mesmas duas perguntas — quanto por mês e em
 * quantos meses — a partir do que a pessoa sabe dizer: um valor, uma data,
 * uma fatia da renda, a sobra do mês ou um dinheiro que vai entrar de uma vez.
 */
export type FormaDeJuntar =
  | { forma: "POR_MES"; porMesCentavos: number }
  | { forma: "ATE_DATA"; meses: number }
  | { forma: "PERCENTUAL"; bps: number; rendaMensalCentavos: number }
  | { forma: "SOBRA"; sobraMensalCentavos: number }
  | { forma: "DE_UMA_VEZ"; valorCentavos: number }

export interface PlanoDeJuntar {
  /** Quanto guardar por mês. Zero em "de uma vez". */
  porMesCentavos: number
  /** Meses até completar; `null` quando o ritmo não chega lá (nada por mês). */
  meses: number | null
  /** O que ainda falta depois de um valor guardado de uma vez. */
  restanteCentavos: number
}

/**
 * Sem rendimento, de propósito: reserva fica em aplicação de liquidez diária,
 * que mal passa da inflação, e prometer juros aqui adiantaria uma data que o
 * dinheiro real não cumpre.
 *
 * Arredonda para cima nos dois sentidos: um mês a mais ou um real a mais por
 * mês é o preço de nunca dizer que completa antes do que completa.
 */
export function planoDeJuntar(faltaCentavos: number, forma: FormaDeJuntar): PlanoDeJuntar {
  const falta = Math.max(0, faltaCentavos)
  if (falta === 0) return { porMesCentavos: 0, meses: 0, restanteCentavos: 0 }

  if (forma.forma === "DE_UMA_VEZ") {
    const restante = Math.max(0, falta - Math.max(0, forma.valorCentavos))
    return { porMesCentavos: 0, meses: restante === 0 ? 0 : null, restanteCentavos: restante }
  }
  if (forma.forma === "ATE_DATA") {
    const meses = Math.max(1, Math.round(forma.meses))
    return { porMesCentavos: Math.ceil(falta / meses), meses, restanteCentavos: falta }
  }

  const porMes =
    forma.forma === "POR_MES"
      ? forma.porMesCentavos
      : forma.forma === "PERCENTUAL"
        ? Math.round((Math.max(0, forma.rendaMensalCentavos) * Math.max(0, forma.bps)) / 10_000)
        : forma.sobraMensalCentavos
  const valido = Math.max(0, porMes)
  return { porMesCentavos: valido, meses: valido > 0 ? Math.ceil(falta / valido) : null, restanteCentavos: falta }
}

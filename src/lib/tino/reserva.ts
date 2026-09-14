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

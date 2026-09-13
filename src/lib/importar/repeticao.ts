/**
 * Gasto que já chegou pela captura do celular e volta no extrato importado.
 *
 * Mesma regra de antes, só que fora da função que fala com o banco, para
 * poder ser testada sem Postgres. Compara dia, valor absoluto e descrição
 * normalizada: a captura do celular costuma trazer o nome curto do
 * estabelecimento, que aparece contido na descrição mais longa do extrato.
 *
 * O piso de 3 caracteres existe porque descrição normalizada muito curta
 * ("uber" vira "uber", mas "n/d" vira "nd") casaria com quase tudo.
 */

export function normalizarDescricao(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

export function repeteCapturaDoCelular(
  bruto: { data: Date; valorCentavos: number; descricao: string },
  capturados: { data: Date; valorCentavos: number; descricao: string }[],
): boolean {
  const dia = bruto.data.toISOString().slice(0, 10)
  const descricao = normalizarDescricao(bruto.descricao)
  return capturados.some((capturado) => {
    const curta = normalizarDescricao(capturado.descricao)
    return (
      capturado.data.toISOString().slice(0, 10) === dia &&
      capturado.valorCentavos === Math.abs(bruto.valorCentavos) &&
      curta.length >= 3 &&
      descricao.includes(curta)
    )
  })
}

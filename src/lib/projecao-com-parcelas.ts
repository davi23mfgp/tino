import type { Panorama } from "@/lib/tino/panorama"

/** Início e projeção mostram a mesma previsão, incluindo parcelas contratadas. */
export function projetarComParcelas(
  panorama: Pick<Panorama, "projecao" | "saldoTotalCentavos">,
  compromissos: { competencia: string; totalCentavos: number }[],
) {
  let acumulado = panorama.saldoTotalCentavos
  return panorama.projecao.map((linha) => {
    const parcelasCentavos = compromissos.find((item) => item.competencia === linha.competencia)?.totalCentavos ?? 0
    const saldoComParcelas = linha.saldoMesCentavos - parcelasCentavos
    acumulado += saldoComParcelas
    return { ...linha, parcelasCentavos, saldoComParcelas, acumuladoCentavos: acumulado }
  })
}

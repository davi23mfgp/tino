import { comSessao, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { DICA_DO_MOTIVO, REGRAS_DOS_GRUPOS, gruposDeClientes, guiaDoNegocio } from "@/lib/loja/analises"
import { clientesParaAnalise, fotoDoNegocio, perdasDaLoja } from "@/lib/loja/fase2-dados"

export const dynamic = "force-dynamic"

/**
 * As análises da Fase 2 numa ida só: o Guia do negócio (2.1), os grupos de
 * clientes (2.2) e os motivos de perda (2.4). As telas esperam a escolha do
 * Davi no canvas; a resposta já vem com as regras escritas, para a tela só
 * mostrar.
 */
export const GET = comSessao(async (sessao) => {
  const loja = await lojaDoLar(sessao.larId)
  const agora = new Date()
  const [clientes, perdas, foto] = await Promise.all([clientesParaAnalise(loja.id, agora), perdasDaLoja(loja.id, agora), fotoDoNegocio(loja, agora)])
  const grupos = gruposDeClientes(clientes, agora)
  const resumo = (cliente: { id: string; nome: string; telefone: string | null }) => ({ id: cliente.id, nome: cliente.nome, telefone: cliente.telefone })
  return ok({
    guia: guiaDoNegocio(foto),
    clientes: {
      regras: REGRAS_DOS_GRUPOS,
      cedo: grupos.cedo,
      totalEm90Centavos: grupos.totalEm90Centavos,
      compramMais: grupos.compramMais.map((linha) => ({ ...resumo(linha.cliente), valorCentavos: linha.valorCentavos, parteBps: linha.parteBps })),
      frequentes: grupos.frequentes.map(resumo),
      sumidos: grupos.sumidos.map((linha) => ({ ...resumo(linha.cliente), ultimaEm: linha.ultimaEm })),
      soFiado: grupos.soFiado.map(resumo),
    },
    perdas: { ...perdas, dica: perdas.principal?.motivo ? DICA_DO_MOTIVO[perdas.principal.motivo] : null },
  })
})

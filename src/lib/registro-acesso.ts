import { prisma } from "@/lib/prisma"
import { ipDaRequisicao } from "@/lib/limite"

/// Marco Civil, art. 15: seis meses de guarda, nem mais nem menos. Guardar além
/// do exigido é dado pessoal sem finalidade (LGPD, art. 6º, III).
export const GUARDA_REGISTRO_ACESSO_DIAS = 183

/** Grava o acesso. Falha aqui não pode impedir o login — só vai para o log. */
export async function registrarAcesso(requisicao: Request, usuarioId: string, evento: "LOGIN" | "CADASTRO") {
  try {
    await prisma.registroAcesso.create({
      data: { usuarioId, evento, ip: ipDaRequisicao(requisicao).slice(0, 64) },
    })
  } catch (excecao) {
    console.error("[tino] falha ao gravar registro de acesso", excecao)
  }
}

export async function expurgarRegistrosVencidos(agora = new Date()) {
  const corte = new Date(agora.getTime() - GUARDA_REGISTRO_ACESSO_DIAS * 24 * 60 * 60 * 1000)
  const { count } = await prisma.registroAcesso.deleteMany({ where: { criadoEm: { lt: corte } } })
  return count
}

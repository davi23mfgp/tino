import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const GET = comSessao(async (sessao) => {
  const usuario = await prisma.usuario.findUniqueOrThrow({
    where: { id: sessao.usuarioId },
    select: { nome: true, avatarUrl: true },
  })
  return ok(usuario)
})

/**
 * Foto de perfil.
 *
 * Sem serviço de arquivo (S3 ou equivalente) no projeto, a foto é gravada
 * como data URL no próprio campo `avatarUrl` do usuário — o cliente já
 * reduz a imagem para um quadrado pequeno antes de mandar (ver
 * `hooks/use-image-upload.ts`), então o texto fica na casa de dezenas de KB,
 * não megabytes. O limite abaixo é a rede de segurança contra alguém burlar
 * o redimensionamento do navegador.
 */
const TAMANHO_MAXIMO = 300 * 1024

export const PATCH = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ avatarUrl?: unknown } | null>(requisicao, { bytes: TAMANHO_MAXIMO + 1024, texto: TAMANHO_MAXIMO })

  if (!dados || typeof dados !== "object" || !("avatarUrl" in dados)) throw new ErroDeUso("Informe uma foto ou remova a atual.")

  if (dados.avatarUrl !== null) {
    if (typeof dados.avatarUrl !== "string" || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(dados.avatarUrl)) {
      throw new ErroDeUso("A foto precisa ser uma imagem.")
    }
    if (dados.avatarUrl.length > TAMANHO_MAXIMO) {
      throw new ErroDeUso("Imagem grande demais mesmo depois de reduzida. Tente outra foto.")
    }
    const [cabecalho, base64] = dados.avatarUrl.split(",")
    const bytes = Buffer.from(base64, "base64")
    const formatoValido =
      (cabecalho === "data:image/jpeg;base64" && bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) ||
      (cabecalho === "data:image/png;base64" && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
      (cabecalho === "data:image/webp;base64" && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP")
    if (!formatoValido || bytes.toString("base64") !== base64) throw new ErroDeUso("Arquivo de imagem inválido.")
  }

  await prisma.usuario.update({
    where: { id: sessao.usuarioId },
    data: { avatarUrl: dados.avatarUrl },
  })

  return ok({ avatarUrl: dados.avatarUrl })
})

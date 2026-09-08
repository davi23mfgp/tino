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
  const dados = await corpo<{ avatarUrl: string | null }>(requisicao)

  if (dados.avatarUrl !== null) {
    if (!dados.avatarUrl.startsWith("data:image/")) {
      throw new ErroDeUso("A foto precisa ser uma imagem.")
    }
    if (dados.avatarUrl.length > TAMANHO_MAXIMO) {
      throw new ErroDeUso("Imagem grande demais mesmo depois de reduzida. Tente outra foto.")
    }
  }

  await prisma.usuario.update({
    where: { id: sessao.usuarioId },
    data: { avatarUrl: dados.avatarUrl },
  })

  return ok({ avatarUrl: dados.avatarUrl })
})

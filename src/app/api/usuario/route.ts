import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { criarToken, gravarCookieSessao } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const TIPOS_DE_CASA = ["SOLO", "CASAL", "FAMILIA"] as const
/// Quem pode renomear a casa: quem é dono dela. Dependente, convidado e
/// funcionário da loja veem o nome, mas não mudam para todo mundo.
const MUDAM_A_CASA = ["TITULAR", "CONJUGE"]

export const GET = comSessao(async (sessao) => {
  const [usuario, lar] = await Promise.all([
    prisma.usuario.findUniqueOrThrow({ where: { id: sessao.usuarioId }, select: { nome: true, avatarUrl: true, email: true } }),
    // O perfil mostra de que casa a pessoa é ("Casa da Nicole · casal").
    prisma.lar.findUnique({ where: { id: sessao.larId }, select: { nome: true, tipo: true } }),
  ])
  return ok({ ...usuario, lar, podeMudarCasa: MUDAM_A_CASA.includes(sessao.papel) })
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

/**
 * Perfil num lugar só (Davi, 29/09/2026: "tem que ter um jeito de poder mudar
 * nome, foto e etc tudo junto"). Cada campo é opcional: a foto continua
 * salvando sozinha ao escolher, e o formulário manda nome e casa juntos.
 */
export const PATCH = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ avatarUrl?: unknown; nome?: unknown; casaNome?: unknown; casaTipo?: unknown } | null>(requisicao, { bytes: TAMANHO_MAXIMO + 1024, texto: TAMANHO_MAXIMO })

  if (!dados || typeof dados !== "object" || !["avatarUrl", "nome", "casaNome", "casaTipo"].some((campo) => campo in dados)) {
    throw new ErroDeUso("Nada para salvar.")
  }

  const nome = "nome" in dados ? texto(dados.nome, "Seu nome") : undefined
  const casaNome = "casaNome" in dados ? texto(dados.casaNome, "O nome da casa") : undefined
  let casaTipo: (typeof TIPOS_DE_CASA)[number] | undefined
  if ("casaTipo" in dados) {
    if (!TIPOS_DE_CASA.includes(dados.casaTipo as (typeof TIPOS_DE_CASA)[number])) throw new ErroDeUso("Escolha quem mora na casa.")
    casaTipo = dados.casaTipo as (typeof TIPOS_DE_CASA)[number]
  }
  if ((casaNome !== undefined || casaTipo !== undefined) && !MUDAM_A_CASA.includes(sessao.papel)) {
    throw new ErroDeUso("Só quem é dono da casa muda o nome dela.", 403)
  }

  if ("avatarUrl" in dados && dados.avatarUrl !== null) {
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

  const avatarUrl = "avatarUrl" in dados ? (dados.avatarUrl as string | null) : undefined
  await prisma.$transaction([
    prisma.usuario.update({ where: { id: sessao.usuarioId }, data: { avatarUrl, nome } }),
    // O nome também mora no membro: é ele que aparece na divisão do casal.
    ...(nome !== undefined && sessao.membroId ? [prisma.membro.update({ where: { id: sessao.membroId }, data: { nome } })] : []),
    ...(casaNome !== undefined || casaTipo !== undefined ? [prisma.lar.update({ where: { id: sessao.larId }, data: { nome: casaNome, tipo: casaTipo } })] : []),
  ])

  // O nome vai no token ("Olá, Nicole" vem dele): sem regravar, o nome novo só
  // apareceria no próximo login.
  if (nome !== undefined && nome !== sessao.nome) await gravarCookieSessao(await criarToken({ ...sessao, nome }))

  return ok({ avatarUrl, nome, casaNome, casaTipo })
})

function texto(valor: unknown, rotulo: string): string {
  if (typeof valor !== "string" || !valor.trim()) throw new ErroDeUso(`${rotulo} não pode ficar em branco.`)
  const limpo = valor.trim().replace(/\s+/g, " ")
  if (limpo.length > 80) throw new ErroDeUso(`${rotulo} pode ter até 80 letras.`)
  return limpo
}

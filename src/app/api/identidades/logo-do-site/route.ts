import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { logoDaInternet, siteLimpo } from "@/lib/logo-da-internet"

/**
 * Busca o logo pelo site da loja, para a pessoa associar a uma compra.
 *
 * Devolve a imagem pronta (data URL) e não grava nada: quem grava é o PUT de
 * `/api/identidades`, depois que a pessoa vê a prévia e confirma. Guardar a
 * imagem, e não o endereço, faz o logo continuar aparecendo mesmo que o
 * serviço de ícones saia do ar.
 */
export const POST = comSessao(async (_sessao, requisicao) => {
  const dados = await corpo<{ site?: unknown }>(requisicao)
  const site = typeof dados?.site === "string" ? siteLimpo(dados.site) : null
  if (!site) throw new ErroDeUso("Informe o site da loja, como loja.com.br.")

  const logo = await logoDaInternet(site)
  // O cadastro aceita PNG, JPEG e WebP. Ícone .ico, que alguns sites só têm,
  // fica de fora: a pessoa pode enviar a imagem.
  if (!logo || !["image/png", "image/jpeg", "image/webp"].includes(logo.tipo)) {
    throw new ErroDeUso(`Não achei o logo de ${site}. Envie uma imagem ou escolha um emoji.`)
  }
  return ok({ site, logoUrl: `data:${logo.tipo};base64,${logo.bytes.toString("base64")}` })
})

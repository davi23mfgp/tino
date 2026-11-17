import { redirect } from "next/navigation"

import { getSessao } from "@/lib/auth"
import { registrarCaptura } from "@/lib/captura"
import { prisma } from "@/lib/prisma"
import { arquivoAceito, nomeSeguro } from "@/lib/importar/arquivo-compartilhado"

export const dynamic = "force-dynamic"

/**
 * Alvo da folha de compartilhamento do Android (`share_target` no manifest).
 *
 * A pessoa recebe o aviso de compra do banco, toca em "Compartilhar" e escolhe
 * o Tino. O Android faz um POST de formulário PARA CÁ, como navegação — não é
 * fetch. Por isso esta rota não devolve JSON: ela grava e manda o navegador
 * para a fila de conferência, que é onde a pessoa espera cair.
 *
 * Existe para tirar o MacroDroid do caminho. O jeito antigo (MacroDroid ou
 * Tasker chamando `/api/capturar` com chave) continua valendo e é o único que
 * captura sozinho, sem toque; este aqui cobra um toque por compra, mas não
 * cobra instalar nada nem gerar chave, e é o que a maioria vai usar.
 *
 * Autentica pelo cookie de sessão, não por chave: o compartilhamento vem do
 * navegador da própria pessoa, que já está logada no app instalado. Chave aqui
 * seria burocracia sem ganho — a mesma decisão já tomada em
 * `/api/capturas/rapida`.
 */
export async function POST(requisicao: Request) {
  const sessao = await getSessao()
  if (!sessao) redirect("/login")

  let texto = ""
  // `redirect` lança por dentro: dentro do `try` cairia no `catch` abaixo e
  // mandaria o arquivo bom para "vazio". O destino é decidido aqui e o
  // redirecionamento acontece fora.
  let destinoDoArquivo: string | null = null
  try {
    const formulario = await requisicao.formData()
    // Fatura ou extrato compartilhado do app do banco (16/11/2026): o arquivo
    // espera numa gaveta de uma hora e a pessoa cai na tela de importar com
    // ele já escolhido. Não é lido aqui: falta dizer em qual conta entra, e
    // nada entra sem a conferência dela (regra 5).
    const arquivo = formulario.getAll("arquivo").find((valor): valor is File => valor instanceof File && valor.size > 0)
    if (arquivo) {
      if (!arquivoAceito(arquivo.name, arquivo.size)) destinoDoArquivo = "/importar?compartilhado=recusado"
      else {
      const dados = { larId: sessao.larId, nome: nomeSeguro(arquivo.name), conteudo: Buffer.from(await arquivo.arrayBuffer()), criadoEm: new Date() }
      await prisma.arquivoCompartilhado.upsert({ where: { usuarioId: sessao.usuarioId }, create: { usuarioId: sessao.usuarioId, ...dados }, update: dados })
      destinoDoArquivo = "/importar?compartilhado=arquivo"
      }
    }
    // O Android nem sempre manda os três campos, e qual deles carrega o aviso
    // muda conforme o app de origem: uns põem tudo em `texto`, outros separam
    // título e corpo. Juntar o que veio custa nada e evita perder a compra.
    texto = ["titulo", "texto", "endereco"]
      .map((campo) => formulario.get(campo))
      .filter((valor): valor is string => typeof valor === "string" && valor.trim() !== "")
      .join(" ")
      .trim()
  } catch {
    if (destinoDoArquivo) redirect(destinoDoArquivo)
    // Corpo ilegível é problema de quem mandou, não da pessoa. Ela já está
    // olhando a tela: manda para a fila com o aviso em vez de tela de erro.
    redirect("/capturas?compartilhado=vazio")
  }

  if (destinoDoArquivo) redirect(destinoDoArquivo)
  if (!texto) redirect("/capturas?compartilhado=vazio")

  const resultado = await registrarCaptura({
    larId: sessao.larId,
    texto,
    origem: "COMPARTILHAMENTO",
  })

  redirect(`/capturas?compartilhado=${resultado.status.toLowerCase()}`)
}

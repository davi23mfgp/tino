/**
 * A entrada do aparelho no servidor: confere o pedido e cifra a senha.
 * As regras puras (peças, IMEI, garantia) moram em `./assistencia`.
 */

import { abrirSegredo, cifrarSegredo } from "@/lib/criptografia"
// Direto do zod e de erro-de-uso, e não de `@/lib/validar` e `@/lib/api`:
// estes puxam o banco e a sessão, e as regras daqui são testadas sem os dois.
import { z } from "zod"
import { ErroDeUso } from "@/lib/erro-de-uso"
import { TIPOS_DE_APARELHO, lerAcessorios, lerEstado, senhaValida, type TipoDeSenha } from "./assistencia"
import type { TipoDeAparelho } from "./modelos"

const texto = (maximo: number) => z.string().trim().max(maximo)

export const esquemaDoAparelho = z.object({
  modelo: texto(80).optional(),
  cor: texto(30).optional(),
  serie: texto(40).optional(),
  tipo: z.enum(TIPOS_DE_APARELHO as [TipoDeAparelho, ...TipoDeAparelho[]]),
  acessorios: z.array(texto(40).min(1)).max(12).optional(),
  estado: z.record(z.string(), z.enum(["ok", "defeito", "nao_testado"])).optional(),
  senhaTipo: z.enum(["PADRAO", "NUMERO", "NENHUMA"]).optional(),
  /// Vem só quando muda: editar a OS sem mexer na senha não manda a senha de volta.
  senha: z.string().max(32).optional(),
})

export type PedidoDoAparelho = z.infer<typeof esquemaDoAparelho>

/**
 * O contexto da cifra é o link da OS: a senha de uma OS não abre com o dado
 * de outra, mesmo que alguém troque as colunas no banco.
 */
const contexto = (linkToken: string) => `os-senha:${linkToken}`

export function gravacaoDoAparelho(pedido: PedidoDoAparelho, linkToken: string) {
  const tipo = pedido.tipo
  const dados: Record<string, unknown> = {
    aparelhoModelo: pedido.modelo?.trim() || null,
    aparelhoCor: pedido.cor?.trim() || null,
    aparelhoSerie: pedido.serie?.replace(/\s+/g, " ").trim() || null,
    aparelhoTipo: tipo,
    ...(pedido.acessorios ? { acessorios: lerAcessorios(pedido.acessorios) } : {}),
    ...(pedido.estado ? { estadoEntrada: lerEstado(pedido.estado, tipo) } : {}),
  }
  if (pedido.senhaTipo) {
    const senhaTipo = pedido.senhaTipo as TipoDeSenha
    if (senhaTipo === "NENHUMA") {
      Object.assign(dados, { senhaTipo, senhaCifrada: null })
    } else if (pedido.senha !== undefined) {
      if (!senhaValida(senhaTipo, pedido.senha)) {
        throw new ErroDeUso(senhaTipo === "PADRAO" ? "O padrão precisa de 4 a 9 pontos, sem repetir." : "Escreva a senha do aparelho.")
      }
      let senhaCifrada: string
      try {
        senhaCifrada = cifrarSegredo(pedido.senha, contexto(linkToken))
      } catch {
        // Sem a chave do servidor, guardar a senha seria guardar em texto puro.
        throw new ErroDeUso("Não deu para guardar a senha com segurança agora. Abra a OS sem a senha e anote no aparelho.", 503)
      }
      Object.assign(dados, { senhaTipo, senhaCifrada })
    } else {
      Object.assign(dados, { senhaTipo })
    }
  }
  return dados
}

export function abrirSenhaDaOrdem(senhaCifrada: string, linkToken: string): string {
  return abrirSegredo(senhaCifrada, contexto(linkToken))
}

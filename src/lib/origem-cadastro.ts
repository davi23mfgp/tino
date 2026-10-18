/**
 * De onde veio o cadastro (item 1.6 do plano, parte automática).
 *
 * Estudo: `docs/pesquisas/2026-10-06-origem-do-cadastro.md`. Sem isso o Davi
 * não sabe se o cliente que paga veio do anúncio, do contador ou do link de
 * orçamento que outro cliente mandou, e gasta tempo no canal errado.
 *
 * O que fica guardado é só o que veio no link (`utm_*`, `ref`), a primeira
 * página e o site de onde a pessoa clicou, sem o caminho: o caminho do site
 * de fora pode carregar dado pessoal (um link de busca com o nome da pessoa).
 *
 * Vale a **primeira** chegada, com uma exceção: chegada marcada (com campanha
 * ou indicação) substitui a sem marca. Quem viu o anúncio depois de entrar
 * uma vez pela busca veio, de fato, pelo anúncio; o contrário não vale,
 * senão a última busca apagaria a indicação que trouxe a pessoa.
 */

export const COOKIE_ORIGEM = "tino_origem"
export const DIAS_ORIGEM = 30

export interface OrigemCadastro {
  fonte?: string
  meio?: string
  campanha?: string
  ref?: string
  /** Primeira página do Tino que a pessoa abriu. */
  entrada: string
  /** Só o domínio do site de onde clicou. */
  site?: string
  /** ISO da chegada. */
  em: string
}

const TAMANHO = 80

/** Corta e tira o que não é texto simples: o valor vem de link que qualquer um monta. */
function limpo(valor: string | null | undefined): string | undefined {
  if (!valor) return undefined
  const texto = valor.replace(/[^\p{L}\p{N}._\-+ /@]/gu, "").trim().slice(0, TAMANHO)
  return texto || undefined
}

export function temMarca(origem: Pick<OrigemCadastro, "fonte" | "meio" | "campanha" | "ref">): boolean {
  return Boolean(origem.fonte || origem.meio || origem.campanha || origem.ref)
}

/** Lê a chegada desta requisição. O próprio Tino como site de origem não conta. */
export function lerChegada(url: URL, referer: string | null, agora: Date): OrigemCadastro {
  let site: string | undefined
  if (referer) {
    try {
      const host = new URL(referer).hostname
      if (host && host !== url.hostname) site = limpo(host)
    } catch {
      // Referer quebrado: fica sem site, não sem cadastro.
    }
  }
  const origem: OrigemCadastro = { entrada: limpo(url.pathname) ?? "/", em: agora.toISOString() }
  const marcas = { fonte: "utm_source", meio: "utm_medium", campanha: "utm_campaign", ref: "ref" } as const
  for (const [chave, parametro] of Object.entries(marcas) as [keyof typeof marcas, string][]) {
    const lido = limpo(url.searchParams.get(parametro))
    if (lido) origem[chave] = lido
  }
  if (site) origem.site = site
  return origem
}

/** O que gravar no cookie: a nova chegada, ou `null` para manter a que já está. */
export function decidirOrigem(atual: OrigemCadastro | null, nova: OrigemCadastro): OrigemCadastro | null {
  if (!atual) return nova
  if (!temMarca(atual) && temMarca(nova)) return nova
  return null
}

export function codificarOrigem(origem: OrigemCadastro): string {
  return Buffer.from(JSON.stringify(origem)).toString("base64url")
}

/** Lê o cookie de volta. Qualquer coisa fora do formato vira `null`, nunca erro de cadastro. */
export function decodificarOrigem(valor: string | null | undefined): OrigemCadastro | null {
  if (!valor || valor.length > 1200) return null
  try {
    const bruto = JSON.parse(Buffer.from(valor, "base64url").toString("utf8")) as Record<string, unknown>
    if (typeof bruto !== "object" || bruto === null) return null
    const texto = (chave: string) => (typeof bruto[chave] === "string" ? limpo(bruto[chave] as string) : undefined)
    const em = typeof bruto.em === "string" && !Number.isNaN(Date.parse(bruto.em)) ? new Date(bruto.em).toISOString() : null
    const entrada = texto("entrada")
    if (!em || !entrada) return null
    const origem: OrigemCadastro = { entrada, em }
    for (const chave of ["fonte", "meio", "campanha", "ref", "site"] as const) {
      const lido = texto(chave)
      if (lido) origem[chave] = lido
    }
    return origem
  } catch {
    return null
  }
}

/** Lê o cookie do cabeçalho `Cookie` de uma requisição de cadastro. */
export function origemDaRequisicao(requisicao: Request): OrigemCadastro | null {
  const cabecalho = requisicao.headers.get("cookie") ?? ""
  const par = cabecalho.split(/;\s*/).find((item) => item.startsWith(`${COOKIE_ORIGEM}=`))
  return decodificarOrigem(par?.slice(COOKIE_ORIGEM.length + 1))
}

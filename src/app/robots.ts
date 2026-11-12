import type { MetadataRoute } from "next"

import { ENDERECO_DO_SITE } from "@/lib/site"

/**
 * Só a vitrine, o MEI e os textos legais interessam ao buscador. O app, a API
 * e o admin ficam fora: além de não ter o que indexar, listar o caminho do
 * admin aqui seria anunciá-lo, então ele cai na regra geral de `/api` e no
 * `noindex` da própria página.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/para-mei", "/termos", "/privacidade"], disallow: ["/api/", "/painel", "/loja", "/o/", "/s/", "/convite", "/compartilhar"] },
    sitemap: `${ENDERECO_DO_SITE}/sitemap.xml`,
  }
}

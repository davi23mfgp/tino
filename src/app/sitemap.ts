import type { MetadataRoute } from "next"

import { ENDERECO_DO_SITE } from "@/lib/site"

/** As quatro páginas públicas. Login e cadastro levam `noindex` e não entram. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: ENDERECO_DO_SITE, changeFrequency: "weekly", priority: 1 },
    { url: `${ENDERECO_DO_SITE}/para-mei`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${ENDERECO_DO_SITE}/termos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${ENDERECO_DO_SITE}/privacidade`, changeFrequency: "yearly", priority: 0.2 },
  ]
}

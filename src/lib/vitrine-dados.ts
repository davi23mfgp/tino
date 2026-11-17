import { unstable_cache } from "next/cache"

import { diasDeTesteVigentes, planosVigentes } from "@/lib/parametros"

/**
 * Preço e dias de teste para as páginas públicas, guardados por 5 minutos.
 *
 * O `revalidate = 300` da vitrine não valia: o layout raiz lê `headers()` para
 * o nonce da política de conteúdo, e isso torna toda página dinâmica. Resultado
 * medido na auditoria (achado 16): cada visita ao site consultava o banco.
 *
 * Tornar a página estática exigiria tirar o nonce, e sem nonce a política teria
 * de aceitar script embutido qualquer (`unsafe-inline`), o que abre a porta
 * para injeção. Então a página continua dinâmica e só a consulta fica em cache.
 *
 * Fica fora de `lib/parametros.ts` de propósito: a cobrança e o admin leem o
 * valor fresco de lá, e o teste de preços importa aquele arquivo sem o Next.
 * Quando o admin muda um preço, `revalidateTag("parametros")` limpa este cache.
 */
export const planosDaVitrine = unstable_cache(planosVigentes, ["vitrine-planos"], { revalidate: 300, tags: ["parametros"] })
export const diasDeTesteDaVitrine = unstable_cache(diasDeTesteVigentes, ["vitrine-dias"], { revalidate: 300, tags: ["parametros"] })

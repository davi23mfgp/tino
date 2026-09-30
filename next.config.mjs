/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Permite validar em notebooks com pouca memória sem abrir um worker por CPU.
  ...(process.env.TINO_BUILD_LEVE === "1" ? { experimental: { cpus: 1 } } : {}),
  allowedDevOrigins: ['lubricant-parcel-elaborate.ngrok-free.dev'],

  // O Prisma só roda no motor binário do Postgres (libquery_engine-*.so.node),
  // mas o rastreador de arquivos do Next (@vercel/nft) enxerga, dentro do
  // runtime do @prisma/client, referência textual aos três motores wasm
  // (mysql, sqlite, postgresql) e empacota os três em TODA rota de API —
  // uns 6MB por rota que nunca executam. Com 76 rotas isso vira armazenamento
  // de function inflado sem motivo. Exclui os wasm de todas as rotas.
  outputFileTracingExcludes: {
    '/*': ['./node_modules/@prisma/client/runtime/query_engine_bg.*'],
  },

  images: {
    // A lista padrão do Next é 16, 32, 48, 64, 96, 128, 256 e 384. Para uma
    // imagem de tamanho fixo ele monta o srcset com a largura pedida e o dobro
    // dela — e 96px, que é o tamanho do mascote no cartão de recado, pedia 192.
    // 192 não está na lista, o otimizador respondia 400 e a imagem não
    // aparecia. Falhava calada: nenhum erro no console do servidor, só um
    // espaço em branco onde devia estar o desenho.
    //
    // 72 entra pelo mesmo motivo, para o mascote de 36px da coluna lateral.
    imageSizes: [16, 32, 48, 64, 72, 96, 128, 192, 256, 384],
  },

  // Headers de segurança globais
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // HTML recebe CSP com nonce no proxy. Arquivos estáticos recebem
          // este piso sem permissão para scripts embutidos.
          { key: "Content-Security-Policy", value: "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" },
        ],
      },
      // Manifest sempre revalidado (para o SO pegar nome/ícone novos rápido).
      {
        source: "/manifest.json",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ]
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['lubricant-parcel-elaborate.ngrok-free.dev'],

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
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // CSP: última linha de defesa contra XSS. Se algum dia um script
          // estranho entrar por conteúdo do usuário, ele não consegue mandar
          // dado para fora nem carregar código de outro domínio.
          //
          // 'unsafe-inline'/'unsafe-eval' em script-src são exigidos pelo
          // runtime do Next (hidratação e dev). Mesmo assim vale ter a política:
          // connect-src e frame-ancestors continuam fechando exfiltração e
          // clickjacking, que é o que costuma virar incidente.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              // data: cobre logo e imagens embutidas; blob: cobre pré-visualização de upload
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              // Só a própria origem e as APIs que realmente usamos
              "connect-src 'self' https://api.telegram.org https://api.resend.com",
              "media-src 'self' https:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
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

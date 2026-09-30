export function politicaDeConteudo(nonce: string, desenvolvimento = false): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${desenvolvimento ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://api.telegram.org https://api.resend.com${desenvolvimento ? " ws: wss:" : ""}`,
    "media-src 'self' https:",
    "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
    ...(!desenvolvimento ? ["upgrade-insecure-requests"] : []),
  ].join("; ")
}

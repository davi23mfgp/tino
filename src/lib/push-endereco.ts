/**
 * Endereço de notificação aceito.
 *
 * O navegador entrega um endereço do serviço de push dele, e o servidor manda
 * um POST para esse endereço todo dia. Aceitar qualquer URL deixava uma pessoa
 * logada fazer o servidor do Tino chamar o endereço que quisesse, inclusive
 * dentro da rede da hospedagem (auditoria, 10/11/2026). Só os serviços de push
 * dos navegadores de verdade passam.
 */
const SERVICOS = [
  /^fcm\.googleapis\.com$/, // Chrome, Edge e Android
  /^updates\.push\.services\.mozilla\.com$/, // Firefox
  /^web\.push\.apple\.com$/, // Safari e iPhone
  /\.notify\.windows\.com$/, // Windows
  /^push\.services\.mozilla\.com$/,
]

export function enderecoDePushValido(endereco: unknown): string | null {
  if (typeof endereco !== "string" || endereco.length > 1000) return null
  let url: URL
  try {
    url = new URL(endereco)
  } catch {
    return null
  }
  if (url.protocol !== "https:" || url.port || url.username || url.password) return null
  return SERVICOS.some((servico) => servico.test(url.hostname)) ? url.toString() : null
}

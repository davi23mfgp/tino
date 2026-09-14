/** Ícones publicados nos sites oficiais, consultados em 10/09/2026.
 * Sem URL confirmada, a interface mostra iniciais; nunca aproxima uma marca.
 * URLs remotas podem mudar: o fallback faz parte do contrato de exibição.
 */
export interface BancoPerfil { nome: string; aliases: string[]; logoUrl?: string }
export const BANCOS_PERFIL: BancoPerfil[] = [
  { nome: "Nubank", aliases: ["nu", "nu pagamentos"], logoUrl: "https://nubank.com.br/favicon.ico" },
  { nome: "Itaú", aliases: ["itau", "itaú unibanco", "itau unibanco"], logoUrl: "https://www.itau.com.br/media/dam/m/4b2c52dd8411f2d5/original/logo-32px.png" },
  { nome: "Bradesco", aliases: ["banco bradesco"] },
  { nome: "Santander", aliases: ["banco santander"], logoUrl: "https://www.santander.com.br/sites/WPC_CMS/imagem/21-03-26_095020_M_favicon.png" },
  { nome: "C6 Bank", aliases: ["c6", "banco c6"] },
  { nome: "Inter", aliases: ["banco inter"], logoUrl: "https://inter.co/favicon-32x32.png" },
  { nome: "Banco do Brasil", aliases: ["bb"] },
  { nome: "Caixa", aliases: ["caixa econômica federal", "cef"] },
  { nome: "BTG Pactual", aliases: ["btg"] },
  { nome: "XP", aliases: ["xp investimentos", "banco xp"] },
  { nome: "Sicoob", aliases: [] },
  { nome: "Sicredi", aliases: [] },
  { nome: "Mercado Pago", aliases: ["mercadopago"] },
  { nome: "PagBank", aliases: ["pagseguro"] },
  { nome: "PicPay", aliases: [] },
]
export function normalizarBanco(nome: string) {
  return nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR")
}
export function encontrarBanco(nome: string) {
  const busca = normalizarBanco(nome)
  return BANCOS_PERFIL.find((banco) => [banco.nome, ...banco.aliases].some((apelido) => normalizarBanco(apelido) === busca))
}

/** Cor decorativa de apoio; não substitui o ícone oficial da instituição. */
export function corDoBanco(instituicao: string | null | undefined): string {
  const nome = encontrarBanco(instituicao ?? "")?.nome
  // Cores institucionais publicadas pelas próprias marcas. O Banco do Brasil e a
  // XP usam o azul e o preto da marca, não o amarelo: o cartão é pintado inteiro
  // e texto branco sobre amarelo não passa em contraste.
  const cores: Record<string, string> = {
    Nubank: "#820ad1", "Itaú": "#ec7000", Bradesco: "#cc092f", Santander: "#ea1d25",
    "C6 Bank": "#242424", Inter: "#ff7a00", "Banco do Brasil": "#0038a8", Caixa: "#0070af",
    "BTG Pactual": "#002c5f", XP: "#141414", Sicoob: "#00ae9d", Sicredi: "#3fa110",
    "Mercado Pago": "#00a1ea", PagBank: "#00a868", PicPay: "#11c76f",
  }
  return nome && cores[nome] ? cores[nome] : "var(--primary)"
}

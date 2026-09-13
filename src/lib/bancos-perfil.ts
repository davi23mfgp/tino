/**
 * Catálogo de instituições financeiras.
 *
 * ASSETS LOCAIS, não URL remota. A versão anterior apontava para o favicon do
 * site de cada banco, e isso quebrou de três formas ao mesmo tempo: o Itaú
 * passou a responder 403 para requisição sem sessão (o logo sumia da tela sem
 * aviso), o Bradesco servia um .ico de 299 KB para desenhar 40 px, e qualquer
 * troca de CDN do banco apagava a marca do nosso app sem ninguém perceber.
 *
 * Agora o arquivo mora em `public/bancos/`, com a origem e a data da consulta
 * registradas em `docs/LOGOS-INSTITUICOES.md`. Sem asset confirmado, a
 * interface mostra ícone neutro e o nome por extenso — nunca uma marca
 * aproximada, nunca uma inicial solta como "BP" ou "X", que foi justamente o
 * que Davi apontou nas capturas de 13/09.
 */
export interface BancoPerfil {
  nome: string
  aliases: string[]
  /** Arquivo em `public/bancos/`. Ausente = instituição sem asset confirmado. */
  logo?: string
  /** Instituição de investimento: aparece no cadastro de conta de investimento. */
  investimento?: boolean
}

export const BANCOS_PERFIL: BancoPerfil[] = [
  { nome: "Nubank", aliases: ["nu", "nu pagamentos"], logo: "/bancos/nubank.png" },
  { nome: "Itaú", aliases: ["itau", "itaú unibanco", "itau unibanco"] },
  { nome: "Bradesco", aliases: ["banco bradesco"], logo: "/bancos/bradesco.png" },
  { nome: "Santander", aliases: ["banco santander"], logo: "/bancos/santander.ico" },
  { nome: "C6 Bank", aliases: ["c6", "banco c6"], logo: "/bancos/c6.png" },
  { nome: "Inter", aliases: ["banco inter"], logo: "/bancos/inter.png" },
  { nome: "Banco do Brasil", aliases: ["bb"], logo: "/bancos/bb.ico" },
  { nome: "Caixa", aliases: ["caixa econômica federal", "cef"], logo: "/bancos/caixa.ico" },
  { nome: "BTG Pactual", aliases: ["btg"], investimento: true },
  { nome: "XP", aliases: ["xp investimentos", "banco xp", "xp inc"], investimento: true },
  { nome: "Sicoob", aliases: [], logo: "/bancos/sicoob.png" },
  { nome: "Sicredi", aliases: [], logo: "/bancos/sicredi.png" },
  { nome: "Mercado Pago", aliases: ["mercadopago"], logo: "/bancos/mercadopago.svg" },
  { nome: "PagBank", aliases: ["pagseguro"], logo: "/bancos/pagbank.svg" },
  { nome: "PicPay", aliases: [], logo: "/bancos/picpay.svg" },
  { nome: "Rico", aliases: ["rico investimentos"], investimento: true },
  { nome: "Clear", aliases: ["clear corretora"], investimento: true },
  { nome: "Avenue", aliases: [], investimento: true },
  { nome: "Nomad", aliases: [], investimento: true },
]

/** As que entram no seletor de conta de investimento, em ordem alfabética. */
export const INSTITUICOES_INVESTIMENTO = BANCOS_PERFIL.filter((banco) => banco.investimento)

export function normalizarBanco(nome: string) {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLocaleLowerCase("pt-BR")
}

export function encontrarBanco(nome: string) {
  const busca = normalizarBanco(nome)
  return BANCOS_PERFIL.find((banco) => [banco.nome, ...banco.aliases].some((apelido) => normalizarBanco(apelido) === busca))
}

/** Cor decorativa de apoio; não substitui o ícone oficial da instituição. */
export function corDoBanco(instituicao: string | null | undefined): string {
  const nome = encontrarBanco(instituicao ?? "")?.nome
  const cores: Record<string, string> = {
    Nubank: "#820ad1",
    "Itaú": "#ec7000",
    Bradesco: "#cc092f",
    Santander: "#ea1d25",
    "C6 Bank": "#242424",
    Inter: "#ff7a00",
    "Banco do Brasil": "#f9dd16",
    Caixa: "#1c5ca8",
    "BTG Pactual": "#03305f",
    XP: "#0f0f0f",
    Sicoob: "#00ae9d",
    Sicredi: "#3fa110",
    "Mercado Pago": "#00b1ea",
    PagBank: "#00a868",
    PicPay: "#21c25e",
  }
  return nome && cores[nome] ? cores[nome] : "var(--primary)"
}

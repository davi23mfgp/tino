/**
 * Catálogo de instituições financeiras.
 *
 * ASSETS LOCAIS, não URL remota. A versão anterior apontava para o favicon do
 * site de cada banco, e isso quebrou de três formas ao mesmo tempo: o Itaú
 * passou a responder 403 para requisição sem sessão (o logo sumia da tela sem
 * aviso), o Bradesco servia um .ico de 299 KB para desenhar 40 px, e qualquer
 * troca de CDN do banco apagava a marca do nosso app sem ninguém perceber.
 *
 * Desde 28/09/2026 os arquivos de `public/bancos/` vêm do pacote
 * `logos-bancos-br` (MIT), que tira cada logo do diretório de participantes
 * do Open Finance Brasil ou do site oficial da instituição e registra a
 * origem. Davi pediu "todos os logos de banco para cadastro fácil": o
 * cadastro de conta abre numa grade com estes logos. Origem e data de cada
 * arquivo em `docs/LOGOS-INSTITUICOES.md`.
 *
 * Sem asset confirmado, a interface mostra ícone neutro e o nome por extenso
 * — nunca uma marca aproximada, nunca uma inicial solta como "BP" ou "X", que
 * foi justamente o que Davi apontou nas capturas de 13/09.
 */
export interface BancoPerfil {
  nome: string
  aliases: string[]
  /** Arquivo em `public/bancos/`. Ausente = instituição sem asset confirmado. */
  logo?: string
  /** Cor da marca, para o fundo do cartão. Tirada do próprio logo. */
  cor?: string
  /** Instituição de investimento: aparece no cadastro de conta de investimento. */
  investimento?: boolean
}

/// A ordem é a da grade do cadastro: os maiores bancos de varejo primeiro,
/// porque são os que quase todo mundo tem.
export const BANCOS_PERFIL: BancoPerfil[] = [
  { nome: "Nubank", aliases: ["nu", "nu pagamentos"], logo: "/bancos/nubank.png", cor: "#820ad1" },
  { nome: "Itaú", aliases: ["itau", "itaú unibanco", "itau unibanco", "itaucard"], logo: "/bancos/itau.png", cor: "#ec7000" },
  { nome: "Bradesco", aliases: ["banco bradesco", "bradescard"], logo: "/bancos/bradesco.png", cor: "#cc092f" },
  { nome: "Santander", aliases: ["banco santander"], logo: "/bancos/santander.png", cor: "#ea1d25" },
  { nome: "Banco do Brasil", aliases: ["bb"], logo: "/bancos/bb.png", cor: "#f9dd16" },
  { nome: "Caixa", aliases: ["caixa econômica federal", "caixa economica", "cef"], logo: "/bancos/caixa.png", cor: "#1c5ca8" },
  { nome: "Inter", aliases: ["banco inter"], logo: "/bancos/inter.png", cor: "#ff7a00" },
  { nome: "C6 Bank", aliases: ["c6", "banco c6"], logo: "/bancos/c6-bank.png", cor: "#242424" },
  { nome: "PicPay", aliases: [], logo: "/bancos/picpay.png", cor: "#21c25e" },
  { nome: "Mercado Pago", aliases: ["mercadopago"], logo: "/bancos/mercado-pago.png", cor: "#00b1ea" },
  { nome: "PagBank", aliases: ["pagseguro", "pag seguro"], logo: "/bancos/pagbank.png", cor: "#00a868" },
  { nome: "Neon", aliases: ["banco neon"], logo: "/bancos/neon.png", cor: "#0c9cfc" },
  { nome: "Banco Pan", aliases: ["pan"], logo: "/bancos/banco-pan.png", cor: "#0cb4e4" },
  { nome: "BTG Pactual", aliases: ["btg"], logo: "/bancos/btg-pactual.png", cor: "#03305f", investimento: true },
  { nome: "XP", aliases: ["xp investimentos", "banco xp", "xp inc"], logo: "/bancos/xp-investimentos.png", cor: "#0f0f0f", investimento: true },
  { nome: "Sicoob", aliases: [], logo: "/bancos/sicoob.png", cor: "#00ae9d" },
  { nome: "Sicredi", aliases: [], logo: "/bancos/sicredi.png", cor: "#3fa110" },
  { nome: "Cresol", aliases: [], logo: "/bancos/cresol.png", cor: "#e4840c" },
  { nome: "Unicred", aliases: [], logo: "/bancos/unicred.png", cor: "#9c843c" },
  { nome: "Ailos", aliases: [], logo: "/bancos/ailos.png", cor: "#0c5484" },
  { nome: "Agibank", aliases: [], logo: "/bancos/agibank.png", cor: "#0c6cfc" },
  { nome: "BMG", aliases: ["banco bmg"], logo: "/bancos/bmg.png", cor: "#fc6c0c" },
  { nome: "Digio", aliases: [], logo: "/bancos/digio.png", cor: "#242454" },
  { nome: "BV", aliases: ["banco bv", "banco votorantim"], logo: "/bancos/bv.png", cor: "#243ccc" },
  { nome: "Banrisul", aliases: ["banco banrisul"], logo: "/bancos/banrisul.png", cor: "#0c9cfc" },
  { nome: "BRB", aliases: ["banco de brasília", "banco de brasilia"], logo: "/bancos/brb.png", cor: "#1b3f8b" },
  { nome: "Banco do Nordeste", aliases: ["bnb"], logo: "/bancos/banco-do-nordeste.png", cor: "#9c243c" },
  { nome: "Banestes", aliases: [], logo: "/bancos/banestes.png", cor: "#0c549c" },
  { nome: "Banese", aliases: [], logo: "/bancos/banese.png", cor: "#246c3c" },
  { nome: "Banpará", aliases: [], logo: "/bancos/banpara.png", cor: "#e42424" },
  { nome: "Banco da Amazônia", aliases: ["basa"], logo: "/bancos/banco-da-amazonia.png", cor: "#0ce424" },
  { nome: "Safra", aliases: ["banco safra"], logo: "/bancos/safra.png", cor: "#0c0c3c" },
  { nome: "Sofisa", aliases: ["sofisa direto", "banco sofisa"], logo: "/bancos/sofisa.png", cor: "#0cb484" },
  { nome: "BS2", aliases: ["banco bs2"], logo: "/bancos/bs2.png", cor: "#0c24b4" },
  { nome: "Mercantil", aliases: ["banco mercantil"], logo: "/bancos/mercantil.png", cor: "#0c24fc" },
  { nome: "Cora", aliases: [], logo: "/bancos/cora.png", cor: "#fc3c6c" },
  { nome: "InfinitePay", aliases: ["infinite pay", "cloudwalk"], logo: "/bancos/infinitepay.png", cor: "#e4cc0c" },
  { nome: "Stone", aliases: ["ton"], logo: "/bancos/stone.png", cor: "#0ccc0c" },
  { nome: "SumUp", aliases: [], logo: "/bancos/sumup.png", cor: "#1a1a1a" },
  { nome: "Efí", aliases: ["efi", "gerencianet"], logo: "/bancos/efi.png", cor: "#fc6c24" },
  { nome: "Asaas", aliases: [], logo: "/bancos/asaas.png", cor: "#0c3ce4" },
  { nome: "99Pay", aliases: ["99 pay"], logo: "/bancos/99pay.png", cor: "#fce40c" },
  { nome: "MagaluPay", aliases: ["magalu pay", "magalu"], logo: "/bancos/magalupay.png", cor: "#0c84fc" },
  { nome: "Casas Bahia Pay", aliases: ["banqi", "casas bahia"], logo: "/bancos/casas-bahia-pay.png", cor: "#2454b4" },
  { nome: "iFood Pago", aliases: ["ifood"], logo: "/bancos/ifood-pago.png", cor: "#b40c54" },
  { nome: "RecargaPay", aliases: [], logo: "/bancos/recargapay.png", cor: "#fc843c" },
  { nome: "Wise", aliases: ["transferwise"] },
  { nome: "N26", aliases: ["banco n26"] },
  { nome: "American Express", aliases: ["amex"] },
  { nome: "Chase", aliases: ["jpmorgan chase"] },
  { nome: "HSBC", aliases: ["hongkong shanghai banking"] },
  { nome: "Revolut", aliases: [], logo: "/bancos/revolut.png", cor: "#191c1f" },
  { nome: "Social Bank", aliases: [], logo: "/bancos/social-bank.png", cor: "#243ce4" },
  { nome: "Midway", aliases: ["riachuelo", "cartão riachuelo"], logo: "/bancos/midway.png", cor: "#0c5454" },
  { nome: "Realize", aliases: ["renner", "cartão renner"], logo: "/bancos/realize.png", cor: "#2b2b2b" },
  { nome: "Banco Carrefour", aliases: ["carrefour", "atacadão", "cartão carrefour"], logo: "/bancos/banco-carrefour.png", cor: "#fc6c0c" },
  { nome: "Crefisa", aliases: [], logo: "/bancos/crefisa.png", cor: "#0c5484" },
  { nome: "Genial", aliases: ["genial investimentos"], logo: "/bancos/genial-investimentos.png", cor: "#0c249c", investimento: true },
  { nome: "Warren", aliases: [], logo: "/bancos/warren.png", cor: "#e4b484", investimento: true },
  { nome: "Ágora", aliases: ["agora investimentos", "ágora investimentos"], logo: "/bancos/agora.png", cor: "#0c3c54", investimento: true },
  { nome: "Mercado Bitcoin", aliases: ["mb"], logo: "/bancos/mercado-bitcoin.png", cor: "#e4540c", investimento: true },
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
  // Marca clara (o amarelo do Banco do Brasil) é legítima aqui: quem garante
  // o texto branco por cima é o véu escuro do cartão, não uma cor de marca
  // falseada.
  return encontrarBanco(instituicao ?? "")?.cor ?? "oklch(var(--primary))"
}

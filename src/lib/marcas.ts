/**
 * Lojas conhecidas, para o logo aparecer sem ninguém cadastrar nada.
 *
 * O texto da compra vem do banco do jeito que o banco quiser: "PAG*IFOOD",
 * "UBER *TRIP", "NETFLIX.COM", "SUPERMERCADO ASSAI". Cada loja tem os termos
 * que a identificam, e o site de onde o logo é puxado (`/api/logo/<site>`).
 *
 * A comparação é por PALAVRA inteira, nunca por pedaço: "uber" dentro de
 * "Uberlândia" ou "tim" dentro de "Timbó" não são essas lojas. Palavras que
 * são comuns demais sozinhas ("extra", "light", "azul", "gol", "oi") entram só
 * acompanhadas, para o logo não aparecer em compra que não é da marca — logo
 * errado na tela é pior do que nenhum.
 *
 * Banco não entra aqui: tem logo próprio, local, em `banco-perfil`.
 */
export interface Marca {
  nome: string
  site: string
  termos: string[]
}

export const MARCAS: Marca[] = [
  { nome: "iFood", site: "ifood.com.br", termos: ["ifood"] },
  { nome: "Uber", site: "uber.com", termos: ["uber", "ubertrip", "uber eats"] },
  { nome: "99", site: "99app.com", termos: ["99app", "99 app", "99 pop", "99pop", "99 taxi", "99 tecnologia"] },
  { nome: "Rappi", site: "rappi.com.br", termos: ["rappi"] },
  { nome: "Zé Delivery", site: "ze.delivery", termos: ["ze delivery", "zedelivery"] },
  { nome: "Netflix", site: "netflix.com", termos: ["netflix"] },
  { nome: "Spotify", site: "spotify.com", termos: ["spotify"] },
  { nome: "Deezer", site: "deezer.com", termos: ["deezer"] },
  { nome: "Disney+", site: "disneyplus.com", termos: ["disney", "disneyplus", "disney plus"] },
  { nome: "Max", site: "max.com", termos: ["hbo max", "hbomax", "max com"] },
  { nome: "Globoplay", site: "globoplay.globo.com", termos: ["globoplay"] },
  { nome: "YouTube", site: "youtube.com", termos: ["youtube", "google youtube", "youtubepremium"] },
  { nome: "Amazon", site: "amazon.com.br", termos: ["amazon", "amzn", "amazon prime", "prime video"] },
  { nome: "Apple", site: "apple.com", termos: ["apple", "apple com bill", "itunes", "icloud"] },
  { nome: "Google", site: "google.com", termos: ["google", "google one", "google play"] },
  { nome: "Microsoft", site: "microsoft.com", termos: ["microsoft", "xbox"] },
  { nome: "PlayStation", site: "playstation.com", termos: ["playstation", "psn"] },
  { nome: "Steam", site: "steampowered.com", termos: ["steam", "steampowered"] },
  { nome: "Mercado Livre", site: "mercadolivre.com.br", termos: ["mercado livre", "mercadolivre", "mercadolibre"] },
  { nome: "Mercado Pago", site: "mercadopago.com.br", termos: ["mercado pago", "mercadopago"] },
  { nome: "Shopee", site: "shopee.com.br", termos: ["shopee"] },
  { nome: "Shein", site: "shein.com", termos: ["shein"] },
  { nome: "AliExpress", site: "aliexpress.com", termos: ["aliexpress"] },
  { nome: "Temu", site: "temu.com", termos: ["temu"] },
  { nome: "Magalu", site: "magazineluiza.com.br", termos: ["magalu", "magazine luiza", "magazineluiza"] },
  { nome: "Americanas", site: "americanas.com.br", termos: ["americanas", "lojas americanas"] },
  { nome: "Casas Bahia", site: "casasbahia.com.br", termos: ["casas bahia", "casasbahia"] },
  { nome: "Kabum", site: "kabum.com.br", termos: ["kabum"] },
  { nome: "Carrefour", site: "carrefour.com.br", termos: ["carrefour"] },
  { nome: "Assaí", site: "assai.com.br", termos: ["assai", "assai atacadista"] },
  { nome: "Atacadão", site: "atacadao.com.br", termos: ["atacadao"] },
  { nome: "Pão de Açúcar", site: "paodeacucar.com", termos: ["pao de acucar", "paodeacucar"] },
  { nome: "Sam's Club", site: "samsclub.com.br", termos: ["sams club", "samsclub"] },
  { nome: "Drogasil", site: "drogasil.com.br", termos: ["drogasil"] },
  { nome: "Droga Raia", site: "drogaraia.com.br", termos: ["droga raia", "drogaraia", "raia drogasil"] },
  { nome: "Pague Menos", site: "paguemenos.com.br", termos: ["pague menos", "paguemenos"] },
  { nome: "Drogaria São Paulo", site: "drogariasaopaulo.com.br", termos: ["drogaria sao paulo"] },
  { nome: "Panvel", site: "panvel.com", termos: ["panvel"] },
  { nome: "Shell", site: "shell.com.br", termos: ["shell"] },
  { nome: "Ipiranga", site: "ipiranga.com.br", termos: ["ipiranga", "postos ipiranga"] },
  { nome: "Petrobras", site: "petrobras.com.br", termos: ["petrobras", "posto br", "br mania"] },
  { nome: "Sem Parar", site: "semparar.com.br", termos: ["sem parar", "semparar"] },
  { nome: "Smart Fit", site: "smartfit.com.br", termos: ["smart fit", "smartfit"] },
  { nome: "McDonald's", site: "mcdonalds.com.br", termos: ["mcdonalds", "mc donalds", "mcdonald s"] },
  { nome: "Burger King", site: "burgerking.com.br", termos: ["burger king", "burgerking"] },
  { nome: "Starbucks", site: "starbucks.com.br", termos: ["starbucks"] },
  { nome: "Outback", site: "outback.com.br", termos: ["outback"] },
  { nome: "Subway", site: "subway.com", termos: ["subway"] },
  { nome: "Renner", site: "lojasrenner.com.br", termos: ["renner", "lojas renner"] },
  { nome: "Riachuelo", site: "riachuelo.com.br", termos: ["riachuelo"] },
  { nome: "C&A", site: "cea.com.br", termos: ["c a modas", "cea modas", "c a lojas"] },
  { nome: "Zara", site: "zara.com", termos: ["zara"] },
  { nome: "Centauro", site: "centauro.com.br", termos: ["centauro"] },
  { nome: "Decathlon", site: "decathlon.com.br", termos: ["decathlon"] },
  { nome: "Netshoes", site: "netshoes.com.br", termos: ["netshoes"] },
  { nome: "Leroy Merlin", site: "leroymerlin.com.br", termos: ["leroy merlin", "leroymerlin"] },
  { nome: "Petz", site: "petz.com.br", termos: ["petz"] },
  { nome: "Cobasi", site: "cobasi.com.br", termos: ["cobasi"] },
  { nome: "Airbnb", site: "airbnb.com.br", termos: ["airbnb"] },
  { nome: "Booking", site: "booking.com", termos: ["booking", "booking com"] },
  { nome: "LATAM", site: "latamairlines.com", termos: ["latam", "latam airlines"] },
  { nome: "GOL", site: "voegol.com.br", termos: ["gol linhas", "voegol", "gol transportes"] },
  { nome: "Azul", site: "voeazul.com.br", termos: ["azul linhas", "voeazul", "azul linhas aereas"] },
  { nome: "Cinemark", site: "cinemark.com.br", termos: ["cinemark"] },
  { nome: "Sympla", site: "sympla.com.br", termos: ["sympla"] },
  { nome: "Vivo", site: "vivo.com.br", termos: ["vivo", "telefonica"] },
  { nome: "Claro", site: "claro.com.br", termos: ["claro", "claro sa", "net claro"] },
  { nome: "TIM", site: "tim.com.br", termos: ["tim", "tim celular"] },
  { nome: "Enel", site: "enel.com.br", termos: ["enel"] },
  { nome: "Sabesp", site: "sabesp.com.br", termos: ["sabesp"] },
  { nome: "Cemig", site: "cemig.com.br", termos: ["cemig"] },
]

const SEM_ACENTO = new RegExp("[\\u0300-\\u036f]", "g")
/** "PAG*IFOOD" → " pag ifood ": só letras e números, separados por um espaço. */
export function palavras(texto: string) {
  return ` ${texto.normalize("NFD").replace(SEM_ACENTO, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `
}

const SITES = new Set(MARCAS.map((marca) => marca.site))
export const siteConhecido = (site: string) => SITES.has(site)

/**
 * A loja da compra, se for uma das conhecidas.
 *
 * Com mais de uma no mesmo texto, ganha o termo com mais palavras ("google
 * youtube" é YouTube, não Google) e, empatado, o que aparece primeiro ("posto
 * shell ipiranga" é Shell: Ipiranga ali costuma ser o nome da rua).
 */
export function marcaDaCompra(descricao: string): Marca | null {
  const texto = palavras(descricao)
  let melhor: { marca: Marca; tamanho: number; posicao: number } | null = null
  for (const marca of MARCAS) {
    for (const termo of marca.termos) {
      const alvo = palavras(termo)
      const posicao = texto.indexOf(alvo)
      if (posicao < 0) continue
      const tamanho = alvo.trim().split(" ").length
      if (!melhor || tamanho > melhor.tamanho || (tamanho === melhor.tamanho && posicao < melhor.posicao)) {
        melhor = { marca, tamanho, posicao }
      }
    }
  }
  return melhor?.marca ?? null
}

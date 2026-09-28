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
  /**
   * Logo guardado no próprio app (`public/marcas/`), tirado do Simple Icons
   * (CC0) com a cor oficial da marca. Sem ele, o logo vem do site da loja
   * pelo servidor (`/api/logo/<site>`), que depende do serviço de ícones.
   */
  logo?: string
}

export const MARCAS: Marca[] = [
  { nome: "iFood", site: "ifood.com.br", termos: ["ifood"], logo: "/marcas/ifood.svg" },
  { nome: "Uber", site: "uber.com", termos: ["uber", "ubertrip", "uber eats"], logo: "/marcas/uber.svg" },
  { nome: "99", site: "99app.com", termos: ["99app", "99 app", "99 pop", "99pop", "99 taxi", "99 tecnologia"] },
  { nome: "Rappi", site: "rappi.com.br", termos: ["rappi"] },
  { nome: "Zé Delivery", site: "ze.delivery", termos: ["ze delivery", "zedelivery"] },
  { nome: "Netflix", site: "netflix.com", termos: ["netflix"], logo: "/marcas/netflix.svg" },
  { nome: "Spotify", site: "spotify.com", termos: ["spotify"], logo: "/marcas/spotify.svg" },
  { nome: "Deezer", site: "deezer.com", termos: ["deezer"], logo: "/marcas/deezer.svg" },
  { nome: "Disney+", site: "disneyplus.com", termos: ["disney", "disneyplus", "disney plus"] },
  { nome: "Max", site: "max.com", termos: ["hbo max", "hbomax", "max com"], logo: "/marcas/max.svg" },
  { nome: "Globoplay", site: "globoplay.globo.com", termos: ["globoplay"] },
  { nome: "YouTube", site: "youtube.com", termos: ["youtube", "google youtube", "youtubepremium"], logo: "/marcas/youtube.svg" },
  { nome: "Amazon", site: "amazon.com.br", termos: ["amazon", "amzn", "amazon prime", "prime video"] },
  { nome: "Apple", site: "apple.com", termos: ["apple", "apple com bill", "itunes"], logo: "/marcas/apple.svg" },
  { nome: "Google", site: "google.com", termos: ["google", "google one"], logo: "/marcas/google.svg" },
  { nome: "Microsoft", site: "microsoft.com", termos: ["microsoft", "xbox"] },
  { nome: "PlayStation", site: "playstation.com", termos: ["playstation", "psn"], logo: "/marcas/playstation.svg" },
  { nome: "Steam", site: "steampowered.com", termos: ["steam", "steampowered"], logo: "/marcas/steam.svg" },
  { nome: "Mercado Livre", site: "mercadolivre.com.br", termos: ["mercado livre", "mercadolivre", "mercadolibre"] },
  { nome: "Mercado Pago", site: "mercadopago.com.br", termos: ["mercado pago", "mercadopago"], logo: "/marcas/mercado-pago.svg" },
  { nome: "Shopee", site: "shopee.com.br", termos: ["shopee"], logo: "/marcas/shopee.svg" },
  { nome: "Shein", site: "shein.com", termos: ["shein"] },
  { nome: "AliExpress", site: "aliexpress.com", termos: ["aliexpress"], logo: "/marcas/aliexpress.svg" },
  { nome: "Temu", site: "temu.com", termos: ["temu"] },
  { nome: "Magalu", site: "magazineluiza.com.br", termos: ["magalu", "magazine luiza", "magazineluiza"] },
  { nome: "Americanas", site: "americanas.com.br", termos: ["americanas", "lojas americanas"] },
  { nome: "Casas Bahia", site: "casasbahia.com.br", termos: ["casas bahia", "casasbahia"] },
  { nome: "Kabum", site: "kabum.com.br", termos: ["kabum"] },
  { nome: "Carrefour", site: "carrefour.com.br", termos: ["carrefour"], logo: "/marcas/carrefour.svg" },
  { nome: "Assaí", site: "assai.com.br", termos: ["assai", "assai atacadista"] },
  { nome: "Atacadão", site: "atacadao.com.br", termos: ["atacadao"] },
  { nome: "Pão de Açúcar", site: "paodeacucar.com", termos: ["pao de acucar", "paodeacucar"] },
  { nome: "Sam's Club", site: "samsclub.com.br", termos: ["sams club", "samsclub"] },
  { nome: "Drogasil", site: "drogasil.com.br", termos: ["drogasil"] },
  { nome: "Droga Raia", site: "drogaraia.com.br", termos: ["droga raia", "drogaraia", "raia drogasil", "drogaria raia"] },
  { nome: "Pague Menos", site: "paguemenos.com.br", termos: ["pague menos", "paguemenos"] },
  { nome: "Drogaria São Paulo", site: "drogariasaopaulo.com.br", termos: ["drogaria sao paulo"] },
  { nome: "Panvel", site: "panvel.com", termos: ["panvel"] },
  { nome: "Shell", site: "shell.com.br", termos: ["shell"], logo: "/marcas/shell.svg" },
  { nome: "Ipiranga", site: "ipiranga.com.br", termos: ["ipiranga", "postos ipiranga"] },
  { nome: "Petrobras", site: "petrobras.com.br", termos: ["petrobras", "posto br", "br mania"] },
  { nome: "Sem Parar", site: "semparar.com.br", termos: ["sem parar", "semparar"] },
  { nome: "Smart Fit", site: "smartfit.com.br", termos: ["smart fit", "smartfit"] },
  { nome: "McDonald's", site: "mcdonalds.com.br", termos: ["mcdonalds", "mc donalds", "mcdonald s"], logo: "/marcas/mcdonald-s.svg" },
  { nome: "Burger King", site: "burgerking.com.br", termos: ["burger king", "burgerking"], logo: "/marcas/burger-king.svg" },
  { nome: "Starbucks", site: "starbucks.com.br", termos: ["starbucks"], logo: "/marcas/starbucks.svg" },
  { nome: "Outback", site: "outback.com.br", termos: ["outback"] },
  { nome: "Subway", site: "subway.com", termos: ["subway"] },
  { nome: "Renner", site: "lojasrenner.com.br", termos: ["renner", "lojas renner"] },
  { nome: "Riachuelo", site: "riachuelo.com.br", termos: ["riachuelo"] },
  { nome: "C&A", site: "cea.com.br", termos: ["c a modas", "cea modas", "c a lojas"] },
  { nome: "Zara", site: "zara.com", termos: ["zara"], logo: "/marcas/zara.svg" },
  { nome: "Centauro", site: "centauro.com.br", termos: ["centauro"] },
  { nome: "Decathlon", site: "decathlon.com.br", termos: ["decathlon"] },
  { nome: "Netshoes", site: "netshoes.com.br", termos: ["netshoes"] },
  { nome: "Leroy Merlin", site: "leroymerlin.com.br", termos: ["leroy merlin", "leroymerlin"] },
  { nome: "Petz", site: "petz.com.br", termos: ["petz"] },
  { nome: "Cobasi", site: "cobasi.com.br", termos: ["cobasi"] },
  { nome: "Airbnb", site: "airbnb.com.br", termos: ["airbnb"], logo: "/marcas/airbnb.svg" },
  { nome: "Booking", site: "booking.com", termos: ["booking", "booking com"], logo: "/marcas/booking.svg" },
  { nome: "LATAM", site: "latamairlines.com", termos: ["latam", "latam airlines"] },
  { nome: "GOL", site: "voegol.com.br", termos: ["gol linhas", "voegol", "gol transportes"] },
  { nome: "Azul", site: "voeazul.com.br", termos: ["azul linhas", "voeazul", "azul linhas aereas"] },
  { nome: "Cinemark", site: "cinemark.com.br", termos: ["cinemark"] },
  { nome: "Sympla", site: "sympla.com.br", termos: ["sympla"] },
  { nome: "Vivo", site: "vivo.com.br", termos: ["vivo", "telefonica"], logo: "/marcas/vivo.svg" },
  { nome: "Claro", site: "claro.com.br", termos: ["claro", "claro sa", "net claro"] },
  { nome: "TIM", site: "tim.com.br", termos: ["tim", "tim celular"] },
  { nome: "Enel", site: "enel.com.br", termos: ["enel"] },
  { nome: "Sabesp", site: "sabesp.com.br", termos: ["sabesp"] },
  { nome: "Cemig", site: "cemig.com.br", termos: ["cemig"] },

  // Assinaturas e aplicativos (28/09/2026)
  { nome: "iCloud", site: "icloud.com", termos: ["icloud", "apple icloud", "apple com bill icloud"], logo: "/marcas/icloud.svg" },
  { nome: "Google Play", site: "play.google.com", termos: ["google play"], logo: "/marcas/google-play.svg" },
  { nome: "Apple TV", site: "tv.apple.com", termos: ["apple tv"], logo: "/marcas/apple-tv.svg" },
  { nome: "Apple Music", site: "music.apple.com", termos: ["apple music"], logo: "/marcas/apple-music.svg" },
  { nome: "YouTube Music", site: "music.youtube.com", termos: ["youtube music"], logo: "/marcas/youtube-music.svg" },
  { nome: "Crunchyroll", site: "crunchyroll.com", termos: ["crunchyroll"], logo: "/marcas/crunchyroll.svg" },
  { nome: "Paramount+", site: "paramountplus.com", termos: ["paramount", "paramountplus", "paramount plus"], logo: "/marcas/paramount.svg" },
  { nome: "MUBI", site: "mubi.com", termos: ["mubi"], logo: "/marcas/mubi.svg" },
  { nome: "Tidal", site: "tidal.com", termos: ["tidal"], logo: "/marcas/tidal.svg" },
  { nome: "Twitch", site: "twitch.tv", termos: ["twitch"], logo: "/marcas/twitch.svg" },
  { nome: "Discord", site: "discord.com", termos: ["discord", "discord nitro"], logo: "/marcas/discord.svg" },
  { nome: "Patreon", site: "patreon.com", termos: ["patreon"], logo: "/marcas/patreon.svg" },
  { nome: "Duolingo", site: "duolingo.com", termos: ["duolingo"], logo: "/marcas/duolingo.svg" },
  { nome: "Tinder", site: "tinder.com", termos: ["tinder"], logo: "/marcas/tinder.svg" },
  { nome: "Headspace", site: "headspace.com", termos: ["headspace"], logo: "/marcas/headspace.svg" },
  { nome: "Strava", site: "strava.com", termos: ["strava"], logo: "/marcas/strava.svg" },
  { nome: "NordVPN", site: "nordvpn.com", termos: ["nordvpn"], logo: "/marcas/nordvpn.svg" },
  { nome: "1Password", site: "1password.com", termos: ["1password"], logo: "/marcas/1password.svg" },
  { nome: "Dropbox", site: "dropbox.com", termos: ["dropbox"], logo: "/marcas/dropbox.svg" },
  { nome: "Notion", site: "notion.so", termos: ["notion so", "notion labs"], logo: "/marcas/notion.svg" },
  { nome: "ChatGPT", site: "openai.com", termos: ["openai", "chatgpt"] },
  { nome: "Claude", site: "claude.ai", termos: ["claude ai", "anthropic"], logo: "/marcas/claude.svg" },
  { nome: "Perplexity", site: "perplexity.ai", termos: ["perplexity"], logo: "/marcas/perplexity.svg" },
  { nome: "Canva", site: "canva.com", termos: ["canva"] },
  { nome: "Adobe", site: "adobe.com", termos: ["adobe"] },
  { nome: "Audible", site: "audible.com.br", termos: ["audible"], logo: "/marcas/audible.svg" },
  { nome: "Zoom", site: "zoom.us", termos: ["zoom us", "zoom video"], logo: "/marcas/zoom.svg" },
  { nome: "Grammarly", site: "grammarly.com", termos: ["grammarly"], logo: "/marcas/grammarly.svg" },
  { nome: "Wellhub", site: "wellhub.com", termos: ["wellhub", "gympass"] },
  { nome: "Epic Games", site: "epicgames.com", termos: ["epic games", "epicgames"], logo: "/marcas/epic-games.svg" },
  { nome: "Roblox", site: "roblox.com", termos: ["roblox"], logo: "/marcas/roblox.svg" },
  { nome: "Riot Games", site: "riotgames.com", termos: ["riot games", "riotgames"], logo: "/marcas/riot-games.svg" },
  { nome: "Nintendo", site: "nintendo.com", termos: ["nintendo"] },
  { nome: "TikTok", site: "tiktok.com", termos: ["tiktok"], logo: "/marcas/tiktok.svg" },
  { nome: "Udemy", site: "udemy.com", termos: ["udemy"], logo: "/marcas/udemy.svg" },
  { nome: "Coursera", site: "coursera.org", termos: ["coursera"], logo: "/marcas/coursera.svg" },
  { nome: "Alura", site: "alura.com.br", termos: ["alura"] },
  { nome: "PayPal", site: "paypal.com", termos: ["paypal"], logo: "/marcas/paypal.svg" },

  // Supermercados e atacarejos (28/09/2026)
  { nome: "Extra", site: "clubeextra.com.br", termos: ["mercado extra", "extra hiper", "hiper extra", "extra supermercado", "supermercado extra"] },
  { nome: "Dia", site: "dia.com.br", termos: ["supermercado dia", "dia supermercado", "dia brasil"] },
  { nome: "Makro", site: "makro.com.br", termos: ["makro"] },
  { nome: "Tenda Atacado", site: "tendaatacado.com.br", termos: ["tenda atacado"] },
  { nome: "Roldão", site: "roldao.com.br", termos: ["roldao"] },
  { nome: "Fort Atacadista", site: "fortatacadista.com.br", termos: ["fort atacadista"] },
  { nome: "Mart Minas", site: "martminas.com.br", termos: ["mart minas"] },
  { nome: "Guanabara", site: "supermercadosguanabara.com.br", termos: ["supermercados guanabara", "supermercado guanabara"] },
  { nome: "Zaffari", site: "zaffari.com.br", termos: ["zaffari"] },
  { nome: "Angeloni", site: "angeloni.com.br", termos: ["angeloni"] },
  { nome: "Condor", site: "condor.com.br", termos: ["supermercado condor", "condor super", "super condor"] },
  { nome: "Muffato", site: "supermuffato.com.br", termos: ["muffato", "super muffato"] },
  { nome: "Savegnago", site: "savegnago.com.br", termos: ["savegnago"] },
  { nome: "Bretas", site: "bretas.com.br", termos: ["bretas"] },
  { nome: "GBarbosa", site: "gbarbosa.com.br", termos: ["gbarbosa"] },
  { nome: "Comper", site: "comper.com.br", termos: ["comper"] },
  { nome: "Hirota", site: "hirota.com.br", termos: ["hirota"] },
  { nome: "Oba Hortifruti", site: "oba.com.br", termos: ["oba hortifruti"] },
  { nome: "St Marche", site: "marche.com.br", termos: ["st marche"] },
  { nome: "Sonda", site: "sondadelivery.com.br", termos: ["sonda supermercados", "supermercado sonda"] },
  { nome: "Nagumo", site: "nagumo.com.br", termos: ["nagumo"] },
  { nome: "Prezunic", site: "prezunic.com.br", termos: ["prezunic"] },
  { nome: "Mundial", site: "supermercadosmundial.com.br", termos: ["supermercados mundial", "supermercado mundial"] },

  // Farmácias (28/09/2026)
  { nome: "Pacheco", site: "drogariaspacheco.com.br", termos: ["drogarias pacheco", "drogaria pacheco"] },
  { nome: "Ultrafarma", site: "ultrafarma.com.br", termos: ["ultrafarma"] },
  { nome: "Nissei", site: "farmaciasnissei.com.br", termos: ["farmacias nissei", "farmacia nissei"] },
  { nome: "São João", site: "saojoaofarmacias.com.br", termos: ["farmacias sao joao", "farmacia sao joao"] },
  { nome: "Venancio", site: "drogariavenancio.com.br", termos: ["drogarias venancio", "drogaria venancio"] },
  { nome: "Araujo", site: "araujo.com.br", termos: ["drogaria araujo", "drogarias araujo"] },
  { nome: "Extrafarma", site: "extrafarma.com.br", termos: ["extrafarma"] },

  // Lojas (28/09/2026)
  { nome: "Nike", site: "nike.com.br", termos: ["nike"], logo: "/marcas/nike.svg" },
  { nome: "Adidas", site: "adidas.com.br", termos: ["adidas"], logo: "/marcas/adidas.svg" },
  { nome: "Reebok", site: "reebok.com.br", termos: ["reebok"], logo: "/marcas/reebok.svg" },
  { nome: "New Balance", site: "newbalance.com.br", termos: ["new balance"], logo: "/marcas/new-balance.svg" },
  { nome: "Samsung", site: "samsung.com", termos: ["samsung"], logo: "/marcas/samsung.svg" },
  { nome: "Xiaomi", site: "mi.com", termos: ["xiaomi"], logo: "/marcas/xiaomi.svg" },
  { nome: "Motorola", site: "motorola.com.br", termos: ["motorola"], logo: "/marcas/motorola.svg" },
  { nome: "Sony", site: "sony.com.br", termos: ["sony"], logo: "/marcas/sony.svg" },
  { nome: "Havan", site: "havan.com.br", termos: ["havan"] },
  { nome: "Pernambucanas", site: "pernambucanas.com.br", termos: ["pernambucanas"] },
  { nome: "Marisa", site: "marisa.com.br", termos: ["lojas marisa"] },
  { nome: "Hering", site: "hering.com.br", termos: ["hering"] },
  { nome: "O Boticário", site: "boticario.com.br", termos: ["boticario", "o boticario"] },
  { nome: "Natura", site: "natura.com.br", termos: ["natura"] },
  { nome: "Avon", site: "avon.com.br", termos: ["avon"] },
  { nome: "Sephora", site: "sephora.com.br", termos: ["sephora"] },
  { nome: "Fast Shop", site: "fastshop.com.br", termos: ["fast shop", "fastshop"] },
  { nome: "Tok&Stok", site: "tokstok.com.br", termos: ["tok stok", "tokstok"] },
  { nome: "Camicado", site: "camicado.com.br", termos: ["camicado"] },
  { nome: "Dafiti", site: "dafiti.com.br", termos: ["dafiti"] },
  { nome: "Kalunga", site: "kalunga.com.br", termos: ["kalunga"] },
  { nome: "Livraria Leitura", site: "leitura.com.br", termos: ["livraria leitura"] },
  { nome: "Havaianas", site: "havaianas.com.br", termos: ["havaianas"] },
  { nome: "Chilli Beans", site: "chillibeans.com.br", termos: ["chilli beans"] },
  { nome: "Track&Field", site: "tf.com.br", termos: ["track field", "trackfield"] },
  { nome: "Cacau Show", site: "cacaushow.com.br", termos: ["cacau show", "cacaushow"] },
  { nome: "Kopenhagen", site: "kopenhagen.com.br", termos: ["kopenhagen"] },

  // Comida (28/09/2026)
  { nome: "KFC", site: "kfc.com.br", termos: ["kfc"], logo: "/marcas/kfc.svg" },
  { nome: "Pizza Hut", site: "pizzahut.com.br", termos: ["pizza hut", "pizzahut"] },
  { nome: "Domino's", site: "dominos.com.br", termos: ["dominos", "domino s pizza"] },
  { nome: "Habib's", site: "habibs.com.br", termos: ["habibs", "habib s"] },
  { nome: "Bob's", site: "bobs.com.br", termos: ["bobs", "bob s"] },
  { nome: "Giraffas", site: "giraffas.com.br", termos: ["giraffas"] },
  { nome: "Spoleto", site: "spoleto.com.br", termos: ["spoleto"] },
  { nome: "China in Box", site: "chinainbox.com.br", termos: ["china in box", "chinainbox"] },
  { nome: "Coco Bambu", site: "cocobambu.com", termos: ["coco bambu", "cocobambu"] },
  { nome: "Madero", site: "restaurantemadero.com.br", termos: ["madero"] },

  // Transporte e viagem (28/09/2026)
  { nome: "Localiza", site: "localiza.com", termos: ["localiza"] },
  { nome: "Movida", site: "movida.com.br", termos: ["movida", "movida rent"] },
  { nome: "Unidas", site: "unidas.com.br", termos: ["unidas locadora", "unidas aluguel", "unidas rent"] },
  { nome: "Buser", site: "buser.com.br", termos: ["buser"] },
  { nome: "ClickBus", site: "clickbus.com.br", termos: ["clickbus"] },
  { nome: "ConectCar", site: "conectcar.com", termos: ["conectcar"] },
  { nome: "Veloe", site: "veloe.com.br", termos: ["veloe"] },
  { nome: "Ale", site: "ale.com.br", termos: ["ale combustiveis", "posto ale"] },
  { nome: "Decolar", site: "decolar.com", termos: ["decolar"] },
  { nome: "Expedia", site: "expedia.com.br", termos: ["expedia"], logo: "/marcas/expedia.svg" },
  { nome: "Trivago", site: "trivago.com.br", termos: ["trivago"], logo: "/marcas/trivago.svg" },
  { nome: "Hotels.com", site: "hoteis.com", termos: ["hotels com", "hoteis com"], logo: "/marcas/hotels-com.svg" },
  { nome: "Smiles", site: "smiles.com.br", termos: ["smiles"] },
  { nome: "Livelo", site: "livelo.com.br", termos: ["livelo"] },
  { nome: "Ingresso.com", site: "ingresso.com", termos: ["ingresso com"] },
  { nome: "Ticketmaster", site: "ticketmaster.com.br", termos: ["ticketmaster"], logo: "/marcas/ticketmaster.svg" },
  { nome: "Eventim", site: "eventim.com.br", termos: ["eventim"] },

  // Contas da casa e saúde (28/09/2026)
  { nome: "Oi", site: "oi.com.br", termos: ["oi fibra", "oi movel", "oi s a", "oi sa"] },
  { nome: "Sky", site: "sky.com.br", termos: ["sky brasil", "sky servicos", "sky tv"], logo: "/marcas/sky.svg" },
  { nome: "Light", site: "light.com.br", termos: ["light sa", "light servicos de eletricidade", "light s a"] },
  { nome: "CPFL", site: "cpfl.com.br", termos: ["cpfl"] },
  { nome: "Copel", site: "copel.com", termos: ["copel"] },
  { nome: "Neoenergia", site: "neoenergia.com", termos: ["neoenergia", "coelba", "cosern", "celpe"] },
  { nome: "Equatorial", site: "equatorialenergia.com.br", termos: ["equatorial energia"] },
  { nome: "Energisa", site: "energisa.com.br", termos: ["energisa"] },
  { nome: "Celesc", site: "celesc.com.br", termos: ["celesc"] },
  { nome: "Copasa", site: "copasa.com.br", termos: ["copasa"] },
  { nome: "Sanepar", site: "sanepar.com.br", termos: ["sanepar"] },
  { nome: "Águas do Rio", site: "aguasdorio.com.br", termos: ["aguas do rio", "cedae"] },
  { nome: "Embasa", site: "embasa.ba.gov.br", termos: ["embasa"] },
  { nome: "Compesa", site: "compesa.com.br", termos: ["compesa"] },
  { nome: "Unimed", site: "unimed.coop.br", termos: ["unimed"] },
  { nome: "Amil", site: "amil.com.br", termos: ["amil"] },
  { nome: "SulAmérica", site: "sulamerica.com.br", termos: ["sulamerica"] },
  { nome: "Hapvida", site: "hapvida.com.br", termos: ["hapvida"] },
  { nome: "NotreDame Intermédica", site: "gndi.com.br", termos: ["notredame", "intermedica"] },
]

const SEM_ACENTO = new RegExp("[\\u0300-\\u036f]", "g")
/** "PAG*IFOOD" → " pag ifood ": só letras e números, separados por um espaço. */
export function palavras(texto: string) {
  return ` ${texto.normalize("NFD").replace(SEM_ACENTO, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `
}

const SITES = new Set(MARCAS.map((marca) => marca.site))
export const siteConhecido = (site: string) => SITES.has(site)

/**
 * Quem cobrou no lugar da loja: maquininha, carteira ou intermediador de
 * pagamento. O banco escreve o nome dele na frente ("IFD*BURGER DO ZE",
 * "EBW*SPOTIFY", "PAYPAL *NETFLIX"), e a loja de verdade é o que vem depois
 * do asterisco.
 *
 * `marca` é o logo a usar quando o que vem depois não é loja conhecida — só
 * para quem É a loja da compra: pedido feito dentro do iFood é do iFood;
 * cobrança do PayPal é do PayPal. Maquininha (MP*, PAG*, EC*) fica sem: o
 * logo do Mercado Pago numa compra da padaria que usa a maquininha dele seria
 * logo errado.
 */
const INTERMEDIARIOS: { prefixo: string; marca?: string }[] = [
  { prefixo: "IFD", marca: "iFood" },
  { prefixo: "IFOOD", marca: "iFood" },
  { prefixo: "PAYPAL", marca: "PayPal" },
  { prefixo: "APL", marca: "Apple" },
  { prefixo: "APPLE", marca: "Apple" },
  { prefixo: "GOOGLE", marca: "Google" },
  { prefixo: "UBER", marca: "Uber" },
  { prefixo: "PAG" }, { prefixo: "PG" }, { prefixo: "PAGSEGURO" },
  { prefixo: "MP" }, { prefixo: "MERCPAGO" }, { prefixo: "MERCADOPAGO" },
  { prefixo: "EC" }, { prefixo: "EBW" }, { prefixo: "EBN" }, { prefixo: "EBANX" },
  { prefixo: "DL" }, { prefixo: "DLOCAL" }, { prefixo: "PP" }, { prefixo: "PICPAY" },
  { prefixo: "SUMUP" }, { prefixo: "STONE" }, { prefixo: "TON" }, { prefixo: "CIELO" },
  { prefixo: "REDE" }, { prefixo: "GETNET" }, { prefixo: "SAFRAPAY" }, { prefixo: "INFINITEPAY" },
  { prefixo: "HTM" }, { prefixo: "HOTMART" }, { prefixo: "KIWIFY" }, { prefixo: "ASAAS" },
]
const PREFIXO = new RegExp(`^\\s*(${INTERMEDIARIOS.map((item) => item.prefixo).join("|")})\\s*\\*\\s*`, "i")

/** "EBW*SPOTIFY" → { intermediario: "EBW", resto: "SPOTIFY" }. Sem prefixo, null. */
export function separarIntermediario(descricao: string): { intermediario: string; resto: string } | null {
  const achado = PREFIXO.exec(descricao)
  if (!achado) return null
  return { intermediario: achado[1].toUpperCase(), resto: descricao.slice(achado[0].length) }
}

function buscarNoCatalogo(descricao: string): Marca | null {
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

/**
 * A loja da compra, se for uma das conhecidas.
 *
 * Com mais de uma no mesmo texto, ganha o termo com mais palavras ("google
 * youtube" é YouTube, não Google) e, empatado, o que aparece primeiro ("posto
 * shell ipiranga" é Shell: Ipiranga ali costuma ser o nome da rua).
 *
 * Com intermediário na frente, a loja é procurada só no que vem depois do
 * asterisco: em "PAYPAL *NETFLIX" é o Netflix, não o PayPal.
 */
export function marcaDaCompra(descricao: string): Marca | null {
  const separado = separarIntermediario(descricao)
  if (!separado) return buscarNoCatalogo(descricao)
  const daLoja = buscarNoCatalogo(separado.resto)
  if (daLoja) return daLoja
  const marca = INTERMEDIARIOS.find((item) => item.prefixo === separado.intermediario)?.marca
  return marca ? (MARCAS.find((item) => item.nome === marca) ?? null) : null
}

/**
 * A chave de uma descrição para guardar o que já se descobriu dela: sem o
 * intermediário, sem números e sem pontuação. "MP*SUPERM BOA ESPERANCA 0123"
 * e "SUPERM BOA ESPERANCA 0456" são a mesma loja, e a IA só é perguntada uma
 * vez.
 */
export function chaveDaDescricao(descricao: string): string {
  const texto = separarIntermediario(descricao)?.resto ?? descricao
  return palavras(texto)
    .trim()
    .split(" ")
    .filter((palavra) => palavra && !/^\d+$/.test(palavra))
    .join(" ")
    .slice(0, 80)
}

/** Acha a marca do catálogo pelo site ou pelo nome — para validar o que a IA respondeu. */
export function marcaDoCatalogo(nome: string | null, site: string | null): Marca | null {
  if (site) {
    const limpo = site.toLowerCase().replace(/^www\./, "")
    const pelaSite = MARCAS.find((marca) => marca.site === limpo)
    if (pelaSite) return pelaSite
  }
  if (nome) {
    const alvo = palavras(nome)
    const peloNome = MARCAS.find((marca) => palavras(marca.nome) === alvo)
    if (peloNome) return peloNome
  }
  return null
}

/**
 * Modelos de aparelho para a busca da entrada (passo 39, Davi, 07/10/2026:
 * "a busca pelo modelo pega todos os modelos só pelo começo que a pessoa
 * colocar, o mais rápido e prático possível").
 *
 * A lista mora no aparelho da pessoa, não no servidor: no balcão, com o
 * cliente esperando, cada ida à rede é um segundo a mais. São uns 740 nomes e
 * a busca roda em menos de um milissegundo.
 *
 * Ela é ponto de partida, não cadastro fechado: o que a pessoa digitar e não
 * estiver aqui vale como está, e os modelos que a loja já atendeu sobem para
 * o topo (`buscarModelos` recebe o histórico). Modelo novo que sair amanhã
 * entra pelo histórico no primeiro dia, sem esperar atualização do Tino.
 */

export type TipoDeAparelho = "celular" | "tablet" | "notebook" | "computador" | "videogame" | "relogio" | "fone" | "outro"

export interface Modelo {
  nome: string
  marca: string
  tipo: TipoDeAparelho
}

/** Monta uma série: `serie("Apple", "celular", "iPhone ", "11|11 Pro")`. */
function serie(marca: string, tipo: TipoDeAparelho, prefixo: string, nomes: string): Modelo[] {
  return nomes.split("|").map((nome) => ({ marca, tipo, nome: `${prefixo}${nome}`.trim() }))
}

// A ordem conta: a busca desempata pela posição, então as marcas mais
// atendidas nas assistências do Brasil vêm antes.
export const MODELOS: Modelo[] = [
  ...serie("Apple", "celular", "iPhone ", "11|11 Pro|11 Pro Max|12|12 mini|12 Pro|12 Pro Max|13|13 mini|13 Pro|13 Pro Max|14|14 Plus|14 Pro|14 Pro Max|15|15 Plus|15 Pro|15 Pro Max|16|16 Plus|16 Pro|16 Pro Max|16e|17|17 Pro|17 Pro Max|Air|X|XR|XS|XS Max|SE (2ª geração)|SE (3ª geração)|SE (1ª geração)|8|8 Plus|7|7 Plus|6s|6s Plus|6|6 Plus|5s|5c|5|4s"),
  ...serie("Samsung", "celular", "Galaxy ", "A01|A02|A02s|A03|A03s|A03 Core|A04|A04s|A04e|A05|A05s|A06|A07|A10|A10s|A11|A12|A13|A14|A14 5G|A15|A15 5G|A16|A16 5G|A17|A20|A20s|A21s|A22|A22 5G|A23|A24|A25|A26|A30|A30s|A31|A32|A32 5G|A33|A34|A35|A36|A50|A51|A52|A52s|A53|A54|A55|A56|A70|A71|A72|A73|A80"),
  ...serie("Samsung", "celular", "Galaxy ", "S26|S26 Ultra|S25|S25+|S25 Ultra|S25 Edge|S25 FE|S24|S24+|S24 Ultra|S24 FE|S23|S23+|S23 Ultra|S23 FE|S22|S22+|S22 Ultra|S21|S21+|S21 Ultra|S21 FE|S20|S20+|S20 Ultra|S20 FE|S10|S10+|S10e|S10 Lite|S9|S9+|S8|S8+|S7|S7 Edge|S6|S6 Edge|S5|S4|S3"),
  ...serie("Samsung", "celular", "Galaxy ", "M12|M13|M14|M15|M21s|M22|M23|M31|M32|M33|M34|M35|M36|M51|M52|M53|M54|M55|M62"),
  ...serie("Samsung", "celular", "Galaxy ", "J1|J2|J2 Prime|J2 Core|J3|J4|J4+|J4 Core|J5|J5 Prime|J6|J6+|J7|J7 Prime|J7 Pro|J8"),
  ...serie("Samsung", "celular", "Galaxy ", "Note 8|Note 9|Note 10|Note 10+|Note 10 Lite|Note 20|Note 20 Ultra"),
  ...serie("Samsung", "celular", "Galaxy ", "Z Flip|Z Flip3|Z Flip4|Z Flip5|Z Flip6|Z Flip7|Z Fold2|Z Fold3|Z Fold4|Z Fold5|Z Fold6|Z Fold7"),
  ...serie("Motorola", "celular", "Moto ", "G04|G04s|G05|G06|G13|G14|G15|G20|G22|G23|G24|G24 Power|G30|G31|G32|G34|G35|G41|G42|G50|G51|G52|G53|G54|G55|G56|G60|G60s|G62|G71|G72|G73|G75|G82|G84|G85|G86|G100|G200|G10|G9 Play|G9 Plus|G9 Power|G8|G8 Plus|G8 Play|G8 Power|G8 Power Lite|G7|G7 Plus|G7 Play|G7 Power|G6|G6 Plus|G6 Play|G5|G5 Plus|G5S|G5S Plus|G4|G4 Plus|G4 Play"),
  ...serie("Motorola", "celular", "Moto ", "E4|E4 Plus|E5|E5 Plus|E5 Play|E6 Plus|E6 Play|E6s|E6i|E7|E7 Plus|E7 Power|E13|E14|E15|E20|E22|E32|E40"),
  ...serie("Motorola", "celular", "Motorola ", "Edge|Edge+|Edge 20|Edge 20 Pro|Edge 20 Lite|Edge 30|Edge 30 Pro|Edge 30 Neo|Edge 30 Ultra|Edge 30 Fusion|Edge 40|Edge 40 Neo|Edge 40 Pro|Edge 50|Edge 50 Pro|Edge 50 Neo|Edge 50 Fusion|Edge 50 Ultra|Edge 60|Edge 60 Pro|Edge 60 Fusion|Razr 40|Razr 40 Ultra|Razr 50|Razr 50 Ultra|Razr 60|Razr 60 Ultra|One|One Vision|One Action|One Fusion|One Fusion+|One Macro|One Hyper|One Zoom"),
  ...serie("Xiaomi", "celular", "Redmi ", "Note 15|Note 15 Pro|Note 14|Note 14 Pro|Note 14 Pro+|Note 13|Note 13 Pro|Note 13 Pro+|Note 12|Note 12S|Note 12 Pro|Note 12 Pro+|Note 11|Note 11S|Note 11 Pro|Note 11 Pro+|Note 10|Note 10S|Note 10 Pro|Note 10 5G|Note 9|Note 9S|Note 9 Pro|Note 8|Note 8 Pro|Note 8T|Note 7|Note 6 Pro|Note 5|Note 4"),
  ...serie("Xiaomi", "celular", "Redmi ", "15C|14C|13|13C|12|12C|10|10A|10C|9|9A|9C|9T|8|8A|7|7A|6|6A|5|5 Plus|A1|A2|A3|A5"),
  ...serie("Xiaomi", "celular", "Poco ", "X7|X7 Pro|X6|X6 Pro|X5|X5 Pro|X4 Pro|X3|X3 NFC|X3 Pro|F7|F7 Pro|F7 Ultra|F6|F6 Pro|F5|F5 Pro|F4|F3|M6 Pro|M5|M5s|M4 Pro|M3|M3 Pro|C85|C75|C65|C40"),
  ...serie("Xiaomi", "celular", "Xiaomi ", "15|15 Ultra|15T|15T Pro|14|14 Ultra|14T|14T Pro|13|13 Lite|13T|13T Pro|12|12 Lite|12T|12T Pro|11T|11T Pro|Mi 11|Mi 11 Lite|Mi 10|Mi 9|Mi 8|Mi A3|Mi A2|Mi A2 Lite|Mi A1"),
  ...serie("Realme", "celular", "Realme ", "C11|C21|C21Y|C25|C25Y|C30|C33|C35|C51|C53|C55|C61|C63|C65|C67|C71|C75|7|7 Pro|8|8 Pro|8i|9|9 Pro|9i|10|10 Pro|11|11 Pro|12|12 Pro|13|Note 50|Note 60|GT 2|GT Master"),
  ...serie("LG", "celular", "LG ", "K4|K8|K9|K10|K11|K11+|K12|K12+|K12 Max|K22|K40|K40s|K41s|K42|K50|K50s|K51s|K52|K61|K62|Q6|Q7|Q60|G6|G7 ThinQ|G8s|Velvet"),
  ...serie("Asus", "celular", "Zenfone ", "5|5 Selfie|Max Pro M1|Max Pro M2|Max M2|Max Shot|6|7|8|9|10|11 Ultra"),
  ...serie("Asus", "celular", "ROG Phone ", "5|6|7|8"),
  ...serie("Nokia", "celular", "Nokia ", "C1|C2|C20|C21|C30|G10|G20|G21|G50|G60|1.4|2.4|3.4|5.4"),
  ...serie("Positivo", "celular", "Positivo ", "Twist 2|Twist 3|Twist 4|Twist 5"),
  ...serie("Infinix", "celular", "Infinix ", "Hot 30|Hot 40|Hot 40i|Hot 50|Note 30|Note 40|Smart 8|Smart 9|Zero 30"),
  ...serie("Tecno", "celular", "Tecno ", "Spark 10|Spark 20|Spark 30|Camon 20|Camon 30|Pova 5|Pova 6"),
  ...serie("Huawei", "celular", "Huawei ", "P20|P20 Lite|P30|P30 Lite|P30 Pro|Y6|Y7|Y9"),

  ...serie("Apple", "tablet", "iPad ", "(A16)|10ª geração|9ª geração|8ª geração|7ª geração|6ª geração|Air M3|Air M2|Air 5|Air 4|Air 3|Air 2|mini (A17 Pro)|mini 6|mini 5|mini 4|Pro M4|Pro 11|Pro 12.9"),
  ...serie("Samsung", "tablet", "Galaxy Tab ", "A7|A7 Lite|A8|A9|A9+|S6 Lite|S7|S7 FE|S8|S9|S9 FE"),
  ...serie("Lenovo", "tablet", "Lenovo Tab ", "M8|M10|P11"),
  ...serie("Multilaser", "tablet", "Multilaser ", "M7|M8|M10"),

  ...serie("Apple", "notebook", "MacBook ", "Air M4|Air M3|Air M2|Air M1|Air (Intel)|Pro 14|Pro 16|Pro 13"),
  ...serie("Dell", "notebook", "Dell ", "Inspiron 15 3000|Inspiron 15 5000|Inspiron 14|Inspiron 13|Vostro 15|Vostro 14|Latitude 3420|Latitude 5420|XPS 13|XPS 15|G15"),
  ...serie("Lenovo", "notebook", "Lenovo ", "IdeaPad 1|IdeaPad 3|IdeaPad 5|IdeaPad Gaming 3|IdeaPad Slim 3|ThinkPad E14|ThinkPad T14|ThinkPad X1 Carbon|Legion 5|LOQ"),
  ...serie("Acer", "notebook", "Acer ", "Aspire 3|Aspire 5|Aspire 7|Aspire Go 15|Nitro 5|Nitro V 15|Swift 3|Predator Helios"),
  ...serie("Samsung", "notebook", "Samsung ", "Galaxy Book|Galaxy Book2|Galaxy Book3|Galaxy Book4|Galaxy Book4 Pro|Book E30|Expert X40"),
  ...serie("Asus", "notebook", "Asus ", "VivoBook 15|Vivobook Go 15|Vivobook 16|ZenBook 14|TUF Gaming F15|TUF Gaming A15|ROG Strix G16"),
  ...serie("HP", "notebook", "HP ", "250 G8|250 G9|250 G10|256 G9|Laptop 15|Pavilion 15|Victus 15|EliteBook 840|ProBook 440"),
  ...serie("Positivo", "notebook", "Positivo ", "Motion|Vision|Duo|Stilo"),
  ...serie("Vaio", "notebook", "Vaio ", "FE14|FE15|FE16"),
  ...serie("Outro", "computador", "", "Computador de mesa (PC)|Computador tudo em um (All in one)|Monitor|Impressora"),

  ...serie("Sony", "videogame", "PlayStation ", "5|5 Slim|5 Digital|5 Pro|4|4 Slim|4 Pro|3|2|Vita|Portable (PSP)"),
  ...serie("Microsoft", "videogame", "Xbox ", "Series S|Series X|One|One S|One X|360"),
  ...serie("Nintendo", "videogame", "Nintendo ", "Switch 2|Switch|Switch Lite|Switch OLED|Wii|Wii U|3DS|2DS"),
  ...serie("Sony", "videogame", "Controle ", "DualSense (PS5)|DualShock 4 (PS4)"),
  ...serie("Microsoft", "videogame", "Controle ", "Xbox Series|Xbox One"),
  ...serie("Nintendo", "videogame", "", "Joy-Con|Controle Pro do Switch"),

  ...serie("Apple", "relogio", "Apple Watch ", "Series 10|Series 9|Series 8|Series 7|Series 6|SE|Ultra|Ultra 2"),
  ...serie("Samsung", "relogio", "Galaxy Watch ", "4|5|6|7|8|Ultra"),
  ...serie("Xiaomi", "relogio", "", "Mi Band 7|Mi Band 8|Mi Band 9|Redmi Watch"),
  ...serie("Apple", "fone", "AirPods ", "2ª geração|3ª geração|4|Pro|Pro 2|Max"),
  ...serie("Samsung", "fone", "Galaxy Buds ", "2|2 Pro|3|3 Pro|FE"),
  ...serie("JBL", "fone", "JBL ", "Tune 510BT|Tune 520BT|Wave Buds|Go 3|Go 4|Flip 5|Flip 6|Charge 4|Charge 5|Boombox|PartyBox"),
  ...serie("Outro", "outro", "", "Smart TV|Caixa de som|Fone de ouvido|Controle remoto|Air fryer|Micro-ondas|Liquidificador|Ventilador|Máquina de lavar|Geladeira|Ferro de passar|Secador de cabelo|Chapinha|Aspirador de pó|Drone|Câmera fotográfica"),
]

/** Minúsculas, sem acento, "+" vira "plus": quem digita "s8+" e quem digita "s8 plus" acham o mesmo. */
export function normalizarModelo(texto: string): string {
  return texto
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

interface Indexado {
  modelo: Modelo
  /** De cada palavra até o fim, sem espaço: "galaxys23ultra", "s23ultra", "ultra". */
  sufixos: string[]
  compacto: string
  posicao: number
}

function indexar(modelo: Modelo, posicao: number): Indexado {
  const palavras = normalizarModelo(modelo.marca === "Outro" ? modelo.nome : `${modelo.marca} ${modelo.nome}`).split(" ")
  // "PS5" e "PS4" são como o balcão chama o PlayStation.
  if (modelo.nome.startsWith("PlayStation ")) palavras.push(`ps${normalizarModelo(modelo.nome.slice(12)).replace(/ /g, "")}`)
  const sufixos = palavras.map((_, indice) => palavras.slice(indice).join(""))
  return { modelo, sufixos, compacto: normalizarModelo(modelo.nome).replace(/ /g, ""), posicao }
}

let indice: Indexado[] | null = null

/**
 * Busca pelo começo, em qualquer palavra e sem precisar do espaço: "a5" acha
 * Galaxy A50 a A56, "note12" acha Redmi Note 12, "ip 15 pro" acha iPhone 15
 * Pro. Cada pedaço digitado tem de ser o começo de alguma palavra do nome.
 *
 * Ordem: o que a loja já atendeu (do mais recente), depois o nome que bate
 * inteiro, o mais curto (quem digita "iphone 1" quer o 11 antes do 11 Pro
 * Max) e a posição na lista.
 */
export function buscarModelos(termo: string, historico: string[] = [], limite = 8): Modelo[] {
  const pedacos = normalizarModelo(termo).split(" ").filter(Boolean)
  if (pedacos.length === 0) return []
  indice ??= MODELOS.map(indexar)

  const daLoja = historico
    .map((nome, posicao) => ({ ...indexar({ nome, marca: "", tipo: tipoPeloNome(nome) }, posicao), daLoja: true }))
  const vistos = new Set(daLoja.map((linha) => linha.compacto))
  const candidatos = [...daLoja, ...indice.filter((linha) => !vistos.has(linha.compacto)).map((linha) => ({ ...linha, daLoja: false }))]

  const compactoDoTermo = pedacos.join("")
  return candidatos
    .filter((linha) => pedacos.every((pedaco) => linha.sufixos.some((sufixo) => sufixo.startsWith(pedaco))))
    .sort((a, b) =>
      Number(b.daLoja) - Number(a.daLoja)
      || Number(b.compacto === compactoDoTermo) - Number(a.compacto === compactoDoTermo)
      || a.modelo.nome.length - b.modelo.nome.length
      || a.posicao - b.posicao,
    )
    .slice(0, limite)
    .map((linha) => linha.modelo)
}

/** O tipo de um nome que não está na lista (digitado ou do histórico), pelo que bate nela. */
export function tipoPeloNome(nome: string): TipoDeAparelho {
  indice ??= MODELOS.map(indexar)
  const compacto = normalizarModelo(nome).replace(/ /g, "")
  const exato = indice.find((linha) => linha.compacto === compacto || normalizarModelo(`${linha.modelo.marca} ${linha.modelo.nome}`).replace(/ /g, "") === compacto)
  if (exato) return exato.modelo.tipo
  const n = normalizarModelo(nome)
  if (/\b(ipad|tab|tablet)\b/.test(n)) return "tablet"
  if (/\b(notebook|macbook|laptop|ideapad|inspiron|vivobook|aspire)\b/.test(n)) return "notebook"
  if (/\b(playstation|ps\d|xbox|nintendo|switch|controle)\b/.test(n)) return "videogame"
  if (/\b(watch|relogio|band)\b/.test(n)) return "relogio"
  return "celular"
}

/**
 * O assessor lê o pedido de agenda (item 3.1, estudo em
 * `docs/pesquisas/2026-10-07-fase-3-assessor.md`): "tenho um horário amanhã
 * às 15h com a Ana", "sexta 10:30 corte da Rita", "dia 12 às 9h".
 *
 * Por regra, sem modelo de linguagem: é rápido, funciona sem internet de
 * fora e dá para testar. O resultado é uma PROPOSTA; quem marca é a pessoa,
 * num toque (regra 5). O que não deu para ler fica em `faltando`, e a tela
 * pergunta em vez de chutar.
 */

export interface PedidoDeAgenda {
  dia: string | null
  hora: string | null
  cliente: string | null
  titulo: string
  /** O que a tela tem de perguntar antes de marcar. */
  faltando: ("dia" | "hora")[]
}

const SEMANA = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"]

const normalizar = (texto: string) => texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()

const somarDias = (dia: string, dias: number) => new Date(Date.parse(`${dia}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10)
const diaDaSemana = (dia: string) => new Date(`${dia}T12:00:00Z`).getUTCDay()

/** O dia de hoje no fuso da loja. */
export function hojeNoFuso(agora: Date, fuso = "America/Sao_Paulo") {
  return new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(agora)
}

/**
 * O instante de "dia, hora" no fuso da loja. Calcula o deslocamento do fuso
 * naquele dia em vez de supor -03:00: se algum dia voltar o horário de verão,
 * a conta continua certa.
 */
export function instanteNoFuso(dia: string, hora: string, fuso = "America/Sao_Paulo"): Date {
  const palpite = Date.parse(`${dia}T${hora}:00Z`)
  const partes = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: fuso, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(new Date(palpite)).map((parte) => [parte.type, parte.value]))
  const comoLocal = Date.parse(`${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:00Z`)
  return new Date(palpite - (comoLocal - palpite))
}

function lerDia(texto: string, hoje: string): { dia: string | null; trecho: string | null } {
  let m: RegExpMatchArray | null
  if ((m = texto.match(/\bdepois de amanha\b/))) return { dia: somarDias(hoje, 2), trecho: m[0] }
  if ((m = texto.match(/\bamanha\b/))) return { dia: somarDias(hoje, 1), trecho: m[0] }
  if ((m = texto.match(/\bhoje\b/))) return { dia: hoje, trecho: m[0] }
  if ((m = texto.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    const [, d, mes, ano] = m
    const anoHoje = Number(hoje.slice(0, 4))
    let a = ano ? Number(ano.length === 2 ? `20${ano}` : ano) : anoHoje
    let dia = `${a}-${mes!.padStart(2, "0")}-${d!.padStart(2, "0")}`
    // "12/01" dito em outubro é janeiro do ano que vem.
    if (!ano && dia < hoje) { a += 1; dia = `${a}-${mes!.padStart(2, "0")}-${d!.padStart(2, "0")}` }
    return Number.isNaN(Date.parse(`${dia}T12:00:00Z`)) ? { dia: null, trecho: null } : { dia, trecho: m[0] }
  }
  if ((m = texto.match(/\bdia (\d{1,2})\b/))) {
    const numero = Number(m[1])
    if (numero < 1 || numero > 31) return { dia: null, trecho: null }
    let [ano, mes] = [Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7))]
    // "dia 3" dito no dia 20 é o dia 3 do mês que vem.
    if (numero < Number(hoje.slice(8, 10))) { mes += 1; if (mes > 12) { mes = 1; ano += 1 } }
    return { dia: `${ano}-${String(mes).padStart(2, "0")}-${String(numero).padStart(2, "0")}`, trecho: m[0] }
  }
  const semana = texto.match(new RegExp(`\\b(?:na |no |nesta |neste |proxima |proximo )?(${SEMANA.join("|")})(?:-feira| feira)?(?: que vem)?\\b`))
  if (semana) {
    const alvo = SEMANA.indexOf(semana[1]!)
    // O próximo dia com esse nome, depois de hoje: "sexta" dito na sexta é a da semana que vem (para hoje, a pessoa diz "hoje").
    const distancia = ((alvo - diaDaSemana(hoje) + 7) % 7) || 7
    return { dia: somarDias(hoje, distancia), trecho: semana[0] }
  }
  return { dia: null, trecho: null }
}

function lerHora(texto: string): { hora: string | null; trecho: string | null } {
  let m: RegExpMatchArray | null
  if ((m = texto.match(/\bmeio[- ]dia\b/))) return { hora: "12:00", trecho: m[0] }
  // Só vale como hora se tiver marca de hora ("15h", "15:00", "às 3", "3 da tarde"): "dia 12" e "2 clientes" não são hora.
  const candidatos = [...texto.matchAll(/\b(as |a |pelas |por volta das )?(\d{1,2})(?:(:|h)(\d{2}))?\s*(h\b|hs\b|horas?\b)?(\s*(da manha|da tarde|da noite))?/g)]
  for (const c of candidatos) {
    const [trecho, preposicao, h, separador, minutos, sufixo, , periodo] = c
    const antes = texto.slice(0, c.index)
    if (/\bdia $/.test(antes) || /\/$/.test(antes) || texto[c.index! + trecho.length] === "/") continue
    if (!preposicao && !separador && !sufixo && !periodo) continue
    let hora = Number(h)
    if (hora > 23) continue
    if (periodo === "da tarde" || periodo === "da noite") { if (hora < 12) hora += 12 }
    // "às 3", sem dizer o período, no horário comercial é três da tarde.
    else if (!periodo && !separador && hora >= 1 && hora <= 7) hora += 12
    const min = minutos ? Number(minutos) : 0
    if (min > 59) continue
    return { hora: `${String(hora).padStart(2, "0")}:${String(min).padStart(2, "0")}`, trecho: trecho.trim() }
  }
  return { hora: null, trecho: null }
}

function lerCliente(original: string): { cliente: string | null; trecho: string | null } {
  const m = original.match(/\b(?:com|da|do|pra|para)\s+(?:a |o |dona |seu |sr\.? |sra\.? )?([A-ZÀ-Ý][\p{L}']+(?:\s+(?:de |da |do |dos |das )?[A-ZÀ-Ý][\p{L}']+)?)/u)
  if (!m) return { cliente: null, trecho: null }
  return { cliente: m[1]!.trim(), trecho: m[0] }
}

/** Palavras do pedido que não são o assunto ("tenho um horário", "agenda pra mim"). */
const ENCHIMENTO = new Set(["tenho", "temos", "um", "uma", "horario", "compromisso", "agenda", "agendar", "agende", "marca", "marcar", "marque", "anota", "anotar", "anote", "coloca", "colocar", "coloque", "pra", "para", "mim", "por", "favor", "as", "e"])
const ARTIGOS = new Set(["a", "o", "os", "as", "no", "na", "nos", "nas"])
const LIGACOES = new Set(["de", "do", "da", "dos", "das", "com"])

export function lerPedidoDeAgenda(original: string, agora: Date, fuso = "America/Sao_Paulo"): PedidoDeAgenda {
  const texto = normalizar(original)
  const hoje = hojeNoFuso(agora, fuso)
  const dia = lerDia(texto, hoje)
  const hora = lerHora(dia.trecho ? texto.replace(dia.trecho, " ") : texto)
  const cliente = lerCliente(original)

  // O assunto sai das palavras que sobram, com as letras do jeito que a
  // pessoa escreveu: "Reunião com fornecedor", não "reuniao fornecedor".
  const palavras = original.split(/\s+/).map((bruta) => ({ bruta: bruta.replace(/[,.;!?]+$/g, ""), norma: normalizar(bruta).replace(/[,.;!?]+$/g, "") })).filter((p) => p.bruta)
  const usada = palavras.map(() => false)
  for (const trecho of [dia.trecho, hora.trecho, cliente.trecho ? normalizar(cliente.trecho) : null]) {
    if (!trecho) continue
    const alvo = trecho.trim().split(/\s+/)
    for (let i = 0; i + alvo.length <= palavras.length; i += 1) {
      if (alvo.every((p, j) => palavras[i + j]!.norma === p || (j === alvo.length - 1 && palavras[i + j]!.norma.startsWith(p)))) {
        for (let j = 0; j < alvo.length; j += 1) usada[i + j] = true
        break
      }
    }
  }
  const sobra = palavras.filter((p, i) => !usada[i] && !ENCHIMENTO.has(p.norma) && !(ARTIGOS.has(p.norma) && (i === 0 || palavras[i - 1]!.norma !== "com")))
  // Ligação ("de", "com") só fica entre duas palavras do assunto.
  const assunto = sobra.filter((p, i) => !LIGACOES.has(p.norma) || (i > 0 && i < sobra.length - 1)).map((p) => p.bruta).join(" ")
  const titulo = assunto
    ? `${assunto.charAt(0).toUpperCase()}${assunto.slice(1)}${cliente.cliente ? ` · ${cliente.cliente}` : ""}`
    : cliente.cliente ? `Horário com ${cliente.cliente}` : "Compromisso"

  const faltando: ("dia" | "hora")[] = []
  if (!dia.dia) faltando.push("dia")
  if (!hora.hora) faltando.push("hora")
  return { dia: dia.dia, hora: hora.hora, cliente: cliente.cliente, titulo, faltando }
}

const NOMES_DIA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"]

/** "Quarta, 08/10, 15:00 · Ana": o que a tela mostra para a pessoa confirmar. */
export function textoDaProposta(pedido: PedidoDeAgenda): string {
  const partes: string[] = []
  if (pedido.dia) partes.push(`${NOMES_DIA[diaDaSemana(pedido.dia)]!.replace(/^./, (l) => l.toUpperCase())}, ${pedido.dia.slice(8, 10)}/${pedido.dia.slice(5, 7)}`)
  partes.push(pedido.hora ?? "dia inteiro")
  return `${partes.join(", ")} · ${pedido.titulo}`
}

// ------------------------------------------------------------ 3.2 Google Agenda

const formatoUtc = (data: Date) => data.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")

/**
 * Link que abre o compromisso pronto na agenda do Google da pessoa, que só
 * confirma. Não precisa de permissão do Google nem de login no Tino (estudo:
 * a integração que escreve sozinha fica para depois da verificação do app).
 */
export function linkGoogleAgenda(evento: { titulo: string; inicio: Date; minutos?: number; detalhe?: string; local?: string; diaInteiro?: string | null }) {
  const parametros = new URLSearchParams({ action: "TEMPLATE", text: evento.titulo })
  if (evento.diaInteiro) {
    const dia = evento.diaInteiro.replace(/-/g, "")
    parametros.set("dates", `${dia}/${somarDias(evento.diaInteiro, 1).replace(/-/g, "")}`)
  } else {
    const fim = new Date(evento.inicio.getTime() + (evento.minutos ?? 60) * 60_000)
    parametros.set("dates", `${formatoUtc(evento.inicio)}/${formatoUtc(fim)}`)
  }
  if (evento.detalhe) parametros.set("details", evento.detalhe)
  if (evento.local) parametros.set("location", evento.local)
  return `https://calendar.google.com/calendar/render?${parametros.toString()}`
}

const escaparIcs = (texto: string) => texto.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")

/** O mesmo compromisso em arquivo .ics, para a agenda do iPhone e do Outlook. */
export function arquivoIcs(evento: { id: string; titulo: string; inicio: Date; minutos?: number; detalhe?: string; local?: string; criadoEm?: Date }) {
  const fim = new Date(evento.inicio.getTime() + (evento.minutos ?? 60) * 60_000)
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Tino//Agenda//PT-BR", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:${evento.id}@tino`, `DTSTAMP:${formatoUtc(evento.criadoEm ?? evento.inicio)}`,
    `DTSTART:${formatoUtc(evento.inicio)}`, `DTEND:${formatoUtc(fim)}`,
    `SUMMARY:${escaparIcs(evento.titulo)}`,
    ...(evento.detalhe ? [`DESCRIPTION:${escaparIcs(evento.detalhe)}`] : []),
    ...(evento.local ? [`LOCATION:${escaparIcs(evento.local)}`] : []),
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n")
}

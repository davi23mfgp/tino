/**
 * O aviso sai do app.
 *
 * Os vigias (`tino/alertas.ts`) já sabem o que dizer; até aqui o que diziam
 * morria na tela, e quem não abrisse o app não ficava sabendo. Este arquivo é
 * o caminho de saída — e é quase todo feito de freios, porque falar primeiro
 * custa dinheiro e incomoda:
 *
 * - **silêncio é o padrão**: sem linha em `AvisoProativo`, nada sai;
 * - **teto diário**, porque assessor que fala demais deixa de ser lido;
 * - **janela de horário**, porque ninguém quer ser acordado por orçamento;
 * - **severidade mínima**, porque nem todo aviso vale uma interrupção;
 * - **trava por alerta** (`avisadoEm`), porque a `chave` evita repetir dentro
 *   do app mas não impede mandar o mesmo recado duas vezes.
 *
 * O envio de verdade ainda depende de um modelo aprovado pela Meta
 * (`WHATSAPP_MODELO_AVISO`). Sem ele, `avisar` funciona inteiro e não manda
 * nada: devolve o que teria mandado. É de propósito — dá para ver o
 * comportamento antes de ligar a torneira que cobra.
 */

import type { SeveridadeAlerta } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { enviarModelo, modeloDeAvisoConfigurado, whatsappDisponivel } from "@/lib/captura/whatsapp"

/// Ordem de gravidade. O enum do banco não garante ordem, e comparar por
/// string daria errado em silêncio.
const PESO: Record<SeveridadeAlerta, number> = {
  INFO: 0,
  ATENCAO: 1,
  CRITICO: 2,
}

export interface AvisoParaMandar {
  alertaId: string
  titulo: string
  texto: string
}

export interface ResultadoAviso {
  /** O que sairia, ou saiu. */
  avisos: AvisoParaMandar[]
  /** Verdadeiro quando saiu de verdade; falso quando foi só ensaio. */
  enviou: boolean
  /** Em português, por que não saiu. Nunca fica vazio quando `enviou` é falso. */
  motivo?: string
}

/** O que a decisão precisa saber. Nada além disto vem do banco. */
export interface Situacao {
  canal: "NENHUM" | "WHATSAPP" | "TELEGRAM"
  limiteDiario: number
  horaInicio: number
  horaFim: number
  severidadeMinima: SeveridadeAlerta
  /** Quantos já saíram hoje. */
  jaMandados: number
  pendentes: { id: string; tipo: string; titulo: string; texto: string; severidade: SeveridadeAlerta }[]
  agora: Date
}

/**
 * Quem fala, e quem espera.
 *
 * Separada da ida ao banco de propósito: é aqui que moram os freios, e freio
 * de mensagem cobrada precisa ser testável sem subir Postgres.
 */
export function escolherAvisos(situacao: Situacao): { avisos: AvisoParaMandar[]; motivo?: string } {
  if (situacao.canal === "NENHUM") {
    return { avisos: [], motivo: "Este lar não pediu para ser avisado." }
  }

  if (!dentroDaJanela(situacao.agora.getHours(), situacao.horaInicio, situacao.horaFim)) {
    return { avisos: [], motivo: "Fora da janela de horário escolhida." }
  }

  const sobra = situacao.limiteDiario - situacao.jaMandados
  if (sobra <= 0) {
    return { avisos: [], motivo: "Teto de mensagens do dia já alcançado." }
  }

  // Um assunto, uma mensagem.
  //
  // O motor gera um alerta por período — "falta dinheiro em fevereiro" e
  // "falta dinheiro em março" são dois registros do mesmo tipo, e fazem todo
  // sentido lado a lado numa lista. Como mensagem viram duas interrupções
  // dizendo quase a mesma coisa, que é o que faz alguém silenciar o assessor.
  // Sai o primeiro de cada tipo, que é o mais grave e mais antigo pela ordem
  // que chega.
  const tiposJaEscolhidos = new Set<string>()
  const escolhidos = situacao.pendentes
    .filter((alerta) => PESO[alerta.severidade] >= PESO[situacao.severidadeMinima])
    .filter((alerta) => {
      if (tiposJaEscolhidos.has(alerta.tipo)) return false
      tiposJaEscolhidos.add(alerta.tipo)
      return true
    })
    .slice(0, sobra)

  if (escolhidos.length === 0) {
    return { avisos: [], motivo: "Nada novo que justifique interromper." }
  }

  return {
    avisos: escolhidos.map((alerta) => ({ alertaId: alerta.id, titulo: alerta.titulo, texto: alerta.texto })),
  }
}

/**
 * A janela pode cruzar a meia-noite.
 *
 * "das 22 às 7" é um intervalo de fora, não de dentro — tratar os dois casos
 * com a mesma comparação faria o Tino calar a noite inteira justamente para
 * quem escolheu ser avisado de madrugada.
 */
export function dentroDaJanela(hora: number, inicio: number, fim: number): boolean {
  return inicio <= fim ? hora >= inicio && hora < fim : hora >= inicio || hora < fim
}

/**
 * Manda o que estiver pendente, respeitando todos os freios.
 *
 * `agora` entra por parâmetro para o teste poder escolher a hora sem mexer no
 * relógio do processo.
 */
export async function avisar(larId: string, agora = new Date()): Promise<ResultadoAviso> {
  const config = await prisma.avisoProativo.findUnique({ where: { larId } })

  if (!config) {
    return { avisos: [], enviou: false, motivo: "Este lar não pediu para ser avisado." }
  }

  const inicioDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  const [jaMandados, pendentes] = await Promise.all([
    prisma.alerta.count({ where: { larId, avisadoEm: { gte: inicioDoDia } } }),
    prisma.alerta.findMany({
      where: { larId, avisadoEm: null, dispensadoEm: null },
      orderBy: [{ severidade: "desc" }, { criadoEm: "asc" }],
      take: 50,
      select: { id: true, tipo: true, titulo: true, texto: true, severidade: true },
    }),
  ])

  const { avisos, motivo } = escolherAvisos({
    canal: config.canal,
    limiteDiario: config.limiteDiario,
    horaInicio: config.horaInicio,
    horaFim: config.horaFim,
    severidadeMinima: config.severidadeMinima,
    jaMandados,
    pendentes,
    agora,
  })

  if (avisos.length === 0) return { avisos: [], enviou: false, motivo }

  const destino = await ondeFalar(larId, config.canal as "WHATSAPP" | "TELEGRAM")
  if (!destino) {
    return { avisos, enviou: false, motivo: "O canal escolhido ainda não está conectado." }
  }

  const modelo = modeloDeAvisoConfigurado()
  if (config.canal === "WHATSAPP" && (!modelo || !whatsappDisponivel())) {
    return {
      avisos,
      enviou: false,
      motivo: "O modelo de mensagem aprovado pela Meta ainda não foi configurado.",
    }
  }

  const entregues: string[] = []
  for (const aviso of avisos) {
    const foi = await enviarModelo(destino, modelo as string, [aviso.titulo, aviso.texto])
    if (!foi) break
    entregues.push(aviso.alertaId)
  }

  if (entregues.length === 0) {
    return { avisos, enviou: false, motivo: "A Meta recusou a mensagem." }
  }

  // Marca só o que saiu. Se a entrega parou no meio, o resto continua
  // pendente e tenta na próxima — melhor atrasar um aviso do que perdê-lo.
  await prisma.alerta.updateMany({ where: { id: { in: entregues } }, data: { avisadoEm: agora } })

  return { avisos: avisos.filter((aviso) => entregues.includes(aviso.alertaId)), enviou: true }
}

/**
 * Para onde mandar.
 *
 * O endereço é a conversa já ligada por `conectar SUA_CHAVE` — o Tino não
 * inventa número, e não usa o telefone do cadastro: quem não conectou o canal
 * não pediu para receber mensagem nele.
 */
async function ondeFalar(larId: string, canal: "WHATSAPP" | "TELEGRAM"): Promise<string | null> {
  const chave = await prisma.chaveCaptura.findFirst({
    where: { larId, ativa: true, origem: canal, chatId: { not: null } },
    orderBy: { ultimoUso: "desc" },
    select: { chatId: true },
  })

  return chave?.chatId ?? null
}

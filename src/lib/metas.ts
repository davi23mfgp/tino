import { StatusMeta, TipoMeta, type Meta } from "@prisma/client"
import { ErroDeUso } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { formatarMoeda } from "@/lib/dinheiro"

export function inteiroMeta(valor: unknown, nome: string, minimo = 0, maximo = 2147483647): number {
  if (typeof valor !== "number" || !Number.isInteger(valor) || valor < minimo || valor > maximo) {
    throw new ErroDeUso(`${nome}: informe um inteiro entre ${minimo} e ${maximo}.`)
  }
  return valor
}

export function validarFotoMeta(valor: unknown): string | null {
  if (valor === null || valor === "") return null
  if (typeof valor !== "string" || valor.length > 700000) throw new ErroDeUso("Foto: limite de 500 KB.")
  const partes = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(valor)
  if (!partes) throw new ErroDeUso("Envie uma foto PNG, JPEG ou WebP.")
  const bytes = Buffer.from(partes[2], "base64")
  const valida = partes[1] === "png" ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : partes[1] === "jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP"
  if (!valida || bytes.length > 500 * 1024 || bytes.toString("base64") !== partes[2]) throw new ErroDeUso("Foto inválida ou acima de 500 KB.")
  return valor
}

export async function validarDadosMeta(larId: string, entrada: unknown, atual?: Meta) {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) throw new ErroDeUso("Dados da meta inválidos.")
  const dados = entrada as Record<string, unknown>
  const nome = dados.nome ?? atual?.nome
  if (typeof nome !== "string" || !nome.trim() || nome.length > 120) throw new ErroDeUso("Nome da meta: use até 120 caracteres.")
  const tipo = dados.tipo ?? atual?.tipo ?? "OUTRO"
  const status = dados.status ?? atual?.status ?? "ATIVA"
  if (!Object.values(TipoMeta).includes(tipo as TipoMeta) || !Object.values(StatusMeta).includes(status as StatusMeta)) throw new ErroDeUso("Tipo ou situação inválida.")
  const contaId = dados.contaId !== undefined ? dados.contaId || null : atual?.contaId ?? null
  if (contaId !== null && (typeof contaId !== "string" || !await prisma.conta.findFirst({ where: { id: contaId, larId, tipo: { not: "CARTAO_CREDITO" } } }))) throw new ErroDeUso("Escolha uma conta do seu lar, exceto cartão.")
  const compromissoMensal = dados.compromissoMensal ?? atual?.compromissoMensal ?? false
  if (typeof compromissoMensal !== "boolean") throw new ErroDeUso("Compromisso mensal inválido.")
  const aporteMensalCentavos = inteiroMeta(dados.aporteMensalCentavos ?? atual?.aporteMensalCentavos ?? 0, "Aporte")
  if (compromissoMensal && (!contaId || !aporteMensalCentavos)) throw new ErroDeUso("O compromisso fixo precisa de conta e aporte mensal.")
  const lembrete = dados.lembreteDia !== undefined ? dados.lembreteDia : atual?.lembreteDia ?? null
  const data = dados.dataAlvo !== undefined ? dados.dataAlvo : atual?.dataAlvo ?? null
  if (data !== null && !(data instanceof Date) && (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(data))) throw new ErroDeUso("Prazo inválido.")
  const dataAlvo = data ? new Date(data as string | Date) : null
  if (dataAlvo && !Number.isFinite(dataAlvo.getTime())) throw new ErroDeUso("Prazo inválido.")
  return {
    nome: nome.trim(), tipo: tipo as TipoMeta, status: status as StatusMeta,
    alvoCentavos: inteiroMeta(dados.alvoCentavos ?? atual?.alvoCentavos, "Alvo", 1),
    saldoCentavos: inteiroMeta(dados.saldoCentavos ?? atual?.saldoCentavos ?? 0, "Saldo"),
    aporteMensalCentavos, compromissoMensal, contaId: contaId as string | null, dataAlvo,
    rendimentoAnualBps: inteiroMeta(dados.rendimentoAnualBps ?? atual?.rendimentoAnualBps ?? 0, "Rendimento", 0, 10000),
    prioridade: inteiroMeta(dados.prioridade ?? atual?.prioridade ?? 0, "Prioridade", 0, 100),
    lembreteDia: lembrete === null ? null : inteiroMeta(lembrete, "Dia do lembrete", 1, 31),
    fotoUrl: dados.fotoUrl !== undefined ? validarFotoMeta(dados.fotoUrl) : atual?.fotoUrl ?? null,
  }
}

export function periodoMetas(hoje = new Date()) {
  const data = hoje.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
  const [ano, mes, dia] = data.split("-").map(Number)
  return { competencia: `${ano}-${String(mes).padStart(2, "0")}`, dia, ultimoDia: new Date(Date.UTC(ano, mes, 0)).getUTCDate() }
}

export async function acompanharMetas(larId: string, hoje = new Date()) {
  const periodo = periodoMetas(hoje)
  const metas = await prisma.meta.findMany({ where: { larId }, include: {
    conta: { select: { nome: true } },
    transacoes: { where: { pago: true, competencia: periodo.competencia, data: { lte: hoje } }, select: { tipo: true, valorCentavos: true } },
  }, orderBy: [{ prioridade: "desc" }, { criadoEm: "asc" }] })
  return metas.map(({ transacoes, ...meta }) => {
    const realizadoCentavos = Math.max(0, transacoes.reduce((total, t) => total + (t.tipo === "DESPESA" ? t.valorCentavos : t.tipo === "RECEITA" ? -t.valorCentavos : 0), 0))
    const previstoCentavos = meta.status === "ATIVA" ? meta.aporteMensalCentavos : 0
    return { ...meta, competencia: periodo.competencia, realizadoCentavos, previstoCentavos,
      pendenteCentavos: Math.max(0, previstoCentavos - realizadoCentavos) }
  })
}

/** Usa a mesma caixa de alertas; a chave mensal conserva leitura e evita duplicação. */
export async function atualizarLembretesMetas(larId: string) {
  const periodo = periodoMetas()
  const metas = await acompanharMetas(larId)
  for (const meta of metas) {
    const chave = `meta_lembrete_mensal:${periodo.competencia}:${meta.id}`
    if(meta.pendenteCentavos<=0||meta.status!=="ATIVA")await prisma.alerta.updateMany({where:{larId,chave},data:{lido:true}})
    if (meta.status !== "ATIVA" || meta.lembreteDia === null || periodo.dia < Math.min(meta.lembreteDia, periodo.ultimoDia) || meta.pendenteCentavos <= 0 || meta.saldoCentavos >= meta.alvoCentavos) continue
    const conteudo = { tipo: "meta_lembrete_mensal", severidade: "INFO" as const,
      titulo: `Hora de guardar para ${meta.nome}`,
      texto: `Previsto: ${formatarMoeda(meta.previstoCentavos)}. Realizado: ${formatarMoeda(meta.realizadoCentavos)}. Faltam ${formatarMoeda(meta.pendenteCentavos)} neste mês.`,
      acaoRota: meta.tipo === "RESERVA_EMERGENCIA" ? "/reserva" : "/metas" }
    await prisma.alerta.upsert({ where: { larId_chave: { larId, chave } }, create: { larId, chave, ...conteudo }, update: conteudo })
  }
}

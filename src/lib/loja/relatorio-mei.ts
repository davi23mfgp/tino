import type { Leitura } from "@/lib/loja/ligar-negocio"

/**
 * Relatório Mensal das Receitas Brutas do MEI (passo 41, Davi, 08/10/2026:
 * "A e B misturado, quero meu relatório e minhas notas também").
 *
 * O modelo é o do Anexo X da Resolução CGSN 140/2018: receita de revenda
 * (comércio), de indústria e de serviços, cada uma com e sem nota fiscal, e o
 * total. O MEI preenche até o dia 20 do mês seguinte, não entrega a ninguém e
 * guarda por cinco anos. Atenção ao que NÃO foi conferido: os sites da Receita
 * não abriram na pesquisa (08/10/2026), então a regra vem de fontes
 * secundárias (Portal Tributário, Neon, Contaazul, ver
 * `docs/pesquisas/2026-10-06-relatorio-para-o-contador.md`), que divergem sobre
 * o relatório ser obrigatório. A folha diz isso no rodapé.
 *
 * O ponto de honestidade (regra 3): o Tino não sabia se cada venda saiu com
 * nota. Em vez de inventar a divisão, a venda ganhou "com nota, sem nota ou
 * ainda não marcado", e o relatório mostra o que não foi marcado numa coluna à
 * parte. Pôr tudo em "sem nota" por omissão faria o contador achar que a
 * pessoa vendeu sem nota o mês inteiro.
 */

export type StatusDaNota = "com" | "sem" | "naoMarcado"

/**
 * Uma nota emitida pelo Tino vale por si: o XML autorizado é a prova, e a
 * marcação manual não pode contradizê-la. Sem nota emitida, vale o que a
 * pessoa marcou (`comNota`); nulo é "ainda não marcado".
 */
export function statusDaNota(venda: { comNota: boolean | null; notaEmitida: boolean }): StatusDaNota {
  if (venda.notaEmitida) return "com"
  if (venda.comNota === true) return "com"
  if (venda.comNota === false) return "sem"
  return "naoMarcado"
}

export interface ItemParaClassificar { totalCentavos: number; ehServico: boolean }

/**
 * Divide o total da venda entre comércio e serviço pelo peso dos itens. O
 * desconto fica proporcional, e a sobra de arredondamento vai para a parte
 * maior, para a soma das duas dar sempre o total da venda: uma diferença de um
 * centavo no relatório faria o contador desconfiar do resto.
 */
export function dividirVenda(totalCentavos: number, itens: ItemParaClassificar[]): { comercioCentavos: number; servicosCentavos: number } {
  const bruto = itens.reduce((soma, item) => soma + item.totalCentavos, 0)
  if (bruto <= 0) return { comercioCentavos: totalCentavos, servicosCentavos: 0 }
  const servicoBruto = itens.filter((item) => item.ehServico).reduce((soma, item) => soma + item.totalCentavos, 0)
  const servicos = Math.round((totalCentavos * servicoBruto) / bruto)
  const comercio = totalCentavos - servicos
  return { comercioCentavos: comercio, servicosCentavos: servicos }
}

export interface VendaDoMes {
  totalCentavos: number
  comNota: boolean | null
  notaEmitida: boolean
  itens: ItemParaClassificar[]
}

export interface LinhaDoRelatorio { comCentavos: number; semCentavos: number; naoMarcadoCentavos: number }

export interface RelatorioMensal {
  comercio: LinhaDoRelatorio
  industria: LinhaDoRelatorio
  servicos: LinhaDoRelatorio
  totalCentavos: number
  /** Quanto do total ainda não tem "com nota" ou "sem nota": é o que o contador vai perguntar. */
  naoMarcadoCentavos: number
}

const vazia = (): LinhaDoRelatorio => ({ comCentavos: 0, semCentavos: 0, naoMarcadoCentavos: 0 })

function somar(linha: LinhaDoRelatorio, status: StatusDaNota, centavos: number) {
  if (status === "com") linha.comCentavos += centavos
  else if (status === "sem") linha.semCentavos += centavos
  else linha.naoMarcadoCentavos += centavos
}

/**
 * Monta o relatório de um mês. Mesma regra da tela MEI: se o mês foi lançado à
 * parte (`lancado`), vale o lançamento, e como ele não diz se saiu com nota
 * cai todo em "não marcado"; sem lançamento, valem as vendas do Balcão. Somar
 * as duas fontes contaria a venda duas vezes.
 *
 * Indústria fica zerada: o Tino não separa o que a pessoa fabrica do que
 * revende, e a folha avisa.
 */
export function montarRelatorio(vendas: VendaDoMes[], lancado: { comercioCentavos: number; servicosCentavos: number } | null): RelatorioMensal {
  const relatorio: RelatorioMensal = { comercio: vazia(), industria: vazia(), servicos: vazia(), totalCentavos: 0, naoMarcadoCentavos: 0 }
  const lancadoTotal = lancado ? lancado.comercioCentavos + lancado.servicosCentavos : 0

  if (lancado && lancadoTotal > 0) {
    somar(relatorio.comercio, "naoMarcado", lancado.comercioCentavos)
    somar(relatorio.servicos, "naoMarcado", lancado.servicosCentavos)
  } else {
    for (const venda of vendas) {
      const status = statusDaNota(venda)
      const { comercioCentavos, servicosCentavos } = dividirVenda(venda.totalCentavos, venda.itens)
      somar(relatorio.comercio, status, comercioCentavos)
      somar(relatorio.servicos, status, servicosCentavos)
    }
  }

  for (const linha of [relatorio.comercio, relatorio.industria, relatorio.servicos]) {
    relatorio.totalCentavos += linha.comCentavos + linha.semCentavos + linha.naoMarcadoCentavos
    relatorio.naoMarcadoCentavos += linha.naoMarcadoCentavos
  }
  return relatorio
}

/** O prazo do mês seguinte: dia 20, como diz a orientação do relatório. */
export function prazoDoRelatorio(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number)
  const proximo = mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 }
  return `20/${String(proximo.mes).padStart(2, "0")}/${proximo.ano}`
}

/** O mês que a pessoa fecha por padrão: o anterior ao de hoje, que já terminou. */
export function mesParaFechar(hoje: string): string {
  const [ano, mes] = hoje.slice(0, 7).split("-").map(Number)
  return mes === 1 ? `${ano - 1}-12` : `${ano}-${String(mes - 1).padStart(2, "0")}`
}

/**
 * O que ainda falta numa venda para o relatório ficar fechado (passo 41, Davi:
 * "quero um pendentes de nota, e os com nota quero a nota em anexo").
 *
 * - `marcar`: ninguém disse se saiu com nota.
 * - `anexar`: foi marcada "com nota", mas a nota não está guardada. A nota que
 *   o próprio Tino emitiu conta como guardada (o XML autorizado fica no banco),
 *   então não pede anexo.
 * - `null`: nada pendente (sem nota, ou com nota e a nota em mãos).
 */
export type Pendencia = "marcar" | "anexar" | null

export function pendenciaDaNota(venda: { status: StatusDaNota; notaEmitida: boolean; temAnexo: boolean }): Pendencia {
  if (venda.status === "naoMarcado") return "marcar"
  if (venda.status === "com" && !venda.notaEmitida && !venda.temAnexo) return "anexar"
  return null
}

export const ANEXO_TAMANHO_MAXIMO = 3 * 1024 * 1024
const TIPOS_DE_ANEXO: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "text/xml": [".xml"],
  "application/xml": [".xml"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
}

/**
 * Confere o arquivo da nota antes de guardar: só PDF, XML ou foto, até 3 MB, e
 * a extensão tem de combinar com o tipo. Guardar qualquer coisa que chega
 * abriria o banco para arquivo de outro uso, e o tipo vindo do navegador é
 * dito pela pessoa, não verificado: por isso a extensão também vale.
 */
export function validarAnexo(arquivo: { nome: string; tipo: string; tamanho: number }): Leitura<{ nome: string; tipo: string }> {
  if (arquivo.tamanho <= 0) return { ok: false, erro: "O arquivo está vazio." }
  if (arquivo.tamanho > ANEXO_TAMANHO_MAXIMO) return { ok: false, erro: "O arquivo passa de 3 MB. Mande a nota em PDF ou XML." }
  const nome = arquivo.nome.replace(/[\\/\r\n\t"]/g, "_").replace(/\s+/g, " ").trim().slice(0, 120) || "nota"
  const extensoes = TIPOS_DE_ANEXO[arquivo.tipo.toLowerCase()]
  if (!extensoes) return { ok: false, erro: "Anexe a nota em PDF, XML, PNG ou JPG." }
  if (!extensoes.some((extensao) => nome.toLowerCase().endsWith(extensao))) return { ok: false, erro: "O nome do arquivo não combina com o tipo. Confira a extensão." }
  return { ok: true, valor: { nome, tipo: arquivo.tipo.toLowerCase() } }
}

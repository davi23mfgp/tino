import { formatarMoeda } from "@/lib/dinheiro"

import estilos from "./clientes.module.css"

export interface Retomar {
  clienteId: string
  nome: string
  telefone: string | null
  orcamentoId: string | null
  numero: number | null
  valorCentavos: number | null
  linha: string
  quando: string
  tom: "atencao" | "neutro" | "positivo"
}

export interface ClienteDaLista {
  id: string
  nome: string
  telefone: string | null
  numeros: number[]
  detalhe: string
  valorCentavos: number | null
  rotuloValor: string
}

export interface Janela { fechados: number; enviados: number; bps: number | null }

export interface Resumo {
  loja: { nome: string }
  retomar: Retomar[]
  emAberto: { totalCentavos: number; quantidade: number; partes: { rascunho: number; enviado: number; visto: number } }
  fechamento: { atual: Janela; anterior: Janela }
  clientes: ClienteDaLista[]
}

export interface ItemDoOrcamento {
  id?: string
  produtoId: string | null
  servicoId: string | null
  descricao: string
  quantidade: number
  precoUnitarioCentavos: number
  totalCentavos?: number
}

export type Situacao = "rascunho" | "enviado" | "visto" | "vencido" | "aprovado" | "convertido" | "perdido"

export interface OrcamentoDaFicha {
  id: string
  numero: number
  status: string
  situacao: Situacao
  versao: number
  totalCentavos: number
  descontoCentavos: number
  entradaCentavos: number | null
  parcelas: number
  validoAte: string | null
  enviadoEm: string | null
  aberturas: number
  ultimaAberturaEm: string | null
  aprovadoEm: string | null
  aprovadoPeloCliente: boolean
  motivoPerda: string | null
  motivoPerdaDetalhe: string | null
  vendaNumero: number | null
  observacao: string | null
  itens: ItemDoOrcamento[]
  pagamento: { entradaCentavos: number; parcelas: number[] }
  link: string | null
  criadoEm: string
}

export interface Ficha {
  loja: { nome: string }
  cliente: { id: string; nome: string; telefone: string | null; email: string | null; observacao: string | null; proximoPasso: string | null; proximoPassoEm: string | null; criadoEm: string }
  compras: { quantidade: number; totalCentavos: number }
  fiadoCentavos: number
  orcamentos: OrcamentoDaFicha[]
}

export const numeroDoOrcamento = (numero: number) => String(numero).padStart(4, "0")

export const iniciais = (nome: string) =>
  nome.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]!.toUpperCase()).join("") || "?"

/** (11) 9 8765-4321, como se escreve no Brasil; o que não couber fica como veio. */
export function formatarTelefone(telefone: string) {
  const d = telefone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "")
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d[2]} ${d.slice(3, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return telefone
}

/** Telefone para o link do WhatsApp: só dígitos, com o 55 do Brasil quando faltar. */
export function linkDoWhatsApp(telefone: string | null, texto: string) {
  const digitos = telefone?.replace(/\D/g, "") ?? ""
  if (!digitos) return `https://wa.me/?text=${encodeURIComponent(texto)}`
  return `https://wa.me/${digitos.length <= 11 ? `55${digitos}` : digitos}?text=${encodeURIComponent(texto)}`
}

export function Reais({ centavos }: { centavos: number }) {
  const texto = formatarMoeda(centavos)
  const virgula = texto.lastIndexOf(",")
  return <span className="valor-sensivel">{texto.slice(0, virgula)}<small>{texto.slice(virgula)}</small></span>
}

export function Avatar({ nome, grande }: { nome: string; grande?: boolean }) {
  return <span className={estilos.avatar} data-grande={grande ? "" : undefined} aria-hidden>{iniciais(nome)}</span>
}

export function Selo({ texto, tom }: { texto: string; tom?: "atencao" | "neutro" | "positivo" }) {
  return <span className={estilos.selo} data-tom={tom}>{texto}</span>
}

/** Validade gravada à meia-noite UTC do dia: lê o dia, não a hora. */
export const diaGravado = (iso: string) => iso.slice(0, 10).split("-").reverse().slice(0, 2).join("/")

export function quandoFoi(iso: string) {
  const data = new Date(iso)
  const hoje = new Date()
  const ontem = new Date(Date.now() - 86_400_000)
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h")
  if (data.toDateString() === hoje.toDateString()) return `hoje, ${hora}`
  if (data.toDateString() === ontem.toDateString()) return `ontem, ${hora}`
  return `${data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}, ${hora}`
}

export const ROTULO_SITUACAO: Record<Situacao, { texto: string; tom?: "atencao" | "positivo" }> = {
  rascunho: { texto: "rascunho" },
  enviado: { texto: "enviado, não abriu" },
  visto: { texto: "aberto pelo cliente", tom: "positivo" },
  vencido: { texto: "venceu", tom: "atencao" },
  aprovado: { texto: "aprovado", tom: "positivo" },
  convertido: { texto: "virou venda" },
  perdido: { texto: "perdido" },
}

/**
 * Regras da entrada do aparelho na assistência técnica (passo 39, opções A e
 * C juntas, Davi, 07/10/2026). Estudo:
 * `docs/pesquisas/2026-10-06-area-funda-assistencia-tecnica.md`.
 *
 * A entrada existe para acabar com a briga do balcão: "o aparelho não chegou
 * assim". Por isso o que não foi testado fica "não testado", nunca vira
 * "funciona" sozinho: o Tino não afirma um teste que ninguém fez (regra 3).
 * O botão "o resto funciona" existe, mas é a pessoa que toca.
 */

import type { TipoDeAparelho } from "./modelos"

export type EstadoDaPeca = "ok" | "defeito" | "nao_testado"

export interface Peca {
  chave: string
  nome: string
}

const DO_CELULAR: Peca[] = [
  { chave: "camera", nome: "Câmera" }, { chave: "tela", nome: "Tela" }, { chave: "toque", nome: "Toque" },
  { chave: "som", nome: "Som" }, { chave: "microfone", nome: "Microfone" }, { chave: "botoes", nome: "Botões" },
  { chave: "biometria", nome: "Biometria" }, { chave: "wifi", nome: "Wi-Fi" }, { chave: "carga", nome: "Carga" },
]

export const PECAS: Record<TipoDeAparelho, Peca[]> = {
  celular: DO_CELULAR,
  tablet: DO_CELULAR.filter((peca) => peca.chave !== "biometria"),
  notebook: [
    { chave: "liga", nome: "Liga" }, { chave: "tela", nome: "Tela" }, { chave: "teclado", nome: "Teclado" }, { chave: "touchpad", nome: "Touchpad" },
    { chave: "carga", nome: "Carga" }, { chave: "usb", nome: "Entradas USB" }, { chave: "wifi", nome: "Wi-Fi" }, { chave: "som", nome: "Som" },
  ],
  computador: [
    { chave: "liga", nome: "Liga" }, { chave: "imagem", nome: "Imagem" }, { chave: "usb", nome: "Entradas USB" }, { chave: "rede", nome: "Rede e Wi-Fi" }, { chave: "som", nome: "Som" },
  ],
  videogame: [
    { chave: "liga", nome: "Liga" }, { chave: "imagem", nome: "Imagem" }, { chave: "controles", nome: "Controles" }, { chave: "leitor", nome: "Leitor de disco" },
    { chave: "usb", nome: "Entradas USB" }, { chave: "wifi", nome: "Wi-Fi" }, { chave: "som", nome: "Som" },
  ],
  relogio: [
    { chave: "liga", nome: "Liga" }, { chave: "tela", nome: "Tela" }, { chave: "toque", nome: "Toque" }, { chave: "carga", nome: "Carga" }, { chave: "sensores", nome: "Sensores" },
  ],
  fone: [
    { chave: "liga", nome: "Liga" }, { chave: "som", nome: "Som" }, { chave: "microfone", nome: "Microfone" }, { chave: "carga", nome: "Carga" }, { chave: "pareamento", nome: "Pareamento" },
  ],
  outro: [
    { chave: "liga", nome: "Liga" }, { chave: "funciona", nome: "Funciona normal" }, { chave: "botoes", nome: "Botões" }, { chave: "cabo", nome: "Cabo e tomada" },
  ],
}

export const ACESSORIOS: Record<TipoDeAparelho, string[]> = {
  celular: ["Chip", "Capinha", "Cartão de memória", "Carregador", "Cabo", "Caixa"],
  tablet: ["Chip", "Capinha", "Carregador", "Cabo", "Caneta", "Caixa"],
  notebook: ["Carregador", "Mochila ou capa", "Mouse", "Caixa"],
  computador: ["Cabo de força", "Teclado", "Mouse", "Monitor"],
  videogame: ["Controle", "Cabo de força", "Cabo HDMI", "Caixa"],
  relogio: ["Carregador", "Pulseira extra", "Caixa"],
  fone: ["Estojo", "Cabo", "Caixa"],
  outro: ["Cabo", "Controle", "Caixa"],
}

export const TIPOS_DE_APARELHO = Object.keys(PECAS) as TipoDeAparelho[]

/** O tipo de partida, pela subárea da loja: a assistência de videogame abre no videogame. */
export function tipoDaSubarea(subarea: string | null | undefined): TipoDeAparelho {
  if (subarea === "Informática") return "notebook"
  if (subarea === "Videogame") return "videogame"
  if (subarea === "Eletrodoméstico" || subarea === "Eletrônicos") return "outro"
  return "celular"
}

/**
 * O toque na peça: o primeiro marca defeito (é o que a opção C pede, "toque
 * onde tem defeito"), o segundo marca que funciona, o terceiro volta a "não
 * testado".
 */
export function proximoEstado(atual: EstadoDaPeca | undefined): EstadoDaPeca {
  if (atual === undefined || atual === "nao_testado") return "defeito"
  if (atual === "defeito") return "ok"
  return "nao_testado"
}

/** "O resto funciona": marca como ok só o que ainda não foi tocado. Defeito marcado fica. */
export function marcarRestoComoOk(estado: Record<string, EstadoDaPeca>, tipo: TipoDeAparelho): Record<string, EstadoDaPeca> {
  const novo = { ...estado }
  for (const peca of PECAS[tipo]) if (!novo[peca.chave] || novo[peca.chave] === "nao_testado") novo[peca.chave] = "ok"
  return novo
}

/** Lê o JSON do banco ou do pedido, só com peças do tipo e estados conhecidos. */
export function lerEstado(valor: unknown, tipo: TipoDeAparelho): Record<string, EstadoDaPeca> {
  const lido: Record<string, EstadoDaPeca> = {}
  if (!valor || typeof valor !== "object") return lido
  for (const peca of PECAS[tipo]) {
    const estado = (valor as Record<string, unknown>)[peca.chave]
    if (estado === "ok" || estado === "defeito") lido[peca.chave] = estado
  }
  return lido
}

/** As peças em três grupos, na ordem da lista, para a ficha e para o link do cliente. */
export function resumoDaEntrada(estado: Record<string, EstadoDaPeca>, tipo: TipoDeAparelho) {
  const grupos = { defeito: [] as string[], ok: [] as string[], naoTestado: [] as string[] }
  for (const peca of PECAS[tipo]) {
    const atual = estado[peca.chave]
    if (atual === "defeito") grupos.defeito.push(peca.nome)
    else if (atual === "ok") grupos.ok.push(peca.nome)
    else grupos.naoTestado.push(peca.nome)
  }
  return grupos
}

export function lerAcessorios(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 12) : []
}

/**
 * IMEI tem 15 dígitos e o último confere os outros (Luhn). Digitado errado,
 * ele não prova nada na entrega, então a tela avisa na hora. Número de série
 * (notebook, videogame) não tem regra e vale como está.
 */
export function conferirSerie(texto: string): "vazio" | "imei" | "imei_errado" | "serie" {
  const limpo = texto.replace(/[\s.-]/g, "")
  if (!limpo) return "vazio"
  if (!/^\d+$/.test(limpo)) return "serie"
  if (limpo.length !== 15) return limpo.length >= 14 && limpo.length <= 16 ? "imei_errado" : "serie"
  let soma = 0
  for (let indice = 0; indice < 15; indice += 1) {
    let digito = Number(limpo[indice])
    if (indice % 2 === 1) {
      digito *= 2
      if (digito > 9) digito -= 9
    }
    soma += digito
  }
  return soma % 10 === 0 ? "imei" : "imei_errado"
}

export type TipoDeSenha = "PADRAO" | "NUMERO" | "NENHUMA"

/**
 * Padrão: a ordem dos pontos de 1 a 9, de 4 a 9 pontos sem repetir (é a
 * regra do Android). Número ou senha: até 32 caracteres, que é o que cabe na
 * tela de bloqueio.
 */
export function senhaValida(tipo: TipoDeSenha, valor: string): boolean {
  if (tipo === "NENHUMA") return valor === ""
  if (tipo === "PADRAO") return /^[1-9]{4,9}$/.test(valor) && new Set(valor).size === valor.length
  return valor.length >= 1 && valor.length <= 32
}

export const DIAS_DE_GARANTIA = 90

/**
 * Garantia do conserto: 90 dias contados da entrega (Código de Defesa do
 * Consumidor, art. 26, II e § 1º). Antes da entrega não há data: o prazo
 * ainda não começou, e a tela diz isso em vez de inventar uma.
 */
export function garantiaDoConserto(etapasEm: Record<string, string> | null | undefined, agora: Date) {
  const entregue = etapasEm?.ENTREGUE ? new Date(etapasEm.ENTREGUE) : null
  if (!entregue || Number.isNaN(entregue.getTime())) return { comecou: false as const }
  const ate = new Date(entregue.getTime() + DIAS_DE_GARANTIA * 86_400_000)
  const restam = Math.ceil((ate.getTime() - agora.getTime()) / 86_400_000)
  return { comecou: true as const, entregueEm: entregue, ate, vigente: restam > 0, diasRestantes: Math.max(0, restam) }
}

/** O IMEI no link do cliente: só o final. O link anda por WhatsApp e não precisa do número inteiro. */
export function serieMascarada(serie: string | null): string | null {
  if (!serie) return null
  const limpo = serie.replace(/\s/g, "")
  return limpo.length <= 4 ? limpo : `final ${limpo.slice(-4)}`
}

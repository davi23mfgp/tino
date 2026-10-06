/**
 * As áreas do Tino por área (Davi, 06/10/2026; opção A do passo 38).
 *
 * O Tino é um app só. A área escolhida no começo diz o que ele destaca e com
 * que nomes fala, nunca muda o cálculo do DAS, do limite ou do dinheiro: uma
 * regra de imposto só, testada uma vez. A lista e a ordem vêm do estudo em
 * `docs/pesquisas/2026-10-06-escolha-de-area-e-varios-negocios.md` e do plano
 * estratégico (as 10 primeiras, por volume e por operação para organizar).
 *
 * "O que vem pronto" só lista o que o Tino já faz hoje. A prévia que promete
 * o que não existe é o número inventado da tela de cadastro (regra 3).
 */

export type TipoDeArea = "servico" | "comercio" | "misto"

export interface Area {
  id: string
  nome: string
  /** Nome curto para "Seu Tino ___ vem assim". */
  curto: string
  tipo: TipoDeArea
  subareas: string[]
}

export const AREAS: Area[] = [
  { id: "assistencia", nome: "Assistência técnica", curto: "Assistência", tipo: "misto", subareas: ["Celular", "Informática", "Videogame", "Eletrodoméstico", "Eletrônicos"] },
  { id: "beleza", nome: "Beleza", curto: "Beleza", tipo: "misto", subareas: ["Cabeleireiro", "Barbearia", "Manicure", "Estética", "Sobrancelha e cílios"] },
  { id: "moda", nome: "Moda e roupas", curto: "Moda", tipo: "comercio", subareas: ["Loja de roupa", "Sacoleira", "Brechó", "Calçados", "Acessórios"] },
  { id: "alimentacao", nome: "Alimentação", curto: "Alimentação", tipo: "comercio", subareas: ["Lanchonete", "Marmita", "Doces e bolos", "Salgados", "Açaí"] },
  { id: "obras", nome: "Obras e reformas", curto: "Obras", tipo: "servico", subareas: ["Pedreiro", "Pintor", "Gesseiro", "Azulejista"] },
  { id: "instalacao", nome: "Instalação e manutenção", curto: "Instalação", tipo: "misto", subareas: ["Ar-condicionado", "Eletricista", "Encanador", "Refrigeração", "Chaveiro"] },
  { id: "mercadinho", nome: "Mercadinho e bairro", curto: "Mercadinho", tipo: "comercio", subareas: ["Mercearia", "Conveniência", "Hortifruti", "Papelaria", "Bazar"] },
  { id: "oficina", nome: "Oficina e veículos", curto: "Oficina", tipo: "misto", subareas: ["Mecânico de moto", "Borracharia", "Lava-jato", "Som e acessórios"] },
  { id: "pets", nome: "Pets", curto: "Pets", tipo: "misto", subareas: ["Banho e tosa", "Pet shop", "Adestramento"] },
  { id: "costura", nome: "Costura e consertos", curto: "Costura", tipo: "servico", subareas: ["Ajustes de roupa", "Costura sob medida", "Bordado", "Artesanato"] },
]

/** Quem não se acha na lista. Conta à parte: muita escolha aqui quer dizer que a lista está errada. */
export const OUTRA_AREA: Area = { id: "outra", nome: "Outra área", curto: "", tipo: "misto", subareas: [] }

export const SUBAREA_OUTRA = "Outro"

export function areaPorId(id: string | null | undefined): Area | null {
  if (!id) return null
  if (id === OUTRA_AREA.id) return OUTRA_AREA
  return AREAS.find((area) => area.id === id) ?? null
}

/**
 * Confere a escolha antes de gravar. Subárea vazia vale só para "Outra área",
 * que não tem lista; nas outras, ou é uma da lista, ou "Outro".
 */
export function escolhaValida(areaId: string, subarea: string | null): boolean {
  const area = areaPorId(areaId)
  if (!area) return false
  if (area.id === OUTRA_AREA.id) return subarea === null || subarea.trim().length <= 60
  if (!subarea) return false
  return subarea === SUBAREA_OUTRA || area.subareas.includes(subarea)
}

export interface ItemQueVem {
  icone: "chave" | "documento" | "calendario" | "sacola" | "caixa" | "caderno" | "loja"
  texto: string
}

/**
 * O que já vem pronto para a área, só com o que existe hoje. Serviço ganha
 * orçamento, agenda e ordem de serviço; comércio ganha prateleira e fiado; a
 * área que faz as duas coisas ganha o DAS separando as partes.
 */
export function oQueVem(areaId: string): ItemQueVem[] {
  const area = areaPorId(areaId)
  if (!area) return []
  const servico = area.tipo !== "comercio"
  const comercio = area.tipo !== "servico"
  const itens: ItemQueVem[] = []
  if (servico) {
    itens.push({ icone: "chave", texto: "Ordem de serviço com etapas, checklist e aviso de pronto para o cliente" })
    itens.push({ icone: "documento", texto: "Orçamento com link para o cliente aprovar" })
    itens.push({ icone: "calendario", texto: "Agenda com o prazo de cada serviço" })
  }
  itens.push({ icone: "sacola", texto: comercio ? "Balcão para vender e receber, com a taxa de cada maquininha" : "Balcão para cobrar e receber, com a taxa de cada maquininha" })
  if (comercio) {
    itens.push({ icone: "caixa", texto: "Prateleira com custo e margem de cada produto" })
    itens.push({ icone: "caderno", texto: "Fiado: quem deve e há quanto tempo" })
  }
  itens.push({
    icone: "loja",
    texto: area.tipo === "misto"
      ? "DAS separando produto (comércio) e mão de obra (serviço)"
      : "DAS e limite do MEI sem digitar o faturamento",
  })
  return itens
}

/** "Assistência técnica · Celular", para a lista de negócios. */
export function rotuloDaArea(areaId: string | null, subarea: string | null): string | null {
  const area = areaPorId(areaId)
  if (!area) return null
  if (area.id === OUTRA_AREA.id) return subarea?.trim() || OUTRA_AREA.nome
  return subarea && subarea !== SUBAREA_OUTRA ? `${area.nome} · ${subarea}` : area.nome
}

/**
 * Qual negócio abre: o que a pessoa escolheu por último, se ainda for dela;
 * senão o mais antigo. O cookie é só preferência: quem decide se a loja é do
 * lar é a lista que veio do banco, nunca o valor do cookie.
 */
export function negocioAtivo<T extends { id: string }>(lojasDoLar: T[], escolhido: string | null | undefined): T | null {
  if (lojasDoLar.length === 0) return null
  return lojasDoLar.find((loja) => loja.id === escolhido) ?? lojasDoLar[0]
}

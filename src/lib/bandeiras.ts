/// Como cada bandeira é escrita no cartão. Texto, não logo: as marcas são
/// registradas e o Tino não tem licença para reproduzi-las.
export const ROTULO_BANDEIRA: Record<string, string> = {
  VISA: "VISA",
  MASTERCARD: "Mastercard",
  ELO: "elo",
  AMERICAN_EXPRESS: "AMEX",
  HIPERCARD: "Hipercard",
  OUTRA: "",
}

/**
 * Os quatro últimos dígitos, quando a pessoa os escreveu no nome do cartão
 * ("Cartão Platinum (final 8842)"). Não existe campo próprio: sem o final no
 * nome, a tela não mostra número nenhum em vez de inventar um.
 */
export function finalDoCartao(nome: string): string | null {
  return nome.match(/final\s*(\d{4})/i)?.[1] ?? null
}

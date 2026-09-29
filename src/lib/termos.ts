/**
 * Versão vigente dos Termos de Uso e da Política de Privacidade.
 *
 * Mudou o texto de forma que afete direito ou obrigação? Suba a versão e
 * escreva em `MUDANCAS_DA_VERSAO` o que mudou: quem aceitou a anterior vê o
 * aviso dentro do app (`AvisoDeTermos`) até tocar em "Entendi" (LGPD, art. 8º,
 * §6º — mudança de finalidade exige informar o titular). Até 29/09/2026 este
 * comentário prometia o aviso, mas nada no app o mostrava.
 */
export const VERSAO_TERMOS = "2026-09-29"

/** O que mudou na versão vigente, em uma frase, para o aviso do app. */
export const MUDANCAS_DA_VERSAO =
  "A política de privacidade passou a dizer o que o registro de erros guarda, o que quem administra o Tino vê (e o que não vê) e como a loja de cada compra é identificada para mostrar o logo."

/** Quem ainda não viu a versão vigente — inclusive quem se cadastrou antes de haver versão. */
export function precisaVerTermos(versaoDoUsuario: string | null | undefined): boolean {
  return !versaoDoUsuario || versaoDoUsuario < VERSAO_TERMOS
}

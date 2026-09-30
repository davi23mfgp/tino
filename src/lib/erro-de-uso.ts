/** Erro esperado, separado da API para cálculos/limites não carregarem autenticação. */
export class ErroDeUso extends Error {
  constructor(mensagem: string, readonly status = 400) { super(mensagem) }
}

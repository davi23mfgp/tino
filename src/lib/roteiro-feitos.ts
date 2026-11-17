/**
 * O que já foi feito no "Montar o seu Tino", lido dos dados e não de uma
 * marca guardada: quem cadastrou a conta por outra tela não responde de novo.
 *
 * Fica num lugar só porque duas telas precisam da mesma resposta: o roteiro
 * (`/montar`, opção B do passo 61) e a lista no alto do Início (opção A,
 * aprovada pelo Davi em 13/11/2026). Com duas contas separadas, a lista
 * diria "falta" num passo que o roteiro mostra como feito.
 */
export interface DadosDoRoteiro {
  contas: { tipo: string; instituicao: string | null }[]
  rendasFixas: number
  rendaDeclaradaCentavos: number
  contasFixas: number
  limitesDoMes: number
  lancamentos: number
}

export const PASSOS_DO_ROTEIRO = [
  { titulo: "Suas contas e cartões", apoio: "onde o dinheiro fica" },
  { titulo: "Quanto entra por mês", apoio: "salário, extra, pensão" },
  { titulo: "Contas fixas", apoio: "aluguel, luz, internet" },
  { titulo: "Limites do mês", apoio: "quanto pode ir para cada coisa" },
  { titulo: "Extrato do banco", apoio: "o Tino lê o arquivo do banco" },
] as const

export function feitosDoRoteiro(dados: DadosDoRoteiro): boolean[] {
  return [
    // O cadastro já cria "Conta corrente" e "Carteira", sem banco: só conta
    // com banco escolhido ou cartão vale como passo feito, senão o roteiro
    // começaria pulando a pergunta 1 para todo mundo.
    dados.contas.some((conta) => conta.tipo === "CARTAO_CREDITO" || Boolean(conta.instituicao)),
    dados.rendasFixas > 0 || dados.rendaDeclaradaCentavos > 0,
    dados.contasFixas > 0,
    dados.limitesDoMes > 0,
    dados.lancamentos > 0,
  ]
}

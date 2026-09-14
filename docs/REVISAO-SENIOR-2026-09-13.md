# Revisão sênior do redesign

Pedido: confrontar as 53 tarefas, o prompt final do Sol e as referências com a implementação. Capturas criticadas são evidência de defeitos, não modelos aprovados.

## Lacunas confirmadas

- Extrato: filtros empilhados ocupam a primeira dobra; logo opcional quebra a grade; categoria tem destaque excessivo; links de categoria do painel não aplicam filtro.
- Cartões: `--acao` não existe, ocultando barras confirmadas e deixando sliders na cor nativa; faltam saldo restante das parcelas e ações na ajuda.
- Orçamento: campo monetário reformata a cada tecla; adicionar categoria insere R$ 10 sem escolha; plano antigo é reaplicado a meses novos.
- Ajuda: câmbio fictício preenchido; créditos ignorados na estimativa; nenhuma ação liga economia a orçamento.
- Painel: pendências limitadas a quatro usadas como quantidade e total; confirmados e previstos futuros combinados sem identificação.
- A declaração anterior de conclusão integral é inválida. Build e testes unitários não provam fidelidade visual.

## Direção da correção

Manter preto e esmeralda do Tino. Tipografia nativa, pesos moderados, superfícies discretas, separadores finos, controles proporcionais e áreas de toque acessíveis. Extrato em uma superfície, resumo curto e barra de filtros; carteira empilhada com conteúdo legível; parcelas com progresso e restante; orçamento editável sem atrito; ajuda com resultado e próxima ação executável.

## Validação

Pendente nesta revisão: evidência visual final, cálculos/persistência/autorização, revisão dos 53 itens e implantação. Não marcar concluído antes da evidência.

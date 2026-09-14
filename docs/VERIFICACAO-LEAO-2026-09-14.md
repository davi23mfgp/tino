# Verificação local — leão e painel

## Entrega desta sessão

- Mascote final: `public/mascote/tino-transparente.png`, meia face com óculos, traço monocromático e canal alfa verificado. A máscara CSS adapta os traços ao tema. A marca aproxima o rosto de `tino.` para sugerir que está espiando.
- Painel: superfícies translúcidas discretas, hierarquia compacta, próximo passo acionável e explicações longas recolhidas.
- Gráfico por categorias usa o conjunto completo para que o total não represente apenas as cinco categorias listadas.
- Orçamento: sliders preservam centavos. O teste visual com R$ 1.234,56 revelou arredondamento para R$ 1.235,00; `step=1` corrigiu a divergência entre campo e slider.

## Evidências

- Conferência real em navegador local, `http://localhost:3200`: painel desktop, painel móvel, orçamento e extrato carregado. A marca e o retrato apareceram sem retângulo de fundo.
- No painel móvel: largura interna 391px, conteúdo 376px, sem overflow horizontal observado.
- Orçamento: após digitar e sair do campo, R$ 1.234,56 correspondeu ao valor 123456 do slider. Nenhum orçamento da demonstração foi salvo nessa conferência.
- Tipos e build de produção passaram nesta rodada.
- Suíte: 306 aprovados, 1 teste de integração ignorado por depender de flag; executado separadamente contra banco local, esse teste também passou. Ele verifica idempotência por evento, confirmação concorrente e exclusão mútua entre confirmar e descartar.

## Limites e continuidade

Esta verificação complementa o relatório de revisão sênior e o registro de outra sessão que não conseguiu verificar o navegador. Não certifica as 53 tarefas históricas nem equivalência pixel a pixel com referências ausentes.

Os sete achados funcionais foram tratados no trabalho compartilhado: transições de captura, deduplicação por evento, competência de fatura, saldo disponível, isolamento mensal de orçamento, edição de valores e competência de parcelas. Migrações foram aplicadas e verificadas no banco local; publicação em produção não foi verificada aqui.

Pendências observadas para uma próxima rodada: reconciliar parcelas previstas com lançamentos antes de somá-los na próxima fatura do painel; abrir diretamente o cartão clicado no painel (os links ainda vão à página geral); conferir visualmente todos os estados de ajuda e parcelas. Não considerar essas pendências concluídas pelos testes acima.

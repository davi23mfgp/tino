# Velocidade das telas: antes e depois (Lote 2 da auditoria)

**Como medi.** Build de produção local (`next build` e `next start`), iPhone 13
simulado, rede 4G (150 ms de latência, 1,6 Mbit/s) e processador 4 vezes mais
lento. O tempo vai do pedido da página até haver texto útil na tela sem
"Carregando" nem esqueleto. Cada tela foi aberta duas vezes; a tabela mostra a
melhor das duas. O banco é local, então a ida e volta ao banco aqui é quase
zero: na Vercel, cada busca que saiu do navegador economiza também essa ida.

**O que mudou.**
1. Extrato, Meu mês, Anotar e Contas a pagar da loja chegam com os dados no
   HTML (`lib/dados-iniciais.ts`): o servidor chama a mesma rota da API, com
   a mesma checagem. Cartões, Início e Balcão já vinham do servidor.
2. Os gráficos de Análise e Orçamento carregam depois da tela, num espaço da
   mesma altura.
3. As leituras pararam de abrir uma transação com trava no banco para contar
   limite. Escrita e rotas caras continuam com limite.

| Tela | Antes (s) | Depois (s) | Mexida neste lote |
|---|---|---|---|
| /painel | 0,74 | 0,67 |  |
| /transacoes | 1,24 | 0,71 | sim |
| /meu-mes | 0,51 | 0,61 | sim |
| /cartoes | 0,82 | 0,72 |  |
| /lancar | 0,39 | 0,39 |  |
| /capturas | 1,16 | 0,68 | sim |
| /recorrencias | 1,24 | 1,23 |  |
| /dividas | 0,45 | 0,39 |  |
| /metas | 0,41 | 0,60 |  |
| /plano | 0,61 | 0,67 |  |
| /projecao | 0,73 | 0,35 |  |
| /analise | 0,59 | 0,75 | sim |
| /investir | 0,99 | 1,11 |  |
| /reserva | 0,52 | 0,67 |  |
| /simulador | 1,42 | 1,45 |  |
| /emprestimos | 0,57 | 0,31 |  |
| /milhas | 1,01 | 1,09 |  |
| /categorias | 1,14 | 1,04 |  |
| /regras | 0,92 | 0,96 |  |
| /importar | 0,58 | 0,41 |  |
| /bancos | 0,69 | 0,69 |  |
| /orcamento | 0,66 | 0,38 | sim |
| /configuracoes | 1,05 | 1,05 |  |
| /assinatura | 0,86 | 0,97 |  |
| /loja | 0,45 | 0,46 |  |
| /loja/painel | 1,20 | 1,27 |  |
| /loja/contas | 0,89 | 0,60 | sim |
| /loja/fiado | 0,94 | 0,98 |  |
| /loja/catalogo | 1,01 | 1,01 |  |
| /loja/estoque | 0,61 | 0,41 |  |
| /loja/clientes | 0,90 | 0,88 |  |
| /loja/agenda | 0,90 | 0,86 |  |
| /loja/financas | 0,31 | 0,51 |  |
| /loja/fechar-mes | 0,89 | 0,96 |  |
| /loja/maquininha | 0,41 | 0,35 |  |
| /loja/simples | 0,41 | 0,44 |  |
| /mei | 0,43 | 0,47 |  |

**Leitura honesta.**
- Melhorou de verdade: Extrato (1,24 para cerca de 0,71), Anotar (1,16 para
  cerca de 0,68) e Contas a pagar da loja (0,89 para cerca de 0,60).
- Meu mês ficou 0,1 s mais lento (0,51 para 0,61), dentro do ruído desta
  máquina. A busca dele já era rápida; o ganho é só não piscar o
  "Carregando". Não é melhora.
- Análise ficou igual ou um pouco pior nesta medida, que conta o texto e não o
  gráfico. O ganho do gráfico sob demanda é no tamanho do pacote, e não
  aparece aqui.
- As outras telas variam de 0,1 a 0,3 s entre as duas medições sem ter mudado:
  é o ruído desta máquina. Diferença menor que isso não é resultado.
- Toda tela do app ainda mostra por um instante o esqueleto do `loading.tsx`
  enquanto o servidor monta a página. Isso é do layout, não das telas, e fica
  para a próxima rodada.

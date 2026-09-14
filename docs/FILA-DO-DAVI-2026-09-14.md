# Fila pedida pelo Davi em 14/09/2026

Registro do que foi pedido durante a sessão, na ordem em que chegou, para
nenhuma peça se perder quando o terminal fechar.

## 1. Refazer os sete achados P1/P2 do relatório sênior — em andamento

| # | Achado | Estado |
|---|---|---|
| 4 | Projeção partia do patrimônio, não do caixa | **feito** — `lib/saldo-disponivel.ts`, painel mostra "aplicado" ao lado do disponível, 9 testes |
| 3 | Compra de cartão sem competência de fatura | regra escrita e testada (`lib/competencia-cartao.ts`); falta ligar nas rotas e no schema |
| 1 | Captura confirmada pode ser descartada | a fazer — máquina de estados |
| 2 | Dedup engole compra legítima | a fazer — identidade de evento |
| 5 | Orçamento herda valor legado em mês sem plano | a fazer |
| 6 | Categoria entra com R$ 10; campo reformata a cada tecla | a fazer |
| 7 | Detalhe de parcela não acompanha o mês | a fazer |

## 2. Mobile — em andamento

- **Feito:** o vão preto em volta da rosca de "Para onde foi". A grade da seção
  recebia `flex:1` e `align-items:center`, então esticava para preencher a
  coluna e centralizava um desenho de 200px numa faixa bem mais alta. No
  celular isso virava meia tela vazia. Também travei o rótulo "gasto até hoje"
  em uma linha.
- **A conferir:** a captura que o Davi mandou é de `tino-kappa.vercel.app`, que
  está atrás do local. Parte do que aparece nela pode já não existir no código
  de hoje. Falta comparar depois de publicar.

## 3. Calendário na tela de transações — a fazer

Pedido em 14/09 com captura de referência (app roxo): faixa de dias da semana
com o dia selecionado em destaque e um ponto marcando os dias que têm
lançamento, alternância Dia/Mês, e a lista abaixo respondendo ao dia escolhido.
O extrato já agrupa por dia desde hoje — o calendário é a navegação que falta
por cima desse agrupamento.

## 4. Lista de recursos das imagens 1 e 3 — a decidir

O Davi mandou duas telas de plano (app roxo) dizendo que quer "tudo isso
funcionando no sistema também":

1. Sincronização automática com bancos via **Open Finance**
2. Assistente de **IA** com chat e insights
3. Faturas de cartão com **tendência real e projetada**
4. **Saldo previsto** e projeção diária antes das contas vencerem
5. **Calendário financeiro** com receitas, despesas e recorrências
6. **Perfis financeiros** (pessoal, família, PJ)
7. **Metas e investimentos** no mesmo planejamento
8. **Relatórios** de patrimônio, ritmo e taxa de poupança
9. **Suporte direto** dentro do app
10. Agenda de 30 min com o time

**Isto não é uma tarefa, é um roteiro de produto.** Vários itens já existem em
alguma forma no Tino (projeção, metas, relatórios, tendência de fatura);
outros, como Open Finance, dependem de credencial de instituição e contrato,
não de código. Antes de começar qualquer um, é preciso separar "já existe",
"dá para fazer sozinho" e "depende de terceiro" — e o Davi escolhe por onde
começar. Ver `docs/PESQUISA-OPEN-FINANCE.md`, que já levantou parte disso.

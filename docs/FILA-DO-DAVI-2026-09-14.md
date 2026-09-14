# Fila pedida pelo Davi em 14/09/2026

Registro do que foi pedido durante a sessão, na ordem em que chegou, para
nenhuma peça se perder quando o terminal fechar.

## 1. Refazer os sete achados P1/P2 do relatório sênior — em andamento

| # | Achado | Estado |
|---|---|---|
| 4 | Projeção partia do patrimônio, não do caixa | **feito** — `lib/saldo-disponivel.ts`, painel mostra "aplicado" ao lado do disponível, 9 testes |
| 3 | Compra de cartão sem competência de fatura | **feito** — regra ligada nas duas entradas, com ajuste manual no formulário |
| 1 | Captura confirmada pode ser descartada | **feito** — `lib/captura/transicoes.ts`, 6 testes |
| 2 | Dedup engole compra legítima | **feito** — identidade de evento nos três transportes |
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

## 5. ARCA com a carteira real — feito em 14/09

O pedido foi: renda fixa, renda variável e as outras classes que formam a ARCA,
com o app ajudando quem segue o método.

A tela só dividia um valor em quatro partes iguais — isso responde "quanto é um
quarto disso", não "onde eu ponho o dinheiro deste mês". O método vive do
reequilíbrio pelo aporte, e para isso precisa olhar o que a pessoa já tem.

- `ClasseDeAtivo` no schema: ações, FII, renda fixa, caixa, internacional,
  cripto e outros. Renda fixa e caixa são classes separadas na carteira e somam
  juntas na letra C — um CDB de dois anos e o dinheiro rendendo CDI cumprem o
  mesmo papel na divisão e papéis diferentes na vida.
- `posicaoDoArca` lê a carteira contra o alvo de 25% por letra. Cripto e outros
  ficam fora da conta do método (ele tem quatro classes e não diz o que fazer
  com o resto) e aparecem somados à parte.
- `aporteQueReequilibra` distribui o aporte para as letras mais atrasadas
  primeiro, e só divide igual quando a carteira já está no alvo. 8 testes,
  incluindo o de não perder nem sobrar centavo.
- Cada investimento escolhe sua classe no próprio cartão; sem classe, ele
  aparece na carteira e fica fora da conta do método, com aviso.

Continua sendo aritmética: o método é de terceiro e está identificado na tela, e
o app não escolhe ativo nem indica corretora.

**Não conferido em tela** — o navegador desconectou antes.

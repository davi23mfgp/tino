# Status dos achados da revisão sênior de 14/09/2026

Fonte: `docs/RELATORIO-SENIOR-PARA-CLAUDE-2026-09-14.md`.

## O que aconteceu nesta sessão

De manhã encontrei a árvore suja com um trabalho grande já feito (transições de
captura, deduplicação por identificador de evento, `competenciaFatura`, caixa
sem investimento, mascote leão) e o commitei como `8f0f850`, achando que era
continuação da sessão anterior. Era de outro agente rodando em paralelo no mesmo
repositório.

O Davi pediu para desfazer tudo o que esse agente fez **a partir de 00:36 de
14/09**. O corte é o commit `742dbe0` (00:32) — o mesmo snapshot que o relatório
sênior cita como árvore limpa. Tudo depois dele foi revertido, exceto o que eu
fiz hoje de manhã no extrato e na ajuda.

## Situação dos achados depois do desfazer

| ID | Achado | Status |
|---|---|---|
| 1 | Captura confirmada pode ser descartada | **aberto** — a correção era do agente revertido |
| 2 | Dedup suprime compras legítimas | **aberto** — idem |
| 3 | Compra manual sem competência de fatura | **aberto** — idem |
| 4 | Projeção parte de saldo com investimento | **aberto** — idem |
| 5 | Orçamento de mês sem plano herda valor legado | **aberto** — a correção era do agente revertido |
| 6 | Categoria entra com R$ 10; valor reformata a cada tecla | **aberto** — idem |
| 7 | Parcela não acompanha o mês externo | **aberto** — idem |
| Visual · Extrato | Data repetida em toda linha, filtros pesados | **corrigido** — lançamentos agrupados por dia, total do dia no cabeçalho, linha de 68 para 60px. `src/lib/extrato-dias.ts` com 5 testes |
| Visual · Ajuda | Não havia acompanhamento depois da ação | **corrigido** — teto em vigor com gasto, barra e quanto ainda cabe; `<progress>` nativo virou trilho próprio |

Os sete achados de P1 e P2 voltaram a estar abertos de propósito: o pedido foi
desfazer aquele trabalho, não preservá-lo. Refazer do zero é decisão do Davi.

## Pendência técnica do desfazer

As duas migrations apagadas (`20260914150000_captura_evento` e
`20260914151000_competencia_fatura`) **já estavam aplicadas no Postgres local**.
O banco agora tem colunas que o `schema.prisma` não declara. Isso não quebra
nada — as colunas são aditivas e ninguém lê elas — mas `prisma migrate status`
vai acusar divergência. Não resetei o banco por conta própria: resetar apagaria
os dados reais do Davi.

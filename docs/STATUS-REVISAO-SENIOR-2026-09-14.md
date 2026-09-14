# Status dos achados da revisão sênior de 14/09/2026

Fonte: `docs/RELATORIO-SENIOR-PARA-CLAUDE-2026-09-14.md`.
Base verificada: commit `8f0f850` (main). Verificações reais desta sessão:
`npm run tipos` limpo, `npm test` 306/307 (1 skipped), `npx next build` limpo
(55 rotas).

**Limitação que vale para tudo abaixo:** a extensão do Chrome não conecta nesta
máquina, então nenhum item foi conferido em tela. Tudo é evidência de código e
de teste. Comparação de capturas desktop/mobile continua pendente do Davi ou de
uma máquina com o navegador ligado.

| ID | Achado | Status | Evidência |
|---|---|---|---|
| 1 | Captura confirmada podia ser descartada | corrigido | `src/lib/captura/index.ts:19` descarte recusa confirmada; `:223` confirmação recusa descartada e reusa transação; advisory lock nos dois. `testes/capturas-integracao.test.ts` |
| 2 | Dedup suprimia compras legítimas | corrigido | `src/lib/captura/index.ts` dedup só por identificador de evento; `Idempotency-Key` na API, id do evento no Telegram/WhatsApp. Migration `20260914150000_captura_evento` |
| 3 | Compra manual sem competência de fatura | corrigido | `src/lib/competencia-cartao.ts` centraliza a regra; `competenciaFatura` gravada em `api/transacoes` e na confirmação de captura. Migration `20260914151000_competencia_fatura`. `testes/competencia-cartao.test.ts` |
| 4 | Projeção partia de saldo com investimento | corrigido | `src/lib/saldo-disponivel.ts` separa caixa de patrimônio; `src/lib/tino/panorama.ts` projeta a partir do caixa |
| 5 | Orçamento herdava valor legado em mês sem plano | corrigido | `src/components/orcamento-cartao.tsx:55` repete a regra da API (só mês corrente e só sem nenhum plano); `central-cartoes.tsx:153` usa `key={cartao.id}-${mes}`, então trocar de mês remonta o painel |
| 6 | Categoria entrava com R$ 10; valor reformatava a cada tecla | corrigido | `orcamento-cartao.tsx:122` adiciona com limite 0; categoria com zero continua ativa (`categoria.id in linhas`); `CampoValor` (`:19`) mantém o texto enquanto o campo está em foco e só converte no blur |
| 7 | Detalhe de parcela não seguia o mês global | corrigido | `parcelamentos-cartao.tsx:35` usa `key={parcelamento.id}-${mes}`; rodapé marca "Sem parcela no mês selecionado" |
| Visual | Extrato, cartões, parcelas, orçamento, ajuda, modais | pendente | Não conferido em tela nesta máquina; é o próximo bloco de trabalho |

## Fora de escopo desta sessão, registrado

- Pontos/milhas e demais integrações: continuam sem certificação. Distinguir
  simulação, configuração manual e integração real segue pendente.
- `docs/AUDITORIA-53-2026-09-13.md` não foi reauditado item a item.

# Como o gasto entra sozinho sem Open Finance

Pedido do Davi em 15/09/2026: achar um jeito de compensar o Open Finance
enquanto ele não é contratado, e ter no celular um atalho onde dê para ditar ou
digitar o gasto.

## O que o Open Finance entrega, e o que dá para substituir

| O que ele faz | Dá para substituir? |
|---|---|
| Lançamento entra sozinho na hora da compra | **Sim** — pelo aviso que o banco já manda no celular |
| Saldo da conta atualizado sozinho | **Não.** Só o agregador traz isso |
| Histórico de meses anteriores | **Sim** — extrato em arquivo (OFX, CSV, PDF) |
| Identificar o estabelecimento | **Sim** — o leitor de notificação e o de texto livre já fazem |

Ou seja: o que dói na falta dele é o **saldo**, não o lançamento. E saldo o Tino
já deriva das transações.

## Os três caminhos, e onde eles já moram no código

1. **Aviso do banco → lançamento.** `POST /api/capturar`, autenticado por chave
   (`ChaveCaptura`), existe desde antes. Quem lê o texto é
   `src/lib/captura/notificacao.ts`: valor, estabelecimento, final do cartão,
   instituição, parcela — e recusa compra negada, estorno e pré-autorização de
   posto, que é onde esse tipo de integração costuma mentir. Falta do lado de
   fora: um encaminhador de notificação no Android apontando para a URL com a
   chave. A chave se cria em `/capturas`.
2. **Falar ou escrever.** WhatsApp, Telegram e, agora, `/lancar` dentro do app.
   `src/lib/captura/fala.ts` entende gasto dito por extenso.
3. **Arquivo.** `/importar` (OFX, CSV, PDF) e fatura por e-mail
   (`src/lib/faturas-email.ts`).

Tudo isso já existia e **ninguém via**: a tela `/conectar`, quando não há
agregador, oferecia só "envie seu extrato". Agora ela abre em
`src/components/sem-open-finance.tsx`, com os três caminhos ordenados por quem
trabalha menos, cada um com o botão que o liga.

## O atalho no celular

Pedido: "uma notificação ficar no celular e lá você poder ditar ou digitar".

**O que a web permite:** notificação que não some sozinha
(`requireInteraction`), silenciosa, com dois botões — "Anotar" e "Ditar" — que
abrem `/lancar` (campo e microfone, nada mais). `?modo=voz` já entra gravando.

**O que a web não permite:** escrever dentro da própria notificação. A
Notification API tem botão, não campo de texto. Resposta inline só existe em
aplicativo nativo. Quem quer responder sem abrir nada continua tendo o
WhatsApp, que o Tino já atende — e ali a resposta inline é do próprio WhatsApp.

Peças: `public/sw.js` (só trata o clique; **não** faz cache, que traria tela com
saldo velho), `src/components/atalho-de-lancar.tsx` (liga, desliga e renova),
`src/components/config-atalho-lancar.tsx` (o controle em Configurações) e a
página `/lancar`.

A notificação é **local**: criada pelo próprio aparelho quando o app abre. Não
há servidor de push, chave de fornecedor nem custo. O preço é honesto: ela é
renovada a cada abertura do Tino, e o Android pode limpá-la junto com as
outras. Push de verdade (VAPID, sem fornecedor pago) é o passo seguinte se o
Davi quiser que ela volte sozinha.

## O push, feito em 15/09/2026

A notificação volta sozinha uma vez por dia, mesmo com o app fechado. Sem
fornecedor: o par VAPID identifica este servidor e o navegador entrega de
graça.

Peças: `prisma` → `InscricaoPush`; `src/lib/push.ts` (envio e limpeza de
inscrição morta); `/api/push` (inscrever, consultar, desligar);
`/api/cron/lembrete` (protegido por `CRON_SECRET`, corta pelo fuso do lar,
uma vez por dia); `vercel.json` com o agendamento.

**Para ligar em produção**, quatro variáveis na Vercel: `VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, `VAPID_ASSUNTO` e `CRON_SECRET`. O par já existe no `.env`
local desta máquina. Gerar outro:
`node -e "console.log(require('web-push').generateVAPIDKeys())"`.

**Limite do plano gratuito da Vercel:** um disparo de cron por dia. Por isso o
agendamento é `0 23 * * *` (20h em São Paulo) e o horário escolhido pela pessoa
ainda não vale — a coluna `hora` já está no banco e passa a valer sozinha
quando o agendamento virar `0 * * * *`.

## Não feito
- Um guia passo a passo do encaminhador de notificação no Android, com o app
  recomendado. Hoje a tela diz o que fazer, mas não mostra a configuração
  pronta para copiar.
- Ler print de comprovante (OCR). O `share_target` do manifesto já recebe
  imagem, mas nada lê pixel hoje.

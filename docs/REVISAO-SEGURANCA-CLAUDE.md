# Revisão de segurança por escopo de conta — tarefa C4

Base: commit `3af300e` (`main`, 13/09/2026 14:07). Revisor: Claude, branch
`claude/revisoes`. Escopo pedido: rotas novas em `src/app/api/cartoes`,
`src/app/api/faturas-email`, `src/app/api/identidades`, `src/app/api/metas`
e `src/app/api/webhooks/faturas-email`.

Leitura de código, sem execução contra serviço externo. Nenhuma chave real
foi usada.

## Resumo

Os critérios de conclusão da tarefa estão **atendidos**: toda leitura e
escrita privada prova posse do lar antes de tocar em dado, e o webhook
valida a assinatura antes de processar conteúdo. Não encontrei acesso
cruzado entre lares, nem centavos aceitos como decimal, nem mensagem de
erro com dado sensível.

Os quatro achados abaixo são de robustez e de limite de recurso. Nenhum é
exploração de dado alheio; o mais sério deixa o recebimento de fatura
falhar em silêncio.

## Achados

### P2-1 — Corpo de requisição sem teto de tamanho

- **Arquivo:** `src/lib/api.ts`, função `corpo()`
- **Elemento:** `await requisicao.json()`
- **Reprodução:** autenticado, `PUT /api/identidades` com corpo JSON de
  50 MB. O corpo é lido inteiro na memória antes de qualquer validação —
  inclusive antes do teto de 700 000 caracteres que `validarFotoMeta`
  aplica depois.
- **Alcance real:** em produção a Vercel corta requisição acima de 4,5 MB
  antes de chegar na função, então hoje o risco está contido pela
  plataforma. Fora dela (servidor próprio, desenvolvimento) não há teto.
- **Correção proposta:** ler `content-length` no início de `corpo()` e
  recusar acima de um limite explícito, antes do `json()`. Precisa de
  decisão sobre o número — ver Perguntas.

### P2-2 — Webhook sem teto de destinatários e de anexos

- **Arquivo:** `src/app/api/webhooks/faturas-email/route.ts`
- **Elemento:** `evento.data.to.map(contaDoEndereco)` e o laço
  `for (const anexo of anexos.data)`
- **Reprodução:** e-mail válido endereçado a muitas contas do mesmo lar,
  com muitos anexos. Cada anexo é baixado inteiro para a memória (teto de
  10 MB por anexo, mas sem teto de quantidade) e gravado para cada conta
  destino. Com `maxDuration = 60`, o pior caso é estouro de tempo ou de
  memória da função.
- **Correção proposta:** limitar destinatários processados e anexos
  processados por evento, descartando o excedente com registro no log.
  O número é decisão de produto — ver Perguntas.

### P2-3 — Endereço com assinatura em maiúscula é recusado em silêncio

- **Arquivo:** `src/lib/faturas-email.ts`, função `contaDoEndereco()`
- **Elemento:** `timingSafeEqual(Buffer.from(m[2]), Buffer.from(assinatura(m[1])))`
- **Reprodução:** `contaDoEndereco("<contaId>+ABCDEF0123456789ABCDEF01@dominio")`
  devolve `null` mesmo com assinatura correta. O regex aceita maiúscula
  (tem a flag `i`), mas `assinatura()` sempre devolve minúscula, então a
  comparação byte a byte falha.
- **Consequência:** qualquer servidor de e-mail no caminho que normalize a
  caixa da parte local derruba o recebimento. A falha é muda: o webhook
  responde `{ignorado:true}` com 200, o provedor considera entregue e o
  usuário nunca vê a fatura.
- **Correção proposta:** comparar em minúsculas nos dois lados. Uma linha,
  sem mudança de contrato.

### P3-1 — Exclusão de fatura responde sucesso sem ter encontrado nada

- **Arquivo:** `src/app/api/faturas-email/[id]/route.ts`, `DELETE`
- **Elemento:** `updateMany(...)` seguido de `ok({concluida:true})` sem
  olhar `count`
- **Reprodução:** `DELETE /api/faturas-email/<id-inexistente>` devolve 200
  com `{concluida:true}`.
- **Leitura:** do ponto de vista de segurança isto é **desejável** — não
  serve de oráculo para descobrir ids de outros lares. O problema é de
  produto: a tela conclui um arquivo que não existe e a falha real fica
  invisível.
- **Correção proposta:** usar o `count` para distinguir, mantendo a mesma
  resposta para "não existe" e "não é seu", que é o que preserva a
  ausência de oráculo.

## O que foi verificado e está correto

- **Posse do lar em toda rota privada.** `comSessao` recusa sem sessão
  (401). Cada consulta filtra por `larId` da sessão: metas
  (`findFirst({id, larId})` antes de qualquer escrita), cartões
  (`updateMany({id, larId, tipo:"CARTAO_CREDITO"})`, com 404 quando não
  casa), identidades (`upsert` por chave composta `larId_nome`,
  `deleteMany({id, larId})`), faturas (`findFirst({id, larId})` para ler o
  binário). Nenhuma rota aceita `larId` vindo do cliente.
- **Conta vinculada também é checada.** Aporte de meta e vínculo de
  lançamento exigem que a conta e a transação pertençam ao lar, e o
  lançamento reaproveitado precisa estar livre (`metaId: null`) — o
  `updateMany` com guarda e conferência de `count` fecha a corrida.
- **Assinatura antes do conteúdo.** O webhook chama
  `resend.webhooks.verify` sobre o texto cru e só depois lê `evento.data`.
  Falha de assinatura responde 401 sem detalhe.
- **Replay coberto em duas camadas.** A assinatura Svix carrega id e
  timestamp; o índice único `(eventoId, contaId, arquivoNome)` impede
  segunda gravação do mesmo anexo. Reentrega depois da conclusão não
  ressuscita conteúdo apagado, porque a busca de existentes não filtra por
  status.
- **Centavos como inteiro com limites.** `inteiroMeta` recusa não inteiro,
  negativo e acima de `2147483647`; o orçamento do cartão usa
  `Number.isSafeInteger` com a mesma faixa. Saldo de meta não pode ser
  escrito direto — só por aporte ou retirada, e o saldo resultante é
  validado antes de gravar.
- **Idempotência do aporte.** Chave do cliente restrita a
  `[a-zA-Z0-9-]{16,80}`, guardada em `hashImport` com índice único por lar,
  dentro de transação com `pg_advisory_xact_lock`.
- **Foto e logo não abrem porta.** `validarFotoMeta` aceita apenas
  `data:image/(png|jpeg|webp);base64`, confere os bytes mágicos, exige que
  o base64 seja canônico e corta em 500 KB. Não há URL remota, então não há
  SSRF nem `javascript:`.
- **Download do anexo com freio.** Exige `https:`, recusa redirecionamento,
  tem tempo limite de 20 s e aborta o fluxo acima de 10 MB, cancelando o
  leitor.
- **Erro sem vazamento.** `comSessao` devolve 500 genérico e registra o
  detalhe só no log; o webhook responde 503 genérico e deixa o provedor
  reenviar.

## Perguntas de produto (não decidi sozinho)

1. **Teto de corpo de requisição (P2-1).** Qual limite? A foto de meta já
   permite 500 KB, e o base64 inflado chega perto de 700 KB — então o teto
   precisa ficar acima disso. Sugestão para decisão: 1 MB.
2. **Teto de destinatários e anexos por e-mail (P2-2).** Quantos anexos de
   fatura um e-mail legítimo pode trazer? E vale processar um e-mail
   endereçado a várias contas ao mesmo tempo, ou só ao primeiro
   destinatário reconhecido?

Nenhuma das duas muda regra financeira. As demais correções propostas são
mecânicas e não dependem de decisão.

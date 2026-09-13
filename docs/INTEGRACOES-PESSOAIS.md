# Integrações pessoais

## Faturas por e-mail
O receptor usa Resend Receiving, assinatura Svix, endereço individual por conta e anexos de até 10 MB. O webhook `/api/webhooks/faturas-email` armazena anexos para conferência. Reenvios não duplicam arquivos. Após importar, o conteúdo é removido; a identificação fica para impedir replay. Nenhum lançamento é confirmado silenciosamente.

No servidor, configurar `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `FATURAS_EMAIL_DOMINIO` (somente domínio) e `FATURAS_EMAIL_SEGREDO` (segredo aleatório forte). Registrar evento `email.received` no Resend. Em Cartões > Importar aparece o endereço da conta. O usuário cria encaminhamento no próprio e-mail. PDFs com senha são abertos apenas durante a conferência; senha não é salva.

Documentação: https://resend.com/docs/dashboard/receiving/introduction e https://resend.com/docs/webhooks/verify-webhooks-requests.

## Groq
`GROQ_API_KEY` habilita Groq antes do provedor anterior; `GROQ_MODEL` permite escolher modelo. Respostas locais continuam prioritárias. Limites gratuitos variam e não significam uso ilimitado. Modelo de chat comum não pesquisa a internet automaticamente. Pesquisa do Compound é recurso separado; não é usada para inventar logos ou benefícios de cartões. Logos personalizados são enviados pelo usuário.

Documentação: https://console.groq.com/docs/openai e https://console.groq.com/docs/rate-limits e https://console.groq.com/docs/tool-use/built-in-tools/web-search.

## Notificações Android
O receptor `/api/capturar` recebe título/texto por chave revogável. Precisa de encaminhador instalado no Android e acesso às notificações concedido pelo usuário. O site não lê outros aplicativos. Usar endereço público HTTPS; `127.0.0.1` no telefone aponta para o telefone. iOS não oferece acesso geral a notificações de outros apps. A captura permanece sujeita à revisão no app. Notificações repetidas recentes são filtradas; confirmação da mesma captura é idempotente. Importações sinalizam possíveis repetições de gastos vindos do celular.

## Metas
O lembrete mensal usa a caixa de alertas e o atualizador interno existente, com chave por meta/mês. Não é uma promessa de push em aparelho fechado. Compromissos fixos entram nas projeções; aportes realizados são descontados da média para evitar duplicação do planejamento.

## Pessoal e MEI
Menus e configurações pessoais não oferecem loja ou funcionários. Dados e APIs legados foram preservados. A integração entre produtos por API fica para etapa futura, conforme pedido.

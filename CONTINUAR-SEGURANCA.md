# Continuação do Tino — sessão de 30/09/2026

Leia este arquivo antes de editar. Repositório `davi23mfgp/tino`; branch com implementação e validações: **`codex/continuacao-tino`**. O usuário pediu documentar tudo para o próximo Codex ou Claude não repetir o trabalho.

## Pedido vigente

Concluir os 20 controles de segurança antes de voltar ao design. Preparar e testar o que for possível no projeto; fazer os ajustes e somente depois publicar. **Não publicar agora.** Preservar funções e layout. Não declarar os 20 concluídos: dependências de infraestrutura ainda estão abertas. Confirmar a sigla PMP; até aqui foi interpretada como princípio do menor privilégio.

## Onde continuar

- `docs/CONTROLES-SEGURANCA.md`: tabela dos 20 itens com implementação e pendência de cada um.
- `docs/SEGURANCA-OPERACAO.md`: configuração, backups, recuperação, rollback e evidências.
- `docs/TEMPORARIO-CONTINUAR-SEGURANCA.md`: contexto inicial; este checkpoint prevalece sobre contagens e limitações antigas.
- `docs/PRIVACIDADE-SEM-ACESSO-AOS-VALORES.md`: cofre ponta a ponta adiado; não implementar nesta rodada.

Commits já enviados à branch:

- `c704d7a`: MFA, segurança de requisições, limite concorrente, dependências, backup, monitor e operação.
- `dbfe9ce`: teste de backup portátil no Windows, build explícito com Webpack e evidências locais.
- `5377578`: alerta de backup ausente/atrasado, testes do script real do workflow e tabela dos 20 controles.

O código de segurança não foi incorporado à main nem publicado nesta sessão. Não reaplicar commits antigos de design. Faça fetch/status antes de continuar e use a branch acima; se houver novos commits externos, confira-os antes de editar.

## O que já foi comprovado — não repetir sem motivo

- Prisma nativo gerado; 39 migrations aplicadas em Postgres local isolado.
- Tipos e 605 testes aprovados no último estado de código. Os quatro novos testes exercitam o script do monitor: ausência, atraso, recuperação e horário inválido, incluindo recusa de incidentes duplicados.
- Build de produção aprovado com Webpack em `dbfe9ce`; a rodada seguinte alterou apenas workflow, teste e documentação, sem mudar runtime do app.
- Auditoria das dependências de produção sem achados em `dbfe9ce`.
- Integração HTTP real: MFA, recuperação de uso único, recusa de replay, revogação de sessão, admin, CSRF e 24 chamadas simultâneas (6 permitidas/18 bloqueadas).
- Backup real com pg_dump 18, cifra e restauração em outro banco local vazio; contagens coincidiram (1 usuário/287 transações de demonstração).
- CI de `dbfe9ce` aprovado: https://github.com/davi23mfgp/tino/actions/runs/36792067314. Conferir CI de `5377578` se ainda não registrado.
- Domínio publicado respondeu HTTPS 200 com HSTS. A rota Google redirecionou para accounts.google.com; URL antiga com `erro=google-indisponivel` não comprova falha atual. Login completo Google com MFA em Preview continua pendente.

## Pendências reais e ordem de trabalho

Foi adicionada a conferência somente leitura `npm run seguranca:conferir-publicacao`. Execute com as variáveis do ambiente alvo já carregadas; ela nunca conecta ao banco, imprime valores ou executa migrations. Verifica nomes obrigatórios, TLS, formatos, separação das chaves e callback Google. Aprovação deste comando não comprova a configuração externa nem substitui as etapas abaixo.

1. Acesso GitHub: CLI estava sem autenticação. Push Git funcionou, mas não foi possível configurar/conferir Secrets, proteção de main ou executar workflows manualmente.
2. Vercel: `MFA_CHAVE_CRIPTOGRAFIA` e `MONITORAMENTO_SEGREDO` estavam ausentes. `DATABASE_URL`/`DIRECT_URL` existiam nos dois ambientes, mas a separação Preview/Production não foi comprovada. Google estava configurado somente em Production.
3. Garantir banco de Preview separado ANTES de qualquer deploy/migration. Configurar chaves distintas por ambiente e guardar recuperação fora do banco, Git e chat.
4. Configurar Secrets de backup e monitor e variable `MONITORAMENTO_URL`, seguindo o runbook. Não solicitar valores secretos em conversa.
5. Aplicar papéis mínimos no Neon, confirmar TLS/criptografia em repouso e retenção do plano. Não afirmar que o operador é incapaz de ler valores: o servidor/banco ainda processam valores legíveis.
6. Validar Preview com Google, MFA e admin, hidratação/CSP e funções existentes. Cadastrar MFA no administrador e conferir MFA das contas de infraestrutura.
7. Publicar somente após os ajustes solicitados pelo usuário. Ativar os workflows na branch principal, executar backup/restauração e monitor, conferir alertas/notificações. Simular recuperação em banco Neon isolado e registrar RPO/RTO medidos.

O novo monitor abre incidente quando não há backup validado da branch principal com menos de 26 horas e o fecha após recuperação. A configuração e execução real no GitHub ainda não foram comprovadas. GitHub Schedule pode atrasar; não confundir automação preparada com serviço ativo.

## Ambiente local utilizado

Checkout de segurança: `C:/Users/iasdn/Documents/tino-seguranca`, branch local `codex/seguranca-validacao`, enviada para a branch remota acima. Banco QA `tino_security_qa_20260930`; restauração `tino_security_restore_20260930`. `.env` e backups locais não foram versionados. Servidor de teste em 3014 foi parado. Não usar essas credenciais em produção.

O checkout antigo `C:/Users/iasdn/Documents/tino` tinha alterações locais de documentação; não sobrescrever. Nenhum dado de produção foi alterado na validação. Para mudanças futuras, seguir AGENTS.md: português, dinheiro em centavos, evidência antes de afirmações e push normal após verificações pertinentes.

## Continuação no ambiente cloud — 01/10/2026

Checkout atualizado por fast-forward até `f424500`. Acrescentada verificação automatizada do comando de pré-publicação: configuração válida sem conexão ao banco, recusa de TLS desligado, segredo reutilizado, chave inválida, callback HTTP, logs SQL ligados e segredo ausente; erros não exibem credenciais. Tipos aprovados e 608 testes aprovados. Nenhuma alteração de layout ou publicação.

Este ambiente não tem credenciais Vercel/Neon; o token do GitHub CLI está inválido. Push Git está disponível. As pendências externas listadas acima continuam abertas. Para continuar com a infraestrutura, usar notebook autenticado ou configurar os acessos neste ambiente, sem enviar segredos pelo chat. A resposta vazia do conector para workflows não foi usada como prova de aprovação do CI.

### Bloqueio externo comprovado e regra do usuário

Em 01/10/2026, o usuário determinou: só interromper por ação que o agente realmente não consegue executar; regra registrada em AGENTS.md. Vercel CLI instalado temporariamente via npx, mas `vercel login` falhou antes de emitir autorização. Requisições a `api.vercel.com` e `api.neon.tech` receberam HTTP 403 do proxy de saída (CONNECT recusado). Não é falha do aplicativo nem aprovação recusada: a política de rede deste ambiente impede acesso aos provedores. Além de autenticação, é necessário liberar a rede dos provedores ou continuar em ambiente conectado a eles. Nenhum segredo foi gerado/substituído e nenhum banco foi alterado.

### Ajuste solicitado nos textos legais — 01/10/2026

Removidos nome civil e endereço residencial dos Termos e da Política de Privacidade a pedido do usuário; mantidos CNPJ e canais de atendimento. Layout preservado. Alteração na branch de segurança; produção continua pendente. Login Google em Preview ainda mostra configuração indisponível segundo captura do usuário; conferir escopo das três variáveis e callback, depois redeploy. Preview de segurança chegou a Ready após configurar banco vazio tino_preview na branch Neon de testes; aprovação do build não comprova login/MFA nem operação dos backups.

### Dia de vencimento — ajuste solicitado em 01/10/2026

Cadastro inicial, adição e edição de cartões agora selecionam dia do mês (1 a 31), como o recebimento do salário, sem pedir data completa. API continua recebendo diaVencimento; nenhuma migration necessária. Edição preserva o dia original inclusive 29/30/31, sem convertê-lo para uma data limitada pelo mês atual. Layout preservado, mudança apenas na branch de prévia.

### Quantidade de convites — ajuste solicitado em 01/10/2026

No cadastro inicial, casal/família escolhe quantidade de convidados (1 a 10) e recebe um campo de e-mail por pessoa. Quantidade não inclui o próprio usuário; opção Convidar depois mantém o cadastro sem convites. Envia somente os campos da quantidade atual, recusa vazios e duplicados. Individual continua sem convites. Layout e API de convites preservados.

### Correção da largura dos cartões — 01/10/2026

Removido flex-grow do cartão desktop; largura máxima 360px e proporção 1.586, sem altura fixa. Novo cartão vira ação compacta abaixo. Carteira incorporada à grade existente, antes das abas no celular; desktop coloca carteira com até um cartão ao lado do fluxo, e múltiplos cartões ocupam linha inteira. Sem mudança de cores/identidade. Verificação visual de Preview ainda necessária.

### Separação do cadastro pessoal e MEI — 01/10/2026

Usuário pediu retirar a escolha Meu dinheiro / Meu dinheiro e minha loja do início, manter a mesma landing e ter outro login MEI. Cadastro pessoal agora abre diretamente o formulário e envia modoMei=false. Perguntado se o acesso MEI já possui endereço ou deve ser criado dentro do Tino; implementação do destino separado aguarda essa informação, sem presumir isolamento por simples troca de URL. Não remover dados ou acessos empresariais existentes.

### Refinamento do menu da conta — 01/10/2026

Usuário autorizou modernizar especificamente o menu do avatar. Cabeçalho com avatar/nome, linhas com ícones e alvos de pelo menos 44px, aparência em seleção explícita Claro/Escuro, largura limitada no celular. Preservadas permissões de funcionário/admin, navegação, sessão e cores existentes. Alternador de tema fora do menu continua igual. Resultado visual ainda deve ser conferido no Preview.

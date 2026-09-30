# Segurança e operação do Tino

Atualização: 30/09/2026. Escopo autorizado: preservar funções e layout, completar controles de segurança e adiar o cofre de ponta a ponta dos valores.

## O que muda para o usuário

Configurações → Segurança da conta permite cadastrar um autenticador TOTP e guardar oito códigos de recuperação. A proteção se aplica ao login com senha e com Google. Um código TOTP não pode ser reutilizado; códigos de recuperação funcionam uma vez. Ativação, desativação e renovação da recuperação invalidam sessões anteriores. Administração exige segundo fator confirmado nas últimas 12 horas; administradores não podem desativá-lo pelo app.

A configuração exige login recente (10 minutos). A chave do autenticador fica cifrada no banco com AES-256-GCM e contexto vinculado ao usuário. O desafio de login tem cookie separado, validade de 5 minutos e consumo único, e não é uma sessão autenticada. A mudança mantém os cálculos e integrações existentes.

O painel administrativo continua sem consultas a saldos, lançamentos, dívidas e conversas. O operador ainda pode ter acesso técnico ao banco. Criptografia do segredo MFA e dos backups NÃO torna os valores privados frente ao operador. O cofre com chaves só dos usuários está adiado; plano em `PRIVACIDADE-SEM-ACESSO-AOS-VALORES.md`.

## Configuração antes do deploy

1. Gerar `MFA_CHAVE_CRIPTOGRAFIA` com 32 bytes aleatórios em hexadecimal. Usar chave diferente de `JWT_SECRET` e do backup; armazenar na Vercel como Sensitive em Production/Preview, com chaves distintas por ambiente. Não registrar o valor em chat, logs ou Git. Guardar cópia segura fora do banco. Não trocar sem procedimento de recifragem: chave perdida impede verificar autenticadores existentes.
2. Confirmar `DATABASE_URL` e `DIRECT_URL` com TLS. O app recusa produção sem TLS ou sem a chave MFA correta. Manter `TINO_LOG_QUERIES` desligado. A chave JWT precisa ter pelo menos 32 caracteres aleatórios; comprimento sozinho não garante entropia.
3. Confirmar URLs e credenciais Google. Login Google ajuda na autenticação; o segundo fator do Tino continua obrigatório no admin, independentemente da configuração da conta Google.
4. Configurar uma chave aleatória `MONITORAMENTO_SEGREDO` tanto na Vercel quanto no GitHub Secrets. Definir GitHub variable `MONITORAMENTO_URL` para `https://tino-kappa.vercel.app/api/saude`, sem segredo na URL.
5. Configurar GitHub Secrets `BACKUP_DATABASE_URL` (conexão direta com usuário exclusivo de leitura) e `BACKUP_CHAVE_CRIPTOGRAFIA` (outra chave aleatória de 32 bytes em hexadecimal). Guardar a chave também fora do GitHub. O arquivo cifrado sem essa chave não pode ser restaurado.
6. Revisar `scripts/permissoes-banco.sql` e associar usuários de conexão reais aos grupos mínimos. Execução não deve ser proprietária das tabelas nem membro do papel de migração. Atendimento usa somente as views administrativas, sem SELECT em tabelas financeiras ou credenciais. Backup tem apenas leitura; migração usa conexão separada. Essa separação precisa ser efetivada no provedor; um arquivo SQL no Git não comprova configuração de produção.
7. Exigir MFA também nas contas GitHub, Vercel, Neon e no e-mail administrativo. Proteger main com revisão/CI e acesso de publicação restrito. Recuperação desses serviços fica em local seguro, separado do notebook.
8. Validar login comum/Google/MFA, recuperação, cadastro, família, importar fatura, edição/exclusão de cartões, CSP e origens em Preview. Só promover após migrations e configurações comprovadas. Não usar banco de produção no Preview.

O script de build valida os novos segredos e TLS antes de migrations na Vercel. Uma conta comum que coincida com `ADMIN_EMAIL` não é mais promovida automaticamente: isso exigia comprovar titularidade e o cadastro comum não verifica e-mail. A promoção explícita continua sob controle de quem administra a infraestrutura.

## HTTPS, origem e conteúdo

HSTS, cookie Secure/httpOnly/SameSite e cabeçalhos básicos existem. Escrita com cookies exige mesma origem. Origens externas e `Sec-Fetch-Site: cross-site` são recusados; clientes não navegador com cookies precisam enviar Origin válido. Integrações sem cookie continuam usando suas próprias assinaturas/chaves. Não há `Access-Control-Allow-Origin: *` com credenciais.

CSP do HTML usa nonce aleatório por requisição e remove `unsafe-inline`/`unsafe-eval` dos scripts de produção. Styles inline ainda são necessários aos componentes atuais. A raiz lê headers e HTML é dinâmico para não reutilizar nonce de conteúdo estático; isso afeta cache de página, não layout. Desenvolvimento permite eval/WebSocket. Verificar hidratação em navegador antes de promover.

Entradas novas de autenticação/MFA são validadas com Zod; limites de JSON e validações existentes continuam. Queries novas são parametrizadas. Rate limit usa trava transacional por chave: instâncias concorrentes não podem sobrescrever o mesmo contador. SQL bruto sai dos logs de instrumentação, e erros Prisma deixam de registrar os argumentos completos nos wrappers de API. Filtros não garantem remover qualquer dado de qualquer texto; chamados podem conter o que o próprio usuário enviou.

## Backup e teste de restauração

Workflow `.github/workflows/backup.yml`: diariamente às 05:17 UTC e manualmente. Exporta formato custom do `pg_dump`, cifra em fluxo com AES-256-GCM sem gravar dump aberto, autentica o arquivo e testa `pg_restore` em Postgres isolado antes de guardar artefato cifrado por 30 dias. O executor remove a cópia local no fim.

O cliente Postgres do executor precisa ter versão igual ou maior que a origem. O workflow usa Postgres 18. Extensões e funcionalidades específicas do Neon podem exigir ajuste no ambiente de restauração; falha impede publicar uma cópia como validada. Confirmar que o banco restaurado tem as tabelas do aplicativo e migrar teste completo para um projeto de homologação com mesmas extensões quando necessário.

Rodar primeira execução manual após configurar Secrets. Conferir sucesso de dump, autenticação, restauração e upload; registrar URL da execução. Em repo público, os artefatos são cifrados, mas ainda representam dados pessoais protegidos: restringir custódia/transferência, validar termos do GitHub e preferir armazenamento privado dedicado antes de escalar. Retenção de 30 dias é a desta rotina, não uma afirmação sobre backups próprios do Neon.

O dump inclui o conteúdo do banco e segredos MFA cifrados. Guardar a chave MFA separada é necessário para continuar autenticadores após restauração. Nunca publicar dump, chave, fatura, código de recuperação ou token em issue.

## Recuperação em incidente

Responsável de operação: operador identificado na Política de Privacidade. O titular da conta Vercel/Neon executa acesso excepcional, com motivo, período e ações registrados. Contato de privacidade: o informado na política. Não inventar equipe, auditoria ou certificação.

Metas iniciais: perder no máximo 24 horas de registros (RPO) e restaurar serviço em até 4 horas (RTO). São objetivos a medir em simulação, não garantias. GitHub Schedule pode atrasar; conferir idade de backup e execuções. Revisar plano/fornecedor quando o volume aumentar.

1. Registrar início, impacto, responsável e último backup validado. Suspender escritas/integrações afetadas e preservar evidências sem exportar dados pessoais para logs públicos.
2. Se houver vazamento de credencial, revogar acessos, rotacionar o segredo afetado e encerrar sessões. Rotação da chave MFA requer recifragem controlada ou recuperação apropriada, não substituição cega.
3. Criar banco novo e isolado no provedor. Confirmar versão e extensões compatíveis. Restaurar usando `scripts/restaurar-backup.mjs`: exige `RESTAURACAO_DATABASE_URL`, `BACKUP_CHAVE_CRIPTOGRAFIA` e `CONFIRMAR_RESTAURACAO=BANCO_ISOLADO_VAZIO`. A ferramenta recusa banco não vazio e destino igual às URLs de origem conhecidas; checagem humana do projeto/host continua obrigatória.
4. Verificar tabelas, relações, migrations, login, MFA, cálculos, autorização por lar e operação de importação. Comparar com evidência interna do backup, sem divulgar dados de clientes.
5. Configurar Preview separado com conexão restaurada; validar comportamento. Trocar Production somente depois da validação, preservando o banco anterior em acesso restrito até encerrar a investigação.
6. Confirmar monitor, novos backups e ausência de escritas duplicadas em integrações. Registrar duração, perda real de dados e ações corretivas. Fazer simulação trimestral em ambiente isolado.
7. Se houver incidente com risco ou dano relevante, avaliar comunicação à ANPD e aos titulares conforme LGPD e regulamentação vigente, com orientação jurídica. O prazo aplicável e as exceções devem ser revisados; não usar a promessa vaga de aviso “quando der”.

## Rollback de aplicação e banco

- Identificar último deployment e commit comprovadamente saudáveis. Registrar responsável, motivo e schema em uso.
- Código pode voltar a um deployment anterior pela Vercel quando ele for compatível com o schema atual. Isso NÃO desfaz migrations.
- Esta migration MFA é aditiva. Se for necessário voltar à versão anterior, bloquear administração até restaurar os guardas MFA: o código antigo não exige segundo fator. Login antigo também não deve continuar atendendo usuários que já ativaram MFA. Preferir correção adiante ou manutenção dos fluxos de autenticação.
- Migration destrutiva futura exige backup e expansão/migração/contração em etapas. Não usar `prisma migrate reset`, `DROP` ou force-push em produção como rollback.
- Se dados/schema precisarem voltar, restaurar em banco novo com procedimento acima, validar compatibilidade e decidir a troca. Documentar registros posteriores ao backup que precisem ser recuperados.

## Monitoramento e dependências

`/api/saude` exige Bearer secreto e testa o banco com tempo limitado; resposta não inclui dados pessoais ou configuração. Workflow externo executa aproximadamente a cada 15 minutos, tenta três vezes, abre uma issue de incidente e fecha quando recuperar. Ativar notificações para responsáveis no GitHub. Monitor não é SLA: schedule pode atrasar e falhas do próprio GitHub exigem provedor independente para disponibilidade maior.

Backup falho aparece como execução falha no Actions; responsáveis devem receber notificações de workflows e conferir backup com menos de 26 horas. Configurar alerta específico de atraso com monitor independente antes de depender do serviço para dados críticos.

Dependabot e CI continuam ativos. CI passa a executar `npm audit --omit=dev --audit-level=high`; correções precisam ser revisadas e testes executados. Aviso de vulnerabilidade não é prova de exploração; auditoria sem achados não prova ausência de falhas. Actions e imagens também precisam de atualização e revisão de permissões.

## Situação dos requisitos

Controles de hash, autorização, validação, logs e migrations já existiam. Esta rodada prepara MFA, CSRF/CSP, limite concorrente, redução de logs, atualização de dependências, backup cifrado com teste isolado, monitor e procedimentos de menor privilégio/recuperação/rollback.

HTTPS efetivo, roles do banco, MFA cadastrado no admin, configuração dos Secrets, execução dos workflows, retenção do Neon e criptografia em repouso do fornecedor dependem de configuração e comprovação em produção. Não declarar os 20 itens completos até registrar essas evidências. “PMP” foi tratado como princípio do menor privilégio; a sigla da imagem não foi confirmada.

## Evidência local desta implementação

- `npm run tipos`: aprovado após conclusão do build.
- `npm test`: 601 testes aprovados. Inclui vetores públicos RFC 6238, recusa de TOTP reutilizado, adulteração/chave/contexto incorretos no AES-GCM, origem/CSRF, CSP e integridade de envelope do backup.
- `npm audit`: zero vulnerabilidades conhecidas após Next/eslint-config-next 16.3.8, ESLint 9 e atualização de dependências transitivas.
- Build Next.js de produção com webpack: aprovado localmente. As fontes Google foram substituídas apenas no build de teste porque o domínio está bloqueado neste ambiente; não houve alteração das fontes do produto.
- Banco Postgres 18 isolado: todas as SQL migrations aplicadas, incluindo MFA. Por bloqueio do download da engine nativa, os testes de runtime usaram cliente Prisma WASM com adapter-pg somente na infraestrutura temporária de teste; não foi adicionada essa dependência ao produto.
- `scripts/verificar-seguranca.ts`: integração HTTP aprovada com cadastro, MFA ativo, código de recuperação de uso único, recusa de replay do desafio, sessão antiga revogada, proteção obrigatória no admin, CSRF e 24 pedidos concorrentes: seis permitidos e 18 bloqueados.
- Chromium: login hidratado e interação funcional; script embutido sem nonce recusado pelo CSP.
- Papéis SQL: atendimento leu somente a view permitida e recebeu permission denied ao consultar Conta; execução recebeu permission denied ao tentar criar tabela.
- `/api/saude`: 200 com segredo válido no ambiente isolado. Nenhuma comprovação de disponibilidade/monitor ativo em produção.
- YAML dos workflows validado. `pg_dump`/`pg_restore` reais e job GitHub não executados nesta sessão: cliente de dump indisponível e credenciais externas ausentes. O teste unitário usa um produtor de dados fictício para verificar a cifra; não equivale a restauração real. Primeira execução do workflow é pendência obrigatória.
- Google OAuth real e deployment Vercel não exercitados nesta sessão por falta de credenciais/acesso externo. A integração de desafio MFA no retorno do Google está implementada; comprovar com conta real em Preview.

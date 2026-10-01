# TEMPORÁRIO — continuar segurança do Tino em outro notebook

**Checkpoint mais recente:** leia primeiro [`../CONTINUAR-SEGURANCA.md`](../CONTINUAR-SEGURANCA.md). A continuação no Windows chegou a 605 testes aprovados, backup/restauração reais locais e alerta de atraso. As limitações antigas de engine/dump deste documento foram superadas localmente. As configurações externas continuam pendentes e o usuário adiou a publicação até os ajustes.

Último checkpoint: 30/09/2026, após commit de implementação `c704d7a`. Projeto: `davi23mfgp/tino`. Este arquivo registra o pedido do Davi e deve ser lido antes de continuar. Não confundir com o Fixa.

## Decisões confirmadas pelo usuário

1. Concluir os controles de segurança listados abaixo, preservando funções e layout existentes.
2. Login pelo Google deve continuar funcionando. Ele ajuda na autenticação, mas NÃO impede que o operador leia o banco e NÃO comprova MFA obrigatório no Google.
3. O administrador não deve acompanhar os saldos, gastos, dívidas ou outros valores pessoais dos usuários. O painel atual já não disponibiliza esses dados; ele mostra cadastro, cobrança da assinatura do Tino, chamados e dados técnicos.
4. Acesso técnico ao banco deve ser limitado e auditado. Não anunciar que é impossível ler valores: servidor e banco ainda processam dados legíveis.
5. Criptografia dos valores com chaves controladas pelos usuários (cofre de ponta a ponta) fica para uma etapa FUTURA. Não reescrever agora cálculos, importação, Telegram, alertas, família ou IA para esse cofre.
6. Melhorar Termos de Uso e Política de Privacidade para explicar proteções reais, limites, dados do suporte e direitos. Não usar promessas absolutas para gerar confiança. Manter o padrão visual.
7. Davi pediu este documento temporário no GitHub para não repetir o histórico no outro notebook.

## Os 20 requisitos solicitados

| Requisito | Verificação e trabalho necessário |
|---|---|
| HTTPS | Vercel, HSTS e cookie Secure previstos. Verificar implantação real. |
| Hash de senhas | bcrypt custo 12 existente. Google não entrega senha ao Tino. |
| MFA | Implementar autenticador TOTP, recuperação de uso único, fluxo por senha e Google; obrigatório para administração. |
| Rate limit | Existente; corrigir contagem concorrente entre instâncias. |
| Validação | Zod e limites existentes; reforçar autenticação e entradas novas. |
| Sanitização | Escape do React, limites de JSON e filtros de logs; não garantir remoção universal de dados de qualquer erro. |
| SQL Injection | Prisma e consultas parametrizadas existentes; novos SQL devem continuar parametrizados. |
| Migrations | Versionadas e executadas no build; novas colunas de MFA exigem migration. |
| Rollback | Preparar procedimento para aplicação e banco, sem assumir que reverter deploy reverte schema. Item parcialmente coberto na imagem. |
| Controle de acesso | Isolamento por lar e papéis existentes; ampliar controles administrativos. |
| Expiração de sessão | JWT 30 dias e verificação no banco existentes; MFA precisa invalidar sessões anteriores e limitar confirmação administrativa. |
| Secrets | Variáveis Sensitive documentadas. Nunca versionar chave real. Nova chave separada para cifrar segredo MFA. |
| CORS/CSRF | Política de mesma origem para escrita via navegador, sem liberar qualquer origem. Integrações usam autenticação própria. |
| Logs | Logs de acesso/erro/admin existentes; reduzir possibilidade de conteúdo financeiro/credenciais em logs. |
| Backup | Preparar exportação automática cifrada e verificar agendamento, retenção e restauração. Cifrar backup NÃO é cofre de ponta a ponta. |
| Criptografia | HTTPS e TLS do banco; segredos MFA/backup cifrados. Criptografia privada dos valores fica adiada. Verificar criptografia em repouso do provedor. |
| Dependências | Dependabot/CI existentes; acrescentar auditoria de vulnerabilidades e tratar achados concretos. |
| PMP | Sigla da imagem não confirmada; aplicar princípio do menor privilégio, documentando essa interpretação. |
| Monitoramento | Erros no admin existentes; acrescentar checagem externa de aplicação/banco e alerta de falha. |
| Recuperação | Documentar responsáveis, procedimento, metas de recuperação e teste em banco isolado. Não declarar teste realizado sem evidência. |

## Estado atual — começar a leitura por aqui

**Prioridade: concluir os 20 controles de segurança antes de qualquer outra mudança.** O último pedido do usuário reafirmou isso. Criptografia privada dos valores continua adiada.

- Código salvo no commit **`c704d7a`**, branch **`codex/continuacao-tino`**. Repositório: https://github.com/davi23mfgp/tino/tree/codex/continuacao-tino
- A `main` recebe este documento de continuidade. **O código de segurança ainda NÃO foi incorporado à main nem promovido a produção.** Não confundir ter código no GitHub com ter controles ativos no sistema publicado.
- Os novos Secrets ainda não estão disponíveis nesta sessão. O build da Vercel recusa configuração incompleta ANTES de rodar migrations, para não tocar um banco em Preview sem os pré-requisitos.
- A base de produto usada foi `285b823`: onboarding, objetivos múltiplos, convites e edição/exclusão de contas/cartões já estavam concluídos. Não reaplicar os commits antigos da branch local `work` sobre a main.

### Implementado no código da branch

1. **MFA TOTP** com autenticador e oito códigos de recuperação de uso único. Segredo cifrado com AES-256-GCM e chave do servidor separada do JWT. Tela de configuração em `/seguranca`, acessível por Configurações.
2. **Login em duas etapas por senha e Google**: desafio separado em cookie, cinco minutos de validade e consumo único. Sem sessão plena antes do segundo fator. TOTP não pode ser reutilizado; recuperações são armazenadas como hash.
3. **Admin exige MFA** confirmado nas últimas 12 horas. Admin não pode desativá-lo pelo app. Ativar/desativar/renovar recuperação invalida versões anteriores de sessão. Configuração requer login recente.
4. **Rate limit concorrente** com trava transacional por chave, funcionando entre instâncias.
5. **CSRF/origem**: escrita com cookies exige mesma origem; pedidos cross-site são recusados. Integrações sem cookies usam assinatura/chave própria.
6. **CSP com nonce** em HTML: sem script inline livre nem eval em produção. HTML passa a ser dinâmico para emitir nonce por pedido; layout preservado.
7. **Validação e logs**: Zod na autenticação/MFA, erros esperados como 400, menos conteúdo bruto em logs, filtros para credenciais/valores e descarte dos argumentos de erros Prisma. SQL de diagnóstico não é impresso.
8. **Dependências**: Next/eslint-config-next 16.3.8, ESLint 9 e transitivas corrigidas. CI inclui `codex/**` e auditoria de dependências em produção.
9. **Segredos/TLS**: chave MFA e TLS obrigatórios em produção; validação antes de migrations na Vercel. Build não promove automaticamente uma conta comum que coincida com ADMIN_EMAIL, porque o cadastro não comprova posse do e-mail.
10. **Backup cifrado**: exportação em fluxo, AES-GCM, autenticação do arquivo, restauração com recusa de banco não vazio/origem conhecida e workflow diário. Job testa pg_restore em banco isolado antes de guardar artefato por 30 dias.
11. **Monitor externo**: `/api/saude` testa o banco sem devolver dados pessoais; workflow periódico com issue de falha e resolução.
12. **Menor privilégio e operação**: SQL com grupos distintos para execução, backup e atendimento; views de atendimento não incluem valores pessoais/hash da senha. Runbook de recuperação, rollback e incidente.
13. **Termos/política**: revisão com versão 2026-09-30, aviso de mudança pelo mecanismo existente e limites verdadeiros do acesso técnico. Não afirmar que o operador não consegue ler o banco.

### Arquivos para continuar

- MFA: `src/lib/mfa.ts`, `totp.ts`, `criptografia.ts`, `auth.ts`, `admin.ts`; rotas `src/app/api/auth/mfa/`; telas `/login/mfa` e `/seguranca`; componente `configurar-seguranca.tsx`.
- Proteção geral: `src/lib/origem-segura.ts`, `politica-conteudo.ts`, `limite.ts`, `ambiente.ts`, `api.ts`, `erros.ts`, `src/proxy.ts`, `next.config.mjs`, `scripts/migrar.mjs`.
- Banco: `prisma/migrations/20260930210000_seguranca_mfa/migration.sql`, `scripts/permissoes-banco.sql`.
- Operação: `scripts/backup.mjs`, `copia-segura.mjs`, `restaurar-backup.mjs`; workflows de backup/monitoramento/CI.
- Testes: `testes/protecao-adicional.test.ts`, `backup.test.ts`, `seguranca.test.ts`, `erros.test.ts`; `scripts/verificar-seguranca.ts` (comando `npm run test:seguranca:integracao`).
- Documento definitivo e evidência: https://github.com/davi23mfgp/tino/blob/codex/continuacao-tino/docs/SEGURANCA-OPERACAO.md
- Plano FUTURO do cofre: https://github.com/davi23mfgp/tino/blob/codex/continuacao-tino/docs/PRIVACIDADE-SEM-ACESSO-AOS-VALORES.md

### Verificação realizada — não repetir sem necessidade

- **601 testes aprovados**, checagem de tipos aprovada e `git diff --check` limpo.
- **Auditoria npm sem vulnerabilidades conhecidas** após atualização.
- **Build Next de produção com webpack aprovado localmente.** Fontes Google foram substituídas apenas no build de teste por bloqueio de rede; as fontes do produto não mudaram.
- **Postgres 18 isolado**: SQL migrations aplicadas. Por bloqueio do download da engine nativa, o runtime de QA usou Prisma WASM + adapter-pg com preload temporário. Isso NÃO foi incluído na aplicação nem nas dependências de produção.
- **Integração HTTP real**: cadastro, ativação MFA, recuperação, recusa de replay do desafio/código, sessão antiga inválida, admin bloqueado sem MFA, CSRF e 24 chamadas concorrentes (seis permitidas, 18 bloqueadas).
- **Chromium**: login hidratado, botão funcional e script sem nonce bloqueado pelo CSP.
- **Papéis SQL**: atendimento leu view autorizada e recebeu permission denied em Conta; execução não conseguiu criar tabela.
- **Saúde local**: 200 com segredo válido. YAML dos workflows validado.
- **NÃO verificados**: OAuth Google real, engine nativa/runtime Vercel, implantação, roles reais no Neon, execução GitHub de backup/monitor e restauração real com pg_dump/pg_restore. Teste unitário do backup usa produtor fictício e NÃO equivale a restauração real.

### Próximos passos, em ordem

1. No outro notebook: buscar branch/commit do GitHub e ler AGENTS.md, este documento e SEGURANCA-OPERACAO.md. Conferir se houve commits posteriores. Não reconstruir os controles já implementados.
2. Configurar chaves MFA/JWT, TLS e ambientes separados. Guardar chaves de recuperação dos serviços em local seguro; nunca em Git/chat. Não trocar chave MFA de usuários cadastrados sem recifragem.
3. Gerar Prisma normalmente, aplicar migration em banco de teste e validar Preview com engine nativa. Não copiar os overrides de QA desta máquina para CI/Vercel.
4. Testar Google real com MFA, cadastro do admin, recuperação, perfil/família, importação e cartão. Core de senha/MFA já foi testado localmente.
5. Efetivar grupos SQL no Neon e credenciais separadas. Confirmar criptografia em repouso do fornecedor e acesso técnico temporário/auditado.
6. Configurar Secrets de backup e monitor e variável MONITORAMENTO_URL no GitHub. Executar jobs manualmente, conferir dump/pg_restore em banco isolado e upload cifrado; configurar notificações e alerta de atraso do backup. Verificar retenção própria do Neon e refletir prazo real na política.
7. Revisar runbooks e registrar uma simulação de recuperação. Validar objetivos RPO 24h / RTO 4h com medição real, sem anunciá-los como garantia.
8. Só então integrar/promover o código, verificar HTTPS/headers/MFA/monitor no domínio de produção e registrar URLs das execuções/deploy como evidência. Ainda não marcar os 20 itens concluídos.
9. Após continuidade incorporada nos registros definitivos, apagar somente este documento temporário, conforme solicitado pelo Davi.

### Limitações deste ambiente

Sem credenciais Vercel/Neon e com bloqueio de rede para chat compartilhado, API GitHub, binaries.prisma.sh e Google Fonts. Git fetch/push funcionam. A geração para tipos funcionou com `PRISMA_QUERY_ENGINE_LIBRARY=/bin/true PRISMA_SCHEMA_ENGINE_BINARY=/bin/true npx prisma generate --no-engine`; isso não é um runtime normal. Arquivos de QA em `/tmp` e `.qa-visual` são locais e não devem ser necessários no próximo notebook. Preferir a configuração normal com engine nativa disponível.

## Antes de publicar

- Conferir tipos e testes; testar login por senha, Google, MFA, recuperação, bloqueio do admin e chamadas simultâneas.
- Configurar nova chave de MFA sem comitá-la. Guardar cópia segura separada: perder essa chave impede verificar autenticadores cadastrados.
- Confirmar TLS das URLs do banco, origens do app, credenciais administrativas, backup e monitoramento.
- Fazer teste de restauração em banco isolado; nunca apontar o teste para produção.
- Verificar a política publicada contra implementação e contratos reais. Revisão jurídica pendente.
- Seguir AGENTS.md: push automático após tipos/testes verdes; sem force-push, rebase ou exclusão de branch.

## Ideia futura: cofre de ponta a ponta

Valores e descrições seriam cifrados no dispositivo, com chave fora do controle do operador. Isso exige mover cálculos para o cliente, adaptar recuperação por dispositivo/código, compartilhar chaves entre família, redesenhar automações/importação e controlar envio à IA. Perda de todos os meios de recuperação pode causar perda de acesso aos dados. Em app web, publicação do código também faz parte da ameaça. NÃO começar essa arquitetura nesta rodada; o usuário escolheu adiar.

## Quando excluir este documento

O próximo agente deve primeiro registrar decisões e pendências ainda válidas em `docs/DECISOES.md` e no documento definitivo de segurança, conferir que o trabalho está salvo no GitHub, e então excluir SOMENTE este arquivo temporário em um commit normal. O usuário já solicitou essa exclusão após a transferência do contexto. Não apagar documentos definitivos, código, dados ou branches junto.

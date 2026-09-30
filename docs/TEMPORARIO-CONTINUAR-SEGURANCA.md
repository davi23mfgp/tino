# TEMPORÁRIO — continuar segurança do Tino em outro notebook

Data: 30/09/2026. Projeto: `davi23mfgp/tino`. Este arquivo registra o pedido do Davi e deve ser lido antes de continuar. Não confundir com o Fixa.

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

## Estado do trabalho nesta sessão

Base conferida: `origin/main` em `285b823`. Branch de trabalho: `codex/continuacao-tino`.

As mudanças anteriores de onboarding, objetivos múltiplos, convites, edição/exclusão de contas e cartões e retirada de MEI do fluxo pessoal já estão na main. Não reaplicar os commits antigos da branch local `work` sobre a main.

Revisão dos termos/política foi preparada localmente com versão `2026-09-30`. Plano futuro do cofre em `docs/PRIVACIDADE-SEM-ACESSO-AOS-VALORES.md`.

Implementação de segurança em andamento: migration de MFA, criptografia autenticada para segredo TOTP, códigos de recuperação, desafio separado da sessão, integração senha/Google, exigência de MFA no admin, tela de segurança seguindo componentes existentes, correção de rate limit com trava transacional, proteção de origem e CSP com nonce por requisição. Conferir o commit de implementação e os resultados finais antes de publicar. Este documento por si só não implanta esses controles.

Neste ambiente, download de engines do Prisma via `binaries.prisma.sh` retorna 403. Foi possível gerar o cliente para tipos com `PRISMA_QUERY_ENGINE_LIBRARY=/bin/true PRISMA_SCHEMA_ENGINE_BINARY=/bin/true npx prisma generate --no-engine`. Isso serve para checagem de tipos/testes sem consultas; NÃO é configuração de produção e NÃO comprova runtime com banco. Não copiar esses overrides para CI/Vercel.

Vercel/Neon: configurações reais e credenciais não disponíveis nesta sessão. Não afirmar deploy, backup, MFA administrativo ativado ou criptografia do provedor sem verificar. O link do chat compartilhado retornou bloqueio de rede; continuidade foi recuperada pelo Git e documentos do Tino.

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

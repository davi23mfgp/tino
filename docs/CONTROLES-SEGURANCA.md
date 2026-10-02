# Conferência dos 20 controles — 01/10/2026

O trabalho continua na branch `codex/continuacao-tino`. Código enviado ao GitHub. A continuação remota registrou deploy Production Ready de `7a09873`; isso não comprova todos os controles operacionais. Retomada e escopo de teste em [ESTADO-2026-10-02.md](ESTADO-2026-10-02.md). Implementação e evidência em produção são etapas distintas.

| Item | Preparado no projeto | Comprovação externa pendente |
| --- | --- | --- |
| 1. HTTPS | HSTS e cookies seguros; HTTPS/HSTS conferidos no domínio atual | Repetir conferência após publicação |
| 2. Hash de senhas | bcrypt custo 12 | Nenhuma mudança de infraestrutura |
| 3. MFA | TOTP, recuperação de uso único, desafio separado, admin obrigatório; integração local passou | Chave cifradora, cadastro do admin e login Google real em Preview |
| 4. Rate limit | Contador transacional; 24 chamadas simultâneas verificadas | Observar operação no ambiente publicado |
| 5. Entradas | Zod, limites de JSON e tamanho | Conferência dos fluxos publicados |
| 6. Sanitização | Escape React, JSON limitado, logs redigidos | Revisar eventuais novos campos HTML e integrações |
| 7. SQL Injection | Prisma e parâmetros nas consultas verificadas | Nenhuma garantia de auditoria completa do sistema |
| 8. Migrations | 39 migrations aplicadas em banco isolado; build valida segredos antes de migrar | Preview separado em `tino_preview` e deploy Ready confirmados pelo usuário; conferir Production |
| 9. Rollback | Procedimento de compatibilidade de schema e restauração em banco novo | Simulação no provedor; código antigo não deve contornar MFA |
| 10. Acesso | Permissões no servidor e isolamento por lar; admin exige MFA | Cadastro MFA do administrador |
| 11. Sessão | Expiração, revogação no banco e revogação ao alterar MFA | Conferência publicada |
| 12. Secrets | Variáveis, validação e recusa de configurações inseguras | Configurar e custodiar chaves fora do Git/chat |
| 13. CORS/CSRF | Mesma origem para escrita com cookie e CSP com nonce | Conferir origens reais e hidratação em Preview |
| 14. Logs | Acesso, erros e administração; remoção de consultas e credenciais | Definir acesso e retenção no provedor |
| 15. Backups | Dump cifrado, restauração validada antes do upload, retenção 30 dias; dump/restauração locais reais passaram | Secrets, primeira execução GitHub e custódia privada |
| 16. Criptografia | TLS exigido, MFA e backups AES-256-GCM | Confirmar criptografia em repouso e plano Neon; valores financeiros não possuem cofre ponta a ponta |
| 17. Dependências | Dependabot e auditoria no CI; auditoria local sem achados | Manter alertas e atualização contínua |
| 18. PMP | SQL de papéis mínimos e testes isolados de permissões | Confirmar significado da sigla e aplicar roles no provedor |
| 19. Monitoramento | Saúde com segredo, incidente automático, alerta de backup ausente/mais de 26h e resolução | Secrets, URL, notificações e primeira execução; GitHub Schedule pode atrasar |
| 20. Recuperação | Runbook, restauração em destino vazio, objetivos RPO 24h/RTO 4h | Simulação Neon, custódia das chaves e medição real dos objetivos |

Procedimentos e variáveis: [SEGURANCA-OPERACAO.md](SEGURANCA-OPERACAO.md). O teste local de restauração comprovou o fluxo em dados de demonstração, sem acessar dados de produção. Nenhum item de infraestrutura deve ser marcado como concluído sem sua evidência.

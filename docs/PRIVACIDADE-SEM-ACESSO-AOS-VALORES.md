# Privacidade dos valores — 30/09/2026

## Objetivo solicitado

O operador do Tino deve administrar o produto sem acompanhar a vida financeira de seus usuários. A política deve informar proteções reais, com linguagem clara, sem afirmar que o banco é ilegível enquanto isso não for verdade.

## Estado verificado

- O painel administrativo consulta cadastro, assinatura/cobranças do Tino, chamados, acessos e erros. A ficha não consulta lançamentos, saldos, dívidas ou conversas do assistente.
- Senhas usam bcrypt custo 12. O painel não seleciona senhaHash. Hash não é criptografia reversível; senha fraca ainda pode ser adivinhada offline se o hash vazar.
- Dados financeiros, conversas e faturas são legíveis pelo servidor e por acesso privilegiado ao banco. TLS e criptografia em repouso do provedor não retiram essa capacidade do operador.
- A auditoria de ficha administrativa não cobre consultas diretas ao banco. Não anunciar auditoria completa.
- Compartilhamento familiar concede acesso ao lar. Exclusão de um usuário não apaga o lar quando outros usuários permanecem.
- Serviços de IA e importação podem receber conteúdo financeiro conforme fluxos existentes. Essa operação é incompatível com a promessa de que somente o usuário pode ler todos os dados.

## Alteração preparada nesta rodada

Termos e política de privacidade esclarecem esses limites, distinguem cobrança da assinatura de finanças pessoais, explicam senhas e compartilhamento e corrigem promessas excessivas de exclusão/exportação, cookies e remoção de dados dos erros. Versão 2026-09-30 usa o aviso de atualização já existente. Layout preservado. Criptografia de ponta a ponta NÃO implementada nesta rodada.

## Arquitetura necessária para retirar acesso rotineiro aos valores

1. Definir dados privados: valores, descrições, nomes de contas, metas, dívidas, faturas, mensagens e perfil financeiro. Cadastro, assinatura e metadados mínimos de operação permanecem separados.
2. Criar uma chave aleatória por lar no dispositivo do usuário. Cifrar com criptografia autenticada (por exemplo AES-GCM via Web Crypto), nonce único, versão e contexto vinculado ao lar e ao registro. Servidor e backups recebem apenas conteúdo cifrado e metadados mínimos.
3. Não enviar a chave ao servidor nem guardá-la em variável da Vercel ou em KMS sob controle do operador: isso protegeria um dump isolado, mas permitiria ao operador decifrar.
4. Autenticação e desbloqueio do cofre são etapas distintas. Google prova identidade, mas não entrega uma chave criptográfica privada para esse cofre. Escolher mecanismo de desbloqueio e transferência entre dispositivos sem custódia do operador.
5. Preparar recuperação com código/chave guardado pelo usuário. Recuperar o login por e-mail não recupera automaticamente o cofre. Perder todos os dispositivos e meios de recuperação pode tornar os dados inacessíveis; o fluxo deve explicar e verificar o backup da chave.
6. Compartilhar a chave do lar cifrada para cada participante após convite e verificação de identidade. Remoção de membro exige rotação de chaves; não apaga cópias que ele já tenha visto ou exportado.
7. Mover cálculos, pesquisa, categorização, importação e projeções para o cliente ou redesenhar cada função. Notificações financeiras sem dispositivo ativo, Telegram e recebimento automático de faturas precisam de solução própria: processá-los em servidor com texto aberto quebra a propriedade desejada.
8. Tornar envio a IA uma ação explícita com informação do conteúdo e do destinatário. Não enviar automaticamente descrições privadas para identificação de logos. Enviar conteúdo a um provedor de IA continua sendo compartilhamento, mesmo se o banco estiver cifrado.
9. Migrar dados existentes com desbloqueio pelo usuário, validar integridade antes de substituir dados e tratar cópias antigas, caches, logs e backups. Não apagar registros antigos sem plano de restauração e validação.
10. Testar isolamento, adulteração, perda de dispositivo, recuperação, convites, revogação e migração. Fazer revisão especializada antes de prometer ausência de acesso do operador.

## Limites que precisam continuar explícitos

Criptografia protege o conteúdo armazenado, mas não esconde todos os metadados. Dispositivo comprometido, membro autorizado e conteúdo enviado voluntariamente ao suporte/IA continuam sendo vias de acesso. Em um app web, quem publica o JavaScript pode alterar o código entregue: a ameaça de operador malicioso exige controles adicionais sobre cliente, distribuição e auditoria. Não anunciar impossibilidade absoluta de acesso nem segurança total.

## Operação e revisão jurídica

Separar credenciais administrativas e de execução; impedir leitura rotineira do banco pelo atendimento; exigir MFA para contas privilegiadas; acesso excepcional temporário e auditado; reduzir dados dos logs; verificar fornecedores, backups, retenção, transferência internacional e resposta a incidentes. Essas configurações não foram comprovadas nesta rodada.

O texto preparado precisa de revisão jurídica com os contratos e configurações efetivos. Nenhuma mudança de texto substitui esses controles. A próxima implementação é a arquitetura do cofre e seus fluxos de recuperação, família e automações, antes de alterar a política para afirmar que o operador não consegue ler valores.

## Verificação desta rodada

13 testes de `seguranca.test.ts` passaram; sintaxe dos três arquivos TypeScript alterados validada por transpileModule e `git diff --check` sem erros. `npm run tipos` falhou no projeto devido ao Prisma Client não gerado neste ambiente, com erros em arquivos dependentes dele. Build e produção não validados. Sem push/publicação: AGENTS.md exige tipos e testes verdes antes de push automático.

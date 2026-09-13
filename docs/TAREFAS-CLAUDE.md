# Trabalho paralelo para Claude

Base: usar o commit mais recente de `main` após a publicação desta rodada. Trabalhar em branch ou worktree próprio para evitar conflito com o fechamento feito pelo Codex.

## Divisão

### Codex — em andamento

- Concluir validação automatizada e visual das 53 solicitações.
- Corrigir regressões encontradas nessa validação.
- Consolidar migrations, documentação, commit, push e implantação na Vercel.
- Conferir produção e manter o servidor local pronto para desenvolvimento.

### Claude — tarefas independentes

#### C1. Auditoria de textos

Leia `src/app/(app)/**/*.tsx` e `src/components/**/*.tsx`. Liste frases longas, ambíguas ou com tom artificial. Proponha texto curto em português brasileiro, preservando significado financeiro e avisos necessários.

Saída: `docs/REVISAO-TEXTOS-CLAUDE.md`, com colunas arquivo, texto atual, texto proposto e motivo. Não altere componentes nesta tarefa.

Conclusão: todas as telas pessoais revisadas; nenhuma proposta muda regra financeira.

#### C2. Auditoria de acessibilidade

Revise teclado, foco, nomes acessíveis, contraste e áreas de toque nas rotas `/cartoes`, `/metas`, `/transacoes`, `/configuracoes` e painel de notificações.

Saída: `docs/REVISAO-ACESSIBILIDADE-CLAUDE.md`. Cada achado deve ter prioridade, arquivo, elemento, reprodução e correção proposta. Corrija somente problemas P0/P1 em commit separado.

Conclusão: navegação principal funciona só com teclado; modais prendem e devolvem foco; controles têm nome; alvos interativos têm pelo menos 44 px.

#### C3. Testes das integrações preparadas

Crie testes locais para:

- alias e assinatura de faturas em `src/lib/faturas-email.ts`;
- autorização e idempotência das rotas de faturas;
- fallback local quando `GROQ_API_KEY` não existe;
- rejeição de anexos inválidos e maiores que 10 MB;
- deduplicação entre captura Android e importação.

Use o runner já configurado. Não use serviços externos nem chaves reais.

Conclusão: testes passam isoladamente e não dependem de rede.

#### C4. Revisão de segurança por escopo de conta

Revise rotas novas em `src/app/api/cartoes`, `src/app/api/faturas-email`, `src/app/api/identidades`, `src/app/api/metas` e `src/app/api/webhooks/faturas-email`.

Saída: `docs/REVISAO-SEGURANCA-CLAUDE.md`. Verifique acesso cruzado entre lares, limites de payload, validação de inteiros em centavos, replay e mensagens sem dados sensíveis. Corrija vulnerabilidades confirmadas em commit separado.

Conclusão: cada leitura e escrita privada prova posse do lar ou da conta; webhook valida assinatura antes de processar conteúdo.

#### C5. QA visual complementar

Compare as telas atuais com `docs/PEDIDOS-REDESIGN-53.md` em 320, 390, 768 e 1440 px. Priorize cartões, categorias, metas, dívidas, plano, projeção e configurações.

Saída: `docs/REVISAO-VISUAL-CLAUDE.md`, com captura, rota, largura e problema observável. Corrija somente cortes, sobreposição, baixo contraste e números quebrados em commit separado.

Conclusão: nenhuma página tem rolagem horizontal; barra inferior, porquinho e diálogos não escondem ações.

## Entrega do Claude

Entregar um commit por tarefa alterada, informar hashes e testes executados. Se encontrar decisão de produto, registrar pergunta no documento correspondente sem escolher regra financeira nova.

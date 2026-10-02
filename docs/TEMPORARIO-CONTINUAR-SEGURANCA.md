> **Decisão mais recente — 02/10/2026:** a pedido do usuário, restaurada a landing pessoal ao padrão anterior ao primeiro pedido de hero motion (base `0e4b174`): título, capturas, moldura, cartões flutuantes e seletor automático original. MEI adota o mesmo padrão visual com conteúdo do negócio; suas prévias continuam identificadas como dados fictícios. Mantidos os cadastros, logins e planos separados. O hero guiado pelo scroll foi retirado das duas landings; pedidos anteriores desse efeito abaixo são histórico, não pendência de reimplementação. Publicação solicitada em produção; confirmação visual pós-deploy pendente.

> **Complemento solicitado em 02/10:** hero com animações acompanhando o scroll down. Implementado nas duas landings: aproximação e perspectiva da janela vinculadas ao progresso da rolagem, passagem pelas telas, rolagem interna guiada e barra de progresso. O visor não captura a rolagem durante a visita automática; pausa e movimento reduzido permitem rolagem manual. Área visível do sistema ampliada no desktop e mobile. Pendente: conferir o resultado visual em navegador após o deploy; tipos e testes não comprovam aparência.

# TEMPORÁRIO — pedidos, entregas e continuidade do Tino

**Atualizado em 02/10/2026, horário de São Paulo.** Este é o documento temporário solicitado pelo usuário para qualquer pessoa retomar sem pedir o histórico novamente. O resumo atual abaixo prevalece sobre os checkpoints antigos. **Manter este documento:** o pedido mais recente foi atualizá-lo e disponibilizá-lo no GitHub; não executar a instrução antiga de exclusão no final do histórico sem novo pedido.

## Onde estamos agora

- Repositório: [davi23mfgp/tino](https://github.com/davi23mfgp/tino). Branch de continuidade: `codex/continuacao-tino`; alterações funcionais também promovidas à `main` por autorização explícita do usuário em 02/10.
- Último código funcional: `b787888` (landings separadas e refinamento da pausa do hero). Registro pós-publicação: `a307e56`, apenas documentação.
- O projeto principal Vercel é `davi-pereiras-projects-0e1004d7`. Os dois deploys de b787888 concluíram: [43DYYZREv5u8fgqeqpyBT4qhL6WE](https://vercel.com/davi-pereiras-projects-0e1004d7/tino/43DYYZREv5u8fgqeqpyBT4qhL6WE), às 10:20:21, e [6ypcBvWC2ePEG42obfujvs6gSYGj](https://vercel.com/davi-pereiras-projects-0e1004d7/tino/6ypcBvWC2ePEG42obfujvs6gSYGj), às 10:21:32. CI de main e continuidade passaram. Tipos e **618 testes / 136 suítes** passaram localmente; novas rotas passaram no `next typegen`.
- Existe outro projeto conectado ao GitHub, `davi-pereiras-projects-24f2ce83`, com deploys falhando. Conferir status por projeto e deployment; o status combinado do commit pode misturar os destinos. Não remover essa integração sem identificar sua finalidade.
- Deploy concluído comprova publicação, **não** aprovação visual, login Google real, backup real nem conclusão dos 20 controles. O agente desta sessão não conseguiu inspeção visual no navegador; acesso HTTP direto à Vercel foi bloqueado com CONNECT 403. Os status puderam ser consultados pela conexão GitHub.

| Área | Landing | Cadastro | Login | Destino após acesso |
| --- | --- | --- | --- | --- |
| Finanças pessoais | [Raiz](https://tino-kappa.vercel.app/) | `/cadastro` | `/login` | `/painel` |
| MEI | [Para MEI](https://tino-kappa.vercel.app/para-mei) | `/cadastro/mei` | `/login/mei` | `/loja` |

MEI também tem `/login/mei/mfa`. São entradas e apresentações separadas; a autenticação e a identidade continuam comuns ao Tino, sem banco ou senha independentes por produto.

## O que o usuário pediu e o que foi feito

| Pedido | Entrega atual | O que ainda conferir ou completar |
| --- | --- | --- |
| Visual fino, moderno, objetivo e organizado; aproveitar espaço | Revisões no painel, filtros, reserva, dívidas, simulador, análise, investimentos e configurações | Conferência visual desktop/mobile, sem usar testes de cálculo como aprovação da aparência |
| Pontos e milhas como área própria, fora de Conferir fatura | `/milhas`, regras por cartão, saldo manual, previsão mensal, parcelas futuras separadas, links dos programas e calculadora de bônus/custo | Administração persistente e saldo único por programa ainda pendentes |
| Logos das principais marcas e exemplo preenchido | Assets locais Livelo, Smiles, LATAM Pass e Azul; botão de exemplo com saldo 32.500, previsão 1.692 pontos e parcelas de 372 | Logo oficial verificável da Esfera; não afirmar que os cinco estão prontos |
| Preencher milhas para entender os cálculos | Modo de exemplo em memória, sem gravar configuração ou saldo reais; bônus de transferência simulado | Não há compra, transferência ou resgate executados nos programas externos |
| Parcelas/projeção com marcação discreta | Projeção mantém **hachura diagonal**, restaurada na última continuação remota; marcações e preenchimento refinados | O estado de 01/10 que diz pontilhado prevalecente foi substituído; conferir aparência publicada antes de alterar novamente |
| Extrato e escolha de conta/cartão organizados | Filtros agrupados; contas/cartões em colunas equilibradas, seleção imediata | Conferir telas estreitas e nomes grandes |
| Ajustar limite clicando com popup | Limite por categoria com salvar/cancelar e repetição por meses | Não confundir com limite de crédito do cartão |
| Reserva mais objetiva | Modos agrupados, valor editável, régua fina e previsão | Conferir os cinco modos na interface publicada |
| Dívidas com mais destaque e simulação intuitiva | Cartões individuais, saldo/juros/parcela, plano mensal, valor extra digitável, atalhos e estratégias lado a lado | Conferir interação e respostas reais da simulação; fórmulas preservadas |
| Calendário mensal de dívidas e empréstimos organizados | Colunas por mês/ano e formulário por valor, prazo, juros e tarifas | Conferência móvel e salvar proposta |
| Remover cartões monetários extras da análise | Retirados seis resumos rejeitados da aba Indicadores; permanecem os diagnósticos ordenados por criticidade | Não restaurar grade de 12 indicadores sem novo pedido |
| Análise com dados evidentes e menos vazios | Barras por grupo, participação dos gastos separada da renda, fixos estimados destacados, régua de referência e ações | Fixos são estimativa com parcelas; “gastos acima da estimativa” não classifica cada compra como variável |
| Aumentos e gastos por dia mais claros | Ranking de crescimento **em reais**, valor anterior, barras; calendário clicável, pico e total por dia | Comparação é com mesmo período anterior; categoria nova não recebe percentual inventado |
| Ícones discretos e identidade de bancos/cartões | Ícones do sistema neutros; logos dos bancos e bandeiras quando disponíveis | Não trocar marca verificada por emoji decorativo |
| Conferir no meio e preencher com anotar/ditar | Cartão vertical entre compras e distribuição; bloco de anotação abaixo | A fila continua exigindo conferência; nada confirmado automaticamente |
| Notificações com contraste e relevo | Cartões opacos, sombra, borda/ícones discretos e controles de leitura | Conferir temas claro/escuro e mobile |
| Minimizar cor do tema | Linha com cor atual; paleta só montada ao abrir e recolhida após seleção | Não deixar todas as cores expostas permanentemente; seleção persiste pelo provedor existente |
| Desempenho e próximo aporte evidentes | Resumo da carteira, histórico quando disponível e distribuição do aporte | Não inventar rentabilidade sem posição anterior |
| Fita de mercado contínua e ativos pessoais | Índices e ativos da carteira; pausa/retomada; consulta a cada dez minutos e ao voltar à aba | Não chamar tempo real: cache de dez minutos e fonte com atraso possível de quinze minutos |
| Landing atual e hero motion entrando nas telas | Capturas antigas retiradas das seções da landing pessoal; visita em HTML guiada pela rolagem, com troca de telas, pausa, seleção manual e adaptação móvel | É prévia com dados fictícios, não vídeo, sessão autenticada nem reprodução integral de toda a interface; conferir visual e rolagem reais |
| Landing pessoal e MEI diferentes, inclusive login | Raiz pessoal e `/para-mei`, planos filtrados por área, cadastros/logins próprios; MEI abre loja | Preços comerciais e escopo dos planos existentes preservados |
| Retirar escolha MEI da entrada pessoal | Removida também no cadastro **Google**, onde ainda existia; cadastro MEI não pergunta casal/família | Testar Google e MFA reais nas duas entradas; contexto é mantido em cookie e identidade assinada, com divergência recusada pela API |
| Publicar tudo e registrar continuidade | Código atual integrado à main, deploys concluídos e este documento consolidado | Novos controles de segurança ainda devem ser preparados e comprovados em teste antes de produção |

Detalhes cronológicos e commits: [estado de 02/10](ESTADO-2026-10-02.md). Entregas anteriores: [estado de 01/10](ESTADO-2026-10-01.md), que é histórico e contém decisões posteriormente revertidas.

## O que falta, em ordem de trabalho

### 1. Conferir o que acabou de ser publicado

- Abrir as duas landings, desktop e mobile: rolagem do hero, troca de telas, pausa, seleção manual, movimento reduzido, navegação e ausência de overflow.
- Conferir cadastro/login pessoal e MEI; Google, erros, contexto após retorno, MFA e destino correto. O erro anterior de Google não configurado não tem resolução real comprovada apenas por existir variável no projeto.
- Conferir paleta minimizada, notificações, dívidas, calendário, limites e modo de exemplo de milhas. Registrar defeitos concretos antes de nova revisão visual.
- Investigar a segunda integração Vercel com falhas e confirmar qual alias aponta para qual target. Alias da branch foi associado a Production em publicação anterior; **não presumir que seu nome garante ambiente de teste**.

### 2. Fechar os 20 controles de segurança com evidência

A fonte individual é [CONTROLES-SEGURANCA.md](CONTROLES-SEGURANCA.md), com procedimentos em [SEGURANCA-OPERACAO.md](SEGURANCA-OPERACAO.md). **Não anunciar 20/20 nem reutilizar a contagem antiga 12/8.** Há implementação no código e testes locais, mas infraestrutura e fluxos publicados seguem pendentes.

- Confirmar Preview e banco isolados antes de escrever. Preparado workflow manual `.github/workflows/backup-teste.yml`, sem agendamento ou fallback para produção. Precisa exclusivamente `BACKUP_TESTE_DATABASE_URL` e `BACKUP_TESTE_CHAVE_CRIPTOGRAFIA`. Ainda não foi executado.
- Depois executar backup de teste, comprovar cifra, restauração em destino vazio e comparação dos dados. Preparar monitor de teste com configuração independente.
- Conferir MFA administrativo, sessões/revogação, CSP/hidratação, origens, permissões por lar e Google no ambiente publicado.
- Configurar/verificar roles mínimos no Neon, secrets/URL dos workflows operacionais, primeira execução de backup e monitor, retenção, acesso a logs, alertas e rollback.
- Confirmar criptografia em repouso e proteção das contas dos provedores. Medir restauração real no provedor: RPO 24h e RTO 4h são objetivos, ainda não medições.
- Custodiar chaves fora do Git/chat. A cópia de MFA Production cifrada com DPAPI depende do perfil Windows; precisa de custódia segura independente. Não rotacionar sem recifragem.
- Confirmar significado de PMP; interpretação atual é princípio do menor privilégio.

### 3. Completar administração de milhas

Programas independentes dos cartões; saldo único por programa sem duplicidade; histórico persistente de compra, transferência e resgate; lotes/validade e alertas de expiração; conversão configurável entre programas. Obter arte oficial verificável da Esfera. Os links externos e a calculadora existentes não executam essas operações nem sincronizam saldos.

### 4. Planejamento futuro, sem iniciar automaticamente

Cofre de ponta a ponta dos valores financeiros **adiado pelo usuário**. Não prometer que o operador técnico não pode ler valores: hoje servidor/banco processam dados legíveis. Revisão jurídica e confirmação dos contratos/retenção de fornecedores continuam pendentes. Não ampliar o escopo para reconstruir autenticação, cálculos ou integrações sem pedido.

## Como retomar

1. Ler AGENTS.md, este resumo e o estado de 02/10; fazer `git status` e `git fetch` antes de editar. Preservar alterações externas e histórico.
2. Distinguir implementado, testado localmente, publicado e conferido visualmente. Usar commit/projeto/deployment exatos como evidência.
3. Continuar as pendências acima sem pedir ao usuário que repita os pedidos. Se ele enviar um ajuste novo, incorporá-lo sem perder a fila de segurança e milhas.
4. Não compartilhar segredos, resemear produção, executar backup em banco real por engano ou mudar funções financeiras para melhorar o visual. Dinheiro permanece em centavos.
5. Atualizar este documento na próxima entrega. Publicação de UI atual foi autorizada; mudanças de segurança continuam primeiro em teste, com evidência operacional antes da promoção.

---

# Histórico anterior: segurança de 30/09 e checkpoints iniciais

Os trechos abaixo são preservados para consulta. Não interpretar “a implementar”, contagens antigas, restrições antigas de publicação ou instrução de exclusão como estado vigente quando contradisserem o resumo acima.

# TEMPORÁRIO — continuar segurança do Tino em outro notebook

**Checkpoint mais recente:** leia primeiro [`../CONTINUAR-SEGURANCA.md`](../CONTINUAR-SEGURANCA.md). A continuação no Windows chegou a 605 testes aprovados, backup/restauração reais locais e alerta de atraso. As limitações antigas de engine/dump deste documento foram superadas localmente. As configurações externas continuam pendentes e o usuário autorizou a publicação em 01/10/2026; comprovação do deploy e infraestrutura continua pendente.

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

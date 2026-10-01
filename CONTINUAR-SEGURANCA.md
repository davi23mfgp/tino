# Continuação do Tino — sessão de 30/09/2026

Leia este arquivo antes de editar. Repositório `davi23mfgp/tino`; branch com implementação e validações: **`codex/continuacao-tino`**. O usuário pediu documentar tudo para o próximo Codex ou Claude não repetir o trabalho.

## Pedido vigente

Concluir os 20 controles de segurança antes de voltar ao design. Preparar e testar o que for possível no projeto; fazer os ajustes e somente depois publicar. **Publicação autorizada pelo usuário em 01/10/2026 após os ajustes.** Preservar funções e layout. Não declarar os 20 concluídos: dependências de infraestrutura ainda estão abertas. Confirmar a sigla PMP; até aqui foi interpretada como princípio do menor privilégio.

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

### Refinamentos visuais solicitados — 01/10/2026

Saúde do dinheiro: nota compacta, quatro indicadores sem anéis, prioridade menor; cálculo e referências preservados. Menu da conta reduzido. Notificações: painel flutuante compacto no desktop, estado vazio ilustrado, ações de rodapé somente quando existem avisos; filtros/ações existentes preservados. Cadastro com superfície igual ao app, rótulos, mostrar senha e escolhas em três blocos; configuração inicial dentro de superfície consistente e centralizada. Alterações só em Preview; evidência visual final e 20 controles continuam pendentes.

### Correção da validação do vencimento — 01/10/2026

Captura mostrou Dia 10 selecionado, mas cadastro recusava pedindo data completa. Restava validação antiga YYYY-MM-DD em CadastroDeConta. Substituída por leitura de dia mensal 1–31 antes de enviar API, com testes de regressão cobrindo todos os dias, ausência opcional e entradas inválidas. Não alterado layout.

### Régua colorida da saúde — 01/10/2026

Usuário pediu saúde mais fina/moderna e parâmetros verde/amarelo/vermelho. Indicadores agora mostram régua de 4px com limites reais de escala.bom/atencao/maximo, marcador do valor atual e rótulo textual da faixa; meses de reserva inverte a direção das cores. Valores, thresholds e diagnóstico preservados. Espaçamento, nota e prioridade mais compactos. Prévia ainda requer conferência visual.

### Estabilidade ao abrir menu do avatar — 01/10/2026

Usuário relata tremor na abertura. Ajuste dirigido ao menu da conta: animação somente de opacidade, sem zoom/deslocamento; modo não modal evita mudança de largura por bloqueio de rolagem; reserva do seletor de tema corrigida de 48 para 54px para não mudar altura ao montar. Outros dropdowns preservados. Correção estrutural verificada por tipos/testes; confirmar suavidade no navegador do usuário em Preview.

### Cartões na mesma coluna — 01/10/2026

Pedido do usuário: manter tamanho atual e, com dois ou mais cartões, mostrar um abaixo do outro com elevação no hover. Carteira desktop agora coluna vertical de cartões inteiros, largura máxima 360px, ação Novo cartão ao final. Removida expansão para linha inteira quando existem múltiplos; fluxo permanece ao lado. Pilha do celular e animação reduzida preservadas.

### Carteira em escadinha — correção do pedido em 01/10/2026

Usuário esclareceu que deseja sobreposição, não cartões inteiros em coluna. Desktop agora usa a mesma pilha medida do celular: fresta de 64px por cartão, último à frente, proporção e largura máxima 360px preservadas. Hover/foco eleva e traz o cartão apontado à frente sem alterar a altura do bloco; Novo cartão fica fora da pilha, abaixo dela. Fluxo de caixa continua ao lado. A orientação anterior sobre cartões inteiros em coluna está substituída por esta.

### Hover sem troca de camada — 01/10/2026

Usuário aprovou a escadinha, mas corrigiu que hover deve somente elevar em animação, sem trazer cartão à frente. Removido z-index forçado de hover/foco. Mantidos translateY(-12px), transição de 300ms, sobreposição original e preferência de movimento reduzido. Esta decisão substitui a indicação anterior de trazer à frente no hover.

### Subida perceptível da carteira — 01/10/2026

Usuário repetiu que deseja subida animada no hover. Movimento desktop ampliado de 12px para 40px, com transição de 450ms e retorno suave; 32px de espaço reservado acima da pilha evita atingir o cabeçalho sem deslocar o layout durante hover. Ordem de camadas preservada. Movimento reduzido continua sem animação. Confirmar visualmente no Preview atualizado.

### Animação explícita e conta demo em Preview — 01/10/2026

Removido bloqueio de movimento da carteira para mouse/teclado: usuário insiste que quer subida animada. Transição local tem prioridade sobre regra global que reduz duração; restante do app preservado. Usuário pediu conta demo com dados fictícios: build de Preview da branch codex/continuacao-tino agora cria a demonstração existente (demo@tino.local / demo12345) se ela não existir, usando banco de Preview configurado. Redeploy preserva demo existente; nenhuma ativação automática em Production/outras branches. Dados incluem dois cartões, faturas, lançamentos, parcelas, dívidas, metas e investimentos. Criação efetiva deve ser comprovada pelo log Conta de demonstração criada e login no Preview após deploy; ainda não executada daqui.

Verificação desta rodada: tipos e 614 testes aprovados, incluindo bloqueio de criação automática da demo em Production/outras branches/local. CLI Chromium não completou inicialização neste ambiente; não tratar testes unitários como prova da animação no navegador.

### Primeiro cartão e ordenação por uso — 01/10/2026

Usuário relata que primeiro cartão nunca levanta e pede mais usado primeiro. Elevação agora acionada por eventos reais de mouse/caneta ou foco, sem depender da classificação de ponteiro fino do dispositivo; CSS da classe elevada vence estilo do cartão selecionado. Mouse sair da carteira encerra elevação. Consulta agregada por lar conta DESPESAS dos últimos 90 dias por cartão; maior frequência fica inicialmente aberto na frente, empates preservam ordem de criação. Sem troca de camada no hover. Não confundir frequência de lançamentos com volume financeiro.

### Nota e etiqueta da saúde — 01/10/2026

Aplicada a mudança anteriormente só sugerida: nota em destaque, / 100 menor e neutro e etiqueta discreta de status na mesma linha. Verde para saudável, amarelo para atenção/cuidado, vermelho para crítico; cálculo da nota preservado. Substitui texto de 100 · pede atenção. Usuário cobrou porque sugestão anterior não havia sido implementada.

### Sem etiqueta na nota e movimento do cartão à frente — 01/10/2026

Usuário rejeitou a etiqueta de status: removida, mantendo somente nota / 100. Cartão da frente relatado travado: seleção agora não define transform; mouse/foco aplica deslocamento inline explícito igual a todos, com retorno ao sair. Ordem/critério de maior uso preservados. Não afirmar animação comprovada visualmente até testar Preview atualizado.

### Publicação autorizada — 01/10/2026

Usuário disse pode subir. Integrada origin/main à branch de trabalho, preservando o checkpoint mais recente no único conflito (documentação). Tipos e testes conferidos antes do envio à main. A autorização permite publicação; não comprova o deploy. Configuração das chaves MFA/monitoramento foi guiada somente para Preview nesta conversa: Production e Secrets de backup/monitor GitHub continuam sem comprovação. O build recusa ausência da chave MFA antes de migrations. Não declarar os 20 controles completos nem o site atualizado sem evidência da Vercel.

### Regra final confirmada da carteira — 01/10/2026

Usuário confirmou explicitamente: o cartão da frente fica parado; somente os de trás levantam ao passar o mouse. O mais utilizado começa à frente (frequência de compras em 90 dias, já implementada). Movimento agora exclui o cartão aberto/selecionado. Esta regra substitui os pedidos anteriores de animar todos os cartões.

### Demo com compras no mês atual — 01/10/2026

Usuário pediu preencher todas as áreas fictícias, especialmente Compras recentes e Para onde foi. Seed antigo não tinha despesas no dia 1. Complemento adiciona seis compras categorizadas em centavos, pagas/confirmadas, na competência atual, distribuídas por conta corrente e dois cartões, com competência de fatura própria. Executado tanto em criação quanto no build Preview que preserva demo existente; usa marca por mês e trava transacional para não duplicar, consulta lar vinculado exclusivamente ao e-mail demo. Não apaga testes nem toca contas reais. Demais módulos já têm histórico, parcelas, dívidas, metas, investimentos, orçamento e capturas. Efetivação no banco depende do próximo deploy da prévia.

### Descrição e valor na anotação rápida — 01/10/2026

Corrigida a separação de moeda minúscula (`r$`) e valores com `reais` na entrada digitada ou ditada. A confirmação usa a descrição interpretada e mostra o valor em coluna separada, em vez de repetir a frase bruta como nome. O texto original continua guardado para conferência. Regressões cobrem moeda antes/depois do nome e números que pertencem ao produto, como B12.

### Painel sem vazios entre colunas e retomada dos 20 controles — 01/10/2026

Retirado o encaixe por altura com ResizeObserver. Desktop usa linhas completas alinhadas: carteira/fluxo; compras/conferência/categorias; dívidas em faixa com itens lado a lado; saúde em largura completa. Os cartões mantêm suas proporções e regras de movimento. Conferência visual do deploy ainda necessária. Checklist dos 20 controles atualizado: Preview separado e Ready comprovado pelo usuário; Production, MFA administrativo, secrets dos workflows, backup/monitor reais e recuperação Neon continuam dependendo de acesso externo.

### Notificações delicadas inspiradas no iOS — 01/10/2026

Painel translúcido com desfoque, bordas suaves, tipografia menor, títulos sem corte, ícones finos e ações discretas. Removida a faixa lateral grossa; criticidade continua no ícone e ordenação. Alvos de toque de 44px preservados. Visual ainda precisa de conferência no Preview; ações de leitura, filtro e limpeza preservadas. Retomada dos 20 controles continua pendente da conferência de Production/MFA solicitada ao usuário.

### Dívidas e conferência mais compactas — 01/10/2026

Usuário rejeitou faixa de dívidas espaçosa e conferência esticada. Conferência passa a faixa no topo em desktop, com descrição, valor, categoria e ações em linha; retirada pilha decorativa. Dívidas unem total lateral e itens compactos com bordas finas. Celular mantém empilhamento responsivo. Mesmas operações de confirmação/descarte; categoria ausente oferece link para fila. Conferência visual pendente de deploy.

### Pontos e milhas persistidos por cartão — 01/10/2026

Pedido do usuário: acompanhar saldo e previsões usando regras configuradas. Nova configuração salva no banco por cartão (JSON validado e APIs com sessão/escopo lar): programa, unidade pontos/milhas, taxa por real/dólar, saldo informado e câmbio manual opcional. Saldo real depende de informação do usuário; sem integração com programas. Previsão da fatura desconta créditos; previsão de três meses mostra somente parcelas futuras separadamente, sem somar transações e parcelas duplicadas. Migração aditiva `pontosConfiguracao` não altera lançamentos. Testes cobrem regras, créditos, câmbio e validação. Execução da migração no deploy e visual externo ainda precisam de comprovação.

Validação desta entrega: 618 testes passaram. Cliente Prisma gerado sem engine apenas para checagem de tipos neste ambiente, pois o download de engines em binaries.prisma.sh recebeu HTTP 403. A migração foi escrita, mas não executada em Neon nesta sessão; build da Vercel deve gerar o cliente normal e aplicar a migração com os segredos configurados.

### Tracejado discreto na projeção — 01/10/2026

A pedido do usuário, substituídas as listras diagonais grossas do fluxo no painel por fundo suave e contorno tracejado fino. Legenda acompanha o novo desenho; cores verde/vermelho e cálculos preservados. Conferência visual pendente de Preview.

### Organização dos filtros do extrato — 01/10/2026

Tipo de movimento em controle segmentado próprio; conta, categoria e sem categoria em segunda linha alinhada. Removidos rolagem lateral e quebra aleatória. Alvos de toque 44px, opções selecionadas/removíveis e filtros imediatos preservados. Visual ainda requer conferência no Preview.

### Limite do orçamento em pop-up — 01/10/2026

A etiqueta de limite de categoria e o botão + limite abrem diálogo para editar valor, escolher meses de validade, salvar ou cancelar. Salvamento usa API existente e mantém demais limites; cancelamento não altera rascunho. Validação de valor e erro no diálogo, estados de envio e toque mínimo 44px. Pedido refere-se ao orçamento por categoria, identificado pela imagem, e não ao limite de crédito do cartão.

### Planejamento da reserva refinado — 01/10/2026

Pedido visual: bloco de chegada ao alvo mais moderno. Opções em controle segmentado suave, aporte com campo delicado, slider próprio fino, previsão em linha com acento lateral e ajuda secundária. Escopo CSS restrito ao planejador; cálculos, formas de juntar e gravação de meta preservados. Alvos 44px e layout responsivo. Visual ainda requer conferência no Preview.

### Organização moderna da tela de dívidas — 01/10/2026

Prioridade de pagamento em faixa discreta; dívidas em lista única com separadores finos, metadados agrupados, saldos alinhados e progresso curto. Simulador refinado com slider fino e atalhos de pagamento extra que usam o mesmo cálculo existente. Sem alteração de juros, estratégia ou projeção. Tipos/testes e publicação acompanhados; aparência requer conferência no Preview.

### Mês a mês do plano refinado — 01/10/2026

Roteiro de dívidas com colunas mês/pagamento/dívidas/saldo restante, seleção de ano segmentada e acento fino no mês selecionado. Valores alinhados e sem repetição de rótulos em desktop; celular reorganiza linhas com rótulos locais. Quitações e interação com o mês preservadas, sem mudança nos cálculos. Visual pendente de conferência no Preview.

### Controles de empréstimo modernos e organizados — 01/10/2026

Valor/prazo agrupados; juros/IOF ao lado em desktop; nome e salvamento com área própria. Campo monetário refinado, régua fina, parcelas segmentadas discretas e responsividade. Cálculos de empréstimo, CET e gravação da proposta preservados. Visual requer conferência no Preview.

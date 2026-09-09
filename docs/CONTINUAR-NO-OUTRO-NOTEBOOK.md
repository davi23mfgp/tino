# Continuar o Tino em outro notebook

Atualizado em 09/09/2026. Leia este arquivo antes do histórico em MIGRACAO-CODEX.md, que também documenta o projeto Fixa. Esta rodada alterou somente o Tino.

## Estado e direção aprovada

Repositório: https://github.com/davi23mfgp/tino, branch main. Stack real: Next.js 16, React 18, Tailwind 3, Prisma 5 e PostgreSQL. O pedido antigo de TanStack não representa o código atual; nenhuma migração de framework foi feita.

O usuário autorizou remodelar o sistema com referências Calen e Pierre, mantendo Tino preto/creme/esmeralda e o porquinho. Pediu concluir as telas reais antes de reproduzi-las na landing. A landing agora usa capturas reais da conta local de demonstração, identificadas como ilustrativas, em public/landing. Não são dados de clientes.

Navegação principal: Início, Extrato, adicionar, Cartões e Mais. Recursos avançados continuam disponíveis em Mais; não foram eliminadas APIs ou regras financeiras. Início prioriza saldo, movimentos do mês, contas para acompanhar e categorias em barras legíveis. Isso atualiza deliberadamente o desenho anterior com sobra e donut. Extrato tem paginação, filtros progressivos e atualização após criar ou editar. Menus, notificações e chat usam portais acessíveis com limites de altura e rolagem. Funcionários da loja continuam sem recursos pessoais.

O Screenshots.rar fornecido tinha 11 capturas recortadas de desktop, sobretudo resumos de transações. Não continha uma referência mobile completa. Não presumir que as demais telas avançadas já receberam uma revisão visual individual.

## Como retomar

1. Instalar Git e Node compatível com package.json e clonar o repositório, ou executar git pull --ff-only na cópia existente sem alterações conflitantes.
2. Ler AGENTS.md, este documento e MIGRACAO-CODEX.md. Não copiar a pasta node_modules ou .next de outro computador.
3. Executar npm ci e npx prisma generate.
4. Configurar as variáveis locais conforme o exemplo do repositório e usar um PostgreSQL local. Segredos não são sincronizados pelo GitHub. Não apontar testes ou sementes para produção.
5. Aplicar npx prisma migrate deploy no banco local configurado e iniciar npm run dev. O endereço 127.0.0.1:3000 pertence ao notebook onde o servidor foi iniciado; ele não transfere o servidor de casa.
6. A conta de demonstração local documentada no AGENTS.md depende de o banco ter sido preparado. Não executar seed em banco com dados reais.

## Correção de banco

A migração 20260909123000_completa_loja_fiscal_e_papel registra campos e tipos já exigidos pelo schema: papel FUNCIONARIO_LOJA, campos fiscais de loja/produto e NotaFiscalVenda. Foi gerada por comparação com o banco local e revisada: somente adições, sem reset ou exclusão. Aplicada localmente, resolveu sete erros 500 nas APIs da loja. A aplicação em produção depende do build da Vercel e deve ser confirmada no deployment; não foi testada contra dados de produção nesta etapa.

## Validação realizada

- 298 testes unitários passaram.
- Build Next de produção e TypeScript passaram.
- Teste de fumaça: 63 rotas passaram, incluindo APIs da loja e verificações de acesso.
- Navegador Edge isolado: landing desktop/mobile; painel e extrato em 320, 390, 768 e 1440 px sem overflow horizontal; login local, menus, formulário, cartões e ausência de erros JavaScript.
- Fluxo real local: criar despesa 1.234,56, editar para 44,50, total filtrado, paginação de 27 registros, foco e Escape de diálogos. Registros temporários removidos ao concluir.

Scripts reproduzíveis: scripts/validar-interface.mjs e scripts/validar-fluxos.mjs. Exigem servidor e banco locais preparados, conta demo e Playwright disponível. TINO_PLAYWRIGHT_MODULE aceita caminho absoluto de um módulo Playwright já instalado; sem isso usam import de playwright. TINO_BROWSER_CHANNEL seleciona navegador, por padrão Edge no Windows. TINO_ATUALIZAR_CAPTURAS=1 permite atualizar as imagens públicas; sem essa opção capturas ficam na pasta ignorada .design-reference. Não habilitar atualização usando contas reais.

## Continuidade e limites

A cópia do código no GitHub, as credenciais locais e o histórico desta tarefa são coisas distintas. O arquivo presente permite retomar mesmo sem esta conversa. Não presumir que arquivos locais, sessões de terminal ou segredos aparecerão no outro notebook.

A Vercel já tinha uma versão pública anterior. Confirmar o commit do novo deployment antes de afirmar que esta versão está no ar. Nunca ativar SEMEAR_DEMO em produção para corrigir um build. Usar push normal, sem force-push.

Próximo trabalho de produto: revisar visualmente as telas avançadas por prioridade real, mantendo a navegação simplificada. Não recriar os mockups antigos da landing. Para o Fixa, seguir a seção própria de MIGRACAO-CODEX.md; esta rodada não alterou seu código nem resolveu a divergência de branches documentada lá.

# Tino — instruções para o agente

Este arquivo é lido automaticamente no início de cada sessão do Claude Code.
Leia também `docs/` antes de mexer em qualquer cálculo.

## O que é

App de finanças pessoais para pessoa física (sozinha, casal, família) e MEI.
O dono é **Davi** (`davi23mfgp@gmail.com`), que usa o app para as próprias
contas, e pretende vendê-lo. Referência de código e visual: o ERP Controllares
— confirme a titularidade antes da venda, porque o `globals.css` veio de lá.

O produto se chamava Pierre até 30/08/2026. O nome foi trocado porque coincidia
com o de um app de finanças existente, e marca é o que de fato gera conflito —
cálculo contábil, não. "Tino" saiu de "ter tino para dinheiro", vale em
português e em espanhol e é fácil de falar em inglês. Se encontrar "pierre" ou
"bean" em algum canto, é sobra de renomeação; o que sobra de propósito está
listado em `docs/ESTADO.md`.

O objetivo declarado dele, nas palavras dele: um contador profissional que
ajude a organizar dívidas, juntar para metas, projetar e decidir empréstimo.

## Regras que não se negociam

1. **Dinheiro é sempre `Int` em centavos.** Nunca float. O nome do campo termina
   em `Centavos`. Float acumula erro e o extrato deixa de fechar com o banco.
2. **Taxa é sempre pontos-base (bps) `Int`.** 250 = 2,50% ao mês. O usuário
   digita "2,5" e a borda converte.
3. **Nada de número inventado.** Se falta dado, o app diz que falta e pede
   para cadastrar. Estimativa exibida como fato destrói a confiança na tela
   inteira — foi o defeito mais grave desta base até hoje.
4. **Todo indicador vem com a referência.** Percentual sem faixa não informa:
   22% de comprometimento é bom ou ruim? Só o limite responde.
5. **Nada entra no extrato sem conferência.** Notificação de banco erra (compra
   negada, estorno, pré-autorização de posto). Captura vai para fila.
6. **Comentário explica o porquê, não o quê.** Especialmente onde a escolha
   parece estranha: por que o cheque especial não é dívida separada, por que a
   nota tem teto. Veja os arquivos existentes para o tom.
7. **Português do Brasil em tudo**: código, comentários, commits, interface.
   Nomes de variáveis e funções em português.

8. **Nenhum texto com travessão** (Davi, 29/09/2026). Vale para tela,
   Telegram, e-mail, termos e respostas do assistente: use vírgula,
   dois-pontos, parênteses ou ponto. O teste `testes/sem-travessao.test.ts`
   varre as strings de `src/` e falha se aparecer um, e `semTravessao` limpa
   a resposta do modelo. Vale também para commits e mensagens ao Davi.

## Antes de mexer em cálculo

```bash
npm test          # 585 testes, cerca de oito segundos; a CI roda os mesmos a cada push
```

Se mudar regra de cálculo, o teste correspondente tem de mudar junto — e
**verifique que o teste falha quando você reverte a correção**. Um teste desta
suíte já passou com o código quebrado; foi reescrito só depois de provar que
pegava a regressão.

## Ambiente

```bash
npm run db:start   # Postgres portátil, não é serviço: não sobe sozinho
npm run dev
```

Detalhes em `docs/AMBIENTE.md`. O `.env` não está no repositório.

## Como o Davi trabalha

- Quer ver o defeito nomeado, não escondido. Reporte o que quebrou e o que
  ficou faltando, sem enfeitar.
- Prefere que você teste de verdade (curl, navegador) em vez de afirmar que
  funciona.
- Escreve mensagens curtas e com pressa; leia a intenção, não a ortografia.
- Já disse (registro antigo): **não vai usar Open Finance**. O código fica,
  mas fora do menu. **Superado em 07/09/2026**: pediu Open Finance de
  verdade ("control c control v, do nosso jeito") — ver
  `docs/SPEC-CALEN-PRECISO.md` PARTE 5 e `docs/PESQUISA-OPEN-FINANCE.md`.
  Linha antiga mantida aqui por registro, não por valer ainda.
  **Decisão atual (28/09/2026): sem Open Finance** ("não vamos ter open
  finance, então tire essa parte"). A tela Entrada automática saiu do menu
  e dos ajustes, e `/conectar` leva para Anotar. O código do provedor
  (`src/lib/open-finance/`, `src/app/api/open-finance/`) fica desligado no
  repositório. Não ofereça conexão com banco em tela nenhuma.
- **Conta de admin: `admin.tino@gmail.com`** (29/09/2026). Criada ou promovida
  no build por `scripts/garantir-admin.mjs`, com `ADMIN_EMAIL` e `ADMIN_SENHA`
  na Vercel. A senha que o Davi mandou no chat **nunca** vai para o
  repositório, nem em teste, nem em comentário.
- **Sem WhatsApp** (29/09/2026: "não temos wpp por enquanto, então pode
  tirar. Deixe só telegram"). A rota `/api/whatsapp` saiu, Anotar mostra só
  Telegram, e a política de privacidade não cita mais a Meta. A biblioteca
  `src/lib/captura/whatsapp.ts` fica no repositório, desligada, como o Open
  Finance. O botão "Abrir no WhatsApp" do Fiado continua: é o WhatsApp do
  próprio dono, um link `wa.me`, não integração do Tino.
- Já disse (registro antigo): por enquanto, esqueça Telegram, PDF de fatura
  e integração com modelo de linguagem. **Também superado**: as três coisas
  foram pedidas e construídas depois (Telegram e assistente Tino, ver
  README; PDF de fatura em `/importar`).

## Visão de produto (Davi, 05/10/2026)

O Tino tem de ser uma plataforma competitiva e escalável onde **vários tipos
de negócio** administram o grosso da operação **sem sair do app**, sobre a
**mesma base** (cliente, catálogo, venda, orçamento, OS, agenda, financeiro).
A mesma pessoa pode ter **vários negócios** ao mesmo tempo. Tem de servir a
**várias idades** (leitura, toque e linguagem simples). E a decisão de
**marca própria ou marca branca** (white label) precisa estar coberta. Toda
tela nova é julgada por isso: serve a mais de um segmento? funciona com mais
de um negócio na conta? uma pessoa de 65 anos usa sem ajuda?

O Tino também é **assessor**, não só registro: a pessoa diz "tenho um
horário amanhã às 15h com a Ana, agenda pra mim" e o app marca na agenda
dele e na **Agenda do Google** da pessoa. E é **ajuda tributária**: DAS,
limite do MEI, nota de serviço, desenquadramento, explicado com a fonte e a
data da regra. O assessor propõe e a pessoa confirma num toque (regra 5:
nada entra sem conferência). Quando a dúvida passa do que a regra escrita
responde, ele diz que é caso de contador, em vez de chutar.

Mais três pedidos do mesmo dia:
- **Maquininha integrada:** muito comerciante vende na maquininha, e o Tino
  tem de ler as vendas e os repasses das principais por API, conciliando com
  o Balcão. O registro manual (taxa e prazo) continua para quem não conectar.
- **Guia do negócio, educativo:** quando o negócio está fraco ou desandando,
  o Tino mostra o que falta, em passos ("já cadastrou o custo? não: faça
  isso"; "já cobra quem sumiu? não: tente aquilo"), cada passo com o porquê.
- **Análise de clientes:** quem compra mais, quem sumiu, quem só compra no
  fiado. Pode ser análise complexa por baixo, mas **toda tela fala em
  linguagem objetiva, simples e intuitiva**, para qualquer idade e qualquer
  tipo de negócio.

**Tino por área (Davi, 06/10/2026).** O Tino é um só, geral, com o básico
de organização para todos. No cadastro a pessoa escolhe a **área** e a
**subárea** (assistência técnica: celular, informática...; beleza:
cabeleireiro, manicure...) e o app já vem personalizado para ela. A área é
configuração sobre a mesma base (nomes, menu, campos, serviços de partida
sem preço, checklists, mensagens, Guia do negócio), nunca um app separado,
e o cálculo de DAS, limite e dinheiro é o mesmo para todas. Começa pelos
10 segmentos do plano estratégico (doc "Tino · Plano estratégico",
https://claude.ai/code/artifact/0b555476-3cc6-436a-89dd-8980d12ab07d):
leve para os 10, funda um de cada vez, Assistência técnica primeiro. A
tela de escolha da área passa pelo canvas.

**Recomendações aceitas (Davi, 06/10/2026: "vamos seguir as recomendações
que você fez").** Nome "Tino" mais a área (Tino Assistência, Tino Beleza),
com a área incluída no plano Meu negócio; cobrança desde o início; marca do
escritório só na Fase 5. A lista completa está em `docs/PLANO-FASES.md`.

## Fases e estudo de mercado (Davi, 06/10/2026)

- **Tudo em fases, com acompanhamento.** `docs/PLANO-FASES.md` é o painel:
  cada item com situação, estudo e próximo passo, mais o que precisa
  melhorar e um registro por data. Atualize no mesmo commit de cada entrega,
  e diga ao Davi o que foi feito, o que não foi e o que vem a seguir.
- **Nada por fazer.** Toda recomendação (função, tela, área, preço, canal,
  integração, nome) passa antes pela skill `estudo-de-mercado`, com casos do
  Brasil e de fora, fonte, data e força da evidência, registrada em
  `docs/pesquisas/`. As três opções de cada canvas dizem em quem se
  inspiraram.
- **Depois das fases de produto** vêm a fase só de visual (Fase 6) e a
  revisão geral (Fase 7): mercado de novo, produto tela por tela e o Tino
  pessoal, para lançar os dois produtos juntos. A venda assistida da Fase 1
  continua no começo; lançamento público só depois da Fase 7.

## Autonomia e trabalho visual (pedido em 2026-09-04)

- Trabalhar de forma autônoma: usar as skills disponíveis para decidir a
  abordagem sem parar para perguntar o óbvio, e trocar de modelo (ex.: um
  modelo mais forte para desenho de arquitetura/decisão complexa, o padrão
  da sessão para execução mecânica) quando a tarefa pedir.
- Parte visual: usar os componentes de shadcn/ui
  (https://ui.shadcn.com/docs/components) como base, a skill `frontend-design`
  para direção visual, e `find-skills` quando faltar skill para o caso.
- Registrar aqui qualquer instrução nova de escopo permanente, para não
  precisar repetir a cada sessão.

## Redesenho de telas (pedido em 2026-09-24/25)

- Cada tela passa pelo canvas do Claude Design antes do código: "hoje" e
  três opções; o Davi escolhe, a escolha é implementada, testada no
  navegador e enviada com capturas.
- **Toda opção vem em dois modos: celular (390px) e computador (1280px).**
  O Davi notou que várias telas desenhadas só para o celular ficaram
  estranhas no computador. Testar e mandar captura dos dois, e do tema
  claro no celular.
- Vidro líquido e gradiente continuam em todos os temas.
- **Mudança de desenho só depois do canvas** (29/09/2026: "nas coisas que
  pedir pra mexer que é design não mexa sem antes ver no Claude Design").
  Mesmo quando o Davi descreve o jeito exato, a mudança visual vai primeiro
  para o canvas; código só depois da escolha. Correção de defeito,
  velocidade e texto podem ir direto.
- **O que abre por cima é sólido** (28/09/2026: "toda parte de menu tá
  basicamente transparente, tem que ser bem visível"). Menu, gaveta, diálogo,
  lista de opções, dica e aviso usam a classe `superficie-flutuante`
  (`liquid-glass.css`), nunca `--papel-solido` ou vidro translúcido. O vidro
  fica no que está na própria página.
- **Cada passo numa página própria do canvas** (28/09/2026: o Davi não
  achava o passo 22 — com 274 quadros numa página só, os novos ficavam a
  95 mil px do topo). O passo novo ganha uma entrada em `pages`, seus
  quadros começam em y = 0 com `"page"` próprio, e `launch.page` aponta para
  ele, para o canvas abrir direto no que está em escolha.
- **O canvas só carrega os primeiros 199 arquivos**, em ordem alfabética; o
  resto não aparece, sem aviso. O primeiro canvas ("Tino — telas passo a
  passo", Nh6zs8PsNNNF51HqZq2ycD) passou disso e guarda os passos 1 a 17.
  Do 18 em diante: "Tino — telas, parte 2"
  (https://claude.ai/artifact/PbXK5P5Xez3Y15hUF8LKGK), passos 18 a 29. Do 30
  em diante: "Tino · telas, parte 3"
  (https://claude.ai/artifact/RKncch3jJ637GJaPyeQPUi). Chegando perto de 190
  arquivos, abrir uma parte 4.
- **Estilo das telas da loja** (29/09/2026, "pode deixar estilo última
  tela"): quadros finos como Finanças da loja (H2) e MEI (N1) — número
  grande em peso leve com os centavos menores, rótulo curto, a referência
  embaixo, cor só no que pede ação. Balcão, Prateleira e Fiado já seguem.
- **Aprovou, sobe** (pedido em 2026-09-26): tela aprovada vai na hora para a
  branch da sessão e o trabalho segue para a próxima tela sem perguntar. O
  Davi quer também no Vercel, que publica o `main`; a sessão remota não tem
  permissão de enviar ao `main`, então isso fica com ele (juntar a branch
  no `main`) até ele liberar a permissão. Em 29/09/2026 ele autorizou juntar
  o PR #2 pelo GitHub ("pode colocar no main"); para cada junção nova,
  confirme de novo.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

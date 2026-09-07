# Redesign do Tino — estado em 05/09/2026, noite

Ponto de retomada. Quem abrir isto numa sessão nova consegue continuar sem
perguntar nada ao Davi.

## A referência é o protótipo do próprio Davi

**https://zenith-financial-art.lovable.app** — Tino feito por ele no Lovable.
Mesma navegação, mesmos cartões, mesmo nome. É produto dele, então copiar é
livre.

O pedido, nas palavras dele: **"quero exatamente igual, só mude que coloque
estilo apple"**, e depois **"lembre que quero idêntico ao que o Lovable fez"**.

O código das telas está em `routes/` no editor do Lovable (`analise.tsx`,
`cartoes.tsx`, `dividas.tsx`, `index.tsx`, `longo-prazo.tsx`, `metas.tsx`,
`orcamento.tsx`, `prompt.tsx`, `transacoes.tsx`). O projeto no Lovable chama
**Wealth Compass**.

**Cuidado ao consultar o protótipo:** os números dele são de exemplo
(R$ 12.480,00 de saldo, R$ 9.850,00 de entrada). Só o LAYOUT é referência —
os valores do app vêm do panorama real do lar. Nenhum número do protótipo
entrou no código, e nenhum deve entrar.

**Rota direta no protótipo dá erro** (`/transacoes` retorna tela de falha). É
SPA: abra a raiz e navegue clicando no menu.

## Paleta, medida com pipeta no protótipo

| Token | Hex | Onde |
|---|---|---|
| `acao` | `#297cef` | botão, link, barra de progresso, rótulo do recado |
| `positivo` | `#20b46b` | entrou, sobra, saldo bom |
| `negativo` | `#e23242` | saiu, buraco |
| `atencao` | `#f4a437` | parcelamento, perto do limite |
| fundo | `#f5f7f9` | |
| texto | `#0f141d` | |

**Mudança de significado que veio junto:** o azul agora é a AÇÃO, não a
sobra. O trocadilho de "estar no azul", que era a origem da paleta antiga,
morreu. Quem tem sobra vê verde.

Tema claro é o padrão. O escuro é contraparte derivada: mesmo matiz,
luminosidade invertida, preto nunca absoluto.

## A ida e volta que não deve se repetir

O visual mudou de direção três vezes em um dia. Registrado para ninguém
"consertar" achando que foi descuido:

1. **Linguagem iOS** (`1dea3a6`, dia 04) — Onest, azul de sistema.
2. **Escala de cinza pura** (`5031e0e`, `160d96f`) — veio dos prompts
   `BRIEF-VIDRO-FLUTUANTE.md` e `BRIEF-CATEGORIAS-NAO-APLICADO.md`, que
   exigem chroma 0. Durou cerca de vinte minutos.
3. **Volta da cor** — o protótipo é colorido, e ele mandou seguir o
   protótipo.

Junto com o cinza saíram também: vidro (`blur(28px)`), halos radiais no
fundo, e coluna/topbar/barra do polegar flutuando. O protótipo não tem nada
disso. **Não reintroduzir sem ele pedir.**

O acabamento Apple que ele quer por cima vive na tipografia, no espaço e na
sombra curta — não em efeito de superfície.

## Tipografia

Fonte do sistema (`--font-ios`). Onest e IBM Plex Mono saíram do `next/font`.
O algarismo tabular, que era o motivo funcional da mono, continua vindo de
`font-variant-numeric` no `body`.

## Mascote

`public/tino-mascote.png` — 816×816, 604 KB, copiado do protótipo. Servido
por `next/image`; nunca por `<img>`, senão vai meio mega para o celular.

**Ele perdeu a expressão.** O `tino-mascote.tsx` em SVG ainda existe, com os
seis estados, mas o painel não usa mais. O documento de identidade tratava a
expressão como regra ("vem do motor de alertas, nunca de decoração") para
evitar bonequinho sorrindo com o mês quebrado.

O que segura a regra no lugar dela: **o rótulo acima do título muda com a
severidade** — "Precisa de decisão" em vermelho, "Vale olhar" em âmbar,
"Recado do Tino" em azul. É ele, não a cara do robô, que diz se a pessoa
precisa parar agora. Se alguém remover esse rótulo, a regra cai junto.

## Feito

- tokens, tema claro padrão, fonte de sistema
- primitivos: `Cartao`, `Rotulo`, `Valor`, `Metrica`, `Pilula`, `Barra`,
  `BarrasCategorias`, `Vazio`, `Aviso`
- barra do topo com linha de resumo (derivada dos alertas reais, e só depois
  que eles carregam — antes diria "contas em ordem" sem ter conferido nada)
- cartão do recado com o robô e botão em pílula
- Visão geral: barras de categoria e passos numerados

## Falta

- avatar "D Davi" no canto superior direito
- propagar o padrão para as outras ~20 telas: Transações, Cartões, Análise,
  Orçamento, Dívidas, Metas, Longo prazo, Parcelamentos, Projeção,
  Simulador, Empréstimo, Contas fixas, Regras, Importar, Assinatura, Loja,
  Capturas, Configurações
- tabela no padrão do brief: cabeçalho fixo, linha de 52px, valor à direita,
  categoria como pílula, realce só no passar do mouse
- decidir o que fazer com `tino-mascote.tsx`, que virou código morto no
  painel mas ainda é usado em outros lugares — conferir antes de apagar

## Conflito novo, registrado em 07/09/2026 — NÃO resolvido sozinho

Davi mandou um documento de especificação novo ("TINO — REDESENHO DE
EXPERIÊNCIA E VISUAL", com prompt pronto pra colar) comparando o Tino ao
app **Pierre** e pedindo: navegação de 18 itens pra 6 abas + trilho de 4
ícones (isso eu apliquei, ver abaixo), tela "Hoje" nova, edição no lugar,
sistema de vigias — e também **"casca 100% neutra em preto/branco/cinza;
cor só nos dados. Nenhum botão, ícone de navegação, cabeçalho ou moldura
usa cor."**

Esse último ponto reabre exatamente a pergunta que este arquivo pede pra
não reabrir: `acao` hoje é o azul `#297cef` pipetado do protótipo Lovable
dele, aplicado em botão/link/item ativo do menu — terceira reversão
sobre a mesma pergunta em três dias seria o padrão de thrashing que a
seção acima registra como erro, não decisão.

**O que fiz:** apliquei tudo do pedido novo que não depende disso —
navegação (trilho + 6 abas), tela Hoje, vigias, interação — mantendo
`acao` = azul como está hoje. **O que não fiz:** não neutralizei botão/
nav/cabeçalho. Fica esperando confirmação: ele quer mesmo desfazer o
azul de ação que pediu "exatamente igual" ao protótipo há 2 dias, ou o
pedido de hoje era só sobre estrutura de navegação e ele não tinha essa
peça em mente ao escrever "nenhum botão colorido"?

## Redesign de experiência de 07/09/2026 — etapas 2/3/5 feitas

Branch `redesign/experiencia-visual` (a partir de `test/escrita-da-api`,
que tinha 107 arquivos de trabalho não mesclados em `main` — o redesign
constrói em cima disso, não de `main`).

- **Etapa 2 (navegação)**, commit `efa9f8a`: 18 itens em 3 grupos viraram
  trilho de 4 ícones (Hoje/Buscar/Configurações/Perfil) + 6 abas em
  pílula (Hoje/Movimento/Planejar/Dívidas/Futuro/Parecer), sub-abas
  quando o grupo tem mais de uma tela. `lib/navegacao-grupos.ts` é a
  única fonte. Regras e Assinatura viraram cards em Configurações.
  Loja ficou como 7ª aba só pra MEI (fora do brief, mas real).
- **Etapa 3 (tela Hoje)**, commit `4dbd388`: as 5 coisas do brief no
  topo de `/painel`, nessa ordem (frase grande, ação recomendada,
  anotar em uma linha, fila esperando, três números). O conteúdo antigo
  (gráficos, mapa de calor, evolução) continua embaixo, intocado — não
  coube mover pra outra página com segurança nesta sessão.
  `lib/tino/plano-do-lar.ts` extrai lógica que estava duplicada entre
  `/plano` e a Hoje nova.
- **Etapa 5 (vigias)**, commit `ba976ed`: o motor de alertas que já
  existia (`lib/tino/alertas.ts`) ganhou liga/desliga por tipo
  (`VigiaConfig`, migration local) e tela em Configurações. Dois vigias
  novos: fatura acima do limite, vencimento próximo. Não duplicou nada.

**Etapa 4 (interação), feita só em parte**, commit `e9a2bb3`:
- "Resultado imediato" (`router.refresh()` depois de anotar, na Hoje) —
  entrou junto da etapa 3.
- "Desfazer em vez de confirmar" — `showToast()` ganhou `action`/
  `duration`; achado no caminho que `<Toaster/>` nunca tinha sido montado
  em lugar nenhum do app (bug preexistente, não desta sessão), corrigido
  em `(app)/layout.tsx`. Aplicado num caso concreto (remover conta fixa
  em `/recorrencias`): a linha some na hora, toast com Desfazer por 5s,
  o DELETE de verdade só sai depois disso.

NÃO entraram: edição no lugar, estender linguagem natural pra
dívidas/metas, e o padrão Desfazer nas outras 5 telas com exclusão
(assinatura, capturas, configurações, loja/contas, regras). São mudanças
que tocam quase toda tela do app, e fazer isso sem QA visual nesta
máquina (extensão Chrome não conecta aqui) é risco real de quebrar
layout sem ninguém perceber até abrir de verdade. Um caso bem verificado
valeu mais que cinco mal verificados. Fica registrado como próximo
passo, não escondido como feito.

**Etapa 1 (casca neutra), NÃO feita — de propósito, ver acima.** O
resto dos tokens (raio, tipografia, cards em 3 pesos) já batia com o que
a base tinha; só a cor de botão/nav ficou de fora, esperando confirmação.

**Verificado, não simulado:** cada etapa rodou contra o Postgres local
de verdade (login com `demo@tino.local`, curl com sessão real), tsc
limpo, 254 testes da suíte (que já existia) continuam verdes. Nenhum
teste novo pra `lib/tino/alertas.ts` — módulo sem cobertura desde antes
desta sessão, `Panorama` é tipo grande demais pra montar fixture no
tempo que sobrava; registrado, não escondido.

## Sessão autônoma de 07/09/2026, manhã — itens 1/2/3 da etapa 4

Davi mandou trabalhar sozinho ("termine tudo, testar tudo") nos itens que
não dependiam da decisão de cor (bloqueio continua registrado acima, não
mexido). Os três itens abaixo estavam listados como "NÃO entraram" na
etapa 4; agora entraram.

**Item 2 — "Desfazer" nas outras 4 telas com exclusão**, commit
`41801ef`. Mesmo padrão de `/recorrencias` (linha some na hora, toast
com Desfazer por 5s, DELETE de verdade só sai depois) aplicado em:
`/regras` (remover regra), `/capturas` (revogar chave), `/configuracoes`
(revogar conexão Open Finance), `/loja/contas` (apagar conta). Conferi
cada rota de DELETE antes de aplicar — `regras` revoga chave e conexão
Open Finance fazem soft-update (`ativa:false` / `status:"REVOGADA"`),
`regras` e `loja/contas` fazem hard delete sem cascata perigosa.

**Ficou de fora, de propósito: `/assinatura`.** O botão "cancelar" ali
chama o gateway de pagamento de verdade (Stripe usa
`cancel_at_period_end`, reversível em tese; Mercado Pago manda
`status: "cancelled"` direto na API do preapproval, e isso não é
reversível pela API deles). Um "Desfazer" de fachada — esconder a linha
e só chamar o DELETE depois de 5s — seria enganoso especificamente aqui:
se a aba fechar antes dos 5s, a pessoa nunca vê o cancelamento
acontecer, mas ele não é desfeito automaticamente (ao contrário de
recorrencia/regra apagada, onde "não rodou o DELETE" é seguro, aqui
"rodou escondido" ou "não rodou e a pessoa achou que cancelou" são os
dois jeitos de errar). Fazer isso direito pediria um endpoint de
reativação que não existe hoje (e que talvez nem exista no Mercado
Pago). Não decidido sozinho — fica para o Davi dizer se quer que a
gente construa a reativação ou se o cancelamento continua imediato e
sem Desfazer, só com um clique a menos de proteção que os outros.

**Item 1 — edição no lugar em `/transacoes`**, commit `b1d35db`.
Descrição e valor viram campo com um clique (Enter salva, Esc cancela),
mesmo princípio que a categoria já tinha ali (select embutido na linha).
Componentes novos e reutilizáveis: `components/ui/editavel.tsx`
(`EditavelTexto`, `EditavelMoeda`). A API já aceitava os dois campos no
PATCH; só faltava a tela usar. Resultado imediato com reversão em caso
de erro de rede (mesmo princípio da etapa 3). Valor de transferência
não é editável — as duas pernas têm que continuar batendo, e o PATCH
mexe só num lado.

Não propagado para outras telas com lista (Dívidas, Recorrências,
Regras, etc.) nesta sessão — o pedido original não detalhava onde
"edição no lugar" deveria valer além de existir, e Transações é a tela
de maior volume e a única que já tinha precedente de campo inline.
Propagar para as outras é trabalho de escopo separado, não escondido
como feito.

**Item 3 — linguagem natural em `/dividas` e `/metas`**, commit
`f36910e`. `lib/tino/lingua-natural.ts` (`lerDivida`, `lerMeta`) segue a
mesma ideia do leitor de capturas (`lerTextoLivre` em
`lib/captura/notificacao.ts`): a pessoa escreve como falaria e o Tino
tenta preencher os campos. Diferente das capturas, NÃO cadastra
sozinho — só preenche o formulário estruturado que já existia (dívidas)
ou que ganhou UI agora (metas); a pessoa confere e completa antes de
salvar. Uma dívida ou meta errada no plano custa mais caro que uma
categoria errada numa compra de R$ 12.

Achado no caminho, não pedido mas necessário para o item fazer sentido:
**`/metas` não tinha NENHUMA forma de criar meta pela interface.**
Só existia via a conversa inicial (`lib/semear.ts`) e a rota
`POST /api/metas`, que nenhuma tela chamava — o próprio chat do Tino
(`lib/tino/chat.ts:259`) já dizia "crie uma em Metas" para quem
perguntava de aposentadoria, prometendo uma tela que não cumpria.
Criado `components/nova-meta.tsx` (client, embutido na página server
component) para fechar isso, com o mesmo padrão de linguagem natural.
Edição e exclusão de meta pela tela continuam sem UI (as rotas PATCH/
DELETE já existem em `/api/metas/[id]`, só não têm botão) — fora do
escopo pedido desta sessão, registrado como lacuna conhecida.

11 testes novos em `testes/lingua-natural.test.ts`.

**Verificado, não simulado, nos três itens:** Postgres local de
verdade, login com `demo@tino.local`. Editei e revertei uma transação
real via PATCH; criei e apaguei registro de teste em `/api/regras`,
`/api/loja/contas`, `/api/metas`, conferindo a meta aparecendo em
`GET /metas` antes de apagar. `tsc --noEmit` limpo, `npx next build`
sem erro, `npm test` 265/265 (11 novos, 254 já existiam), `npm run
test:fumaca` 63/63 rotas de pé contra o servidor real. Sem navegador
nesta máquina (extensão Chrome não conecta): a leitura de HTML puro por
curl não mostra conteúdo de telas client-side pós-hidratação (ex.:
`/transacoes` aparece "Carregando…" no HTML cru) — coberto em vez
disso confirmando o build, o tsc, e o PATCH/DELETE reais batendo
exatamente com o formato que cada componente novo envia.

## Pendências que dependem do Davi

- **Cancelamento de assinatura sem "Desfazer"**: ver seção acima
  (07/09/2026, manhã). Decidir se vale construir reativação para aplicar
  o mesmo padrão das outras telas, ou se o cancelamento continua
  imediato como está.
- **`BRIEF-CATEGORIAS-NAO-APLICADO.md`**: prompt de outro produto (catálogo
  de automação: Control4, Hikvision, Home Cinema). Ele pediu para guardar e
  confirmar depois se vale para a Prateleira do MEI.
- Os skills instalados criaram symlinks de caminho absoluto em
  `.claude/skills/`, que quebram em outra máquina. Não commitados, esperando
  decisão dele.

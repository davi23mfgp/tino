# Redesign do Tino — estado em 05/09/2026, noite

Ponto de retomada. Quem abrir isto numa sessão nova consegue continuar sem
perguntar nada ao Davi.

## Redesign "direção Calen" — Etapa 2: visual (07/09/2026, noite)

Continuação da Etapa 1 (navegação, seção acima). Davi corrigiu o pedido de
cor duas vezes ao longo desta etapa — registrado na ordem real, pra quem
ler depois não achar que foi indecisão da IA:

1. Primeiro pedido: acento roxo/violeta, igual ao Calen de verdade.
2. Correção: **"acento é VERDE, não roxo/violeta"** — a única diferença
   deliberada da referência (o Calen real é roxo; o Tino usa verde no
   lugar). Pedido explícito: diferenciar do verde de "receita" pra não
   ficar ambíguo.

**Decisão de cor final** (contraste calculado — método OKLab→sRGB
linear→WCAG de sempre, script descartável, valores na tabela abaixo):

- **`acao`** (ação/link/botão primário/nav ativo): TEAL, hue 170 — visual
  e semanticamente diferente do `positivo` (verde-grama, hue 145), pra
  "isto é uma ação" nunca ser confundido com "isto é receita/saldo bom"
  quando os dois aparecem perto (ex.: botão "Resolver agora" dentro de um
  cartão de saldo positivo).
- **`positivo`/`negativo`/`dado`** (número com sinal E gráfico — a MESMA
  regra vale pros dois, porque `graficos.tsx` já lia esses tokens em
  runtime antes desta rodada): verde/vermelho/azul de verdade.
- **`atencao`/`alerta`/`destaque`** CONTINUAM chroma zero — são pastilha
  de status NÃO-numérico (categoria fora do padrão, aviso genérico), o
  que ficou de fora do pedido "números e gráficos" mesmo depois da
  escalada pro Calen completo.
- Botão primário (`--primary`, shadcn), anel de foco (`--ring`), item
  ativo da navegação (`--accent-foreground`) e botão destrutivo
  (`--destructive`) passaram a usar esses tokens — antes eram
  preto/branco puro ("botão estilo iOS"), decisão de sessão anterior que
  a direção Calen substitui de propósito (o próprio pedido dizia "isso
  substitui a ressalva 'não é reskin de cor'").

| Token | Hex (escuro) | Hex (claro) | Contraste (bg/card, escuro) |
|---|---|---|---|
| `acao` (teal) | `#00ab81` | `#006d48` | 7,06:1 / 6,30:1 |
| `acao-solido` (fundo de botão) | `#006743` | igual (não inverte) | branco em cima: 6,91:1 |
| `positivo` (verde) | `#3ba946` | `#006b00` | 6,84:1 / 6,10:1 |
| `negativo` (vermelho) | `#e85854` | `#c53637` | 5,88:1 / 5,25:1 |
| `dado` (azul) | `#009ed8` | `#0072aa` | 6,76:1 / 6,03:1 |

**Tema ESCURO por padrão** — segunda parte do pedido Calen. Antes desta
rodada `:root` era claro e `.dark` era o opcional; virou o oposto:
`:root` agora carrega os valores que eram do `.dark` (mesma geometria,
opacidade e sombra já calibradas — não foram remedidas do zero, só
herdadas), e o CLARO virou `.light`, a classe que o alternador liga.
`theme-provider.tsx`/`layout.tsx` (`defaultTheme`) e o `body`/halo de
fundo trocaram junto — conferido que não sobrou nenhum seletor `.dark`
solto no CSS (`grep` limpo).

**Cantos mais generosos**: `--raio-cartao` 18px→20px (24px→28px somado em
`.ios-card`) — "cards com cantos bem generosos" do pedido. Não trocou a
fonte (`--font-ios`, pilha do sistema): a base já tinha revertido de uma
fonte custom pra fonte de sistema numa sessão anterior por peso/
performance, e reintroduzir uma fonte "arredondada" estilo Calen seria
desfazer essa decisão de novo sem pedido explícito — registrado como gap
consciente, não escondido.

**Gráficos**: `graficos.tsx` já lia `--lch-acao/positivo/negativo/dado/
atencao/alerta/destaque` em runtime (`getComputedStyle`) desde antes —
não precisou mudar UMA linha desse arquivo pros gráficos saírem
coloridos, só os tokens em `globals.css`. `--chart-1/2/3` (shadcn,
tecnicamente não lidos por `graficos.tsx`, mas mantidos consistentes)
também ganharam acao/positivo/negativo; `--chart-4/5` continuam cinza —
"2-3 tons no máximo, nunca uma cor por item".

**Verificado ao vivo no Chrome** (tema padrão limpo, sem `localStorage`):
saldo/sobra positivos em verde com seta, saída/negativo em vermelho,
botões primários ("Ver plano de pagamento", "Resolver agora") em teal,
nav ativa em teal, "RISCOS"/"PONTOS FORTES" em vermelho/verde em
`/analise`, barra de categoria em teal, mapa de calor com pico em
vermelho — tudo consistente nos dois temas. `tsc`/`next build`/
`npm test` (265)/`test:fumaca` (63) limpos depois da troca.

### MEI está no mesmo redesign, não à parte

Loja/Estoque/Fiado/Contas a pagar/MEI e DAS usam os MESMOS componentes
compartilhados (`Cartao`, `Metrica`, `Valor`, botões, badges) que o resto
do app — a troca de tokens em `globals.css` cascateia pra lá sozinha, sem
precisar tocar em nenhuma tela de loja/MEI. Estrutural: `GRUPO_LOJA` já
está dentro do menu "Mais" (nível 2) desde a Etapa 1, igual documentado
lá. Não foi tratado como trilha separada nem deixado pra depois.

### Falta desta etapa (registrado, não escondido)

- **Mobile ~390px, testado de verdade**: em andamento nesta mesma sessão,
  ver próxima seção.
- **FAB "+" de adicionar transação**: em andamento nesta mesma sessão.
- **Fonte "grande e arredondada" literal do Calen**: não entrou (ver
  acima — decisão consciente, não gap escondido).
- **Push/e-mail de verdade, revisão de copy tela a tela, "um conceito por
  card" em `/regras`/`/configuracoes`**: continuam de fora, mesmo motivo
  da Etapa 1 (escopo de infraestrutura/redesenho de tela por tela, não
  CSS).

## Redesign "direção Calen" (07/09/2026, noite) — EM ANDAMENTO

Davi confirmou querer o Tino "o mais parecido possível" com o app
concorrente **Calen** (36 screenshots de referência analisadas), depois de
dizer "ainda muito carregado... quero que a pessoa tenha o mínimo de
esforço possível". Prompt completo em `docs/PROMPT-REDESIGN-CALEN.md`.
Prioridade 1 do próprio Davi: reestruturar a NAVEGAÇÃO primeiro (resolve
"difícil de navegar"), visual por cima depois. Trabalho em fatias, cada
uma commitada e verificada — clonar um produto concorrente inteiro não
cabe numa passada só, registrado sem esconder o que ainda falta no fim
desta seção.

### Etapa 1 — navegação em duas camadas (`lib/navegacao-grupos.ts`, `navegacao.tsx`, `buscar-paginas.tsx`)

**Antes:** trilho de 4 ícones fixos + seis abas em pílula
(Hoje/Movimento/Planejar/Dívidas/Futuro/Parecer) sempre visíveis no topo —
essa era, inclusive, a pílula que Davi já tinha pedido pra mover pro
sidebar antes do pedido "Calen" chegar; a reestruturação abaixo absorve
esse pedido junto, como o próprio Davi min pediu ("decidir junto, não em
separado, pra não fazer duas passadas na mesma navegação").

**Agora**, igual à estrutura do Calen (Início/Calendário/Contas/Perfil +
hambúrguer agrupado por intenção):

- **`NUCLEO`** (nível 1, sempre visível — trilho no desktop, barra do
  polegar no celular): **Início** (`/painel`), **Movimento**
  (`/transacoes`, com Anotar/`capturas` e Importar como irmãos via
  `<SubAbas>`), **Cartões** (`/cartoes`), **Perfil** (`/configuracoes`).
  Decidido a partir do que já existia em `lib/navegacao-grupos.ts` — nenhum
  desses é rota nova.
- **`GRUPOS_NAV`** (nível 2, atrás do botão **"Mais"**, um clique a mais):
  **Planejar** (Orçamento/Contas fixas/Parcelamentos/Metas), **Dívidas**
  (Dívidas/Plano de pagamento/Empréstimo), **Analisar**
  (Análise/Projeção/Simulador/Longo prazo), **Ajustes** (Configurações —
  Regras/Assinatura já viraram cards dentro de Configurações numa sessão
  anterior, não precisam de entrada própria aqui). **Loja** entra como
  quinta seção só pra quem é MEI, igual antes.
- `todosOsGrupos(mei)` = núcleo + nível 2, usado por `<SubAbas>` (agora
  procura irmãos em QUALQUER grupo, não só nível 2 — Movimento também tem
  irmãos) e pela busca de telas (Ctrl+K), que agora cobre 100% das rotas
  de novo.

**Onde cada camada mora:**
- Desktop (trilho, `TrilhoLateral`): logo, Início/Movimento/Cartões
  (ícone), Buscar, depois **"Mais"** (abre painel com os grupos do nível
  2 — mesmo mecanismo de `createPortal` do painel de notificações, ver
  seção anterior: o trilho é `.ios-card`/`overflow:hidden`, um painel
  `position:absolute` mais alto que ele seria cortado do mesmo jeito),
  Perfil (dropdown com Configurações + Sair, como já era).
- Celular (barra do polegar): os 4 núcleos + **"Mais"** (abre a `Gaveta`,
  que agora mostra SÓ o nível 2 — o núcleo já está sempre visível embaixo,
  não precisa duplicar). Cabeçalho móvel (hambúrguer + busca) também abre
  a mesma `Gaveta`.
- `AbasPrincipais` (a faixa horizontal de 6 pílulas) foi REMOVIDA — nada
  ocupa esse lugar agora, o núcleo + "Mais" cobrem a mesma função.

**Logout continua alcançável em qualquer camada** sem precisar de tela
nova: o botão "Sair" já existe solto na `BarraTopo` (todas as telas,
desktop e celular) e continua no dropdown de Perfil do trilho — não
precisou entrar em `/configuracoes` nem na gaveta.

**Simplificação registrada, não escondida:** a barra do polegar antiga
trocava de item pra MEI (Balcão/Prateleira no lugar de Cartões/Parecer).
Isso saiu — agora o núcleo é sempre Início/Movimento/Cartões/Perfil pra
todo mundo, MEI ou não (igual ao Calen, que não troca os 4 tabs por
perfil de usuário); Loja continua inteira, só que sempre atrás de "Mais"
mesmo pra quem é MEI, em vez de ocupar 2 dos 4 slots do polegar.

**Verificado ao vivo:** `tsc`/`next build`/`npm test` (265/265)/`test:fumaca`
(63/63) limpos. No Chrome: trilho mostra os 6 botões certos (Tino/Início/
Movimento/Cartões/Buscar/Mais/Perfil, confirmado via DOM), "Mais" abre o
painel com Planejar/Dívidas/Analisar/Ajustes sem cortar (confirmado via
`getBoundingClientRect` — filho direto de `<body>`, o portal evitou o
mesmo bug de clipping do painel de notificações), barra do polegar e
gaveta do celular confirmadas via DOM (mostram núcleo+Mais e nível 2,
respectivamente) — viewport realmente estreito não coube nesta janela do
Chrome automatizado (o `resize_window` não conseguiu passar de ~1080px de
largura física nesta máquina), então a checagem mobile foi por inspeção de
DOM/classe, não por screenshot visual estreito.

### Falta desta rodada "Calen" (registrado, não escondido)

- **Etapa 2 (visual: escuro por padrão + acento roxo/violeta + tipografia
  grande/arredondada)** — ver progresso abaixo, se já começou nesta mesma
  sessão.
- **Avisos proativos por push/e-mail de verdade** — o motor de vigias
  (`lib/tino/alertas.ts`) já produz a frase-com-número; transformar isso
  em notificação de push/e-mail real (não só texto na tela) é trabalho de
  infraestrutura (provedor de push/e-mail, permissão do navegador,
  fila/job), não CSS. Checagem rápida: não achei integração de
  push/e-mail existente em `lib/` — precisaria ser construída do zero, o
  que o próprio prompt pede pra NÃO fazer sem confirmação. Fica pendente,
  registrado como decisão do Davi.
- **FAB de adicionar transação (padrão "+" do Calen)** — o prompt já
  marca isso como opcional/avaliar, não obrigatório. Não entrou nesta
  rodada; `/painel` já tem "Anotar em segundos" embutido na tela (mesmo
  papel, formato diferente).
- **Revisão de copy tela a tela** e **"um conceito por card" em
  `/regras`/`/configuracoes`** — não entraram nesta rodada (escopo grande,
  pediria abrir e reescrever texto/estrutura de várias telas uma a uma).

## Rodada "comparação com Controllares" (07/09/2026, noite) — KPI, busca, notificações, sticky

Davi mandou 3 imagens comparando o Tino a um dashboard CRM de referência
("Controllares", versão escura) e pediu ajustes pontuais + "notificações
quero que mude também". Verificado ao vivo no navegador (extensão Chrome
conectou nesta sessão), claro e escuro, com Postgres local de verdade.

**1) Cartão de KPI (`ui/painel.tsx`, `Metrica`)** — o halo borrado com
gradiente atrás do ícone (`--gradient-steel`, `blur-2xl`) saiu. No lugar,
`Metrica` ganhou uma prop opcional `icone` (componente de ícone): quando
passado, renderiza um círculo sólido (`bg-card`, borda de 1px, ícone em
`text-foreground`) acima do rótulo — igual à referência, sem gradiente
colorido. É opcional de propósito: das ~20 telas que usam `<Metrica>`, só
os três KPIs do topo de `/painel` (Saldo/Wallet, Sobra do
mês/PiggyBank, Próxima conta/CalendarClock) ganharam ícone nesta rodada —
as outras ~19 continuam sem, por escolha (não inventar ícone pra métrica
que não tem um óbvio). `ui/metric-card.tsx` (`MetricCard`) não foi tocado:
continua sem uso em nenhuma tela, confirmado por grep antes de mexer.

**2) Sidebar/trilho lateral** — conferido ao vivo: o trilho (`TrilhoLateral`
em `navegacao.tsx`) já é um controle fixo de 64px, sem estado
colapsado/expandido (a constante `CHAVE_RECOLHIDO` existia solta, sem
nenhum toggle usando — código morto de um plano anterior que não foi
concluído). Não foi adicionado um botão de recolher: o trilho já É a
versão "recolhida" permanente por decisão de sessões anteriores (redesign
de navegação de 07/09/2026, trilho de 4 ícones + abas em pílula), e
inventar um estado expandido que muda a largura de toda a área de
conteúdo (`.area-do-app`) seria uma mudança estrutural, não uma "skin" —
ver a rodada seguinte abaixo, onde a pílula de navegação PASSA a entrar
no trilho por pedido explícito e novo do Davi. Grupos com rótulo uppercase
pequeno: já existiam assim na `Gaveta` (menu do celular), confirmado.

**3) Busca (`buscar-paginas.tsx`)** — a referência mostra "Buscar..." com
"Ctrl K" visível dentro do campo. O Tino já tinha o atalho de teclado
(`Ctrl/Cmd+K`) funcionando, só faltava a pista visual — nenhum atalho novo
foi implementado, só a UI. `BuscarPaginas` virou dois componentes:
`BuscaPaginasProvider` (estado + diálogo, montado UMA vez no
`(app)/layout.tsx`) e `GatilhoBuscaPaginas` (o botão, em dois formatos —
`variant="icone"` pro trilho/cabeçalho móvel, `variant="barra"` pro campo
"Buscar... Ctrl K" novo, usado na `BarraTopo`).

Esse refactor não foi cosmético: achei ao vivo que o código ANTERIOR já
tinha dois `<BuscarPaginas>` montados ao mesmo tempo (`TrilhoLateral`,
`lg:flex`, e o cabeçalho móvel, `lg:hidden` — os dois ficam no DOM o tempo
todo, só escondidos por CSS, nenhum desmonta). Cada um tinha seu PRÓPRIO
listener de `Ctrl+K` e seu próprio `<Dialog>`: apertar Ctrl+K já abria
dois diálogos sobrepostos antes de eu tocar em nada. Ao acrescentar um
TERCEIRO gatilho (a barra da `BarraTopo`), isso ia virar três. Corrigido
juntando estado/diálogo num Provider único — bug real, achado e corrigido
nesta rodada, não introduzido por ela.

**4) Notificações (`barra-topo.tsx`) — o pedido explícito do Davi.** O
dropdown pequeno (sem aba, sem "lido", sem "limpar") virou um painel:
título "Notificações", abas "Todas"/"Não lidas · N" (shadcn `Tabs`, já no
projeto), item com ícone circular por severidade (`AlertTriangle`/
`AlertCircle`/`Info` — cinza, sem cor por severidade, ver decisão de cor
abaixo), título, data (`formatarData`), texto, link "Ver", botão circular
de check pra marcar como lida; rodapé "Marcar todas lidas"/"Limpar tudo".

**Achado que muda a decisão do brief original:** o brief presumia que
"lido" não existe persistido no banco e mandava implementar como estado
local. Falso — `Alerta.lido` (booleano) e `Alerta.criadoEm` já existem no
schema desde a migration inicial (`20260823223045_inicial`), e
`PATCH /api/tino/alertas` (marca lido, com ou sem lista de `ids`) já
existia, sem nenhuma tela chamar. Usar o que já existe é melhor que
inventar estado local que não sincroniza — então:
- **"Marcar como lida" (por item) e "Marcar todas lidas"**: chamam o
  `PATCH` real, persistido de verdade. `atualizarAlertas` (`lib/tino/
  alertas.ts`) mudou de `where: { lido: false }` pra `where: { larId }`
  (com `orderBy` não-lido primeiro), porque a aba "Todas" precisa ver os
  já lidos também — sem essa mudança o `GET` nunca devolvia o que a pessoa
  já tinha marcado como lido.
- **"Limpar tudo"**: SEM rota de exclusão (nenhuma foi criada — fora de
  escopo pra uma skin, e o brief pedia explicitamente não criar rota
  nova). Marca tudo como lido (via o mesmo `PATCH`) e depois esconde os
  ids da lista **só neste navegador** (`Set<string>` em `localStorage`,
  chave `tino:alertas-dispensados`) — comentado no código que isso NÃO
  sincroniza entre aparelhos e não apaga nada do banco. Se a condição do
  alerta continuar valendo, ele pode reaparecer numa próxima checagem —
  comportamento correto, não bug.

**Bug real achado testando ao vivo, não estava no brief:** o painel de
notificações, do jeito que foi desenhado (mais alto que o dropdown antigo:
abas + lista + rodapé), ficava com SÓ o título "Notificações" visível — o
resto invisível, cortado. Causa: `<header>` usa a classe `.ios-card`
(`globals.css`), que tem `overflow: hidden` (necessário pra cortar o
blur/vidro no raio da borda). Qualquer painel `position: absolute` dentro
do header que ultrapasse a altura dele mesmo é cortado por esse
`overflow: hidden` — o dropdown ANTIGO (menor) provavelmente já sofria
disso em menor grau, mascarado por ser pequeno. Corrigido com
`createPortal` (`react-dom`, já uma dependência, nenhuma lib nova): o
painel agora renderiza direto em `document.body`, posicionado via
`getBoundingClientRect()` do botão do sino (recalculado em scroll/resize
enquanto aberto), fora da cadeia de `overflow: hidden` do header. Ganhou
de brinde um catch-all invisível de "clicar fora fecha" (mesmo princípio
da `Gaveta` do celular), que o dropdown antigo não tinha.

**5) Sticky do cabeçalho** — testado ao vivo (scroll real em `/painel`,
claro e escuro): `BarraTopo` gruda certo no topo, sem regressão. A
suspeita registrada antes (cache de dev server do lado do Davi) segue
como explicação mais provável do screenshot dele mostrando o header
"vindo junto" — não reproduzido aqui em nenhuma página testada.

**Decisão de cor, registrada por pedir de novo depois de fechada:** nesta
rodada os ícones da referência (setas de sentido do gráfico de pipeline,
check verde de notificação, "limpar tudo" vermelho) foram **ignorados** —
manteve-se chroma zero em tudo que não é número financeiro (ícone de
severidade em cinza, "Ver"/"Limpar tudo" sem cor). Isso foi
**revertido logo em seguida** na mesma sessão — ver seção mais abaixo
("cor em números e gráficos, 07/09/2026") onde Davi pediu explicitamente
cor de volta em números com sinal e em gráficos.

**Verificado ao vivo, não só por grep/tsc:** `npm run tipos` limpo,
`npx next build` sem erro (51 rotas), `npm test` 265/265, `npm run
test:fumaca` 63/63 rotas de pé (Postgres local, `demo@tino.local`).
Testado no navegador de verdade (extensão Chrome conectada): KPI com
ícone em círculo sólido claro/escuro, busca com "Ctrl K" visível, painel
de notificações completo (abas, ícones, check, "Ver", rodapé) claro e
escuro, marcar-como-lida persistindo entre reloads, "Limpar tudo"
esvaziando a lista e continuando vazia após F5 (localStorage), header
sticky mantendo posição durante scroll real.

## RESOLVIDO em 07/09/2026, à noite: casca preta + vidro líquido

Davi decidiu, de forma explícita e definitiva: **"quero o site black e com
glass liquid estilo apple com os botões que mandei como referência no
21st."** Isto fecha as duas perguntas que ficavam em aberto mais abaixo
neste arquivo (seção "Conflito novo, registrado em 07/09/2026"):

- **Casca 100% neutra vs. azul de ação**: preto. Fundo preto é o PADRÃO do
  app agora — não um dark-mode opcional que convive com um tema claro. O
  bloco `:root` de `globals.css` (não mais só `.dark`) já é a casca preta;
  `.dark` virou espelho do mesmo valor só para não quebrar nada que ainda
  leia a classe. `ThemeProvider` em `app/layout.tsx` ganhou
  `forcedTheme="dark"`.
- **Cor de ação azul do Fixa/protótipo**: continua azul (`acao`,
  `oklch(0.68 0.17 258)`) — Davi não pediu para trocar o matiz, só o fundo
  e o material das superfícies. Nenhuma paleta nova entrou.

**"Vidro líquido"** é literal, não metáfora: toda superfície do app —
cartão (`.ficha`), diálogo (`.liquid-glass-elevated`), menu/popover/select
(`.vidro-menu`), trilho lateral, barra do topo, gaveta móvel, dock do
Tino — é branco translúcido sobre o preto (`--papel-1/2/3`), com
`backdrop-filter: blur(...)` de verdade por trás, um traço de luz na
borda de cima (`--vidro-realce`, como `inset` no `box-shadow` — a luz
"pegando" a aresta superior do vidro, não uma borda uniforme) e sombra
funda e macia por baixo (`--sombra-ios`/`--sombra-alta`) para dar
profundidade. Botões, badges, checkbox, inputs e o toggle de preço seguem
o mesmo vocabulário. Nenhuma tela nova, nenhuma funcionalidade nova — é
reskin.

### Achado no caminho: duas classes fantasmas

`dialog.tsx`, `select.tsx` e `dropdown-menu.tsx` já referenciavam
`liquid-glass-elevated` e `vidro-menu` — e `button.tsx` já referenciava
`spring-press` — em variantes/`className`, mas **nenhuma das três classes
existia em `globals.css`**. Ou seja: diálogo, select e menu suspenso
rodavam sem NENHUM estilo de superfície (fundo transparente, sem borda,
sem sombra) desde que esses componentes entraram na branch
(`e505136`/`cb9d02b`), e os botões `default`/`destructive` não tinham
nenhuma animação de toque. Provavelmente sobra de um rascunho anterior de
vidro que nunca foi fechado. Esta sessão definiu as três de verdade (ver
`globals.css`, `@layer components`) — não são invenção nova, são a
implementação do que o nome da classe já prometia.

### Tokens novos/trocados (`src/app/globals.css`, `tailwind.config.ts`)

| Token | Valor | Papel |
|---|---|---|
| `--background` | `oklch(0 0 0)` (preto puro) | casca do app |
| `--foreground` | `oklch(0.97 0 0)` | texto principal |
| `--papel-1` | `oklch(1 0 0 / 8%)` | vidro fino — cartão comum (`.ficha`) |
| `--papel-2` | `oklch(1 0 0 / 12%)` | vidro médio — hover, campo recuado |
| `--papel-3` | `oklch(1 0 0 / 16%)` | vidro grosso — diálogo, menu, gaveta, dock |
| `--pauta` | `oklch(1 0 0 / 12%)` | borda do vidro |
| `--vidro-realce` (novo) | `oklch(1 0 0 / 22%)` | traço de luz no topo do vidro (`inset` no box-shadow) |
| `--texto-2` | `oklch(0.75 0 0)` | texto secundário |
| `--texto-3` | `oklch(0.70 0 0)` | rótulo terciário (11px caixa alta) — subiu de L0.63 para L0.70, ver contraste abaixo |
| `--desfoque` / `--desfoque-forte` (novos) | `20px` / `36px` | intensidade do `backdrop-filter: blur()` — fino (cartão/menu) vs. grosso (diálogo/gaveta/dock) |
| `--lch-acao/positivo/negativo/atencao/alerta/destaque/dado` | inalterados (eram os valores já calibrados para fundo escuro) | texto, ícone, anel de foco, pastilha translúcida |
| `--lch-acao-solido`, `--lch-negativo-solido`, `--lch-positivo-solido` (novos) | `0.546`/`0.566`/`0.516` (mesmo C/H) | preenchimento SÓLIDO quando texto branco senta em cima (botão primário, botão destrutivo, faixa crítica do banner, indicador do toggle de preço, pico do mapa de calor) |
| `--primary` (shadcn) | `215 70% 48%` (= `acao-solido` em HSL) | fundo do botão `default` |
| `--destructive` (shadcn) | `355 61% 51%` (= `negativo-solido` em HSL) | fundo do botão `destructive` |
| `--accent` / `--accent-foreground` | `216 52% 13%` / `216 100% 66%` | pastilha ativa (nav, paginação) — acao a 20% sobre preto + acao brilhante em cima |

Classes novas em `@layer components`: `.liquid-glass-elevated` (material
grosso), `.vidro-menu` (material fino), `.spring-press` (toque com mola).
`.ficha`/`.ios-card` ganharam `backdrop-filter` real + realce de borda.

### Contraste — calculado, não olhado

Mesmo método já usado para o azul `#297cef` (ver `docs/IDENTIDADE.md`):
oklch → OKLab → sRGB linear → luminância relativa WCAG → razão de
contraste, compositando cada camada translúcida sobre o preto puro do
fundo (as superfícies do vidro não têm cor própria — são branco a X% de
opacidade sobre o `--background`, então "contraste contra papel-N" é
"branco a X% sobre preto"). Script em Node, fórmulas padrão de
CSS Color 4 (matriz oklab→linear-sRGB de Björn Ottosson) + WCAG 2.1.

**Texto contra cada camada** (mínimo AA para texto normal: 4,5:1):

| | preto puro | papel-1 (8%) | papel-2 (12%) | papel-3 (16%) |
|---|---|---|---|---|
| `foreground` (L0.97) | 19,3:1 | 16,0:1 | 14,3:1 | 12,5:1 |
| `texto-2` (L0.75) | 9,4:1 | 7,9:1 | 7,0:1 | 6,1:1 |
| `texto-3` (L0.70) | 7,9:1 | 6,9:1 | 6,2:1 | 5,5:1 |

Todos passam com folga em qualquer superfície, inclusive a mais clara
(`papel-3`, pior caso). `texto-3` foi o único que precisou mudar: no valor
antigo (L0.63, calibrado só contra o fundo escuro anterior) dava 6,0:1
contra preto mas caía a **3,9:1 contra papel-3** — abaixo do mínimo.
Subiu para L0.70.

**Texto/ícone branco sobre preenchimento SÓLIDO de cor informativa** —
onde a maioria falhava, e por que as variantes "-solido" existem:

| Cor | Branco s/ tom claro (`acao`/`negativo`/`positivo`) | Branco s/ tom "-solido" |
|---|---|---|
| acao | **2,91:1 (falha)** | **5,16:1 (passa)** |
| negativo | **3,15:1 (falha)** | **5,13:1 (passa)** |
| positivo | **2,01:1 (falha)** | **5,14:1 (passa)** |
| atencao | 1,78:1 (falha) — resolvido com texto ESCURO em cima (já era o padrão em `banner.tsx`, mantido) | — |

Onde isso mudou código: `banner.tsx` (faixa crítico/info),
`pricing-toggle.tsx` (indicador ativo), `mapa-de-calor.tsx` (célula no
pico, ~90% de opacidade — praticamente cor cheia), `checkbox.tsx` (✓
branco sobre a caixa marcada, que pedia só 3:1 de não-texto mas o `acao`
claro dava 2,9:1). `button.tsx` já herdava `--primary`/`--destructive`
via `bg-primary`/`bg-destructive`, então só a troca do token em
`globals.css` resolveu, sem mexer no componente.

**Pastilha de vidro tingido** (badge translúcido, `bg-acao/10 text-acao`
e equivalentes — o padrão que `success`/`warning`/`info`/`purple` já
usavam em `badge.tsx`, e que `default`/`destructive` passaram a usar
também nesta sessão em vez de vazar para o `primary`/`destructive` do
shadcn): texto na cor cheia sobre o próprio fundo tingido a 10-16% dá
5,7–9,3:1 em qualquer uma das quatro cores — não precisou de ajuste.

**Não-texto (borda, anel de foco — mínimo 3:1):** o anel de foco (`acao`
brilhante) contra qualquer papel-N fica entre 4,7:1 e 7,2:1, folgado. A
borda `pauta` propositalmente NÃO tenta vencer sozinha o contraste com o
papel que ela cerca (ambas nascem de "branco a X% sobre preto", então têm
luminância próxima) — quem separa cartão de fundo é o conjunto blur +
sombra + traço de luz do topo, o mesmo princípio que já valia com o
contorno colorido banido (ver nota em `ui/painel.tsx`), registrado aqui
para não ser lido como omissão.

### Verificado, não simulado

`tsc --noEmit` limpo. `npx next build` sem erro (51 rotas). `npm test`
265/265 (suíte já existente, nenhuma mudança de lógica nesta sessão — é
reskin). `npm run test:fumaca` 63/63 rotas de pé contra o Postgres local
de verdade, login com `demo@tino.local`. Conferido também no CSS
compilado servido pelo `next dev` real (não só nos arquivos-fonte): os
valores de `--background`, `--papel-1`, `--texto-2`, `--texto-3`,
`--primary`, `--destructive`, `--accent` batem exatamente com os
calculados acima, e as três classes `.liquid-glass-elevated`/
`.vidro-menu`/`.spring-press` (antes fantasmas, ver acima) aparecem
definidas no bundle. Sem navegador nesta máquina (extensão Chrome não
conecta) — mesma limitação de sempre; sem isso, não há como ver o blur
renderizado de verdade, só confirmar que as regras CSS corretas chegam ao
cliente.

### O que NÃO mudou

Arquitetura shadcn/Tailwind (tokens em CSS var) intacta — nenhum
componente foi reescrito do zero, só trocou de token ou ganhou a classe
de vidro que já devia ter. Nenhuma paleta de marca nova. Nenhuma tela,
rota ou funcionalidade nova. O cartão de crédito em `/cartoes` (gradiente
grafite escuro, texto branco, comentário no próprio código explicando que
é "o material do objeto") ficou fora de propósito — já era escuro e
autocontido antes desta mudança, não é uma superfície de vidro do app.

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

## Remodelação com componentes 21st.dev — 07/09/2026, tarde/noite

Davi mandou uma lista de 14 componentes do 21st.dev (URLs de demo) mais o
site de demonstração **fincash.demos.tailgrids.com** como referência visual,
e pediu para remodelar o Tino com tudo isso — mapeando cada componente para
um lugar real do app, sem inventar tela nova e sem trocar a paleta.

**Como o código foi obtido.** `npx shadcn@latest add "https://21st.dev/r/..."`
devolveu `401 Authentication required` para todos — o registry do 21st.dev
exige credencial que este projeto não tem configurada (nada em `.env`).
`mcp__21st__*` e `mcp__claude-in-chrome__*` não apareceram disponíveis nesta
sessão (ver aviso no prompt original). Caí no plano B documentado: `WebFetch`
na página de demo de cada componente. Na prática o `WebFetch` devolveu só
descrição de estrutura/props (o código-fonte de verdade fica atrás de uma
aba "Code" renderizada em JS, que o fetch-para-markdown não alcança) — não o
arquivo `.tsx` exato. Cada componente abaixo foi então **reconstruído** a
partir dessa descrição e do meu conhecimento dos padrões shadcn/ui/originui,
não copiado literalmente. Mesma coisa para o fincash: a raiz do site não
rendeu conteúdo por `WebFetch` (SPA), mas `tailgrids.com/templates/fincash`
(a página de produto do mesmo template) descreveu a estrutura: site de
marketing com Home/Features/Pricing/App-workflow/Testemunhos/FAQ sob uma nav
fixa — não um dashboard interno com sidebar. É essa estrutura que foi
absorvida (ver item 4 abaixo), não uma paleta (que continua travada) nem os
depoimentos fabricados (a vitrine do Tino já registra por que não inventa
caso de sucesso).

### Os 14, um a um

| # | Componente (autor) | Onde entrou | Arquivo novo/tocado |
|---|---|---|---|
| 1 | `banner` (fuma-nama) | Faixa dispensável no topo do app para o alerta CRÍTICO mais grave (vigia) | `ui/banner.tsx`, `aviso-critico.tsx`, `(app)/layout.tsx` |
| 2 | `filesystem-item` (builduilabs) | Zona de soltar/escolher arquivo em `/importar`, no lugar do `<input type=file>` cru | `ui/filesystem-item.tsx`, `(app)/importar/page.tsx` |
| 3 | `dropdown-navigation` (ln-dev7) | Painel ao passar o mouse sobre uma pílula do topo com mais de uma tela (ex.: Planejar → Metas direto, sem passar pela primeira tela do grupo) | `components/navegacao.tsx` (`AbasPrincipais`) |
| 4 | `navbar1` (shadcnblocks) | Nav fixa no topo da vitrine (`/`), que não tinha nenhuma | `components/site-navbar.tsx`, `(site)/page.tsx` |
| 5 | `breadcrumb` (originui) | Trilha "Administração / \<aba\>" em `/admin/*` (que não tinha NENHUMA indicação de aba ativa) e "Loja / \<página\>" em `/loja/estoque`, `/loja/fiado`, `/loja/contas` (complementando as pílulas de `SubAbas`, não substituindo) | `ui/breadcrumb.tsx`, `admin/breadcrumb.tsx`, `components/trilha-loja.tsx` |
| 6 | `use-image-upload` (originui) | Foto de perfil em `/configuracoes` — `Usuario.avatarUrl` já existia no schema sem tela nenhuma gravar nele, e `ui/avatar.tsx` (shadcn) já existia sem tela nenhuma usar | `hooks/use-image-upload.ts`, `components/foto-de-perfil.tsx`, `api/usuario/route.ts` |
| 7 | `dialog` (originui) | Dois formulários que empurravam o resto do cartão para baixo viraram modal: "nova regra" em `/regras` e "nova meta" em `nova-meta.tsx` | `app/(app)/regras/page.tsx`, `components/nova-meta.tsx` |
| 8 | `select-native` (originui) | `<select>` padronizado (moldura + seta), substituindo estilo repetido à mão em `/importar`, `/transacoes` (2x), `/capturas`, `/configuracoes`, `/dividas`, `nova-meta.tsx` | `ui/select-native.tsx` |
| 9 | `checkbox` (originui) | Caixinha custom sobre input nativo, substituindo `<input type=checkbox>` cru em `/importar`, `/transacoes`, `/regras` | `ui/checkbox.tsx` |
| 10 | `use-pagination` (originui) | `/transacoes` pagina em memória a lista já buscada, 25 por página, com números e reticências | `ui/paginacao.tsx` |
| 11 | `pricing-interaction` (ln-dev7) | Toggle mensal/anual de `/assinatura` virou pílula com indicador deslizante e selo de desconto (sem gradiente de marca nem framer-motion — cor `acao` já existente, transição em CSS) | `ui/pricing-toggle.tsx` |
| 12 | `tags-selector` (ln-dev7) | Categoria como pastilhas clicáveis em vez de `<select>`: por lançamento pendente em `/capturas`, e no campo categoria de "nova regra" | `ui/tags-selector.tsx` |
| 13 | `animated-loading-skeleton` (anurag-mishra22) | `<EsqueletoLinhas>` no lugar do texto solto "Carregando…" (ou do nada, em `/capturas`) em `/transacoes`, `/capturas`, `/regras`, `/assinatura` | `ui/skeleton.tsx` |
| 14 | `dropdown-menu` (chetanverma16) | Ações da linha em `/regras` (ligar/desligar, remover) consolidadas num menu "⋯" — mesmo primitivo Radix que já existia e já era usado no menu de perfil do trilho lateral, agora com um segundo uso genuíno | `app/(app)/regras/page.tsx` |

Todos os 14 entraram — nenhum foi descartado. Onde um componente batia
melhor num lugar diferente do exemplo que Davi deu entre parênteses no
pedido original (`dialog` → ele não deu exemplo; `breadcrumb` → ele citou
`loja/contas`, que recebeu a trilha, mas o gap mais real estava em
`/admin/*`, que também recebeu), os dois lugares foram atendidos em vez de
escolher só um.

### Cor

Nenhum token de cor novo. Todo componente usa `acao`/`positivo`/`negativo`/
`atencao` que o Tino já tinha — o toggle de preço (`pricing-interaction`)
seria gradiente de marca no original e virou só `acao` sólido com transição;
o banner crítico usa `negativo`, não uma cor de alerta importada do 21st.dev.
`acao` continua azul `#297cef`, decisão pendente do Davi não mexida.

### O que NÃO foi feito, e por quê

- **Nenhum componente foi genuinamente descartado** — os 14 tinham lugar.
- **Landing page não ganhou depoimento/prova social** mesmo o fincash tendo
  uma seção de Testemunhos: a própria vitrine do Tino já documenta por que
  isso não entra (`(site)/page.tsx`, comentário no topo) — inventar
  depoimento seria fabricar dado, proibido independente do pedido.
- **`filesystem-item` não virou uma "lista de comprovantes anexados"
  genérica**: o app não tem conceito de anexo/comprovante em lugar nenhum
  (nem schema, nem tela) além do arquivo único de `/importar`. Construir
  upload múltiplo de comprovante por transação seria funcionalidade nova,
  fora do que foi pedido ("mapear para um lugar REAL", não inventar um).
  Usado no único lugar real que já lida com arquivo.
- **`dropdown-navigation` não trocou `<SubAbas>`**: o painel de hover é
  aditivo (desktop com mouse de verdade, via `(hover:hover)`), não
  substitui a sub-navegação por clique que já existia e que continua sendo
  o único caminho em touch.

### Verificação

Sem navegador nesta máquina (extensão Chrome não conecta) — mesma limitação
já registrada nas sessões anteriores. Verificado por, a cada lote de
commits: `tsc --noEmit` limpo, `npm test` (265/265, suíte que já existia —
nenhum teste novo destas mudanças de UI pura, sem lógica nova para testar
com `node --test`), `npx next build` sem erro, e `npm run test:fumaca`
(63/63 rotas de pé) contra o servidor local com sessão `demo@tino.local`.
Testado também manualmente por `curl` com cookie de sessão: `GET`/`PATCH`
`/api/usuario` (avatar) ida e volta, e `/`, `/painel`, `/dividas`,
`/transacoes`, `/importar`, `/capturas`, `/regras`, `/configuracoes`,
`/assinatura`, `/metas`, `/loja/contas` todos 200 — restaurando o
`avatarUrl` do usuário de demonstração para `null` ao final, sem sujar o
banco de demonstração.

Commits (nesta ordem, cada um pushado depois de verde):
`e505136`, `dd81760`, `1bf4828`, `cb9d02b`.

## Fechamento da skin acromática (07/09/2026, tarde) — substitui a casca preta+azul acima

A camada acromática descrita nas seções anteriores (chroma 0 em todo
`oklch(...)`, claro como padrão, `.dark` opcional) já estava desenhada em
`globals.css`/`tailwind.config.ts`/`layout.tsx`/`navegacao.tsx` como
mudança não commitada quando esta rodada de skin foi retomada na branch
`skin/acromatico-ios` (criada a partir de `redesign/experiencia-visual`
para isolar o trabalho). Esta seção fecha a verificação e o commit — não
há reskin adicional além do que já estava desenhado.

Verificação executada (sem browser/screenshot disponível nesta máquina —
extensão Chrome não conecta; verificação por grep + tsc + build, como
autorizado):

1. `grep -riE "blue|indigo|emerald|green|purple|violet|amber|cyan|#[0-9a-f]{3,6}"` em
   `src/`: nenhuma classe Tailwind de matiz (`text-blue-*` etc.) em nenhum
   arquivo. Os únicos hits são falsos-positivos — nomes de variante/prop
   histórica (`DotColor = "blue" | "green" | ...` em `metric-card.tsx`,
   comentário em `badge.tsx` citando as cores antigas que saíram) que já
   resolvem para tokens de cinza (`bg-acao`, `bg-positivo`, `bg-destaque`),
   e `#ffffff` (branco) em `tino-mascote.tsx`.
2. `grep -nE "oklch\([0-9.]+ 0\.[1-9]"` em `globals.css`: vazio — todo
   `oklch(...)` do arquivo é `oklch(L 0 0)` ou interpolação de variável já
   acromática.
3. Sidebar (`.ios-card`/trilho lateral) e topo com cantos arredondados nos
   4 lados e fundo visível ao redor: confirmado em `globals.css`
   (`.ficha`/`.ios-card` com `border-radius` completo) e no esqueleto de
   `navegacao.tsx` (trilho fixo, barra do polegar `.ios-card` com margem
   `inset-x-3 bottom-3`).
4. `body` com os dois `radial-gradient` + `background-attachment: fixed`:
   presentes em `globals.css` (claro e espelho em `.dark body`).
5. `npm run tipos` (tsc --noEmit): limpo, zero erros.
   `npx next build`: build de produção completo, 51 rotas geradas, zero
   erro/warning de tipo.
6. `git diff --stat` desta rodada toca só
   `docs/ESTADO-SESSAO.md`, `src/app/globals.css`, `src/app/layout.tsx`,
   `src/components/navegacao.tsx`, `tailwind.config.ts` — nenhum arquivo
   de rota (`src/app/api/**`) ou lógica de fetch mudou.

Não coberto nesta rodada: verificação visual real (screenshot/browser),
por falta de acesso a essa ferramenta nesta máquina — fica para quando
alguém puder abrir o app e olhar. `scratch-contrast.js` (script Node solto
na raiz, usado para recalcular contraste WCAG dos tokens) não é
entregável desta skin e ficou fora do commit.

## Skin acromática aplicada no app inteiro (07/09/2026, madrugada/manhã)

Retomada da mesma tarefa depois de duas quedas por rate limit da API
(registrado no pedido — não eram erro de conteúdo). Ponto de partida:
tokens e casca (`globals.css`/`layout.tsx`/`navegacao.tsx`/
`tailwind.config.ts`) já fechados no commit `6effc27`. O que faltava era
aplicar a skin no app inteiro — e a varredura completa mostrou que a
maior parte das ~30 telas **já estava** em `.ficha`/`.ios-card` (via
`<Cartao>` de `ui/painel.tsx`) desde sessões anteriores do mesmo
redesign. O trabalho real desta rodada foi achar e fechar o que ainda
não estava, não recomeçar do zero.

**Bugs de contraste reais, achados por medir, não por olhar** (o app não
tem browser nesta máquina, então nada disto foi "visto errado" — foi
calculado e conferido no CSS compilado):

- `--lch-acao-solido`/`--lch-negativo-solido`/`--lch-positivo-solido` no
  bloco `.dark` de `globals.css` seguiam a regra geral do arquivo
  (inverter luminosidade) e viravam quase-branco no escuro — mas essas
  três hospedam **texto/ícone branco fixo** por cima (faixa crítica do
  banner, ✓ do checkbox, indicador do toggle de preço, pico do mapa de
  calor). Branco sobre quase-branco no modo escuro. Corrigido: essas três
  NÃO invertem mais — ficam no mesmo valor escuro nos dois temas, de
  propósito (comentário no arquivo explica o porquê, para não virar
  "conserto" acidental de novo).
- Consequência do ajuste acima: `checkbox.tsx` usava `text-primary-foreground`
  no "✓" (que inverteria sozinho e ficaria escuro sobre o fundo agora
  sempre escuro). Trocado para branco fixo, parceiro certo do token.
- `dialog.tsx` (botão fechar), `table.tsx` (hover/seleção de linha),
  `skeleton.tsx` (placeholder de carregamento): `bg-white/[...]` que não
  invertia com o tema — no claro ficava quase invisível. Trocado por
  `bg-foreground/[...]`.
- Chroma residual sobrevivendo de peles anteriores, achado por grep:
  `cartoes/page.tsx` (gradiente da face do cartão, chroma 0.09/0.04 no
  hue 262) e `banner.tsx` (texto do tom "atencao", chroma 0.02) —
  zerados. Confirmado depois no CSS compilado (`.next/`) que não sobra
  `oklch(...)` com chroma diferente de zero em lugar nenhum.

**O ponto que o pedido chamou de "o que mais precisa de atenção"** —
valor financeiro positivo/negativo virar ícone, não só cor: `Valor` e
`Metrica` (`ui/painel.tsx`, usados por praticamente toda tela com
dinheiro) ganharam `ArrowUpRight`/`ArrowDownRight` de verdade quando
`tom` é "positivo"/"negativo" — sem prop nova, o ícone nasce do `tom`
que o componente já recebia. Isso propaga de graça para `/cartoes`,
`/painel`, `/metas`, `/investir`, `/mei`, `/loja`, `/plano` (os quatro
KPIs do topo) e mais. Os dois lugares com valor sinalizado que não
passavam por `Valor`/`Metrica` (variação do balanço em `/analise`, sobra
por mês no roteiro de `/plano`) ganharam o mesmo ícone à mão. `Metrica`
também ganhou halo borrado no canto (profundidade, pedido explícito do
spec) e virou `ios-tap`.

**Grade de KPI em 2 colunas no celular, não 1**: o checklist do spec
pedia "390px: KPIs em 2 colunas" — as grades de `Metrica` só tinham
`sm:grid-cols-3/4`, sem `grid-cols-2` na base, então empilhavam 1 por
linha abaixo de 640px. Corrigido em 20 arquivos (toda tela com grade de
métricas, incluindo os dois painéis de admin).

**Trilho lateral (desktop) e barra do topo viram flutuando de verdade**:
antes só a barra do polegar do celular tinha `.ios-card` com margem —
o trilho de 64px ficava colado na borda esquerda, sem cantos
arredondados nem fundo visível ao redor (falha direta do item do
checklist "sidebar/topbar com cantos arredondados nos 4 lados"). Agora
`TrilhoLateral` é `.ios-card` com `inset-y-3 left-3`, e `BarraTopo`
também virou `.ios-card` sticky em vez de faixa full-bleed. O ponto de
troca mobile/desktop subiu de 768px para 1024px (`lg`, como o spec
pedia) em todo `navegacao.tsx` — trilho, gaveta, cabeçalho móvel e barra
do polegar trocam juntos no mesmo breakpoint agora. `.area-do-app`
ajustou o respiro (108px) para a nova geometria.

**Alternador de tema claro/escuro**: já existia pronto
(`theme-toggle.tsx`, `theme-provider.tsx`, `next-themes` — dependência
que já estava no projeto, nenhuma lib nova entrou) desde uma sessão
anterior, mas **não estava montado em nenhuma tela**. Este é o único
pedaço de lógica nova autorizado nesta tarefa ("opção white e black" de
verdade); como já vinha pronto, o trabalho foi só montá-lo em
`BarraTopo`, ao lado de alertas/admin/configurações/sair.

**O que ficou revisado e já estava correto, sem precisar mexer**: todos
os primitivos de `components/ui/` restantes (`button`, `badge`, `select`,
`select-native`, `checkbox` fora do ajuste acima, `switch`, `tabs`,
`tooltip`, `avatar`, `breadcrumb`, `cabecalho-pagina`, `editavel`,
`empty-state`, `filesystem-item`, `input`, `textarea`, `sheet`, `toast`,
`label`, `separator`, `scroll-area`, `paginacao`, `tags-selector`,
`pricing-toggle`) e os componentes de topo (`site-navbar`,
`trilha-loja`, `aviso-critico`, `buscar-paginas`, `tino-acompanha`,
`categorias-comparadas`, `mapa-de-calor`, `foto-de-perfil`, `nova-meta`,
`anotar-rapido`, `ditar-gasto`, `relatar-problema`, `vigias-config`,
`tino-mascote`, `tino-dock`) já vieram acromáticos e usando os tokens
certos das sessões anteriores. `graficos.tsx` (recharts, a lib de
gráfico já usada) já lê os tokens `--lch-*` em runtime e já segue o
vocabulário do spec (linha em `foreground`, preenchimento em gradiente,
tooltip em vidro) — não precisou de mudança.

**Verificado, não simulado:**
- `npm run tipos` (tsc --noEmit): limpo, a cada lote de commits.
- `npx next build`: 51 rotas, zero erro/warning de tipo.
- `npm test`: 265/265 (suíte já existente — reskin não muda lógica, sem
  teste novo).
- `npm run db:start` + `npm run dev` + `npm run test:fumaca`: **63/63
  rotas de pé** contra o Postgres local de verdade, login com
  `demo@tino.local`.
- CSS COMPILADO (não só fonte): conferido em `.next/dev/static/chunks/`
  que `--lch-acao-solido` bate `.16 0 0` tanto em `:root` quanto em
  `.dark` (a correção do bug de contraste chegou ao bundle de verdade,
  não só ao arquivo-fonte), e que nenhum `oklch(...)` do CSS compilado
  tem chroma diferente de zero.
- `grep -riE "blue|indigo|emerald|green-|purple|violet|amber|cyan|#[0-9a-f]{3,6}"`
  em `src/`: os únicos hits são os já documentados como falso-positivo
  na sessão anterior (campo `cor` de categoria/conta no BANCO — dado de
  negócio, não estilo, nunca lido para pintar hue nenhum; `--gradient-blue`,
  que é o NOME exigido pelo próprio spec de Davi para uma rampa de cinza;
  `#f8f8f8`/`#1c1c1c`/`#ffffff` — hex sem matiz nenhum) mais o mesmo
  `DotColor` de `metric-card.tsx` (componente ainda sem uso em tela
  nenhuma) já registrado antes.
- `oklch(... c ...)` com chroma ≠ 0: nenhum, nem na fonte nem no CSS
  compilado.
- Sem browser nesta máquina (extensão Chrome não conecta) — o toggle
  claro/escuro foi conferido pelo CSS compilado dos dois blocos
  (`:root`/`.dark`) batendo com os valores calculados, não por captura de
  tela.

**`git diff 6effc27..HEAD`**: 33 arquivos, só CSS (`globals.css`),
`className`/JSX de wrapper (ícones, grade, halo) e o único mount novo do
`ThemeToggle` em `barra-topo.tsx` — nenhum arquivo de rota
(`src/app/api/**`), nenhuma mudança de fetch/estado/prop pública, nenhuma
página nova, nenhuma dependência nova em `package.json`.

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

## Bug crítico corrigido: página não abria (07/09/2026, mais tarde)

Ao abrir o app pela primeira vez depois da rodada de skin, TODA página
quebrava com "This page couldn't load" — não era só um aviso do dev
overlay, o React de fato recusava renderizar. Causa: `ThemeProvider`
(montado nesta mesma rodada de skin pra ligar o `ThemeToggle`, ver seção
anterior) usava `next-themes`, que injeta um `<script>` cru via
`dangerouslySetInnerHTML` pra aplicar o tema antes do primeiro paint
(técnica padrão da lib, usada há anos). O Next desta versão (16.3.2)
recusa isso em dev: "Encountered a script tag while rendering React
component" — testado também com `next-themes@0.4.6` (a mais recente),
mesmo erro, então não é bug de versão da lib, é incompatibilidade real
entre a técnica e este Next.

**Correção:** `src/components/theme-provider.tsx` deixou de depender do
`next-themes` — vira contexto React pequeno, próprio, sem `<script>`
nenhum: aplica `.dark` via `classList` depois de montado (`useEffect`),
lê/grava preferência em `localStorage("theme")`. `next-themes` foi
desinstalado (`npm uninstall`) — dependência zero a mais, uma a menos.
`theme-toggle.tsx` só trocou o import de `useTheme` (mesma assinatura, sem
mudar a lógica do componente). Custo aceito: sem o script de SSR, quem já
tinha escolhido escuro pode ver um instante de claro no primeiro
carregamento antes do `useEffect` rodar — troca aceitável por a página
abrir de verdade.

Verificado depois da correção: `tsc` limpo, `next build` limpo (51 rotas),
`npm test` 265/265, e testado ao vivo no navegador (extensão Chrome
conectou nesta máquina) — login com `demo@tino.local`, painel renderiza
certo no claro (fundo quase-branco, botão preto, setas cinza em vez de
verde/vermelho no saldo) e no escuro (toggle clicado de verdade, classe
`dark` aplicada, botão vira branco sobre preto, mesma paleta acromática
nos dois). Alternador testado por clique de mouse simulado direto no
elemento (o clique por coordenada de tela não estava acertando o botão
por causa da barra do dev overlay sobrepondo a viewport pequena do
navegador automatizado — não é bug do app).

Também precisou subir o Postgres local desta máquina do zero
(`npm run db:start`, primeira vez aqui, demorou pela inicialização) —
ambiente, não código.

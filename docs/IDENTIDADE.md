# Identidade visual do Tino

Escrito para quem for mexer na tela sem ter participado da decisão. O que está
aqui não é gosto: cada escolha responde a alguma coisa do produto.

## De onde vem

A referência não é app de banco nem fintech: é **o livro-caixa e a bobina do
cupom**. Papel, pauta, tinta e carimbo. O Tino fala de dinheiro miúdo,
conferido peça por peça, e a tela devia parecer isso.

O visual anterior era um tema Apple genérico herdado do ERP Controllares. Além
de não dizer nada sobre o produto, era código de terceiro dentro de algo que
vai ser vendido.

**Isso não briga com a linguagem do iOS que entrou em 04/09/2026.** O que saiu
do Controllares foi CSS de terceiro copiado inteiro, sem decisão por trás. O
que entrou são convenções de plataforma escolhidas uma a uma e conferidas
aqui: hierarquia por tamanho e peso em vez de troca de letra, azul cheio como
"isto se toca", raio de canto maior, superfície lisa. Nenhum valor foi copiado
— o azul da Apple, por exemplo, não passava no contraste no tamanho em que
esta base o usa, e desceu um degrau. O papel, a pauta, a ficha e o mascote
continuam sendo do Tino: a plataforma dá a gramática, não o assunto.

## As cores dizem o que informam

Os tokens têm nome de função, não de cor: `positivo`, `negativo`, `atencao`,
`acao`. Trocar o azul do positivo por outro azul não obriga a mexer em 40
arquivos, e nenhuma tela fica dizendo "verde" depois que o verde saiu.

| Token | Para quê | Por que esse tom |
|---|---|---|
| `positivo` | sobra, saldo bom, meta batida | **azul**, porque em português quem tem sobra está "no azul". Verde está proibido nesta base — é o que toda fintech faz e já foi rejeitado aqui uma vez |
| `negativo` | buraco, dívida, estouro | vermelho de carimbo — "estar no vermelho" |
| `atencao` | perto do limite, vencendo | âmbar de papel envelhecido |
| `acao` | botão, link, foco, o que se clica | o azul de sistema do iOS, um degrau mais escuro que o `#007AFF` da Apple. Vem de fora, do sistema em que o app é usado: azul cheio é o que a pessoa já leu a vida inteira como "isto se toca". Escurece porque aqui a cor também vira texto de 12px, e o tom da Apple sobre branco dá só 3,6:1 |
| `alerta`, `destaque`, `dado` | gráfico e caso raro | usados com parcimônia |

Superfícies são `papel-1` (mais perto do olho), `papel-2` e `papel-3`. A borda
é `pauta` — a linha do livro-caixa.

**Dois azuis, e isso é de propósito.** `acao` e `positivo` convivem porque
estão em pontos diferentes da escala — a ação é clara e saturada, o valor é
fundo e contido — e porque nunca disputam o mesmo pedaço da tela: um é
preenchimento de botão, o outro é algarismo. Foco e seleção usam `acao`, não
`positivo`: campo em foco e valor no azul diziam coisas diferentes com a mesma
cor.

No tema escuro o fundo é **grafite azulado, não preto puro**: em tela OLED o
preto absoluto faz cartão e fundo virarem a mesma coisa e a hierarquia some. O
azul da ação clareia junto, como o iOS faz — o tom claro sobre grafite perde
contraste e o botão afunda no fundo.

## Duas famílias, três trabalhos

- **Onest** (`--font-display` e `--font-corpo`) faz título e corpo. É uma
  grotesca geométrica de terminais horizontais e caixa alta curta — o mesmo
  lugar em que a San Francisco da Apple mora, e a mais próxima dela entre as
  que dá para auto-hospedar. Uma família só nos dois papéis é escolha, não
  economia: no iOS a hierarquia vem de tamanho e peso, não de trocar de letra
  a cada nível.
- **IBM Plex Mono** (`--font-numero`, classe `.numero`) existe por motivo
  funcional: dinheiro precisa de algarismo tabular. Sem largura fixa por
  dígito, a coluna de valores dança e conferir extrato vira caça ao erro.

As duas vêm pelo `next/font`: o build baixa os arquivos e serve pelo próprio
domínio, sem requisição a `fonts.gstatic.com` em tempo de execução.

A interface inteira tem `font-variant-numeric: tabular-nums`. A classe
`.numero` acrescenta a fonte mono, e vai só nos valores em destaque.

## A ficha

`.ficha` é o cartão. Papel, borda de pauta, raio de 16px e **uma linha de
pauta no topo** — o único enfeite do sistema, e o que dá à tela cara de papel
pautado em vez de painel de aplicativo.

A linha encolheu de 2px para 1px e perdeu metade da opacidade quando o resto
foi para a linguagem do iOS: numa tela com seis fichas empilhadas, seis barras
coloridas viram listra, e superfície de iOS é lisa. O traço fica porque é a
assinatura da casa; fica fino porque parou de ser o que se vê primeiro. O
`--radius` geral é 14px, o raio de cartão do iOS.

## O Tino

Corpo de bloco de anotação, fita de cupom saindo do topo, pauta atravessando o
peito. Não é robô nem porquinho: o assunto é papel conferido peça por peça. O
mesmo desenho é o ícone do app — quem procura o app no celular procura a cara
dele.

**A expressão vem do motor de alertas, nunca de decoração.** Com alerta crítico
aberto ele franze; sem alerta nenhum ele fica tranquilo. Falha de rede deixa
ele "pensando", não "tranquilo": mascote sorrindo por falta de dado mentiria
sobre a situação, que é o defeito que esta base mais evita.

Estados em `src/components/tino-mascote.tsx`: `tranquilo`, `atento`,
`apertado`, `critico`, `comemorando`, `pensando`.

## Ao mexer

- cor nova só entra se responder a uma pergunta que o usuário faz. Decoração
  não ganha token
- valor em destaque leva `.numero`
- animação só quando o movimento for informação. `prefers-reduced-motion` já
  está respeitado no `globals.css`
- os componentes são shadcn/ui sobre Radix: personalize pelo token, não
  reescrevendo o componente

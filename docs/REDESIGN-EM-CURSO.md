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

## Pendências que dependem do Davi

- **`BRIEF-CATEGORIAS-NAO-APLICADO.md`**: prompt de outro produto (catálogo
  de automação: Control4, Hikvision, Home Cinema). Ele pediu para guardar e
  confirmar depois se vale para a Prateleira do MEI.
- Os skills instalados criaram symlinks de caminho absoluto em
  `.claude/skills/`, que quebram em outra máquina. Não commitados, esperando
  decisão dele.

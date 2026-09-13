# Revisão de acessibilidade — tarefa C2

Base: commit `3af300e`. Revisor: Claude, branch `claude/revisoes`.
Rotas revisadas: `/cartoes`, `/metas`, `/transacoes`, `/configuracoes` e o
painel de notificações (`components/barra-topo.tsx`).

Método: leitura de código com varredura automática em busca dos defeitos
que costumam aparecer — botão só com ícone sem nome, `onClick` em elemento
não interativo, campo sem rótulo associado, alvo abaixo de 44 px, sentido
transmitido só por cor, foco preso ou perdido. Cada suspeita foi conferida
no arquivo antes de entrar aqui.

**Não verificado com leitor de tela nem com captura de tela.** O servidor
local está com o Codex e a extensão de navegador desta máquina vem falhando
ao capturar. Os achados abaixo são de código, e cada um traz a reprodução
para você conferir na tela.

## Resumo

O estado é melhor do que o de costume. A varredura levantou 14 suspeitas de
campo sem rótulo e todas eram falso positivo: os campos de `nova-meta.tsx`,
`cartao-meta.tsx` e `transacoes` estão dentro de `<label>`, que é
associação válida. Botões de ícone em `/cartoes` já têm `aria-label` com o
nome do item ("Editar Uber", "Excluir parcelamento X"). As barras de fatura
são `<button>` com `aria-pressed` e rótulo que diz os dois valores. As
barras de progresso usam `<progress>` com `aria-label`. Erro usa
`role="alert"`, carregamento usa `role="status"`. O foco visível existe em
regra global (`:focus-visible`, contorno de 2 px com afastamento).

Diálogos e o painel lateral usam Radix (`Dialog`, `Sheet`) e a gaveta usa
Vaul com `autoFocus` no `Drawer` — prendem o foco, devolvem ao gatilho e
fecham com `Esc` sem código próprio.

Sobraram três P1 e dois P2.

## P1 — corrigidos nesta rodada

### P1-1. Não há como pular a navegação

- **Arquivo:** `src/app/(app)/layout.tsx`
- **Elemento:** `<main className="animate-page-enter">` — sem `id`, e sem
  link de salto antes dele.
- **Reprodução:** abra qualquer rota do app, clique na barra de endereço e
  pressione Tab repetidamente. O foco percorre a marca, os itens do trilho,
  "Mais", a conta e "Sair" antes de alcançar o conteúdo — de novo a cada
  troca de página.
- **Por que importa:** é o caso clássico de bloco repetido. Quem navega por
  teclado paga esse pedágio em toda página.
- **Correção aplicada:** link "Pular para o conteúdo" como primeiro
  elemento focável, visível só ao receber foco, apontando para
  `#conteudo`, e `id="conteudo"` no `<main>`. A vitrine já fazia isso
  (`landing-skip`); o app ficou sem.

### P1-2. O sino não avisa que há coisa nova

- **Arquivo:** `src/components/barra-topo.tsx`
- **Elemento:** botão com `aria-label="Notificações"` e, dentro dele, um
  ponto de 8 px (`<span className="absolute right-1 top-1 size-2 …">`).
- **Reprodução:** com leitor de tela, percorra o cabeçalho com nenhum aviso
  não lido e depois com vários. O botão anuncia "Notificações" nos dois
  casos: a única diferença é o ponto colorido, que não tem texto.
- **Correção aplicada:** a contagem entra no nome acessível — "Notificações,
  3 não lidas". O ponto continua, para quem enxerga.

### P1-3. Alvo de 40 px em Configurações

- **Arquivo:** `src/app/(app)/configuracoes/page.tsx`
- **Elemento:** botão de conectar banco, `px-5 py-2.5 text-sm`.
- **Reprodução:** meça o botão no inspetor: 20 px de linha de texto mais
  10 px de recheio em cima e embaixo, 40 px de altura.
- **Por que importa:** o critério desta tarefa é 44 px, e o resto do app já
  cumpre (`min-h-11` aparece em praticamente todo botão).
- **Correção aplicada:** `min-h-11`.

## P2 — registrados, não corrigidos

### P2-1. Legenda que depende do nome da cor

Três textos explicam a tela nomeando a cor:

| Arquivo | Texto |
|---|---|
| `components/central-cartoes.tsx` | "Verde: lançamentos. Amarelo: parcelas previstas, que podem já constar nos lançamentos." |
| `components/categorias-comparadas.tsx` | "…por isso a queda aparece em verde." |
| `(app)/simulador/page.tsx` | "A linha cinza é o seu cenário de hoje; a área azul é com as hipóteses." |

Para leitor de tela o problema é pequeno em `/cartoes`, porque cada barra
já tem `aria-label` com os dois valores escritos. O problema real é para
quem enxerga e não distingue as duas cores: em `central-cartoes` as duas
barras se diferenciam por cor e por 4 px de largura (`w-4` contra `w-3`).

Some-se a isso o risco apontado no C1: a paleta já mudou várias vezes, e
texto que diz "área azul" não quebra quando a área deixa de ser azul.

**Proposta:** trocar a legenda por amostra visual com rótulo ao lado (um
quadradinho da cor real seguido da palavra "Lançamentos"), em vez de
descrever a cor por extenso. Assim a legenda acompanha a paleta sozinha e
funciona sem depender de distinguir matiz. Não apliquei porque muda a
aparência de três telas no meio da validação do Codex.

### P2-2. Todos os avisos são cabeçalho de nível 2

- **Arquivo:** `src/components/barra-topo.tsx`
- **Elemento:** `SheetTitle` ("Notificações") é `h2`, e cada aviso dentro do
  painel também abre com `<h2>`.
- **Reprodução:** navegue pelos cabeçalhos com leitor de tela (tecla H) com
  o painel aberto: o título do painel e cada aviso saem no mesmo nível, sem
  indicar que os avisos estão dentro do painel.
- **Correção proposta:** avisos viram `h3`. Não apliquei junto porque é
  arquivo que o Codex mexeu por último (`1def126`) e a mudança é de
  estrutura, não de defeito funcional.

## Conclusão da tarefa

- **Navegação principal só com teclado:** funciona. Trilho e barra inferior
  são `<a>`/`<button>` de verdade, "Mais" é gatilho de gaveta com `autoFocus`,
  e o foco visível é global. Com o P1-1 aplicado, deixou de exigir a
  travessia da navegação inteira a cada página.
- **Modais prendem e devolvem o foco:** sim, por Radix (`Dialog`, `Sheet`) e
  Vaul (`Drawer`). Não há modal feito à mão nessas rotas.
- **Controles têm nome:** sim. As 14 suspeitas eram `<label>` por
  envolvimento. Botões de ícone têm `aria-label` com o nome do item.
- **Alvos de pelo menos 44 px:** sim, com a correção do P1-3. Foi o único
  abaixo do mínimo nas quatro rotas.

## Pergunta de produto

Nenhuma. Os dois P2 são decisões de execução, não de regra financeira —
mas deixei os dois para o Codex decidir quando aplicar, porque mexem em
telas que ele está validando agora.

# O que deixa o Tino menos bonito que Pierre, Meu Assessor e Calen

Pedido do Davi em 15/09/2026: achar por que o app ainda não tem o acabamento
das referências, o que dá para redesenhar, e o que torna o uso mais intuitivo —
usando shadcn/ui, que já está configurado neste projeto (43 componentes
instalados, base `radix`, Tailwind v3, ícones `lucide`).

**Estado em 15/09/2026, fim do dia:** itens 1, 2, 3, 4, 5 e 7 feitos; 8 e 9
já estavam resolvidos e não precisaram de código; o 6 foi **descartado**, com
o motivo escrito abaixo. Antes de qualquer um deles veio a escala de espaço,
raio e letra, que é o que mais mudou a sensação de acabamento.

## O diagnóstico, olhando a tela

A captura de `/painel` mostra o problema em uma frase: **tudo tem o mesmo
peso visual**. Sete retângulos empilhados, todos com o mesmo cinza, a mesma
borda de 1px e o mesmo raio. A tela não tem primeiro plano.

Nas três referências o acabamento vem de três coisas que o Tino não faz:

1. **Variação de superfície.** Elas alternam escuro, um painel claro e um card
   branco. O branco é reservado ao que importa (o card de cobrança do Meu
   Assessor, o bloco de agenda do Calen). No Tino, branco não aparece em lugar
   nenhum dentro do app.
2. **Menos rótulo, mais número.** O Tino escreve `RESULTADO DE SETEMBRO DE
   2026`, `ENTROU`, `SAIU`, `SAÚDE`, `CRÉDITO`, `FATURA ATUAL`, `FECHA`,
   `VENCE`, `OUT/26 · PREV.`, `ANTES DE ENTRAR NO SALDO`, `TOTAL` — onze
   rótulos em caixa alta numa dobra só. As referências usam dois ou três.
3. **Respiro e raio.** Cantos de 20–24px, sombra suave, espaço generoso entre
   blocos. O Tino usa raio menor e blocos colados, o que lê como painel
   administrativo, não como produto de consumo.

## Nove mudanças, da que mais rende para a que menos

### 1. Um primeiro plano por tela, e um só
O herói de `/painel` divide a dobra com uma faixa de alerta vermelha que
aparece **antes** dele. O olho bate no problema antes de saber a situação —
o contrário do princípio de tela.

**Proposta:** o alerta vira uma `Badge` dentro do próprio herói ("falta
dinheiro em março"), não uma faixa acima dele. Uma coisa grande por dobra.

### 2. O herói fica só com a resposta
Hoje ele carrega o número grande **e** três colunas (entrou, saiu, saúde) na
mesma linha. As três são insumo e roubam a metade direita.

**Proposta:** número e frase ocupam a faixa inteira; entrou/saiu/saúde descem
para uma linha de apoio discreta ou para o `<Detalhe>` que já existe.

### 3. Trazer o claro para dentro do app
O `.lp-painel-claro` da vitrine é o bloco de que o Davi mais gostou, e ele não
existe dentro do produto.

**Proposta:** um `Card` de superfície clara para **um** bloco por tela — a
ação recomendada no painel, a dívida da vez em `/dividas`, a próxima fatura em
`/cartoes`. Contraste recalculado, texto preto sobre claro.

### 4. Cortar metade dos rótulos em caixa alta
`FATURA ATUAL R$ 579,00` vira `R$ 579,00` com `fatura de outubro` embaixo, em
caixa normal. `FECHA dia 28 · VENCE dia 6` vira `fecha em 13 dias`.

Vale a regra de 14/09: rótulo curto e número, instrução no lugar de
justificativa.

### 5. O cartão de crédito parecendo cartão
As linhas de cartão hoje são retângulos com um logo redondo. As referências
mostram o cartão com a cor da bandeira e profundidade.

**Proposta:** manter a cor da instituição, subir o raio, e mostrar **uma**
informação por cartão (a fatura), com o resto atrás do toque.

### 6. ~~Gráfico do shadcn~~ — DESCARTADO ao abrir o código

A proposta partia de uma leitura errada. O Tino **já tem gráfico de verdade**:
`src/components/graficos.tsx` são 863 linhas sobre Recharts, com oito gráficos
já ajustados à linguagem visual daqui. O que o `chart.tsx` do shadcn
acrescentaria é a convenção de tema e de tooltip — que esta base já implementou
do seu jeito.

E há um motivo registrado para não voltar atrás na faixa de categorias do
painel: ela já foi rosca do Recharts e nascia com largura zero no celular,
deixando meia tela preta. Trocar de volta seria reintroduzir um defeito
conhecido para ganhar consistência de biblioteca — troca ruim.

### 7. Consertar a navegação duplicada — **é defeito, não estilo**
A barra lateral mostra o núcleo (Início, **Extrato**, Cartões, Perfil) e, logo
abaixo, os grupos (**Extrato**, Planejar, Dívidas, Analisar, **Ajustes**).
Resultado: "Extrato" aparece duas vezes, e `/configuracoes` é alcançável por
três rótulos diferentes — "Perfil", "Ajustes" e "Configurações".

**Proposta:** núcleo e grupos param de se repetir; `/configuracoes` tem um
nome só.

### 8. ~~Sheet para tarefa curta~~ — já resolvido, sem código novo

Ao conferir: anotar gasto já abre em diálogo pelo botão "+", e editar
lançamento já é edição no lugar (`EditavelTexto`/`EditavelMoeda`), que é ainda
melhor do que abrir painel. Trocar por `Sheet` seria mexer no que funciona.

### 9. ~~Estados vazios~~ — já cobertos

Varredura nas 27 rotas: só três telas têm `.map()` sem tratamento de vazio, e
as três são cálculo (projeção, finanças da loja) ou delegam para um componente
que já tem o estado vazio (`/cartoes`). O `Vazio` aparece em 48 lugares.

## O que usar do shadcn, tela a tela

| Tela | Componente | Para quê |
|---|---|---|
| `/painel` | `Card` claro + `Badge` | um primeiro plano, alerta como etiqueta |
| `/painel`, `/analise` | `Chart` | gráfico de verdade no lugar de barra na mão |
| `/cartoes` | `Carousel` ou `ToggleGroup` | trocar de cartão sem recarregar |
| `/transacoes` | `Sheet` | editar lançamento sem sair da lista |
| `/capturas` | `Empty` | fila vazia dizendo o que fazer |
| formulários | `Field` + `FieldGroup` | já instalado, usado em poucas telas |
| `/metas`, `/dividas` | `Progress` | régua de progresso no padrão |

## Ordem sugerida

1. **Defeito de navegação (item 7)** — é bug, não gosto.
2. **Itens 1, 2 e 4 no `/painel`** — a primeira tela é a que forma opinião.
3. **Item 3 (superfície clara)** — é o que mais muda a sensação de acabamento.
4. **Item 6 (gráficos)** — trabalho maior, ganho grande em `/analise`.
5. O resto, conforme as telas forem tocadas.

## Regras que continuam valendo

Verde da marca só no dado e com texto preto; contraste calculado, nunca no
olho; nenhuma tela inventa dado; e o princípio de `docs/PRINCIPIO-DE-TELA.md`
manda em qualquer tela tocada.

# Fila pedida pelo Davi em 14/09/2026

Registro do que foi pedido durante a sessão, na ordem em que chegou, para
nenhuma peça se perder quando o terminal fechar.

## 1. Refazer os sete achados P1/P2 do relatório sênior — em andamento

| # | Achado | Estado |
|---|---|---|
| 4 | Projeção partia do patrimônio, não do caixa | **feito** — `lib/saldo-disponivel.ts`, painel mostra "aplicado" ao lado do disponível, 9 testes |
| 3 | Compra de cartão sem competência de fatura | **feito** — regra ligada nas duas entradas, com ajuste manual no formulário |
| 1 | Captura confirmada pode ser descartada | **feito** — `lib/captura/transicoes.ts`, 6 testes |
| 2 | Dedup engole compra legítima | **feito** — identidade de evento nos três transportes |
| 5 | Orçamento herda valor legado em mês sem plano | **feito** — `lib/orcamento-cartao.ts`, regra única com a API, 4 testes |
| 6 | Categoria entra com R$ 10; campo reformata a cada tecla | **feito** — entra com zero, continua editável em zero, campo preserva o texto digitado |
| 7 | Detalhe de parcela não acompanha o mês | **feito** — o detalhe segue o mês da tela e marca o que está fora dele |

## 2. Mobile — em andamento

- **Feito:** o vão preto em volta da rosca de "Para onde foi". A grade da seção
  recebia `flex:1` e `align-items:center`, então esticava para preencher a
  coluna e centralizava um desenho de 200px numa faixa bem mais alta. No
  celular isso virava meia tela vazia. Também travei o rótulo "gasto até hoje"
  em uma linha.
- **A conferir:** a captura que o Davi mandou é de `tino-kappa.vercel.app`, que
  está atrás do local. Parte do que aparece nela pode já não existir no código
  de hoje. Falta comparar depois de publicar.

## 3. Calendário na tela de transações — feito em 14/09

Pedido em 14/09 com captura de referência (app roxo). Entregue:

- Faixa de sete dias (domingo a sábado) com setas de semana, o dia escolhido
  preenchido e hoje sublinhado — dois sinais diferentes porque podem coincidir.
- Ponto sob o número nos dias que têm lançamento. Os pontos vêm de uma consulta
  agregada do mês (`GET /api/transacoes/dias`), não da lista: a lista é paginada
  de 25 em 25 e metade do mês ficaria sem ponto até alguém rolar.
- Alternância Dia/Mês. Tocar num número já entra no modo Dia — alternar à mão
  depois de escolher o dia seria um passo a mais para o óbvio.
- `GET /api/transacoes` passou a aceitar `dia=AAAA-MM-DD`.
- Trocar o mês leva a faixa junto, e escolher um dia de outro mês troca o mês.

Sete dias por vez, e não o mês inteiro em grade: no celular 35 células empurram
os lançamentos para fora da tela, que é o que a pessoa veio ver.

`lib/semana.ts` com 6 testes (virada de mês, virada de ano, bissexto). A SQL
agregada foi executada contra o banco real: 6 dias com movimento em setembro.

**Não conferido em tela** — o Davi pediu para não abrir o navegador.

## 4. Lista de recursos das imagens 1 e 3 — a decidir

O Davi mandou duas telas de plano (app roxo) dizendo que quer "tudo isso
funcionando no sistema também":

1. Sincronização automática com bancos via **Open Finance**
2. Assistente de **IA** com chat e insights
3. Faturas de cartão com **tendência real e projetada**
4. **Saldo previsto** e projeção diária antes das contas vencerem
5. **Calendário financeiro** com receitas, despesas e recorrências
6. **Perfis financeiros** (pessoal, família, PJ)
7. **Metas e investimentos** no mesmo planejamento
8. **Relatórios** de patrimônio, ritmo e taxa de poupança
9. **Suporte direto** dentro do app
10. Agenda de 30 min com o time

**Isto não é uma tarefa, é um roteiro de produto.** Vários itens já existem em
alguma forma no Tino (projeção, metas, relatórios, tendência de fatura);
outros, como Open Finance, dependem de credencial de instituição e contrato,
não de código. Antes de começar qualquer um, é preciso separar "já existe",
"dá para fazer sozinho" e "depende de terceiro" — e o Davi escolhe por onde
começar. Ver `docs/PESQUISA-OPEN-FINANCE.md`, que já levantou parte disso.

## 5. ARCA com a carteira real — feito em 14/09

O pedido foi: renda fixa, renda variável e as outras classes que formam a ARCA,
com o app ajudando quem segue o método.

A tela só dividia um valor em quatro partes iguais — isso responde "quanto é um
quarto disso", não "onde eu ponho o dinheiro deste mês". O método vive do
reequilíbrio pelo aporte, e para isso precisa olhar o que a pessoa já tem.

- `ClasseDeAtivo` no schema: ações, FII, renda fixa, caixa, internacional,
  cripto e outros. Renda fixa e caixa são classes separadas na carteira e somam
  juntas na letra C — um CDB de dois anos e o dinheiro rendendo CDI cumprem o
  mesmo papel na divisão e papéis diferentes na vida.
- `posicaoDoArca` lê a carteira contra o alvo de 25% por letra. Cripto e outros
  ficam fora da conta do método (ele tem quatro classes e não diz o que fazer
  com o resto) e aparecem somados à parte.
- `aporteQueReequilibra` distribui o aporte para as letras mais atrasadas
  primeiro, e só divide igual quando a carteira já está no alvo. 8 testes,
  incluindo o de não perder nem sobrar centavo.
- Cada investimento escolhe sua classe no próprio cartão; sem classe, ele
  aparece na carteira e fica fora da conta do método, com aviso.

Continua sendo aritmética: o método é de terceiro e está identificado na tela, e
o app não escolhe ativo nem indica corretora.

**Não conferido em tela** — o navegador desconectou antes.

## 6. Assistente de investimento com objetivo — feito em 14/09

Pedido: em Investimentos, uma ajuda que **olhe as contas**, ajude a definir
**quanto separar para investir** como objetivo, e então **indique a porcentagem
para seguir o ARCA**; e o simulador mostrando o resultado da simulação.

É o mesmo desenho da Ajuda do cartão (situação → ajuste simples → ação
persistida → progresso), aplicado ao investimento:

1. **Situação** — quanto entra, quanto sai, quanto sobra hoje, e o que já está
   aplicado. Tudo isso já existe no `panorama`.
2. **Objetivo** — a pessoa escolhe quanto separar por mês. Precisa virar dado
   guardado, não estado de tela: hoje não existe "meta de aporte mensal" no
   schema.
3. **Divisão** — `aporteQueReequilibra` já responde onde entra o dinheiro, com
   a carteira real. Está feito e testado.
4. **Resultado** — a projeção do simulador com esse aporte aplicado. O
   `efeitoDoCorte` já existe e faz exatamente essa conta para corte de gasto;
   falta ligar ao aporte.

**Decidido pelo Davi: meta nova.** Entrou o modelo `ObjetivoDeAporte`, um por
lar, com valor mensal e prazo. É separado de `Meta` porque responde outra
pergunta: `Meta` é "quero juntar X até tal data", com alvo, prazo e saldo; o
objetivo de aporte é um hábito mensal sem fim marcado.

A tela ficou nas três perguntas, nessa ordem: **quanto separo por mês** (o
objetivo, gravado), **onde entra** (o ARCA reequilibrando pela carteira real) e
**no que dá** (patrimônio no prazo, a 4% ao ano acima da inflação).

API em `/api/investir/objetivo`, com GET, PUT e DELETE — desistir do objetivo é
uma decisão como qualquer outra e precisa de saída.

## 7. Orçamento de casal — pedido em 14/09, a fazer

Pedido do Davi, com as três modalidades que ele conhece:

> "Crie uma parte para casais fazerem os orçamentos, normal e de cartão, dos
> gastos que combinarem. Tem a modalidade que paga proporcional ao salário,
> outra metade/metade, e outra que eu uso: tem a mesada de cada um e o gasto do
> casal. Entra como categoria."

### As três formas de dividir

1. **Metade/metade** — cada um paga 50% do gasto combinado.
2. **Proporcional à renda** — quem ganha mais paga mais, na proporção das
   rendas. Já existe `ratearPorPeso` em `lib/dinheiro.ts`, que é exatamente
   essa conta e já tem teste.
3. **Mesada + gasto do casal** — a que o Davi usa. Cada um tem um valor livre
   ("mesada") e o resto é pote comum. O gasto do casal **entra como categoria**,
   e não como pessoa: é isso que faz a divisão funcionar no extrato que já
   existe.

### O que ainda não existe no app

- Quem é o casal. Hoje há `Membro` dentro do `Lar`, mas não há "estes dois
  dividem despesa" nem a renda de cada um guardada para a proporcional.
- A marcação do que é combinado. Pela frase do Davi, a saída é **categoria**:
  uma categoria (ou marca) "casal" separa o gasto compartilhado do individual,
  sem inventar entidade nova.
- O acerto do mês: quanto cada um pôs, quanto devia pôr, quem deve a quem.

### Decisões que dependem do Davi

- A divisão vale para **o lar inteiro** ou é escolhida **por categoria** (ex.:
  mercado metade/metade, aluguel proporcional)?
- A **mesada** é um limite de gasto individual ou uma transferência de verdade
  entre as contas?
- O acerto é **mensal** (fecha e alguém paga a diferença) ou **contínuo** (o
  saldo entre os dois vai rolando)?

Sem isso, qualquer implementação vira chute sobre como o casal dele vive.

## Landing refeita (14/09, fim do dia) — FEITO

Pedido: "refaca a landpage, com os celulares com as imagens atualizadas. e
tire o leao do lado do celular."

Feito em `29526fe`, no ar em https://tino-kappa.vercel.app.

- O celular deixou de mostrar PNG. Os tres prints eram de 09/09, de antes de
  todo o redesign — mostravam telas que o app nao tem mais. Print tambem
  borra em tela densa e envelhece na proxima mudanca de skin.
- O miolo agora e HTML (`src/app/(site)/tela-no-celular.tsx`), montado sobre o
  bloco `.cel-*` de `vitrine.css`, que ja existia completo e estava sem
  nenhum consumidor (o TSX tinha sumido em alguma reversao).
- Tres telas: inicio, extrato e cartoes, com os numeros da conta de
  demonstracao.
- O leao ao lado do celular saiu, com as regras de CSS dele. O leao da marca
  (cabecalho, rodape, CTA final) continua.

Nao foi possivel tirar screenshot de 390px nesta maquina: redimensionar a
janela nao muda o viewport de verdade (ja registrado na memoria), e o
renderizador travou/caiu nas tentativas de capturar o app dentro de um
iframe de 390px — a maquina esta com pouca memoria livre. O HTML resolve
isso de vez: nao ha mais imagem para reatualizar a cada mudanca de tela.

## O celular anima com o scroll (14/09) — FEITO

Pedido: animacao no celular da landing que envolvesse a pessoa enquanto ela
rola, na linha do shot do Dribbble "Landing Page Animation for AI Video
Production Platform".

Como ficou: o celular fica preso na tela (trilho de 320vh com `sticky`) e a
rolagem e que conduz. Ela entra deitado e de longe e vai levantando; os
cartoes flutuantes aparecem; e cada terco do trilho troca a tela do app
(inicio, extrato, cartoes), junto com a legenda ao lado e o item aceso na
barra de baixo. Os botoes continuam funcionando: clicar leva a rolagem ate o
trecho daquela tela, em vez de brigar com o scroll um passo depois.

Sem biblioteca de animacao: uma variavel de CSS atualizada dentro de
`requestAnimationFrame`. Quem pediu `prefers-reduced-motion` nao ganha
trilho nenhum — a secao vira um bloco comum e a troca fica so nos botoes.

A conta toda vive em `src/lib/palco-do-produto.ts`, com 11 testes. Ficou
fora do componente de proposito: **nao deu para ver a animacao rodando**. O
Chrome desta maquina so tem janela minimizada, e janela minimizada nao
recebe evento de scroll nem `requestAnimationFrame` (`visibilityState:
"hidden"`), entao o unico jeito de provar a regra era testando ela sozinha.
Provado no navegador, isso sim: o `transform` de entrada interpola, o clique
troca tela, legenda, aba acesa e `aria-pressed`, e o palco encolhe para
caber em janela baixa (0,678 numa janela de 611px).

**Para o Davi conferir:** abrir a janela do Chrome (nao minimizada) em
localhost:3000 deslogado e rolar. E o unico ponto sem prova visual.

## Movimento da vitrine na linha do shot "Samurai" (14/09) — FEITO

Davi mandou o video do shot do Dribbble (fintech, claro, indigo). O que
carrega aquele video nao e a paleta, e o movimento — tres coisas:

1. **O titulo chega desfocado, palavra por palavra.** Nao e fade: a palavra
   parece se formar. `PalavrasQueChegam` quebra o titulo em palavras no DOM
   depois da montagem, e nao no JSX, porque os titulos da vitrine tem `<br/>`
   e `<span>` no meio — assim nenhum deles precisou ser reescrito, e sem
   JavaScript o titulo continua inteiro e legivel.
2. **O cartao entra vazio e o conteudo materializa depois**, escalonado.
   Virou regra do `[data-reveal]` que ja existia, entao valeu para a vitrine
   toda de uma vez.
3. **O numero rola ate o valor.** `NumeroQueSobe`, nos precos dos planos.
   Comeca renderizado com o valor certo e so entao anima: sem JavaScript, o
   que fica na tela e o preco, nao um zero.

A conta esta em `src/lib/animacao-de-entrada.ts` com 8 testes. Dois detalhes
que so aparecem em uso: o atraso por palavra tem teto (titulo longo teria a
ultima palavra chegando depois que a pessoa ja rolou embora) e o contador
fecha no alvo exato (parar em "R$ 8.599,98" por arredondamento e pior que
nao animar).

**Bug pego no caminho:** em desenvolvimento o React monta o efeito duas
vezes, e a segunda passada quebrava em palavras o que a primeira ja tinha
quebrado, aninhando caixa dentro de caixa. Travado.

**Sem prova visual de novo, e pela mesma razao:** a janela do Chrome desta
maquina so existe minimizada, e aba oculta nao roda transicao, nem
`IntersectionObserver`, nem `setTimeout`. Provado no DOM: o estado "fora" da
blur(12px) e opacidade 0, o estado "dentro" da texto limpo, os atrasos saem
escalonados (135ms na quarta palavra) e nao ha mais aninhamento.

## Celular com a tela real, e o palco de volta (14/09, noite) — FEITO

Dois pedidos, com duas imagens: a cena de cartoes flutuantes ("faca com
coisas do site") e o celular ("tem que ter animacao tambem, e a tela ser a
mesma que realmente e").

**A cena ja existia quando cheguei.** Outra sessao de agente commitou em
paralelo `cena-financeira.tsx` (`7fb4631`, "apresenta produto em cena
tridimensional") — que e exatamente a primeira imagem. Eu tinha construido
uma `mesa-de-cartoes` para a mesma coisa. **Joguei a minha fora** em vez de
subir as duas: duas cenas 3D na mesma pagina competiriam entre si, e a que
ja estava commitada e a que o Davi ja tinha visto. Nao mexi na deles.

**O que faltava mesmo era o celular.** O commit da cena tinha tirado o
`PalcoDoProduto` da pagina — ou seja, a animacao de rolagem que eu havia
feito de manha nao estava mais no ar. Recolocado logo depois da cena, com o
trilho encurtado de 320vh para 240vh (a cena ja segura a pessoa antes; os
dois trilhos somados arrastavam).

**A tela agora e a que realmente e.** Antes o miolo do celular era uma
aproximacao escrita de cabeca. Agora cada rotulo e cada numero veio da tela
real rodando com a conta de demonstracao — entrei por `curl` com
`demo@tino.local` e li o HTML de `/painel`, `/transacoes` e `/cartoes` e a
API de transacoes:

- Inicio: "Resultado de setembro de 2026", R$ 4.436,00, "Saldo disponivel:
  R$ 15.166,00 · aplicado: R$ 17.500,00", Entrou/Saiu/Saude 76, "Credito ·
  Cartoes e faturas" com Platinum (final 8842, R$ 579,00) e Gold (final
  3317, R$ 140,00), "Este mes · Para onde foi" com R$ 4.024,00 gasto ate
  hoje e as categorias de verdade (Aluguel e condominio R$ 2.025, Educacao
  R$ 780, Plano de saude R$ 640, Supermercado R$ 326).
- Extrato: a fita da semana (dom 13 a sab 19), os tres totais, e os
  lancamentos reais agrupados por dia.
- Cartoes: fatura de set/26, limite de R$ 12.000,00, as faturas por mes com
  previsto listrado, e as duas compras do mes.

Os dois cartoes flutuantes que sobravam ao lado do celular sairam: a cena da
abertura ja faz esse papel, e melhor.

**No celular (mobile):** o trilho continua em 250vh com `sticky`, e o palco
inteiro passou a reservar 240px em vez de 170px quando a tela e estreita —
no aparelho a legenda ocupa mais altura, e sem isso o celular ficava maior
que o espaco que sobrava.

Sem prova visual, mesma razao das rodadas anteriores (janela do Chrome so
existe minimizada; aba oculta nao roda transicao, nem observador, nem
temporizador). Conferido no HTML servido: a cena abre, o palco voltou, as
tres telas reais estao la e nao sobrou nada da mesa descartada.

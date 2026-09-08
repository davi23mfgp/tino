# Prompt de redesign — direção "Calen" (menos técnico, menos esforço)

Escrito em 07/09/2026, noite, a partir da análise minuciosa de 36 screenshots
do app concorrente **Calen** (`C:\Users\iasdn\Downloads\Screenshots.rar`,
extraídos em análise, arquivo original preservado) + do pedido direto do Davi:

> "ainda muito carregado, acho que dava para otimizar e deixar menos técnico
> de primeira e depois a pessoa que quiser mais pode ir mais fundo. Eu me
> preocupo com pessoas mais simples mexendo, e me preocupo na praticidade,
> quero que a pessoa tenha o mínimo de esforço possível, que seja só ver as
> coisas na maior parte e não ficar atualizando toda hora."

Este documento é o **prompt pronto para dar a um agente de execução**
(ou pra você revisar antes) — ainda não foi disparado. Motivo de não disparar
na hora: outro agente está mexendo em `barra-topo.tsx`/`navegacao.tsx`/
`globals.css` nesta mesma branch (notificações, pílulas no sidebar, cor em
números/gráficos) — rodar os dois em paralelo colidiria linha a linha nos
mesmos arquivos. Disparar depois que aquele fechar.

---

## O problema, na visão do Davi

Tino hoje pede esforço demais de quem só quer "ver que tá tudo bem" — muita
informação simultânea, terminologia técnica (categorias, regras, tags,
consolidador), navegação com muitos itens de peso igual. Isso afasta quem
não é fundo em finanças e cansa quem só quer checar rápido.

## O que o Calen faz que resolve isso (evidência das 36 imagens)

1. **Navegação em duas camadas, não uma.** Rodapé fixo com só 4 itens
   (Início / Calendário / Contas / Perfil) — tudo que uma pessoa comum
   precisa 95% do tempo. Um menu hambúrguer separado guarda o resto, mas
   AGRUPADO por intenção, não por ordem alfabética nem por quando foi
   construído: **Planejar** (Fluxo, Metas, Lembretes), **Analisar**
   (Categorias, Investimentos, Empréstimos, Ocultos), **Ajustes**
   (Conexões, Regras, Consolidador, Suas categorias, Tags, Notificações,
   Configurações), **Sua conta** (Novidades, Vídeos, Indicação, Suporte,
   Perfil). Quem nunca abre o hambúrguer nunca vê "Consolidador" ou "Tags"
   — não é feature escondida, é feature adiada até ser pedida.
2. **Avisa em vez de esperar ser checado.** Exemplos reais de notificação
   do onboarding: *"Seu saldo fica no vermelho dia 27 — Faltam R$ 340 pra
   fechar o mês. Ainda dá tempo de ajustar."*, *"Gasto fora do padrão — R$
   480 em Mercado esta semana, o dobro do normal."*, *"Sua semana pela
   frente — 3 contas vencem até domingo, somando R$ 1.120."* — frase
   pronta com o número já calculado, nunca "vá conferir seu extrato". Tem
   uma tela própria de preferência ("Central de Notificações — escolha o
   que você quer receber"), pra pessoa dosar sem desinstalar o recurso
   inteiro.
3. **Copy em português de conversa, nunca jargão.** "O que mais te
   preocupa hoje?", "Suas compras viram categorias sozinhas", "Veja
   quanto vai sobrar no fim do mês", "Isso tudo se preenche sozinho" —
   nunca "categorização automática de transações" ou "sincronização de
   dados bancários". Toda tela nova explica o que ganha, não como
   funciona por dentro.
4. **Um card, uma ideia.** Nenhuma tela empilha três conceitos.
   Onboarding é uma pergunta grande por tela (com botão "Continuar"
   sempre no mesmo lugar). Números grandes (28-40px) com um rótulo
   pequeno em caixa alta acima — nunca uma tabela densa como primeira
   coisa a aparecer.
5. **Automação é o herói, não um checkbox.** Toda etapa do onboarding e
   toda tela vazia empurra pra conectar o banco ("Conecte seu banco e
   isso tudo se preenche sozinho") — o caminho manual existe (formulário
   de "Nova transação" completo, bem feito) mas nunca é a primeira opção
   mostrada.
6. **Cor com função, não decoração.** Um roxo só (marca/ação), e cor real
   só onde o dado É a cor: receita=verde, despesa=vermelho, saldo
   projetado=azul, e a roda de categorias (multi-hue, porque categoria É
   multi-valor por natureza). Resto da UI é preto/cinza/branco.
7. **Adicionar dado é rápido**: um botão + fixo (roxo, canto inferior
   direito) abre direto um menu de 4-5 ações (Transferência/Receita/
   Despesa/Despesa cartão/Calen IA) sem navegar pra outra tela primeiro.

## ATUALIZAÇÃO (mesma noite, mais tarde): Davi quer parecido de verdade

Davi confirmou: **"quero que seja o mais parecido possível com o Calan,
tudo bem fácil de navegar e intuitivo"** — isso substitui a ressalva
"não é reskin de cor" abaixo. Não é só estrutura/copy: é visual também,
inclusive tema escuro por padrão. Mantenha a identidade só onde o Calen
não define nada (nome, logo, mascote) — o resto (cor de fundo, cor de
ação, tipografia grande e arredondada, cards com cantos bem generosos,
escala de tamanho de fonte) mira o Calen de propósito.

**Correção de cor (mensagem seguinte do Davi, ainda mais tarde):** o
Calen de verdade usa roxo/violeta como acento (ver evidência acima, item
6 e 7) — o Tino usa **verde** no lugar disso, não roxo. É a única
diferença de cor deliberada em relação à referência; tudo o resto do
visual mira o Calen o mais próximo possível. Calcule o verde por
contraste de verdade (mesmo método OKLab já usado nesta branch), não
copie um verde qualquer no olho. Os números coloridos (receita=verde,
despesa=vermelho, saldo=azul) já decididos hoje continuam — cuidado pra
não colidir o verde de marca com o verde de "receita" a ponto de ficar
ambíguo qual é qual; se precisar, diferencie por tom/saturação.

**Mobile é escopo igual, não secundário** (mensagem seguinte do Davi):
"quero que fique o mais parecido possível com o Calen, e o mobile
também". As 36 imagens de referência SÃO de um app mobile (Android) —
usar isso a favor: o padrão de navegação em duas camadas, o botão + fixo
de ação rápida, a folha inferior (bottom sheet) pra formulário de
transação, tudo isso é literalmente o design mobile do Calen, replicar
de verdade no breakpoint mobile do Tino (não só adaptar o desktop pra
caber). Testar em largura de ~390px é obrigatório antes de fechar,
igual já foi feito na rodada de skin anterior.

**A partir daqui é autônomo até o fim** (mensagem seguinte do Davi, foi
dormir): não parar pra perguntar nada que não seja genuinamente decisão
dele. Terminar a missão inteira antes de considerar concluído.

## Tradução pro Tino — o que pedir ao agente de execução

Reestruturação de **hierarquia de informação e navegação** (prioridade 1,
é o que resolve "difícil de navegar") + **visual o mais próximo possível
do Calen** dentro do que já existe de arquitetura (shadcn/Tailwind) +
ajuste de copy. Puxe estrutura, interação E visual do Calen; NÃO copie
negócio (Calen e Tino são concorrentes diretos, então a maioria dos
conceitos já mapeia 1:1 — mas onde não mapear, não invente).

1. **Navegação em duas camadas.**
   - Nível 1 (sempre visível, poucos itens): equivalente a Início/
     Calendário-ou-Movimento/Contas/Perfil. Decidir com base no que já
     existe em `lib/navegacao-grupos.ts` qual é o núcleo de 4 que cobre
     "ver que tá tudo bem" sem abrir mais nada.
   - Nível 2 (atrás de um único ponto de entrada, agrupado por intenção,
     nãoztruído por ordem de criação): tudo que hoje está espalhado em
     grupos técnicos (Regras, Categorias avançadas, Consolidador-se-
     existir, Tags-se-existir) migra pra cá, em seções rotuladas tipo
     "Planejar"/"Analisar"/"Ajustes" — nomes claros pra quem não é do
     ramo.
   - A pílula de abas (Hoje/Movimento/Planejar/Dívidas/Futuro/Parecer)
     que o Davi já pediu pra mover pro sidebar entra nessa reestruturação
     — decidir junto, não em separado, pra não fazer duas passadas na
     mesma navegação.
2. **Avisos proativos.** O motor de vigias do Tino (`lib/tino/alertas.ts`,
   já existe) vira a base de notificações no padrão Calen: frase pronta
   com número já calculado ("Sobra R$ X este mês. A conta que mais dói é
   Y — Z% ao mês" já existe nesse formato em `/painel`, na "Visão geral"
   — POUCO trabalho: estender esse padrão de frase pra virar notificação
   push/e-mail de verdade, não só texto na tela que a pessoa precisa
   abrir o app pra ver). Ver se o Tino já manda algo por push/e-mail
   (checar `lib/` por integração de push/e-mail antes de propor canal
   novo — não inventar infraestrutura sem checar o que já existe).
   Tela de preferência ("o que você quer receber") é candidata nova, se
   não existir equivalente.
3. **Copy**: revisão de rótulos técnicos pra linguagem direta, tela por
   tela — sem trocar o significado nem a lógica, só a palavra. Não é
   varredura mecânica (lembrar do episódio de 04/09 — não apagar/reescrever
   em massa sem necessidade real); é revisão pontual dos rótulos que soam
   a jargão (ex.: nomes de tela no menu, rótulos de campo em formulário).
4. **Um conceito por tela/card**: onde uma tela do Tino empilha muita
   coisa (o `painel` já foi reordenado uma vez pra isso, checar se ainda
   se aplica em outras: `/regras`, `/configuracoes`), considerar dividir
   em passos ou esconder o avançado atrás de "mostrar mais".
5. **Automação em primeiro plano**: o Tino já tem Open Finance
   (`docs/` deve ter isso documentado) — conferir se a oferta de conectar
   banco aparece cedo o bastante e com a mesma linguagem tranquilizadora
   do Calen ("regulado pelo Banco Central", "você desconecta quando
   quiser") nos lugares onde falta.
6. **Adicionar transação rápido**: conferir se o Tino já tem atalho
   equivalente ao botão + do Calen (FAB com menu de ações) — se não
   tiver e fizer sentido no layout web (pode ser um padrão mais de app
   mobile que não cabe 1:1 num dashboard largo), avaliar antes de forçar.

## O que NÃO fazer

- Não inventar canal de notificação push/e-mail do zero sem checar o que
  já existe — é trabalho de infraestrutura real, não CSS.
- Não remover funcionalidade avançada — ela muda de LUGAR (fica atrás de
  um clique a mais), não de existência.
- Não fazer isso ao mesmo tempo que outro agente mexe nos mesmos arquivos
  de navegação — sequenciar.

## Verificação esperada

Igual ao padrão já usado nesta branch: `tsc`, `next build`, `npm test`,
`npm run test:fumaca`, curl/servidor real com sessão demo, registro em
`docs/REDESIGN-EM-CURSO.md`, commits pequenos e frequentes com push
automático.

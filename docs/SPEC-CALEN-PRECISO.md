# Spec preciso — Tino igual ao Calen, tela por tela

Escrito em 07/09/2026, ~23h, DEPOIS de auditar o Tino rodando ao vivo
(`localhost:3000`, sessão `demo@tino.local`, tema escuro, 1356px) e comparar
com as 36 telas do Calen em
`C:\Users\iasdn\AppData\Local\Temp\claude\C--Windows-System32\9456790e-5afd-4d4e-9e4c-bcdf98f7890a\scratchpad\screenshots-ref\`.

**Por que este documento existe:** a rodada anterior passou em todo teste
automático e mesmo assim o Davi olhou e disse *"ainda tem muita parte
técnica e não está idêntico ao Calen"*. Teste verde não prova parecença
visual. Este spec troca princípio por número, e exige comparação com
screenshot como critério de pronto.

---

## PARTE 1 — O diagnóstico, com evidência

Achados olhando a tela de verdade, não o código:

### 1.1 O Tino fala como contador, o Calen fala como amigo
O painel abre com **duas frases longas de jargão**:

> "Sobra R$ 5.856,00 este mês. A conta que mais dói é conta corrente —
> cheque especial, a 7,80% ao mês."
> "Ataque primeiro Conta corrente — cheque especial: é o juro mais alto da
> fila (7,80% ao mês). Cada real jogado aí rende mais que em qualquer outra
> dívida sua."

O Calen, na mesma posição, mostra **um número grande e três palavras**:
`GASTO EM SET` / `R$ 0,00`. A explicação, quando existe, é uma linha curta
("+2 vs. ontem", "3 contas vencem até domingo, somando R$ 1.120").

Outros textos de contador achados no Tino, todos na primeira dobra:
- "Somando contas correntes, poupança e dinheiro. Cartão não entra: limite não é seu."
- "DESCONTANDO O QUE VOCÊ DEVE" seguido de "Fatura de cartão em aberto" e "Dívidas em aberto"
- "O mês mais pesado à frente leva R$ X só em parcelas já compradas — esse valor sai antes de qualquer gasto novo."
- "N lançamento(s) sem categoria. Corrigir uma vez ensina o Tino para sempre."

### 1.2 Número pequeno, texto grande — invertido
No Tino o texto explicativo é 22px e o número de KPI é ~20px dentro de
caixinha apertada. No Calen é o oposto: número **34-40px**, rótulo **10-11px**
maiúsculo, explicação **11-12px** cinza.

### 1.3 Cabeçalho translúcido deixa o conteúdo vazar por trás
Rolando o painel, o texto passa **por baixo** do cabeçalho e continua
legível através dele (vi "R$ 16.586,00" cortado atrás da barra). O Calen usa
cabeçalho opaco. Isso sozinho já faz parecer "quebrado".

### 1.4 Trilho lateral só com ícone, sem rótulo
4 ícones sem texto na lateral. O Calen **sempre** mostra ícone + rótulo
("Início", "Calendário", "Contas", "Perfil"). Ícone sozinho não é intuitivo
pra quem o Davi quer atender.

### 1.5 Linhas de lista sem identidade visual
"Centauro / Padaria Real / Assai Atacadista" são linhas de texto puro. No
Calen toda linha tem **círculo de 40-48px com ícone** à esquerda, o que dá
ritmo e deixa escanear sem ler.

### 1.6 Categoria como barra fina
O Tino usa barrinha de progresso. O Calen usa **rosca (donut) com segmento
colorido por categoria e ícone dentro do segmento**, com o total no centro
("R$ 3.828,40 / gasto até hoje · 6 categorias").

---

## PARTE 2 — Valores exatos (copiar, não interpretar)

### Escala de tipo
| Papel | Tamanho | Peso | Extra |
|---|---|---|---|
| Número herói (saldo/gasto do mês) | 36px (mobile 30px) | 700 | `leading-none tracking-tight` |
| Rótulo acima do número | 11px | 600 | `uppercase tracking-[0.14em]`, cor `muted` |
| Linha de apoio sob o número | 12px | 400 | cor `muted`, **máx. 8 palavras** |
| Título de card/painel | 15px | 600 | `tracking-tight` |
| Item de lista (nome) | 14px | 500 | |
| Valor em item de lista | 14px | 600 | tabular |
| Rótulo de navegação | 12px | 500 | sempre visível, nunca só ícone |

### Espaçamento e forma
- Respiro entre cards: **16px** (`gap-4`), nunca menos.
- Padding interno de card: **16px** mobile / **20px** desktop.
- Raio de card: **20px**. Raio de item interno: **12px**. Chip: pill.
- Círculo de ícone em item de lista: **40px** mobile / **44px** desktop,
  ícone 18px dentro.
- Altura mínima de área tocável: **44px**.

### Cor (mantém o que já existe, só disciplina o uso)
- Acento verde/teal: só em ação primária, estado ativo de navegação e série
  principal de gráfico.
- Verde/vermelho: **só em valor com sinal**. Nunca em rótulo, nunca em ícone
  de navegação, nunca em borda de card.
- Categoria na rosca: paleta multi-tom já é legítima (categoria é
  multivalor), igual ao Calen.

---

## PARTE 3 — Reescrita de texto, string por string

Trocar exatamente isto (esquerda = hoje, direita = novo). Nenhuma mudança de
lógica, só o texto:

| Hoje | Novo |
|---|---|
| "A conta que mais dói é conta corrente — cheque especial, a 7,80% ao mês." | "Sua conta corrente é a dívida mais cara." |
| "Ataque primeiro X: é o juro mais alto da fila (Y% ao mês). Cada real jogado aí rende mais que em qualquer outra dívida sua." | "Pagar essa primeiro rende mais que qualquer outra." |
| "Somando contas correntes, poupança e dinheiro. Cartão não entra: limite não é seu." | "Conta, poupança e dinheiro. Cartão não entra." |
| "DESCONTANDO O QUE VOCÊ DEVE" | "O QUE VOCÊ DEVE" |
| "O mês mais pesado à frente leva R$ X só em parcelas já compradas — esse valor sai antes de qualquer gasto novo." | "Mês mais pesado pela frente: R$ X em parcelas." |
| "N lançamento(s) sem categoria. Corrigir uma vez ensina o Tino para sempre." | "N gastos sem categoria. Ajuste uma vez, o Tino aprende." |
| "Tirar a conta do negativo é a prioridade número um: o cheque especial cobra até 8% ao mês, mais que qualquer outra dívida sua." | "Sua conta está negativa. É o dinheiro mais caro que existe." |
| "No ritmo atual, o caixa fica negativo em MÊS (R$ X)." | "No ritmo de hoje, falta dinheiro em MÊS." |

**Regra geral para texto novo:** nenhuma frase de interface passa de **12
palavras**. Percentual e taxa saem da primeira dobra — vão para a tela de
detalhe. Nada de "cheque especial", "competência", "lançamento",
"categorização", "recorrência" na superfície principal: usar "conta no
vermelho", "mês", "gasto", "organizar sozinho", "conta que se repete".

---

## PARTE 4 — Anatomia por tela

### 4.1 Início (`/painel`) — a tela que mais importa
Ordem vertical obrigatória, de cima pra baixo:

1. **Cabeçalho opaco** (não translúcido), com saudação em 15px e o mês em
   12px. Sino + tema + perfil à direita. Nada mais.
2. **Herói**: rótulo 11px `SOBRA DESTE MÊS` + número 36px + linha de apoio
   ≤8 palavras. Um botão de ação primária abaixo (pill verde, 44px de
   altura).
3. **Fila automática** (capturas pendentes), se houver: card com título
   "Esperando você" + até 3 linhas **com círculo de ícone**, e um "ver
   tudo" discreto. Se vazio, o card não aparece — nunca mostrar card vazio.
4. **Quatro números do mês** em grade 2×2 no mobile e 4×1 no desktop, cada
   um: rótulo 11px, número 30px, seta de sinal. Sem borda extra, só card.
5. **Rosca de categorias** (substitui as barras finas): total no centro,
   segmentos coloridos com ícone, legenda embaixo em chips.
6. **Gráfico de evolução**: só isso, sem tabela ao lado.
7. Todo o resto (patrimônio detalhado, parcelas, mapa de calor,
   comparativos) sai da primeira tela e vira **"Ver mais detalhes"** →
   `/analise`. Quem quiser fundo, clica. Essa é a regra do Davi: simples
   primeiro, fundo depois.

### 4.2 Navegação
- Desktop: trilho com **ícone + rótulo 12px** visível, item ativo com
  fundo `primary/18` e borda interna 1px (já é o padrão do spec anterior).
- Mobile: barra inferior fixa com **4 itens ícone+rótulo** e o botão "+"
  central, exatamente como o Calen.
- Tudo que não é núcleo continua atrás de "Mais", agrupado.

### 4.3 Listas (transações, capturas, contas)
Toda linha: círculo de ícone 40-44px + nome 14px + subtexto 12px + valor à
direita 14px semibold com sinal colorido. Sem tabela, sem cabeçalho de
coluna.

---

## PARTE 5 — Open Finance (o pedido novo: "control c control v, do nosso jeito")

O Calen tem 3 telas para isso; clonar as três, com texto do Tino.

### 5.1 Tela de convite (clone de `Screenshot_20260907-205523`)
- Grade com **6 logos de banco** em quadrados brancos arredondados
  (Nubank, Itaú, Bradesco, Santander, C6, Inter) — usar SVG/ícone genérico
  se não houver direito de imagem; nunca inventar logo falso.
- Título: **"Pra saber se o dinheiro chega até o fim do mês, o Tino precisa
  ler seu extrato"**
- Apoio: **"Open Finance, regulado pelo Banco Central. A senha do banco não
  passa por aqui, e você desconecta quando quiser."**
- Botão primário: **"Conectar meu banco"**. Secundário, texto puro:
  **"Agora não"**.

### 5.2 Estado conectando / conectado
- Enquanto conecta: skeleton com "Buscando suas contas…".
- Conectado: lista de contas trazidas, cada uma com círculo de ícone, nome,
  tipo e saldo — igual à tela `Contas` do Calen
  (`Screenshot_20260907-205649`).

### 5.3 Faixa de convite persistente (clone da tarja laranja do Calen)
Quando **não** houver banco conectado, mostrar no topo do app uma faixa
discreta (não laranja gritante — usar superfície do Tino) com:
- **"Seu mês fecha sozinho quando o banco está conectado"** + botão
  **"Conectar"**. Fechável, volta em 7 dias.

### 5.4 O que implementar de verdade agora, e o que NÃO
**Implementar:** toda a interface acima, a rota/serviço com uma camada de
provedor (`lib/openfinance/provedor.ts`) que expõe
`iniciarConexao()/listarContas()/sincronizar()`, e uma implementação que:
- usa **Pluggy** quando `PLUGGY_CLIENT_ID`/`PLUGGY_CLIENT_SECRET`
  existirem no `.env`;
- e, quando **não** existirem, cai num modo claramente rotulado
  "ainda não configurado" que leva o usuário para o **import de arquivo
  OFX/CSV/PDF que já funciona hoje** — sem nunca inventar dado nem fingir
  conexão.

**NÃO implementar / NÃO fazer (regra dura):** criar conta na Pluggy,
aceitar termos, cadastrar cartão, gerar chave de API. Isso é ação de conta e
de dinheiro — só o Davi faz, acordado. Deixar no `.env.example` os dois
nomes de variável e uma linha no README dizendo onde ele cola.

---

## PARTE 6 — Como provar que ficou pronto (o passo que faltou antes)

Nenhum item acima conta como feito sem isto:

1. Abrir a tela no Chrome (extensão conecta nesta máquina), tirar
   **screenshot real**.
2. Abrir o screenshot correspondente do Calen na pasta de referência.
3. Comparar item a item: tamanho do número herói, quantidade de palavras na
   primeira dobra, presença de círculo de ícone nas listas, respiro entre
   cards, rótulo visível na navegação.
4. Só marcar concluído quando a resposta a *"um leigo bate o olho e entende
   em 3 segundos?"* for sim.
5. Registrar em `docs/REDESIGN-EM-CURSO.md` o que foi comparado e o que
   ficou diferente de propósito.

Além disso, o de sempre: `tsc`, `next build`, `npm test`,
`npm run test:fumaca`, commits pequenos com push a cada verde.

## PARTE 7 — Componentes shadcn a usar (pedido explícito do Davi)

Preferir o que já existe em `src/components/ui/` e completar com shadcn
oficial (https://ui.shadcn.com) onde faltar peça:
`chart` (rosca de categorias), `sheet` (folha inferior no mobile),
`drawer`, `avatar`, `progress`, `separator`, `empty` (estado vazio),
`item`/`list` para as linhas com círculo de ícone, `skeleton`,
`sonner`/`toast` já existente. Instalar via `npx shadcn@latest add <peça>` —
não escrever à mão o que a biblioteca já entrega.

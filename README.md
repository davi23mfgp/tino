# Tino — contador pessoal (PF e MEI)

App de finanças pessoais para quem cuida do dinheiro sozinho, em casal ou em família, com modo MEI.
Feito sobre a mesma stack do ERP Controllares: Next.js (App Router), Prisma + PostgreSQL, Tailwind,
Radix e autenticação por JWT em cookie `httpOnly`.

**Retomando o projeto?** Leia `docs/COMECAR-AQUI.md` — em cinco minutos você sabe
tanto quanto a última sessão.

## O que ele faz

- **Contas e cartões** — saldo derivado dos lançamentos (nunca um campo gravado que desatualiza).
  Cartão de crédito não entra no saldo disponível: limite não é dinheiro seu.
- **Importação de extrato** — OFX (SGML e XML), CSV (detecta separador, cabeçalho e coluna de valor
  sozinho) e PDF. Toda importação passa por uma prévia antes de gravar, e reimportar o mesmo arquivo
  não duplica nada (impressão digital por conta + data + valor + descrição, ou o `FITID` do banco).
- **Categorização que aprende** — dicionário embutido de comerciantes brasileiros para o primeiro
  extrato; cada correção sua vira uma regra com prioridade acima do dicionário.
- **Parcelamentos** — cada parcela é uma linha datada. É o que mostra quanto de cada fatura futura já
  está comprometido antes de você gastar qualquer coisa.
- **Plano de pagamento** — junta conta negativa (cheque especial), fatura de cartão, empréstimos e
  parcelas num roteiro mês a mês: quanto sobra, para onde vai, quando fica limpo.
- **Projeção de 12 meses** — receita e despesa pela sua média, mais recorrências e parcelas
  contratadas. Avisa em que mês o caixa fica negativo.
- **Simulador de cenários** — empilhe hipóteses (cortar gasto, mudar renda, comprar parcelado, pegar
  empréstimo, quitar dívida, pagar extra, gasto ou entrada única) e veja o fluxo de caixa mês a mês
  com e sem a mudança, lado a lado, por 12 a 60 meses. O veredito sai em português: quanto mais rico
  ou mais pobre você termina, quanto muda de juros, se antecipa a quitação e se evita o vermelho.
- **Metas** — reserva de emergência, viagem, aposentadoria. Calcula o aporte necessário e a data
  prevista com juro composto.
- **Decisão de empréstimo** — parcela pela Tabela Price, CET real (por bisseção sobre o fluxo de
  caixa, incluindo IOF e tarifas), comprometimento de renda e veredito com alternativas.
- **MEI** — faturamento contra o limite anual (proporcional no ano de abertura), mês em que o limite
  estoura no ritmo atual, teto mensal seguro e controle de DAS em aberto.
- **Análise contábil** — parecer no formato que um contador entrega: DRE do mês (de onde veio e para
  onde foi), balanço (ativo, passivo, patrimônio líquido) e seis indicadores, cada um com o número, a
  faixa de referência e o que fazer. Fecha com as prioridades em ordem e o efeito estimado em reais.
- **Captura rápida** — três caminhos para anotar um gasto sem abrir planilha: digitar
  "mercado 52,30" no app, encaminhar a notificação de compra do banco pelo celular, ou mandar o
  arquivo da fatura no Telegram. Tudo cai numa fila de conferência: nada vira lançamento sem um toque
  seu, porque notificação de banco erra (compra negada, estorno, pré-autorização de posto).
- **Gráficos** — evolução de entradas e saídas, rosca de gastos por categoria, fluxo de caixa
  projetado com a linha do zero em destaque e barras das parcelas já comprometidas.
- **Tino, o assessor** — responde sobre os seus números. Motor de regras local resolve as perguntas
  frequentes na hora e de graça; o modelo de linguagem entra só no que sobra, e é opcional.

## Rodar

O banco e o `.env` já estão prontos nesta máquina. No dia a dia são dois comandos:

```bash
npm run db:start
npm run dev
```

Depois abra `http://localhost:3000`, crie sua conta e responda as sete perguntas do Tino — é ele
que monta seu painel a partir das respostas. Dá para pular e cadastrar tudo depois.

Para desligar o banco: `npm run db:stop`.

### Banco local

Postgres 17 roda a partir de binários portáteis em `%LOCALAPPDATA%\tino-pg`, sem serviço do
Windows e sem privilégio de administrador (o instalador oficial exige UAC; este caminho não).
Como não é serviço, ele não sobe sozinho ao ligar o computador — daí o `npm run db:start`.

Recriar do zero, se um dia precisar:

```bash
# baixe postgresql-17-windows-x64-binaries.zip, extraia em %LOCALAPPDATA%\tino-pg
initdb -D %LOCALAPPDATA%\tino-pg\data -U tino --pwfile=senha.txt -E UTF8 --locale=C
pg_ctl -D %LOCALAPPDATA%\tino-pg\data -l pg.log -o "-p 5432" start
psql -U tino -h 127.0.0.1 -d postgres -c "CREATE DATABASE tino;"
npx prisma migrate deploy
```

`JWT_SECRET` não tem valor padrão de propósito: subir sem ele assinaria sessão com segredo público.

## Como o cheque especial é modelado

Saldo negativo em conta **não** é tratado como uma dívida à parte: é o próprio saldo, com juros
incidindo sobre ele. Modelar como dívida separada contaria o mesmo buraco duas vezes (uma no saldo,
outra no passivo) e faria a sobra do mês ficar parada ao lado de uma dívida a 8% — o oposto do que
acontece na conta real, onde qualquer entrada abate o negativo na hora.

Fatura de cartão é diferente e entra como dívida de verdade: ela só diminui quando é paga.

## Primeiro acesso

Em vez de abrir um painel vazio, o app conversa. Sete passos, todos puláveis:

1. quanto entra e quanto sai por mês, e em que dia você recebe;
2. onde está o dinheiro (com um interruptor para conta no negativo);
3. cartões — limite, vencimento e fatura em aberto;
4. compras parceladas em andamento (o passo que mais muda a projeção);
5. outras dívidas, com o juro de cada uma;
6. uma meta para começar;
7. se você é MEI.

Pulou? Em **Configurações → Conversa inicial** dá para responder depois. Nada é apagado — o que você
responder soma ao que já existe.

Conta no negativo vira dívida de cheque especial a 8% ao mês (o teto legal), já no topo do plano de
pagamento — é quase sempre o juro mais caro que uma pessoa física paga. Ajuste para a taxa do seu
contrato em Configurações.

## Captura rápida: como o celular anota sozinho

Um site não consegue ler notificações do Android — quem lê é um app de automação no seu aparelho,
que repassa o texto. A parte que recebe já está pronta:

| Caminho | Como funciona |
|---|---|
| **Notificação do banco** | MacroDroid ou Tasker: gatilho "notificação recebida" filtrando o app do banco, ação POST para `/api/capturar` com `Authorization: Bearer SUA_CHAVE`. |
| **Telegram** | Gere a chave, mande `/conectar SUA_CHAVE` ao bot. Depois é só escrever "uber 18" ou encaminhar o PDF da fatura. |
| **Dentro do app** | Campo único em **Anotar**: escreva como falaria. |

As instruções passo a passo, com o endereço já preenchido, ficam na tela **Anotar**.

Detalhes que importam:

- a chave é guardada só como hash; o valor em claro aparece uma única vez, na criação, e cada
  aparelho tem a sua para poder ser revogada isoladamente;
- o leitor descarta sozinho o que não é gasto — compra negada, estorno, aviso de fatura, Pix
  recebido, alerta de segurança;
- avisos repetidos (o mesmo alerta no celular e no relógio) são reconhecidos como a mesma compra;
- senha de PDF nunca passa pelo Telegram: mensagem de chat fica guardada no aparelho e no servidor do
  mensageiro. Para fatura com senha, use a tela **Importar**, que pergunta na hora e não guarda.

## Usar pelo celular

O app é feito para o telefone: barra inferior com as cinco telas do dia a dia, e o resto acessível
pela fileira de atalhos. Dá para instalar na tela inicial e abrir sem barra de navegador.

**Na mesma rede (Wi-Fi de casa) — funciona hoje:**

1. no computador, `npm run db:start` e `npm run dev`;
2. no celular, abra `http://SEU_IP:3000` (o `npm run dev` mostra o endereço em "Network");
3. no Chrome ou Safari, menu → **Adicionar à tela de início**.

O computador precisa estar ligado e no mesmo Wi-Fi. É a forma mais rápida, e não expõe nada para
fora da sua rede.

**De qualquer lugar:** aí é preciso publicar o app (Vercel ou similar) com um Postgres na nuvem, ou
abrir um túnel temporário. Publicado, o endereço também serve para a captura por notificação
funcionar fora de casa.

Os ícones são gerados por `node scripts/icones.mjs` — o PNG é montado à mão com zlib, para não
trazer uma dependência de imagem só para desenhar um símbolo.

## Testes

```bash
npm test
```

138 testes sobre o motor de cálculo, rodando com o runner nativo do Node (sem
dependência extra) em meio segundo. Cobrem centavos e arredondamento, Tabela
Price, CET por bisseção, estratégias de quitação, metas, aposentadoria, limite
do MEI, competências e janela do mês, categorização, leitor de notificação,
simulador de cenários e o parecer.

Boa parte fixa regressões que aconteceram de verdade durante o desenvolvimento
— cada uma tem o comentário do que quebrou. Os testes foram verificados
revertendo a correção e conferindo que falham: um deles não falhava, era teatro,
e foi reescrito até pegar o caso real.

## Conta de demonstração

```bash
node scripts/demo.mjs
```

Cria um lar fictício ("Casa da Marina") com seis meses de histórico: 251 lançamentos, quatro
parcelamentos em andamento, três dívidas, orçamento estourando em algumas categorias, três metas e
capturas esperando conferência. Serve para ver todas as telas com dados coerentes — a soma dos
lançamentos bate com os saldos, e as parcelas batem com as faturas.

Entrar: `demo@tino.local` / `demo12345`. Para remover: `node scripts/demo.mjs --limpar`.

## Como a nota de saúde é calculada

Média das faixas dos indicadores, **com teto pela pior delas**: se algum indicador está crítico a nota
não passa de 55, e com a conta no negativo não passa de 40. Sem esse teto a média premiava quem tem
quatro indicadores bons e um crítico — a tela mostrava nota 84 ao lado do rótulo "situação crítica".
Em finanças o pior item manda: estar sem reserva não é compensado por ter pouco custo fixo.

Indicador sem base real não recebe faixa. Se você não lançou nenhuma receita no mês, a taxa de
poupança aparece marcada como "sem faixa", explicando que usou a renda declarada — dar nota a uma
sobra que ninguém viu acontecer seria elogiar um número inventado.

## Open Finance — o que é possível e o que não é

Puxar dados direto do seu banco exige ser instituição autorizada pelo Banco Central **ou** contratar
um agregador já certificado (Pluggy, Belvo e similares). Não há caminho legítimo fora disso: qualquer
solução que peça a senha do seu banco é raspagem de tela, viola o contrato da instituição e coloca
sua credencial em risco.

O app já está pronto para os dois cenários:

| `OPEN_FINANCE_PROVIDER` | Comportamento |
|---|---|
| `sandbox` (padrão) | Dados fictícios determinísticos, para desenvolver e testar o fluxo inteiro. Bloqueado em produção. |
| `pluggy` | Integração real. Preencha `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` (os nomes antigos `OPEN_FINANCE_CLIENT_ID`/`_SECRET` continuam aceitos). |

A tela é `/conectar`, também no menu **Movimento**. Sem as duas chaves ela não finge conexão nenhuma:
diz que o Open Finance ainda não está configurado e leva para o import de arquivo, que já funciona.
Criar a conta na Pluggy, aceitar os termos e gerar o par de chaves é ação de conta e de dinheiro —
isso é feito por você, no painel deles, e o valor é colado no `.env`.

Trocar de agregador é escrever um arquivo em `src/lib/open-finance/provedores/` implementando
`ProvedorOpenFinance`. Nenhuma tela muda.

Em qualquer provedor: a autenticação acontece no site do banco, o app recebe só permissão de leitura,
o consentimento tem prazo (12 meses no padrão do BCB) e o app avisa antes de expirar. Revogar é um
botão em Configurações.

## Assistente

Sem `ANTHROPIC_API_KEY` o Tino funciona pelo motor de regras: saldo, gastos por categoria, dívidas,
metas, reserva, projeção, empréstimo e MEI. Com a chave, ele também responde o que fugir desses temas,
usando apenas o panorama financeiro enviado no contexto.

Limites que ele respeita sem exceção: não recomenda ativo, corretora ou aplicação específica
(atividade regulada), e em questão tributária explica o funcionamento mas manda confirmar com contador.

## Estrutura

```
prisma/schema.prisma        modelo de dados (dinheiro sempre em centavos Int)
src/lib/financeiro.ts       Price, CET, amortização, metas, aposentadoria, MEI
src/lib/categorizar.ts      dicionário + regras que aprendem
src/lib/importar/           OFX, CSV, PDF e deduplicação
src/lib/open-finance/       contrato + provedores (sandbox, Pluggy)
src/lib/parcelamentos.ts    parcelas datadas e compromisso futuro
src/lib/tino/             panorama, diagnóstico, alertas, plano de pagamento, simulador, chat
src/lib/captura/            leitor de notificação bancária e ponte com o celular
src/app/(app)/              telas autenticadas
src/app/api/                rotas
```

## Sobre o seed

Não há seed com dados de exemplo: o app começa vazio e aprende com você no primeiro acesso.
Para carregar histórico de verdade, use **Importar** com o OFX, CSV ou PDF do seu banco.

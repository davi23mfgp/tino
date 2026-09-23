# Segurança e conformidade legal — 22/09/2026

Continuação de `SEGURANCA-LGPD-DESEMPENHO-2026-09-15.md`. Davi pediu: variáveis
de ambiente, nunca confiar em entrada do usuário, API exposta, rate limit em
todo endpoint, controle de acesso, erro sem explicação interna, e tudo o que
LGPD e a lei pedem para não correr risco de processo por vazamento.

Tudo abaixo foi **testado de verdade** (curl contra o servidor rodando + conta
de teste criada e apagada), além de `tsc`, `next build` e `npm test` (423).

## Achados graves, corrigidos

| # | Problema | Impacto | Correção |
|---|---|---|---|
| 1 | Webhook do WhatsApp não conferia a assinatura da Meta | Qualquer um que soubesse a URL se passava pelo telefone de um cliente: lançava gasto e **recebia de volta os números financeiros dele** | Confere `X-Hub-Signature-256` com `WHATSAPP_APP_SECRET` (nova variável) antes de tudo. Sem assinatura: 401 |
| 2 | IDs de outro lar aceitos no corpo (IDOR) em `capturas`, `recorrencias`, `regras`, `categorias` (`paiId`), `contas/[id]` (`membroId`), `importar` (`membroId`), `orcamento`, `loja/vendas` (`produtoId`) | Gravar lançamento no extrato de outra pessoa; dar baixa no estoque de outra loja; ler nome de categoria alheia | Helper único `doLar()` em `src/lib/validar.ts`. Testado com ID real de outra conta: 400 |
| 3 | JWT de 30 dias nunca revogado | Funcionário removido seguia abrindo a loja por até 30 dias; conta apagada idem | `getSessao()` confere no banco a cada requisição (usuário existe, mesmo lar, papel atual, `sessoesValidasDesde`). `revogarSessoes()` derruba tudo. Testado: 401 na hora |
| 4 | Papel `CONVIDADO` ("vê, não edita") não era aplicado em lugar nenhum | Convidado (ex.: contador) podia alterar e apagar tudo | `comSessao` barra escrita do convidado (403) e reaplica a regra do funcionário no servidor, não só no proxy |
| 5 | Regra com regex do usuário rodava sem checagem | `(a+)+$` trava o servidor para todo mundo (ReDoS) | `regexSegura()` na criação e na execução |
| 6 | Login respondia mais rápido para e-mail inexistente | Dava para descobrir quem tem conta medindo o tempo | Compara contra hash falso de mesmo custo. Medido: 0,45 s × 0,42 s |

## Endurecimento geral

- **Rate limit em todo endpoint autenticado**: 300 leituras e 60 escritas por
  minuto por pessoa (`REGRAS.apiLeitura/apiEscrita`), além dos limites
  antigos de login, cadastro, rotas caras e captura. Medido: 429 a partir da
  299ª leitura.
- **IP para o limite** vem de `x-vercel-forwarded-for`/`x-real-ip` (a borda
  grava, o cliente não forja); `x-forwarded-for` só como último recurso.
- **Entrada**: `zod` adotado (`src/lib/validar.ts`). Todo `corpo()` tem teto de
  256 KB, texto de 5.000 caracteres, lista de 2.000 itens, 10 níveis, e descarta
  `__proto__`/`constructor`. Rotas com foto e importação declaram teto próprio.
  Schemas completos nas rotas onde havia falha de lógica; as demais já
  validavam valor/data/posse à mão.
- **Segredos comparados em tempo constante** (`segredoConfere`): cron,
  Telegram, verificação do WhatsApp. Telegram passa a aceitar o cabeçalho
  oficial `X-Telegram-Bot-Api-Secret-Token` (fica fora de log).
- **Erros**: nenhuma rota devolve mais mensagem de exceção
  (`admin/parametros`, `openfinance`). Logs registram só o caminho, nunca a
  query (que pode trazer `?chave=`).
- **Variáveis de ambiente**: `src/instrumentation.ts` confere na subida.
  Produção não sobe sem `DATABASE_URL` ou com `JWT_SECRET` < 32 caracteres;
  avisa integração ligada sem o segredo que a protege e banco sem
  `sslmode=require`. Nunca imprime valor. JWT com algoritmo fixo `HS256`.

## Legal

- **Termos de Uso** (`/termos`) — não existiam. Incluem: não é consultoria de
  investimento (CVM), não é serviço contábil (CRC), não é banco;
  arrependimento em 7 dias (CDC 49); cancelamento sem multa; aviso de 30 dias
  para mudança de preço; papel de operador sobre dados de terceiros (fiado,
  funcionário, dependente); foro do consumidor.
- **Aceite registrado**: cadastro exige caixa desmarcada por padrão; grava
  `termosVersao` e `termosAceitosEm` (prova do consentimento, LGPD art. 8º).
- **Marco Civil, art. 15**: tabela `RegistroAcesso` (data, hora, IP) em login e
  cadastro, guardada 6 meses e expurgada pelo cron diário. Sobrevive à
  exclusão da conta (obrigação legal).
- **Política de privacidade** atualizada com os terceiros que faltavam
  (Anthropic, Meta/WhatsApp, Telegram, Resend, Focus NFe, push), registro de
  acesso, bases legais, cookie único essencial, prazo de guarda.

## Depende do Davi — sem isto, não cobre de ninguém

1. ~~**Razão social, CNPJ, endereço, e-mail de atendimento e do encarregado
   (DPO)** — marcados `[A DEFINIR]` em `/termos` e `/privacidade`. O Decreto
   7.962/2013 exige esses dados visíveis em quem vende pela internet.~~ **Preenchido em 22/09** (MEI, CNPJ 63.443.755/0001-80, Aracaju – SE).
2. **Advogado revisar `/termos` e `/privacidade`** antes do primeiro cliente
   pagante. O texto é base técnica honesta, não parecer jurídico.
3. **Reembolso depois dos 7 dias** — sim ou não (`[A DEFINIR]` nos termos). E o
   reembolso dos 7 dias hoje é **manual**: o app não tem botão para isso.
4. **Backup do banco**: se o Neon guarda cópia por N dias, isso entra no prazo
   de guarda da política.
5. **`WHATSAPP_APP_SECRET`** na Vercel antes de ligar o WhatsApp — sem ela o
   webhook recusa tudo (de propósito).
6. **Contas antigas** não têm aceite gravado. Quando houver cliente real,
   pedir aceite no próximo login (comparar `termosVersao` com `VERSAO_TERMOS`).
7. **Nome "assessor"** e frases como "contador profissional" no marketing:
   manter longe de "recomendação" e de "serviço contábil" (CVM/CRC).
8. **Plano de resposta a incidente** (LGPD art. 48: avisar ANPD e titulares em
   prazo razoável) — quem avisa, como, em quanto tempo.

## Ainda aberto (técnico, menor)

- `unsafe-inline`/`unsafe-eval` no CSP (exige nonce por requisição).
- Cadastro responde 409 para e-mail já usado (revela conta). Resolver direito
  pede confirmação por e-mail; mitigado pelo limite de 5 cadastros/hora/IP.
- Não existe troca de senha no app. Quando existir, chamar `revogarSessoes()`.
- Mensagem de rejeição da nota fiscal repete o texto do emissor para o dono da
  loja (útil para ele corrigir; não vaza dado de terceiro).

## Visual (mesma data, pedido separado)

Vidro líquido opção A aplicado em `src/app/liquid-glass.css`. Ajustes de
22/09 depois da primeira leitura do Davi:

- **Barra lateral deixou de ser vidro.** Ela fica parada e sempre visível: o
  desfoque não revela nada e custa contraste em texto de menu. Vidro ficou só
  onde há conteúdo passando por baixo (barra do celular, gavetas, diálogos).
- **Uma escala de tipo e um traço de ícone** (1,75) para o app inteiro. Antes
  havia 11, 12, 13 e 13,5px para a mesma função, e traço entre 1,5 e 2.
- **Bordas de 12% para 16%** de branco: a de antes sumia sobre o brilho verde.
- **Carteira de cartões**: a pilha continua (pedido do Davi), mas a tira visível
  de cada cartão deixou de dizer só "Vence dia 10" e passou a carregar banco,
  fatura do mês e percentual do limite usado. A peça ganhou chip, símbolo de
  aproximação e brilho de luz atravessando, e um véu escuro embaixo, porque o
  texto branco sobre o amarelo do BB dava 2,1:1 sem ele.
  Três armadilhas resolvidas no caminho: o selecionado subia de camada e tapava
  o topo dos de trás; `.cartaoFisico > *` tinha `z-index: 1`, e sem
  `isolation: isolate` o conteúdo de um cartão pintava sobre o seguinte; e o
  levante no toque abria um vão no meio da pilha.
- **Símbolo das listas**: `SimboloCategoria` calculava um ícone e o descartava,
  usando emoji fixo no código. Agora o emoji só aparece quando a pessoa
  escolheu um; o padrão é o ícone da família do app.
- **Botão flutuante do Tino** subiu: cobria o "Editar" das linhas de categoria.

### Rodada visual 3 (22/09, noite)

- **Bandeira do cartão**: campo novo (`Conta.bandeira`, enum `BandeiraCartao`),
  opcional, só em cartão de crédito. Cadastra-se em Configurações e aparece no
  rodapé da peça. É texto, não logo: as marcas são registradas e o Tino não tem
  licença para reproduzi-las. Sem bandeira informada, nada aparece; o Tino não
  adivinha pelo nome, porque escrever "Visa" num Mastercard destrói a confiança
  na tela inteira.
- **Limite**: a barra só existe para quem cadastrou o limite. Sem valor, some
  em vez de mostrar percentual inventado.
- **Controles**: uma regra de forma para o app inteiro. Toque redondo por
  natureza (botão, aba, chip) é pílula; campo de texto é 14px; superfície é
  22 ou 26px. Campo com 46px de altura, foco visível com a cor da marca em
  tudo, placeholder no tom que passa em contraste (o antigo dava 3,4:1).
- **Branco de volta** (Davi liberou): o bloco claro é o único destaque da tela,
  e é isso que o faz funcionar. Título 16,7:1, apoio 7,5:1 sobre o branco.

### Rodada visual 4 (22/09): as ferramentas

- **Ícone por ferramenta** (`src/lib/icone-ferramenta.tsx`). "Compras Parcelas
  Categorias Orçamento Ajuda Importar" em texto puro lê como frase, não como
  seis destinos. A busca é pelo rótulo normalizado, porque o app monta abas em
  três lugares diferentes; sem correspondência não desenha ícone nenhum, já
  que ícone errado ensina a coisa errada.
- **Uma peça para os três sistemas de abas** (Tabs dos cartões, `AbasInternas`
  e trilho de grupo), que tinham três desenhos na mesma linguagem: barra de
  vidro em pílula, rolagem com encaixe e desvanecimento na borda, que é o que
  avisa haver mais abas para o lado.
- **Aba atual** deixou de ser bloco preto sólido (parecia desabilitado no meio
  do escuro) e virou pílula clara com o verde da marca no ícone e no texto.
- **Linha de compra no celular**: a regra dava quatro colunas para cinco
  filhos, a lixeira caía para a segunda linha e cada compra ocupava 103px.
  Agora são cinco colunas e 56px, medido no navegador.

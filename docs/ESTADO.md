> **ERP MEI:** leia [a visão, as referências ZIP e o histórico da retomada](RETOMAR-ERP-MEI-2026-10-02.md) antes de continuar. As seções históricas abaixo podem não refletir o estado mais recente.

## 07/10/2026: entrada do aparelho na Assistência técnica (passo 39, opções A e C juntas)

O Davi escolheu A e C juntas, com a busca de modelo pelo começo do nome, o QR
de acompanhamento e, depois de ver, "sofisticado, moderno, fino e bem
dimensionado". Vale só para negócio da área Assistência; as outras áreas
seguem com a OS de texto livre.

- **01 Aparelho:** busca em 740 modelos (celular, tablet, notebook,
  videogame, relógio, fone e eletrônicos), pelo começo de qualquer palavra
  e sem precisar de espaço ("a5", "note12", "ip 15 pro", "ps5"), com os
  modelos que a loja já atendeu em cima. Roda no aparelho, em 0,1 ms. O
  escolhido decide o tipo, e o tipo decide as peças e o que pode ficar
  junto. IMEI conferido pelo dígito verificador na hora.
- **02 O que ficou junto** e **03 Como chegou:** no desenho do celular, um
  toque marca defeito, outro marca que funciona, outro volta a não testado.
  O que ninguém tocou fica "não testado", nunca "funciona" (regra 3); o botão
  "Testei: o resto funciona" é a pessoa quem toca.
- **04 Senha:** padrão (pontos na ordem) ou digitada, cifrada com a chave do
  servidor e o link da OS; só aparece no "Ver senha" por 30 segundos, nunca
  no link do cliente, e é apagada na entrega.
- **05 Serviço:** o que fazer (com os serviços mais comuns sugeridos), prazo,
  valor e observação.
- **Ficha:** o aparelho, a conferência do cliente, a garantia depois da
  entrega e o **QR de acompanhamento** (sempre preto no branco), com
  "Imprimir comprovante" (folha A4 com QR, como chegou, regras do CDC e
  assinaturas; testado em PDF: uma página).
- **Link do cliente** (`/s/...`): como o aparelho chegou, "Está certo" ou
  "Tem coisa errada" (vira aviso no sino), e a garantia de 90 dias contada
  da entrega (CDC, art. 26). Mostra só o final do IMEI.
- Testado no Chromium, 390 e 1280, escuro e claro: cadastro de assistência,
  busca, IMEI errado e certo, desenho, padrão, OS aberta, senha vista,
  cliente conferindo, pronto, entregue, senha apagada (404), garantia nos
  dois lados, segunda resposta do cliente recusada (409).
- Regras em `src/lib/loja/assistencia.ts` e `modelos.ts`, testadas em
  `testes/entrada-aparelho.test.ts`, com prova de que cada teste falha se a
  regra mudar.
- **Aparelho esquecido** (07/10): o sino avisa quando a OS está pronta há
  7, 30 e 60 dias (só o marco mais recente), e a ficha mostra "Pronto há N
  dias" com o lembrete pronto para o WhatsApp, mais firme depois de 30 dias.
  O Tino não sugere vender o aparelho: a cláusula é tida como abusiva.
- **Retorno em garantia** (07/10): na entrada, ao digitar o IMEI (ou com o
  mesmo cliente e o mesmo modelo, que a tela diz ser mais fraco), o Tino
  procura OS entregue há menos de 90 dias e propõe "Marcar como retorno";
  quem marca é a loja. A OS nova fica ligada à antiga (`garantiaDeId`,
  migration `20261007150000_retorno_em_garantia`), e a ficha, o link do
  cliente e o comprovante dizem "Retorno em garantia da OS 0001". O servidor
  confere de novo que a garantia vale antes de ligar.
- Testado no Chromium, 390 e 1280: aviso no sino, lembrete na ficha com a
  mensagem, proposta de garantia pelo IMEI, vínculo na ficha e no link.
  Regras em `testes/retorno-e-esquecido.test.ts`, com prova de que falham
  se a regra mudar.
- **Falta:** foto do aparelho (depois das conversas com os donos); registrar
  que o lembrete foi mandado; quanto conserto volta em garantia por mês (não
  há faixa de referência com fonte, então o número não aparece ainda). O
  campo de prazo usa o calendário do navegador.

## 06/10/2026: origem do cadastro, parte automática (item 1.6)

- O proxy guarda num cookie de 30 dias (`tino_origem`, httpOnly) de onde a
  pessoa chegou: `utm_source`, `utm_medium`, `utm_campaign`, `ref`, a
  primeira página e só o domínio do site de onde clicou. Só para quem não
  entrou, só em página aberta de verdade (troca de tela do app não conta).
- Vale a primeira chegada; chegada com campanha ou indicação substitui a sem
  marca, nunca o contrário (`decidirOrigem`, testado em
  `testes/origem-cadastro.test.ts`, com prova de que o teste falha se a
  regra mudar).
- O cadastro por e-mail e pelo Google grava em `Usuario.origemCadastro`
  (migration `20261006210000_origem_do_cadastro`) e apaga o cookie.
- Política de privacidade diz o que o cookie guarda; versão dos termos
  subiu para 2026-10-06, então quem já tem conta vê o aviso uma vez.
- Testado no Chromium: chegou pelo anúncio do Instagram, voltou pela busca do
  Google, cadastrou; ficou gravado o anúncio, com `l.instagram.com` como site.
  O cadastro pelo Google não foi testado no navegador (o Google não abre
  daqui); o código é o mesmo caminho.
- **Falta:** a pergunta "Como você conheceu o Tino?" (canvas) e mostrar a
  origem no painel do admin (item 6.5).

## 06/10/2026: recuperar senha por e-mail (item 1.9)

- "Esqueci a senha" (login pessoal, login MEI) abre `/esqueci-senha`; o
  e-mail com o link sai pelo Resend, que já era dependência dos convites.
- O link vale 30 minutos e uma vez só; no banco fica só o hash
  (`redefinicaoSenhaHash`, migration `20261006200000_recuperar_senha`).
- A resposta é a mesma, exista o e-mail ou não; cinco pedidos por hora por
  e-mail e por endereço.
- Trocar a senha derruba as sessões abertas e libera o bloqueio de login.
- Admin não recupera por aqui (continua `ADMIN_REDEFINIR_SENHA`).
- O endereço do link vem da Vercel, nunca do cabeçalho `Host`.
- Testado no navegador: senha nova entra (200), a antiga não (401), o mesmo
  link de novo é recusado (400).
- **Falta (Davi):** `RESEND_API_KEY` e `EMAIL_REMETENTE` na Vercel. Sem as
  duas, a tela diz que o envio não está ligado e mostra o e-mail do Davi,
  em vez de fingir que mandou.

## 06/10/2026: Tino por área e vários negócios (opção A do passo 38)

O Davi escolheu a opção A (modo pronto, como o Square). Estudo em `docs/pesquisas/2026-10-06-escolha-de-area-e-varios-negocios.md`.

- **"Qual é o seu segmento?"** (era "O que você faz?"; o Davi pediu a troca no mesmo dia) em `/loja/comecar`: as 10 áreas do plano, a subárea (ou "Outro"), "Meu segmento não está aqui" com texto livre, e a caixa "Seu Tino ___ vem assim" ao lado. A caixa só lista o que o Tino já faz para o tipo da área (`oQueVem` em `src/lib/loja/areas.ts`): serviço ganha OS, orçamento e agenda; comércio ganha prateleira e fiado; quem faz os dois ganha o DAS separando as partes.
- **Cadastro MEI** (e-mail e Google) leva a `/loja/comecar?inicio=1` (passo 2 de 3) e depois aos dados da empresa. Negócio antigo sem área vê o aviso "Escolha o seu segmento" na Visão geral.
- **Vários negócios:** o nome do negócio fica no topo, com a seta; abre a lista com Casa, os negócios (com a área) e "Novo negócio". O negócio aberto fica num cookie e só vale se for do próprio lar (`negocioAtivo`); `lojaDoLar` passou a respeitá-lo, então todas as telas da loja seguem a troca.
- **Mesmo CNPJ:** com mais de um negócio no MEI, a lista avisa que as vendas somam no mesmo limite. A tela do MEI soma o Balcão de todos os negócios do lar.
- Área é campo da loja (`area`, `subarea`), migration `20261006190000_area_do_negocio`. Muda o que o app destaca, nunca o cálculo.

Conferido no Chromium: cadastro novo caiu na escolha; assistência e celular salvos; segundo negócio "Capinhas" criado pela lista, com moda e acessórios; topo trocou de nome; aviso de mesmo CNPJ; troca de volta; celular e computador, escuro e claro, sem rolagem horizontal. Regras testadas em `testes/areas-loja.test.ts`.

Falta, dito sem enfeite:
- **Casa** abre o login pessoal em vez de trocar num toque, pela regra de 04/10 (logins separados). Se o Davi quiser a troca direta, é uma decisão dele.
- No computador a troca ficou no topo, não no alto do menu lateral como no quadro da opção A.
- O funcionário do balcão sempre vê o negócio mais antigo.
- A área ainda não muda o menu nem traz serviços de partida; isso é a "área funda" (item 1.8, Assistência técnica primeiro).
- Origem do cadastro (item 1.6) ainda não é gravada.

## 05/10/2026: Agenda, ordem de serviço e avisos do MEI (opção A do passo 37)

O Davi escolheu a opção A (o dia em linha do tempo). Tela `/loja/agenda`, item "Agenda" do menu da loja (no celular, em "Mais").

- **Linha do tempo do dia:** compromisso (com hora ou de dia inteiro, ideia do Controllares), prazo de OS aberta e retorno de cliente (o próximo passo da tela Clientes), pela hora. Semana de segunda a domingo: faixa no celular, lista à esquerda no computador.
- **Ordem de serviço:** o que ficou com a loja, o que fazer, como chegou, prazo, valor (opcional: sem diagnóstico, a tela diz "sem preço"), checklist e etapas (recebido, fazendo, esperando peça, pronto, entregue), com a data de cada uma. Etapa pulada não aparece como feita.
- **Do orçamento à OS:** orçamento aprovado (ou vendido) abre OS com cliente, serviço e valor; um orçamento abre uma OS só.
- **Pronto: avisar o cliente** monta a mensagem para o WhatsApp do próprio dono, com o **link de acompanhamento** `/s/<token>` (papel claro, só leitura).
- **Cobrar no Balcão:** OS com orçamento usa os itens dele; OS sem orçamento entra como item de mão de obra, que conta como **serviço** no DAS (`dividirFaturamentoMei` aceita `servico`, só na venda de uma OS). A venda fica ligada à OS.
- **Sino do MEI** (`src/components/avisos-da-loja.tsx`): "cliente aprovou o orçamento pelo link" (com "Abrir OS"), "OS vence hoje", "OS passou do prazo" e "orçamento vence amanhã". Lembretes recalculados a cada abertura, sem duplicar no dia (chave com a data). O número conta só o não lido.
- O funcionário do balcão não vê agenda, OS nem avisos.

Conferido no Chromium: aprovação pelo link virou aviso; "Abrir OS" do sino abriu a OS do orçamento; checklist, pronto com a mensagem e o link do cliente; compromisso de 9h; OS sem orçamento e sem preço, depois com R$ 150 cobrada no Balcão (venda 12 ligada, R$ 150 somados em serviços do mês); celular e computador, escuro e claro, sem rolagem horizontal. Regras em `src/lib/loja/agenda.ts`, testadas em `testes/agenda-loja.test.ts`.

Falta: arrastar compromisso para outra hora, repetir compromisso (toda semana), espelhar na agenda do Google (o Controllares faz), e relatório dos motivos de perda.

## 05/10/2026: Clientes e orçamento (ERP MEI, fase 2, opção A do passo 36)

O Davi escolheu a opção A do canvas (o próximo passo primeiro). Tela `/loja/clientes`, terceiro item do menu da loja (no celular, Catálogo foi para "Mais").

- **Para retomar hoje:** próximo passo marcado para hoje ou atrasado, orçamento que vence hoje ou amanhã, vencido, aprovado sem virar venda e rascunho. Enviado dentro do prazo e sem passo não entra. Regras puras em `src/lib/loja/orcamento.ts`, testadas em `testes/orcamento-loja.test.ts`.
- **Em aberto** por etapa (rascunho, enviado, aberto), sem os vencidos, e **taxa de fechamento** dos 90 dias com os 90 anteriores de referência. Sem envio, a tela diz que não há taxa em vez de mostrar 0%.
- **Orçamento:** número por loja, itens do catálogo ou avulsos, desconto, validade, entrada e parcelas (centavos sem perda), observação. Editar depois de enviado guarda a versão anterior (`VersaoOrcamentoLoja`).
- **Link público** `/o/<token>`, fora da área logada, no papel claro da opção C (a A não desenha esta tela). Conta as aberturas, sem contar o robô de prévia do WhatsApp, o próprio dono e recarga em menos de 30 minutos. O cliente aprova pelo link, só dentro da validade.
- **Perdido** pede o motivo (preço, prazo, atendimento, desistiu, não respondeu, outro).
- **Virar venda no Balcão:** o Balcão abre com itens, desconto e cliente do orçamento; a venda marca o orçamento como vendido na mesma transação, e dois cliques não vendem duas vezes.
- O funcionário do balcão não vê clientes nem orçamentos (`BLOQUEADO_MESMO_NA_LOJA`).

Conferido no Chromium com a conta de demonstração MEI: orçamento de R$ 528,00 (entrada R$ 110 e 2x R$ 209) montado pela tela, link mandado, aberto 1 vez (o robô do WhatsApp e o dono não contaram), aprovado pelo cliente, vendido no Balcão (venda 11); perdido com motivo; celular e computador, tema escuro e claro, sem rolagem horizontal.

Contato do cliente (nome, telefone, e-mail, observação) se edita pela ficha desde o mesmo dia.

Falta: relatório dos motivos de perda. Agenda, OS e o aviso de aprovação vieram no passo 37 (acima).

## 04/10/2026: login pessoal e login MEI separados

Defeito relatado pelo Davi: entrou pela tela do Tino pessoal com o próprio e-mail e caiu no MEI. O modo saía do lar ter perfil MEI (`lar.meiPerfil`), não da tela usada. Regra dele: "o mesmo email pode ser usado, mas tem que entrar em logins diferentes".

Agora o token guarda `produto` (`pessoal` ou `mei`), gravado pela tela de entrada: senha, Google (cookie `google_produto`), segundo fator (o produto atravessa o desafio) e cadastro. `getSessao` calcula `modoMei` a cada requisição (`produtoDaSessao` e `sessaoEmModoMei` em `src/lib/acesso.ts`), e o layout usa `sessao.modoMei`. Token antigo, sem `produto`, abre o MEI só para conta que usa apenas a loja (tem MEI e nunca fez a conversa de boas-vindas do pessoal). Entrar por `/login/mei` com conta sem MEI responde "Esta conta ainda não tem o Tino MEI. Entre pelo login do Tino pessoal.", só depois de conferir a senha.

Conferido no servidor local e no Chromium: conta com os dois por `/login` abre `/painel`; por `/login/mei` abre `/loja` e `/api/panorama` responde 404; conta só pessoal recebe o aviso em `/login/mei`. Com o código antigo, o login pessoal da mesma conta redirecionava para `/loja`. Não conferido de ponta a ponta: o caminho com segundo fator ativo (tipado e com o produto passado, sem teste com código TOTP real).

Falta: ligar o MEI numa conta pessoal existente pela interface. A API (`PUT /api/mei`) existe, mas o menu pessoal não leva à tela MEI, e a loja (`Loja`) só nasce no cadastro MEI.

## 04/10/2026 — Catálogo e venda de serviços

Retomado o recorte local: categorias com imagem por URL, fornecedores, serviços, vínculos de produto por categoria/fornecedor e serviço vendável no Balcão. A tela `/loja/catalogo` permite criar, editar e arquivar categoria; criar/editar fornecedor; criar/editar/pausar serviço. Produto continua cadastrado na Prateleira e recebe categoria/fornecedor no Catálogo. A venda mista rateia desconto e receita entre comércio e serviço para a competência do MEI. Venda, baixa de estoque e competência são gravadas na mesma transação, pois falha parcial gerava divergência.

**Publicação (corrigido em 04/10/2026):** o catálogo **está publicado**. O registro anterior dizia que os deploys tinham falhado, mas o GitHub mostra dois projetos da Vercel recebendo cada commit do `main`: o projeto `tino` da conta `davi-pereiras-projects-0e1004d7`, que é o de produção de sempre, publicou `8cdd4b5`, `55e6bab` e `208a130` com sucesso (para `208a130`: `tino-au2cqtjj9-davi-pereiras-projects-0e1004d7.vercel.app`). As falhas (`dpl_Eaf1L8kWe3a1GnSng9J19EyRSBzi`, `dpl_9Z5EcVdHAwHsh4CAebieXPxr7z2G`, `dpl_GE9cpAqKPhMLpsRdMBHnvFSX6Rn6`) são de um **segundo projeto `tino` na conta `davi-pereiras-projects-24f2ce83`**, criado à parte e sem as variáveis de ambiente. Ele não serve o domínio de produção. Apagar esse projeto duplicado no painel da Vercel (Settings, Delete Project) acaba com o aviso vermelho em todo commit. Conferir no navegador `https://tino-kappa.vercel.app/loja/catalogo` com `demo-mei@tino.local`.

Verificação local: migrations aplicadas ao PostgreSQL Docker isolado, edição e venda mista via API, rateio R$ 36,00 = R$ 9,00 comércio + R$ 27,00 serviços, Catálogo móvel em 390px sem rolagem horizontal. A captura local ficou em `/tmp/tino-catalogo-servico-mobile.png`. O trabalho ainda precisa de compra, proposta, agenda, finanças completas e fiscal real descritos em `TINO-ERP-MEI.md`; esta entrega não os representa como prontos.

## 02/10/2026 — Demonstração MEI

Conta reservada `demo-mei@tino.local` / `demo12345`, com lar, loja, perfil MEI, produtos, entradas e saídas de estoque, vendas, três fiados, caixa, contas a pagar e competências de faturamento fictícios. `scripts/demo-mei.mjs` é chamado no build de produção e só cria quando o e-mail ainda não existe; redeploy não apaga alterações de visitantes. Não recebe teste de 14 dias, como a demo pessoal, para continuar acessível. Conferir login e APIs da loja após o deploy.

> Atualização de 09/09/2026: veja [continuidade do Tino](CONTINUAR-NO-OUTRO-NOTEBOOK.md). A rodada atual remodelou navegação e telas principais, substituiu mockups por capturas reais e corrigiu a migração fiscal. As seções antigas abaixo são histórico.

# Onde o projeto está

Última atualização: 03/09/2026.

## Resumo

App funcionando de ponta a ponta, rodando local. 251 testes passando, 63
rotas de pé no teste de fumaça, build limpo. Ainda **não publicado** — roda no
computador do Davi e é acessado pelo celular na rede de casa.

## Telas prontas

| Tela | Rota | O que faz |
|---|---|---|
| Visão geral | `/painel` | saldo, mês corrente, mapa de calor, categorias vs. mês passado, parcelas comprometidas, o que fazer agora |
| Análise | `/analise` | parecer contábil: DRE, balanço, 6 indicadores com faixa, prioridades ordenadas |
| Anotar | `/capturas` | fila de conferência e canais de entrada (celular, texto livre) |
| Transações | `/transacoes` | lista com filtros; corrigir categoria cria regra |
| Cartões | `/cartoes` | fatura aberta, limite consumido por parcela futura |
| Parcelamentos | `/parcelamentos` | cada parcela datada, compromisso por mês |
| Orçamento | `/orcamento` | limite por categoria, sugestão pela mediana de 6 meses |
| Dívidas | `/dividas` | CRUD, avalanche x bola de neve lado a lado |
| Plano de pagamento | `/plano` | roteiro mês a mês juntando conta negativa, fatura e dívidas |
| Simulador | `/simulador` | hipóteses empilháveis, comparação com e sem, 12 a 60 meses |
| Projeção | `/projecao` | fluxo de caixa de 12 meses |
| Empréstimo | `/emprestimos` | CET, veredito, tabela de amortização |
| Metas | `/metas` | progresso, aporte necessário, data prevista |
| Contas fixas | `/recorrencias` | alimenta projeção e reserva |
| Regras | `/regras` | o que o Tino aprendeu, reprocessar histórico |
| MEI | `/mei` | limite anual, DAS, lançamento de faturamento e baixa do DAS |
| Balcão | `/loja` | venda, formas de pagamento com taxa e prazo, caixa (Tino.mei) |
| Prateleira | `/loja/estoque` | saldo, custo médio e margem por produto (Tino.mei) |
| Fiado | `/loja/fiado` | quem deve, há quanto tempo, texto de cobrança (Tino.mei) |
| Longo prazo | `/investir` | efeito do corte no caixa, ARCA, divisão da renda, reserva |
| Configurações | `/configuracoes` | contas, refazer conversa inicial, falar com o suporte |
| Assinatura | `/assinatura` | plano, status de pagamento, próxima cobrança, trocar de plano, cancelar |
| Conversa inicial | `/bem-vindo` | 7 perguntas, todas puláveis |

## Telas do dono (admin)

Só abrem para usuário com `admin = true`. Para qualquer outra sessão devolvem
404 — não 403, que confirmaria a existência da rota. Como promover está em
`docs/PAGAMENTO-E-ADMIN.md`.

| Tela | Rota | O que faz |
|---|---|---|
| Visão geral | `/admin` | MRR, inadimplência, churn do mês, base de contas, o que precisa de ação |
| Contas | `/admin/contas` | lista com busca por e-mail ou nome, status de assinatura de cada uma |
| Pagamentos | `/admin/pagamentos` | histórico dos dois gateways na mesma tabela, recusas em bloco próprio |
| Suporte | `/admin/suporte` | fila de chamados abertos, mais antigo primeiro, com marcar resolvido |
| Configurações | `/admin/configuracoes` | preço dos planos, teto do cheque especial e dias de teste, editáveis sem deploy |

## Fila do Claude Design (29/09/2026)

Canvas parte 3: https://claude.ai/artifact/RKncch3jJ637GJaPyeQPUi (passos 30 a 47);
parte 4: https://claude.ai/artifact/JKqHBG2CQs8BoQqM7rEdAB (passo 48 em diante). Uma tela por
vez: o Davi escolhe, a escolha é implementada, testada e enviada, e só então
vem a próxima.

Esperando escolha (já desenhados, hoje e três caminhos):
1. Passo 30 · Início (A, B, C)
2. Passo 31 · Dívidas (D1, D2, D3)
3. Passo 32 · Análise (A, B, C)
4. Passo 33 · Extrato no computador (E1, E2, E3)
5. Passo 34 · Investir como corretora simulada, com agentes (I1, I2, I3)
6. Passo 35 · Entrar (L1, L2, L3), com "Esqueci a senha", que ainda não existe

A desenhar depois:
7. Assinatura
8. Notificações
9. Faturas por mês (Cartões): foi mudado direto em 29/09 antes da regra
   "design só depois do canvas"; entra no canvas para o Davi aprovar ou
   voltar ao que era.
10. Recuperar senha (pedir o link e criar a senha nova): a tela de Entrar
    já mostra "Esqueci a senha", mas o fluxo não existe.

Na volta das escolhas: juntar o PR #4 no main, guardar as 6 branches
antigas como tag e apagar, e cadastrar na Vercel ADMIN_EMAIL, ADMIN_SENHA,
TELEGRAM_BOT_USUARIO, TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SEGREDO e
CRON_SECRET.

## O que falta

Em ordem de valor, na minha leitura:

1. **Publicar.** O código já está pronto para isso: o `build` aplica as
   migrations, o schema tem `directUrl` para o pooler do Postgres gerenciado e
   `docs/PUBLICAR.md` tem o passo a passo. Falta o que só o Davi pode fazer —
   criar as contas no Neon e na Vercel e colar as variáveis. **Depende só do
   Davi**, listado em `docs/PARA-O-DAVI.md`.
1. **Ligar a cobrança.** Mercado Pago e Stripe estão implementados, com webhook
   conferido e idempotente, e rodam sem chave nenhuma (botão desabilitado com o
   motivo na tela). Falta criar as contas, gerar as chaves e colá-las na Vercel
   — **depende só do Davi**, passo a passo em `docs/PAGAMENTO-E-ADMIN.md`.
2. **Telas com teste raso.** `npm run test:fumaca` prova que as 40 checagens
   passam: toda página e toda rota de leitura respondem, rota protegida sem
   sessão continua fechada, e o saldo do painel bate com `/api/panorama`. O que
   falta é comportamento — preencher formulário, salvar, conferir o que a tela
   passa a mostrar — e os métodos de escrita da API, que o script não exercita
   para não sujar o banco.
3. **Faturas em PDF do Davi.** Os três PDFs dele têm senha; o app já pede a
   senha na tela Importar, mas ele ainda não informou. São 31 parcelamentos
   reais que continuam fora do sistema.
4. **Taxa real do cheque especial dele.** O app assume o teto de 8% a.m.
   quando não informada. O teto deixou de ser constante no código: está em
   `/admin/configuracoes`, e muda sem deploy.

## Contas no banco local

- `davi23mfgp@gmail.com` — a conta real do Davi. **Não apague.** Ele pulou a
  conversa inicial, então está quase vazia.
- `demo@tino.local` / `demo12345` — demonstração "Casa da Marina", 6 meses de
  histórico. Recriar com `node scripts/demo.mjs`.

## Pendência de ferramenta

`npm run lint` estava quebrado: o projeto nunca teve arquivo de configuração do
ESLint — o `next lint` gerava um na primeira execução, e esse comando saiu no
Next 16. O script virou `npm run tipos` (`tsc --noEmit`), que é a verificação
que de fato roda.

Para ter ESLint de volta é preciso subir `eslint` e `eslint-config-next` (hoje
em 14.2.3, contra Next 16) e criar um `eslint.config.mjs`. É mexer em
dependência com o build funcionando, então fica para uma decisão sua.

### Nada de visual foi conferido no olho ainda

A linguagem visual do iOS que entrou em `1dea3a6` — fonte, cor de ação, raio,
pauta mais fina — foi verificada por `tsc`, `next build`, os 251 testes e as 63
rotas do teste de fumaça. **Nenhuma tela foi vista rodando.**

Duas tentativas, as duas barradas por ambiente e não por configuração:

- a extensão do Chrome do Claude não conecta nesta máquina;
- o `agent-browser` foi instalado (05/09/2026) e o Chrome que ele baixa não
  sobe aqui: sai com código 0 sem escrever `DevToolsActivePort`, e falha até
  em `chrome.exe --version`, com erro de pipe do crashpad. O contorno que o
  próprio CLI sugere (`--no-sandbox`) é barrado pelo classificador de
  permissão da sessão.

Quem retomar numa máquina com navegador: `npm run db:start`, `npm run dev`, e
olhe antes de mexer em mais cor ou espaçamento. Contraste e token já foram
conferidos no número; o que falta é o julgamento de tela — se o azul do botão
briga com o azul do valor quando os dois aparecem juntos, se a pauta de 1px
ainda se vê, se o raio de 16px na ficha ficou mole perto do 14px do resto.

## Decisões de interface

- **Menu curto.** Só as cinco telas do dia a dia e as quatro decisões ficam à
  mostra. As outras oito vivem atrás de "Mais ferramentas", que abre sozinho
  quando alguém chega numa delas por link. Nenhuma rota foi removida: endereço
  que some quebra link salvo.
- **PF e MEI separados no cadastro.** A primeira pergunta é "Meu dinheiro" ou
  "Meu dinheiro e minha loja". Quem não é MEI nunca vê balcão, prateleira nem
  limite de faturamento. Dá para trocar depois em Configurações, e desligar
  nunca apaga o faturamento já lançado.
- **Barra do polegar muda com o perfil.** Lojista recebe Balcão e Prateleira no
  lugar de Análise e Cartões: no dia de trabalho ele abre o balcão dezenas de
  vezes e a análise nenhuma.
- **Identidade e mascote** estão em `docs/IDENTIDADE.md`.

## Renomeação: o que ainda carrega o nome antigo

O produto virou **Tino** em 30/08/2026 (passou por Bean.counter no caminho,
descartado por ser descritivo demais para registrar como marca). Código, telas,
rotas, documentos, o enum `PapelMensagem`, o banco local, o usuário do banco e
a pasta do Postgres portátil já usam o nome novo.

Continua antigo, e cada um por um motivo:

| O quê | Por quê | Como trocar |
|---|---|---|
| pasta do projeto `Documents\pierre` | caminho aberto em editor e terminal | renomear e reabrir |
| `PIERRE` na migration `20260823223045_inicial` | **não trocar.** Editar migration já aplicada quebra o checksum e o `migrate deploy` passa a falhar em toda máquina, produção inclusive. A migration `20260827120000` já renomeia o valor para `ASSISTENTE`. | nada a fazer |
| a menção à troca de nome no `CLAUDE.md` | é o registro de que a marca mudou de propósito, com data | nada a fazer |

O banco `pierre` antigo continua no cluster, intacto, ao lado do `tino`. É o
caminho de volta se algo tiver ficado para trás na cópia — apague só depois de
alguns dias de uso normal. Há também um dump de antes da troca em
`%LOCALAPPDATA%\Temp\claude\...\scratchpad\pierre.dump`.

## Decisões de produto já tomadas

- **Sem Open Finance.** O Davi disse que não vai usar. O adaptador continua em
  `src/lib/open-finance/` (contrato + Pluggy + sandbox), fora do menu.
  Reafirmado em 28/09/2026, depois de um período (07/09) em que ele tinha
  pedido de volta: a tela Entrada automática saiu do menu e dos ajustes, as
  telas `tela-conectar.tsx` e `sem-open-finance.tsx` foram apagadas e
  `/conectar` redireciona para Anotar. A seção "Conexão com o banco" dos
  ajustes só aparece para quem já tem conexão viva, para poder revogar.
- **Sem Open Finance (detalhe achado depois).** O callback em
  `src/app/api/open-finance/callback/route.ts:17` redireciona para `/contas`,
  página que não existe. Como o fluxo nunca é chamado, não quebra nada hoje —
  mas se o adaptador voltar ao menu, isso quebra primeiro.
- **Telegram, PDF e modelo de linguagem: adiados.** O código existe e funciona,
  mas ele pediu foco em cálculo e análise.
- **Visual próprio desde 30/08/2026.** O `globals.css` do Controllares saiu
  inteiro; a identidade atual está em `docs/IDENTIDADE.md`. Positivo é azul, não
  verde — verde já foi rejeitado aqui uma vez, não reintroduza.

### 09/09/2026 — revisão das telas avançadas

Valores cortados nos cartões corrigidos, formulário de contas fixas em diálogo com recuperação de falhas, campos de metas identificados e largura de notificações corrigida. Evidências e modo opcional de build com pouca memória em CONTINUAR-NO-OUTRO-NOTEBOOK.md.


### 09/09/2026 — iOS com shadcn

Pedido do usuário implementado na estrutura principal: abas Agora/Futuro/Categorias, Drawer e Accordion no menu, controles shadcn, previsão compartilhada e capturas reais atualizadas. Detalhes e verificações em CONTINUAR-NO-OUTRO-NOTEBOOK.md.


## Retomada em 10/09/2026
Notificações migradas para Sheet à direita com rolagem interna, títulos fortes e destaque por severidade. Busca e adicionar no cabeçalho; assistente na lateral no desktop e canto inferior direito no celular. Navegação pessoal não oferece módulos MEI; dados preservados. Permissions-Policy corrigida para permitir pedido de microfone na própria origem; reconhecimento de voz ainda precisa de validação no aparelho. Os demais pedidos de docs/PEDIDOS-REDESIGN-53.md continuam em andamento.

### 02/10/2026 — separação visual e de rotas do MEI
A conta com `meiPerfil` usa navegação própria de negócio, sem links, busca, sino ou atalho de lançamento pessoal. O layout redireciona páginas pessoais para `/loja`, e `comSessao` bloqueia as APIs pessoais. `/loja/minha-conta` concentra segurança, assinatura e direitos sobre os dados sem expor a página pessoal de configurações. No balcão, últimas vendas ocupam a largura toda abaixo do caixa e do resumo; a lista na coluna estreita deixava um vazio alto sob o teclado.

### 02/10/2026 — referência Bling no MEI
Os prints do Bling servem de referência funcional: confirmação cadastral, painel mensal e diário, evolução de vendas, produtos mais vendidos e canais de recebimento. A interface continua Tino; os números vêm exclusivamente de VendaLoja, ItemVenda e PagamentoVenda. Não haverá alegação de integrações externas, emissão automática de nota ou previsão inteligente sem serviço real. A confirmação grava CNPJ/razão social no perfil MEI, sincroniza CNPJ/inscrição estadual com a loja e acrescenta telefone de contato e declaração de isenção da inscrição estadual.
A revisão visual em produção encontrou o card de meta sem cadastro alto demais, com área ociosa; a meta virou faixa compacta e os blocos seguintes se reorganizam em duas colunas. "Dados da empresa" entrou na navegação MEI para dar título e acesso direto à confirmação.

### 02/10/2026 — referência do ERP Controllares
O arquivo `Projeto_Controllares-main (5).zip` foi examinado como referência de produto, não como instrução para transplantar código. O ERP reúne catálogo, clientes, movimentações de estoque auditáveis, propostas/vendas, parcelas e contas financeiras; o valor para o Tino está em manter esses dados ligados ao mesmo negócio, do produto ao recebimento e ao painel. A prioridade no MEI é completar o fluxo de venda existente (quantidade, desconto, cliente e pagamento), dar consulta às vendas e usar o estoque e o financeiro reais para indicadores. Obras, dimensionamento e automação residencial são domínio específico do Controllares e não entram no balcão. Os modelos monetários do Tino permanecem em centavos inteiros; não importar os `Decimal`/`Float` do projeto de referência.
O recorte pedido pelo Davi é objetivo: lojas físicas e digitais de MEI. O mesmo catálogo, cliente e estoque precisam servir à venda de balcão e ao pedido recebido pela internet ou WhatsApp, com origem identificável e um único resultado financeiro. Nesta rodada, o Balcão expõe quantidade, desconto em reais, identificação do cliente, observação e número de parcelas, que a API já gravava; a venda rápida segue sem campos obrigatórios novos. O fluxo completo de pedido digital e sua origem exigem modelagem própria antes de entrar na interface, para não simular uma integração com loja virtual que ainda não existe.

### 02/10/2026 — escopo ampliado para ERP modular MEI
Davi esclareceu que o alvo inclui comércio, serviços e operações mistas, com comercial/Kanban, campanhas, fornecedores, caixa, fluxo, contas, cobranças e fiscal, além de maquininha opcional. A arquitetura de produto e a ordem de construção estão em `docs/TINO-ERP-MEI.md`. O documento anterior fica como primeiro recorte da operação de loja, não como limite do produto. Nenhum botão de integração ou emissão será apresentado como funcional sem provedor real. Profissões não elegíveis ao MEI exigem outro enquadramento antes de oferecer o fluxo fiscal como MEI.
Novo esclarecimento: DAS e emissão de notas continuam como partes permanentes do ERP. O catálogo e as categorias devem ter relações funcionais semelhantes às do Controllares (categoria com imagem, itens vinculados e sugestão de serviço; ficha de produto com custo, fornecedor, SKU, imagem e dados fiscais), adaptadas ao cadastro progressivo do Tino. A especificação detalhada e a primeira entrega estão em `docs/TINO-ERP-MEI.md`.
O Davi acrescentou como núcleos fortes finanças completas, agenda, campanhas, estoque, clientes/chat, parceiros, suporte, configurações e IA. O Controllares é a principal referência funcional: tarefas e agenda ligadas à operação, campanhas por itens/categorias, catálogo e propostas, parceiros e módulos administrativos. O detalhamento e os critérios de dados reais/permissão estão em `docs/TINO-ERP-MEI.md`; a ordem de construção foi atualizada sem retirar DAS ou emissão de notas.

### 02/10/2026 — implementação autorizada do ERP modular
Davi autorizou implementar, revisar e publicar. O primeiro incremento começa pela base de catálogo, antes de ampliar pedidos e financeiro: `CategoriaLoja`, `FornecedorLoja` e `ServicoLoja` ligados à loja; produto mantém seu id, preço e movimentos e ganha SKU, descrição, imagem, marca, unidade e vínculos opcionais. A migração é aditiva, preservando vendas, DAS e notas existentes. Categoria e fornecedor usam vínculo, não texto solto; arquivar categoria mantém o histórico. Campos avançados são opcionais no primeiro cadastro.

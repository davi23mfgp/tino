# Auditoria geral do Tino: pessoal, MEI e site

Data: 2026-11-10 · Fase e item: Fase 7 (revisão geral), antes do redesenho pelo canvas

## A pergunta

O que está quebrado, confuso, lento ou incoerente no Tino hoje, tela por tela e
menu por menu, e o que precisa mudar para ele ser prático até para um idoso,
com cara de app profissional, e único no mercado nos dois produtos (pessoal e
MEI)? Pedido do Davi em 10/11/2026: "coeso, limpo, rápido, com uma excelente
experiência de usuário".

## Como foi feito

- **Robô de navegador** (Playwright) visitou 96 combinações de tela com medida
  válida: 6 do site, 26 do pessoal e 16 do negócio, cada uma no celular (390)
  e no computador (1280). O negócio foi visitado pela entrada dele
  (`/login/mei`) e também pela entrada comum. Em cada uma mediu: erro de console, pedido que falhou,
  largura estourada, letra menor que 12 px, alvo de toque menor que 40 px,
  botão sem nome, título da tela e quantidade de controles. Tirou captura de
  página inteira de todas.
- **Olho na captura**: 40 telas vistas uma a uma (pessoal e negócio no celular,
  amostra no computador, site).
- **Três revisões de código** pelos agentes do cavecrew: backend (45 das 133
  rotas lidas por inteiro), frontend (menu, componentes, acessibilidade) e
  site (texto, SEO, medição, cadastro).
- **Conferência à mão** de seis defeitos graves apontados pelos agentes, lendo
  o código: todos os seis confirmados.

Não foi feito: teste com pessoa de verdade (item 6.4), medida de velocidade em
produção (o ambiente local é o de desenvolvimento, mais lento, e os tempos não
valem como número), teste em aparelho real, e 88 rotas de API que o revisor não
leu por inteiro (lista no fim).

## Os números

| Onde | Telas | Letra menor que 12 px (mediana por tela) | Pior tela | Controles por tela (mediana) |
|---|---|---|---|---|
| Site, celular | 6 | 8 | 47 em /para-mei | 11 |
| Pessoal, celular | 26 | 48 | 217 no Simulador | 29 |
| Pessoal, computador | 26 | 75 | 240 no Simulador | 46 |
| Negócio, celular | 16 | 37 | 101 em MEI e DAS | 18 |
| Negócio, computador | 16 | 55 | 116 em MEI e DAS | 32 |

- **Todas as 84 telas medidas do app têm letra menor que 12 px.** A causa é uma só:
  `--escala-letra: 0.85` em `globals.css:51`, que leva 13 px para 11 e 12 px
  para 10,2. O rótulo da barra de baixo do celular, a navegação principal, é o
  menor texto do app (10,2 px).
- Nenhuma tela estourou a largura. Nenhuma mostrou tela de erro.
- O Início do pessoal no celular não tem título de tela (`h1`); Milhas,
  Montar, Plano de pagamento, Catálogo, Início simples e Seu negócio têm dois.
- Único erro de console: logo de loja que não existe (`/api/logo/...` 404), em
  4 telas. Pode ser do ambiente sem internet; conferir em produção.

## Achados

Severidade: **P0** quebra dinheiro, segurança ou venda. **P1** atrapalha quem
usa. **P2** acabamento.

### A. Segurança e dinheiro (P0, sem desenho, pode ir direto)

Confirmados lendo o código:

1. **Receber fiado sem dizer qual venda marca uma venda qualquer como paga.**
   `api/loja/fiado/route.ts:41`: `vendaId` não é validado; sem ele o filtro some.
2. **Excluir categoria movendo para a categoria de outra conta.**
   `api/categorias/[id]/route.ts:53`: `moverPara` não confere o dono.
3. **Editar um lado de uma transferência deixa os dois lados diferentes**, e o
   saldo para de fechar. `api/transacoes/[id]/route.ts:38`.
4. **Notificação: o servidor chama qualquer endereço que o cliente mandar**, e
   uma pessoa pode tomar a inscrição de outra. `api/push/route.ts:50`.
5. **Termos de Uso públicos com marcador de rascunho**: "[A DEFINIR: reembolso
   proporcional depois dos 7 dias, sim ou não.]". `(site)/termos/page.tsx:83`.
   Precisa de decisão do Davi.
6. **Login com Google liga a conta só pelo e-mail**, e o cadastro por senha não
   confirma o e-mail: quem cadastrar o Gmail de outra pessoa fica com a conta
   dela quando ela entrar pelo Google. `api/auth/cadastro/route.ts:80` e
   `api/auth/google/retorno/route.ts:62`.

Apontados pelo revisor, a conferir antes de corrigir:

7. Pagamento: evento do provedor gravado antes de aplicar, fora de transação;
   falha no meio faz o pagamento nunca valer. `lib/pagamento/index.ts:83`.
8. Excluir a conta não cancela a assinatura no Stripe ou Mercado Pago.
   `api/usuario/excluir/route.ts:41`.
9. Cadastro em vários passos sem transação: falha no meio tranca a pessoa
   para fora ("já existe uma conta"). `api/auth/cadastro/route.ts:68`.
10. `validar.ts:33`: `z.coerce` transforma vazio em zero e data vazia em 1970.
    Fere a regra 3 (número inventado) na borda de todas as rotas.
11. Dívida, empréstimo, conta e recorrência aceitam valor negativo, fração e
    taxa absurda (regras 1 e 2). Rotas listadas no relatório do backend.
12. Dois caixas abertos ao mesmo tempo e conta fixa lançada duas vezes com
    toque duplo: falta índice único no banco.

### B. Venda travada (P0)

13. **A tela Assinatura diz "O pagamento ainda não está disponível neste
    app".** Vista na captura. Sem isso não há venda.
14. **Sem medição nenhuma.** Não existe evento de visita, clique, cadastro,
    primeiro uso nem pagamento. Não dá para saber se o site converte.
15. **O site não tem endereço canônico, mapa do site, imagem de
    compartilhamento nem dados estruturados.** Link colado no WhatsApp sai sem
    imagem.
16. **Páginas públicas nunca ficam em cache** (`proxy.ts:33` manda `no-store`
    em tudo): cada visita ao site consulta o banco.

### C. Coerência: a mesma coisa com nomes e lugares diferentes (P1)

17. **Duas portas para a mesma conta.** Quem tem negócio e entra por `/login`
    vê o menu do pessoal mesmo dentro de `/loja`, com o título "Tino" no topo;
    o menu do negócio só existe para quem entra por `/login/mei`. Medido: pela porta comum,
    10 das 16 telas do negócio mostravam "Tino" como título; pela porta do
    negócio, todas mostram o nome certo.
18. **Três nomes para a mesma tela**: "Perfil", "Configurações" e "Minha
    conta" levam a `/configuracoes`.
19. **Duas telas chamadas "Anotar"** (`/capturas` e `/lancar`); "Visão geral"
    e "Início" para a mesma tela da loja; "Contas a pagar", "Contas fixas" e
    "Meu mês" disputando a mesma palavra.
20. **Dois botões "+" na mesma tela do celular**: um no topo, um no meio da
    barra de baixo. O topo tem quatro botões redondos (mais, leão, sino,
    avatar) em todas as telas.
21. **Telas órfãs**: `/orcamento` (substituída por Meu mês), `/loja/maquininha`
    (sem nenhum link), `/parcelamentos` (só redireciona).
22. **Dois estilos de cartão misturados**: branco sólido em Metas, Análise e
    Investimentos; vidro escuro no resto.
23. **Descrições do menu sem acento** ("preferencias", "Orcamento", "Dividas").
24. **Três frases de posicionamento**: "seu contador pessoal", "Seu dinheiro,
    mais simples", e "tino+" para o MEI. O plano do MEI se chama "Tino MEI" no
    site e "Meu negócio" na Assinatura.

### D. Idoso e leitura (P1)

25. **Letra pequena em tudo** (ver os números). Subir a escala é a mudança de
    maior efeito no app inteiro, e mexe em todas as telas: vai pelo canvas.
26. **Telas com controles demais para uma tela de celular**: Contas a pagar
    (58), Meu mês (54), Balcão (47), Fluxo de caixa (45), Extrato (40). No
    Extrato há faixa de dias, três totais, busca, filtros, três abas e três
    seletores antes do primeiro lançamento.
27. **Aviso da política de privacidade ocupa um quinto da tela em todas as
    telas** até a pessoa tocar em "Entendi".
28. **Palavras de contador na tela**: "aporte", "resgate", "DRE", "fluxo de
    caixa", "comprometimento da renda", "DAS" sem explicar.
29. **O modo simples da loja é o melhor desenho do app para idoso** (seis
    blocos grandes: Vender, Fiado, Agenda, Quanto tenho, Pagar o DAS, Pedir
    ajuda). O pessoal não tem equivalente.
30. Campo de anotar rápido sem rótulo (`lancar/page.tsx:82`); busca do Extrato
    e campos de Regras só com texto de exemplo.

### E. Velocidade (P1)

31. **27 das 28 telas "use client" buscam os dados depois de abrir**, e
    "Carregando…" aparece em 17 arquivos: a primeira coisa que a pessoa vê é
    espera. Só o Início vem pronto do servidor.
32. **Toda chamada com sessão faz uma transação com trava no banco** para
    contar limite (`lib/api.ts:77`): dez chamadas de uma tela entram em fila.
33. **A biblioteca de gráficos entra em toda tela que usa um gráfico**, sem
    carregar sob demanda (`graficos.tsx`, 900 linhas).
34. Arquivos gigantes que ninguém consegue revisar: Prateleira (749 linhas),
    Configurações (683), Balcão (672), Simulador (596).
35. Faltam índices no banco para consultas de todo dia (conta fixa, meta e
    dívida no lançamento; conversa do Telegram).

### F. Site, como marketing (P1)

36. **A primeira dobra não diz o que é nem para quem.** "Seu dinheiro
    organizado. Sua vida com espaço para acontecer." serve para qualquer app.
    Os diferenciais (dívida com data, casal, sem conectar o banco) ficam
    abaixo. Preço e teste grátis não aparecem na dobra.
37. **O botão em destaque no topo é "Entrar"**, não o de começar.
38. **No celular não há botão fixo de cadastro**, e o menu mostra só "Para
    MEI".
39. **Nenhuma prova** (depoimento, caso, número). Não inventar: colher de
    verdade.
40. **Dúvidas não respondem às objeções reais**: meus dados, casal, preço,
    cancelamento, reembolso.
41. **O conteúdo abaixo da primeira dobra começa invisível** e só aparece com
    JavaScript e rolagem (visto na captura de página inteira de /para-mei,
    quase toda preta). Quem compartilha, o buscador e quem tem conexão ruim
    podem ver a página vazia.
42. **Promessa que o próprio termo desmente**: o plano pessoal anuncia
    "Parecer com DRE, balanço e indicadores", e o Termo diz que o Tino não é
    serviço de contabilidade.
43. **Marca de terceiros no site**: logo do Banco do Brasil e do Nubank nas
    capturas. Decisão do Davi (trocar por banco fictício).
44. Cadastro pede demais antes do primeiro uso: no MEI, razão social, CNPJ,
    telefone e atividade; no pessoal, o tipo de lar. O botão fica desligado
    sem dizer por quê.
45. Rodapé sem CNPJ, contato nem endereço. Cookie de origem gravado sem aviso.
46. Números fixos no código do site ("vence em 7 dias", "R$ 423").

## Andamento

- **Lote 1, 10/11/2026:** corrigidos os achados 1, 2, 3, 4, 7, 8, 9, 10, 11, 12
  e 35, cada um reproduzido antes. Achado 6 confirmado, esperando o Davi
  decidir a confirmação de e-mail. A corrida de dois toques em conta fixa
  (parte do 12) não se reproduziu no teste local.

## O que já é único, e o que falta para parecer

O estudo de 10/11 (`2026-11-10-revisao-geral-tino-pessoal.md`) comparou com
Pierre, Kelo, Mobills, Organizze, YNAB, Monarch e Copilot. O que nenhum deles
mostra na frente e o Tino já calcula:

**Pessoal**

- **A data em que a dívida acaba.** Está pronta em Plano de pagamento ("Você
  fica sem dívida em fevereiro de 2028"), a três toques do Início.
- **Nada entra sem você conferir, em um toque.** É a resposta honesta à falta
  de Open Finance.
- **Todo número com a referência ao lado.**
- **Funciona para o casal.**
- **Avisa antes** (feito hoje: fatura que fecha, parcela que acaba, resumo da
  semana).

**MEI**

- **Quanto do limite do MEI ainda cabe no ano**, com o DAS e os atrasados.
- **Fechar o mês com o relatório mensal pronto**, venda por venda, com nota.
- **Fiado com idade da dívida.**
- **Modo simples** com seis blocos.
- **A mesma conta para a casa e o negócio.**

O que falta é dizer isso na frente: no site, no Início e no nome das coisas.
Proposta de frase única, a validar com o Davi: **"O Tino diz a data."** (a
data em que a dívida acaba, em que a meta chega, em que o limite do MEI
estoura). É verdadeira, cabe nos dois produtos e ninguém da tabela usa.

## O que vai para o canvas (precisa da escolha do Davi)

| Passo | Tela ou assunto | Por quê |
|---|---|---|
| 62 | Tamanho da letra e do toque no app inteiro | achado 25; mexe em todas as telas |
| 63 | Topo e barra de baixo: um "+" só, menos botões, nome único para a conta | achados 18 e 20 |
| 64 | Menu do pessoal por pergunta (Como estou, Para onde foi, Quanto posso gastar, Quando chego lá) | achados 19 e 26; continua o passo 60 |
| 65 | Extrato: lista primeiro, filtros um toque abaixo | achado 26 |
| 66 | Modo simples no pessoal, à imagem do da loja | achado 29 |
| 67 | Uma porta só: trocar entre casa e negócio dentro do app | achado 17 |
| 68 | Cartão único (acabar com a mistura de branco e vidro) | achado 22 |
| 69 | Site: primeira dobra com a data, preço e teste; botão fixo no celular | achados 36 a 41 |
| 70 | Transferência à mão, conferir saldo com o banco, fechar o mês no pessoal, meta como linha do mês | estudo de 10/11 |

## O que não passa pelo canvas (correção, texto e velocidade)

Grupos A e E inteiros; do grupo B, medição, SEO e cache; do grupo C, acentos,
telas órfãs e nomes (os nomes novos saem do passo 63 e 64); do grupo D, rótulos
de campo e palavras de contador; do grupo F, itens 42, 44, 45 e 46. O roteiro
está em `docs/PROMPT-OPUS-AUDITORIA.md`.

## Decisões do Davi (10/11/2026)

1. **Reembolso proporcional depois dos 7 dias: não.** Termo corrigido no mesmo
   dia (item 5 resolvido).
2. **Pagamento: Mercado Pago primeiro.** O código já existe
   (`lib/pagamento/mercadopago.ts`); falta o Davi colocar
   `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET` na Vercel. O
   Stripe fica para depois.
3. **Logos de banco no site: pode usar.** Ficam as marcas reais (item 43
   fechado por decisão dele; o risco de marca de terceiro continua anotado).
4. **Frase de posicionamento: ainda não decidida.** A proposta foi explicada
   de novo; esperando resposta.
5. **Tamanho da letra: o Opus projeta a escala nova** (passo 62 do canvas),
   com a escolha final do Davi.

## Limites desta auditoria

- 88 rotas de API não foram lidas por inteiro: a maior parte de `loja/**`
  (agenda, orçamentos, ordens, produtos, relatórios), `tino/*`, `mei/ligar`,
  `investir/*`, `simulador`, `plano-pagamento`, `importar` (leitura) e
  `lib/importar/*`.
- Os achados 7 a 12 e 31 a 35 vêm dos revisores e não foram conferidos à mão.
- Tema claro não foi visto. Leitor de tela não foi usado.
- Tempo de carregamento não foi medido em produção.
- A conta de demonstração do MEI tem pouca venda; telas cheias podem esconder
  defeitos que a vazia não mostra.
- As capturas de página inteira mostram a barra de baixo no meio da tela: é
  efeito da captura, não defeito do app.
- **Lote 3, 12/11/2026:** corrigidos 23, 28 (tabela aprovada pelo Davi) e 30.
  Achado 21: `/orcamento` não é órfã (tem orçamento do casal e divisão da
  renda), e ligar a Maquininha é mudança visível; os dois vão para o canvas.
- **Lote 4, 12/11/2026:** corrigidos 14 (funil próprio, tela Funil no admin),
  15, 16, 42, 44 (só a explicação do botão) e 45. Achado 46 (números fixos
  na arte do site) esperando o canvas, passo 69: tirar ou trocar muda o
  desenho. Não testado no navegador: a tela Funil do admin (pede o segundo
  fator) e a etapa "pagou", que só um aviso real do Mercado Pago dispara.

# Plano em fases: acompanhamento

Pedido do Davi (06/10/2026): tudo em fases, para acompanhar o que foi feito,
o que não foi, o que precisa melhorar e o que vem a seguir. Este arquivo é o
painel. Atualize **a cada entrega**, no mesmo commit.

- Plano completo, com mercado, casos e números:
  [Tino · Plano estratégico](https://claude.ai/code/artifact/0b555476-3cc6-436a-89dd-8980d12ab07d)
- Toda recomendação passa antes pela skill `estudo-de-mercado`; os estudos
  ficam em `docs/pesquisas/`.
- O plano técnico antigo do módulo da loja está em `docs/TINO-MEI-FASES.md`
  (histórico, fases 0 a 5 da loja, todas feitas).

Legenda: ✅ feito · 🔨 em andamento · ⏳ não começado · 🙋 depende do Davi

## Decisões aceitas

Davi, 06/10/2026: "vamos seguir as recomendações que você fez".

| Decisão | O que foi aceito |
|---|---|
| Tino por área | um Tino geral; no cadastro a pessoa escolhe área e subárea; 10 áreas leves na Fase 1, uma área funda por vez |
| Primeira área funda | Assistência técnica, depois Beleza, depois Moda e vestuário |
| Nome | "Tino" mais a área: Tino Assistência, Tino Beleza. "Plus" fica livre para um plano maior no futuro |
| Área no preço | a área vem incluída no plano Meu negócio, sem custo a mais |
| Preço | Meu dinheiro R$ 19,90; Meu negócio R$ 49,90; Vários negócios R$ 79,90 (este entra junto com o item 1.1) |
| Cobrança | desde o primeiro dia, com teste de 14 dias; sem plano grátis para sempre |
| Marca branca | marca própria primeiro; marca do escritório de contabilidade na Fase 5 |
| Maquininha | neutro: ler todas, nunca ter a própria. A primeira a integrar sai das conversas com clientes |

## Fase 1: pronto para vender (out. a dez. de 2026)

**Meta de passagem:** 30 negócios de assistência técnica usando por quatro
semanas seguidas, e pelo menos 10 pagando.

| # | Item | Situação | Estudo | Próximo passo |
|---|---|---|---|---|
| 1.1 | Vários negócios por conta, com troca visível no topo | ✅ | [estudo](pesquisas/2026-10-06-escolha-de-area-e-varios-negocios.md) | opção A no código (06/10); falta: Casa num toque e funcionário por negócio |
| 1.2 | Área e subárea no cadastro (10 áreas, modo leve) | ✅ | [estudo](pesquisas/2026-10-06-escolha-de-area-e-varios-negocios.md) | opção A no código (06/10); o menu por área fica para a área funda (1.8) |
| 1.3 | Ativar o MEI numa conta pessoal que já existe | ⏳ | [estudo](pesquisas/2026-10-06-ativar-mei-na-conta-pessoal.md) | 🙋 escolher no [canvas, passo 40](https://claude.ai/artifact/RKncch3jJ637GJaPyeQPUi): A no Perfil e no login, B convite no Início, C no próprio login MEI |
| 1.4 | Relatório do mês para o contador | ⏳ | [estudo](pesquisas/2026-10-06-relatorio-para-o-contador.md) | 🙋 escolher no [canvas, passo 41](https://claude.ai/artifact/RKncch3jJ637GJaPyeQPUi): A relatório oficial na tela MEI, B fechar o mês, C página do contador; conferir o texto da resolução antes |
| 1.5 | Cobrança ligada (Mercado Pago ou Stripe) | 🙋 | plano, seção Modelo de negócio | Davi põe as chaves, ver `docs/PAGAMENTO-E-ADMIN.md` |
| 1.6 | Origem do cadastro (indicação, link, contador, anúncio) | 🔨 | [estudo](pesquisas/2026-10-06-origem-do-cadastro.md) | parte automática no código (06/10: campanha, indicação e site de origem gravados no cadastro); falta a pergunta: 🙋 escolher no [canvas, passo 42](https://claude.ai/artifact/RKncch3jJ637GJaPyeQPUi) (A fim do cadastro, B boas-vindas, C uma semana depois), e ver no painel do admin |
| 1.7 | Plano "Meu dinheiro e minha loja" passa a se chamar "Meu negócio" | ✅ | plano, seção Modelo de negócio | no código (06/10), com a lista do que inclui atualizada (área, clientes, orçamento, OS). O plano Vários negócios (R$ 79,90) entra com a tela de Assinatura, que passa pelo canvas |
| 1.9 | Recuperar senha por e-mail | ✅ | não precisa: defeito | no código (06/10); 🙋 o e-mail só sai com `RESEND_API_KEY` e `EMAIL_REMETENTE` na Vercel |
| 1.8 | Área funda: Assistência técnica (IMEI, senha, garantia, checklist de entrada) | ✅ | [estudo](pesquisas/2026-10-06-area-funda-assistencia-tecnica.md) | no código (07/10): entrada do aparelho, busca de modelo, QR, conferência do cliente, garantia, aparelho esquecido e retorno em garantia. Depois das conversas: foto do aparelho |

**Fora do código, com o Davi** (passo a passo com caixas de marcar: [O que o Davi faz](https://claude.ai/code/artifact/18f50cdf-5e06-4fc0-9638-772d1c9304a4)):

| Item | Situação |
|---|---|
| Juntar o PR #15 no `main` | ✅ juntado pelo Davi em 06/10/2026 |
| Vercel: projeto duplicado (24f2ce83) | não está em nenhuma conta que o Davi acessa; fica, só deixa sinal vermelho no PR |
| Vercel: prévias separadas do banco de verdade (variáveis de teste para todas as prévias, as de produção só em Production) | ✅ feito pelo Davi em 06/10/2026; prévia da branch `claude/` Ready |
| Admin: entrada própria `/acesso-admin` (só e-mail, senha e código; login comum e Google recusam admin), e-mail `admin@tino.interno` | ✅ no ar e funcionando (06/10/2026); 🙋 apagar `ADMIN_SENHA` e `ADMIN_REDEFINIR_SENHA` da Vercel |
| Variáveis adiadas: ADMIN_EMAIL, ADMIN_SENHA, TELEGRAM_*, CRON_SECRET, RESEND_API_KEY e EMAIL_REMETENTE (recuperar senha) | 🙋 |
| Lista de 50 assistências técnicas e 5 distribuidoras da região | 🙋 |
| 15 conversas de 20 minutos com donos de assistência | 🙋 |
| Registrar a marca Tino no INPI; confirmar a titularidade do código do Controllares | 🙋 |

## Fase 2: o Tino que ensina (jan. a mar. de 2027)

**Meta de passagem:** 100 negócios pagando, 70% ainda pagando após três meses.

| # | Item | Situação | Estudo | Próximo passo |
|---|---|---|---|---|
| 2.1 | Guia do negócio (passos com o porquê) | 🔨 | [estudo](pesquisas/2026-10-07-guia-e-analise-de-clientes.md) | regras e API prontas (`guiaDoNegocio`, `/api/loja/analises`); 🙋 escolher no [canvas, passo 43](https://claude.ai/artifact/RKncch3jJ637GJaPyeQPUi) |
| 2.2 | Análise de clientes em linguagem simples | 🔨 | [estudo](pesquisas/2026-10-07-guia-e-analise-de-clientes.md) | regras e API prontas (`gruposDeClientes`); 🙋 escolher no [canvas, passo 44](https://claude.ai/artifact/RKncch3jJ637GJaPyeQPUi) |
| 2.3 | Cobrança por Pix no link do orçamento, da OS e do fiado | 🔨 | [estudo](pesquisas/2026-10-07-pix-rodape-motivos-indicacao.md) | BR Code pronto (`src/lib/pix.ts`, igual ao exemplo do manual do BC) e chave Pix na base; 🙋 escolher no [canvas, passo 45](https://claude.ai/artifact/RKncch3jJ637GJaPyeQPUi) |
| 2.4 | Relatório de motivos de perda dos orçamentos | 🔨 | [estudo](pesquisas/2026-10-07-pix-rodape-motivos-indicacao.md) | regras e API prontas (`motivosDePerda`); 🙋 escolher no [canvas, passo 44](https://claude.ai/artifact/RKncch3jJ637GJaPyeQPUi) |
| 2.5 | Rodapé "feito com o Tino" nos links públicos (canvas antes) | ⏳ | [estudo](pesquisas/2026-10-07-pix-rodape-motivos-indicacao.md) | hoje é só texto ("Feito com o Tino"), sem link; 🙋 escolher no [canvas, passo 45](https://claude.ai/artifact/RKncch3jJ637GJaPyeQPUi), junto do Pix |
| 2.6 | Indicação: um mês grátis para os dois | 🔨 | [estudo](pesquisas/2026-10-07-pix-rodape-motivos-indicacao.md) | código, link e contagem prontos (`/api/indicacao`, testado com cadastro de verdade); 🙋 escolher no [canvas, passo 46](https://claude.ai/artifact/RKncch3jJ637GJaPyeQPUi); o prêmio depende da cobrança ligada (1.5) |
| 2.7 | Área funda: Beleza | ⏳ | [estudo](pesquisas/2026-10-07-area-funda-beleza.md) | 🙋 escolher no [canvas, passo 47](https://claude.ai/artifact/RKncch3jJ637GJaPyeQPUi): agenda por profissional e horário, confirmação na véspera |

## Fase 3: o assessor (abr. a jun. de 2027)

**Meta de passagem:** 300 negócios pagando; assessor usado por um terço deles toda semana.

| # | Item | Situação | Estudo | Próximo passo |
|---|---|---|---|---|
| 3.1 | Agendar por pedido, com confirmação num toque | 🔨 | [estudo](pesquisas/2026-10-07-fase-3-assessor.md) | leitor do pedido pronto e testado (`lerPedidoDeAgenda`, `/api/loja/agenda/pedido`: "amanhã às 15h com a Ana" vira proposta); 🙋 escolher no [canvas parte 4, passo 48](https://claude.ai/artifact/JKqHBG2CQs8BoQqM7rEdAB) |
| 3.2 | Google Agenda | 🔨 | [estudo](pesquisas/2026-10-07-fase-3-assessor.md) | link "adicionar ao Google Agenda" e arquivo .ics prontos (`/api/loja/agenda/compromissos/[id]/exportar`), botões no [passo 48](https://claude.ai/artifact/JKqHBG2CQs8BoQqM7rEdAB); a integração que escreve sozinha espera a verificação do app no Google (🙋 Davi) |
| 3.3 | Ajuda tributária com fonte e data; "caso de contador" quando passar do escrito | 🔨 | [estudo](pesquisas/2026-10-07-fase-3-assessor.md) | catálogo de 7 regras com fonte e data e os números da conta (`/api/mei/pergunta`); 🙋 escolher no [canvas parte 4, passo 49](https://claude.ai/artifact/JKqHBG2CQs8BoQqM7rEdAB); conferir o texto da LC 123 antes de abrir ao público |
| 3.4 | Modo simples (letra maior, menos itens) | ⏳ | [estudo](pesquisas/2026-10-07-fase-3-assessor.md) (adendo do 3.4) | 🙋 escolher no [canvas parte 4, passo 50](https://claude.ai/artifact/JKqHBG2CQs8BoQqM7rEdAB): blocos grandes, a mesma tela maior, ou montado por quem ajuda |
| 3.5 | Área funda: Moda e vestuário | ⏳ | [estudo](pesquisas/2026-10-07-fase-3-assessor.md) | estudo próprio quando chegar a vez (depois de Beleza) |

## Fase 4: ligar o dinheiro (jul. a set. de 2027)

**Meta de passagem:** 40% dos clientes da maquininha escolhida conectados.

| # | Item | Situação |
|---|---|---|
| 4.1 | Primeira maquininha integrada, conciliando com o Balcão | ⏳ |
| 4.2 | Nota de serviço (NFS-e) pelo padrão nacional | ⏳ |

## Fase 5: escala (a partir de out. de 2027)

| # | Item | Situação |
|---|---|---|
| 5.1 | Marca do escritório com o primeiro contador parceiro | ⏳ |
| 5.2 | Mais áreas fundas, pela resposta dos clientes | ⏳ |

## Fase 6: acabamento visual

Pedido do Davi (06/10/2026): depois das fases de produto, uma fase só de
visual, para deixar tudo certo.

| # | Item | Situação |
|---|---|---|
| 6.1 | Inventário de todas as telas (pessoal e negócio), com captura no celular (390px) e no computador (1280px), tema claro e escuro | ⏳ |
| 6.2 | Telas que ainda não passaram pelo canvas vão para o canvas (inclui a fila antiga: Assinatura e Notificações) | ⏳ |
| 6.3 | Uma linguagem só: estilo das telas da loja, vidro na página, sólido no que abre por cima | ⏳ |
| 6.4 | Teste de uso com pessoas de mais idade (a pergunta "uma pessoa de 65 anos usa sem ajuda?") | ⏳ |
| 6.5 | Painel do admin melhor: as métricas do plano (ativação, conversão do teste, permanência, origem do cadastro) na primeira tela; estudo e canvas antes. Davi, 06/10: "isso é algo pra depois" | ⏳ |

## Fase 7: revisão e lançamento dos dois produtos

Pedido do Davi (06/10/2026): revisar mercado, produto e tudo, inclusive o
Tino pessoal, e deixar os dois prontos para o lançamento.

| # | Item | Situação |
|---|---|---|
| 7.1 | Estudo de mercado novo do **Tino negócio**: concorrentes, preços e casos atualizados | ⏳ |
| 7.2 | Estudo de mercado do **Tino pessoal** (apps de finanças pessoais do Brasil e de fora), que ainda não foi feito | ⏳ |
| 7.3 | Revisão do produto, tela por tela, com as três perguntas da visão: serve a mais de um segmento? funciona com mais de um negócio? uma pessoa de 65 anos usa sem ajuda? | ⏳ |
| 7.4 | Revisão de segurança e LGPD antes de abrir ao público | ⏳ |
| 7.5 | Pronto para lançar: preço, termos, suporte, site, cobrança, métricas, página de cada área | ⏳ |
| 7.6 | Lançamento público do Tino pessoal e do Tino negócio | ⏳ |

**Uma observação sobre a ordem.** Lançamento público (anúncio, divulgação
aberta) fica para a Fase 7. Mas a **venda assistida** da Fase 1 (o Davi
instalando o Tino em 30 assistências) continua no começo: é ela que diz o
que corrigir antes do lançamento. O estudo do plano estratégico mostra que
produto lançado sem esse teste gasta marketing para encher um balde furado.

## Feito antes deste plano (base da Fase 1)

- ✅ Login pessoal e login MEI separados (04/10/2026)
- ✅ Clientes e orçamento com link e aprovação (05/10/2026, passo 36)
- ✅ Agenda, ordem de serviço e sino do MEI (05/10/2026, passo 37)
- ✅ Plano estratégico com casos de mercado (06/10/2026)
- ✅ CI de volta ao verde: alerta de segurança no `source-map-js` (06/10/2026)

## O que precisa melhorar (defeitos e faltas conhecidas)

- Agenda: arrastar compromisso para outra hora; compromisso que se repete.
- O estudo de mercado deste ambiente depende de resumo de busca: as páginas
  não abrem daqui. Números para apresentação externa precisam ser conferidos.

## Registro

| Data | O que aconteceu |
|---|---|
| 07/10/2026 | Canvas parte 4 aberto (https://claude.ai/artifact/JKqHBG2CQs8BoQqM7rEdAB) com os passos 48 (assessor e Google Agenda), 49 (ajuda tributária) e 50 (modo simples); estudo do modo simples (Apple, Samsung, Uber) no adendo do estudo da Fase 3. Esperam a escolha do Davi. |
| 07/10/2026 | Fase 3 sem tela: leitor de pedido de agenda, link do Google Agenda e .ics, catálogo de regras do MEI com fonte e data (DAS 2026 conferido com o salário mínimo de R$ 1.621). A conta do ano do MEI saiu da rota para `anoDoMei`, usada pela tela e pela ajuda tributária. |
| 07/10/2026 | Canvas dos passos 43 a 47 publicado (Guia, Clientes e perdas, Pix e rodapé, Indicação, Beleza). Esperam a escolha do Davi. |
| 07/10/2026 | Fase 2 sem tela: Guia do negócio, grupos de clientes, motivos de perda (uma rota, `/api/loja/analises`, conferida com a demonstração: os mesmos 3 DAS atrasados da tela MEI), Pix BR Code e chave Pix da loja, indicação com código e contagem. As telas esperam a escolha no canvas. |
| 07/10/2026 | Estudos de mercado da Fase 2 (2.1 a 2.7) em `docs/pesquisas/`. Davi pediu para seguir sozinho com as fases e deixar o que depende dele para o fim. |
| 07/10/2026 | Item 1.8 fechado: lembrete de aparelho pronto e não buscado (7, 30 e 60 dias, no sino e na ficha) e retorno em garantia proposto pelo IMEI na entrada. |
| 07/10/2026 | Passo 39 no código: entrada do aparelho (busca de 740 modelos pelo começo, IMEI conferido, desenho de tocar o defeito, senha cifrada que some na entrega), QR de acompanhamento com comprovante impresso, e o cliente conferindo a entrada e vendo a garantia pelo link. Refinado para o traço fino a pedido do Davi. |
| 06/10/2026 | Canvas dos passos 39 a 42 publicado ("Tino · telas, parte 3"): Assistência funda, ligar o negócio na conta pessoal, relatório do contador e como conheceu o Tino. Esperam a escolha do Davi. |
| 06/10/2026 | Item 1.6, parte automática: o cadastro grava de onde a pessoa veio (campanha, indicação, site). Termos na versão 2026-10-06 por causa do cookie novo. |
| 06/10/2026 | Estudos de mercado dos itens 1.3, 1.4, 1.6 e 1.8 em `docs/pesquisas/`. Próximo: a parte automática do 1.6 no código e os canvas dos quatro, para o Davi escolher de uma vez. |
| 06/10/2026 | Item 1.7: o plano passou a se chamar Meu negócio. Achado no caminho: `PAGAMENTO-E-ADMIN.md` dizia anual de R$ 199 e R$ 499, mas o código cobra R$ 214,92 e R$ 538,92 (doze meses com 10% de desconto); o documento foi corrigido. |
| 06/10/2026 | Item 1.9: recuperar senha por e-mail, com link de 30 minutos e uso único, testado no navegador. O envio espera as chaves do Resend na Vercel. |
| 06/10/2026 | Falha de segurança achada e corrigida no código: o login pelo Google ligava sozinho a conta de admin (`admin.tino@gmail.com`, um Gmail que ninguém criou) a quem criasse esse Gmail. Agora o Google nunca se liga sozinho a conta de admin (`podeLigarGoogleSozinho`, testado). Prévias da Vercel consertadas pelo Davi. |
| 06/10/2026 | PR #15 juntado no `main` (Clientes, orçamento, Agenda, OS, sino do MEI, plano e painel). Prévia: falta só `MFA_CHAVE_CRIPTOGRAFIA` no Preview. |
| 06/10/2026 | Opção A do passo 38 implementada: "O que você faz?" no cadastro, troca de negócio no topo, aviso de mesmo CNPJ, MEI somando todos os negócios. Detalhes e faltas em `docs/ESTADO.md`. |
| 06/10/2026 | Canvas passo 38 publicado ("Tino · telas, parte 3", página 38): escolha de área no cadastro e troca de negócio, hoje e três opções, cada uma dizendo em quem se inspirou. |
| 06/10/2026 | Fases 6 (acabamento visual) e 7 (revisão e lançamento do Tino pessoal e do Tino negócio) entram no plano, a pedido do Davi. |
| 06/10/2026 | Plano estratégico aceito. Criados este painel, a skill `estudo-de-mercado` e o primeiro estudo (área e vários negócios). Próximo: canvas passo 38. |

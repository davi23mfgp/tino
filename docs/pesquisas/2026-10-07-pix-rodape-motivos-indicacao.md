# Estudo: Pix no link, rodapé "feito com o Tino", motivos de perda e indicação

Data: 2026-10-07 · Fase e item: Fase 2, itens 2.3, 2.4, 2.5 e 2.6

## A pergunta

Quatro alavancas pequenas que a Fase 2 pede: o cliente pagar por Pix no
link que já recebe (2.3), a loja saber por que perde orçamento (2.4), o link
público trazer cliente novo para o Tino (2.5) e quem gosta indicar (2.6).
Faz sentido cada uma, e como fazer sem custo e sem prometer o que não há?

## Quem já faz

| Referência | O que faz | Resultado ou número | Fonte | Força |
|---|---|---|---|---|
| Banco Central, Pix | Pix de pessoa para empresa foi 42,1% das transações no 1º semestre de 2025; 76% delas de até R$ 60. | dado oficial, por imprensa | [Finsiders](https://finsidersbrasil.com.br/noticias-sobre-fintechs/pix-de-pessoas-para-empresas-cresce-e-atinge-quase-30-das-transacoes), [Diário do Nordeste](https://diariodonordeste.verdesmares.com.br/negocios/pix-e-meio-de-pagamento-mais-utilizado-no-pais-no-2-semestre-de-2025-diz-bc-1.3755702) | média (imprensa citando o BC) |
| Banco Central, BR Code | O QR **estático** segue o Manual de Padrões para Iniciação do Pix (padrão EMV): chave, valor opcional, nome, cidade, identificador e CRC. Não precisa de banco nem de taxa; o mesmo texto é o "copia e cola". | regra oficial | [BCB, Manual de Padrões](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf) | forte |
| Pipedrive (Estônia/EUA) | Ao marcar negócio como perdido, pede o motivo; o relatório mostra perdas por motivo, em quantidade e em valor. | sem número | [Pipedrive, motivos de perda](https://support.pipedrive.com/en/article/lost-reasons), [Databox](https://databox.com/metric-library/metrics/pipedrive/deals-lost-by-reason) | forte (documentação) |
| Calendly (EUA) | Selo da marca na página que o cliente do usuário usa, e convite para criar a própria conta depois de agendar. Cresceu por boca a boca até 20 milhões de usuários em 2023. | 20 mi de usuários, cerca de US$ 270 mi de receita anual (estimativa) | [Sacra](https://sacra.com/chat/h/e203c170-aac9-4957-b097-0edc3326aa1a/), [Startup GTM](https://startupgtm.substack.com/p/calendly-growth-story-a-viral-product) | média (análise de terceiros) |
| Dropbox (EUA) | Indicação com prêmio para os dois lados (espaço grátis), no meio do uso. De 100 mil para 4 milhões de usuários em 15 meses. | 3.900% em 15 meses | [Prefinery](https://prefinery.com/blog/dropbox-referral-program-3900percent-growth-study/) | média (caso muito citado, fonte secundária) |
| Nubank (Brasil) | "Indique amigos" com tela própria e envio por WhatsApp. | sem número | [Seu Crédito Digital](https://seucreditodigital.com.br/nubank-muda-tela-de-indicacao/) | fraca |

## Veredito

- **2.3 Pix no link: faz sentido, e o QR estático resolve sem custo.** O
  Tino gera o BR Code pela regra do Banco Central com a chave Pix da loja e
  o valor. O que o Tino **não** faz: ver o dinheiro cair. Sem integração com
  banco, a tela diz "confira no seu banco e marque como pago" (regra 5).
  Precisa de um campo novo: a chave Pix da loja, em Dados da empresa.
- **2.4 Motivos de perda: faz sentido e o dado já existe.** O Tino já pede
  o motivo ao marcar orçamento como perdido. Falta o relatório: perdas por
  motivo, em quantidade e em reais, nos últimos 90 dias, com os 90 de antes
  como referência (regra 4).
- **2.5 Rodapé: faz sentido, discreto.** Como o Calendly: uma linha no pé
  do link do orçamento, da OS e do fiado ("Organizado com o Tino"), que leva
  ao cadastro com `ref` marcando de onde veio (a origem do cadastro, 1.6, já
  grava). Canvas antes, como o plano pede.
- **2.6 Indicação: faz sentido, com o prêmio dos dois lados (Dropbox).** Um
  mês grátis para quem indica e para quem chega. O código e o link de
  indicação podem ir já; **o prêmio depende da cobrança ligada** (item 1.5,
  chaves do Mercado Pago com o Davi).

## Como medir

- **Pix:** links com Pix abertos que viram "pago" em 7 dias; linha de base.
- **Motivos:** % de orçamentos perdidos com motivo informado; meta 80%.
- **Rodapé:** cadastros com `ref=rodape`; meta inicial 5% dos cadastros
  (sem referência de mercado: linha de base no primeiro trimestre).
- **Indicação:** cadastros indicados que pagam após o teste.

## Limites deste estudo

- Resumos de busca; conferir antes de citar.
- O número do Calendly e o do Dropbox vêm de análises de terceiros.

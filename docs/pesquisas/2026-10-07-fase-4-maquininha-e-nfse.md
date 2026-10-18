# Estudo: ligar o dinheiro (Fase 4)

Data: 2026-10-07 · Fase e item: Fase 4, itens 4.1 (maquininha integrada,
conciliando com o Balcão) e 4.2 (nota de serviço pelo padrão nacional)

## A pergunta

Como o Tino lê as vendas e os repasses das maquininhas mais usadas pelo MEI
e confere com o que foi lançado no Balcão, e por onde começar sem depender
de contrato com cada empresa? E o que a nota de serviço nacional pede?

## Quem já faz

| Referência | O que faz | Resultado ou número | Fonte | Força |
|---|---|---|---|---|
| Mercado Pago (Point) | Relatório de liberações e relatório de dinheiro em conta, gerados à mão ou agendados por API (`/v1/account/settlement_report/config`), com colunas escolhidas, previsão de taxa, estorno e contestação. | API pública e documentada | [Mercado Pago, relatório por API](https://www.mercadopago.com/developers/es/docs/mp-point/additional-content/reports/released-money/api), [dinheiro em conta](https://www.mercadopago.com/developers/en/docs/mp-point/additional-content/reports/account-money/api) | forte (documentação oficial) |
| Stone | Feed de conciliação em XML ("Conciliação Stone"), além de APIs de banco e do Pagar.me; mais de 60 plataformas de e-commerce e contabilidade integradas, como a Conta Azul. | parceria comercial, não autoatendimento | [API Evangelist, Stone](https://providers.apievangelist.com/providers/stone-co/), [IT Forum, Conta Azul e Stone](https://itforum.com.br/?p=164280) | média |
| Cielo, Getnet (e Rede) | Extrato eletrônico (EDI): arquivo diário em leiaute fixo com vendas, ajustes e pagamentos, pedido à credenciadora. | padrão de mercado para conciliador | [Getnet, manual do extrato eletrônico](https://site.getnet.com.br/wp-content/uploads/2022/04/20200928_Manul_V10_EE_v1.pdf), [Cielo, manual do EDI](https://desenvolvedores.cielo.com.br/api-portal/sites/default/files/ctools/Manual_Versao_14_v2pix.pdf) | forte (manual oficial) |
| PagBank | Conciliação de cartões por token, usada por sistemas contábeis (Alterdata, módulo eExtratos). | integração por token do lojista | [Alterdata, token do PagBank](https://ajuda.alterdata.com.br/esbdc/tema-eextratos/eextratos-como-obter-o-token-no-pagbank) | média |
| Maquininhas do MEI | As mais citadas para MEI: Ton, InfinitePay, Mercado Pago, PagBank e SumUp; pesquisa CNDL e SPC Brasil: taxa e recebimento em até 1 dia útil pesam mais na escolha. | sem fatia de mercado pública | [Saipos](https://saipos.com/mei/melhor-maquininha-de-cartao-para-mei), [Calculadora de Taxas](https://calculadoradetaxas.com.br/blog/melhor-maquininha-para-mei-2026) | fraca (blog; parte das listas é de quem vende maquininha) |
| NFS-e Nacional | MEI emite no padrão nacional desde 1º/09/2023; ME e EPP do Simples também a partir de 1º/09/2026 (Resolução CGSN 189/2026). Emissão pelo portal ou por API do Sistema Nacional, com certificado e-CNPJ A1 ou conta gov.br prata ou ouro. | regra oficial | [Inventti, CGSN 189/2026](https://inventti.com.br/?p=24436), [Londrina, NT 2025/001](https://repositorio.londrina.pr.gov.br/index.php/menu-fazenda/ggf/nfse-nacional/71715-nt-2025-001-implantacao-da-nfse-padrao-nacional/file), [Agilize](https://agilize.com.br/artigos/?p=3921) | média (fontes secundárias; conferir a resolução) |

## Veredito

- **4.1 Começar pelo arquivo, não pela API.** Cada credenciadora tem um
  caminho (API do Mercado Pago, XML da Stone, EDI da Cielo e da Getnet,
  token do PagBank), e só o do Mercado Pago é autoatendimento. O que todas
  têm em comum é a planilha de vendas do app ou do site. O Tino lê essa
  planilha (CSV, com o cabeçalho que vier), confere venda por venda com o
  Balcão e mostra quatro listas: bateu, só na maquininha (venda que não foi
  lançada), só no Balcão (cancelada ou passada em outra maquininha) e taxa
  diferente da cadastrada. Nada é lançado nem baixado sozinho (regra 5): a
  pessoa confirma.
- **A primeira API: Mercado Pago**, porque é documentada e aberta ao
  lojista; pede o token do vendedor (🙋 Davi, conta de teste). As outras
  entram quando houver cliente pagante que use, na ordem em que aparecerem.
- **4.2 NFS-e: depende de certificado e provedor.** O Tino já tem o módulo
  de nota (`src/lib/nota-fiscal/`, provedor ainda em "sandbox"). A emissão
  de serviço pelo padrão nacional pede o certificado do CNPJ ou o gov.br
  da pessoa, e a escolha do provedor é do Davi. Até lá, a ajuda tributária
  (3.3) já explica quando a nota é obrigatória.

## Como medir

- **Vendas conciliadas de primeira**: meta 90% das linhas do arquivo
  batendo com o Balcão sem ajuste manual.
- **Venda esquecida achada**: quantas vendas "só na maquininha" a pessoa
  lança depois de importar. É o número que mostra valor ao comerciante.
- **Taxa cobrada a mais**: soma, em reais, da diferença entre a taxa do
  arquivo e a cadastrada.

## Limites deste estudo

- Os leiautes de planilha de Ton, InfinitePay e SumUp não foram vistos:
  o leitor aceita cabeçalhos por sinônimo, como o importador de extrato, e
  vai ser ajustado com o primeiro arquivo real de cada uma.
- Sem número público de fatia de mercado por credenciadora entre MEIs.

## Adendo de 08/10/2026: a tela de conferir, um por um com mais informação

Davi escolheu a opção B do passo 51 (um por um) e pediu "mais informações,
organizadas e modernas". Como os conciliadores mostram o detalhe:

| Referência | O que faz | Fonte | Força |
|---|---|---|---|
| Xero (Nova Zelândia) | Tela lado a lado: à esquerda a linha do extrato, à direita a sugestão de par no sistema, em verde quando acha; um OK confirma e a linha some. | [Fit Small Business](https://fitsmallbusiness.com/connect-and-reconcile-bank-account-xero/), [Marc Andrews, a tela em 2026](https://marcandrews.com/xero-bank-reconciliation-tutorial-uk-step-by-step-guide/) | média (guias de terceiros) |
| QuickBooks (EUA) | Fila "Para revisar"; cada sugestão de par mostra um selo de confiança, para a pessoa saber o que pode aceitar sem olhar e o que pede atenção. | [QuickBooks, sugestões por IA](https://quickbooks.intuit.com/learn-support/en-global/help-article/bank-transactions/ai-suggestions-help-match-categorise-bank/L8FHOh4AD_ROW_en), [Intuit, combinar transações](https://community.intuit.com/articles/1773491-add-and-match-downloaded-banking-transactions) | média |

Três versões do B no canvas, passo 51b: lado a lado (Xero), o caminho do
dinheiro com o grau de certeza (QuickBooks), e a fila com o efeito de cada
decisão no mês e no limite do MEI.

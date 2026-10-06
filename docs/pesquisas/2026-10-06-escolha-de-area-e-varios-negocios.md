# Estudo: escolha de área no cadastro e vários negócios por conta

Data: 2026-10-06 · Fase e item: Fase 1, itens 1.1 (vários negócios) e 1.2 (área e subárea)

## A pergunta

Faz sentido o Tino perguntar a área e a subárea logo no cadastro e mudar o
app conforme a resposta? E como a mesma pessoa troca de um negócio para outro
(e para a casa) sem se perder?

## Quem já faz

| Referência | O que faz | Resultado ou número | Fonte | Força |
|---|---|---|---|---|
| Square (EUA) | No cadastro faz "algumas perguntas sobre o negócio" e recomenda um **modo**: restaurante (três tipos), varejo, serviços, agendamento ou geral. Cada modo é um conjunto de funções e ajustes; dá para trocar de modo depois. | Square é a parte de vendedores da Block, com receita de US$ 24,5 bi em 2025 (ver plano estratégico) | [Block, novo app do Square](https://block.xyz/inside/introducing-the-next-generation-square-point-of-sale-app), [Square Community, modos](https://community.squareup.com/t5/Product-Updates/Access-more-of-what-Square-has-to-offer-with-modes-in-Square/ba-p/790543) | forte (empresa), página não aberta, só resumo da busca |
| Shopify (Canadá) | Pergunta no cadastro o que a pessoa vai vender e o objetivo, e monta a **lista de primeiros passos** a partir da resposta (quem quer dropshipping vê esse passo primeiro). | sem número de efeito publicado | [Candu, análise do onboarding da Shopify](https://www.candu.ai/blog/shopify-onboarding-flow) | fraca (blog de fornecedor) |
| Kyte (Brasil) | Um app só, com páginas de venda por segmento (bar, lanchonete, mercado, loja de roupa, perfumaria, bijuteria). | mais de 60 mil empreendedores (ver plano estratégico) | [Kyte, segmentos](https://www.kyte.com.br/segmentos) | média (site da empresa, só resumo) |
| Trinks (Brasil) | Um segmento só (beleza), com agenda e ficha próprias do setor. | cerca de 44 mil negócios | [Trinks](https://www.trinks.com/) | média |
| Nubank (Brasil) | Pessoa física e PJ no mesmo app: toca no nome no topo e "Acessar outra conta", sem sair. Vários CNPJs no mesmo app, não. Há reclamações de quem não acha a troca. | mais de 6 milhões de clientes PJ | [Canaltech](https://canaltech.com.br/apps/como-acessar-duas-contas-nubank-no-mesmo-celular/), [Reclame Aqui](https://www.reclameaqui.com.br/nubank/dificuldade-de-alternar-entre-contas-pf-e-pj-no-aplicativo-nubank_cl2impbzuqFJT3P8/) | média |
| Estudos de onboarding de software | Dizem que separar o começo por perfil (papel, uso, setor) aumenta a ativação. | números de 30% a 50% de melhora, sem metodologia clara | [Chameleon](https://www.chameleon.io/blog/user-onboarding-best-practices) | fraca: tratar como hipótese |

## Veredito

**Faz sentido.** O exemplo mais forte é o Square: uma base só, e o cadastro
escolhe o **modo** pelo tipo de negócio, com troca depois. É exatamente a
proposta do Davi (Tino geral, área e subárea por cima). A Shopify mostra o
segundo ganho: a resposta do cadastro vira a **lista de primeiros passos**,
que no Tino é o Guia do negócio.

O que o Tino faz diferente:

- **Área e subárea, não só o modo.** O Square para no tipo de operação; o
  Tino desce até a subárea (celular, informática) para já trazer os campos e
  serviços de partida. Serviço de partida vem **sem preço** (regra 3).
- **A casa junto.** Nenhuma das referências junta a vida pessoal. A troca
  entre casa e negócios tem de ser tão simples quanto a do Nubank (toque no
  nome no topo), mas **visível**: as reclamações do Nubank mostram que troca
  escondida gera chamado.
- **Vários negócios de verdade.** O Nubank não deixa dois CNPJs no mesmo app.
  O Tino deixa, porque a cabeleireira que revende cosmético e o técnico que
  vende capinha são o caso comum. Observação: o MEI tem um CNPJ só; o
  segundo "negócio" do mesmo MEI é uma frente dentro do mesmo CNPJ (o
  faturamento soma no mesmo limite). Isso precisa aparecer na tela, senão a
  pessoa acha que tem dois limites.
- **Pode trocar de área depois**, como no Square, sem perder dado.

## Como medir

- **Ativação** (registrou 5 vendas ou abriu 3 OS na primeira semana): meta
  60% dos cadastros; abaixo de 40%, o começo está difícil.
- **Quem escolhe "Outra área"**: se passar de 30% dos cadastros, a lista das
  10 áreas está errada e precisa ser revista.
- **Troca de negócio**: contas com mais de um negócio que trocam pelo menos
  uma vez por semana. Sem referência de mercado ainda; primeiro mês define a
  linha de base.

## Limites deste estudo

- As páginas não abriram deste ambiente (a rede bloqueia); tudo veio de
  resumo de busca. Conferir os links antes de citar fora.
- Não achei número público do efeito dos modos do Square na ativação.
- Não confirmei se o Kyte pergunta o segmento dentro do app ou só no site.

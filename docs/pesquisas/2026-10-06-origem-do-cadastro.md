# Estudo: origem do cadastro

Data: 2026-10-06 · Fase e item: Fase 1, item 1.6

## A pergunta

Como o Tino sabe de onde veio cada cadastro (indicação, link de orçamento,
contador, anúncio, a venda assistida do Davi), para gastar tempo e dinheiro
no canal que traz cliente que paga?

## Quem já faz

| Referência | O que faz | Resultado ou número | Fonte | Força |
|---|---|---|---|---|
| Atribuição declarada ("como conheceu o Tino?") | Uma pergunta no cadastro, lista curta mais campo livre. Pega o boca a boca, grupo de WhatsApp e indicação, que o rastreio por link não vê. | 70% a 82% de resposta quando a pergunta tem lista e campo livre (B2B, 2026) | [Growthspree](https://www.growthspreeofficial.com/blogs/self-reported-attribution-response-rate-benchmarks-b2b-saas-b2b-2026-form-field-channel-surface-data), [Stackmatix](https://www.stackmatix.com/blog/how-did-you-hear-about-us-survey), [SaaS Hero](https://www.saashero.net/strategy/bootstrapped-marketing-attribution-tracking/) | fraca (blogs de agência, sem metodologia aberta) |
| Rastreio por link (UTM) | `utm_source`, `utm_medium`, `utm_campaign` no link do anúncio. Diz qual clique fechou, não o que fez a pessoa conhecer. | prática de mercado, sem número | mesmas fontes | fraca |
| Plano estratégico do Tino | A meta de passagem da Fase 1 e o canal de contador (Fase 5) dependem de saber a origem; o rodapé "feito com o Tino" (2.5) e a indicação (2.6) só se medem com ela. | ver seção Métricas do plano | [Plano estratégico](https://claude.ai/code/artifact/0b555476-3cc6-436a-89dd-8980d12ab07d) | interna |

## Veredito

**Faz sentido, nas duas formas juntas, e a automática pode ir já.**

1. **Automática, sem tela:** o Tino guarda no cadastro o que veio no link
   (`utm_source`, `utm_medium`, `utm_campaign`, `ref`) e a primeira página
   de entrada, num cookie de 30 dias, sem dado pessoal. Não muda nada na
   tela, então não precisa de canvas. É o que mede o anúncio e, depois, o
   rodapé dos links públicos e a indicação.
2. **Declarada, com tela:** "Como você conheceu o Tino?" com seis opções
   (indicação de alguém, link de orçamento ou OS que recebeu, contador,
   anúncio, busca na internet, redes sociais) mais "Outro" com texto, e
   **opcional**, com "Pular". Passa pelo canvas. Fica depois da escolha do
   segmento, no fim do cadastro, para não pesar na entrada (o estudo de
   área mostra que cada passo a mais no começo custa ativação).
3. **No painel do admin**: cadastros, ativação e pagantes por origem, quando
   o painel for melhorado (item 6.5).

O que o Tino faz diferente: a lista é de **negócio de bairro**, não de
SaaS (grupo de WhatsApp e indicação do fornecedor entram em "indicação"),
e a resposta "contador" pede o nome do escritório, porque é o canal da
Fase 5.

## Como medir

- **Taxa de resposta da pergunta**: meta 70% (a faixa de 70% a 82% das
  fontes acima); abaixo de 50%, a pergunta está no lugar errado.
- **Cadastros com origem automática**: o que vier de link marcado deve ter
  origem gravada em 100% dos casos; menos que isso é defeito.
- **Pagantes por origem**, depois de três meses: decide onde o Davi gasta.

## Limites deste estudo

- As fontes de taxa de resposta são blogs de agência de marketing B2B, sem
  metodologia; tratar como hipótese.
- Não achei referência brasileira para cadastro de MEI.

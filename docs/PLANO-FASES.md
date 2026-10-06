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
| 1.1 | Vários negócios por conta, com troca visível no topo | ⏳ | [estudo](pesquisas/2026-10-06-escolha-de-area-e-varios-negocios.md) | canvas passo 38 |
| 1.2 | Área e subárea no cadastro (10 áreas, modo leve) | ⏳ | [estudo](pesquisas/2026-10-06-escolha-de-area-e-varios-negocios.md) | canvas passo 38 |
| 1.3 | Ativar o MEI numa conta pessoal que já existe | ⏳ | falta | estudo, depois canvas |
| 1.4 | Relatório do mês para o contador | ⏳ | falta | estudo (o que o contador pede do MEI) |
| 1.5 | Cobrança ligada (Mercado Pago ou Stripe) | 🙋 | plano, seção Modelo de negócio | Davi põe as chaves, ver `docs/PAGAMENTO-E-ADMIN.md` |
| 1.6 | Origem do cadastro (indicação, link, contador, anúncio) | ⏳ | plano, seção Métricas | junto com o 1.2 |
| 1.7 | Plano "Meu dinheiro e minha loja" passa a se chamar "Meu negócio" | ⏳ | plano, seção Modelo de negócio | texto, pode ir direto |
| 1.8 | Área funda: Assistência técnica (IMEI, senha, garantia, checklist de entrada) | ⏳ | falta | estudo com Jobber e apps de assistência |

**Fora do código, com o Davi** (passo a passo com caixas de marcar: [O que o Davi faz](https://claude.ai/code/artifact/18f50cdf-5e06-4fc0-9638-772d1c9304a4)):

| Item | Situação |
|---|---|
| Juntar o PR #15 no `main` | 🙋 CI verde, sem conflito |
| Vercel: apagar o projeto duplicado (24f2ce83) e pôr as variáveis do Preview no 0e1004d7 | 🙋 |
| Variáveis adiadas: ADMIN_EMAIL, ADMIN_SENHA, TELEGRAM_*, CRON_SECRET | 🙋 |
| Lista de 50 assistências técnicas e 5 distribuidoras da região | 🙋 |
| 15 conversas de 20 minutos com donos de assistência | 🙋 |
| Registrar a marca Tino no INPI; confirmar a titularidade do código do Controllares | 🙋 |

## Fase 2: o Tino que ensina (jan. a mar. de 2027)

**Meta de passagem:** 100 negócios pagando, 70% ainda pagando após três meses.

| # | Item | Situação |
|---|---|---|
| 2.1 | Guia do negócio (passos com o porquê) | ⏳ |
| 2.2 | Análise de clientes em linguagem simples | ⏳ |
| 2.3 | Cobrança por Pix no link do orçamento, da OS e do fiado | ⏳ |
| 2.4 | Relatório de motivos de perda dos orçamentos | ⏳ |
| 2.5 | Rodapé "feito com o Tino" nos links públicos (canvas antes) | ⏳ |
| 2.6 | Indicação: um mês grátis para os dois | ⏳ |
| 2.7 | Área funda: Beleza | ⏳ |

## Fase 3: o assessor (abr. a jun. de 2027)

**Meta de passagem:** 300 negócios pagando; assessor usado por um terço deles toda semana.

| # | Item | Situação |
|---|---|---|
| 3.1 | Agendar por pedido, com confirmação num toque | ⏳ |
| 3.2 | Google Agenda | ⏳ |
| 3.3 | Ajuda tributária com fonte e data; "caso de contador" quando passar do escrito | ⏳ |
| 3.4 | Modo simples (letra maior, menos itens) | ⏳ |
| 3.5 | Área funda: Moda e vestuário | ⏳ |

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
- Prévias da Vercel falham por configuração (item do Davi acima).
- O estudo de mercado deste ambiente depende de resumo de busca: as páginas
  não abrem daqui. Números para apresentação externa precisam ser conferidos.

## Registro

| Data | O que aconteceu |
|---|---|
| 06/10/2026 | Fases 6 (acabamento visual) e 7 (revisão e lançamento do Tino pessoal e do Tino negócio) entram no plano, a pedido do Davi. |
| 06/10/2026 | Plano estratégico aceito. Criados este painel, a skill `estudo-de-mercado` e o primeiro estudo (área e vários negócios). Próximo: canvas passo 38. |

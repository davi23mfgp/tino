# Tino Loja — direção de produto para o MEI

Decisão de 02/10/2026. Referências: telas enviadas do Bling e Omie, código do ERP Controllares e 62 capturas do Olist. São referências de problemas e fluxos; a interface e as regras do Tino continuam próprias.

## Promessa

**Uma loja, todos os canais.** O MEI cadastra o produto uma vez e acompanha a venda desde o pedido até o dinheiro cair, seja no balcão, no WhatsApp ou numa loja virtual. A tela inicial responde: **o que vendi, o que tenho para entregar, o que está acabando e quanto de fato vai sobrar?**

O Tino deve ser usável com poucos produtos, sem integração externa e sem cadastro prévio de cliente. Recursos avançados aparecem no momento da tarefa, sem transformar a venda rápida em formulário obrigatório.

## O que as referências ensinam

| Referência | Ideia aproveitável | Adaptação no Tino |
|---|---|---|
| Bling | Fluxo de produto, cliente e pagamento; painéis de venda e estoque | Balcão rápido com detalhes opcionais; métricas calculadas das vendas reais |
| Controllares | Dados conectados entre catálogo, cliente, estoque e financeiro; histórico de movimentos | Um produto e um cliente por loja; saldo derivado dos movimentos; venda alimenta o recebimento |
| Olist | Pedidos com etapas visíveis, busca e filtros; visão por canal; margem e pendências | Fila de pedidos enxuta, origem da venda explícita e próxima ação clara |
| Omie | Contas a pagar/receber e fiscal conectados à operação | O recebido, o a receber, o fiado e o DAS aparecem no contexto do negócio |

## Fluxo alvo

1. **Cadastrar uma vez:** nome, preço e estoque mínimo do produto. Código de barras, custo e dados fiscais são opcionais até serem necessários.
2. **Vender em qualquer canal:** no balcão em poucos toques; pedido de WhatsApp ou loja virtual pode ser anotado manualmente. Integração futura importa pedidos para a mesma fila, sem duplicar produto ou cliente.
3. **Acompanhar o pedido:** novo → separar → pronto para entregar/enviar → concluído; cancelamento é explícito. Pagamento e entrega têm estados próprios para não confundir pedido pago com pedido entregue.
4. **Conferir o negócio:** estoque, valor bruto, descontos, taxas, custo, margem, valor recebido e valor a receber. Números sem dados suficientes não são apresentados como estimativas certas.
5. **Agir no que falta:** prateleira baixa, pedido aguardando envio, pagamento ainda não recebido, fiado vencido, conta próxima e limite MEI. Cada aviso leva à tarefa correspondente.

## Recorte de implementação

### Já existe e deve ser preservado

Balcão e caixa, produtos com movimentos de estoque, fiado, contas da loja, visão geral mensal/diária, cadastro MEI, metas e emissão fiscal condicionada a provedor real. A API de vendas já aceita vários itens, desconto, cliente, observação e parcelamento. Esta rodada expõe esses campos no Balcão como opções, sem criar exigências na venda rápida.

### Próxima entrega de maior valor

**Pedidos unificados:** lista pesquisável com origem (`BALCAO`, `WHATSAPP`, `LOJA_VIRTUAL`, `OUTRO`), estado do atendimento, cliente, itens e pagamento. A primeira entrada digital é manual, para funcionar sem depender de credenciais de terceiros. Vendas de balcão existentes aparecem como concluídas. A migração deve preservar os totais e as notas de vendas antigas.

Depois, uma visão de estoque mostra disponível, reservado pelos pedidos abertos e alerta de reposição. Reservar e dar baixa são eventos distintos: só baixar ao concluir a venda ou despachar conforme a regra definida. O mesmo pedido alimenta indicadores por canal e o financeiro, evitando relatórios paralelos.

### Expansões condicionadas a demanda e provedores reais

Importação de pedidos de marketplaces/loja virtual, sincronização de estoque, etiquetas e frete, links de pagamento, automação fiscal, propostas e serviços. Cada integração precisa de credenciais, tratamento de falhas e conciliação; não criar botão que aparente funcionamento antes disso.

## Regras de simplicidade

- Venda rápida continua em uma tela; cliente e produto cadastrado são opcionais.
- Pedidos online usam a mesma base de produtos, clientes, estoque e recebimentos.
- Valores monetários persistidos em centavos inteiros; taxas e prazos da maquininha são configurados, nunca presumidos.
- Sem gráficos vazios para métricas ainda não existentes. Estados vazios devem orientar a próxima ação.
- Uma ação principal por tela; filtros e campos técnicos aparecem conforme a necessidade.
- MEI vê a operação da loja separada das finanças pessoais, mas consegue entender quanto pode retirar com segurança.

## Diferencial a validar

Um **painel de decisão do dia** que une físico e digital: “2 pedidos para separar”, “3 peças disponíveis”, “R$ 240 vendidos, R$ 226 líquidos após taxas”, “R$ 80 caem na terça”. Cada número abre o detalhe que o compõe. A competição aqui é pela clareza e confiança da operação, não pela quantidade de módulos no menu.

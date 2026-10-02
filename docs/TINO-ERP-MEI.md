# Tino Negócio — ERP modular para MEI

Decisão de produto em 02/10/2026, após referências do Bling, Omie, Controllares e Olist e esclarecimento do Davi. Este documento amplia o recorte inicial de `LOJA-MEI-FISICA-DIGITAL.md`: o produto deve atender comércio, serviços e operações mistas, presencialmente e pela internet. As referências orientam capacidades e fluxos; código, identidade e interface serão do Tino.

## Proposta

**Começa com uma venda; cresce até organizar a empresa inteira.** O MEI pode começar com caixa e um cadastro simples. Conforme precisa, ativa estoque, propostas, ordens de serviço, cobranças e fiscal. Todos os módulos compartilham clientes, fornecedores, catálogo e lançamentos financeiros. A navegação mostra primeiro as tarefas do segmento escolhido, sem duplicar sistemas.

Exemplos: cabeleireiro agenda e vende serviço/produto; eletricista recebe lead, faz orçamento, executa serviço e cobra; comércio e frentista registram venda rápida, estoque e caixa. Engenharia regulamentada geralmente não se enquadra nas ocupações permitidas ao MEI; o fluxo de projetos pode inspirar o produto, mas o cadastro deve informar a elegibilidade e uma futura modalidade de microempresa deve ter regras fiscais próprias. Não prometer que qualquer profissão pode operar como MEI.

## Base comum

| Núcleo | Função |
|---|---|
| Pessoas | Cliente, fornecedor e contatos, com histórico de pedidos, serviços, cobranças e compras |
| Catálogo | Produto, serviço, categoria, custo/preço, código e dados fiscais quando necessários |
| Comercial | Lead, proposta/orçamento e funil Kanban simples, com conversão em pedido ou serviço |
| Operação | Venda de balcão, pedido digital, ordem de serviço, entrega e movimentação de estoque |
| Dinheiro | Caixa, contas a pagar e receber, dívidas, cobranças, taxas, conciliação e fluxo de caixa |
| Fiscal MEI | Dados da empresa, DAS, limite de faturamento e emissão de documento fiscal mediante provedor habilitado |
| Análise | Indicadores com rastreio até o lançamento original e alertas com próxima ação |

Um único registro de negócio conecta as etapas: oportunidade → proposta → pedido/serviço → pagamento → documento fiscal. Etapas podem ser puladas: venda de balcão não precisa nascer como lead; cabeleireiro não precisa usar estoque para vender um corte.

## Telas e comportamento

1. **Hoje:** tarefas e números verificáveis: atender cliente, separar pedido, concluir serviço, cobrar vencido, repor item, pagar conta, DAS próximo. Cada cartão abre a origem.
2. **Vender:** balcão rápido, pedido manual para WhatsApp/loja digital, histórico pesquisável e status de atendimento, entrega e pagamento separados.
3. **Comercial:** clientes, leads, propostas e Kanban com poucas colunas configuráveis; campanha simples vinculada a resultado, sem CRM pesado obrigatório.
4. **Catálogo e estoque:** produtos, serviços e categorias; fornecedor, compra e movimento auditável; disponível e reservado distintos; alerta de reposição.
5. **Financeiro:** caixa físico, contas a pagar/receber, cobrança, dívidas, previsão de entradas/saídas e fluxo de caixa. Venda, taxa da maquininha e recebimento são eventos diferentes.
6. **Fiscal:** checklist de dados, pendências por operação, emissão/consulta/cancelamento de notas e XML quando o provedor e a modalidade fiscal estiverem configurados; DAS e limite do MEI.
7. **Análise:** vendas e margem por produto, serviço e canal; clientes, inadimplência, estoque e fluxo futuro. Mostrar o que é desconhecido quando faltar custo ou confirmação de recebimento.

## Maquininha opcional

O usuário pode registrar pagamentos de qualquer maquininha manualmente, informando taxa e prazo. Se quiser conectar uma adquirente suportada, o Tino importa transações e liquidações autorizadas por API/webhook e concilia com vendas, inclusive estorno e chargeback. A conexão nunca é requisito para vender. A primeira integração só deve aparecer quando houver contrato, credenciais, escopo, testes reais e tratamento de falhas do provedor; conexão genérica com “qualquer maquininha” seria uma promessa falsa.

## Fiscal objetivo

A experiência pode seguir a clareza operacional do Olist: status da nota, pendências, motivo de rejeição e ação para corrigir. A emissão efetiva exige separar NF-e (mercadoria), NFC-e (varejo presencial) e NFS-e (serviço), conforme atividade, município/UF e provedor. Certificado, credenciamento e regras fiscais são tratados como requisitos de configuração, não inferidos pelo Tino. DAS e faturamento MEI permanecem visíveis mesmo sem emissor fiscal. Regras e limites devem ser datados/configuráveis; o produto não deve afirmar elegibilidade profissional ou tributária sem validação.

**DAS e emissão de notas são partes permanentes do escopo**, inclusive quando o Tino evoluir de loja para ERP de serviços. O painel fiscal deve mostrar competência, vencimento e baixa do DAS; faturamento usado e disponível do limite MEI; notas pendentes, emitidas e rejeitadas com a correção exigida. Não esconder essas funções atrás de uma futura integração de vendas.

## Catálogo e categorias, a partir do Controllares

O Davi pediu que o catálogo e a organização por categorias sigam a profundidade funcional do ERP Controllares. Lá, a categoria tem nome, imagem, produtos vinculados e serviços pré-definidos que podem entrar numa proposta por valor fixo ou percentual. O produto tem SKU, nome, marca, fornecedor, preço, custo, imagem, ficha técnica, composição e dados fiscais. O Tino deve preservar essas relações, com apresentação e cálculos próprios.

**Categoria** é cadastro real, não texto solto: criar, renomear, arquivar e selecionar; imagem opcional; produtos e serviços vinculados; busca e filtro. Uma categoria pode sugerir serviço em orçamento (por exemplo, “instalação” junto de “iluminação”), mas o valor é confirmado antes da proposta. Alterar a regra hoje não reescreve propostas antigas.

**Ficha de produto** começa com nome e preço. Campos adicionais: SKU/código de barras, categoria, marca e fornecedor separados, custo, estoque mínimo, foto, descrição e especificações, unidade e dados fiscais relevantes à nota. Produto composto/kit pode reunir componentes e baixar as quantidades certas do estoque. Importação/exportação CSV deve mostrar prévia, erros por linha e quantidade de registros criados/atualizados antes de gravar.

**Ficha de serviço** compartilha categoria, imagem, descrição, preço e custo estimado; não gera baixa de estoque por si. Pode consumir materiais explicitamente na ordem de serviço, com a quantidade registrada. O catálogo serve ao balcão, pedido digital, orçamento, ordem de serviço e documento fiscal, sem recadastrar o item em cada módulo.

**Primeira entrega do catálogo ampliado:** categoria com nome e imagem opcional, vínculo de produto e filtro na Prateleira; cadastro de serviço simples e uso em orçamento/pedido. Fornecedor, importação CSV, kits e serviços sugeridos por categoria entram em incrementos seguintes, mantendo as referências históricas de preço e composição.

## Segmentos sem criar quatro ERPs

Na entrada, o usuário escolhe o que vende: **produtos**, **serviços** ou **ambos**. Isso define exemplos, atalho inicial e campos sugeridos:

- Comércio físico/digital: balcão, pedidos, entrega, estoque, compras.
- Beleza e atendimento: agenda/serviço, cliente, produtos consumidos, cobrança.
- Prestador técnico: lead, orçamento, ordem de serviço, materiais e recebimento.
- Projeto/instalação: proposta com etapas, itens e cronograma; disponibilidade conforme enquadramento tributário.

As entidades são compartilhadas. O segmento muda a apresentação e as sugestões, não o histórico financeiro nem o catálogo.

## Ordem de construção

**1. Base transacional:** estabilizar venda e pedido único com origem, cliente, itens, desconto, status e pagamento; histórico pesquisável. Preservar vendas existentes.

**2. Comercial e serviço:** cliente/fornecedor, catálogo de serviços, orçamento simples, Kanban e ordem de serviço conectados ao pedido.

**3. Financeiro operacional:** contas a receber, cobranças, conciliação de maquininha, fluxo de caixa e dívidas da empresa, sem misturar com as pessoais.

**4. Estoque e compras:** reserva, reposição, pedido de compra e custo real por movimento.

**5. Fiscal e integrações:** provedores de NF-e/NFC-e/NFS-e, importação de canais e maquininha suportada; cada conexão com estados de sincronização e erros visíveis.

**6. Inteligência útil:** recomendação de próxima ação baseada nos dados reais, tendência de caixa e desempenho de campanha; não gerar previsão ou margem com dados ausentes.

Cada fase deve entregar um fluxo completo antes de adicionar mais itens ao menu. O MVP pode atender o MEI pequeno; recursos de microempresa entram depois com regras tributárias e limites próprios.

## Critérios de qualidade

- Qualquer venda ou cobrança aponta para a operação e a pessoa que a originou.
- Receita, recebimento, lucro e saldo de caixa são grandezas distintas.
- Valores persistidos em centavos inteiros; totais históricos não mudam quando preço/taxa muda.
- Estoque tem histórico de movimentos; pedido reservado não é baixa automática.
- Integrações são opcionais e mostram último sucesso, erro e itens pendentes.
- Fiscal apresenta status comprovado pelo provedor e permite recuperar rejeições.
- Usuário iniciante consegue fechar a primeira venda sem cadastrar fornecedor, campanha ou impostos.

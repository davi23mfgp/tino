# Estudo: relatório do mês para o contador

Data: 2026-10-06 · Fase e item: Fase 1, item 1.4

## A pergunta

O que o MEI precisa entregar ao contador (ou guardar, quando não tem
contador) todo mês, e como o Tino gera isso sem a pessoa redigitar nada?

## O que o Tino já tem

A tela MEI soma o faturamento por mês (Balcão de todos os negócios mais o
lançado à parte), separa comércio e serviço (`MeiCompetencia`), mostra o DAS
de cada mês e se foi pago. Finanças da loja tem a DRE. Não existe um
documento do mês para guardar ou mandar, e o Tino não sabe quanto de cada
venda saiu **com nota fiscal** e quanto saiu **sem nota**.

## Quem já faz

| Referência | O que faz | Resultado ou número | Fonte | Força |
|---|---|---|---|---|
| Regra do MEI (Resolução CGSN 140/2018, Anexo X) | O MEI mantém o **Relatório Mensal das Receitas Brutas**: CNPJ, mês, receita de revenda, de indústria e de serviço, cada uma **com e sem nota**, e o total; anexa as notas de compra e de venda. Preenche até o dia 20 do mês seguinte, **não entrega a ninguém** e guarda por **cinco anos**. É a base da declaração anual (DASN-SIMEI). | regra oficial | [Portal Tributário, obrigações do MEI](https://www.portaltributario.com.br/tributario/Quais_obrigacoes_acessorias_estao_previstas_para_o_MEI.htm), [Manual da DASN-SIMEI, Receita](https://www8.receita.fazenda.gov.br/SimplesNacional/Arquivos/manual/Manual_DASN-SIMEI.pdf), [Neon](https://neon.com.br/aprenda/mei/relatorio-mensal-mei/) | forte (Receita e resolução), lido por resumo |
| Sebrae | Dá o modelo do relatório e orienta preencher todo mês. Há texto dizendo que "não é obrigatório"; a resolução manda manter. O Tino segue a resolução e diz isso com a fonte. | sem número | [Jornal Contábil](https://jornalcontabil.com.br/noticia/mei-precisa-fazer-o-relatorio-mensal-de-receitas/), [Sebrae PR](https://sebraepr.com.br/comunidade/artigo/fechamento-do-ano-da-mei-como-me-programar) | média (fontes divergem; ver limites) |
| Conta Azul e Conta Azul Mais (Brasil) | O cliente usa o sistema no dia a dia e o contador acompanha pelo portal dele; exporta lançamentos para mais de 25 sistemas contábeis, envio automático para o Domínio (Thomson Reuters); mais de 50 relatórios (DRE, fluxo de caixa). | sem número de escritórios no resumo | [Conta Azul, contadores](https://contaazul.com/contadores/), [Conta Azul, integração contábil](https://contaazul.com/contabilidade/integracao-contabil) | média (site da empresa) |
| Omie (Brasil) | Ensina o relatório de faturamento mensal e oferece o sistema como gerador. | sem número | [Omie](https://www.omie.com.br/blog/relatorio-de-faturamento-mensal/) | fraca (blog de fornecedor) |
| QuickBooks (EUA) | O dono convida o contador como usuário "contador" ou manda uma cópia dos livros; o contador revisa sem mexer no arquivo vivo. | sem número no resumo | [Cleverence, guia do QuickBooks](https://www.cleverence.com/articles/quickbooks-documentation/sharing-access-with-accountant-quickbooks-intuit-4827) | fraca (guia de terceiro) |

## Veredito

**Faz sentido, e o primeiro relatório é o que a regra pede, não um
relatório bonito.** O Relatório Mensal das Receitas Brutas é obrigação do
MEI, quase ninguém faz (por isso o Sebrae insiste) e o Tino já tem quase todo
o dado. Isso é o "contador profissional" que o Davi quer: o app faz a
obrigação sozinho, e o contador recebe pronto.

O que o Tino faz:

1. **O relatório do Anexo X, pronto todo mês**, em PDF para guardar e
   imprimir, com o mesmo desenho do modelo oficial (o contador reconhece na
   hora), e o lembrete "até o dia 20". Guardado no Tino por cinco anos, com a
   regra e a fonte no rodapé.
2. **Com nota e sem nota.** Falta o dado: cada venda e cada OS precisam de
   "saiu com nota?" (sim ou não), e o lançamento à parte também. Enquanto o
   campo não existe, o relatório **não inventa a divisão**: põe tudo em "sem
   nota" e diz isso na própria folha (regra 3), ou deixa a pessoa marcar no
   fechamento do mês.
3. **O pacote do contador**: o relatório, a lista de vendas do mês em
   planilha (CSV), as contas pagas da loja e o DAS pago, num link que expira
   ou num e-mail. Sem portal do contador agora: o portal da Conta Azul é para
   escritório com carteira grande, e o Tino da Fase 1 tem 30 clientes. O
   portal entra na Fase 5, junto com a marca do escritório.
4. **Declaração anual**: com doze relatórios, o Tino monta os números da
   DASN-SIMEI (receita de comércio, de serviço, se teve empregado) e mostra
   onde digitar no portal da Receita. Não envia: envio é com a pessoa ou o
   contador.

O que **não** fazer: exportação para sistema contábil (Domínio e outros) e
portal do contador agora. Fica para quando houver escritório parceiro
(Fase 5), e o formato sai da conversa com ele.

## Como medir

- **Relatórios gerados até o dia 20** sobre MEIs ativos: meta 70%; abaixo de
  40%, o lembrete não está funcionando.
- **Pacotes mandados ao contador** sobre MEIs que dizem ter contador: sem
  referência; o primeiro trimestre dá a linha de base.
- **Vendas marcadas com ou sem nota**: meta 90% das vendas marcadas; abaixo
  disso, a pergunta está no lugar errado do Balcão.

## Limites deste estudo

- As páginas não abriram deste ambiente; tudo veio de resumo de busca.
- Há divergência entre fontes sobre o relatório ser obrigatório. A leitura
  aqui segue a Resolução CGSN 140 (manter, não entregar). **Conferir o texto
  do Anexo X e do artigo da resolução** antes de escrever a regra na tela, e
  pôr a data da regra junto (o CLAUDE.md pede fonte e data na ajuda
  tributária).
- Não achei número de quantos MEIs têm contador. Perguntar nas 15 conversas
  da Fase 1.

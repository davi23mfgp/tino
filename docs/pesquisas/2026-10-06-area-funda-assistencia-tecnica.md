# Estudo: área funda de Assistência técnica

Data: 2026-10-06 · Fase e item: Fase 1, item 1.8

## A pergunta

O que o Tino precisa ter, além do que já tem (ordem de serviço com etapas,
checklist livre, orçamento com link, agenda, aviso de pronto), para o dono de
uma assistência de celular, informática ou videogame trocar o caderno e o
papel da OS pelo Tino?

## O que o Tino já tem

A OS do passo 37 (`OrdemServicoLoja`) guarda o objeto em texto livre
("iPhone 11"), o serviço, um campo "como chegou", etapas com data, prazo,
valor, checklist de texto livre, orçamento e venda ligados e o link de
acompanhamento do cliente. Não tem campo próprio para IMEI, senha do
aparelho, acessórios deixados, estado de cada função na entrada, garantia
nem lembrete de aparelho esquecido.

## Quem já faz

| Referência | O que faz | Resultado ou número | Fonte | Força |
|---|---|---|---|---|
| RepairDesk (EUA) | Feito para a assistência de balcão (entrada rápida, saída rápida). Na entrada, checklist do estado do aparelho: o que funciona e o que não funciona, com **assinatura do cliente** antes do serviço; o mesmo checklist na saída; fotos antes e depois; garantia com pedido de retorno. Atende celular, informática, videogame, relógio e outros. | US$ 99 e US$ 149 por mês; nota 4,7 de 5 com 244 avaliações; número de lojas não publicado | [RepairDesk, estado antes e depois](https://help.repairdesk.co/portal/en/kb/articles/how-to-add-device-pre-post-repair-condition), [RepairDesk, OS](https://repairdesk.co/feature/repair-ticket-management), [RepairDesk vs RepairShopr](https://repairdesk.co/repairdesk-vs-repairshopr), [Capterra, preços](https://www.capterra.com/p/146659/RepairDesk/pricing/) | forte para as funções (documentação do produto); média para preço; só resumo da busca |
| RepairShopr (EUA) | Gestão por chamado, pensado para quem recebe aparelho pelo correio. | sem número | [RepairDesk vs RepairShopr](https://repairdesk.co/repairdesk-vs-repairshopr) | fraca (comparação feita pelo concorrente) |
| Jobber (Canadá) | Serviço na casa do cliente: orçamento, agenda, OS e cobrança num fluxo só, por segmento (jardim, limpeza, encanador, ar-condicionado). | 100 mil clientes e receita de US$ 167,5 milhões em 2024 | [Sacra](https://sacra.com/research/jobber), [Latka](https://getlatka.com/companies/jobber) | média |
| AgoraOS (Brasil) | Nasceu em 2010 como sistema para assistência de celular e depois abriu para qualquer assistência. OS com anexos, área do cliente, modelos de impressão, cobrança por link no WhatsApp, Pix, boleto, nota. | sem número | [AgoraOS, apresentação comercial](https://www.agoraos.com.br/download/AgoraOS-Apresentacao-Comercial-Geral-v1.pdf) | média (material da empresa, só resumo) |
| Reclame Aqui, assistências de celular | As queixas mais comuns: conserto sem autorização, aparelho vendido porque não foi retirado, falta de peça, discussão sobre IMEI e sobre o estado em que o aparelho chegou. | casos individuais, sem estatística | [Reclame Aqui, tela e IMEI](https://www.reclameaqui.com.br/gil-celulares/conserto-de-tela-x-imei-bloqueado_gxxxizACPGQShnq4/), [Reclame Aqui, garantia de conserto](https://www.reclameaqui.com.br/mister-fix/negativa-de-garantia-legal-e-responsabilidade-por-vicio-no-servico-mister-fix-sorocaba_oTslx17Qf1_HyBgS/) | fraca como número, útil como lista de brigas |

## A regra que vale para a área (fonte oficial)

| Regra | O que diz | Fonte | Força |
|---|---|---|---|
| Garantia do conserto | 90 dias para serviço em produto durável (CDC, art. 26, II). Não pode ser menor que isso. | [CDC de bolso, Procon SP](https://www.procon.sp.gov.br/wp-content/uploads/2020/02/CDCdeBolso.pdf) | forte |
| Orçamento | Prévio, discriminando mão de obra, peças, pagamento e datas; vale 10 dias; o serviço só começa com autorização (CDC, art. 40). | [CDC de bolso, Procon SP](https://www.procon.sp.gov.br/wp-content/uploads/2020/02/CDCdeBolso.pdf), [Idec](https://idec.org.br/print/24942) | forte |
| Aparelho não retirado | A cláusula "depois de 90 dias o aparelho é vendido" é tida como abusiva; esquecer não é abandonar. Santa Catarina fez lei com prazo de 90 dias **contados do aviso de pronto**, escrito na OS assinada. | [Jus, abandono](https://jus.com.br/artigos/5332/conserto-de-produtos-perda-da-posse-propriedadade-do-produto-pelo-abandono), [Alesc, PL 503/2019](https://portalelegis.alesc.sc.gov.br/proposicoes/legado/PL.-0503.8-2019/anexo/17211/visualizar) | média (artigo jurídico e projeto estadual; conferir se virou lei e a lei de cada estado) |
| MEI pode | CNAE 9512-6/00 (reparação de equipamentos de comunicação) é permitido ao MEI. Quem vende capinha e acessório soma o comércio (4752-1/00). | [contabilidade.com](https://contabilidade.com/blog/cnae-9512600-reparacao-e-manutencao-de-equipamentos-de-comunicacao-pode-ser-mei-quanto-paga-e-quando-desenquadrar-do-mei/) | fraca (blog), conferir na lista oficial de ocupações do MEI |

Número de assistências MEI no Brasil: não achei fonte. Não usar número até
achar (regra 3).

## Veredito

**Faz sentido, e a lista do que fazer sai das brigas, não das funções dos
concorrentes.** O RepairDesk mostra o que a área usa, e o Reclame Aqui
mostra onde a assistência perde dinheiro e cliente: discussão sobre como o
aparelho chegou, conserto sem autorização, garantia negada e aparelho que
ninguém busca. O Tino entra por aí, nesta ordem:

1. **Entrada do aparelho com campos próprios** (marca e modelo, IMEI ou
   número de série, cor, o que ficou junto: chip, capa, carregador, cartão
   de memória) e **o estado de cada função** (tela, toque, câmera, áudio,
   carga, Wi-Fi, botões, biometria) marcado como funciona, não funciona ou
   não deu para testar. Como no RepairDesk, o cliente **confirma** a
   entrada: no Tino, pelo link que ele já recebe, num toque (regra 5).
2. **Senha ou padrão de desbloqueio**, que o técnico precisa para testar.
   Diferente do RepairDesk, o Tino guarda **cifrado** (como já faz com o
   segredo de dois fatores), mostra só a quem atende, nunca no link do
   cliente, e **apaga na entrega**. Senha de celular é dado pessoal (LGPD):
   guardar para sempre não tem motivo.
3. **Garantia de 90 dias contada da entrega**, escrita no link do cliente
   com a regra e a fonte (CDC, art. 26). Quando o mesmo cliente volta com o
   mesmo aparelho dentro do prazo, a OS nova já nasce marcada "retorno em
   garantia", ligada à anterior, e o Tino mostra quanto custa o retorno
   (indicador com referência: retornos em garantia sobre consertos do mês).
4. **Orçamento no jeito do art. 40**: mão de obra e peça separadas, validade
   de 10 dias e "só começa com a sua aprovação". O orçamento com link já
   existe; falta separar peça e mão de obra e mostrar a validade.
5. **Aparelho esquecido**: o Tino conta os dias desde o aviso de pronto e
   propõe lembretes (7, 30 e 60 dias), com o texto pronto. **Não** oferece
   "vender o aparelho depois de 90 dias": a cláusula é tida como abusiva, e
   o Tino não ensina a fazer o que o Procon derruba.
6. **Serviços de partida sem preço** (troca de tela, bateria, conector de
   carga, limpeza, desoxidação, software) por subárea, e os nomes da área
   no menu ("Aparelhos", "Entradas").

O que **não** copiar agora: fotos antes e depois (precisa de lugar para
guardar arquivo, custo e LGPD; fica para depois das conversas com os donos),
estoque de peça por modelo de aparelho e garantia de fornecedor de peça.
Entram se as 15 conversas da Fase 1 pedirem.

## Como medir

- **OS abertas com entrada completa** (modelo, IMEI ou série, estado
  conferido): meta 80% das OS das assistências; abaixo de 50%, a entrada
  está longa demais para o balcão.
- **Entradas confirmadas pelo cliente no link**: sem referência de mercado;
  o primeiro mês dá a linha de base.
- **Retorno em garantia sobre consertos do mês**: o Tino mostra, mas a faixa
  boa ainda não tem fonte; não exibir faixa inventada até achar.
- **Aparelhos parados há mais de 30 dias depois de pronto**: deve cair mês a
  mês nas contas que usam os lembretes.

## Limites deste estudo

- As páginas não abriram deste ambiente; tudo veio de resumo de busca.
  Conferir os links antes de citar fora.
- A lei de Santa Catarina apareceu como projeto; não confirmei se foi
  sancionada nem se outros estados têm regra parecida.
- Nenhum concorrente brasileiro de assistência publicou número de clientes.
- As 15 conversas com donos de assistência (tarefa do Davi) podem mudar a
  ordem da lista acima. A entrada do aparelho (1) e a garantia (3) são as de
  evidência mais forte.

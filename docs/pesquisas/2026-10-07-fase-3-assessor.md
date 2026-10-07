# Estudo: o assessor (Fase 3)

Data: 2026-10-07 · Fase e item: Fase 3, itens 3.1 (agendar por pedido), 3.2 (Google Agenda), 3.3 (ajuda tributária), 3.4 (modo simples) e 3.5 (área funda Moda)

## A pergunta

Como o Tino vira assessor ("tenho um horário amanhã às 15h com a Ana,
agenda pra mim") sem marcar nada sozinho, como ele põe o compromisso na
agenda do Google da pessoa, e como ele responde dúvida tributária do MEI com
fonte e data, dizendo quando é caso de contador?

## Quem já faz

| Referência | O que faz | Resultado ou número | Fonte | Força |
|---|---|---|---|---|
| Square Assistant (EUA) | Responde mensagens de clientes e confirma, cancela ou remarca horários; segundo a empresa, entende 75% das perguntas e reduziu faltas em 10%. | 75% das perguntas; 10% menos faltas | [Square, apresentação do Assistant](https://squareup.com/us/en/the-bottom-line/reaching-customers/introducing-square-assistant), [NVIDIA, caso Square](https://blogs.nvidia.com/blog/conversational-ai-square-assistant/) | média (dado da empresa) |
| Link "adicionar ao Google Agenda" | Um endereço com `action=TEMPLATE`, título, datas e detalhe abre o evento pronto na agenda da pessoa, que só confirma. Sem login no Tino, sem permissão do Google. | prática comum (Calendly, convites) | [Documentação aberta dos parâmetros](https://github.com/InteractionDesignFoundation/add-event-to-calendar-docs/blob/master/services/google.md) | média |
| Receita Federal e LC 123/2006 | Limite do MEI R$ 81.000 por ano em 2026 (PLP 108/2021, que sobe o teto, ainda em tramitação); excesso de até 20% desenquadra no ano seguinte, acima de 20% retroage a janeiro (art. 18-A, § 7º); DASN-SIMEI até 31 de maio; nota obrigatória para empresa, dispensada para pessoa física que não pede; NFS-e no padrão nacional desde 1º/09/2023; DAS 2026: R$ 82,05 (comércio ou indústria), R$ 86,05 (serviços), R$ 87,05 (os dois), com salário mínimo de R$ 1.621. | regra oficial | [Contábeis, desenquadramento](https://www.contabeis.com.br/forum/legalizacao-de-empresas/397220/desenquadramento-do-mei/), [Jettax, limite 2026](https://www.jettax.com.br/blog/aumento-do-limite-do-mei-em-2026-valor-atual-projeto-de-lei-e-o-que-pode-mudar/), [Diário do Comércio, DASN](https://diariodocomercio.com.br/legislacao/prazo-entrega-dasn-simei-vence-31-maio/), [Company Hero, nota fiscal](https://www.companyhero.com/blog/mei-e-obrigado-emitir-nota-fiscal), [Contábeis, NFS-e nacional](https://www.contabeis.com.br/noticias/60782/nfs-e-padrao-nacional-comeca-a-valer-em-setembro/), [O Povo, DAS 2026](https://www.opovo.com.br/noticias/economia/2026/01/02/contribuicao-mensal-do-mei-sobe-para-rs-8105-em-2026.html) | média (fontes secundárias citando a lei; conferir no texto da lei antes de publicar) |

## Veredito

- **3.1 Agendar por pedido: faz sentido, do jeito do Square, mas com a
  confirmação da regra 5.** O Tino lê a frase ("amanhã às 15h com a Ana",
  "sexta 10:30 corte da Rita", "dia 12 às 9h") sem modelo de linguagem,
  por regra testada, e mostra a proposta: "Quarta, 08/10, 15:00 · Ana.
  Marcar?". Um toque marca. O que não entendeu, ele pergunta, não chuta.
  O modelo de linguagem entra só se a regra não der conta, e a proposta
  continua precisando do toque.
- **3.2 Google Agenda: começar pelo link, não pela integração.** O link
  `action=TEMPLATE` põe o compromisso na agenda do Google da pessoa sem
  pedir permissão nenhuma; o arquivo `.ics` faz o mesmo no iPhone e no
  Outlook. A integração de verdade (o Tino escrevendo na agenda sozinho)
  pede a verificação do app no Google, que é do Davi, e fica para depois.
- **3.3 Ajuda tributária: um catálogo de regras com fonte e data, e o
  "caso de contador" escrito.** Cada resposta diz a regra, a fonte, a data
  em que foi conferida, e, quando usa número da conta, o cálculo (quanto
  falta para o limite, se o excesso passa de 20%). Pergunta fora do
  catálogo recebe "isso passa do que a regra escrita responde: é caso de
  contador", em vez de chute.
- **3.4 Modo simples:** o Tino já tem a escala de letra (`--escala-letra`);
  o modo simples junta letra maior, menos itens no menu e botões maiores.
  É tela: vai pelo canvas.
- **3.5 Moda:** grade de tamanho e cor no produto, troca e devolução, e
  vendas por tamanho. Estudo próprio quando a área chegar (depois de
  Beleza, como o plano manda).

## Como medir

- **Pedidos entendidos de primeira** (proposta aceita sem correção): meta
  70%; o Square diz 75% para perguntas, referência aproximada.
- **Compromissos levados ao Google Agenda** pelo link: linha de base.
- **Perguntas tributárias que caem em "caso de contador"**: acima de 40%,
  o catálogo está pequeno demais.

## Limites deste estudo

- Resumos de busca; as regras do MEI precisam ser conferidas no texto da
  LC 123 e da Resolução CGSN 140 antes de irem para a tela. A data de cada
  regra fica na resposta para isso ficar visível.
- O limite do MEI pode mudar (PLP 108/2021). O catálogo guarda a data em
  que a regra foi conferida.

## Adendo: modo simples (3.4)

| Referência | O que faz | Resultado ou número | Fonte | Força |
|---|---|---|---|---|
| Apple, Acesso Assistivo (iOS 17, 2023) | Tela inicial só com o essencial, em grade de blocos grandes ou em linhas; botões de alto contraste, rótulos grandes, menos gestos. Quem configura pode ser um familiar. | recurso do sistema, sem número de uso público | [Perkins](https://www.perkins.org/resource/apple-unveils-new-features-for-global-accessibility-awareness-day/), [AbilityNet](https://mcmw.abilitynet.org.uk/how-to-simplify-your-iphone-or-ipad-s-interface-using-assistive-access-in-ios-26) | média |
| Samsung, Modo fácil | Ícones e letra maiores, tela inicial enxuta, tempo de toque longo ajustável (0,3 a 1,5 s) para evitar toque sem querer. | recurso do sistema | [Tom's Guide](https://www.tomsguide.com/phones/samsung-phones/your-samsung-galaxy-phone-comes-with-a-hidden-easy-mode-heres-how-to-find-it), [How-To Geek](https://www.howtogeek.com/736539/psa-samsung-galaxy-phones-have-easy-mode-for-better-accessibility/) | média |
| Uber, conta sênior (Brasil, 2025) | Letra maior, desenho mais limpo, menos passos para pedir a corrida e um familiar que ajuda; começou por BH, Porto Alegre e Fortaleza, e o familiar pode ligar o modo. | lançamento, sem número de uso | [Olhar Digital](https://olhardigital.com.br/2025/06/04/internet-e-redes-sociais/uber-novo-modo-para-idosos-tem-letras-maiores-e-cara-mais-simples/), [MacMagazine](https://macmagazine.com.br/post/2025/06/04/focado-em-idosos-novo-recurso-da-uber-simplifica-interface-do-aplicativo/) | média |
| Banca March (Espanha) | Versão simplificada do app do banco, para acessibilidade. | lançamento | [Banca March](https://www.bancamarch.es/en/news/banca-march-launches-a-simplified-version-of-its-app-to-afford-greater-accessibility-for-customers.html) | fraca (só o anúncio) |

**Veredito do 3.4:** faz sentido, e o padrão dos quatro é o mesmo: poucas
ações grandes na tela inicial, letra maior e um jeito de outra pessoa
ligar o modo. As três opções do canvas (passo 50) seguem esses três
caminhos: blocos grandes como o Acesso Assistivo, a mesma tela com letra
e botões maiores como o Modo fácil, e o modo ligado por quem ajuda, como
a conta sênior da Uber. O cálculo não muda em nenhum: é só a casca.

**Como medir o 3.4:** quantas contas ligam o modo e quantas desligam em 7
dias (desligar rápido diz que o modo tirou o que a pessoa usava).

# Estudo: ativar o MEI numa conta pessoal que já existe

Data: 2026-10-06 · Fase e item: Fase 1, item 1.3

## A pergunta

A pessoa já usa o Tino pessoal e abriu (ou já tinha) um MEI. Como ela liga
o Tino negócio sem criar outra conta, sem perder o histórico de casa e sem
quebrar a regra de 04/10/2026 (pessoal e MEI entram por logins diferentes)?

## O que o Tino faz hoje

Quem tenta entrar pelo login MEI com uma conta só pessoal recebe "Esta conta
ainda não tem o Tino MEI. Entre pelo login do Tino pessoal." (`SEM_MEI`) e
fica sem caminho. Criar outro cadastro com o mesmo e-mail não dá. O perfil
MEI (`MeiPerfil`) só nasce no cadastro do MEI ou no começo do app. É um
beco sem saída para o cliente que mais vale: quem já confia no Tino.

## Quem já faz

| Referência | O que faz | Resultado ou número | Fonte | Força |
|---|---|---|---|---|
| Nubank (Brasil) | O cliente pessoa física pede a conta PJ dentro do próprio app: Configurações, "Pedir conta PJ", digita o CNPJ e aguarda. Depois troca entre PF e PJ pelo nome no topo. Mais tarde abriu PJ também para quem não tinha conta pessoal. | mais de 6 milhões de clientes PJ (ver estudo de área) | [Canaltech](https://canaltech.com.br/negocios/vale-a-pena-ter-a-conta-pj-digital-do-nubank/), [Nubank, PJ sem conta pessoal](https://international.nubank.com.br/pt-br/consumidores/nubank-libera-abertura-de-conta-pj-tambem-para-clientes-sem-conta-pessoal/) | média (imprensa) e forte (empresa), só resumo |
| Inter (Brasil) | A conta MEI mora no **mesmo app** da pessoa física: menu, "Abrir conta Inter Empresas", CNPJ, e-mail, selfie, análise. A PJ maior tem app próprio. | sem número no resumo | [Blog do Inter, abrir conta MEI](https://blog.inter.co/abrir-conta-mei) | forte (empresa), só resumo |
| QuickBooks Solopreneur (EUA) | Feito para quem trabalha sozinho: separa no mesmo lugar o gasto do negócio e o pessoal. | sem número no resumo | [Fintech Futures, lançamento](https://www.fintechfutures.com/press-releases/intuit-introduces-quickbooks-solopreneur-an-easy-to-use-financial-tool-built-for-one-person-businesses) | média |
| Monarch Money (EUA) | App pessoal usado por quem tem bico: marca com etiqueta o que é do negócio, mesmo misturado na mesma conta. | sem número no resumo | [Rob Berger](https://robberger.com/best-budgeting-apps-for-small-business/) | fraca (blog) |

## Veredito

**Faz sentido, e o caminho é o do Nubank e do Inter: pedir o negócio de
dentro da conta que já existe, com o CNPJ.** Os dois bancos que mais têm
MEI no Brasil fazem assim, e nenhum manda criar outro cadastro.

O que o Tino faz:

1. **"Ligar o Tino negócio" no Perfil do Tino pessoal** (onde o Nubank põe
   "Pedir conta PJ") e um cartão no Início para quem marcou que tem MEI.
   Pede o CNPJ (com os dígitos conferidos, `cnpjValido`), a data de abertura
   e leva à escolha do segmento que já existe (`/loja/comecar`).
2. **No login MEI**, em vez do beco sem saída: "Esta conta ainda não tem o
   Tino negócio. Quer ligar agora?", com o botão. A senha já foi conferida,
   então ligar ali não abre porta nova.
3. **A regra de 04/10 continua**: depois de ligado, o negócio entra pelo
   login MEI, e a casa pelo login pessoal. O que muda é que existe caminho
   de um para o outro. A troca num toque entre casa e negócio (como o Nubank)
   é decisão do Davi, já anotada como pendente.
4. **O histórico de casa fica onde está.** O Tino não move nada sozinho para
   o negócio. Se a pessoa usava a conta pessoal para o negócio (o caso comum,
   que o Monarch e o QuickBooks atendem com etiqueta), o Tino **propõe** as
   movimentações que parecem do negócio e ela confirma (regra 5). Isso é
   uma segunda etapa, não precisa entrar junto.
5. **O plano**: ligar o negócio muda o plano para Meu negócio. A tela diz o
   preço e que os 14 dias de teste valem para o negócio também, antes de
   ligar.

## Como medir

- **Contas pessoais que ligam o negócio**: sem referência de mercado; o
  primeiro mês dá a linha de base.
- **Erros "conta sem MEI" no login MEI**: devem cair para perto de zero, ou
  virar ativação. Hoje é um beco sem saída sem contagem.
- **Negócios ligados que fazem a primeira venda ou a primeira OS em sete
  dias**: mesma meta de ativação do estudo de área (60%).

## Limites deste estudo

- As páginas não abriram deste ambiente; tudo veio de resumo de busca.
- Os bancos analisam o CNPJ antes de abrir; o Tino não tem como consultar a
  Receita daqui. Confere os dígitos e confia na pessoa, como já faz no
  cadastro do MEI.

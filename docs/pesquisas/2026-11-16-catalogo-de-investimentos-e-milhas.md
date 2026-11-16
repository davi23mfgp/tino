# Estudo: catálogo de investimentos e ligação com programas de milhas

16/11/2026. Pedido do Davi: "os investimentos eu coloque o nome e ele já
aparece no catálogo para eu assinalar e ele me dá quanto rendeu, como se fosse
uma XP" e "quero uma conexão com as empresas de milhas".

**Limite deste estudo:** a sessão em que foi feito não alcança as fontes
(Yahoo, brapi, Banco Central): o ambiente bloqueia. Nenhuma chamada real foi
testada aqui. Foi criado o ambiente "tino" com esses endereços liberados, para
a próxima sessão testar.

## Investimentos: de onde vêm os dados

| Tipo | Fonte | Custo | O que entrega | Força |
|---|---|---|---|---|
| Ações, fundos imobiliários, ETFs | Yahoo (já usado no Tino para cotação) | sem chave | preço e histórico; tem busca por nome | usado em produção para preço; a busca não foi testada |
| Ações, fundos imobiliários, ETFs | brapi.dev | grátis até 15.000 pedidos por mês, 1 código por chamada, 3 meses de histórico; planos pagos acima disso | lista de ativos, preço, dividendos | site da empresa (FAQ), 2026; preço dos planos não confirmado |
| Tesouro Direto | Tesouro Transparente (governo) | grátis | planilha CSV com preço e taxa de todo título desde 2004 | fonte oficial; não tem API pronta, é arquivo |
| Tesouro Direto | brapi.dev | parte paga | lista, taxa atual e histórico diário | site da empresa |
| CDB, LCI, LCA | não há catálogo público | | o rendimento se calcula pela regra do papel (por exemplo 110% do CDI) com a série do CDI do Banco Central | cálculo próprio |
| Fundos | CVM, dados abertos | grátis | cota diária de todo fundo, em CSV compactado por mês | fonte oficial; arquivos grandes |

**O que isso permite:**
1. Ações, fundos imobiliários e ETFs: digitar o nome, escolher na lista e ver o
   rendimento desde a compra. Falta guardar a data e o preço da compra.
2. Tesouro: escolher o título numa lista e calcular pelo preço do dia.
3. CDB e parecidos: a pessoa diz a taxa (110% do CDI) e a data; o Tino calcula.
4. Fundos: possível, mas é o mais pesado (arquivos da CVM). Fica por último.

**O que não permite:** saldo vindo sozinho da corretora. Isso é Open Finance,
que está fora por decisão do Davi (28/09/2026).

## Milhas: não achei acesso para aplicativos

A busca não encontrou API pública da Smiles, da LATAM Pass, da Livelo nem da
Azul para um aplicativo de fora consultar o saldo. O que apareceu foi uma
ferramenta não oficial que lê o site da LATAM (disponibilidade de voo, não
saldo). Evidência fraca por ser ausência: não encontrar não prova que não
existe por contrato. Mas hoje não há como prometer ligação automática.

**O que dá para fazer sem a ligação:**
- Saldo digitado por programa (hoje é um só por cartão), com data de validade
  e aviso antes de vencer.
- Valor do milheiro informado pela pessoa, para o Tino dizer quanto valem os
  pontos em reais.
- Ler o extrato de pontos que o programa manda por e-mail ou PDF, pelo mesmo
  caminho da fatura. Precisa de um exemplo real de cada programa para testar.

## Fontes

brapi.dev (FAQ de limites e documentação do Tesouro, 2026),
tesourotransparente.gov.br (base de preços e taxas), dados.cvm.gov.br
(informe diário de fundos), livelo.com.br e latampass.latam.com (páginas
oficiais, sem menção a acesso para aplicativos).

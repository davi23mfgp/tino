# Programas de pontos e milhas — o que dá para integrar

**Consultado em 13/09/2026.**

Este documento é insumo para o Sol implementar cálculo de pontos por real e,
onde for possível, integração. Ele responde uma pergunta de cada vez:
existe API pública documentada? Se não existe, o que existe no lugar?

## A distinção que muda tudo

Duas coisas diferentes se chamam "pontos" no dia a dia, e misturá-las produz
cálculo errado:

1. **Regra de pontuação do CARTÃO EMISSOR.** Quantos pontos cada real gasto
   gera. É contrato do banco com o titular, varia por bandeira, por
   modalidade (nacional/internacional) e por categoria de gasto. Exemplo: um
   cartão que dá 2,2 pontos por dólar.
2. **PROGRAMA DE FIDELIDADE.** Onde o ponto vive depois de creditado, quanto
   vale, quando expira e para onde transfere. Livelo, Esfera, Smiles, LATAM
   Pass, Azul Fidelidade.

O Tino precisa das duas. A primeira é cadastro por cartão (o usuário informa,
ou a gente mantém um catálogo). A segunda é saldo e regra do programa.

## Situação por programa

| Programa | Dono | API pública documentada? | O que existe |
|---|---|---|---|
| **Livelo** | Bradesco + Banco do Brasil (joint venture) | **Não localizada** | Plataforma de API interna para parceiros comerciais (registrada em estudo de caso público da Axway). Integração acontece via contrato de parceria, não por portal aberto. |
| **Esfera** | Santander | **Não localizada** | Sem portal de desenvolvedor público encontrado. Parcerias de acúmulo/transferência são comerciais. |
| **Smiles** | GOL | **Não localizada** | Sem portal público. Existem serviços de terceiros que expõem consulta de passagem em milhas por HTTP, mas são raspagem ou acordo próprio deles — não é API oficial. |
| **LATAM Pass** | LATAM | **Não localizada** | Mesma situação. |
| **Azul Fidelidade** | Azul (antigo TudoAzul, renomeado em fev/2024) | **Não localizada** | Mesma situação. |
| **Programas próprios dos bancos** (Itaú Sempre Presente, Bradesco Pontos Cartões, C6 Átomos, Inter Loop, Nubank Rewards) | cada banco | **Não localizada para pontos** | Portais de desenvolvedor de banco existem (o Banco do Brasil publica um em `developers.bb.com.br`), mas o catálogo deles é cobrança, Pix e Open Finance — não saldo de fidelidade. |

### O que foi tentado, para ninguém repetir

Requisição direta a `developers.smiles.com.br`, `developer.livelo.com.br`,
`developers.itau.com.br` e `devportal.bradesco.com.br`: **nenhum resolve**.
`www.livelo.com.br` responde **403** para cliente que não é navegador
completo. `developers.bb.com.br` responde **200**, mas com cadeia de
certificado que a nossa verificação recusou — precisa ser aberto no
navegador.

**Isto não é conclusão de que a API não existe.** É registro de que não há
documentação pública alcançável por requisição direta nesta data. Programa
de fidelidade grande costuma ter API, só que atrás de contrato: o caminho é
o comercial (formulário de parceria), não o técnico.

## Open Finance não resolve isto

Vale dizer com todas as letras, porque é a primeira ideia que ocorre: o
escopo regulado do Open Finance Brasil cobre dados cadastrais, contas,
cartão de crédito, operações de crédito e câmbio. **Saldo de programa de
fidelidade não está no escopo.** Conectar o banco pelo Pluggy traz a fatura,
não os pontos.

## O que dá para fazer sem nenhuma API

Isto é o caminho realista, e não depende de negociação com ninguém:

1. **Catálogo de regra por cartão.** O usuário informa quantos pontos por
   real (ou por dólar) o cartão dele dá, e para qual programa vão. Um campo
   por cartão, com o programa escolhido de uma lista.
2. **Cálculo sobre o que já temos.** A transação já está no banco de dados
   com valor em centavos e cartão associado. Pontos estimados = regra ×
   valor. O Tino passa a responder "esta fatura rendeu X pontos" sem
   consultar ninguém.
3. **Saldo informado pelo usuário.** Um campo "saldo atual no programa",
   atualizado quando ele quiser, serve para projeção e para avisar
   vencimento. Não é automático, mas é honesto.
4. **Aviso de expiração.** Depende só de regra do programa e da data do
   saldo informado.

O que **não** dá para fazer, e não deve ser prometido na interface:
saldo em tempo real sem o usuário digitar, e transferência entre programas
pelo app.

## Limites que valem sem exceção

- **Nada de endpoint privado nem raspagem autenticada.** Serviços de
  terceiros que oferecem "API de milhas" costumam fazer exatamente isso.
- **Nunca pedir senha de banco ou de programa de fidelidade.**
- **Custo só quando documentado.** Nenhum dos programas acima publica preço
  de API — então este documento não estima nenhum.

## Próximo passo, se o Davi quiser integração de verdade

Na ordem de menor para maior esforço:

1. Implementar os quatro itens de "sem nenhuma API" acima. Entrega valor
   imediato e não depende de terceiro.
2. Preencher o formulário de parceria comercial de Livelo e Esfera (são os
   dois com maior alcance no público do Tino, por serem de Bradesco/BB e
   Santander). A resposta diz se existe API e sob que condição.
3. Avaliar agregador. Alguns agregadores brasileiros já negociaram acesso a
   programas de fidelidade; vale perguntar ao mesmo fornecedor de Open
   Finance que estiver contratado.

## Fontes consultadas em 13/09/2026

- Estudo de caso público da Axway sobre a plataforma de API da Livelo:
  `resources.axway.com/api-management-doc/case-study-livelo-en`
- Open Finance Brasil, escopo e fases: `openfinancebrasil.org.br/entenda-e-aprenda/`
- Regulamento do programa de fidelidade Bradesco Cartões (PDF no domínio
  `assets.bradesco`)
- Portal de desenvolvedor do Banco do Brasil: `developers.bb.com.br`
- Verificação direta por requisição HTTP dos domínios listados na seção "o
  que foi tentado"

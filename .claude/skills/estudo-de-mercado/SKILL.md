---
name: estudo-de-mercado
description: Estudo de mercado obrigatório antes de recomendar ou construir qualquer coisa no Tino (função nova, tela nova, segmento, preço, plano, canal de venda, integração, nome). Use sempre que for propor uma opção ao Davi, montar as opções de um canvas, escolher a ordem do que fazer, ou quando ele perguntar "faz sentido?". Pede casos reais do Brasil e de fora, com fonte e data, e registra o estudo em docs/pesquisas/.
---

# Estudo de mercado no Tino

Pedido do Davi (06/10/2026): "tudo que você decidir recomendar, sempre vá
buscar no mercado. Nunca fazer algo por fazer." Recomendação sem estudo é
opinião, e opinião não serve para decidir onde o Tino gasta tempo.

## Quando usar

- Antes de recomendar uma função, tela, segmento, preço, plano, canal,
  integração ou nome.
- Antes de montar as três opções de um passo do canvas: cada opção diz em
  quem se inspirou.
- Antes de mudar a ordem das fases em `docs/PLANO-FASES.md`.

Não precisa para correção de defeito, velocidade ou texto (as mesmas exceções
do canvas no CLAUDE.md).

## Como fazer

1. **A pergunta.** Uma frase: o que estamos decidindo e para quem (área,
   subárea, idade, tamanho do negócio).
2. **Quem já faz.** No mínimo três referências, com pelo menos uma do Brasil
   e uma de fora. Procure nesta ordem:
   - concorrentes diretos do MEI (Kyte, Conta Azul, Omie, Bling, MaisMEI,
     apps de maquininha) e os especialistas da área (Trinks na beleza, por
     exemplo);
   - os casos de referência do plano estratégico (Square, Jobber,
     InfinitePay, Nubank PJ, Cora, Khatabook como caso de erro);
   - fonte oficial para número de mercado e regra: Receita Federal, Sebrae,
     IBGE, Banco Central, gov.br.
3. **O que cada um faz e o resultado.** O que a referência faz, o número que
   comprova (clientes, receita, adoção) e a data. Sem número, diga que não
   tem.
4. **Força da evidência.** Classifique cada fonte:
   - **forte:** fonte oficial, relatório da própria empresa, documentação do
     produto;
   - **média:** imprensa econômica (Exame, InfoMoney, Bloomberg Línea);
   - **fraca:** blog de fornecedor, resumo de busca sem a página aberta,
     estatística sem metodologia.
   Se a página não abriu e só o resumo da busca chegou, escreva isso.
5. **Veredito.** "Faz sentido porque..." ou "não faz sentido porque...", e o
   que o Tino faz **diferente** (o que copiar e o que não copiar). Se a
   evidência é fraca, diga que é aposta e como medir.
6. **Como saber se deu certo.** A métrica e a meta, com a referência (regra 4
   do Tino: todo indicador com a faixa).

## Onde registrar

- O estudo vai em `docs/pesquisas/AAAA-MM-DD-tema.md`, no modelo abaixo.
- O item da fase em `docs/PLANO-FASES.md` aponta para o estudo.
- Na conversa com o Davi, só o veredito e o porquê em poucas linhas, com o
  link do estudo.

## Modelo

```markdown
# Estudo: <tema>

Data: AAAA-MM-DD · Fase e item: <ex.: Fase 1, item 1.2>

## A pergunta
<uma frase>

## Quem já faz
| Referência | O que faz | Resultado ou número | Fonte | Força |
|---|---|---|---|---|

## Veredito
<faz sentido / não faz, por quê, o que o Tino faz diferente>

## Como medir
<métrica, meta e referência>

## Limites deste estudo
<o que não deu para confirmar>
```

## Regras que valem aqui também

- Nada de número inventado (regra 3). Estimativa é marcada como estimativa.
- Nenhum travessão no texto (regra 8).
- Cite só o que foi lido; link junto de cada número.

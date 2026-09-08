# Pesquisa: Open Finance de verdade no Tino — dá pra fazer sem custo fixo?

Pedido do Davi (07/09/2026, madrugada): achar um jeito de ter Open Finance
de verdade (sincronização automática com banco, não só import de arquivo)
de graça, ou pelo menos só custando quando o cliente pagar — não custo fixo
mensal independente de receita.

**Não implementado ainda** — decisão de fornecedor/dinheiro é do Davi, não
de IA. Isto é o levantamento pra ele decidir de manhã, não um começo de
integração. Nenhuma chave de API foi criada ou pedida.

## Fornecedores pesquisados

### Pluggy — melhor encaixe pro que foi pedido
- Regulado pelo Banco Central, +130 instituições numa API só, 400+
  empresas já usando.
- **"Meu Pluggy"**: acesso à API de graça por tempo indeterminado, mas só
  pra uso pessoal/teste — uso comercial (Tino é comercial) exige plano
  pago.
- Trial de 14 dias com dado real de cliente de verdade, sem cartão.
- Modelo pago: "cresceu, paga proporcional" — cobra por volume de conexão/
  chamada de API, não preço fixo fechado. Faixa citada publicamente:
  dados a partir de R$ 2.500/mês (parece ser o patamar de entrada
  divulgado, não necessariamente o único formato — vale confirmar direto
  com o time comercial deles se existe uma faixa menor por conexão pra
  volume baixo, que é o caso do Tino agora).
- **Caminho que bate com o pedido**: gatear a conexão bancária ao vivo
  atrás de um plano pago do próprio Tino (ex: "Tino Plus") — o cliente só
  ativa se estiver pagando, e é essa assinatura que cobre o custo por
  conexão da Pluggy. Zero custo enquanto ninguém usa; custo escala junto
  com receita, não antes dela.
- Fonte: [pluggy.ai](https://www.pluggy.ai/), [pluggy.ai/pricing](https://www.pluggy.ai/pricing), [pluggy.ai/meu-pluggy](https://www.pluggy.ai/meu-pluggy), [blog.usesecuro.com](https://blog.usesecuro.com/post/pluggy-quanto-custa-usar-api-open-banking)

### Belvo — alternativa, menos claro pro caso do Tino
- Sandbox grátis só pra teste; produção (cliente real) é pago.
- Cobra por chamada de API, mas não achei número público de preço por
  conexão — precisaria falar direto com vendas.
- Fonte: [belvo.com/plans-and-pricing](https://belvo.com/plans-and-pricing/)

### Klavi — não achei preço público
- Foco mais em análise de crédito B2B do que em app de consumidor final;
  não achei número de preço público, só material institucional.
- Fonte: [klavi.ai/blog](https://www.klavi.ai/blog)

## Recomendação (pra confirmar com o Davi, não decidido sozinho)

1. **Não built agora** — é decisão de dinheiro/fornecedor real, fica pro
   Davi acordado.
2. Se decidir seguir: **Pluggy** é o candidato mais forte (regulado,
   BR-nativo, modelo de preço por volume, trial real de 14 dias sem
   cartão pra validar antes de comprometer).
3. Estrutura de custo que bate com o pedido dele ("grátis ou só quando o
   cliente pagar"): usar o trial de 14 dias pra prototipar sem custo,
   depois **gatear conexão bancária ao vivo atrás de assinatura paga do
   Tino** — nunca abrir de graça pra base toda, porque aí o custo por
   conexão vem antes da receita.
4. Próximo passo real, quando ele confirmar: falar com o time comercial
   da Pluggy pra achar se existe faixa de entrada mais barata que R$
   2.500/mês pro volume atual do Tino (esse número parece ser o patamar
   divulgado publicamente, pode não ser o único).

Import de arquivo (OFX/CSV/PDF) continua sendo o caminho grátis que já
funciona hoje — essa pesquisa é sobre a sincronização AO VIVO que falta,
não substitui o que já existe.

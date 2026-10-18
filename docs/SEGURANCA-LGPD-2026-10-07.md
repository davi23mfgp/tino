# Segurança e LGPD: o que entrou depois de 22/09 (07/10/2026)

Continuação de `SEGURANCA-LGPD-2026-09-22.md`, para o item 7.4 do
`PLANO-FASES.md`. Revisão só do que foi construído depois daquela data:
recuperar senha, origem do cadastro, entrada do aparelho (senha cifrada e
link do cliente), indicação, análises da Fase 2, assessor da Fase 3 e
conciliação da maquininha. A revisão completa antes de abrir ao público
continua no 7.4.

## Achados corrigidos

| # | Problema | Impacto | Correção | Como foi testado |
|---|---|---|---|---|
| 1 | "Esqueci a senha" respondia depois de gravar o link e chamar o provedor de e-mail quando a conta existia, e na hora quando não existia | Medindo o tempo, dava para saber quem é cliente do Tino (o mesmo defeito que o login corrigiu em 22/09) | Procurar a conta, gravar o link e mandar o e-mail rodam depois da resposta (`after`, do Next) | curl com e-mail configurado: antes 58 a 72 ms com conta e 26 a 37 ms sem; depois 22 a 41 ms nos dois, misturados. O link continuou sendo gravado |
| 2 | Conferir a maquininha aceitava arquivo de qualquer período (até 2 MB) | Arquivo de um ano compara cada venda com cada pagamento: conta de milhões numa requisição | Até 5.000 vendas e 100 dias por arquivo; acima disso a resposta pede um arquivo menor | `tsc`; regra simples na rota |

## Conferido e sem achado

- **Link do serviço (`/api/servico-publico`)**: limite por IP, token com
  formato fixo antes de ir ao banco, resposta uma vez só (condicional no
  banco), nada da senha do aparelho no link.
- **Senha do aparelho**: cifrada com a chave do servidor, aberta só por
  "Ver senha" de quem é da loja (funcionário não alcança `/api/loja/ordens`),
  apagada na entrega.
- **Redefinir senha**: token guardado só como hash, validade curta, troca
  condicional (dois cliques não trocam duas vezes), derruba as sessões.
- **Origem do cadastro**: o cookie é limpo por lista de caracteres e
  tamanho, e só a primeira chegada vale.
- **Negócio escolhido no topo**: o cookie só escolhe entre os negócios do
  próprio lar.
- **Conciliação da maquininha**: os ajustes conferem que cada pagamento é
  da loja e de venda não cancelada (404 para pagamento alheio, testado), e
  o líquido não passa do valor da venda (400, testado).

## Fica para a revisão do 7.4

- Registro de quem tocou em "Ver senha" do aparelho (hoje não fica rastro).
- Revisão completa de LGPD antes do lançamento: termos, privacidade, prazos
  de guarda, pedido de dados e exclusão, com o texto final do Davi.

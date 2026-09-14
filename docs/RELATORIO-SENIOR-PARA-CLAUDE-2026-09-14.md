# Revisão sênior do Tino — encaminhamento ao Claude

Data: 14/09/2026. Repositório: `C:\Users\iasdn\Documents\tino`.
Snapshot consultado: `742dbe0` — árvore limpa no início da revisão.

## Escopo e conclusão

Revisão estática de fluxos selecionados e avaliação das imagens fornecidas pelo usuário. Nenhuma correção de produto foi aplicada nesta revisão. Não executei build, testes ou validação autenticada no navegador; portanto, este documento não certifica produção, segurança completa ou conclusão das 53 tarefas.

Há falhas de consistência financeira e de estado que merecem prioridade sobre acabamento. O visual das capturas também apresenta hierarquia fraca, componentes volumosos e controles pouco integrados. O código atual já contém melhorias posteriores às imagens: distinguir problemas históricos de defeitos ainda reproduzíveis antes de editar.

Objetivo do usuário: entender a situação financeira, identificar a próxima ação e acompanhar o resultado com pouco texto. Referência de composição: Calen. Direção visual: Apple/iOS, com controles discretos, tipografia legível e hierarquia clara. As capturas criticadas pelo usuário são exemplos do que corrigir, não modelos a reproduzir.

## P1 — consistência financeira e estados

### 1. Captura confirmada pode ser descartada sem desfazer o lançamento

**Confirmado no código:** `src/app/api/capturas/route.ts:76` atualiza por ID e lar, sem restringir o estado anterior. Em `src/lib/captura/index.ts:218`, a confirmação usa bloqueio transacional e verifica `transacaoId`, mas não exige estado pendente.

**Cenário:** confirmar e depois chamar descarte mantém o lançamento, mas muda a captura para descartada. Descartar e depois confirmar também permite criar lançamento. A autorização por lar existe; o problema é a transição de estados.

**Ação:** definir transições permitidas e executá-las atomicamente. Descarte comum deve operar apenas sobre pendentes. Caso exista desfazer confirmação, oferecer operação explícita com tratamento do lançamento associado.

**Aceite:** confirmação repetida mantém uma transação; descarte de confirmada não altera silenciosamente seu estado; confirmação de descartada segue regra explícita; chamadas concorrentes não deixam captura e lançamento divergentes.

### 2. Deduplicação pode suprimir compras legítimas

**Confirmado no código:** `src/lib/captura/index.ts:111` considera duplicata mesmo lar, valor e estabelecimento nos últimos dez minutos. Não distingue conta ou identificador de evento nessa consulta.

**Cenário:** duas compras reais de mesmo valor na mesma loja, inclusive em cartões diferentes, retornam a primeira captura. A consulta seguida de criação também exige verificar proteção contra concorrência no banco.

**Ação:** usar chave estável de evento quando disponível; tratar semelhança como suspeita revisável quando não houver identidade suficiente. Conferir as restrições existentes no schema antes de propor migração.

**Aceite:** reenvio do mesmo evento não duplica; duas compras distintas permanecem registráveis; concorrência e canais diferentes têm comportamento documentado.

### 3. Compra manual usa mês da data, sem atribuição explícita de fatura

**Confirmado no caminho analisado:** `src/components/compra-cartao-form.tsx:24` envia compra simples sem competência de fatura. `src/app/api/transacoes/route.ts:172` grava `competenciaDe(data)`.

**Risco funcional:** compra após fechamento pode aparecer no mês da compra em vez da fatura correspondente. É necessário confirmar o contrato entre competência contábil e competência de fatura nos consumidores, preservando ambas quando tiverem significados diferentes.

**Ação:** centralizar a regra de atribuição da fatura e permitir ajuste explícito quando necessário. Reutilizar essa regra nos caminhos manual, captura e importação que se apliquem.

**Aceite:** validar compras antes/depois do fechamento, virada de ano e mudança de vencimento. Detalhe do cartão, faturas e dashboard concordam, sem duplicar parcelas previstas e compras confirmadas.

### 4. Projeção parte de saldo que inclui investimentos

**Confirmado no código:** `src/lib/tino/panorama.ts:184` exclui apenas cartão de crédito ao somar saldo; esse resultado inicia a projeção em `:382`.

**Risco:** havendo conta de investimento com saldo indisponível, a projeção pode indicar capacidade de pagamento inexistente. A ocorrência depende dos dados e da liquidez dos investimentos cadastrados.

**Ação:** separar patrimônio e dinheiro disponível para pagar compromissos; definir tratamento explícito de liquidez. Evitar excluir indiscriminadamente aplicações que realmente possam ser resgatadas no período.

**Aceite:** cenário com pouco saldo disponível e investimento sem liquidez mostra insuficiência de caixa, preservando o patrimônio correto.

## P2 — orçamento e comportamento da interface

### 5. Orçamento de mês sem plano herda valor legado

**Confirmado:** `src/components/central-cartoes.tsx:167` e `:173` usam `orcamentoMensalCentavos` quando não existe plano no mês. A API, em `src/app/api/cartoes/[id]/orcamento/route.ts:19`, limita esse fallback ao mês atual e à ausência de quaisquer planos.

**Impacto:** interface e API apresentam regras diferentes; navegar para mês ainda não planejado pode mostrar valor como se já estivesse definido.

**Ação:** usar uma regra compartilhada. Oferecer copiar mês anterior como ação explícita, distinguindo rascunho de plano salvo.

**Aceite:** mês vazio aparece sem plano; copiar requer ação; salvar um mês não cria aparência de plano salvo nos demais.

### 6. Cadastro de categoria inventa R$ 10; entrada monetária reformata a cada tecla

**Confirmado:** `src/components/central-cartoes.tsx:181` adiciona categoria com `1000` centavos. Inputs em `:180` e `:182` recebem valor já formatado em cada atualização. Categorias ativas dependem de gasto ou limite maior que zero.

**Impacto:** adicionar categoria altera o planejamento antes de escolher valor; zerá-la pode removê-la da edição. A digitação de valores intermediários exige reprodução no navegador, pois pode reposicionar o cursor ou dificultar apagar/substituir.

**Ação:** separar presença da categoria de seu limite, iniciar sem alocação e manter texto de edição até validação. Sincronizar slider e valor exato, mantendo centavos no domínio.

**Aceite:** adicionar não distribui dinheiro automaticamente; categoria permanece editável com zero; digitar, colar, apagar e substituir `1.234,56` funciona; slider e campo apresentam o mesmo valor, inclusive acima da faixa inicial.

### 7. Parcela selecionada não acompanha automaticamente mudança do mês externo

**Confirmado no componente:** `src/components/parcelamentos-cartao.tsx:60` inicializa `competencia` por `useState` a partir de `mes`; não há sincronização nesse trecho. A lista mantém chave pelo ID do parcelamento.

**Risco a reproduzir:** trocar o mês global mantendo o componente montado pode preservar o mês anterior no detalhe. A lista também recebe todos os parcelamentos enquanto o cabeçalho resume o mês selecionado.

**Ação:** definir se o detalhe acompanha o mês global ou se tem navegação independente claramente sinalizada. Distinguir carteira completa de parcelas pertencentes ao mês.

**Aceite:** trocar o mês não deixa cabeçalho e detalhe contraditórios; compras fora do período ficam identificadas; progresso, restante e competência têm significado claro.

## Acabamento visual — evidências das imagens, validar na versão atual

| Área | Problema observado | Resultado esperado |
|---|---|---|
| Extrato | Filtros ocupam grande bloco antes da lista; categorias parecem botões enormes; repetição de rótulos | Barra compacta com mês, busca e filtros secundários; totais discretos; lançamentos alinhados, agrupáveis por data; valor e estabelecimento prioritários |
| Cartões | Cartões sobrepostos escondem informação; seleção e gráfico competem por atenção | Pilha com identidade reconhecível, elevação ao hover e seleção persistente ao clique; equivalência por teclado e toque; fatura e vencimento claros |
| Parcelas | Grandes superfícies cinzas e progressos longos com pouco significado | Linha compacta com mensalidade, pagas/total, restante e fim; calendário expandido sob demanda |
| Orçamento | Sliders com aparência nativa e blocos pouco hierarquizados | Trilho fino consistente, valor exato editável, gasto versus teto e restante por categoria; excedente perceptível sem depender só da cor |
| Ajuda | Escolha e simulação não deixam evidente acompanhamento até o resultado | Situação → ajuste simples → ação persistida → progresso; detalhes explicativos recolhidos |
| Modais e controles | Espaçamento lateral e densidade inconsistentes; controles nativos destoam | Padding lateral uniforme; duas colunas quando couber; foco visível; resumo em texto, não input numérico; controles de edição acessíveis |

Não basta reduzir toda a interface por escala ou trocar apenas border-radius. Definir tokens de tipografia, espaçamento, superfícies, divisórias e estados e aplicá-los consistentemente. Como proposta inicial para desktop: texto de controles 14–16 px, controles visuais de 36–40 px e linhas de lista por volta de 56–64 px; validar com conteúdo real e manter alvos confortáveis no toque. Essas medidas são propostas de implementação, não especificações oficiais da Apple.

Preservar acessibilidade, zoom, contraste e navegação por teclado. Scroll continua necessário em conteúdo extenso e telas pequenas; evitar eliminá-lo escondendo conteúdo. Remover setas nativas de números apenas onde solicitado, preservando entrada e semântica adequadas.

## Melhorias já presentes: preservar e verificar

- `src/app/(app)/painel/page.tsx:40` agrega quantidade e soma de todas as pendências separadamente da prévia de quatro itens. A crítica antiga de contagem limitada a quatro está superada no código consultado.
- `src/components/ajuda-cartao.tsx:37` consulta `/api/cambio`; o cálculo usa gastos menos créditos e admite câmbio manual. Não repetir a crítica antiga de câmbio fixo fictício sem nova evidência.
- API de orçamento valida mês, valores inteiros, categorias repetidas, soma e pertencimento ao lar.
- Confirmação de captura já tem bloqueio e reutilização de transação existente. Corrigir a máquina de estados preservando essa proteção.
- Parcelamentos já têm componente próprio, e o formulário de compra tem padding lateral. As imagens anteriores não comprovam como esses trechos renderizam hoje.

## Encaminhamento operacional ao Claude

1. Leia este relatório, `docs/SPEC-CALEN-PRECISO.md` e as imagens originais de referência. Os ZIPs informados estão em `C:\Users\iasdn\Pictures\Screenshots\Captura de tela 2026-09-09 200524.zip` e `C:\Users\iasdn\Pictures\Screenshots\Captura de tela 2026-09-13 150912.zip`; a disponibilidade atual não foi revalidada nesta revisão. Separe referências desejadas de capturas rejeitadas. Se faltar uma referência, registre a lacuna; não declare fidelidade visual sem vê-la.
2. Confira HEAD e alterações concorrentes. Reproduza os achados no estado atual e corrija primeiro consistência financeira, depois orçamento/parcelas e por último acabamento integrado. Preserve trabalho já concluído por outros agentes.
3. Use `docs/AUDITORIA-53-2026-09-13.md` como checklist histórico, não aprovação atual. Reavalie cada item contra código e evidência. Esta revisão não reaudita integralmente os 53 itens.
4. Ao final das alterações, execute verificações focadas nos cenários acima e os checks exigidos pelo projeto. Compare capturas equivalentes no desktop e mobile; confira teclado, modais, dados vazios e valores longos. Registre comandos e resultados reais.
5. Para pontos/milhas e outras integrações, diferencie simulação, configuração manual e integração real. Pesquisa de API oficial, acesso de parceiro e credenciais permanecem itens a verificar; este relatório não certifica essas integrações.
6. Entregue tabela com ID, status (corrigido/verificado/pendente), evidência, testes e limitação. Para as 53 tarefas, marque como concluído apenas o que tiver critério de aceite atendido. Informe separadamente versão local e publicada.

Nenhuma nova implementação, publicação ou alteração de dados foi executada como parte desta revisão. O próximo passo é o usuário encaminhar este documento ao Claude.

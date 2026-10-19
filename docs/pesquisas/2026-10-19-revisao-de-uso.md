# Estudo: revisão de uso, tela por tela

Data: 2026-10-19 · Fase e item: Fase 7, item 7.3 (e prepara o 6.4)
Relatório para o Davi: https://claude.ai/artifact/UMeUFNhhN7zb7jw6v49TBv

## A pergunta
Alguém que nunca mexeu no Tino consegue, em cada tela, criar, editar, excluir e achar a informação que quer, sem ajuda?

## Como foi feito
38 telas capturadas no celular (390px, tema escuro) com as contas de demonstração `demo@tino.local` (pessoal) e `demo-mei@tino.local` (loja), mais uma varredura do código de cada tela e das rotas da API para ver o que existe de editar, excluir, desfazer, busca e filtro.

## Quem já faz
| Referência | O que diz | Fonte | Força |
|---|---|---|---|
| Don Norman e Bruce Tognazzini | Gesto escondido não é descoberto: a tela tem de mostrar o que dá para fazer | [The New Atlantis](https://thenewatlantis.com/?p=4000) (resumo de busca) | média |
| Adobe XD e Smashing Magazine | Arrastar para apagar é atalho, não pode ser o único caminho | [Smashing](https://www.smashingmagazine.com/2016/10/in-app-gestures-and-mobile-app-user-experience) | fraca |
| LogRocket | Ação por gesto atrapalha leitor de tela; alvo de toque de 48px | [LogRocket](https://blog.logrocket.com/ux-design/accessible-swipe-contextual-action-triggers) | fraca |
| Consenso citando o NN/g | Desfazer em vez de "tem certeza?" para o que volta; confirmação só para o irreversível, dizendo o que se perde. Não há estudo controlado comparando | [Andy Matuschak](https://notes.andymatuschak.org/zXH4ASvHNz488hCNgrBjQJK), [saasui](https://www.saasui.design/blog/saas-destructive-actions-confirmation-ux-patterns) | fraca (segunda mão) |
| Revisão sistemática, 132 artigos (2025) | Para idosos: navegação simples, letra e alvo maiores, tolerância a erro | [PMC12350549](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12350549/) | forte |
| Estudo com 22 idosos (2020) | Navegam melhor pelo conteúdo do que por menus; não entendem o significado de ícones | [PolyU](https://research.polyu.edu.hk/en/publications/older-adults-use-of-mobile-device-usability-challenges-while-navi/) (resumo) | média |
| Nubank (2022) | Reorganizou o app em três abas com pesquisa de usuário para manter simples com mais funções | [Nubank](https://international.nubank.com.br/consumers/nubank-app-organizes-routine-in-transactions-planning-and-shopping/) | média |

## Achados
Funções que faltam (a pessoa não consegue corrigir um erro):
1. **Extrato:** não há como excluir lançamento. `DELETE /api/transacoes/[id]` existe e nenhuma tela chama.
2. **Dívidas:** a API só tem listar e criar; não dá para editar nem excluir.
3. **Clientes da loja:** sem excluir nem arquivar.
4. **Fiado:** só "receber tudo"; não mostra o que a pessoa levou nem corrige uma venda.

Difícil de entender: Início manda escolher categoria em outra tela; Extrato vazio sem botão; Clientes repete a mesma pessoa por orçamento e esconde a busca; Catálogo parece formulário e duplica o título; Dívidas sem ação no cartão e uma comparação que não decide nada; Metas repete a primeira meta; Cartões com aba e link para o mesmo lugar.

Já certo (modelo): Contas fixas (tocar abre a edição, excluir com desfazer), Categorias (busca, grupos, seta), Metas e Reserva (botões com rótulo).

## Veredito
Faz sentido corrigir primeiro as quatro funções que faltam, num padrão único decidido uma vez no canvas: tocar no item abre a ficha com Editar e Excluir escritos, e excluir tem Desfazer. Depois, o canvas tela a tela na ordem do quanto atrapalha, e o teste com uma pessoa de 65 anos.

## Como medir
Teste do item 6.4: cinco tarefas (anotar um gasto, corrigir o valor, apagar um lançamento repetido, achar o gasto no mercado, cadastrar uma conta fixa), sem ajuda. Meta: cinco de cinco. Sem referência de mercado lida para essa meta; é o mínimo para dizer "usa sem ajuda".

## Limites deste estudo
Só celular e tema escuro hoje (computador e claro vistos na galeria de 07/10). A conta de demonstração não tem lançamentos em outubro. Nenhuma pessoa de fora usou o app. Várias fontes são resumos de busca, marcados acima.

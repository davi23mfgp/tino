# Revisão da sessão de 13/09/2026

Revisão feita no fim da sessão, conferindo cada pedido contra o código, não
contra o que foi relatado. Verificado com `tsc`, `npm test` (302/302),
`next build` e navegação real no Chrome com a conta de demonstração.

Estado final: `main` em `e9ac182`, tudo pushado.

## Entregue e verificado

| Pedido | Onde ficou |
|---|---|
| Continuar o trabalho em curso | Lacunas da revisão sênior fechadas e commitadas (`95df682`); linha `claude/visual-ios` mesclada na `main` (`7a7aa4f`) |
| Contraste entre aviso lido e não lido | `src/components/barra-topo.tsx` — não lido mantém superfície cheia, ponto de acento, título forte e barra de urgência; lido recua para fundo transparente. As abas Todas/Não lidas ganharam estado selecionado visível |
| Cartão na cor do banco, com logo | `src/app/(app)/painel/` — cartão inteiro na cor da instituição, logo real no lugar do ícone genérico, véu escuro para marca clara (amarelo do BB) |
| Cor: verde com preto, moderno, branco | `globals.css` — acento vira `#45f45c` (14,08:1 sobre o fundo), botão principal verde com texto preto (13,61:1) nos dois temas |
| Fluxo: quanto vou ter por dia/mês/ano | `FluxoDeCaixaNoTempo` — saldo virou a resposta em manchete; entrada e saída são detalhe opcional |
| Caixa em blocos, movimento em linhas, sem texto embaixo | mesmo componente — `Bar` para o caixa, `Line` para entrada/saída, legenda removida |
| Sem sobra de espaço | Fluxo e Balanço saíram da grade de duas colunas; extrato passou a seis linhas por coluna; indicadores em largura total |
| Hover da carteira mais suave | `central-cartoes.module.css` — deslocamento curto com a sombra, 0,32s |
| Toggle mensal/anual | `pricing-toggle.tsx` — verde neon com texto preto; selo de desconto sai do verde escuro |
| Plano de dívidas refeito | `/plano` — data de liberdade em manchete, régua de quitação, dívida da vez com ação, fila com peso, roteiro com filtro por ano |
| Roteiro longo precisa de filtro | `plano/roteiro.tsx` — filtro por ano com a contagem de meses em cada pílula |
| Dívidas: qual, por quê, de onde tiro | `/dividas` — bloco de topo com total, a dívida a atacar e dois caminhos (plano completo, de onde tirar) |
| Mês a mês da projeção mais moderno | `/projecao` — barras espelhadas na mesma escala e saldo do mês como número grande |
| Aproveitar o espaço do Balanço | Painel — indicadores da nota com faixa em cor e próximos passos com efeito em reais por mês |
| Métricas menos cinzentas | `ui/painel.tsx` — o tom tinge fundo e borda do tile, em cerca de vinte telas |
| Tudo na barra lateral, minimizado | `navegacao.tsx` — grupos recolhidos, o da tela atual expandido; "Mais" só no celular |
| Assistente com o porquinho | `tino-dock.tsx` — item de navegação "Seu assistente Tino" com 🐷 |

## Defeitos reais encontrados e corrigidos

1. **Marcação JSX impressa na tela.** Em `/dividas`, duas strings continham
   `` `$<span className="valor-inteiro">{formatarMoeda(...)}</span>` `` dentro de
   template literal — o usuário via o código na interface, no card "Livre em" e
   na linha de cada dívida. Corrigido; varredura não achou outros casos.
2. **Quantidade e total de pendências vindos de lista truncada.** O painel
   contava e somava apenas as quatro capturas carregadas como se fossem a fila
   inteira. Passou a usar `aggregate` sobre todas as pendentes.
3. **Fatura futura escondendo metade do valor.** `confirmado || previsto`
   descartava um dos dois. Agora somam, com o mês marcado quando há previsão.
4. **Orçamento do cartão reaplicando o plano antigo** em meses novos; o valor
   legado da conta só vale para a competência atual e quando não há plano.

## Não entregue — continua pendente

Nada disto foi começado; não há código pela metade no repositório.

1. **Investimentos que se atualizam sozinhos.** Depende de fonte de cotação
   externa. `docs/PESQUISA-OPEN-FINANCE.md` já aponta a Pluggy para saldo
   bancário; para cotação de ativo a alternativa gratuita usual é a brapi.
   A escolha de fornecedor e de custo é do Davi — nenhuma chave foi criada.
2. **Reserva de emergência calculada pela realidade da pessoa.** Hoje
   `/reserva` só filtra metas do tipo reserva (`PainelMetas reserva`). Falta o
   alvo calculado (meses de custo essencial conforme o tipo de renda: CLT,
   autônomo, MEI, e número de dependentes).
3. **Banco na simulação de empréstimo.** `/emprestimos` não tem campo de
   instituição; a comparação entre propostas não guarda de quem é cada uma.
4. **Analise, Simulador e Investimentos no padrão novo.** Continuam no formato
   antigo; o critério está em `docs/PRINCIPIO-DE-TELA.md`.
5. **Verificação em 390px.** A ferramenta de redimensionar janela não muda o
   viewport de verdade nesta máquina, então o celular segue sem prova visual.

## Achado que vale registrar

Quatro componentes montados na mesma página consultam `/api/tino/alertas`
independentemente (`barra-topo`, `aviso-critico`, `tino-acompanha`,
`tino-dock`), o que dá cinco a seis requisições por carregamento. Não quebra
nada, mas é desperdício e uma fonte provável de piscada de estado. A correção
é um provedor único de alertas — mudança estrutural, não feita nesta sessão
para não misturar com o trabalho visual.

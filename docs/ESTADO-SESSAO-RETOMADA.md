# Estado da sessão — pra retomar mesmo se o terminal cair

Escrito em 07/09/2026, ~22:20 (noite), assim que a missão pedida terminou —
o Davi pediu esse arquivo pra conseguir retomar mesmo se o terminal/sessão
fechar. Branch: `skin/acromatico-ios`. Topo no momento deste arquivo:
`6f40009`, tudo pushado, working tree limpo.

## O pedido da noite, na ordem em que chegou

1. Análise minuciosa de 36 screenshots do app concorrente **Calen**
   (`C:\Users\iasdn\Downloads\Screenshots.rar`) → escrever um prompt de
   redesign → **`docs/PROMPT-REDESIGN-CALEN.md`** (leia esse arquivo
   primeiro, é a fonte da verdade do que foi pedido, com todas as
   correções que vieram depois já incorporadas nele).
2. Correções que vieram durante a execução (todas já dentro do prompt
   acima, não precisa caçar em outro lugar): acento vira **verde**, não
   roxo; **mobile é escopo igual ao desktop**, não secundário; **cobrir a
   área MEI** também; **automação em destaque** (painel prioriza fila
   automática, não formulário manual); autônomo até o fim.
3. Pedido paralelo, não de código: pesquisar viabilidade de **Open
   Finance de verdade** (sincronização ao vivo com banco) de graça ou só
   quando o cliente pagar → **`docs/PESQUISA-OPEN-FINANCE.md`** —
   levantamento pronto, Pluggy é o candidato recomendado, **nada foi
   implementado**, decisão de fornecedor/dinheiro é do Davi.

## O que foi feito (4 commits desta rodada, todos verdes e pushados)

- **`d34935a`** — KPI sem halo gradiente (círculo sólido com ícone), busca
  ganhou pista visual "Ctrl K" (e um bug real de dois `BuscarPaginas`
  montados ao mesmo tempo foi corrigido no caminho), notificações viraram
  painel de verdade (abas Todas/Não lidas, marcar lida, limpar tudo — o
  campo `lido` já existia no banco, só não tinha rota usada; foi ligado,
  não inventado). Corrigido também clipping do painel de notificação
  (o `.ios-card` do cabeçalho corta conteúdo mais alto — resolvido com
  portal).
- **`4968d1b`** — Navegação em duas camadas (`lib/navegacao-grupos.ts`):
  núcleo sempre visível (Início/Movimento/Cartões/Perfil) + grupos atrás
  de uma entrada "Mais" (Planejar/Dívidas/Analisar/Ajustes, Loja do MEI
  encaixada no nível 2). As 6 pílulas horizontais antigas saíram.
- **`a799b69`** — Escuro virou padrão (era claro-padrão); acento **verde/
  teal** (matiz 170, deliberadamente diferente do verde-de-dinheiro pra
  não ficar ambíguo — contraste calculado por OKLab/WCAG, não copiado no
  olho); números e gráficos com cor real (positivo/negativo/dado);
  `atencao`/`alerta`/`destaque` continuam neutros (não são valor
  numérico, ficaram fora do escopo da cor).
- **`6f40009`** — Botão flutuante de adicionar no mobile (Anotar →
  Importar → Nova transação manual, nessa ordem de prioridade —
  automação primeiro); formulário de nova transação manual construído do
  zero (a rota da API já existia, a tela não); `/painel` mostra a fila de
  captura automática ANTES do widget de anotar na mão.

Verificado a cada rodada: `tsc --noEmit` limpo, `next build` (51 rotas),
`npm test` 265/265, `npm run test:fumaca` 63/63, e checagem ao vivo no
Chrome (claro/escuro, nav desktop, fluxo de notificação, FAB ponta a
ponta).

## O que NÃO foi feito, registrado, não escondido

Tudo isto está detalhado (com o motivo) em `docs/REDESIGN-EM-CURSO.md`,
seção mais recente:

- **Verificação visual real em ~390px** não foi possível nesta máquina —
  a ferramenta de redimensionar janela não mudava o viewport de verdade
  (confirmado via `window.innerWidth`); o que foi feito foi forçar o DOM
  a simular, não é o mesmo que ver de verdade num celular.
- **Notificação por push/e-mail de verdade** — o motor de alerta já
  existe (`lib/tino/alertas.ts`), mas virar notificação que chega fora do
  app (push/e-mail) é infraestrutura nova, não foi construída.
- **Revisão de copy completa** (jargão → linguagem simples) — só pontual
  onde já mexeu, não foi uma varredura de toda a base de texto.
- **`/regras` e `/configuracoes`** não foram reestruturadas na direção
  Calen — ficaram fora desta rodada.
- **Open Finance ao vivo** — não implementado, é o assunto do
  `docs/PESQUISA-OPEN-FINANCE.md`, decisão do Davi.
- **Fonte arredondada estilo Calen** — não trocada (o Tino usa a fonte do
  sistema desde a skin anterior, decisão deliberada de outra sessão;
  trocar reabriria aquela decisão, não foi feito sem confirmar).

## Pendências que só o Davi decide

1. **Open Finance**: seguir com Pluggy (recomendado) ou não, e como
   estruturar o custo (assinatura paga do Tino cobrindo o custo por
   conexão é a sugestão em `docs/PESQUISA-OPEN-FINANCE.md`).
2. **Cancelamento de assinatura sem "Desfazer"** (pendência mais antiga,
   ainda aberta): botão de cancelar em `/assinatura` mexe direto no
   gateway de pagamento, Desfazer client-side seria enganoso — decidir se
   vale construir reativação de verdade.
3. **`BRIEF-CATEGORIAS-NAO-APLICADO.md`** (pendência mais antiga, ainda
   aberta): prompt de outro produto (catálogo de automação), guardado,
   não aplicado — confirmar se vale pra Prateleira do MEI.
4. Fonte arredondada estilo Calen — quer trocar a fonte do sistema atual
   por algo mais parecido com o Calen, ou manter a decisão anterior?

## Como retomar

```
cd C:\Users\iasdn\Documents\tino
git log --oneline -6   # confirmar 6f40009 no topo de skin/acromatico-ios
npm run db:start       # Postgres local, se não estiver de pé
npm run dev            # localhost:3000, demo@tino.local / demo12345
```

Leia nesta ordem: este arquivo → `docs/PROMPT-REDESIGN-CALEN.md` (pedido
completo) → `docs/REDESIGN-EM-CURSO.md` (detalhe técnico do que foi feito)
→ `docs/PESQUISA-OPEN-FINANCE.md` (se for decidir sobre Open Finance).

Próximo passo natural, se o Davi quiser continuar sem nova instrução: os
itens da seção "O que NÃO foi feito" acima, na ordem em que estão listados.

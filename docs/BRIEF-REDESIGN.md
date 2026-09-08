# Prompt para o Claude — Redesign do Tino (finanças, estilo Apple)

Copie tudo abaixo da linha e cole no Claude Code (ou Claude) dentro do repositório do Tino.

---

## Contexto

Você vai fazer um **redesign visual completo** do Tino, um app web de finanças pessoais em português (Next.js, rodando em `localhost:3000`). O produto já funciona: **não mude regras de negócio, cálculos, rotas, nomes de campos ou chamadas de API.** O trabalho é 100% de interface, design system e mascote.

Estrutura atual que precisa continuar existindo, com os mesmos caminhos:

- **DIA A DIA**: Visão geral, Anotar, Transações, Cartões, Análise
- **DECIDIR**: Orçamento, Dívidas, Metas, Longo prazo
- **FERRAMENTAS**: Plano de pagamento, Parcelamentos, Projeção, Simulador, Empréstimo, Contas fixas, Regras, Importar, Assinatura
- Cabeçalho com "Olá, {nome}", sino de notificações, engrenagem, sair
- Botão flutuante "Falar com o Tino" no canto inferior direito
- Cards existentes na Visão geral: alerta de reserva, Saldo do mês, Mês corrente (Entrou / Saiu / Sobra do mês / Fatura em aberto), Parcelamentos, Próximos meses comprometidos, Reserva de emergência, "O que o Tino faria agora"

## Objetivo

Transformar a aparência atual (escuro genérico, cards chapados, tipografia mole, números em fonte monoespaçada azul) em um produto que pareça **software financeiro profissional com acabamento Apple**: calmo, denso onde precisa, com hierarquia clara, muito espaço em branco, e um mascote discreto e sofisticado.

Referências de acabamento (use como direção de composição e polimento, não copie literalmente):
- Dashboard de gestão moderno do Dribbble (grid de cards com pesos diferentes, um número herói por card, muito respiro): https://dribbble.com/shots/27705845-Modern-Project-Management-Dashboard e https://cdn.dribbble.com/userupload/9136756/file/original-ea589c6893093603aa2108ecad388200.jpg
- Cosmoq (Awwwards): superfícies em vidro, brilhos suaves, microanimações contidas — https://www.awwwards.com/sites/cosmoq-automation-ai-agent-template
- RankinAI (Awwwards): tipografia grande e confiante, seções bem separadas — https://www.awwwards.com/sites/rankinai

Regra Apple: **nada de neon, nada de roxo, nada de gradiente decorativo sem função.** Sofisticação vem de espaçamento, tipografia e contraste, não de efeito.

## Design system (crie antes de tocar nas telas)

Defina tudo em tokens no CSS global e use só tokens semânticos nos componentes. Nada de `text-white`, `bg-[#...]` solto.

**Cor** — base grafite quase preto com camadas sutis, não preto puro:
- Fundo `#0B0B0D`, superfície `#141416`, superfície elevada `#1B1B1F`, borda `rgba(255,255,255,0.08)`
- Texto primário `#F5F5F7`, secundário `#A1A1A6`, terciário `#6E6E73` (paleta Apple)
- Acento único azul `#0A84FF` (só para ação, foco e link — nunca para número neutro)
- Semânticos: positivo `#30D158`, atenção `#FF9F0A`, negativo `#FF453A`
- Versão clara equivalente (fundo `#FBFBFD`, superfície `#FFFFFF`, texto `#1D1D1F`), com o mesmo conjunto de tokens

**Tipografia** — uma família só, geométrica neutra (SF Pro se disponível; senão Inter Tight ou Geist), com números tabulares (`font-variant-numeric: tabular-nums`) em toda a área de valores. **Remova a fonte monoespaçada dos valores.** Escala: número herói 44–56px peso 600 e tracking negativo (-0.02em), título de card 15px peso 590, rótulo 11px maiúsculo com tracking +0.06em na cor terciária, corpo 14px.

**Forma e profundidade** — raio 16px em cards, 12px em campos e botões, 999px em pílulas. Uma sombra só, muito suave (`0 1px 2px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.24)`). Bordas de 1px com opacidade baixa fazem a separação; nada de contorno colorido em card, inclusive nos alertas — o alerta usa faixa lateral de 3px e fundo levemente tingido.

**Espaçamento** — grade de 8px, padding interno de card de 24px, gap de 20px entre cards, largura máxima de conteúdo 1240px centralizada, respiro de 32px do topo.

**Movimento** — só transições de 180–240ms com `cubic-bezier(0.32, 0.72, 0, 1)`. Hover de card levanta 1px e clareia a borda. Números importantes entram com contagem rápida na primeira renderização. Respeite `prefers-reduced-motion`.

## Telas

**Barra lateral** — 260px, fundo levemente mais escuro que o conteúdo, grupos com rótulo pequeno em maiúsculas, item ativo com pílula preenchida sutil (não borda azul), ícones em traço fino de 1.5px e tamanho uniforme de 18px. Estado colapsado só com ícones.

**Cabeçalho** — "Olá, davi" grande (28px, peso 600) e, abaixo, uma linha de resumo em texto secundário com o estado real do mês. Ações à direita como botões circulares fantasma; o badge do sino é um ponto, não um círculo vermelho grande.

**Visão geral** — grid bento de 12 colunas:
1. Faixa de alerta no topo, largura total, discreta, com ação em texto à direita.
2. Card grande de saldo (7 colunas): número herói, explicação em uma linha, e as contas listadas como linhas finas separadas por divisor.
3. Card de mês corrente (5 colunas): quatro métricas em grade 2×2, cada uma com rótulo pequeno, valor tabular e uma variação em relação ao mês anterior; abaixo, um sparkline discreto em vez do bloco vazio de texto.
4. Linha de três cards iguais: Parcelamentos, Próximos meses comprometidos, Reserva de emergência — cada um com número herói, uma barra de progresso fina (4px, arredondada) e uma frase de contexto.
5. "O que o Tino faria agora" como card final de largura total, com o mascote pequeno à esquerda, a recomendação em tipografia maior e o link de plano à direita.
Estados vazios: ilustração mínima em traço, uma frase e um botão primário — nunca só texto cinza centralizado.

**Demais telas** — mesmo esqueleto: título da seção, um parágrafo de contexto no máximo, e o conteúdo em cards do mesmo sistema. Tabelas (Transações, Parcelamentos) com cabeçalho fixo, linhas de 52px, valores alinhados à direita com números tabulares, categoria como pílula discreta e zebra por hover apenas. Formulários (Importar, Regras, Simulador) com campos de 44px de altura, rótulo acima em maiúsculo pequeno, foco com anel azul de 2px.

## Mascote

Redesenhe o Tino: hoje é um robô quadradinho pixelado que destoa. O novo mascote é um **símbolo geométrico simples** — cabeça arredondada em raio contínuo estilo Apple, dois olhos como pontos ou traços finos, sem boca detalhada, construído em traço de peso único e no máximo duas cores (texto primário + azul de acento). Precisa funcionar em 16px na barra lateral.

Entregue como componente React SVG único com props `size`, `mood` (`neutro`, `alerta`, `positivo`) e `animated`. O humor muda apenas a curvatura dos olhos e a cor do ponto de acento, nunca a forma. Animação: piscada ocasional e um leve flutuar; nada além disso. Substitua todas as aparições do mascote antigo, incluindo o ícone da lateral, o alerta e o botão "Falar com o Tino" — que vira uma pílula de vidro fosco com o mascote em 20px e o rótulo em 13px.

## Entrega

1. Primeiro os tokens e os primitivos (Card, Metric, Stat, Button, Pill, Table, EmptyState, Sidebar, PageHeader, TinoMark).
2. Depois refaça a Visão geral inteira com esses primitivos.
3. Depois propague para as outras rotas, sem deixar nenhuma tela no estilo antigo.
4. No fim, rode a build, confirme que não há erro e liste o que mudou por arquivo.

Não invente dados, valores, taxas ou textos de marketing: reaproveite exatamente as strings e os números que as telas já mostram.

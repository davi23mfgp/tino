# Revisão de textos — tarefa C1

Base: commit `3af300e`. Revisor: Claude, branch `claude/revisoes`.
Escopo: `src/app/(app)/**/*.tsx` e `src/components/**/*.tsx`, telas pessoais
(loja e MEI ficaram de fora, como a divisão pede).

Método: extração automática de toda frase de interface com 40 caracteres ou
mais e pelo menos seis palavras — 77 frases em 99 arquivos —, depois leitura
manual de cada uma. **Nenhum componente foi alterado nesta tarefa.**

Conclusão pedida: todas as telas pessoais revisadas; nenhuma proposta muda
regra financeira. Os avisos obrigatórios (não é recomendação de investimento,
não substitui contador, senha não é guardada, previsão não é cobrança)
continuam em todas as propostas — encurtei a volta, não a garantia.

## O que já está bom

A maior parte do texto não precisa de mudança: 48 das 77 frases são curtas,
concretas e sem tom de robô. A rodada anterior de "textos objetivos" (item 21
da lista de 53) pegou bem. As propostas abaixo são o que sobrou.

## Propostas

| Arquivo | Texto atual | Texto proposto | Motivo |
|---|---|---|---|
| `(app)/analise/page.tsx` | Patrimônio líquido é o número que diz se você avançou: dá para terminar o mês com mais dinheiro em conta e mesmo assim mais pobre, se a dívida cresceu mais que o saldo. | Saldo maior não quer dizer que você melhorou: se a dívida cresceu mais, você ficou mais pobre. | 168 caracteres para ensinar um conceito e dar um contraexemplo. O contraexemplo sozinho já ensina, e não exige saber antes o que é patrimônio líquido. |
| `(app)/analise/page.tsx` | Barra para cima é mês que sobrou; para baixo, mês que faltou. O mês atual vai cheio e os anteriores em meio-tom, porque ele ainda não terminou — comparar mês pela metade com mês fechado engana. | Para cima, mês que sobrou; para baixo, mês que faltou. O mês atual vem em cor cheia e os anteriores em meio-tom, porque ele ainda não fechou. | A última oração repete o que "ainda não fechou" já diz. |
| `(app)/analise/page.tsx` | Este parecer lê os seus próprios lançamentos contra faixas de referência de mercado. Não é recomendação de investimento nem substitui contador para questão tributária. | Compara os seus lançamentos com faixas de referência de mercado. Não é recomendação de investimento nem substitui contador. | "lê … contra" soa traduzido do inglês. O aviso fica inteiro. |
| `(app)/capturas/page.tsx` | A ideia de o app anotar sozinho as notificações do banco funciona — mas um site não consegue ler notificações do celular. Quem lê é um aplicativo de automação no seu aparelho, que repassa o texto para cá. Você escolhe quais aplicativos podem ser lidos, e revoga quando quiser. | Um site não lê notificações do celular. Quem lê é um aplicativo de automação no seu aparelho, que repassa o texto para cá. Você escolhe quais aplicativos ele pode ler, e revoga quando quiser. | 276 caracteres, e o primeiro terço é uma concessão ("a ideia funciona") antes do fato. Quem está nessa tela quer o fato. |
| `(app)/capturas/page.tsx` | Não precisa de chave nem de programa nenhum. Cobra um toque por compra — o jeito abaixo captura sozinho, mas só depois de você configurar. | Não precisa de chave nem de programa. Custa um toque por compra; o jeito abaixo é automático, mas exige configurar antes. | "Cobra" num app de finanças lê como cobrança em dinheiro. |
| `(app)/configuracoes/page.tsx` | A autenticação acontece no site do seu banco. O app nunca recebe sua senha — recebe apenas uma permissão de leitura, com prazo definido, que você pode revogar a qualquer momento aqui ou no aplicativo da instituição. | Você entra no site do seu banco. O Tino nunca recebe sua senha: recebe só permissão de leitura, com prazo, que você revoga aqui ou no app do banco. | Mantém as três garantias (senha não passa, só leitura, revogável) com 65 caracteres a menos. Ver também a duplicação apontada abaixo. |
| `(app)/configuracoes/page.tsx` | Modo de demonstração: os dados desta conexão são fictícios, gerados localmente. Para conectar bancos de verdade é preciso contratar um agregador autorizado pelo Banco Central (Pluggy, Belvo ou equivalente) e preencher as credenciais no arquivo | Modo de demonstração: os dados desta conexão são fictícios. Para ligar bancos de verdade, contrate um agregador autorizado pelo Banco Central (Pluggy, Belvo ou equivalente) e preencha as credenciais no arquivo | "gerados localmente" é detalhe de implementação. Os nomes dos fornecedores ficam: quem lê essa tela é quem vai contratar. |
| `(app)/conectar/tela-conectar.tsx` | Falta contratar o agregador de Open Finance. Enquanto isso, você manda o extrato do banco em arquivo e o Tino lê tudo igual — OFX, CSV ou PDF. | Falta contratar o agregador de Open Finance. Enquanto isso, envie o extrato em arquivo: OFX, CSV ou PDF. | "lê tudo igual" é ambíguo — igual a quê? A leitura possível não é a pretendida. |
| `(app)/investir/page.tsx` | Isto é uma conta de dividir, feita sobre o método de outra pessoa, e não uma indicação do que comprar. Escolher onde colocar dinheiro depende do seu prazo, da sua tolerância a perda e da sua situação — coisas que um profissional autorizado avalia com você. | É uma conta de dividir sobre o método de outra pessoa, não indicação do que comprar. Onde colocar dinheiro depende do seu prazo, da sua tolerância a perda e da sua situação — isso quem avalia é um profissional autorizado. | Aviso obrigatório: as três condições e a ressalva continuam inteiras, em 40 caracteres a menos. |
| `(app)/investir/page.tsx` | Divisão de referência publicada pelo Grão, do Grupo Primo. É parâmetro de comparação, não regra: quem mora em capital cara estoura os 60% de necessidades sem estar fazendo nada de errado. Serve para enxergar a distância entre o que você gasta e essa referência. | Divisão de referência publicada pelo Grão, do Grupo Primo. É comparação, não regra: quem mora em capital cara estoura os 60% de necessidades sem errar nada. Serve para ver a distância entre o seu gasto e ela. | "referência" aparece três vezes na mesma frase. |
| `(app)/projecao/page.tsx` | Cenário de tudo seguir como está: receita e despesa pela sua média, mais as parcelas já contratadas. Não prevê imprevisto nem aumento de renda. | Se tudo seguir como está: sua média de receita e despesa, mais as parcelas já contratadas. Não prevê imprevisto nem aumento de renda. | "Cenário de tudo seguir como está" trava na primeira leitura. |
| `(app)/orcamento/page.tsx` | Gastou e não estava no plano | Gasto fora do orçamento | Título sem sujeito: quem gastou? Em cabeçalho de bloco, o rótulo funciona melhor que a frase. |
| `components/nova-meta.tsx` | Planejar não movimenta dinheiro. Confirme o aporte quando acontecer. Lembretes aparecem ao atualizar os alertas do Tino; dias 29–31 se ajustam ao fim do mês. | Planejar não movimenta dinheiro: confirme o aporte quando acontecer. Lembrete marcado para 29, 30 ou 31 cai no último dia dos meses mais curtos. | "aparecem ao atualizar os alertas do Tino" descreve o mecanismo interno. A pessoa precisa saber o efeito, não o gatilho. |
| `components/faixa-conectar.tsx` | Seu mês fecha sozinho quando o banco está conectado | Com o banco conectado, os lançamentos entram sozinhos | O mês não fecha sozinho — os lançamentos é que entram. A frase promete mais do que o produto faz. |
| `components/tino-dock.tsx` | Trabalho com os seus números. Pergunte à vontade: | Pergunte sobre os seus números: | Primeira pessoa seguida de convite é duas falas para uma função. |

## Dois problemas que não são de redação

### 1. O mesmo aviso escrito de dois jeitos

A garantia sobre a senha do banco aparece em `(app)/configuracoes/page.tsx`
(215 caracteres) e em `components/importador.tsx` (260 caracteres), com
palavras diferentes e o mesmo conteúdo. Dois textos com a mesma promessa
divergem na primeira vez que alguém edita um só.

Proposta: uma constante única, usada nas duas telas. É mudança de código,
então fica registrada aqui e não foi feita nesta tarefa.

### 2. Texto que nomeia cor

Três frases explicam a tela pelo nome da cor:

- `components/categorias-comparadas.tsx`: "…por isso a queda aparece em verde."
- `components/central-cartoes.tsx`: "Verde: lançamentos. Amarelo: parcelas previstas…"
- `(app)/simulador/page.tsx`: "A linha cinza é o seu cenário de hoje; a área azul é com as hipóteses."

Dois problemas, e nenhum é de estilo:

1. **Pode já estar errado.** A skin passou por várias trocas de paleta. Um
   texto que diz "área azul" continua dizendo isso depois que a área virou
   verde — e ninguém percebe, porque nada quebra.
2. **Não serve para quem não distingue a cor.** Sem um segundo sinal (forma,
   ícone, rótulo, sinal de mais e menos), a frase não ajuda essa pessoa.

Isso entra também na revisão de acessibilidade (C2), onde proponho a
correção. Aqui fica o registro de que o texto depende de uma cor que ninguém
garante.

## Pergunta de produto

Nenhuma. Todas as propostas são de redação: nenhuma muda cálculo, regra de
negócio, nem retira aviso obrigatório.

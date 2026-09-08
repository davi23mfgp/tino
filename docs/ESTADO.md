# Onde o projeto está

Última atualização: 03/09/2026.

## Resumo

App funcionando de ponta a ponta, rodando local. 251 testes passando, 63
rotas de pé no teste de fumaça, build limpo. Ainda **não publicado** — roda no
computador do Davi e é acessado pelo celular na rede de casa.

## Telas prontas

| Tela | Rota | O que faz |
|---|---|---|
| Visão geral | `/painel` | saldo, mês corrente, mapa de calor, categorias vs. mês passado, parcelas comprometidas, o que fazer agora |
| Análise | `/analise` | parecer contábil: DRE, balanço, 6 indicadores com faixa, prioridades ordenadas |
| Anotar | `/capturas` | fila de conferência e canais de entrada (celular, texto livre) |
| Transações | `/transacoes` | lista com filtros; corrigir categoria cria regra |
| Cartões | `/cartoes` | fatura aberta, limite consumido por parcela futura |
| Parcelamentos | `/parcelamentos` | cada parcela datada, compromisso por mês |
| Orçamento | `/orcamento` | limite por categoria, sugestão pela mediana de 6 meses |
| Dívidas | `/dividas` | CRUD, avalanche x bola de neve lado a lado |
| Plano de pagamento | `/plano` | roteiro mês a mês juntando conta negativa, fatura e dívidas |
| Simulador | `/simulador` | hipóteses empilháveis, comparação com e sem, 12 a 60 meses |
| Projeção | `/projecao` | fluxo de caixa de 12 meses |
| Empréstimo | `/emprestimos` | CET, veredito, tabela de amortização |
| Metas | `/metas` | progresso, aporte necessário, data prevista |
| Contas fixas | `/recorrencias` | alimenta projeção e reserva |
| Regras | `/regras` | o que o Tino aprendeu, reprocessar histórico |
| MEI | `/mei` | limite anual, DAS, lançamento de faturamento e baixa do DAS |
| Balcão | `/loja` | venda, formas de pagamento com taxa e prazo, caixa (Tino.mei) |
| Prateleira | `/loja/estoque` | saldo, custo médio e margem por produto (Tino.mei) |
| Fiado | `/loja/fiado` | quem deve, há quanto tempo, texto de cobrança (Tino.mei) |
| Longo prazo | `/investir` | efeito do corte no caixa, ARCA, divisão da renda, reserva |
| Configurações | `/configuracoes` | contas, refazer conversa inicial, falar com o suporte |
| Assinatura | `/assinatura` | plano, status de pagamento, próxima cobrança, trocar de plano, cancelar |
| Conversa inicial | `/bem-vindo` | 7 perguntas, todas puláveis |

## Telas do dono (admin)

Só abrem para usuário com `admin = true`. Para qualquer outra sessão devolvem
404 — não 403, que confirmaria a existência da rota. Como promover está em
`docs/PAGAMENTO-E-ADMIN.md`.

| Tela | Rota | O que faz |
|---|---|---|
| Visão geral | `/admin` | MRR, inadimplência, churn do mês, base de contas, o que precisa de ação |
| Contas | `/admin/contas` | lista com busca por e-mail ou nome, status de assinatura de cada uma |
| Pagamentos | `/admin/pagamentos` | histórico dos dois gateways na mesma tabela, recusas em bloco próprio |
| Suporte | `/admin/suporte` | fila de chamados abertos, mais antigo primeiro, com marcar resolvido |
| Configurações | `/admin/configuracoes` | preço dos planos, teto do cheque especial e dias de teste, editáveis sem deploy |

## O que falta

Em ordem de valor, na minha leitura:

1. **Publicar.** O código já está pronto para isso: o `build` aplica as
   migrations, o schema tem `directUrl` para o pooler do Postgres gerenciado e
   `docs/PUBLICAR.md` tem o passo a passo. Falta o que só o Davi pode fazer —
   criar as contas no Neon e na Vercel e colar as variáveis. **Depende só do
   Davi**, listado em `docs/PARA-O-DAVI.md`.
1. **Ligar a cobrança.** Mercado Pago e Stripe estão implementados, com webhook
   conferido e idempotente, e rodam sem chave nenhuma (botão desabilitado com o
   motivo na tela). Falta criar as contas, gerar as chaves e colá-las na Vercel
   — **depende só do Davi**, passo a passo em `docs/PAGAMENTO-E-ADMIN.md`.
2. **Telas com teste raso.** `npm run test:fumaca` prova que as 40 checagens
   passam: toda página e toda rota de leitura respondem, rota protegida sem
   sessão continua fechada, e o saldo do painel bate com `/api/panorama`. O que
   falta é comportamento — preencher formulário, salvar, conferir o que a tela
   passa a mostrar — e os métodos de escrita da API, que o script não exercita
   para não sujar o banco.
3. **Faturas em PDF do Davi.** Os três PDFs dele têm senha; o app já pede a
   senha na tela Importar, mas ele ainda não informou. São 31 parcelamentos
   reais que continuam fora do sistema.
4. **Taxa real do cheque especial dele.** O app assume o teto de 8% a.m.
   quando não informada. O teto deixou de ser constante no código: está em
   `/admin/configuracoes`, e muda sem deploy.

## Contas no banco local

- `davi23mfgp@gmail.com` — a conta real do Davi. **Não apague.** Ele pulou a
  conversa inicial, então está quase vazia.
- `demo@tino.local` / `demo12345` — demonstração "Casa da Marina", 6 meses de
  histórico. Recriar com `node scripts/demo.mjs`.

## Pendência de ferramenta

`npm run lint` estava quebrado: o projeto nunca teve arquivo de configuração do
ESLint — o `next lint` gerava um na primeira execução, e esse comando saiu no
Next 16. O script virou `npm run tipos` (`tsc --noEmit`), que é a verificação
que de fato roda.

Para ter ESLint de volta é preciso subir `eslint` e `eslint-config-next` (hoje
em 14.2.3, contra Next 16) e criar um `eslint.config.mjs`. É mexer em
dependência com o build funcionando, então fica para uma decisão sua.

### Nada de visual foi conferido no olho ainda

A linguagem visual do iOS que entrou em `1dea3a6` — fonte, cor de ação, raio,
pauta mais fina — foi verificada por `tsc`, `next build`, os 251 testes e as 63
rotas do teste de fumaça. **Nenhuma tela foi vista rodando.**

Duas tentativas, as duas barradas por ambiente e não por configuração:

- a extensão do Chrome do Claude não conecta nesta máquina;
- o `agent-browser` foi instalado (05/09/2026) e o Chrome que ele baixa não
  sobe aqui: sai com código 0 sem escrever `DevToolsActivePort`, e falha até
  em `chrome.exe --version`, com erro de pipe do crashpad. O contorno que o
  próprio CLI sugere (`--no-sandbox`) é barrado pelo classificador de
  permissão da sessão.

Quem retomar numa máquina com navegador: `npm run db:start`, `npm run dev`, e
olhe antes de mexer em mais cor ou espaçamento. Contraste e token já foram
conferidos no número; o que falta é o julgamento de tela — se o azul do botão
briga com o azul do valor quando os dois aparecem juntos, se a pauta de 1px
ainda se vê, se o raio de 16px na ficha ficou mole perto do 14px do resto.

## Decisões de interface

- **Menu curto.** Só as cinco telas do dia a dia e as quatro decisões ficam à
  mostra. As outras oito vivem atrás de "Mais ferramentas", que abre sozinho
  quando alguém chega numa delas por link. Nenhuma rota foi removida: endereço
  que some quebra link salvo.
- **PF e MEI separados no cadastro.** A primeira pergunta é "Meu dinheiro" ou
  "Meu dinheiro e minha loja". Quem não é MEI nunca vê balcão, prateleira nem
  limite de faturamento. Dá para trocar depois em Configurações, e desligar
  nunca apaga o faturamento já lançado.
- **Barra do polegar muda com o perfil.** Lojista recebe Balcão e Prateleira no
  lugar de Análise e Cartões: no dia de trabalho ele abre o balcão dezenas de
  vezes e a análise nenhuma.
- **Identidade e mascote** estão em `docs/IDENTIDADE.md`.

## Renomeação: o que ainda carrega o nome antigo

O produto virou **Tino** em 30/08/2026 (passou por Bean.counter no caminho,
descartado por ser descritivo demais para registrar como marca). Código, telas,
rotas, documentos, o enum `PapelMensagem`, o banco local, o usuário do banco e
a pasta do Postgres portátil já usam o nome novo.

Continua antigo, e cada um por um motivo:

| O quê | Por quê | Como trocar |
|---|---|---|
| pasta do projeto `Documents\pierre` | caminho aberto em editor e terminal | renomear e reabrir |
| `PIERRE` na migration `20260823223045_inicial` | **não trocar.** Editar migration já aplicada quebra o checksum e o `migrate deploy` passa a falhar em toda máquina, produção inclusive. A migration `20260827120000` já renomeia o valor para `ASSISTENTE`. | nada a fazer |
| a menção à troca de nome no `CLAUDE.md` | é o registro de que a marca mudou de propósito, com data | nada a fazer |

O banco `pierre` antigo continua no cluster, intacto, ao lado do `tino`. É o
caminho de volta se algo tiver ficado para trás na cópia — apague só depois de
alguns dias de uso normal. Há também um dump de antes da troca em
`%LOCALAPPDATA%\Temp\claude\...\scratchpad\pierre.dump`.

## Decisões de produto já tomadas

- **Sem Open Finance.** O Davi disse que não vai usar. O adaptador continua em
  `src/lib/open-finance/` (contrato + Pluggy + sandbox), fora do menu.
- **Sem Open Finance (detalhe achado depois).** O callback em
  `src/app/api/open-finance/callback/route.ts:17` redireciona para `/contas`,
  página que não existe. Como o fluxo nunca é chamado, não quebra nada hoje —
  mas se o adaptador voltar ao menu, isso quebra primeiro.
- **Telegram, PDF e modelo de linguagem: adiados.** O código existe e funciona,
  mas ele pediu foco em cálculo e análise.
- **Visual próprio desde 30/08/2026.** O `globals.css` do Controllares saiu
  inteiro; a identidade atual está em `docs/IDENTIDADE.md`. Positivo é azul, não
  verde — verde já foi rejeitado aqui uma vez, não reintroduza.
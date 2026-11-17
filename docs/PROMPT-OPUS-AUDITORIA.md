# Prompt para o Opus: executar a auditoria de 10/11/2026

Cole o bloco abaixo numa sessão nova do Claude Code, no repositório do Tino,
com o modelo Opus. Ele não depende desta conversa.

---

Você vai corrigir o Tino a partir de uma auditoria já feita. Leia primeiro,
nesta ordem: `CLAUDE.md`, `docs/pesquisas/2026-11-10-auditoria-geral.md` (os
achados, numerados de 1 a 46) e `docs/PLANO-FASES.md`. Leia também o guia do
Next em `node_modules/next/dist/docs/` antes de mexer em rota ou layout: esta
versão não é a que você conhece.

## O que o dono quer

O Davi quer o Tino coeso, limpo e rápido, fácil até para uma pessoa de 65
anos, com cara de app profissional. São dois produtos sobre a mesma base: o
pessoal e o do MEI. Ele lê pouco e com pressa: diga o que fez, o que não fez e
o que falta, sem enfeite.

## Regras que não mudam

- Dinheiro é `Int` em centavos, taxa é `Int` em pontos-base, nunca float.
- Nenhum número inventado: se falta dado, a tela diz que falta.
- Todo indicador vem com a referência.
- Nada entra no extrato sem conferência.
- Português do Brasil em código, comentário, commit e tela. Nenhum travessão
  em lugar nenhum (o teste `testes/sem-travessao.test.ts` falha).
- Comentário explica o porquê.
- **Mudança de desenho não é sua.** Tudo que muda tamanho, cor, posição,
  ordem ou componente visível passa antes pelo canvas e pela escolha do Davi.
  Você faz correção de defeito, texto, velocidade e backend. Em dúvida se é
  desenho, trate como desenho e deixe anotado.
- Não envie nada ao GitHub nem junte no `main` sem o Davi pedir.
- Antes de afirmar que funciona, teste: `npm test`, `npx tsc --noEmit -p .` e
  o navegador (Playwright já está instalado; `npm run db:start` e
  `npm run dev`). Para cada correção de regra, escreva o teste e prove que ele
  falha quando você desfaz a correção.

## Ordem do trabalho

Um commit por item ou grupo pequeno, cada um com a linha correspondente em
`docs/PLANO-FASES.md`. Pare e pergunte nas decisões marcadas como do Davi.

### Lote 1: segurança e dinheiro (achados 1 a 4 e 6 a 12)

Para cada um: reproduza com um teste que falha, corrija, veja o teste passar.

1. `api/loja/fiado/route.ts`: `vendaId` obrigatório e validado.
2. `api/categorias/[id]/route.ts`: `moverPara` tem de ser categoria do mesmo
   lar e diferente da que está sendo excluída.
3. `api/transacoes/[id]/route.ts`: transferência muda os dois lados na mesma
   transação do banco, ou recusa valor, data e conta com mensagem clara.
4. `api/push/route.ts`: aceitar só endereço https dos serviços de notificação
   conhecidos (FCM, Mozilla, Apple, Windows) e nunca tomar a inscrição de
   outro usuário.
5. Cadastro e Google: confirme o defeito lendo `podeLigarGoogleSozinho` antes
   de mexer. Se confirmado, proponha a correção ao Davi (confirmar e-mail muda
   o cadastro, e isso é fluxo visível): não implemente sem resposta.
6. Itens 7 a 12: confirme cada um lendo o código. Corrija os confirmados.
   Troque `z.coerce` em `lib/validar.ts` por validação que recusa vazio e
   nulo, rodando a suíte inteira depois, porque todas as rotas usam.
7. Índices e únicos no banco (achados 12 e 35) numa migração só, depois de
   conferir que os dados da conta demo não violam os únicos.

### Lote 2: velocidade (achados 31 a 35)

1. Meça antes: para cada tela do menu, o tempo até o primeiro conteúdo útil
   num build de produção local (`npm run build` e `npm start`), celular
   simulado. Guarde a tabela em `docs/pesquisas/`.
2. Leve os dados iniciais para o servidor nas telas mais usadas, nesta ordem:
   Extrato, Meu mês, Cartões, Anotar, Balcão, Contas a pagar. A tela tem de
   ficar idêntica; só some o "Carregando…".
3. Carregue os gráficos sob demanda.
4. Tire a trava do banco das leituras em `lib/api.ts`, mantendo o limite nas
   escritas e nas rotas caras.
5. Meça depois e registre o antes e o depois. Se não melhorou, diga.
6. Não quebre os arquivos gigantes só por quebrar: divida quando for mexer
   neles por outro motivo.

### Lote 3: coerência sem desenho

1. Acentos nas descrições do menu (achado 23).
2. Telas órfãs (achado 21): redirecione `/orcamento` para `/meu-mes`, ligue
   `/loja/maquininha` em Contas a pagar ou Finanças da loja (escolha onde o
   dono procuraria e diga por quê), apague `/parcelamentos` se nada apontar
   para ela.
3. Rótulos de campo que faltam (achado 30).
4. Palavras de contador (achado 28): proponha a troca numa tabela (antes,
   depois, arquivo) e aplique só depois do aceite do Davi, porque é o
   vocabulário do produto.
5. O aviso da política (achado 27) e os nomes repetidos (achados 18, 19 e 24)
   dependem do canvas: não mexa.

### Lote 4: site e medição (achados 14 a 16, 42, 44 a 46)

1. SEO técnico: endereço canônico, `robots`, mapa do site, imagem de
   compartilhamento 1200 por 630, dados estruturados de aplicativo e de
   organização, `noindex` e título próprio em login e cadastro.
2. Cache das páginas públicas: resolva o `no-store` de `proxy.ts` sem
   enfraquecer a política de segurança de conteúdo. Explique a escolha.
3. Medição própria, sem cookie de terceiros, gravada no banco: visita, clique
   no botão de começar, cadastro iniciado, cadastro criado, roteiro terminado
   (`/montar`), assinatura paga. Uma tela simples no admin com o funil.
4. Tire "DRE, balanço e parecer" da lista do plano pessoal (achado 42),
   trocando por texto que o Termo sustenta.
5. Números fixos do site (achado 46): venha da conta de demonstração ou saia.
6. Rodapé com razão social, CNPJ e contato (os dados estão nos Termos).
7. Cadastro (achado 44): só diga por que o botão está desligado. Tirar campos
   é mudança de fluxo: proponha ao Davi.
8. Texto da primeira dobra, botão fixo no celular e prova social são do
   canvas (passo 69): não mexa.

### Lote 5: o que a auditoria não leu

Revise as 88 rotas que ficaram de fora (lista no fim da auditoria) com o mesmo
critério do Lote 1: sessão, dono do registro, validação de dinheiro, limite,
transação onde duas escritas têm de valer juntas. Acrescente os achados ao
documento da auditoria antes de corrigir.

## O que o Davi já decidiu (10/11/2026)

- **Sem reembolso proporcional depois dos 7 dias.** O Termo já foi corrigido.
- **Mercado Pago primeiro.** O código está em `lib/pagamento/mercadopago.ts`.
  Prepare o caminho inteiro (assinar, webhook, cancelar, excluir a conta
  cancela no provedor, achado 8) e teste com o ambiente de teste do Mercado
  Pago se houver credencial de teste; sem ela, diga exatamente o que falta. As
  chaves de produção o Davi coloca na Vercel: nunca peça que ele cole chave no
  chat. Stripe fica para depois.
- **Logos de banco reais no site: pode usar.** Não troque.
- **Tamanho da letra: você projeta.** É o passo 62 do canvas, antes de
  qualquer outro passo visual, porque muda todas as telas. Entregue três
  escalas (a de hoje e duas novas) aplicadas às mesmas quatro telas (Início,
  Extrato, Balcão, barra de baixo do celular), em 390 e 1280, tema escuro e
  claro. Critério: nenhum texto útil abaixo de 14 px no celular, rótulo da
  barra de baixo legível sem óculos, alvo de toque de 44 px, e o Início ainda
  cabendo o essencial na primeira tela. Diga em quem se inspirou (Nubank,
  Apple, o modo simples da própria loja). O código só muda depois da escolha
  do Davi, e de uma vez, pelo token `--escala-letra` e pelos tamanhos fixos
  (`text-xs`, `text-sm`, `text-[11px]`, px em CSS module) que hoje o ignoram.

## Ainda é do Davi (pergunte, não decida)

- Confirmação de e-mail no cadastro (achado 6).
- Frase de posicionamento do site (passo 69).

## Como entregar

Ao fim de cada lote, uma mensagem curta: o que foi corrigido (com o número do
achado), o que você confirmou que não era defeito, o que ficou esperando o
Davi, e o resultado de `npm test`. Se um teste falhar, diga qual e por quê
antes de qualquer outra coisa. Atualize a auditoria marcando cada achado como
corrigido, descartado ou esperando.

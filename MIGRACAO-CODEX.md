> Atualização de 09/09/2026: veja [continuidade do Tino](docs/CONTINUAR-NO-OUTRO-NOTEBOOK.md). A rodada atual remodelou navegação e telas principais, substituiu mockups por capturas reais e corrigiu a migração fiscal. As seções antigas abaixo são histórico.

# Migração para o Codex — tudo que os projetos `tino` e `fixa` acumularam

Escrito em 08/09/2026 para o Davi levar o contexto inteiro daqui (Claude Code)
para o Codex sem ter que redescobrir nada.

**Como usar:** leia as partes 1 e 2 antes de qualquer coisa — são as que mais
economizam tempo. As partes 3 e 4 são cada projeto. A parte 5 são as armadilhas
do ambiente, que custaram horas para descobrir. A parte 7 é o que fazer a
seguir.

O Codex lê `AGENTS.md` na raiz do repositório automaticamente. Os dois repos
têm um, apontando para cá.

---

## PARTE 1 — Como o Davi trabalha (a parte mais importante)

Isto não é preferência de estilo: é o que evita retrabalho e bronca.

### As cinco regras que ele já cobrou explicitamente

1. **Autonomia é sobre COMO, nunca sobre O QUÊ.**
   "Seja autônomo, não pergunte" significa: não me consulte sobre fonte,
   paleta, biblioteca, commit, branch, push. **Não** significa escolher o que
   fazer nem ampliar escopo. Ele já mandou desfazer uma limpeza de CSS que
   ninguém pediu ("pare com tudo isso", "desfaça tudo"). Varredura e
   refatoração não pedidas ele lê como bagunça.
   Fique no que foi pedido ou no que o documento de estado do dia lista como
   próximo passo. Quando um item oferecer duas saídas ("criar X ou apagar Y"),
   prefira a que **adiciona** e destrava. Apagar em massa: só com pedido
   explícito.

2. **Push automático.** Depois que o commit fica bom (tipos e testes verdes),
   `git push` direto, sem perguntar. Vale para push normal — force-push,
   rebase e apagar branch continuam pedindo confirmação.

3. **Registrar estado no repositório, na hora.** As sessões dele caem:
   terminal fechado, máquina sem memória, troca de computador (aconteceu
   várias vezes só nesta semana). Decisão de produto ou de visual entra num
   documento do repo **no momento em que é tomada**, não no fim. Commit só de
   documentação é esperado e bem-vindo. Pendência vai escrita **com o motivo**,
   não só o item.
   - No tino: `docs/REDESIGN-EM-CURSO.md`, `docs/ESTADO.md`, `docs/DECISOES.md`.
   - No fixa: `PROGRESS.md` (é a fonte da verdade de lá).

4. **O que depende dele fica para o final.** Não pare no meio pedindo
   aprovação. Implemente tudo que dá e, no fim da resposta, liste só o que ele
   precisa decidir.

5. **Não afirmar sem provar.** Ele prefere ver o defeito nomeado a ver
   promessa. "Passou nos testes" não é o mesmo que "funciona": ele já disse
   "ainda tem muita parte técnica e não está idêntico" sobre uma rodada que
   passou em 100% dos testes automáticos. Teste verde não prova parecença
   visual nem comportamento real.

### Como ele escreve

Mensagens curtas, com pressa, sem acento às vezes ("nao", "voce", "faca").
Leia a intenção, não a ortografia. Ele manda print quando algo está errado — o
print é o relatório de bug.

### O que ele valoriza no código

Estes dois repos têm uma característica incomum e **deliberada**: comentários
que explicam **por que**, incluindo o que foi tentado e falhou. Exemplo real do
tino:

> `w-auto` sozinho fazia o select medir pela OPÇÃO mais longa da lista: ele
> chegava a 1079px numa linha de 1095px e empurrava o valor para uma terceira
> linha. Medido ao vivo, não suposto.

Mantenha esse padrão. Comentário que só repete o código não vale nada; o que
registra a medição e a alternativa descartada evita que a próxima sessão refaça
o erro.

**Idioma:** tudo em português — variável, função, arquivo, comentário, commit.
`formatarMoeda`, `saldoCentavos`, `montarPanorama`. Não misture inglês.

**Dinheiro sempre em centavos, `Int`.** Nunca float.

---

## PARTE 2 — O método que deu resultado

### Verificar de verdade, não presumir

O que funcionou repetidamente:

- **Medir no DOM em vez de olhar screenshot.** A captura desta máquina sai com
  escala aproximada de 1,42 e engana. Dois bugs reais apareceram só na medição
  com `getBoundingClientRect()`:
  - linhas de `/transacoes` quebrando em três alturas (146px em vez de 60px)
    porque o envoltório do `select` esticava para 877px;
  - barra de categoria vazando sobre o texto de baixo porque um `<span>`
    inline ignora `height`.

  Nenhum dos dois apareceria em teste automático.
- **`curl` com sessão real** contra o servidor de pé, para provar que a rota
  responde e com que conteúdo.
- **Ler o CSS compilado**, não só o fonte, quando a dúvida é "isso chegou no
  navegador?".
- **Conferir o que um script destrutivo apaga antes de rodar em produção.**
  Antes de semear o banco de produção, li o `limpar()` e confirmei o `where`.

### Commits pequenos, verdes, com o porquê na mensagem

Ciclo: mudança → `npm run tipos` → `npm test` → `npx next build` → commit →
push. As mensagens de commit destes repos são longas de propósito: contam o que
estava errado, o que foi medido e o que foi decidido. É o registro que
sobrevive à queda da sessão.

### Quando delegar

Tarefa grande e mecânica (varrer N arquivos aplicando o mesmo padrão) vale
subagente. Decisão de design, merge conflituoso e qualquer coisa que exija
julgamento de produto: faça no fio principal — o subagente começa sem contexto
e redescobre tudo, o que sai caro e pior.

---

## PARTE 3 — Projeto TINO

Contador pessoal para pessoa física e MEI com loja.

### Onde está

| | |
|---|---|
| Repositório | `github.com/davi23mfgp/tino` |
| Local | `C:\Users\iasdn\Documents\tino` |
| Tronco | `main` (desde o merge de 08/09/2026) |
| Produção | `https://tino-kappa.vercel.app` |
| Projeto Vercel | `davi-pereiras-projects-0e1004d7/tino` |

### Pilha

Next.js 16.3.2 (App Router, Turbopack) · React · TypeScript · Tailwind CSS v3
(`tailwind.config.ts`) · Prisma 5.22 · PostgreSQL · lucide-react · shadcn/ui
(componentes já copiados em `src/components/ui/`).

**Atenção:** um brief que o Davi colou descrevia TanStack Start + Vite +
Tailwind v4. Não é a stack deste projeto. Aplique o *design* pedido na stack
que existe; não reescreva o app.

### Ambiente local (não precisa de Docker)

```
npm run db:start        # Postgres portátil em %LOCALAPPDATA%\tino-pg, porta 5432
npm run dev             # :3000
npm run tipos           # tsc --noEmit
npm test                # 298 testes (node --test)
npx next build          # build de produção, ~55 rotas
npm run test:fumaca     # 63 rotas contra servidor de pé; precisa EMAIL_FUMACA/SENHA_FUMACA
```

O `.env` local já aponta para o Postgres portátil.

### Banco de produção

Neon Postgres, ligado ao projeto na Vercel. As migrations rodam sozinhas no
build (`prisma migrate deploy` faz parte do `npm run build`).

### Conta de demonstração

`demo@tino.local` / `demo12345` — existe no local **e em produção** (semeada em
08/09/2026). Dados fictícios determinísticos: sobra R$ 5.003,00, saldo
R$ 15.967,00, cartões, dívidas, metas, loja.

### Como semear a demonstração de novo em produção

As variáveis da Vercel estão marcadas como **Sensitive**: o valor não pode ser
lido de volta, nem por `vercel env pull` nem pelo painel. Não existe como pegar
a `DATABASE_URL` e rodar o seed de fora. A saída montada foi pendurar o seed no
build, atrás de uma chave:

```
vercel env add SEMEAR_DEMO production    # valor: 1
git commit --allow-empty -m "semear" && git push
# conferir no log do build: "Conta de demonstração criada."
vercel env rm SEMEAR_DEMO production
```

`scripts/semear-se-pedido.mjs` é inerte sem a chave. O `limpar()` do
`scripts/demo.mjs` apaga **somente** o lar de `demo@tino.local` — conta real
não é tocada.

### O que existe hoje

- **Pessoal:** painel com projeção de caixa, transações com edição no lugar,
  cartões e parcelas, dívidas com plano de pagamento (avalanche × bola de
  neve), metas, orçamento, reserva, simulador, projeção de 12 meses, análise.
- **Captura automática:** import de OFX/CSV/PDF de fatura, linguagem natural
  ("uber 18"), Telegram, compartilhamento do celular, regras que aprendem.
- **Open Finance:** camada de provedor pronta (`src/lib/open-finance/`), tela
  `/conectar`, e um modo "ainda não configurado" honesto que manda para o
  import de arquivo. Pluggy é o candidato; **nenhuma chave criada** — é decisão
  de dinheiro do Davi.
- **Loja do MEI:** balcão, prateleira com margem, fiado, contas a pagar,
  finanças/DRE, MEI e DAS, nota fiscal (adaptador Focus NFe pronto), e o papel
  `FUNCIONARIO_LOJA` com acesso restrito.
- **Admin:** `/admin` com contas, pagamentos, suporte (chamados) e parâmetros
  (preço e dias de teste editáveis sem deploy).
- **Assinatura:** Stripe e Mercado Pago, os dois opcionais e independentes.
- **Vitrine:** landing em `src/app/(site)/` com design próprio escopado em
  `.vitrine` (tokens oklch, Space Grotesk + Manrope, 10 seções, 5 celulares
  desenhados em HTML/CSS, mascote porquinho 3D).

### Regras de visual já decididas (não reabrir sem pedido)

- Skin do app: escura por padrão, direção "Calen". O spec com números exatos
  está em `docs/SPEC-CALEN-PRECISO.md` — tamanho de fonte, espaçamento,
  anatomia tela a tela. **Leia antes de mexer em UI.**
- Navegação em duas camadas: núcleo sempre visível + "Mais". Fonte única:
  `src/lib/navegacao-grupos.ts`.
- Alvo de toque mínimo: 44px.
- O mascote é um **porquinho/cofrinho**. `public/mascote/tino.png` é o render
  3D; `src/components/tino-mascote.tsx` é o vetor com expressões (o app usa o
  vetor porque a expressão muda com o estado das contas).
- Cor de ação: verde/teal. O Fixa usa ocre — **pergunte antes de unificar**.

### Histórico de reversões (por que não mudar cor por conta própria)

A base já passou por **cinco** mudanças de direção visual: iOS claro azul →
preto com vidro → acromático chroma zero → direção Calen escura → landing
própria. Está registrado em `docs/REDESIGN-EM-CURSO.md` com o aviso "não deve
se repetir". Mudança de skin inteira só com pedido explícito.

### Pendências que dependem do Davi

1. Poses do mascote 3D (atento, crítico, comemorando) — o app usa o vetor
   porque um PNG só sabe uma pose.
2. Alternador "Pessoal ↔ Empresa" que a `main` antiga tinha e a navegação nova
   não reconstruiu. A segurança foi preservada (funcionário não vê nada
   pessoal); a UX do alternador, não.
3. Cor: verde no tino × ocre no fixa.
4. Open Finance: contratar Pluggy ou não.
5. Comparação lado a lado com as 36 telas do Calen (PARTE 6 do spec) — a pasta
   de referência era temporária e provavelmente já não existe.

---

## PARTE 4 — Projeto FIXA

App de estudo com repetição espaçada + extensão de Chrome.

### Onde está

| | |
|---|---|
| Repositório | `github.com/davi23mfgp/fixa` |
| Local | `C:\Users\iasdn\Documents\fixa` |
| Branch de trabalho | `visual/tipografia-e-curva-da-memoria` (topo `f47a39a`) |
| Fonte da verdade | `PROGRESS.md` na raiz |

### Ambiente

```
npm run dev:porta       # :3100  <- use este
npm run dev             # :80    <- cuidado, porta 80
npm test                # vitest, 427+ testes
```

### DOIS BLOQUEIOS QUE PRECISAM DE DECISÃO ANTES DE CODAR

**1. Duas linhas divergentes que não se contêm.**

- `auto/fila` — 33 commits exclusivos. Tem cronômetro global, sessões
  anteriores com busca, gravação de aula ao vivo, atalhos rápidos, sidebar em 3
  grupos, paleta **terracota/creme**.
- `visual/tipografia-e-curva-da-memoria` — 23+ commits exclusivos. Tem a
  transcrição da extensão, Literata + Manrope, `CurvaMemoria`, o redesign do
  mockup, paleta **amarelo/turquesa**, e todo o trabalho recente.

As duas construíram **funcionalidade nova e incompatível ao mesmo tempo, sem se
falar**. Um `cherry-pick` foi tentado e abortado (`git reset --hard`, sem
perda): as duas reescreveram a mesma sidebar de formas irreconciliáveis, com
até nomes diferentes para a mesma ideia (`CronometroTopo` × `CronometroDoTopo`).

**Qual vira tronco é decisão do Davi, não técnica.** Não faça o merge sozinho.
Enquanto não sair, trabalhe só onde não colide.

**2. Banco em drift.** O Postgres (Neon, compartilhado com a `auto/fila`) tem 2
migrations aplicadas direto (`quadro_do_aluno`, `cor_do_topico`) que não existem
nos arquivos desta branch. `prisma migrate dev` recusa; só sairia com
`migrate reset`, que apaga o banco — **não foi feito**. Isso trava qualquer
campo ou tabela nova. É o mesmo problema do item 1 visto de outro ângulo.

### O que já foi feito (resumo; o detalhe está no `PROGRESS.md`)

Ingestão unificada de PDF/DOCX/PPTX/OCR, recálculo automático que nomeia o
tópico e o dia, onboarding por objetivo com campo de banca, modo foco com ruído
(`RuidoFoco.tsx`), conquistas sem punição, extensão com print de tela,
pareamento por token (resolveu "a extensão sempre grava como anônimo" reusando
a tabela `Acesso`, sem tabela nova), drag-and-drop na biblioteca, páginas
`/chat`, `/aula` e `/criar`, calendário reconstruído.

### Pendências do fixa

- Decisão de tronco (item 1) — bloqueia o resto.
- Drift de banco (item 2) — bloqueia peso de tópico do edital e registro de
  estudo externo.
- "Tutor particular" como página própria (hoje só existe como gaveta).
- Varredura de cerca de 123 chamadas soltas de `botao` para os componentes
  nomeados em `src/components/Base.tsx` — precisa de QA visual.
- Whisper local e push web: trabalho grande, não começado.

---

## PARTE 5 — Armadilhas do ambiente (custaram horas)

1. **Prisma Client fica velho depois de merge.** Se o `schema.prisma` mudou,
   rode `npx prisma generate` **antes** do `tsc` — senão aparecem 16 erros de
   tipo que parecem bug de código e não são.

2. **Vercel: valor de variável Sensitive não volta.** Nem por CLI nem pelo
   painel. Se precisar rodar algo com a `DATABASE_URL` de produção, pendure no
   build (veja a parte 3).

3. **`vercel env pull` não avisa direito:** escreve `[SENSITIVE]` como se fosse
   valor. Confira o conteúdo antes de usar.

4. **Login do Vercel CLI funciona por código de dispositivo:**
   `vercel login --github` imprime uma URL e um código, e o dono autoriza no
   navegador. Ninguém precisa digitar senha.

5. **Chrome nesta máquina é traiçoeiro para captura:** janela minimizada
   reporta viewport 0×0 e a captura falha; `resize_window` aceita o comando e
   **não muda o viewport de verdade**; página pesada estoura o tempo de
   injeção. Por isso: **meça no DOM**. Verificação em 390px real nunca foi
   possível aqui.

6. **`display: inline` ignora `height` e `overflow`.** Um `<span>` estilizado
   como barra some ou vaza sobre a linha de baixo. Já mordeu duas vezes.

7. **`.ios-card` tem `overflow: hidden`** — qualquer painel `absolute` mais
   alto que o cartão é cortado. Menu, dropdown e painel de notificação precisam
   de portal (`createPortal`) e posição `fixed` com altura limitada a partir da
   janela.

8. **`next/font` com eixo variável:** se você declara `axes`, **não** pode
   declarar `weight`. O build falha com uma mensagem que não diz isso
   claramente.

9. **Alerta gravado com `createMany({ skipDuplicates })` congela o texto.**
   Reescrever a frase nunca chega em quem já tem o aviso aberto. Virou `upsert`
   por chave.

10. **Git no Windows:** avisos de LF/CRLF em todo commit são normais, ignore.

11. **Nesta máquina roda mais de uma sessão de agente ao mesmo tempo.**
    Arquivos aparecem modificados sem você ter tocado neles. Use `git add` de
    arquivo específico, nunca `git add -A` cego.

---

## PARTE 6 — Ferramentas e o equivalente no Codex

| Aqui | Para quê | No Codex |
|---|---|---|
| `AGENTS.md` / `CLAUDE.md` | regras permanentes do repo | `AGENTS.md` (nativo) |
| Memória do agente | quem é o Davi, estado dos projetos | **este arquivo** + `AGENTS.md` |
| Skill `frontend-design` | direção visual não-genérica | prompt manual, veja abaixo |
| Skill `shadcn` | componentes | `npx shadcn@latest add` direto |
| Claude in Chrome | medir DOM, ver a página | Playwright ou DevTools |
| Vercel CLI | deploy, variáveis, logs | igual, é CLI |
| Subagentes | varredura mecânica | agentes do Codex |

### O que substitui a skill de design

O valor dela era forçar três coisas, que dá para pedir direto:

1. Definir tokens (cor, tipo, layout, elemento-assinatura) **antes** de escrever
   código.
2. Fugir do padrão genérico de IA: creme com serifa e terracota; preto com
   verde ácido; jornal com fio de cabelo. Se a direção não foi pedida, não caia
   nesses.
3. Gastar a ousadia **em um lugar só** e manter o resto disciplinado.

### Hooks que existiam aqui

`SessionEnd` gravava `docs/ESTADO-SESSAO.md` (branch, último commit, arquivos
sujos). Útil, mas **não substitui** registrar decisão: guarda retrato mecânico,
não motivo.

---

## PARTE 7 — O que fazer a seguir

### Tino, em ordem

1. Confirmar visualmente a landing e a skin nova (nunca foi possível capturar
   aqui). É o que falta para fechar o redesign.
2. Ligar as outras poses do mascote quando os PNGs existirem.
3. Decidir o alternador Pessoal ↔ Empresa.
4. Decidir a cor (verde × ocre) entre os dois apps.
5. Open Finance: contratar Pluggy ou manter o modo honesto de import.

### Fixa, em ordem

1. **Decidir o tronco.** Nada relevante anda antes disso.
2. Resolver o drift de banco (depende do item 1).
3. Tutor particular como página própria.
4. Varredura dos `botao` soltos, com QA visual.

### Higiene ao chegar no Codex

- Rode `npm install`, `npx prisma generate`, `npm run tipos` e `npm test` nos
  dois repos antes de qualquer mudança, para saber o que já estava quebrado.
- Leia `PROGRESS.md` (fixa) e `docs/REDESIGN-EM-CURSO.md` + `docs/ESTADO.md`
  (tino) antes de planejar.
- No tino, confira `git status`: pode haver trabalho de outra sessão parado.

# Plano — as features do "Meu Assessor" dentro do Tino

**Pedido:** 14/09/2026, Davi mandou 15 telas do `meuassessor.com` e disse
"planeje essas features para adicionar ao sistema".

**O que é o Meu Assessor:** uma equipe de assessores com nome e cara (Martin,
gerente financeiro; Rita, assistente fiscal; Sofi, agenda; Theo; Luna) que
mora no WhatsApp. A pessoa manda áudio ou texto do jeito que vier na cabeça e
a equipe resolve: cobra, emite nota, agenda, avisa, organiza gasto, monta
painel.

Este documento é plano, não código. Nada aqui foi construído ainda.

---

## 1. O que o Tino já tem (e por isso não precisa ser planejado de novo)

O levantamento abaixo foi feito lendo o repositório, não de memória:

| Peça | Onde está | Estado |
|---|---|---|
| WhatsApp Cloud API oficial | `src/app/api/whatsapp/webhook/`, `src/lib/captura/whatsapp.ts` | **Funciona**: recebe mensagem, baixa mídia, responde |
| Telegram | `src/app/api/telegram/` | Funciona |
| Assessor com duas camadas | `src/lib/tino/chat.ts` + `modelo.ts` | Regras primeiro, modelo só no que a regra não cobre |
| Captura de notificação do banco | `src/lib/captura/` | Vira "compra para conferir" antes de entrar no saldo |
| Categorização por regra | `src/app/api/regras/` | Funciona |
| Avisos proativos | `src/lib/tino/alertas.ts` (vigias) | Funciona **dentro do app**; não sai para o WhatsApp |
| Parcelas e compromisso futuro | `src/lib/parcelamentos.ts` | Funciona, com projeção mês a mês |
| Nota fiscal | `src/lib/nota-fiscal/` + adapter Focus NFe | **Escrito, provedor não contratado** |
| Gateway de pagamento | `src/lib/pagamento/` (Mercado Pago, Stripe) | Usado só para **assinatura do Tino**, não para cobrar cliente do usuário |
| Open Finance | `src/lib/open-finance/` (Pluggy) | Adapter pronto, contrato não fechado |
| Linguagem natural | `src/lib/tino/lingua-natural.ts` | Lê dívida e meta; pré-preenche formulário |

**Conclusão que muda o plano:** a espinha já existe. O que o Meu Assessor tem
e o Tino não é, quase tudo, **o caminho de volta** — o Tino responde quando
perguntado e avisa dentro do app; o Meu Assessor **chega antes**, no WhatsApp,
e **executa** (cobra, emite, agenda).

---

## 2. As features, em ondas

Ordenadas por "quanto valor entrega dividido por quanto custa para existir".
Cada onda é entregável sozinha.

### Onda 1 — o assessor sai do app e vai até a pessoa
*Nenhum fornecedor novo. Nenhuma decisão de dinheiro. Só código.*

**1.1 Vigia que fala no WhatsApp.** Os alertas de `tino/alertas.ts` já sabem
o que dizer; hoje morrem na tela. Passam a sair pelo canal que a pessoa
escolher, no horário que ela escolher.
- Depende de: template de mensagem aprovado pela Meta (mensagem iniciada pela
  empresa fora da janela de 24h é cobrada e precisa de template).
- Custo real: ~R$ 0,08 a R$ 0,25 por mensagem de utilidade, por pessoa por
  mês. **Decisão do Davi:** entra no plano pago ou tem teto por mês?
- Risco: virar spam. A `chave` estável dos alertas já resolve repetição; falta
  um limite diário e um "não me avise mais disso".

**1.2 Anotar por áudio.** Hoje o webhook aceita texto e PDF. Áudio ("paguei
7,50 no...") vira transcrição e cai no mesmo caminho de captura que já existe.
- Depende de: transcrição. A `ANTHROPIC_API_KEY` já está no `.env.example`.
- Tamanho: pequeno — é um `case` a mais no webhook.

**1.3 Resumo do dia / da fatura sem pedir.** "Sua fatura vence hoje, quer o
relatório?" é o vigia 1.1 com uma ação anexada. Reaproveita `montarPanorama`.

**1.4 Achar documento por conversa.** "Você acha o comprovante do aluguel?" —
busca nos anexos que o app já guarda. Precisa de índice por descrição e data.

### Onda 2 — painel que a pessoa pede com palavras
*Sem fornecedor novo. Usa o modelo que já está ligado.*

**2.1 "Quero um gráfico dos meus gastos por categoria" → painel montado.**
O Tino já tem os dados e os componentes de gráfico. O que falta é traduzir
pedido em **consulta estruturada** e montar o painel a partir dela.
- Como fazer sem risco: o modelo **nunca** escreve SQL nem número. Ele
  escolhe entre consultas que já existem (`panorama`, `balanco`, `fluxo`) e
  preenche parâmetros (período, categorias, tipo de gráfico). O número sai do
  banco, como hoje.
- **Salvar painel**: tabela nova `PainelSalvo` (larId, nome, consulta em
  JSON). Mudança pequena de schema.

### Onda 3 — cobrar e emitir (o MEI vira o assunto)
*Aqui entra dinheiro de terceiro. É a onda que muda o risco do produto.*

**3.1 Link de cobrança por mensagem.** "Cobra R$ 850 do João pela consultoria
de agosto" → link pronto, parcelável, com status de pagamento.
- **O que existe:** `src/lib/pagamento/` já fala Mercado Pago e Stripe.
- **O que muda, e é grave:** hoje o gateway cobra **pelo Tino**. Cobrar pelo
  cliente do usuário é outra figura — o dinheiro é de terceiro. Ou o usuário
  conecta a **conta dele** (Mercado Pago OAuth / Stripe Connect), e o Tino só
  monta a cobrança, ou o Tino vira intermediário de pagamento, com obrigação
  regulatória própria. **Recomendo a primeira**, e é decisão do Davi.
- Cobrança recorrente ("R$ 5.000 todo dia 10") é o mesmo caminho com
  assinatura no gateway; `recorrencias` já existe como conceito no app.

**3.2 NFS-e emitida na conversa.** O adapter do Focus NFe **já está escrito**
e o `criarEmissor()` recusa sandbox em produção de propósito.
- Falta: contratar o provedor e cadastrar certificado digital A1 do usuário.
- Cuidado registrado no código e que vale repetir: NFS-e é municipal, cada
  prefeitura tem seu padrão; o Focus cobre a maioria, não todas.
- **Decisão do Davi:** custo por nota e em que plano isso entra.

**3.3 Antecipação / "cai em dois dias úteis".** Isso **não é feature de
software** — é produto financeiro, com funding e risco de crédito. O Meu
Assessor consegue porque o adquirente dele oferece. Para o Tino, o caminho
honesto é **mostrar** a data de liquidação que o gateway já informa, e não
prometer antecipação que não temos como fazer.

### Onda 4 — agenda
*Fornecedor novo: Google. Custo zero, mas OAuth e escopo sensível.*

**4.1 "Marca o dentista quinta às três" → Google Agenda + lembrete.**
**4.2 Reunião → link do Meet, convida, lembra, manda a ata.**
- Depende de: OAuth do Google com escopo de calendário. É escopo sensível: a
  Google exige verificação do app, com prazo de semanas.
- **Pergunta de produto antes de codar:** agenda é assunto do Tino? O produto
  é "contador pessoal". Calendário é o pedaço do Meu Assessor que menos tem a
  ver com dinheiro, e o que mais alarga o escopo. **Minha recomendação: ficar
  de fora**, ou entrar só como "lembrete de conta a vencer no calendário", que
  é dinheiro de novo.

### Onda 5 — equipe com nome e cara
*Sem fornecedor. Muita decisão de produto.*

O Meu Assessor vende quatro pessoas: Martin, Rita, Sofi, Luna. O Tino vende
um leão. Trocar um assessor por uma equipe é decisão de marca, não de código
— tecnicamente, é a mesma camada de `chat.ts` com personas diferentes e
roteamento por assunto.

**Recomendo não copiar.** O leão já é a identidade do Tino, e quatro
avatares com foto de pessoa (que o Meu Assessor usa) prometem humano onde há
modelo. Se o Davi quiser a ideia, a versão honesta é **assuntos**, não
pessoas: "fiscal", "cobrança", "agenda" — sem foto e sem nome próprio.

---

## 3. O que eu faria primeiro, se fosse escolher

**Onda 1 inteira.** É a que transforma o Tino de "app que você abre" em
"assessor que te procura", não precisa de contrato nenhum e reaproveita o que
já está escrito e testado. O vigia que fala no WhatsApp (1.1) é, sozinho, a
maior diferença entre os dois produtos hoje.

Depois **2.1**, que é o "uau" barato: a pessoa pede o painel com a boca.

A onda 3 é a que mais vale dinheiro e a que mais pesa: envolve dinheiro de
terceiro, certificado digital e obrigação fiscal. Não começar sem as duas
decisões de fornecedor tomadas.

---

## 4. Decisões que são do Davi (nenhuma é técnica)

1. Mensagem proativa no WhatsApp é cobrada por mensagem. **Entra no plano
   pago, tem teto, ou é opcional?**
2. Cobrança: **conta do usuário no gateway** (recomendado) ou Tino como
   intermediário?
3. Nota fiscal: contratar o Focus NFe? Qual preço por nota o plano suporta?
4. Agenda entra no escopo do produto ou não?
5. Equipe com nomes próprios, ou assuntos sem cara?

---

## 5. O que este plano deliberadamente não faz

- Não promete antecipação de recebível (3.3).
- Não copia os avatares com foto de pessoa.
- Não põe o modelo escrevendo número nem SQL: em 2.1 ele escolhe consulta e
  parâmetro, e o número continua saindo do banco — a mesma regra que já vale
  em `tino/chat.ts`.

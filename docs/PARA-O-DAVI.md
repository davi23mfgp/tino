# Para o Davi

O que está pronto no código e **só depende de você** para funcionar de verdade.
Nenhum destes itens pode ser feito por mim: todos exigem criar conta, gerar
credencial ou tomar uma decisão comercial.

Cada item diz o que já existe, o que falta e onde está o passo a passo.

---

## 1. Publicar o app

**Pronto:** o `build` aplica as migrations sozinho, o schema tem `directUrl`
para o pooler do Postgres gerenciado, e `docs/PUBLICAR.md` tem o roteiro
completo.

**Falta você:**

- criar o banco no Neon (ou Supabase) e copiar `DATABASE_URL` e `DIRECT_URL`;
- criar o projeto na Vercel apontando para este repositório;
- gerar um `JWT_SECRET` de 32 bytes aleatórios e colar lá.

Passo a passo: `docs/PUBLICAR.md`.

---

## 2. Ligar a cobrança

**Pronto:** assinatura recorrente pelos dois gateways (Mercado Pago e Stripe),
webhook de cada um com conferência de assinatura e idempotência, tela
`/assinatura` com plano, status, próxima cobrança, troca e cancelamento.

Roda hoje, sem nenhuma chave: os botões aparecem desabilitados com o motivo
escrito. Nada quebra.

**Falta você:**

- criar a aplicação no Mercado Pago e gerar Access Token + segredo do webhook;
- criar a conta no Stripe e gerar Secret Key + signing secret;
- colar as quatro variáveis na Vercel;
- **decidir o preço final dos planos**: os valores em `src/lib/planos.ts` são
  placeholder;
- promover o seu usuário a admin com um `UPDATE` no banco.

Passo a passo, com o SQL exato: `docs/PAGAMENTO-E-ADMIN.md`.

---

## 3. As três faturas em PDF

**Pronto:** a tela Importar já lê PDF de fatura e já pede a senha do arquivo.

**Falta você:** informar a senha dos três PDFs. São **31 parcelamentos reais**
que continuam fora do sistema. Enquanto estiverem de fora, a projeção de caixa
e o comprometimento de renda mostram uma folga que você não tem.

---

## 4. A taxa real do seu cheque especial

**Pronto:** o app assume o teto legal de 8% ao mês quando a taxa não é
informada, e diz na tela que está assumindo. Esse teto agora é editável em
`/admin/configuracoes`, sem deploy.

**Falta você:** olhar o contrato e informar a taxa que o seu banco cobra de
fato. Enquanto for o teto, a projeção é conservadora de propósito, mas não é a
sua conta.

---

## 5. Titularidade do código de referência

**Falta você:** confirmar a titularidade do que veio do ERP Controllares antes
de vender o produto. O `globals.css` original já saiu inteiro (visual próprio
desde 30/08/2026), mas a conferência continua sendo sua.

---

## 6. O que ficou para você depois da noite de 06 para 07/10/2026

Pedido: "Continue todas as fases sem parar de forma autônoma. Vou dormir,
deixe o que depender de mim pro final." Está tudo aqui, na ordem em que
mais destrava.

**Escolher no canvas** (cada passo tem "hoje" e três opções, no celular e no
computador; código só depois da sua escolha):

- Parte 3 (https://claude.ai/artifact/RKncch3jJ637GJaPyeQPUi): passos 40
  (ligar o negócio na conta pessoal), 41 (relatório do contador), 42 (como
  conheceu o Tino), 43 (Guia do negócio), 44 (clientes e perdas), 45 (Pix no
  link), 46 (indicação), 47 (Beleza).
- Parte 4 (https://claude.ai/artifact/JKqHBG2CQs8BoQqM7rEdAB): 48 (pedir ao
  Tino para marcar na agenda), 49 (dúvidas do MEI), 50 (modo simples), 51
  (conferir a maquininha), 52 (Assinatura), 53 (botão do leão), 54
  (Notificações).
- Todas as telas de hoje, para comparar:
  https://claude.ai/artifact/3nTgY5Aq7gUauSZ74EisPG

**Decidir:**

- **Preço do anual.** O anual do Tino pessoal (R$ 214,92) custa o dobro do
  anual do Mobills (R$ 99,90), com o mesmo mensal (R$ 19,90). Estudo em
  `docs/pesquisas/2026-10-07-mercado-tino-pessoal.md`.
- **Duração do teste.** 14 dias hoje; o relatório da RevenueCat diz que
  teste de 17 a 32 dias converte mais. Hipótese, não regra.
- **Provedor de nota de serviço (NFS-e)** e quem guarda o certificado do
  CNPJ (ou o gov.br). Estudo em
  `docs/pesquisas/2026-10-07-fase-4-maquininha-e-nfse.md`.

**Criar ou colar:**

- Uma conta de teste do Mercado Pago com token de vendedor, para a primeira
  maquininha por API (a conciliação por planilha já funciona sem isso).
- Verificação do app no Google, para o Tino escrever sozinho na Agenda do
  Google (o link "pôr no Google Agenda" já funciona sem isso).
- Na Vercel: `RESEND_API_KEY` e `EMAIL_REMETENTE` (recuperar senha),
  `CRON_SECRET`, as chaves do Telegram e do Mercado Pago, e apagar
  `ADMIN_SENHA` e `ADMIN_REDEFINIR_SENHA` depois de entrar no admin.

**Juntar no `main`** (a sessão não pode):
https://github.com/davi23mfgp/tino/compare/main...claude/clever-turing-o0fv45
Inclui duas migrações novas que o build aplica sozinho: `das_pela_tabela`
(o DAS sem valor informado passa a seguir a tabela de 2026) e as da
entrada do aparelho e da Fase 2.

**Antes do lançamento:** conferir os textos da LC 123 e da Resolução CGSN
140 usados nas dúvidas do MEI (cada resposta mostra a data em que foi
conferida), a lista das 50 assistências e as 15 conversas da venda
assistida, o registro da marca no INPI e a titularidade do Controllares
(item 5).

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
- **decidir o preço final dos planos** — os valores em `src/lib/planos.ts` são
  placeholder;
- promover o seu usuário a admin com um `UPDATE` no banco.

Passo a passo, com o SQL exato: `docs/PAGAMENTO-E-ADMIN.md`.

---

## 3. As três faturas em PDF

**Pronto:** a tela Importar já lê PDF de fatura e já pede a senha do arquivo.

**Falta você:** informar a senha dos três PDFs. São **31 parcelamentos reais**
que continuam fora do sistema — enquanto estiverem de fora, a projeção de caixa
e o comprometimento de renda mostram uma folga que você não tem.

---

## 4. A taxa real do seu cheque especial

**Pronto:** o app assume o teto legal de 8% ao mês quando a taxa não é
informada, e diz na tela que está assumindo. Esse teto agora é editável em
`/admin/configuracoes`, sem deploy.

**Falta você:** olhar o contrato e informar a taxa que o seu banco cobra de
fato. Enquanto for o teto, a projeção é conservadora de propósito — mas não é a
sua conta.

---

## 5. Titularidade do código de referência

**Falta você:** confirmar a titularidade do que veio do ERP Controllares antes
de vender o produto. O `globals.css` original já saiu inteiro (visual próprio
desde 30/08/2026), mas a conferência continua sendo sua.

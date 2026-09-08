# Cobrança e administração — o que só o Davi pode fazer

O código está pronto e roda sem nenhuma chave: quem abrir `/assinatura` hoje vê
os planos com os botões de pagamento desabilitados e o motivo escrito na tela.
Nada quebra, nada some. O que falta abaixo é decisão e credencial — nenhuma
delas pode ser feita por mim.

Marque cada item conforme fizer.

---

## 1. Decidir o preço final dos planos

**Os valores em `src/lib/planos.ts` são placeholder.** Foram calibrados pelo que
apps de finanças pessoais e sistemas simples de PDV cobram no Brasil, mas preço
é decisão de negócio.

Hoje estão em:

| Plano | Mensal | Anual |
|---|---|---|
| Meu dinheiro | R$ 19,90 | R$ 199,00 |
| Meu dinheiro e minha loja | R$ 49,90 | R$ 499,00 |

Depois que o app estiver no ar, **o preço se muda em `/admin/configuracoes`, sem
deploy**. A página de vendas e o gateway leem o mesmo número — não há como
anunciar um valor e cobrar outro.

Antes de publicar, se quiser já subir com outro preço, edite `planos.ts`: ele é
o padrão de fábrica e continua sendo a referência que aparece ao lado do valor
editado no admin.

---

## 2. Criar a conta e a aplicação no Mercado Pago

1. Entre em <https://www.mercadopago.com.br/developers/panel/app> com a conta do
   MEI (a que vai receber o dinheiro).
2. **Criar aplicação** → produto **Assinaturas** (checkout de pagamentos
   recorrentes).
3. Em *Credenciais de produção*, copie o **Access Token** (começa com
   `APP_USR-`). O de teste começa com `TEST-` e serve para conferir o fluxo
   antes de valer dinheiro.
4. Em *Webhooks / Notificações*, cadastre a URL:

   ```
   https://SEU_ENDERECO/api/webhooks/mercadopago
   ```

   Marque os eventos **`subscription_preapproval`** e
   **`subscription_authorized_payment`**.
5. Ao salvar, o painel mostra uma **assinatura secreta** (webhook secret).
   Copie: ela aparece uma vez.

Sem o segredo do webhook, o endpoint recusa **todo** evento — de propósito.
Notificação não conferida não encosta no banco.

---

## 3. Criar a conta no Stripe

1. <https://dashboard.stripe.com/register>, conta brasileira, com CNPJ do MEI.
2. Complete a ativação (documento, conta bancária). Enquanto não completar, só
   as chaves de teste funcionam.
3. Em *Developers → API keys*, copie a **Secret key** (`sk_live_...`; a de teste
   é `sk_test_...`).
4. Em *Developers → Webhooks → Add endpoint*, aponte para:

   ```
   https://SEU_ENDERECO/api/webhooks/stripe
   ```

   Eventos a marcar:

   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

5. Copie o **Signing secret** (`whsec_...`).

Nada precisa ser cadastrado como produto ou preço no painel da Stripe: o valor
vai na própria sessão de checkout, para não existirem dois lugares com preço
diferente.

---

## 4. Colar as variáveis na Vercel

Em *Project → Settings → Environment Variables*, ambiente **Production**:

```
MERCADO_PAGO_ACCESS_TOKEN   = APP_USR-...
MERCADO_PAGO_WEBHOOK_SECRET = (assinatura secreta do webhook)
STRIPE_SECRET_KEY           = sk_live_...
STRIPE_WEBHOOK_SECRET       = whsec_...
```

As quatro estão descritas em `.env.example`, com o formato de cada uma.

**Nenhuma chave vai para o repositório.** Se alguma aparecer num commit, ela
está queimada: revogue no painel do provedor e gere outra — trocar depois não
adianta, porque o histórico do Git guarda o que já foi enviado.

Depois de colar, faça um *redeploy*: variável nova só entra em build novo.

---

## 5. Promover o seu usuário a admin

Não existe tela que promova ninguém — de propósito. Tela que concede privilégio
é uma tela a mais para dar errado, e uma escalada de privilégio a mais para
alguém encontrar. A promoção é um comando no banco.

**Em produção** (Neon, Supabase ou o que estiver usando), abra o SQL editor do
provedor e rode:

```sql
UPDATE "Usuario" SET admin = true WHERE email = 'davi23mfgp@gmail.com';
```

**No banco local**, o mesmo comando pelo `psql`:

```bash
psql "$DATABASE_URL" -c "UPDATE \"Usuario\" SET admin = true WHERE email = 'davi23mfgp@gmail.com';"
```

Ou, se preferir clicar, `npm run prisma:studio`, tabela `Usuario`, marque a
coluna `admin`.

Para conferir depois:

```sql
SELECT email, admin FROM "Usuario" WHERE admin = true;
```

Feito isso, recarregue o app: um escudo aparece na barra de cima, ao lado da
engrenagem, e `/admin` passa a abrir.

**Enquanto isso não for feito, `/admin` devolve 404 para todo mundo — inclusive
para você.** É 404 e não "acesso negado" porque 403 confirmaria que o endereço
existe, e quem varre um site procurando painel aprende exatamente onde insistir.

---

## 6. Conferir antes de anunciar

Com as chaves de teste (`TEST-` e `sk_test_`), dá para percorrer o fluxo inteiro
sem mover dinheiro:

1. Abra `/assinatura` numa conta qualquer e escolha um plano.
2. Pague com um cartão de teste do provedor.
3. Volte para `/assinatura`: em poucos minutos o status vira **Ativa** e a
   cobrança aparece na lista.
4. Confira em `/admin/pagamentos` que a linha apareceu, e em `/admin` que o MRR
   subiu.
5. Cancele pela própria tela e confira que o status muda.

Se o status ficar preso em *Aguardando confirmação do pagamento*, o webhook não
chegou: veja os logs de entrega no painel do provedor. Os dois mostram a resposta
que o Tino devolveu.

---

## O que já está pronto e não depende de você

- Assinatura recorrente pelos dois gateways, com o cliente escolhendo.
- Webhook de cada provedor com conferência de assinatura (HMAC-SHA256) e
  idempotência: evento reentregue não cobra duas vezes.
- Tela `/assinatura`: plano, status, próxima cobrança, histórico de cobranças,
  troca de plano e cancelamento.
- Painel `/admin` com MRR, inadimplência, churn do mês, base de contas,
  histórico de pagamentos dos dois gateways, fila de suporte e parâmetros
  globais editáveis sem deploy.
- Canal de suporte dentro do app (Configurações → Falar com o suporte), que já
  registra a tela em que a pessoa estava.
- Teto de juros do cheque especial (8% a.m.) e preços dos planos saíram do
  código para `/admin/configuracoes` — mudam sem deploy, e o padrão do código
  continua visível ao lado.

# Publicar o Tino

Hoje o app só funciona com o computador ligado e o Postgres portátil rodando.
Publicar resolve duas coisas: o celular passa a acessar de qualquer lugar, e a
captura por notificação deixa de depender da rede de casa.

O caminho abaixo é Neon (Postgres) + Vercel (app). Os dois têm plano gratuito
que aguenta um app de uso pessoal com folga.

**As contas são criadas por você.** Eu não crio conta nem digito senha, chave
ou token em formulário — se algum passo pedir isso, é passo seu.

## 1. Banco no Neon

1. Crie o projeto em https://neon.tech, região `aws-sa-east-1` (São Paulo) —

   **O servidor da Vercel tem de ficar na mesma região** (29/09/2026). O
   `vercel.json` fixa `"regions": ["gru1"]`, São Paulo. Sem isso a Vercel roda
   em Washington, e cada consulta ao banco atravessa as Américas: medido com
   140 ms de ida e volta, Cartões levava 3 s e o Início 3,2 s, porque fazem 15
   e 40 consultas. Se o banco do Neon estiver em outra região, troque o `gru1`
   pela região mais perto dele.
   latência menor para quem acessa do Brasil.
2. Na tela de conexão, copie **duas** strings:
   - a **pooled** (tem `-pooler` no host) → vai virar `DATABASE_URL`;
   - a **direct** (sem `-pooler`) → vai virar `DIRECT_URL`.

Por que duas: as consultas do app passam pelo pooler, que aguenta muitas
conexões curtas de função serverless. Já o `prisma migrate` emite comandos de
DDL que o pooler não aceita, então ele precisa da conexão direta. O
`prisma/schema.prisma` já está preparado para as duas.

Ambas precisam terminar com `?sslmode=require`.

## 2. Segredo do JWT

O `JWT_SECRET` assina o cookie de sessão. Sem ele o app se recusa a subir — de
propósito: um segredo padrão em produção significa que qualquer um forja login.

Gere um novo, e **não reaproveite o de desenvolvimento**:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 3. App na Vercel

1. https://vercel.com → **Add New → Project** → importe `davi23mfgp/tino`.
2. Framework Next.js é detectado sozinho. Não mexa em build command: o
   `npm run build` do projeto já faz `prisma generate && prisma migrate deploy
   && next build`, então o banco novo sai do deploy com o schema aplicado.
3. Em **Environment Variables**, para o ambiente Production:

   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | string **pooled** do Neon |
   | `DIRECT_URL` | string **direct** do Neon |
   | `JWT_SECRET` | o segredo gerado no passo 2 |
   | `OPEN_FINANCE_PROVIDER` | `sandbox` |

   `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN` e `TELEGRAM_WEBHOOK_SEGREDO` ficam
   de fora: sem chave, o assistente cai no motor de regras local e o Telegram
   fica inativo — que é o combinado hoje.

4. Deploy.

## 4. Primeiro acesso

O banco sobe vazio: nenhum usuário, nenhum lar. Abra
`https://SEU_ENDERECO/cadastro` e crie a conta. A conversa inicial em
`/bem-vindo` roda em seguida — dá para pular tudo.

O banco local **não** é copiado para a nuvem. Se quiser levar o histórico
junto, é uma migração de dados à parte, não um passo de deploy.

## 5. Conferir depois do deploy

- [ ] `/login` e `/cadastro` abrem e o cookie de sessão gruda (logar, dar F5,
      continuar logado — se cair, o `JWT_SECRET` não chegou na função).
- [ ] `/painel` carrega sem erro 500 (500 aqui costuma ser `DATABASE_URL`).
- [ ] uma transação lançada aparece em `/transacoes` depois de recarregar.
- [ ] instalar pelo celular: abrir no navegador → "adicionar à tela de início".

## O que continua fora

- **Captura por notificação de banco** depende do app Android apontando para o
  endereço novo; trocar a URL lá é passo manual.
- **Backup.** O plano gratuito do Neon guarda um histórico curto de restauração.
  Para dado financeiro que vale anos, vale exportar um dump de tempos em tempos:

  ```bash
  pg_dump "SUA_DIRECT_URL" -Fc -f tino-AAAA-MM-DD.dump
  ```

- **Domínio próprio.** A Vercel dá um `*.vercel.app`; domínio próprio é
  configuração de DNS, não muda nada no código.

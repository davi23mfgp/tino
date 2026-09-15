# Auditoria de segurança, LGPD e velocidade — 15/09/2026

Davi perguntou se isso já estava cuidado. Não estava. Este documento registra o
que foi medido, o que foi corrigido e o que ainda depende de decisão dele.

## Segurança

### O que já estava certo

- Das 71 rotas de API, todas exigem sessão, chave ou assinatura. As exceções
  são login, cadastro e logout (é a natureza delas) e os dois webhooks de
  pagamento, que **validam a assinatura** antes de tocar em qualquer coisa.
- Senha com bcrypt custo 12. Sessão em cookie `httpOnly`, `secure` em produção,
  `sameSite: lax`.
- Cabeçalhos no ar: CSP, HSTS com preload, `X-Frame-Options: DENY`, nosniff,
  `Permissions-Policy`.
- Mensagem de login igual para e-mail inexistente e senha errada — sem isso dá
  para descobrir quais e-mails têm conta.

### Corrigido nesta rodada

**Não havia limite de tentativa em lugar nenhum.** Dava para varrer senha em
laço, e `/api/transcrever` e `/api/tino/chat` gastam Groq por chamada — laço ali
vira conta para o dono pagar.

`LimiteAcesso` (tabela nova) conta no banco, não na memória: em serverless cada
requisição pode cair numa instância nova, e contador em memória zera a cada
partida.

| Rota | Limite |
|---|---|
| login | 6 por 15 min, por e-mail **e** por IP |
| cadastro | 5 por hora, por IP |
| transcrever, chat | 30 por hora, por usuário |
| capturar | 120 por hora, por IP |

Medido: bloqueia na 7ª tentativa com 429, e o login legítimo continua 200.

### Ainda aberto

- **`unsafe-inline` e `unsafe-eval` no `script-src`** do CSP. É o padrão do
  Next; apertar exige nonce por requisição.
- **A chave de captura viaja na query string** (`?chave=`). Foi escolha
  consciente — encaminhador sem código só sabe montar URL — mas query string
  entra em log de servidor e de proxy. A API já aceita cabeçalho; falta
  recomendar o cabeçalho para quem consegue usá-lo.

## LGPD

Não existia nada: nem política, nem exclusão, nem exportação. O Tino cobra
assinatura e guarda extrato de pessoa física — os direitos do art. 18 não são
opcionais.

### Feito

- **`GET /api/usuario/dados`** — exporta tudo em JSON (art. 18, II e V: acesso
  e portabilidade). Fora do arquivo: hash de senha, segredo de chave e token de
  conexão. Conferido: 251 lançamentos no pacote, zero credencial.
- **`POST /api/usuario/excluir`** — apaga de verdade (art. 18, VI). Pede senha
  e a palavra `APAGAR`. Última pessoa do lar leva o lar junto pelas cascatas do
  banco; se sobra gente no lar, some só a pessoa.
- **`/privacidade`** — o que guarda, para quê, quem mais vê (Groq, Vercel, Neon,
  Stripe, Mercado Pago — todos fora do Brasil, e transferência internacional
  tem de ser informada) e onde exercer cada direito.
- Link no rodapé da vitrine e "Meus dados" em Configurações.

### Depende do Davi — está marcado `[A DEFINIR]` no próprio texto da página

1. **Razão social e CNPJ** do controlador.
2. **E-mail do encarregado** (DPO) — a LGPD exige um canal.
3. **Prazo de guarda** depois de a conta ser apagada, e o que a obrigação fiscal
   obriga a manter.
4. **Termos de uso** não existem. A política de privacidade não substitui.

## Velocidade

### Medido na produção (`tino-kappa.vercel.app`)

| | tempo |
|---|---|
| `/` (vitrine) | 362 ms |
| `/transacoes` | 921 ms |
| `/painel` | 3,3 s |
| `/api/panorama` | 2,6 s |
| `/api/tino/alertas` | 4,3 s |
| primeiro acesso frio | 10,8 s |

### Causa confirmada, não suposta

Com `TINO_LOG_QUERIES=1` (liga a contagem de consultas por requisição, desligado
por padrão), uma abertura de `/painel` emite **41 consultas**, somando **159 ms**
no Postgres local.

Ou seja: o SQL não é lento. O que custa é a **quantidade de viagens** ao banco.
Num Postgres gerenciado a algumas dezenas de milissegundos da função, 41 idas e
voltas viram segundos — e é exatamente a diferença entre os 159 ms daqui e os
3,3 s de lá.

### Corrigido

- `montarPanorama` fazia duas consultas em `await` solto que não dependiam de
  nada: foram para dentro do `Promise.all` que já existia. Duas viagens seriais
  a menos em toda abertura de painel.
- A vitrine era `force-dynamic` e consultava o banco a cada visita só para ler
  preço e dias de teste. O que a prendia era o layout lendo a sessão — o Next
  não guarda em cache página que decide pelo cookie. O desvio de quem já entrou
  foi para `src/proxy.ts` e a página virou estática, revalidando a cada 5 min.

### Depende do Davi

**A região do banco e a da função precisam ser a mesma.** Se o Neon estiver em
`us-east` e a função da Vercel em outra região (ou vice-versa), cada uma das 41
consultas paga a travessia. É configuração nos painéis dele, e é provavelmente
o maior ganho isolado disponível — maior do que qualquer reescrita de consulta.

O passo seguinte do lado do código, se ainda faltar: juntar consultas
independentes em `$transaction([...])`, que o Prisma envia numa viagem só.

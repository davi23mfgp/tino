# Segurança

O Tino guarda dinheiro de gente de verdade: extrato, dívida, faturamento de
MEI. Falha de segurança tem prioridade sobre qualquer tela nova.

## Como avisar

**Não abra issue pública.** Issue fica visível para todo mundo antes de a
correção sair.

Use o aviso privado do GitHub (aba **Security → Report a vulnerability** deste
repositório) ou escreva para **davi23mfgp@gmail.com** com o assunto
`[segurança] Tino`. Diga o que dá para fazer, como reproduzir e o que você
chegou a ver — sem baixar nem guardar dado de outra pessoa além do mínimo para
mostrar o problema.

Resposta em até 3 dias úteis. Se o problema expôs dado pessoal, o titular e a
ANPD são avisados como manda a LGPD (art. 48).

## O que já está de pé

- Senha com bcrypt (custo 12); sessão em cookie `HttpOnly`, invalidada ao
  trocar a senha.
- Painel de administração responde 404 a quem não é admin; o papel é lido do
  banco a cada requisição, e cada ficha aberta fica registrada.
- Webhooks (Telegram, pagamento) conferem assinatura ou segredo.
- Limite por conta nas rotas que custam dinheiro (transcrição, leitura de
  fatura) e por IP nas públicas.
- Registro de erros sem dado pessoal: e-mail, CPF, CNPJ, telefone e chaves
  são trocados por marcadores antes de gravar.
- CSP, HSTS e `frame-ancestors 'none'`.
- Nenhuma senha ou chave no repositório: tudo vem do ambiente da Vercel.

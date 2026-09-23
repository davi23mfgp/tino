# Relatório da sessão de 22/09/2026

Sessão pedida pelo Davi, em duas frentes: **segurança e conformidade legal**
primeiro, **visual** depois. Tudo abaixo foi verificado com `tsc`,
`next build`, `npm test` (423 testes) e, no que é comportamento, com
requisições reais contra o servidor rodando.

---

## 1. Segurança

### Falhas graves corrigidas

| # | Problema | Impacto | Correção |
|---|---|---|---|
| 1 | Webhook do WhatsApp não conferia a assinatura da Meta | Quem soubesse a URL se passava pelo telefone de um cliente: lançava gasto e recebia de volta os números financeiros dele | Confere `X-Hub-Signature-256` com `WHATSAPP_APP_SECRET`. Sem assinatura: 401 |
| 2 | IDs de outro lar aceitos no corpo (IDOR) em 8 rotas | Lançamento no extrato de outra pessoa, baixa no estoque de outra loja, nome de categoria alheia na tela | Helper único `doLar()` (`src/lib/validar.ts`). Testado com ID real de outra conta: 400 |
| 3 | JWT de 30 dias nunca revogado | Funcionário removido seguia abrindo a loja por até 30 dias | `getSessao()` confere no banco a cada requisição. `revogarSessoes()` derruba tudo. Testado: 401 na hora |
| 4 | Papel `CONVIDADO` ("vê, não edita") não era aplicado | Convidado podia alterar e apagar tudo | `comSessao` barra escrita do convidado e reaplica a regra do funcionário no servidor |
| 5 | Regra com regex do usuário rodava sem checagem | `(a+)+$` trava o servidor para todos (ReDoS) | `regexSegura()` na criação e na execução |
| 6 | Login respondia mais rápido para e-mail inexistente | Dava para descobrir quem tem conta medindo o tempo | Compara contra hash falso de mesmo custo. Medido: 0,45 s x 0,42 s |

### Endurecimento

- Limite em **todo endpoint autenticado**: 300 leituras e 60 escritas por
  minuto por pessoa. Medido: 429 a partir da 299ª leitura.
- IP do limite vem do cabeçalho que a borda grava, não do que o cliente manda.
- `zod` adotado. Todo corpo tem teto de 256 KB, texto de 5.000 caracteres,
  lista de 2.000 itens e 10 níveis, e descarta `__proto__`.
- Segredos comparados em tempo constante (cron, Telegram, WhatsApp).
- Nenhuma rota devolve mensagem de exceção. Log grava só o caminho, nunca a
  query, que pode trazer a chave de captura.
- `src/instrumentation.ts` confere as variáveis de ambiente na subida.
  Produção não sobe sem `DATABASE_URL` nem com `JWT_SECRET` curto.

## 2. Legal

- **Termos de Uso** (`/termos`), que não existiam. Deixam claro que o Tino não
  é consultoria de investimento (CVM), não é serviço contábil (CRC) e não é
  banco. Trazem arrependimento em 7 dias (CDC art. 49), cancelamento sem
  multa e aviso de 30 dias para mudança de preço.
- **Aceite registrado** no cadastro, com versão e data (LGPD art. 8º).
- **Marco Civil art. 15**: registro de acesso (data, hora, IP) guardado por 6
  meses, com expurgo no cron diário.
- **Política de privacidade** atualizada com os terceiros que faltavam
  (Anthropic, WhatsApp, Telegram, Resend, Focus NFe, push).
- Dados do controlador preenchidos: Davi Marques Franco de Godoy Pereira,
  MEI, CNPJ 63.443.755/0001-80, Aracaju (SE).

**Ainda depende do Davi:** advogado revisar os dois textos; decidir reembolso
depois dos 7 dias; informar o prazo de backup do banco quando publicar.

## 3. Visual

### Vidro líquido (opção A, aprovada)

Aproximação web do Liquid Glass da Apple, em `src/app/liquid-glass.css`.
Fundo com névoa verde da marca nas bordas, cartões de vidro, barra do celular
em pílula flutuante. Contraste medido no pior ponto do fundo: 5,2:1 no escuro
e 8,5:1 no claro, acima do mínimo de 4,5.

O vidro tinha saído do app em 08/09 porque o texto da página aparecia através
da barra fixa. Voltou com receita diferente: cartão usa vidro fino, barra fixa
e gavetas usam vidro grosso, onde o que passa por baixo vira borrão.

### Ajustes depois da leitura do Davi

- Barra lateral **deixou de ser vidro**: ela fica parada, o desfoque não
  revela nada e custa contraste em texto de menu.
- Uma escala de tipo e um traço de ícone (1,75) para o app inteiro.
- Carteira de cartões: pilha mantida, mas a tira visível de cada cartão passou
  a carregar banco, fatura do mês e percentual do limite usado. Chip, símbolo
  de aproximação e véu escuro para o texto branco ter contraste sobre banco de
  cor clara (o amarelo do BB dava 2,1:1 sem véu).
- **Bandeira do cartão**: campo novo, opcional, escolhido no cadastro. Texto,
  não logo, porque as marcas são registradas. Sem informar, nada aparece: o
  Tino não adivinha pelo nome.
- **Limite**: a barra só existe para quem cadastrou o valor.
- Símbolo das listas: o componente calculava um ícone e o descartava, usando
  emoji fixo no código. Agora o emoji só aparece quando a pessoa escolheu um.
- Controles: uma regra de forma para o app todo. Toque redondo é pílula, campo
  de texto é 14px, superfície é 22 ou 26px. Campo com 46px, foco visível com a
  cor da marca, texto de exemplo em tom que passa em contraste.
- Bloco branco de volta como destaque único por tela.

### Ferramentas

- **Ícone por ferramenta** (`src/lib/icone-ferramenta.tsx`), buscado pelo
  rótulo normalizado. Sem correspondência, nenhum ícone: ícone errado ensina a
  coisa errada.
- Os três sistemas de abas do app (cartões, internas e trilho de grupo)
  passaram a usar a mesma peça: barra de vidro em pílula, rolagem com encaixe
  e borda que desvanece, avisando haver mais abas para o lado.
- Aba atual deixou de ser bloco preto sólido, que parecia desabilitado.
- **Estados vazios**: cada ferramenta agora diz o que falta, de onde viria o
  conteúdo e oferece a ação que o cria. Antes, mês sem compra deixava o painel
  em branco.
- Linha de compra no celular: a regra dava quatro colunas para cinco
  elementos, a lixeira caía para a segunda linha e cada compra ocupava 103px.
  Agora são cinco colunas e 56px, medido no navegador.

### Vitrine (landing)

- Biblioteca **Motion** (`motion/react`) para as entradas: primeira dobra em
  escada, listas revelando na ordem de leitura, botão com resposta ao toque.
  Quem pede menos movimento no sistema não recebe animação nenhuma.
- O palco do produto (celular preso na tela enquanto rola) continua como
  estava, feito à mão: funciona e trocar traria risco sem ganho.
- Sete rótulos em maiúsculas viraram três. A repetição criava a batida que
  denuncia página gerada.
- "01 02 03" saiu dos passos: a ordem já está na sequência.
- A frase pequena embaixo do botão saiu da primeira dobra e foi para a seção
  de preços, onde a pessoa decide.

---

## Como conferir

```bash
npm run dev
```

Entre com `demo@tino.local` / `demo12345`. As telas que mais mudaram são
`/painel`, `/cartoes`, `/categorias`, `/configuracoes` e a vitrine em `/`.

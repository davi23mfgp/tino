# Começar aqui

> **Checkpoint atual de 01/10/2026:** [ESTADO-2026-10-01.md](ESTADO-2026-10-01.md). Leia primeiro; ele prevalece sobre estados históricos e decisões revertidas abaixo.

Se você é uma sessão nova do Claude (outra conta, outro dia, outra máquina),
leia isto primeiro. Em cinco minutos você sabe tanto quanto a sessão anterior.

## Ordem de leitura

1. **`CLAUDE.md`** (raiz) — as regras que não se negociam e como o Davi trabalha.
2. **`docs/ESTADO.md`** — o que está pronto, o que falta, decisões de produto.
3. **`docs/DECISOES.md`** — por que cada escolha de modelagem existe. **Leia
   antes de mexer em qualquer cálculo.**
4. **`docs/ARQUITETURA.md`** — onde fica o quê, e a regra do panorama.
5. **`docs/HISTORICO.md`** — os doze defeitos já cometidos. Não os repita.
6. **`docs/IDENTIDADE.md`** — as cores, as fontes e o mascote, com o porquê.
7. **`docs/TINO-MEI.md`** e **`docs/TINO-MEI-FASES.md`** — o sistema da loja.
8. **`docs/PUBLICAR.md`** — como colocar no ar (Neon + Vercel).
9. **`README.md`** — o que o app faz, em linguagem de usuário.

## Confirme que está tudo de pé

```bash
npm run db:start
npm test          # deve dar 138 passando
npm run dev
```

Com o `npm run dev` de pé, noutro terminal:

```bash
npm run test:fumaca   # deve dar 40 rotas de pé
```

Entre com `demo@tino.local` / `demo12345` e abra `/analise`. Se o parecer
aparecer com DRE, balanço e indicadores, o sistema está inteiro.

## O que o Davi pediu, na ordem em que pediu

1. Um contador para pessoa física (sozinha, casal, família) e MEI, completo,
   fácil e intuitivo.
2. Projeção, organização de dívidas, metas (viagem, aposentadoria).
3. Ajuda para decidir empréstimo.
4. Mandar extratos e categorizar contas com facilidade.
5. Comportar-se como o app Tino — "meu assessor".
6. Open Finance se der. **Depois desistiu:** não vai usar.
7. Usar o ERP dele como exemplo de estrutura e de visual.
8. Análise profissional de contador.
9. Gráficos e o jeito mais fácil do mundo de acompanhar gastos.
10. A ideia dele: o app vigiar as notificações de compra do banco e ir anotando.
11. Poder controlar pelo celular.

Tudo isso está entregue, com uma ressalva importante no item 10 (abaixo).

## As três verdades incômodas

**Open Finance não é ligável por conta própria.** Puxar dados do banco exige ser
instituição autorizada pelo Banco Central ou ter contrato com um agregador
certificado (Pluggy, Belvo). O adaptador está pronto; falta o contrato. O Davi
já sabe e desistiu por ora.

**Um site não lê notificação do Android.** Quem lê é um app de automação no
celular (MacroDroid, Tasker), que repassa o texto para `/api/capturar`. Os três
formatos que essas ferramentas mandam foram testados e funcionam. Falta só um
endereço público.

**Os PDFs de fatura do Davi têm senha.** O app pede a senha na tela Importar e
não a guarda. Ele ainda não informou — por isso 31 parcelamentos reais dele
continuam fora do sistema.

## Se ele pedir para continuar de onde parou

O próximo passo de maior valor, na minha leitura, é **completar o MEI** (lançar
faturamento e dar baixa no DAS pela tela — a API já aceita) ou **publicar**
(sem isso o app só funciona com o computador ligado). Pergunte qual dos dois,
em vez de escolher por ele.

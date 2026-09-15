# Prompt de fases — Tino, a partir de 15/09/2026

Este documento é para ser lido pelo Davi e, depois de aprovado, entregue a um
agente (Claude Code ou Codex) como instrução de trabalho. Cada fase é
independente: dá para aprovar uma e recusar outra, e para executar fora de
ordem.

Estado de partida: `main`, topo `084ee54`, tudo pushado. `tsc`, `next build` e
`npm test` (409) limpos. As quatro ondas do princípio de tela estão fechadas
(`docs/PLANO-PRINCIPIO-TELA-COMPLETO.md`), e os caminhos de entrada automática
estão mapeados em `docs/ENTRADA-AUTOMATICA-SEM-OPEN-FINANCE.md`.

Regras que valem para todas as fases:

- `docs/PRINCIPIO-DE-TELA.md` manda no desenho de qualquer tela tocada.
- Todo par de cor novo tem contraste calculado (OKLab → sRGB linear → WCAG),
  mínimo 4,5:1. O verde da marca (`#45f45c`) hospeda texto **preto**.
- Nada é dado como pronto sem `tsc`, `next build`, `npm test` e leitura no
  navegador com a conta demo.
- Nenhuma tela inventa dado: o que não existe aparece como "ainda não sei",
  nunca como zero.
- Decisão de produto ou de dinheiro não é tomada pelo agente. Fica registrada
  e volta para o Davi.

---

## Fase 1 — O encaminhador de notificação, pronto para colar

**Por que primeiro:** é a fase que entrega o "aproximou o cartão, o gasto
aparece". Todo o resto do caminho já existe no código; falta a configuração
chegar no celular sem o Davi ter de descobrir sozinho.

**O que já existe e não deve ser reescrito:** `POST /api/capturar` autenticado
por `ChaveCaptura`, o leitor `src/lib/captura/notificacao.ts` (valor,
estabelecimento, final do cartão, instituição, parcela; recusa compra negada,
estorno e pré-autorização de posto) e a criação de chave em `/capturas`.

**Escopo:**

1. Em `/capturas`, uma seção "Ligar o aviso do banco", com a chave criada ali e
   a URL completa **pronta para copiar**, com botão de copiar.
2. Instrução do app encaminhador para Android, em passo numerado: qual app,
   qual permissão (acesso a notificações), como filtrar para só o app do banco
   e da carteira, e o que colar em cada campo.
3. Um botão "Mandar um aviso de teste" que dispara uma captura de exemplo e
   mostra ela caindo na fila — a pessoa precisa ver funcionando antes de
   confiar.
4. Aviso honesto na mesma tela: isto é Android. No iPhone o sistema não deixa
   nenhum app ler notificação de outro.

**Aceite:** com o encaminhador configurado, uma notificação real de compra
aparece na fila de conferência em menos de cinco segundos, com valor e
estabelecimento certos, e uma compra negada **não** vira captura.

**Decisão do Davi:** qual app encaminhador recomendar. Não instalei nenhum para
testar, e recomendar app não testado é o tipo de coisa que quebra a confiança
na primeira vez que falha.

---

## Fase 2 — A notificação que volta sozinha (push)

**O que existe hoje:** notificação **local**, criada quando o app abre
(`src/components/atalho-de-lancar.tsx`, `public/sw.js`). Se o Android limpar a
gaveta, ela só volta quando o Tino é aberto de novo.

**Escopo:**

1. Chaves VAPID próprias (sem fornecedor pago), guardadas como variável de
   ambiente, e `PushSubscription` por dispositivo no banco.
2. Evento `push` no service worker renovando o atalho fixo.
3. Um envio programado: o lembrete volta uma vez por dia, no horário que a
   pessoa escolher, e nunca mais de uma vez por dia.
4. Desligar de verdade: tirar da barra apaga a inscrição, não só o
   `localStorage`.

**Aceite:** com o app fechado há dois dias, o atalho continua na barra; e
desligar em Configurações o faz sumir e não voltar.

**Limite que continua valendo, e deve ficar escrito na tela:** notificação de
site não aceita texto dentro dela. O botão abre `/lancar`. Resposta inline só
existe em aplicativo nativo ou pelo WhatsApp.

---

## Fase 3 — ~~Etiqueta NFC~~ — CANCELADA pelo Davi em 15/09/2026

Ele perguntou se dava para o pagamento por aproximação abrir o lançamento
sozinho. Não dá: o toque passa pelo *secure element* / HCE e o Android não
entrega esse evento a nenhum app de terceiro — nem nativo, nem PWA, nem Tasker.
A alternativa era uma etiqueta NFC acionada pela pessoa, e ele dispensou. Quem
resolve o "gastou, apareceu" é a Fase 1.

## Fase 4 — A landing no ritmo da referência

**Referência:** os 14 prints do Meu Assessor que o Davi mandou em 15/09/2026.
Marca, texto, funcionalidades e preços continuam sendo do Tino; nada de
personas, nomes ou produto deles.

**O padrão a copiar:** cada seção é uma afirmação + uma linha de apoio + um
**artefato real**. Nunca ilustração abstrata.

**Escopo:**

1. Uma seção contando, em conversa de WhatsApp com horário e tique, o que só o
   Tino faz: mandar áudio e o gasto entrar; o vigia avisando antes de a conta
   vencer; a nota do MEI. Hoje a landing vende "organize seus gastos", que
   qualquer app vende.
2. Carrossel com espiada no celular: o card seguinte aparece cortado na borda,
   com os pontos embaixo. O corte é o que diz "arrasta".
3. Inversão clara/escura por capítulo, para separar assunto sem título de
   seção.
4. Régua do dia — cinco horários, o atual aceso — contando um dia de uso.
5. Corrigir o defeito que a referência tem e que não devemos herdar: a barra
   flutuante come o título ao rolar. `scroll-margin-top` nas âncoras.

**Aceite:** em 390px, sem rolagem horizontal, cada seção responde "o que o Tino
faz por mim" em uma frase e mostra a prova ao lado.

**Decisão do Davi:** ele disse em 14/09 para deixar a landing para depois. Esta
fase só começa se ele reabrir.

---

## Fase 5 — As três pendências de engenharia

Nenhuma é visual, e todas já foram vistas e registradas.

1. **`/parcelamentos` responde 307 e o teste de fumaça espera 200.** Virou
   `redirect()` para `/cartoes?aba=parcelas` no commit `3af300e` (13/09). São
   62 de 63 passando. **Decisão do Davi:** ajustar a expectativa do teste, ou o
   redirect é que não deveria existir?
2. **`/api/tino/alertas` é consultado por quatro componentes da mesma página** —
   cinco a seis requisições por carregamento. Pede um provedor único de
   contexto. É mudança estrutural, não visual, e por isso ficou fora das ondas.
3. **390px continua sem prova visual.** A ferramenta de redimensionar desta
   máquina não muda o viewport de verdade. Ou se prova no celular do Davi, ou
   se monta uma verificação que não dependa de redimensionar janela.

---

## Fase 6 — O que ficou pedindo decisão de produto

Sem código proposto: são escolhas dele.

- **Reserva de emergência com alvo calculado pela realidade da pessoa** (hoje é
  múltiplo fixo do custo essencial).
- **Campo de banco na simulação de empréstimo.**
- **OCR de comprovante.** O `share_target` do manifesto já recebe imagem e nada
  lê pixel hoje. Custa biblioteca nova e erra bastante em foto de papel.
- ~~**Open Finance (Pluggy).**~~ **Adiado pelo Davi em 15/09/2026, por custo.**
  O agregador cobra por conta conectada e não há assinante suficiente ainda. O
  convite saiu do app; o código do provedor continua em `src/lib/open-finance/`,
  desligado, para o dia em que houver dinheiro. `docs/PESQUISA-OPEN-FINANCE.md`
  guarda o levantamento.

---

## Para o Davi conferir no celular

1. **A notificação do atalho de lançar.** A permissão fica em `default` na
   automação do navegador, então o que dá para afirmar daqui é que o service
   worker registra e ativa, e que `/lancar` grava a captura ponta a ponta.
2. **O endereço do encaminhador**, em `/capturas` → "Compras pelo aviso do
   banco": gerar, copiar e mandar o aviso de teste. O teste foi provado nesta
   máquina (R$ 34,90, cartão final 4416, origem NOTIFICACAO), mas quem fecha o
   ciclo é uma compra de verdade no celular dele.

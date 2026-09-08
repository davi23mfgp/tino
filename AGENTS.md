# AGENTS.md — Tino

Contador pessoal para pessoa física e MEI com loja. Leia
**`MIGRACAO-CODEX.md`** na raiz antes de trabalhar: ele tem o contexto
completo dos dois projetos, o que já foi decidido e o que não pode ser
reaberto.

## Regras que não se negociam

1. **Autonomia é sobre COMO, não sobre O QUÊ.** Não peça aprovação de fonte,
   cor, biblioteca, commit ou branch — decida. Mas não amplie escopo, não
   varra código que ninguém mandou varrer e não apague em massa.
2. **Português em tudo:** variável, função, arquivo, comentário e commit.
3. **Dinheiro em centavos (`Int`), nunca float.**
4. **Comentário explica o PORQUÊ**, incluindo o que foi tentado e falhou. O
   código deste repo é assim de propósito.
5. **Registre decisão no repo na hora que ela é tomada**
   (`docs/REDESIGN-EM-CURSO.md`, `docs/ESTADO.md`, `docs/DECISOES.md`). As
   sessões caem; o que não está escrito se perde.
6. **Não afirme sem provar.** Teste verde não prova comportamento visual.
7. **Push automático** depois de tipos e testes verdes. Force-push, rebase e
   apagar branch continuam pedindo confirmação.

## Comandos

```
npm run db:start        # Postgres portátil local, porta 5432
npm run dev             # :3000
npm run tipos           # tsc --noEmit
npm test                # 298 testes
npx next build          # build de produção
npm run test:fumaca     # 63 rotas contra servidor de pé
```

Depois de qualquer merge que toque `prisma/schema.prisma`, rode
`npx prisma generate` **antes** do `tsc`.

## Antes de mexer na interface

Leia `docs/SPEC-CALEN-PRECISO.md` — tem os números exatos (tamanho de fonte,
espaçamento, anatomia por tela). A skin já mudou de direção cinco vezes; não
proponha a sexta sem pedido explícito.

- Navegação: fonte única em `src/lib/navegacao-grupos.ts`.
- Alvo de toque mínimo: 44px.
- Landing: `src/app/(site)/`, CSS escopado em `.vitrine`, não vaza para o app.

## Conta de demonstração

`demo@tino.local` / `demo12345`, existe no local e em produção.
Para recriar em produção, veja a parte 3 do `MIGRACAO-CODEX.md`.

## Produção

Vercel + Neon Postgres. `https://tino-kappa.vercel.app`. As migrations rodam
no build. As variáveis de ambiente são *Sensitive*: o valor não pode ser lido
de volta por ninguém, nem por você.

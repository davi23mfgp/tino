# Integração da branch `claude/visual-ios`

Branch baseada em `origin/main` (`d2b8903`). Nada foi publicado em `main` —
a integração é do Sol, conforme combinado.

## Ordem dos commits

| Hash | Assunto | O que muda |
|---|---|---|
| `b87c8e6` | bancos | Assets oficiais locais em `public/bancos/`; ícone neutro no lugar das iniciais "BP"/"X"/"S" |
| `fd8b496` | categorias | Lista compacta no lugar de 24 formulários abertos; seletor visual de emoji |
| `1f1db78` | notificações | Painel na forma da referência aprovada; "Limpar tudo" que persiste |
| `f3665c4` | configurações | Dois grupos, Conta e Sistema, com linhas compactas |
| `f534a48` | navegação | Ícones sem repetição; rótulo de destino em vez de pergunta genérica |
| `1f23394` | docs | Pesquisa de APIs dos programas de pontos |
| `a71f803` | números | Fim da barra de rolagem dentro do valor; ferramenta `qa-visual.mjs` |
| `c3d5b1f` | tipografia | Tamanho da letra do site inteiro em um único token |
| `7f5923e` | letra 15% | Escala final, piso de alvo de toque, cartões sem rolagem lateral |
| `a7d098d` | docs | Pesquisa de pontos completa (URL oficial, recursos, autenticação) |
| `abb78a8` | cartões | Coluna perdida na lista de compras, vão morto no gráfico e no celular |

## Passos obrigatórios depois de integrar

```bash
npx prisma migrate deploy   # aplica 20260913210000_alerta_dispensado
npx prisma generate         # o client desatualizado quebra o tsc
npm test
npx next build
```

A migração é **aditiva**: `ALTER TABLE "Alerta" ADD COLUMN IF NOT EXISTS
"dispensadoEm" TIMESTAMP(3)`. Não remove nem renomeia nada, e a coluna nula
significa "alerta ativo", que é o estado de todo alerta que já existia.

## O que mudou de comportamento, não só de aparência

- **Alerta dispensado continua dispensado.** Antes "Limpar tudo" apagava a
  linha, e o alerta voltava no próximo cálculo porque a chave é estável.
  Agora `dispensadoEm` guarda a dispensa, e o alerta só reaparece quando o
  motivo muda (o texto muda). `PATCH /api/tino/alertas` aceita
  `{ ids?, dispensar? }`, sempre limitado ao `larId` da sessão.
- **Tamanho da letra é um token.** `--escala-letra: 0.85` em `globals.css`
  governa a escala nomeada inteira do Tailwind. Mudar esse número muda o site
  todo — não reescreva tamanho em componente.
- **Piso de alvo de toque abaixo de 640px.** Encolher a letra encolheu os
  alvos para 33px; a regra em `globals.css` devolve os 44px no celular sem
  inchar o desktop, onde o alvo é ponteiro.

## Instituições ainda sem logo

Itaú, BTG e XP. Todas as URLs tentadas estão em `docs/LOGOS-INSTITUICOES.md`.
Enquanto não houver asset confirmado, essas instituições caem no ícone neutro
— nenhuma marca foi desenhada nem inventada.

## Como conferir

```bash
npm run dev            # porta 3400
node qa-visual.mjs 3400
```

Mede 9 rotas em 320, 390, 768 e 1440px: rolagem horizontal, barra de rolagem
dentro de indicador, alvo pequeno no celular, controle grande demais e texto
vazando. Último resultado: **0 achados, 0 erros**. As três calibragens que
evitam falso positivo estão comentadas no próprio arquivo.

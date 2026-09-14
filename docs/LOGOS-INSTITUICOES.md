# Logos de instituições — origem e data

Consultado em **13/09/2026**. Todo arquivo listado está em `public/bancos/` e
é servido pelo nosso próprio domínio.

## Por que local, e não a URL do banco

A versão anterior (`lib/bancos-perfil.ts` antes de 13/09) apontava direto
para o favicon do site de cada instituição. Três defeitos reais apareceram:

1. **Itaú passou a responder 403** para requisição sem sessão de navegador.
   Verificado com `curl` inclusive com `Referer` do próprio site. O logo
   sumia da tela sem nenhum aviso — falha silenciosa.
2. **Bradesco servia 299 KB** (`favicon.ico` multi-resolução) para desenhar
   um quadrado de 40 px.
3. Qualquer troca de CDN do banco apagaria a marca do nosso app sem ninguém
   perceber.

Os `.ico` baixados foram convertidos para PNG de 96 px (script pontual com
`sharp`, lendo a maior entrada de dentro do container ICO). Três ficaram em
`.ico` porque a entrada interna é BMP indexado, que o `sharp` não lê: o
navegador renderiza `.ico` em `<img>` sem problema e os três são leves.

## O que temos

| Instituição | Arquivo | Origem | Peso |
|---|---|---|---|
| Nubank | `nubank.png` | `nubank.com.br/favicon.ico` (256px) | 3,7 KB |
| Bradesco | `bradesco.png` | `bradesco.com.br/favicon.ico` | 7,6 KB |
| Santander | `santander.ico` | `santander.com.br/favicon.ico` | 22 KB |
| C6 Bank | `c6.png` | `c6bank.com.br/favicon.ico` | 8,0 KB |
| Inter | `inter.png` | `inter.co/favicon.ico` | 11,2 KB |
| Banco do Brasil | `bb.ico` | `bb.com.br/favicon.ico` | 3,2 KB |
| Caixa | `caixa.ico` | `internetbanking.caixa.gov.br/favicon.ico` | 0,9 KB |
| Sicoob | `sicoob.png` | `sicoob.com.br/o/sicoob-theme/images/favicon.ico` | 6,6 KB |
| Sicredi | `sicredi.png` | `sicredi.com.br/favicon.ico` | 17,9 KB |
| Mercado Pago | `mercadopago.svg` | Simple Icons (CC0) | 4,2 KB |
| PagBank | `pagbank.svg` | Simple Icons (CC0), ícone `pagseguro` | 0,8 KB |
| PicPay | `picpay.svg` | Simple Icons (CC0) | 0,4 KB |

## O que falta — três instituições, e por quê

Nenhuma marca foi desenhada nem aproximada. Estas três mostram **ícone
neutro de instituição** com o nome ao lado, que é o comportamento correto
enquanto não houver asset confirmado:

| Instituição | O que foi tentado | Resultado |
|---|---|---|
| **Itaú** | `itau.com.br/favicon.ico`, o caminho `media/dam/.../logo-32px.png` que estava no catálogo antigo (com e sem `Referer`), `apple-touch-icon.png` | 403 em todos |
| **BTG Pactual** | `btgpactual.com/favicon.ico`, `/apple-touch-icon.png`, `/assets/`, `/static/`, `/sites/default/files/`, `media.btgpactual.com`, `btgpactualdigital.com`, `api.btgpactual.com` | sem resposta ou 404 |
| **XP** | `xpi.com.br/favicon.ico`, `xp.com.br`, `static.xpi.com.br`, `cdn.xpi.com.br`, `conteudos.xpi.com.br`, `institucional.xpi.com.br`, `/apple-touch-icon.png` | sem resposta ou 404 |

**Isto não é conclusão de que o asset não existe** — é registro de que não
foi alcançável por requisição direta nesta data. Os três sites bloqueiam
cliente que não é navegador completo. Caminhos para resolver, em ordem de
preferência:

1. Baixar o arquivo pelo navegador e salvar em `public/bancos/`. É o mais
   rápido e não depende de negociação.
2. Pedir o kit de marca oficial (BTG e XP publicam manual de identidade para
   parceiros).
3. Deixar como está: o ícone neutro não mente, só não decora.

## Regra que não muda

Instituição desconhecida ganha **ícone neutro + nome por extenso**, e a
pessoa pode subir o próprio logo em Configurações. Iniciais como "BP", "X" e
"S" foram removidas de propósito — não identificam nada e foram apontadas
como defeito nas capturas de 13/09/2026.

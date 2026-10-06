import { headers } from "next/headers"

import { prisma } from "@/lib/prisma"
import { getSessao } from "@/lib/auth"
import { formatarMoeda } from "@/lib/dinheiro"
import { aberturaConta, dividirPagamento, numeroDoOrcamento, paraResumoSimples, situacaoDoOrcamento } from "@/lib/loja/orcamento"
import { AprovarOrcamento } from "./aprovar"
import estilos from "./orcamento.module.css"

export const dynamic = "force-dynamic"
export const metadata = { title: "Orçamento", robots: { index: false, follow: false }, referrer: "no-referrer" as const }

const TOKEN_VALIDO = /^[A-Za-z0-9_-]{32}$/

const dataCurta = (data: Date) => data.toISOString().slice(0, 10).split("-").reverse().join("/")

function Reais({ centavos }: { centavos: number }) {
  const texto = formatarMoeda(centavos)
  const virgula = texto.lastIndexOf(",")
  return <>{texto.slice(0, virgula)}<small>{texto.slice(virgula)}</small></>
}

/**
 * O orçamento como o cliente vê (o "papel" da opção C do passo 36; a opção
 * A escolhida pelo Davi não desenha esta tela, e ela é a mesma nas três).
 *
 * Fora da área logada: quem tem o link vê só este orçamento, nada da loja
 * além do nome e do contato. Cada visita que conta (ver `aberturaConta`)
 * soma uma abertura, que é o que a tela Clientes mostra ao dono.
 */
export default async function OrcamentoPublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const orcamento = TOKEN_VALIDO.test(token)
    ? await prisma.orcamentoLoja.findUnique({
        where: { linkToken: token },
        include: {
          loja: { select: { nome: true, cnpj: true, telefoneContato: true, larId: true, lar: { select: { fusoHorario: true } } } },
          cliente: { select: { nome: true } },
          itens: { orderBy: { ordem: "asc" } },
        },
      })
    : null

  if (!orcamento || orcamento.status === "RASCUNHO") {
    return (
      <main className={estilos.fundo}>
        <section className={estilos.papel}>
          <h1 className={estilos.indisponivel}>Orçamento indisponível</h1>
          <p className={estilos.nota}>O link pode estar incompleto. Peça para a loja mandar de novo.</p>
        </section>
      </main>
    )
  }

  const agora = new Date()
  const sessao = await getSessao()
  const userAgent = (await headers()).get("user-agent")
  if (aberturaConta({ userAgent, ehDaLoja: sessao?.larId === orcamento.loja.larId, ultimaAberturaEm: orcamento.ultimaAberturaEm, agora })) {
    await prisma.orcamentoLoja.update({
      where: { id: orcamento.id },
      data: { aberturas: { increment: 1 }, ultimaAberturaEm: agora, ...(orcamento.primeiraAberturaEm ? {} : { primeiraAberturaEm: agora }) },
    })
  }

  const fuso = orcamento.loja.lar.fusoHorario
  const situacao = situacaoDoOrcamento(paraResumoSimples(orcamento), agora, fuso)
  const pagamento = dividirPagamento(orcamento.totalCentavos, orcamento.entradaCentavos, orcamento.parcelas)
  const bruto = orcamento.itens.reduce((soma, item) => soma + item.totalCentavos, 0)
  const telefone = orcamento.loja.telefoneContato?.replace(/\D/g, "")
  const conversa = telefone
    ? `https://wa.me/${telefone.length <= 11 ? `55${telefone}` : telefone}?text=${encodeURIComponent(`Olá! Sobre o orçamento ${numeroDoOrcamento(orcamento.numero)}:`)}`
    : null

  const aviso = {
    vencido: orcamento.validoAte ? `Este orçamento venceu em ${dataCurta(orcamento.validoAte)}. Peça um novo para a loja.` : null,
    aprovado: "Você aprovou este orçamento. A loja vê a aprovação e fala com você para combinar.",
    convertido: "Este orçamento já virou compra. Obrigado!",
    perdido: "Este orçamento foi encerrado pela loja.",
  } as Record<string, string | null>

  return (
    <main className={estilos.fundo}>
      <article className={estilos.papel}>
        <header className={estilos.cabeca}>
          <div>
            <h1>{orcamento.loja.nome}</h1>
            <p>{[orcamento.loja.cnpj ? `CNPJ ${orcamento.loja.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}` : null, orcamento.loja.telefoneContato].filter(Boolean).join(" · ")}</p>
          </div>
          <div className={estilos.numero}>
            <span>Orçamento</span>
            <strong>{numeroDoOrcamento(orcamento.numero)}</strong>
          </div>
        </header>

        <p className={estilos.para}>
          Para <b>{orcamento.cliente.nome}</b>
          {orcamento.validoAte && situacao !== "vencido" ? <> · válido até {dataCurta(orcamento.validoAte)}</> : null}
        </p>

        {aviso[situacao] && <p className={estilos.aviso} data-tom={situacao === "aprovado" || situacao === "convertido" ? "bom" : undefined}>{aviso[situacao]}</p>}

        <ul className={estilos.itens}>
          {orcamento.itens.map((item) => (
            <li key={item.id}>
              <span>{item.descricao}</span>
              <span className={estilos.qtd}>{item.quantidade} × {formatarMoeda(item.precoUnitarioCentavos)}</span>
              <b>{formatarMoeda(item.totalCentavos)}</b>
            </li>
          ))}
        </ul>

        {orcamento.descontoCentavos > 0 && (
          <div className={estilos.linha}><span>Itens</span><span>{formatarMoeda(bruto)}</span></div>
        )}
        {orcamento.descontoCentavos > 0 && (
          <div className={estilos.linha}><span>Desconto</span><span>{formatarMoeda(-orcamento.descontoCentavos)}</span></div>
        )}
        <div className={estilos.total}><span>Total</span><strong><Reais centavos={orcamento.totalCentavos} /></strong></div>
        <p className={estilos.pagamento}>
          {pagamento.entradaCentavos > 0
            ? `Entrada de ${formatarMoeda(pagamento.entradaCentavos)} e ${pagamento.parcelas.length} ${pagamento.parcelas.length === 1 ? "parcela" : "parcelas"} de ${formatarMoeda(pagamento.parcelas[0])}.`
            : pagamento.parcelas.length > 1
              ? `${pagamento.parcelas.length} parcelas de ${formatarMoeda(pagamento.parcelas[0])}.`
              : "Pagamento à vista."}
        </p>
        {orcamento.observacao && <p className={estilos.observacao}>{orcamento.observacao}</p>}

        <div className={estilos.acoes}>
          {situacao === "enviado" || situacao === "visto" ? <AprovarOrcamento token={token} /> : null}
          {conversa && <a className={estilos.secundario} href={conversa} target="_blank" rel="noopener noreferrer">Falar com a loja</a>}
        </div>
        <p className={estilos.nota}>Feito com o Tino. Este link mostra só este orçamento.</p>
      </article>
    </main>
  )
}

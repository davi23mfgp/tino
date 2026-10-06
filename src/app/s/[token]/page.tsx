import { prisma } from "@/lib/prisma"
import { formatarMoeda } from "@/lib/dinheiro"
import { ETAPAS, numeroDaOrdem, type Etapa } from "@/lib/loja/agenda"
import estilos from "../../o/[token]/orcamento.module.css"
import passos from "./servico.module.css"

export const dynamic = "force-dynamic"
export const metadata = { title: "Seu serviço", robots: { index: false, follow: false }, referrer: "no-referrer" as const }

const TOKEN_VALIDO = /^[A-Za-z0-9_-]{32}$/

/**
 * Acompanhamento do serviço, para o cliente (o link da opção C do passo 37;
 * a opção A, escolhida, oferece o botão que manda este link).
 *
 * Só leitura e sem contar visita: aqui o cliente não decide nada, só vê em
 * que pé está o aparelho. "Esperando peça" aparece como é, porque esconder o
 * motivo da demora gera a ligação que o link existe para evitar.
 */
export default async function Servico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const ordem = TOKEN_VALIDO.test(token)
    ? await prisma.ordemServicoLoja.findUnique({
        where: { linkToken: token },
        include: { loja: { select: { nome: true, telefoneContato: true, lar: { select: { fusoHorario: true } } } }, cliente: { select: { nome: true } } },
      })
    : null

  if (!ordem) {
    return (
      <main className={estilos.fundo}>
        <section className={estilos.papel}>
          <h1 className={estilos.indisponivel}>Serviço não encontrado</h1>
          <p className={estilos.nota}>O link pode estar incompleto. Peça para a loja mandar de novo.</p>
        </section>
      </main>
    )
  }

  const fuso = ordem.loja.lar.fusoHorario
  const etapasEm = (ordem.etapasEm as Record<string, string> | null) ?? {}
  const atual = ETAPAS.findIndex((etapa) => etapa.valor === (ordem.etapa as Etapa))
  // Para o cliente, a etapa que ficou para trás sem acontecer some (o
  // aparelho que não esperou peça não mostra "esperando peça"), e "esperando
  // peça" só aparece se a OS passou por ela.
  const visiveis = ETAPAS.filter((etapa, indice) => {
    if (indice < atual && !etapasEm[etapa.valor]) return false
    return etapa.valor !== "ESPERANDO_PECA" || etapasEm.ESPERANDO_PECA || ordem.etapa === "ESPERANDO_PECA"
  })
  const quando = (iso?: string) => (iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: fuso, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(",", "") : "")
  const telefone = ordem.loja.telefoneContato?.replace(/\D/g, "")
  const conversa = telefone ? `https://wa.me/${telefone.length <= 11 ? `55${telefone}` : telefone}?text=${encodeURIComponent(`Olá! Sobre o serviço ${numeroDaOrdem(ordem.numero)}:`)}` : null

  return (
    <main className={estilos.fundo}>
      <article className={estilos.papel}>
        <header className={estilos.cabeca}>
          <div><h1>{ordem.loja.nome}</h1></div>
          <div className={estilos.numero}><span>Serviço</span><strong>{numeroDaOrdem(ordem.numero)}</strong></div>
        </header>
        <p className={estilos.para}>{ordem.objeto} de <b>{ordem.cliente.nome}</b> · {ordem.servico}</p>
        {ordem.etapa === "PRONTO" && <p className={estilos.aviso} data-tom="bom">Está pronto. Pode buscar quando quiser.</p>}
        {ordem.prazoEm && ordem.etapa !== "PRONTO" && ordem.etapa !== "ENTREGUE" && (
          <p className={estilos.aviso} data-tom="bom">Previsão: {quando(ordem.prazoEm.toISOString())}.</p>
        )}
        <ol className={passos.passos}>
          {visiveis.map((etapa) => {
            const indice = ETAPAS.findIndex((item) => item.valor === etapa.valor)
            const estado = indice < atual ? "feito" : indice === atual ? "agora" : "depois"
            return (
              <li key={etapa.valor} data-estado={estado}>
                <span aria-hidden>{estado === "feito" ? "✓" : ""}</span>
                <b>{etapa.doCliente}</b>
                <small>{estado === "agora" && !etapasEm[etapa.valor] ? "agora" : quando(etapasEm[etapa.valor])}</small>
              </li>
            )
          })}
        </ol>
        {ordem.valorCentavos !== null && (
          <div className={estilos.total}><span>Valor combinado</span><strong>{formatarMoeda(ordem.valorCentavos)}</strong></div>
        )}
        {conversa && <div className={estilos.acoes}><a className={estilos.secundario} href={conversa} target="_blank" rel="noopener noreferrer">Falar com a loja</a></div>}
        <p className={estilos.nota}>Este link mostra só este serviço.</p>
      </article>
    </main>
  )
}

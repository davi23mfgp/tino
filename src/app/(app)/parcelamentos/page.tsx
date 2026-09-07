import { prisma } from "@/lib/prisma"
import { sessaoDaPagina } from "@/lib/pagina"
import { rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { compromissosFuturos, resumoParcelamentos } from "@/lib/parcelamentos"
import { Barra, Cartao, Metrica, Vazio } from "@/components/ui/painel"

export const dynamic = "force-dynamic"

export default async function Parcelamentos() {
  const sessao = await sessaoDaPagina()

  const [parcelamentos, resumo, compromissos] = await Promise.all([
    prisma.parcelamento.findMany({
      where: { larId: sessao.larId, ativo: true },
      include: { parcelas: { orderBy: { numero: "asc" } }, conta: { select: { nome: true } } },
      orderBy: { dataCompra: "desc" },
    }),
    resumoParcelamentos(sessao.larId),
    compromissosFuturos(sessao.larId, 18),
  ])

  const emAndamento = parcelamentos.filter((linha) => linha.parcelas.some((parcela) => !parcela.paga))
  const finalizados = parcelamentos.length - emAndamento.length

  return (
    <div className="space-y-4">
      <Cartao titulo="Compras parceladas">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metrica rotulo="Em andamento" valor={String(resumo.emAndamento)} detalhe={`${finalizados} finalizadas`} />
          <Metrica rotulo="Valor total" valor={formatarMoeda(resumo.valorTotalCentavos)} />
          <Metrica rotulo="Já pago" valor={formatarMoeda(resumo.jaPagoCentavos)} tom="positivo" />
          <Metrica rotulo="Restante" valor={formatarMoeda(resumo.restanteCentavos)} tom="atencao" />
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-[12px] text-muted-fg">
            <span>Progresso geral</span>
            <span>{resumo.percentualPago}% pago</span>
          </div>
          <Barra percentual={resumo.percentualPago} tom="verde" />
          {resumo.ultimaCompetencia && (
            <p className="text-[12px] text-muted-fg">
              Última parcela: {rotuloCompetencia(resumo.ultimaCompetencia)}
            </p>
          )}
        </div>
      </Cartao>

      <Cartao titulo="Quanto cai em cada mês">
        <div className="space-y-3">
          {compromissos.map((linha) => (
            <div key={linha.competencia}>
              <div className="flex items-center justify-between text-sm">
                <span>{rotuloCompetencia(linha.competencia)}</span>
                <span className="font-medium">{formatarMoeda(linha.totalCentavos)}</span>
              </div>
              <div className="mt-1">
                <Barra
                  percentual={(linha.totalCentavos / Math.max(1, compromissos[0].totalCentavos)) * 100}
                  tom="ambar"
                />
              </div>
              <p className="mt-1 text-[12px] text-muted-fg">
                {linha.itens
                  .slice(0, 3)
                  .map((item) => `${item.descricao} ${item.numero}/${item.de}`)
                  .join(" · ")}
                {linha.itens.length > 3 && ` · +${linha.itens.length - 3}`}
              </p>
            </div>
          ))}
          {compromissos.length === 0 && <Vazio titulo="Nenhuma parcela futura" />}
        </div>
      </Cartao>

      <div className="space-y-3">
        {emAndamento.map((parcelamento) => {
          const pagas = parcelamento.parcelas.filter((parcela) => parcela.paga).length
          const restante = parcelamento.parcelas
            .filter((parcela) => !parcela.paga)
            .reduce((soma, parcela) => soma + parcela.valorCentavos, 0)

          return (
            <Cartao key={parcelamento.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{parcelamento.descricao}</p>
                  <p className="text-[12px] text-muted-fg">
                    {pagas}/{parcelamento.parcelasTotal} · {formatarMoeda(parcelamento.parcelaCentavos)}/mês ·{" "}
                    {parcelamento.conta.nome}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-atencao">{formatarMoeda(restante)}</p>
                  <p className="text-[12px] text-muted-fg">restante</p>
                </div>
              </div>

              <div className="mt-3">
                <Barra percentual={(pagas / parcelamento.parcelasTotal) * 100} tom="verde" />
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-[12px] text-muted-fg">ver parcelas</summary>
                <ul className="mt-2 space-y-1">
                  {parcelamento.parcelas.map((parcela) => (
                    <li
                      key={parcela.id}
                      className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs ${
                        parcela.paga ? "bg-acao/10 text-acao" : "bg-papel-2"
                      }`}
                    >
                      <span>
                        {parcela.numero}/{parcelamento.parcelasTotal}
                      </span>
                      <span className="text-muted-fg">{rotuloCompetencia(parcela.competencia, true)}</span>
                      <span>{formatarMoeda(parcela.valorCentavos)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </Cartao>
          )
        })}

        {emAndamento.length === 0 && (
          <Vazio titulo="Nenhuma compra parcelada" texto="Importe a fatura do cartão para o Tino encontrar as parcelas." />
        )}
      </div>
    </div>
  )
}

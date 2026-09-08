import { prisma } from "@/lib/prisma"
import { sessaoDaPagina } from "@/lib/pagina"
import { formatarData } from "@/lib/datas"
import { formatarDecimal, formatarMoeda } from "@/lib/dinheiro"
import { projetarMeta } from "@/lib/financeiro"
import { Barra, Cartao, Valor, Vazio } from "@/components/ui/painel"
import { NovaMeta } from "@/components/nova-meta"

export const dynamic = "force-dynamic"

const ROTULO_TIPO: Record<string, string> = {
  RESERVA_EMERGENCIA: "Reserva de emergência",
  VIAGEM: "Viagem",
  APOSENTADORIA: "Aposentadoria",
  IMOVEL: "Imóvel",
  VEICULO: "Veículo",
  EDUCACAO: "Educação",
  QUITAR_DIVIDA: "Quitar dívida",
  OUTRO: "Meta",
}

export default async function Metas() {
  const sessao = await sessaoDaPagina()

  const metas = await prisma.meta.findMany({
    where: { larId: sessao.larId, status: { in: ["ATIVA", "PAUSADA"] } },
    orderBy: [{ prioridade: "desc" }, { criadoEm: "asc" }],
  })

  const concluidas = await prisma.meta.count({ where: { larId: sessao.larId, status: "CONCLUIDA" } })

  return (
    <div className="space-y-4">
      <Cartao titulo="Metas">
        <p className="text-sm text-muted-fg">
          A ordem que o Tino defende: sair de dívida cara, montar a reserva, depois metas de prazo curto e, por
          último, o longo prazo. Aporte só entra depois que o mês fecha no positivo.
        </p>
        {concluidas > 0 && (
          <p className="mt-2 text-xs text-positivo">{concluidas} meta(s) já concluída(s).</p>
        )}

        <NovaMeta />
      </Cartao>

      <div className="grid gap-4 lg:grid-cols-2">
        {metas.map((meta) => {
          const projecao = projetarMeta({
            alvoCentavos: meta.alvoCentavos,
            saldoAtualCentavos: meta.saldoCentavos,
            aporteMensalCentavos: meta.aporteMensalCentavos,
            rendimentoAnualBps: meta.rendimentoAnualBps,
            dataAlvo: meta.dataAlvo,
          })

          return (
            <Cartao key={meta.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{meta.nome}</p>
                  <p className="text-[12px] text-muted-fg">{ROTULO_TIPO[meta.tipo] ?? "Meta"}</p>
                </div>
                <div className="text-right">
                  <Valor tamanho="medio">{formatarMoeda(meta.saldoCentavos)}</Valor>
                  <p className="text-[12px] text-muted-fg">de {formatarMoeda(meta.alvoCentavos)}</p>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                <Barra percentual={projecao.percentual} tom="verde" />
                <div className="flex justify-between text-[12px] text-muted-fg">
                  <span>{projecao.percentual.toFixed(0)}%</span>
                  <span>
                    {projecao.mesesRestantes === null
                      ? "sem aporte suficiente"
                      : `faltam ${projecao.mesesRestantes} meses`}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-1 text-xs">
                <p className="text-muted-fg">
                  Aporte atual: {formatarMoeda(meta.aporteMensalCentavos)}/mês
                  {meta.rendimentoAnualBps > 0 && ` · rendendo ${formatarDecimal(meta.rendimentoAnualBps / 100, 1)}% a.a.`}
                </p>
                {meta.dataAlvo && (
                  <p className={projecao.noPrazo ? "text-positivo" : "text-atencao"}>
                    Alvo: {formatarData(meta.dataAlvo)}.{" "}
                    {projecao.noPrazo
                      ? "Está no prazo"
                      : `Precisaria de ${formatarMoeda(projecao.aporteNecessarioCentavos)}/mês`}
                  </p>
                )}
                {projecao.dataPrevista && !meta.dataAlvo && (
                  <p className="text-muted-fg">
                    No ritmo atual, você chega lá em {formatarData(projecao.dataPrevista)}.
                  </p>
                )}
              </div>

              {meta.observacao && <p className="mt-3 text-[12px] text-muted-fg">{meta.observacao}</p>}
            </Cartao>
          )
        })}

        {metas.length === 0 && (
          <Vazio titulo="Nenhuma meta ativa" texto="Crie uma meta para o Tino calcular quanto guardar por mês." />
        )}
      </div>
    </div>
  )
}

import { sessaoDaPagina } from "@/lib/pagina"
import { competenciaAtual, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda, formatarPercentual } from "@/lib/dinheiro"
import { montarPlanoDoLar } from "@/lib/tino/plano-do-lar"
import { Cartao, Metrica, Vazio } from "@/components/ui/painel"

export const dynamic = "force-dynamic"

export default async function Plano() {
  const sessao = await sessaoDaPagina()
  const competencia = competenciaAtual()

  const { alvos, plano, capacidadeMensalCentavos } = await montarPlanoDoLar(sessao.larId, competencia)

  const totalDivida = alvos.reduce((soma, alvo) => soma + alvo.saldoCentavos, 0)

  return (
    <div className="space-y-4">
      <Cartao titulo="Plano de pagamento">
        {alvos.length === 0 ? (
          <Vazio
            titulo="Nenhuma dívida aberta"
            texto="Sem saldo negativo, fatura em aberto ou empréstimo cadastrado — nada a atacar por aqui."
          />
        ) : (
          <>
            <p className="text-sm leading-relaxed">{plano.primeiroPasso}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <Metrica rotulo="Dívida total" valor={formatarMoeda(totalDivida)} tom="negativo" />
              <Metrica
                rotulo="Livre em"
                valor={plano.mesesAteLimpar ? `${plano.mesesAteLimpar} meses` : "não fecha"}
                tom={plano.mesesAteLimpar ? "positivo" : "atencao"}
              />
              <Metrica rotulo="Juros no caminho" valor={formatarMoeda(plano.totalJurosCentavos)} tom="atencao" />
              <Metrica
                rotulo="Sobra estimada/mês"
                valor={formatarMoeda(capacidadeMensalCentavos)}
                tom={capacidadeMensalCentavos > 0 ? "positivo" : "negativo"}
              />
            </div>

            {plano.avisos.map((aviso) => (
              <p key={aviso} className="mt-4 rounded-2xl border border-atencao/40 bg-atencao/10 p-3 text-sm text-atencao">
                {aviso}
              </p>
            ))}
          </>
        )}
      </Cartao>

      {alvos.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Cartao titulo="Ordem de ataque (do juro mais caro)">
            <ol className="space-y-3">
              {plano.ordem.map((alvo, indice) => (
                <li key={alvo.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-papel-2 text-[11px]">
                      {indice + 1}
                    </span>
                    <span>
                      {alvo.nome}
                      <span className="block text-[12px] text-muted-fg">
                        {alvo.jurosMensalBps > 0
                          ? `${formatarPercentual(alvo.jurosMensalBps)} ao mês`
                          : "sem juros enquanto for paga integral"}
                      </span>
                    </span>
                  </span>
                  <span className="whitespace-nowrap">{formatarMoeda(alvo.saldoCentavos)}</span>
                </li>
              ))}
            </ol>
          </Cartao>

          <Cartao titulo="Roteiro mês a mês">
            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {plano.passos.map((passo) => (
                <div key={passo.competencia} className="rounded-[var(--raio-cartao)] border border-pauta p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{rotuloCompetencia(passo.competencia)}</span>
                    <span className={passo.sobraCentavos < 0 ? "text-negativo" : "text-positivo"}>
                      sobra {formatarMoeda(passo.sobraCentavos)}
                    </span>
                  </div>

                  <p className="mt-1 text-[12px] text-muted-fg">
                    parcelas já contratadas: {formatarMoeda(passo.parcelasFixasCentavos)} · juros do mês:{" "}
                    {formatarMoeda(passo.jurosDoMesCentavos)}
                  </p>

                  {passo.pagamentos.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {passo.pagamentos.map((pagamento) => (
                        <li key={pagamento.id} className="flex justify-between text-xs">
                          <span className="text-muted-fg">
                            {pagamento.nome} <span className="opacity-60">({pagamento.motivo})</span>
                          </span>
                          <span>{formatarMoeda(pagamento.valorCentavos)}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="mt-2 text-xs">
                    resta depois deste mês:{" "}
                    <span className="font-medium">{formatarMoeda(passo.dividaRestanteCentavos)}</span>
                  </p>
                </div>
              ))}
            </div>
          </Cartao>
        </div>
      )}
    </div>
  )
}

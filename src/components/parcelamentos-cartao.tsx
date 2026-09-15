"use client"

import { useEffect, useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { competenciaMaisMeses, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import estilos from "./central-cartoes.module.css"
import { Abertura } from "@/components/abertura"
import { ComprometidoPorMes } from "@/components/comprometido-por-mes"

import type { CompraParcelada } from "@/lib/cartoes"

type Parcelamento = CompraParcelada

/**
 * Compras parceladas, uma linha por compra.
 *
 * O calendário inteiro ficava aberto embaixo de cada compra — doze linhas
 * iguais para dizer "duzentos reais por mês". Aqui a compra mostra o quanto já
 * foi pago e quanto falta, e quem quiser um mês específico escolhe no filtro.
 */
export function ParcelamentosDoCartao({
  parcelamentos,
  mes,
  aoEditar,
  aoExcluir,
}: {
  parcelamentos: Parcelamento[]
  mes: string
  aoEditar: (parcelamento: Parcelamento) => void
  aoExcluir: (alvo: { id: string; nome: string; tipo: "parcelamentos" }) => void
}) {
  // O total que falta e a régua dos próximos meses. Antes a aba abria direto
  // na lista de compras: cada linha dizia o seu pedaço e nenhuma dizia quanto
  // do mês que vem já está gasto.
  const aberto = parcelamentos.flatMap((linha) => linha.parcelas.filter((parcela) => !parcela.paga))
  const restanteCentavos = aberto.reduce((soma, parcela) => soma + parcela.valorCentavos, 0)
  const ultima = [...aberto].sort((a, b) => a.competencia.localeCompare(b.competencia)).at(-1)
  const porMes = Array.from({ length: 5 }, (_, indice) => {
    const competencia = competenciaMaisMeses(mes, indice)
    return {
      competencia,
      totalCentavos: aberto
        .filter((parcela) => parcela.competencia === competencia)
        .reduce((soma, parcela) => soma + parcela.valorCentavos, 0),
    }
  })

  return (
    <div className={estilos.parcelamentos}>
      {parcelamentos.length > 0 && (
        <Abertura
          rotulo="Gastos parcelados"
          titulo={<>Faltam <em>{formatarMoeda(restanteCentavos)}</em> nas suas compras parceladas.</>}
          apoio={
            <>
              {parcelamentos.length} {parcelamentos.length === 1 ? "compra" : "compras"}
              {ultima ? <> · a última fecha em {rotuloCompetencia(ultima.competencia, true)}</> : null}.
            </>
          }
        >
          <ComprometidoPorMes meses={porMes} className="mt-0 w-full" />
        </Abertura>
      )}

      {parcelamentos.map((parcelamento) => (
        <Parcelado
          key={parcelamento.id}
          parcelamento={parcelamento}
          mes={mes}
          aoEditar={aoEditar}
          aoExcluir={aoExcluir}
        />
      ))}
    </div>
  )
}

function Parcelado({
  parcelamento,
  mes,
  aoEditar,
  aoExcluir,
}: {
  parcelamento: Parcelamento
  mes: string
  aoEditar: (parcelamento: Parcelamento) => void
  aoExcluir: (alvo: { id: string; nome: string; tipo: "parcelamentos" }) => void
}) {
  const temNoMes = parcelamento.parcelas.some((parcela) => parcela.competencia === mes)
  const doMesOuPrimeira = temNoMes ? mes : parcelamento.parcelas[0]?.competencia ?? ""
  const [competencia, setCompetencia] = useState(doMesOuPrimeira)

  // O detalhe acompanha o mês da tela. Sem isto ele ficava no mês em que foi
  // montado: trocar o mês no cabeçalho deixava o resumo falando de setembro e a
  // parcela ao lado falando de agosto, sem nada indicando a diferença. Quem
  // quiser ver outro mês continua escolhendo no seletor abaixo — a escolha vale
  // até o mês da tela mudar de novo.
  useEffect(() => { setCompetencia(doMesOuPrimeira) }, [doMesOuPrimeira])
  const escolhida = parcelamento.parcelas.find((parcela) => parcela.competencia === competencia)
  const restantes = parcelamento.parcelasTotal - parcelamento.parcelasPagas
  const faltaCentavos = restantes * parcelamento.parcelaCentavos
  const progresso = parcelamento.parcelasTotal ? (parcelamento.parcelasPagas / parcelamento.parcelasTotal) * 100 : 0

  return (
    <article>
      <header>
        <span>
          <strong>{parcelamento.descricao}</strong>
          <small>{formatarMoeda(parcelamento.parcelaCentavos)} por mês · termina em {rotuloCompetencia(parcelamento.parcelas.at(-1)?.competencia ?? competencia, true)}</small>
        </span>
        <b>{parcelamento.parcelasPagas}<span>/{parcelamento.parcelasTotal}</span></b>
        <button aria-label={`Editar ${parcelamento.descricao}`} onClick={() => aoEditar(parcelamento)}><Pencil /></button>
        <button aria-label={`Excluir ${parcelamento.descricao}`} onClick={() => aoExcluir({ id: parcelamento.id, nome: parcelamento.descricao, tipo: "parcelamentos" })}><Trash2 /></button>
      </header>

      <div className={estilos.trilhoParcela}><i style={{ width: `${progresso}%` }} /></div>

      <footer className={estilos.rodapeParcela}>
        <span>Faltam <b>{restantes}</b> {restantes === 1 ? "parcela" : "parcelas"} · <b>{formatarMoeda(faltaCentavos)}</b></span>
        {!temNoMes && <small>fora de {rotuloCompetencia(mes, true)}</small>}
        <Select value={competencia} onValueChange={setCompetencia}>
          <SelectTrigger aria-label={`Ver parcela de qual mês em ${parcelamento.descricao}`} className="h-10 w-[168px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {parcelamento.parcelas.map((parcela) => (
              <SelectItem key={parcela.id} value={parcela.competencia}>
                {rotuloCompetencia(parcela.competencia, true)} · {parcela.numero}/{parcelamento.parcelasTotal}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {escolhida && <span data-paga={escolhida.paga}>{escolhida.paga ? "paga" : "prevista"}</span>}
      </footer>
    </article>
  )
}

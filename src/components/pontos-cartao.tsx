"use client"

import { useEffect, useState } from "react"
import { buscar, enviar } from "@/lib/cliente"
import { calcularPontos, configuracaoPontos, type ConfiguracaoPontos } from "@/lib/pontos-cartao"
import { resumoDoMes, type DadosCartao } from "@/lib/cartoes"
import { competenciaMaisMeses, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import type { Cotacao } from "@/lib/cambio"
import estilos from "./pontos-cartao.module.css"

const INICIAL: ConfiguracaoPontos = { programa: "Manual", unidade: "pontos", moeda: "real", taxaMilesimos: 0, saldoAtual: null, cambioMilesimos: null }
export function PontosCartao({ cartao, mes }: { cartao: DadosCartao; mes: string }) {
  const [regra, setRegra] = useState(INICIAL)
  const [carregando, setCarregando] = useState(true)
  const [falhou, setFalhou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [estado, setEstado] = useState("")
  const [cotacao, setCotacao] = useState<Cotacao | null>(null)
  const [buscandoCambio, setBuscandoCambio] = useState(false)
  useEffect(() => {
    let ativo = true
    setCarregando(true); setFalhou(false)
    buscar<unknown>(`/api/cartoes/${cartao.id}/pontos`).then((dados) => {
      if (!ativo) return
      const lida = configuracaoPontos.safeParse(dados)
      setRegra(lida.success ? lida.data : INICIAL)
    }).catch(() => { if (ativo) { setFalhou(true); setEstado("Não consegui carregar a configuração. Reabra para tentar novamente.") } })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [cartao.id])
  useEffect(() => {
    if (regra.moeda !== "dolar") return
    let ativo = true
    setBuscandoCambio(true)
    buscar<Cotacao | null>("/api/cambio").then((valor) => { if (ativo) setCotacao(valor) }).catch(() => { if (ativo) setCotacao(null) }).finally(() => { if (ativo) setBuscandoCambio(false) })
    return () => { ativo = false }
  }, [regra.moeda])
  function alterar<K extends keyof ConfiguracaoPontos>(campo: K, valor: ConfiguracaoPontos[K]) {
    setRegra((atual) => ({ ...atual, [campo]: valor })); setEstado("")
  }
  async function salvar() {
    if (!configuracaoPontos.safeParse(regra).success) { setEstado("Revise os valores da configuração."); return }
    setSalvando(true)
    try { await enviar(`/api/cartoes/${cartao.id}/pontos`, regra, "PUT"); setEstado("Configuração salva para este cartão.") }
    catch (erro) { setEstado(erro instanceof Error ? erro.message : "Não consegui salvar.") }
    finally { setSalvando(false) }
  }
  const resumo = resumoDoMes(cartao, mes)
  const cambio = regra.cambioMilesimos === null ? cotacao?.valor ?? null : regra.cambioMilesimos / 1000
  const pontos = regra.taxaMilesimos > 0 ? calcularPontos(resumo.gastos, resumo.creditos, regra, cambio) : null
  const numero = (valor: number | null) => valor === null ? "Não informado" : valor.toLocaleString("pt-BR")
  if (carregando) return <p role="status">Carregando pontos e milhas…</p>
  return <div className={estilos.painel}>
    <header><h3>Pontos e milhas · {cartao.nome}</h3><p>Acompanhe seu saldo e o que as compras podem render.</p></header>
    <div className={estilos.resumo}>
      <div><small>Saldo informado · {regra.programa}</small><strong>{numero(regra.saldoAtual)}</strong><span>{regra.unidade} no programa</span></div>
      <div><small>Previsão · {rotuloCompetencia(mes)}</small><strong>{numero(pontos)}</strong><span>{regra.unidade} com a fatura registrada</span></div>
    </div>
    <details className={estilos.configuracao} open={regra.taxaMilesimos === 0 || undefined}>
      <summary>Configurar acúmulo e saldo</summary>
      <fieldset disabled={falhou || salvando} className={estilos.campos}>
        <label>Programa<input maxLength={80} value={regra.programa} list={`programas-${cartao.id}`} onChange={(e) => alterar("programa", e.target.value)} /><datalist id={`programas-${cartao.id}`}>{["Livelo", "Esfera", "Smiles", "LATAM Pass", "Azul Fidelidade"].map((nome) => <option key={nome} value={nome} />)}</datalist></label>
        <label>Unidade<select value={regra.unidade} onChange={(e) => alterar("unidade", e.target.value as "pontos" | "milhas")}><option value="pontos">Pontos</option><option value="milhas">Milhas</option></select></label>
        <label>Regra<select value={regra.moeda} onChange={(e) => alterar("moeda", e.target.value as "real" | "dolar")}><option value="real">Por real gasto</option><option value="dolar">Por dólar gasto</option></select></label>
        <label>{regra.unidade} por {regra.moeda === "real" ? "R$ 1" : "US$ 1"}<input type="number" min="0" max="1000" step="0.001" value={regra.taxaMilesimos / 1000 || ""} placeholder="Ex.: 2,2" onChange={(e) => alterar("taxaMilesimos", Math.round(Number(e.target.value) * 1000))} /></label>
        <label>Saldo atual no programa<input type="number" min="0" max="2147483647" step="1" placeholder="Informe o saldo" value={regra.saldoAtual ?? ""} onChange={(e) => alterar("saldoAtual", e.target.value === "" ? null : Number(e.target.value))} /></label>
        {regra.moeda === "dolar" && <label>Câmbio manual · R$ por US$ 1<input type="number" min="0.001" step="0.001" placeholder="Usar cotação automática" value={regra.cambioMilesimos === null ? "" : regra.cambioMilesimos / 1000} onChange={(e) => alterar("cambioMilesimos", e.target.value === "" ? null : Math.round(Number(e.target.value) * 1000))} /></label>}
        <button type="button" onClick={() => void salvar()}>{salvando ? "Salvando…" : "Salvar configuração"}</button>
      </fieldset>
    </details>
    <p role="status" className={estilos.apoio}>{estado}</p>
    {regra.moeda === "dolar" && <p className={estilos.apoio}>{buscandoCambio ? "Buscando câmbio…" : cambio ? `Câmbio usado: R$ ${cambio.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}${regra.cambioMilesimos === null ? ` · ${cotacao?.fonte ?? "automático"}${cotacao?.data ? ` · ${cotacao.data}` : ""}` : " · informado por você"}` : "Informe o câmbio para calcular."}</p>}
    <div className={estilos.projecao}><h4>Previsão das parcelas futuras</h4>{[1, 2, 3].map((indice) => {
      const competencia = competenciaMaisMeses(mes, indice)
      const futuro = resumoDoMes(cartao, competencia)
      const estimativa = regra.taxaMilesimos > 0 ? calcularPontos(futuro.previsto, 0, regra, cambio) : null
      return <div key={competencia}><span>{rotuloCompetencia(competencia)}</span><small>{formatarMoeda(futuro.previsto)} em parcelas</small><b>{numero(estimativa)} {regra.unidade}</b></div>
    })}</div>
    <p className={estilos.apoio}>Base da fatura: {formatarMoeda(Math.max(0, resumo.gastos - resumo.creditos))}, após créditos. Previsões são estimativas com a regra informada; compras elegíveis e câmbio podem variar. Parcelas futuras são mostradas separadamente para evitar duplicidade. O saldo é informado por você e não é atualizado automaticamente pelo programa.</p>
  </div>
}

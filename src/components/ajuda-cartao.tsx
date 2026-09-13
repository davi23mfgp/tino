"use client"

import { useState } from "react"
import { ArrowRight, BadgeDollarSign, CircleDollarSign, ListChecks, PiggyBank } from "lucide-react"
import estilos from "./ajuda-cartao.module.css"
import { resumoDoMes, type DadosCartao } from "@/lib/cartoes"
import { formatarMoeda } from "@/lib/dinheiro"

const PROGRAMAS = ["Manual", "Livelo", "Esfera", "Smiles", "LATAM Pass", "Azul Fidelidade"]

export function AjudaCartao({ cartao, mes }: { cartao: DadosCartao; mes: string }) {
  const [objetivo, setObjetivo] = useState<"economia" | "pontos" | "fatura">("economia")
  const [programa, setPrograma] = useState("Manual")
  const [moeda, setMoeda] = useState<"real" | "dolar">("real")
  const [taxa, setTaxa] = useState("1")
  const [cambio, setCambio] = useState("5,50")
  const [reducao, setReducao] = useState("10")
  const resumo = resumoDoMes(cartao, mes)
  const maior = resumo.categorias[0]
  const percentual = Math.min(100, Math.max(0, Number(reducao.replace(",", ".")) || 0))
  const taxaNumero = Math.max(0, Number(taxa.replace(",", ".")) || 0)
  const cambioNumero = Math.max(.01, Number(cambio.replace(",", ".")) || 1)
  const baseReais = resumo.gastos / 100
  const pontos = Math.floor((moeda === "real" ? baseReais : baseReais / cambioNumero) * taxaNumero)

  return <section className={estilos.painel}>
    <header><div><p>Assistente do cartão</p><h2>Escolha o que quer melhorar</h2></div></header>
    <div className={estilos.objetivos}>
      <button aria-pressed={objetivo === "economia"} onClick={() => setObjetivo("economia")}><PiggyBank /><span><b>Economizar</b><small>Encontre onde reduzir</small></span><ArrowRight /></button>
      <button aria-pressed={objetivo === "pontos"} onClick={() => setObjetivo("pontos")}><CircleDollarSign /><span><b>Pontos e milhas</b><small>Simule com sua regra</small></span><ArrowRight /></button>
      <button aria-pressed={objetivo === "fatura"} onClick={() => setObjetivo("fatura")}><ListChecks /><span><b>Conferir fatura</b><small>Veja o que falta revisar</small></span><ArrowRight /></button>
    </div>

    {objetivo === "economia" && <div className={estilos.resultado}><span className={estilos.icone}><PiggyBank /></span><div><small>Maior oportunidade</small><h3>{maior?.nome ?? "Registre compras para comparar"}</h3>{maior && <><p>{formatarMoeda(maior.totalCentavos)} neste mês</p><label>Redução desejada <input type="range" min="0" max="50" value={reducao} onChange={(e) => setReducao(e.target.value)} /><b>{percentual}%</b></label><strong>Economia possível: {formatarMoeda(Math.round(maior.totalCentavos * percentual / 100))}</strong></>}</div></div>}

    {objetivo === "pontos" && <div className={estilos.resultado}><span className={estilos.icone}><BadgeDollarSign /></span><div className={estilos.pontos}><small>Estimativa pelas compras registradas</small><h3>{pontos.toLocaleString("pt-BR")} pontos</h3><div className={estilos.campos}><label>Programa<select value={programa} onChange={(e) => setPrograma(e.target.value)}>{PROGRAMAS.map((nome) => <option key={nome}>{nome}</option>)}</select></label><label>Regra<select value={moeda} onChange={(e) => setMoeda(e.target.value as "real" | "dolar")}><option value="real">Pontos por real</option><option value="dolar">Pontos por dólar</option></select></label><label>Taxa<input inputMode="decimal" value={taxa} onChange={(e) => setTaxa(e.target.value)} /></label>{moeda === "dolar" && <label>Câmbio do emissor<input inputMode="decimal" value={cambio} onChange={(e) => setCambio(e.target.value)} /></label>}</div><p>Base: {formatarMoeda(resumo.gastos)}. Estimativa manual; confirme elegibilidade e regra no emissor.</p></div></div>}

    {objetivo === "fatura" && <div className={estilos.resultado}><span className={estilos.icone}><ListChecks /></span><div><small>Próxima ação</small><h3>{resumo.compras.filter((compra) => !compra.categoriaId).length ? "Organize compras sem categoria" : "Compare com a fatura do banco"}</h3><p>{formatarMoeda(resumo.gastos)} em compras · {formatarMoeda(resumo.creditos)} em créditos</p><ul><li>{resumo.compras.length} compras registradas</li><li>{resumo.compras.filter((compra) => !compra.categoriaId).length} sem categoria</li><li>{cartao.diaVencimento ? `Vence dia ${cartao.diaVencimento}` : "Vencimento não informado"}</li></ul></div></div>}
  </section>
}

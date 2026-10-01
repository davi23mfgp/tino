"use client"

import { useState } from "react"
import { ArrowUpRight, Plane } from "lucide-react"
import { PontosCartao } from "./pontos-cartao"
import { PROGRAMAS_MILHAS } from "@/lib/programas-milhas"
import type { DadosCartao } from "@/lib/cartoes"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import estilos from "./central-milhas.module.css"

export function LogoPrograma({ nome }: { nome: string }) {
  const [falhou, setFalhou] = useState(false)
  const programa = PROGRAMAS_MILHAS.find((item) => item.nome.toLowerCase() === nome.toLowerCase())
  return <span className={estilos.logo}>{programa && !falhou ? <img src={`${programa.site}/favicon.ico`} alt={programa.nome} onError={() => setFalhou(true)} /> : <Plane size={20} strokeWidth={1.5} aria-hidden />}</span>
}

export function CentralMilhas({ cartoes, mes }: { cartoes: DadosCartao[]; mes: string }) {
  const [selecionado, setSelecionado] = useState(cartoes[0]?.id ?? "")
  const [quantidade, setQuantidade] = useState("10000")
  const [bonus, setBonus] = useState("0")
  const [custo, setCusto] = useState("")
  const pontos = Math.max(0, Math.floor(Number(quantidade) || 0))
  const recebidos = Math.floor(pontos * (1 + Math.max(0, Number(bonus) || 0) / 100))
  const custoCentavos = paraCentavos(custo || "0")
  const cartao = cartoes.find((item) => item.id === selecionado)
  return <div className={estilos.pagina}>
    <header><h1>Pontos e milhas</h1><p>Seus programas, acúmulo e próximos movimentos.</p></header>
    <div className={estilos.programas}>{PROGRAMAS_MILHAS.map((programa) => <a key={programa.nome} href={programa.site} target="_blank" rel="noopener noreferrer" style={{ "--cor-programa": programa.cor } as React.CSSProperties}>
      <LogoPrograma nome={programa.nome} /><strong>{programa.nome}</strong><span>Comprar, transferir ou resgatar <ArrowUpRight size={14} aria-hidden /></span>
    </a>)}</div>
    <section className={estilos.secao}>
      <header><h2>Acúmulo dos seus cartões</h2><p>Selecione um cartão para administrar a regra, o saldo informado e a previsão.</p></header>
      {cartoes.length > 0 ? <><div className={estilos.seletor} role="group" aria-label="Cartão para acompanhar milhas">{cartoes.map((item) => <button type="button" key={item.id} aria-pressed={item.id === selecionado} onClick={() => setSelecionado(item.id)}>{item.nome}</button>)}</div>{cartao && <PontosCartao key={cartao.id} cartao={cartao} mes={mes} />}</> : <p>Cadastre um cartão para configurar seu acúmulo.</p>}
    </section>
    <section className={estilos.secao}>
      <header><h2>Planejar compra ou transferência</h2><p>Compare o bônus e o custo antes de concluir no programa.</p></header>
      <div className={estilos.simulacao}>
        <label>Pontos a comprar ou enviar<input inputMode="numeric" type="number" min="0" step="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} /></label>
        <label>Bônus da oferta (%)<input type="number" min="0" step="1" value={bonus} onChange={(e) => setBonus(e.target.value)} /></label>
        <label>Custo total (R$)<input inputMode="decimal" value={custo} placeholder="0,00" onChange={(e) => setCusto(e.target.value)} /></label>
        <div><small>Recebimento estimado</small><strong>{recebidos.toLocaleString("pt-BR")}</strong><small>{recebidos > 0 ? `${formatarMoeda(Math.round(custoCentavos * 1000 / recebidos))} por mil pontos recebidos` : "Informe a quantidade"}</small></div>
      </div>
      <details><summary>Antes de transferir ou comprar</summary><p>Confira a conversão entre programas, validade, limite da oferta e elegibilidade ao bônus. A simulação considera conversão de 1 para 1; ela não movimenta seu saldo. Compra, transferência e resgate são realizados no site oficial, sem acesso automático à sua conta.</p></details>
    </section>
  </div>
}

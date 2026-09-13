"use client"
import { useState } from "react"
import { resumoDoMes,type DadosCartao } from "@/lib/cartoes"
import { formatarMoeda } from "@/lib/dinheiro"
import { Cartao } from "@/components/ui/painel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
export function AjudaCartao({cartao,mes}:{cartao:DadosCartao;mes:string}) {
  const [ajuda,setAjuda]=useState("economia");const [taxa,setTaxa]=useState("1");const [reducao,setReducao]=useState("10")
  const resumo=resumoDoMes(cartao,mes);const maior=resumo.categorias[0]
  const percentual=Math.min(100,Math.max(0,Number(reducao)||0));const pontos=Math.floor(resumo.gastos/100*Math.max(0,Number(taxa)||0))
  return <Cartao titulo="Ajuda para este cartão"><p className="mb-4 text-sm text-muted-fg">Análise dos seus registros. Escolha um objetivo.</p><div className="mb-5 flex flex-wrap gap-2">{[["economia","Economizar"],["milhas","Pontos e milhas"],["fatura","Organizar fatura"]].map(([id,nome])=><Button key={id} variant={ajuda===id?"default":"outline"} onClick={()=>setAjuda(id)}>{nome}</Button>)}</div>
  {ajuda==="economia"&&<div className="space-y-3"><h3 className="text-lg font-semibold">{maior?`${maior.nome} concentra mais gastos`:"Registre compras para comparar categorias"}</h3>{maior&&<><p className="text-sm text-muted-fg">{formatarMoeda(maior.totalCentavos)} nesta categoria, neste mês.</p><label className="block text-sm">Redução que deseja simular (%)<Input className="max-w-40" type="number" min="0" max="100" value={reducao} onChange={e=>setReducao(e.target.value)}/></label><p className="text-xl font-semibold text-acao">Economia possível: {formatarMoeda(Math.round(maior.totalCentavos*percentual/100))}</p><p className="text-sm text-muted-fg">Revise as compras desta categoria antes de definir um corte.</p></>}</div>}
  {ajuda==="milhas"&&<div className="space-y-3"><h3 className="text-lg font-semibold">Simule os pontos das compras já feitas</h3><label className="block text-sm">Pontos por real, conforme seu programa<Input className="max-w-40" type="number" min="0" step="0.01" value={taxa} onChange={e=>setTaxa(e.target.value)}/></label><p className="text-2xl font-semibold">{pontos.toLocaleString("pt-BR")} pontos estimados</p><p className="text-sm text-muted-fg">Base: {formatarMoeda(resumo.gastos)} registrados. Informe a taxa equivalente em reais se seu programa pontua em dólar. Confira compras elegíveis, validade, anuidade e regras de transferência no banco. Pontos não justificam gastar além do planejado.</p></div>}
  {ajuda==="fatura"&&<div className="space-y-3"><h3 className="text-lg font-semibold">Confira antes do vencimento</h3><p>{formatarMoeda(resumo.gastos)} em compras · {formatarMoeda(resumo.creditos)} em créditos registrados.</p><p className="text-sm text-muted-fg">{resumo.compras.filter(c=>!c.categoriaId).length} lançamentos sem categoria. {cartao.diaVencimento?`Vencimento cadastrado: dia ${cartao.diaVencimento}.`:"Cadastre o vencimento nas configurações."}</p><p className="text-sm text-muted-fg">Importe a fatura, revise compras desconhecidas e compare o total com o documento do banco. Parcelas previstas não são confirmação de cobrança.</p></div>}
  </Cartao>
}

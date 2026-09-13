"use client"
import { useState } from "react"
import { enviar } from "@/lib/cliente"
import { paraCentavos, formatarDecimal } from "@/lib/dinheiro"
import type { CompraCartao, CompraParcelada } from "@/lib/cartoes"
import { SeletorCategoria } from "@/components/seletor-categoria"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SelectNative } from "@/components/ui/select-native"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
export function CompraCartaoForm({contaId,categorias,compra,parcelamento,fechar,salvou}:{contaId:string;categorias:{id:string;nome:string}[];compra?:CompraCartao;parcelamento?:CompraParcelada;fechar:()=>void;salvou:()=>void}) {
  const [descricao,setDescricao]=useState(compra?.descricao??parcelamento?.descricao??"")
  const [valor,setValor]=useState(compra?formatarDecimal(compra.valorCentavos / 100, 2):"")
  const [data,setData]=useState(compra?.data??new Date().toISOString().slice(0,10))
  const [categoria,setCategoria]=useState(compra?.categoriaId??parcelamento?.categoriaId??"")
  const [quantidade,setQuantidade]=useState("1")
  const [pagas,setPagas]=useState(String(parcelamento?.parcelasPagas??0))
  const [primeiroMes,setPrimeiroMes]=useState(new Date().toISOString().slice(0,7))
  const [erro,setErro]=useState(""); const [ocupado,setOcupado]=useState(false)
  async function salvar(e:React.FormEvent) {e.preventDefault();setOcupado(true);setErro("");try {
    if(parcelamento) await enviar(`/api/parcelamentos/${parcelamento.id}`,{descricao,categoriaId:categoria||null,parcelasPagas:Number(pagas)},"PATCH")
    else if(compra) await enviar(`/api/transacoes/${compra.id}`,{descricao,valorCentavos:paraCentavos(valor),data,categoriaId:categoria||null},"PATCH")
    else if(Number(quantidade)>1) await enviar("/api/parcelamentos",{contaId,descricao,valorTotalCentavos:paraCentavos(valor),parcelasTotal:Number(quantidade),dataCompra:data,primeiraCompetencia:primeiroMes,categoriaId:categoria||null})
    else await enviar("/api/transacoes",{contaId,descricao,valorCentavos:paraCentavos(valor),data,categoriaId:categoria||null,tipo:"DESPESA"})
    salvou();fechar()
  }catch(e){setErro(e instanceof Error?e.message:"Não foi possível salvar.")}finally{setOcupado(false)}}
  return <Dialog open onOpenChange={a=>{if(!a&&!ocupado)fechar()}}><DialogContent><DialogHeader><DialogTitle>{compra||parcelamento?"Editar compra":"Nova compra"}</DialogTitle><DialogDescription>{parcelamento?"Atualize a descrição e as parcelas pagas.":"Registre no cartão selecionado."}</DialogDescription></DialogHeader><form onSubmit={salvar} className="space-y-4">
    <label className="block text-sm">Descrição<Input required maxLength={200} value={descricao} onChange={e=>setDescricao(e.target.value)} /></label>
    {!parcelamento&&<div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Valor total (R$)<Input required inputMode="decimal" value={valor} onChange={e=>setValor(e.target.value)} /></label><label className="text-sm">Data da compra<Input required type="date" value={data} onChange={e=>setData(e.target.value)} /></label></div>}
    <SeletorCategoria opcoes={categorias} valor={categoria||null} aoMudar={id=>setCategoria(id??"")}/>
    {!compra&&!parcelamento&&<label className="block text-sm">Parcelas<Input type="number" min="1" max="120" required value={quantidade} onChange={e=>setQuantidade(e.target.value)}/></label>}
    {!compra&&!parcelamento&&Number(quantidade)>1&&<><label className="block text-sm">Primeira fatura<Input type="month" required value={primeiroMes} onChange={e=>setPrimeiroMes(e.target.value)}/></label><p className="text-sm text-muted-fg">Gera a previsão de parcelas. A fatura importada confirma os lançamentos.</p></>}
    {parcelamento&&<label className="block text-sm">Parcelas pagas<Input type="number" required min="0" max={parcelamento.parcelasTotal} value={pagas} onChange={e=>setPagas(e.target.value)}/></label>}
    {erro&&<p role="alert" className="text-sm text-negativo">{erro}</p>}
    <Button type="submit" className="w-full" disabled={ocupado}>{ocupado?"Salvando…":"Salvar compra"}</Button>
  </form></DialogContent></Dialog>
}

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
/** Parcelas mais comuns em botão: digitar "3" num campo numérico era o passo mais lento da compra (revisão de 19/10). */
const PARCELAS_COMUNS = ["1", "2", "3", "6", "10", "12"]

export function CompraCartaoForm({contaId,nomeCartao,categorias,compra,parcelamento,fechar,salvou,embutido=false}:{contaId:string;nomeCartao?:string;categorias:{id:string;nome:string}[];compra?:CompraCartao;parcelamento?:CompraParcelada;fechar:()=>void;salvou:()=>void;embutido?:boolean}) {
  const [descricao,setDescricao]=useState(compra?.descricao??parcelamento?.descricao??"")
  const [valor,setValor]=useState(compra?formatarDecimal(compra.valorCentavos / 100, 2):"")
  const [data,setData]=useState(compra?.data??new Date().toISOString().slice(0,10))
  const [categoria,setCategoria]=useState(compra?.categoriaId??parcelamento?.categoriaId??"")
  const [quantidade,setQuantidade]=useState("1")
  const [pagas,setPagas]=useState(String(parcelamento?.parcelasPagas??0))
  // Vazio: a primeira parcela segue o fechamento do cartão, como a compra à
  // vista. Antes vinha o mês atual, e a parcelada depois do fechamento caía
  // numa fatura já fechada (revisão de 19/10).
  const [primeiroMes,setPrimeiroMes]=useState("")
  // Vazio quer dizer "usa a regra do cartão". Só quem sabe que a compra caiu
  // noutra fatura preenche isto — por isso o campo vive recolhido.
  const [fatura,setFatura]=useState("")
  const [outroNumero,setOutroNumero]=useState(false)
  const [erro,setErro]=useState(""); const [ocupado,setOcupado]=useState(false)
  async function salvar(e:React.FormEvent) {e.preventDefault();setOcupado(true);setErro("");try {
    if(parcelamento) await enviar(`/api/parcelamentos/${parcelamento.id}`,{descricao,categoriaId:categoria||null,parcelasPagas:Number(pagas)},"PATCH")
    else if(compra) await enviar(`/api/transacoes/${compra.id}`,{descricao,valorCentavos:paraCentavos(valor),data,categoriaId:categoria||null},"PATCH")
    else if(Number(quantidade)>1) await enviar("/api/parcelamentos",{contaId,descricao,valorTotalCentavos:paraCentavos(valor),parcelasTotal:Number(quantidade),dataCompra:data,primeiraCompetencia:primeiroMes||undefined,categoriaId:categoria||null})
    else await enviar("/api/transacoes",{contaId,descricao,valorCentavos:paraCentavos(valor),data,categoriaId:categoria||null,tipo:"DESPESA",competenciaFatura:fatura||undefined})
    salvou();fechar()
  }catch(e){setErro(e instanceof Error?e.message:"Não foi possível salvar.")}finally{setOcupado(false)}}
  const formulario=<form onSubmit={salvar} className="grid gap-4 px-4 py-4 sm:px-6 sm:py-5 sm:grid-cols-2">
    {nomeCartao&&!compra&&!parcelamento&&<p className="flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-foreground/[0.05] px-4 text-sm sm:col-span-2"><span className="text-muted-fg">No cartão</span><b className="truncate">{nomeCartao}</b></p>}
    {/* O valor vem primeiro e grande: é o que a pessoa tem na cabeça quando
        abre a compra; o resto tem padrão. */}
    {!parcelamento&&<label className="grid gap-1.5 text-sm sm:col-span-2">Valor total (R$)<Input required inputMode="decimal" autoFocus={!compra} value={valor} onChange={e=>setValor(e.target.value)} placeholder="0,00" className="h-14 text-2xl font-light tabular-nums" /></label>}
    <label className="block text-sm sm:col-span-2">Descrição<Input required maxLength={200} value={descricao} onChange={e=>setDescricao(e.target.value)} placeholder="Onde comprou" /></label>
    {!compra&&!parcelamento&&<div className="grid gap-2 sm:col-span-2"><span className="text-sm">Parcelas</span>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Parcelas">
        {PARCELAS_COMUNS.map(n=><button key={n} type="button" aria-pressed={!outroNumero&&quantidade===n} onClick={()=>{setOutroNumero(false);setQuantidade(n)}} className="min-h-11 rounded-full border border-pauta px-4 text-sm font-semibold aria-pressed:border-transparent aria-pressed:bg-[oklch(var(--primary))] aria-pressed:text-[oklch(var(--primary-foreground))]">{n==="1"?"À vista":`${n}x`}</button>)}
        <button type="button" aria-pressed={outroNumero} onClick={()=>setOutroNumero(true)} className="min-h-11 rounded-full border border-pauta px-4 text-sm font-semibold aria-pressed:border-transparent aria-pressed:bg-[oklch(var(--primary))] aria-pressed:text-[oklch(var(--primary-foreground))]">outro</button>
      </div>
      {outroNumero&&<Input type="number" min="1" max="120" required value={quantidade} onChange={e=>setQuantidade(e.target.value)} aria-label="Número de parcelas" autoFocus />}
      {Number(quantidade)>1&&paraCentavos(valor||"0")>0&&<p className="text-sm text-muted-fg">{quantidade} parcelas de cerca de R$ {formatarDecimal(paraCentavos(valor)/Number(quantidade)/100,2)}</p>}
    </div>}
    <div className="grid gap-1.5 text-sm sm:col-span-2"><span>Categoria</span><SeletorCategoria opcoes={categorias} valor={categoria||null} aoMudar={id=>setCategoria(id??"")} vazio="escolher a categoria"/></div>
    {!parcelamento&&<label className="text-sm sm:col-span-2">Data da compra<Input required type="date" value={data} onChange={e=>setData(e.target.value)} /></label>}
    {!compra&&!parcelamento&&Number(quantidade)>1&&<details className="text-sm sm:col-span-2"><summary className="flex min-h-11 cursor-pointer items-center text-muted-fg">A primeira parcela caiu em outra fatura?</summary><label className="mt-2 block">Mês da primeira fatura<Input type="month" value={primeiroMes} onChange={e=>setPrimeiroMes(e.target.value)}/></label><p className="mt-1 text-muted-fg">Em branco, o Tino usa o fechamento e o vencimento do cartão.</p></details>}
    {!compra&&!parcelamento&&Number(quantidade)<=1&&<details className="text-sm sm:col-span-2"><summary className="flex min-h-11 cursor-pointer items-center text-muted-fg">Essa compra caiu em outra fatura?</summary><label className="mt-2 block">Mês da fatura<Input type="month" value={fatura} onChange={e=>setFatura(e.target.value)}/></label><p className="mt-1 text-muted-fg">Em branco, o Tino usa o fechamento e o vencimento do cartão.</p></details>}
    {parcelamento&&<label className="block text-sm">Parcelas pagas<Input type="number" required min="0" max={parcelamento.parcelasTotal} value={pagas} onChange={e=>setPagas(e.target.value)}/></label>}
    {erro&&<p role="alert" className="text-sm text-negativo">{erro}</p>}
    <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={fechar}>Cancelar</Button><Button type="submit" disabled={ocupado}>{ocupado?"Salvando…":"Salvar compra"}</Button></div>
  </form>
  if(embutido)return formulario
  return <Dialog open onOpenChange={a=>{if(!a&&!ocupado)fechar()}}><DialogContent><DialogHeader><DialogTitle>{compra||parcelamento?"Editar compra":"Nova compra"}</DialogTitle><DialogDescription>{parcelamento?"Atualize a descrição e as parcelas pagas.":"Registre no cartão selecionado."}</DialogDescription></DialogHeader>{formulario}</DialogContent></Dialog>
}

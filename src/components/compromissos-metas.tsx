"use client"
import Link from "next/link"
import {useEffect,useState} from "react"
import {buscar} from "@/lib/cliente"
import {formatarMoeda} from "@/lib/dinheiro"
import {Cartao} from "@/components/ui/painel"
export function CompromissosMetas(){const [metas,setMetas]=useState<{id:string;nome:string;compromissoMensal:boolean;status:string;previstoCentavos:number;realizadoCentavos:number;pendenteCentavos:number}[]>([]);const [erro,setErro]=useState(false);useEffect(()=>{buscar<typeof metas>("/api/metas").then(setMetas).catch(()=>setErro(true))},[]);const fixas=metas.filter(m=>m.compromissoMensal&&m.status==="ATIVA");if(!fixas.length&&!erro)return null;return <Cartao titulo="Compromissos com suas metas">{erro?<p role="alert">Não foi possível carregar metas. <Link href="/metas" className="underline">Abrir metas</Link></p>:fixas.map(m=><Link key={m.id} href="/metas" className="flex flex-wrap justify-between gap-2 border-b border-pauta py-3 text-sm"><span>{m.nome}</span><span>{formatarMoeda(m.pendenteCentavos)} a guardar · {formatarMoeda(m.realizadoCentavos)} realizado</span></Link>)}<p className="mt-3 text-xs text-muted-fg">A previsão reserva o aporte mensal. Confirme o aporte em Metas quando acontecer.</p></Cartao>}

"use client"
import {useEffect,useState} from "react"
import {buscar} from "@/lib/cliente"
import {Button} from "@/components/ui/button"
interface Dados{configurado:boolean;endereco:string|null;arquivos:{id:string;arquivoNome:string;criadoEm:string}[]}
export function FaturasEmail({contaId,aoEscolher}:{contaId:string;aoEscolher:(arquivo:File,id:string)=>void}){
 const [dados,setDados]=useState<Dados|null>(null);const [erro,setErro]=useState("");const [ocupado,setOcupado]=useState(false)
 useEffect(()=>{if(!contaId)return;const c=new AbortController();setDados(null);buscar<Dados>(`/api/faturas-email?contaId=${encodeURIComponent(contaId)}`,{signal:c.signal}).then(setDados).catch(()=>{if(!c.signal.aborted)setErro("Não foi possível carregar faturas recebidas.")});return ()=>c.abort()},[contaId])
 async function abrir(id:string,nome:string){setOcupado(true);setErro("");try{const r=await fetch(`/api/faturas-email/${id}`);if(!r.ok)throw new Error();aoEscolher(new File([await r.blob()],nome,{type:nome.endsWith(".pdf")?"application/pdf":"application/octet-stream"}),id)}catch{setErro("Não foi possível abrir o arquivo.")}finally{setOcupado(false)}}
 return <section className="rounded-2xl border border-pauta bg-papel-2 p-4"><h3 className="font-semibold">Receber faturas por e-mail</h3><p className="mt-2 text-sm text-muted-fg">{dados?.configurado?"Encaminhe a fatura para este endereço. No seu e-mail, você pode criar uma regra para encaminhar automaticamente as mensagens do banco.":"O recebimento por e-mail ainda precisa ser ativado pelo administrador. Enquanto isso, envie o arquivo abaixo."}</p>{dados?.endereco&&<p className="mt-3 break-all rounded-xl bg-background p-3 text-sm select-all">{dados.endereco}</p>}<p className="mt-2 text-xs text-muted-fg">Receber é automático. Os lançamentos entram após sua conferência.</p>{dados?.arquivos.map(a=><div key={a.id} className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm"><span>{a.arquivoNome}</span><Button variant="outline" disabled={ocupado} onClick={()=>void abrir(a.id,a.arquivoNome)}>Conferir fatura</Button></div>)}{erro&&<p role="alert" className="mt-2 text-negativo">{erro}</p>}</section>
}

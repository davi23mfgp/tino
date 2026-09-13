"use client"
import {useEffect,useState} from "react"
import {buscar,enviar} from "@/lib/cliente"
import {formatarMoeda,paraCentavos} from "@/lib/dinheiro"
import {Cartao,Vazio} from "@/components/ui/painel"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {SelectNative} from "@/components/ui/select-native"
import {IdentidadeBanco} from "@/components/banco-perfil"
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog"
interface Conta{id:string;nome:string;instituicao:string|null;tipo:string;saldoCentavos:number}
export function CarteiraInvestimentos(){
 const [contas,setContas]=useState<Conta[]>([]);const [abrir,setAbrir]=useState(false);const [movimento,setMovimento]=useState<Conta|null>(null);const [erro,setErro]=useState("");const [ocupado,setOcupado]=useState(false)
 async function carregar(){try{setContas(await buscar<Conta[]>("/api/contas"))}catch{setErro("Não foi possível carregar os investimentos.")}}
 useEffect(()=>{void carregar()},[])
 const ativos=contas.filter(c=>c.tipo==="INVESTIMENTO");const origens=contas.filter(c=>!["CARTAO_CREDITO","INVESTIMENTO"].includes(c.tipo))
 async function salvar(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const dados=new FormData(e.currentTarget);setOcupado(true);setErro("");try{
 if(movimento){const retirada=dados.get("direcao")==="resgate";await enviar("/api/transacoes",{contaId:retirada?movimento.id:dados.get("conta"),contaDestinoId:retirada?dados.get("conta"):movimento.id,tipo:"TRANSFERENCIA",valorCentavos:paraCentavos(String(dados.get("valor"))),descricao:`${retirada?"Resgate":"Aporte"} — ${movimento.nome}`,data:new Date().toISOString().slice(0,10)})}
 else await enviar("/api/contas",{nome:dados.get("nome"),instituicao:dados.get("instituicao"),tipo:"INVESTIMENTO",saldoInicialCentavos:paraCentavos(String(dados.get("valor")))})
 setAbrir(false);setMovimento(null);await carregar()
 }catch(e){setErro(e instanceof Error?e.message:"Não foi possível salvar.")}finally{setOcupado(false)}}
 return <Cartao titulo="Sua carteira" acao={<Button onClick={()=>setAbrir(true)}>Cadastrar investimento</Button>}><p className="text-3xl font-semibold tracking-tight">{formatarMoeda(ativos.reduce((s,c)=>s+c.saldoCentavos,0))}</p><p className="mt-1 text-sm text-muted-fg">Saldo cadastrado e movimentações. Cotações não são atualizadas automaticamente.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{ativos.map(c=><div key={c.id} className="rounded-2xl border border-pauta bg-papel-2 p-4"><div className="flex items-center gap-3"><IdentidadeBanco instituicao={c.instituicao}/><div><h3 className="font-semibold">{c.nome}</h3><p className="text-xs text-muted-fg">{c.instituicao??"Instituição não informada"}</p></div></div><p className="my-4 text-xl font-semibold">{formatarMoeda(c.saldoCentavos)}</p><Button variant="outline" onClick={()=>{setMovimento(c);setAbrir(true)}}>Aportar ou resgatar</Button></div>)}</div>{!ativos.length&&<Vazio titulo="Cadastre o que você já investe" texto="Use o nome do ativo ou da aplicação. O saldo passa a compor seu patrimônio."/>}{erro&&!abrir&&<p role="alert" className="text-negativo">{erro}</p>}
 <Dialog open={abrir} onOpenChange={a=>{if(!ocupado){setAbrir(a);if(!a)setMovimento(null)}}}><DialogContent><DialogHeader><DialogTitle>{movimento?movimento.nome:"Novo investimento"}</DialogTitle><DialogDescription>{movimento?"Movimente entre a carteira e sua conta.":"Informe o valor que já possui nessa aplicação."}</DialogDescription></DialogHeader><form onSubmit={salvar} className="space-y-4">{movimento?<><label className="block text-sm">Movimento<SelectNative name="direcao"><option value="aporte">Aporte</option><option value="resgate">Resgate</option></SelectNative></label><label className="block text-sm">Conta de origem ou destino<SelectNative name="conta" required><option value="">Escolha uma conta</option>{origens.map(c=><option value={c.id} key={c.id}>{c.nome}</option>)}</SelectNative></label></>:<><label className="block text-sm">Investimento<Input name="nome" required placeholder="Ex.: CDB, Tesouro, fundo ou ação"/></label><label className="block text-sm">Banco ou corretora<Input name="instituicao"/></label></>}<label className="block text-sm">Valor (R$)<Input name="valor" required inputMode="decimal"/></label>{erro&&<p role="alert" className="text-negativo">{erro}</p>}<Button disabled={ocupado} type="submit">{ocupado?"Salvando…":"Salvar"}</Button></form></DialogContent></Dialog>
 </Cartao>
}

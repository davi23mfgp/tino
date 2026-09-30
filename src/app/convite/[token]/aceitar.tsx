"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { enviar } from "@/lib/cliente"
export function AceitarConvite({ token }: { token: string }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  async function confirmar() {
    setOcupado(true); setErro(null)
    try { await enviar("/api/convites/aceitar", { token }); router.push("/painel"); router.refresh() }
    catch (e) { setErro(e instanceof Error ? e.message : "Não consegui aceitar."); setOcupado(false) }
  }
  return <div className="space-y-3"><button disabled={ocupado} onClick={confirmar} className="min-h-11 rounded-full bg-primary px-5 py-3 text-primary-foreground">{ocupado ? "Entrando…" : "Aceitar convite"}</button><button disabled={ocupado} onClick={async () => { await enviar("/api/convites/aceitar", {}, "DELETE"); router.push("/painel"); router.refresh() }} className="ml-3 min-h-11 text-sm text-muted-fg">Agora não</button>{erro && <p role="alert" className="text-sm text-negativo">{erro}</p>}</div>
}

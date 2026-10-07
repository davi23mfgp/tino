"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { buscar, enviar } from "@/lib/cliente"
import { Switch } from "@/components/ui/switch"
import { showToast } from "@/components/ui/toast"

import { EscolherAjuda } from "../simples/blocos"
import { formatarTelefone } from "../clientes/comum"

/** O liga e desliga do modo simples (passo 50, opção A) e quem o "Pedir ajuda" chama. */
export function ConfigModoSimples() {
  const router = useRouter()
  const [estado, setEstado] = useState<{ ligado: boolean; ajudaNome: string | null; ajudaTelefone: string | null } | null>(null)
  const [escolher, setEscolher] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    buscar<{ ligado: boolean; ajudaNome: string | null; ajudaTelefone: string | null }>("/api/loja/modo-simples").then(setEstado).catch(() => setEstado(null))
  }, [])

  async function trocar(ligado: boolean) {
    setOcupado(true)
    try {
      const novo = await enviar<{ ligado: boolean; ajudaNome: string | null; ajudaTelefone: string | null }>("/api/loja/modo-simples", { ligado }, "PUT")
      setEstado(novo)
      showToast(ligado ? "Modo simples ligado." : "Modo simples desligado.")
      // O menu mora no layout do servidor: o refresh troca "Visão geral" por "Início".
      if (ligado) router.push("/loja/simples")
      router.refresh()
    } catch (falha) {
      showToast(falha instanceof Error ? falha.message : "Não consegui trocar.", { variant: "error" })
    } finally {
      setOcupado(false)
    }
  }

  if (!estado) return <p className="text-sm text-muted-fg">Carregando…</p>
  return (
    <div className="grid gap-4">
      <label className="flex min-h-11 items-center justify-between gap-4">
        <span>
          <span className="block font-medium">Modo simples</span>
          <span className="block text-sm font-normal text-muted-fg">Seis botões grandes no lugar da Visão geral: vender, fiado, agenda, quanto tenho, DAS e pedir ajuda.</span>
        </span>
        <Switch checked={estado.ligado} onCheckedChange={(ligado) => void trocar(ligado)} disabled={ocupado} aria-label="Modo simples" />
      </label>
      <div className="flex min-h-11 items-center justify-between gap-4 border-t border-pauta pt-4">
        <span>
          <span className="block font-medium">Quem te ajuda</span>
          <span className="block text-sm text-muted-fg">{estado.ajudaTelefone ? `${estado.ajudaNome ? `${estado.ajudaNome} · ` : ""}${formatarTelefone(estado.ajudaTelefone)}` : "Ninguém ainda. O botão \"Pedir ajuda\" abre o WhatsApp dessa pessoa."}</span>
        </span>
        <button type="button" className="min-h-11 shrink-0 rounded-full border border-pauta px-4 text-sm font-semibold" onClick={() => setEscolher(true)}>{estado.ajudaTelefone ? "Trocar" : "Escolher"}</button>
      </div>
      <EscolherAjuda
        key={String(escolher)}
        aberto={escolher}
        inicial={{ nome: estado.ajudaNome, telefone: estado.ajudaTelefone }}
        aoFechar={() => setEscolher(false)}
        aoSalvar={(dados) => { setEstado({ ...estado, ajudaNome: dados.nome, ajudaTelefone: dados.telefone }); setEscolher(false) }}
      />
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"

import { buscar, enviar } from "@/lib/cliente"
import { Switch } from "@/components/ui/switch"
import { Cartao } from "@/components/ui/painel"

interface Vigia {
  tipo: string
  nome: string
  frase: string
  ativo: boolean
  disparos30dias: number
}

/**
 * Os vigias — item 5 do redesign de 07/09/2026.
 *
 * Não são um produto novo: são o motor de alertas que o Tino já tinha
 * (`lib/tino/alertas.ts`), agora com nome curto, liga/desliga por tipo e a
 * contagem de disparos dos últimos 30 dias como histórico. Sem marketplace,
 * sem plano pago por vigia — o brief foi explícito nisso.
 */
export function VigiasConfig() {
  const [vigias, setVigias] = useState<Vigia[] | null>(null)

  useEffect(() => {
    buscar<Vigia[]>("/api/vigias").then(setVigias)
  }, [])

  async function alternar(tipo: string, ativo: boolean) {
    // Otimista: o toque precisa responder na hora, não depois da rede.
    setVigias((atuais) => atuais?.map((v) => (v.tipo === tipo ? { ...v, ativo } : v)) ?? null)
    await enviar("/api/vigias", { tipo, ativo }, "PATCH")
  }

  return (
    <Cartao titulo="Vigias" estatico>
      <p className="mb-4 text-[13px] text-muted-fg">
        O que o Tino observa sozinho e avisa sem você perguntar. Desligue o que não interessa — os outros continuam
        de olho.
      </p>

      <div className="space-y-1">
        {(vigias ?? []).map((vigia) => (
          <div key={vigia.tipo} className="flex items-center justify-between gap-4 rounded-2xl px-2 py-3">
            <div className="min-w-0">
              <p className="text-[14px] font-medium">{vigia.nome}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-fg">{vigia.frase}</p>
              {vigia.disparos30dias > 0 && (
                <p className="mt-1 text-[11px] text-[color:var(--texto-3)]">
                  {vigia.disparos30dias === 1
                    ? "disparou 1 vez nos últimos 30 dias"
                    : `disparou ${vigia.disparos30dias} vezes nos últimos 30 dias`}
                </p>
              )}
            </div>
            <Switch
              checked={vigia.ativo}
              onCheckedChange={(ativo) => alternar(vigia.tipo, ativo)}
              aria-label={`Ligar ou desligar: ${vigia.nome}`}
            />
          </div>
        ))}

        {vigias === null && <p className="px-2 py-3 text-sm text-muted-fg">Carregando...</p>}
      </div>
    </Cartao>
  )
}

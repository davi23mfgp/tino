"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { AlertTriangle, Bell, LogOut, Settings, ShieldCheck } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { cn } from "@/lib/utils"

interface Alerta {
  id: string
  titulo: string
  texto: string
  severidade: "INFO" | "ATENCAO" | "CRITICO"
  acaoRota: string | null
}

const COR: Record<Alerta["severidade"], string> = {
  CRITICO: "border-negativo/40 bg-negativo/10 text-negativo",
  ATENCAO: "border-atencao/40 bg-atencao/10 text-atencao",
  INFO: "border-pauta bg-papel-2 text-foreground",
}

/**
 * `admin` chega do layout, que já leu o banco. Ele controla só o atalho: a
 * proteção de verdade está na rota, e um atalho escondido nunca foi segurança.
 */
export function BarraTopo({ nome, admin }: { nome: string; admin?: boolean }) {
  const router = useRouter()
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    // Falha ao carregar alerta não pode quebrar a barra inteira: o resto da tela
    // continua útil mesmo sem eles.
    buscar<Alerta[]>("/api/tino/alertas")
      .then(setAlertas)
      .catch(() => setAlertas([]))
  }, [])

  const criticos = alertas.filter((alerta) => alerta.severidade === "CRITICO").length

  async function sair() {
    await enviar("/api/auth/logout", {})
    router.push("/login")
    router.refresh()
  }

  return (
    // A barra do topo é o terceiro elemento flutuante, junto da coluna e dos
    // cartões: cartão de vidro com margem, nunca faixa colada no topo.
    <header className="ios-card my-4 flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.06em] text-[color:var(--texto-3)]">Tino</p>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] lg:text-[26px]">
          Olá, {nome.split(" ")[0]}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setAberto((atual) => !atual)}
            className="relative rounded-full border border-pauta p-2.5 transition hover:border-acao/40"
            aria-label="Alertas"
          >
            <Bell className="h-4 w-4" />
            {alertas.length > 0 && (
              <span
                className={cn(
                  "absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                  criticos > 0 ? "bg-negativo text-white" : "bg-atencao text-primary-foreground",
                )}
              >
                {alertas.length}
              </span>
            )}
          </button>

          {aberto && (
            <div className="absolute right-0 top-12 z-50 w-[min(380px,90vw)] space-y-2 rounded-2xl border border-pauta bg-card p-3 shadow-alta">
              {alertas.length === 0 && (
                <p className="px-2 py-6 text-center text-sm text-muted-fg">
                  Nada urgente por aqui. Continue assim.
                </p>
              )}

              {alertas.map((alerta) => (
                <div key={alerta.id} className={cn("rounded-xl border p-3", COR[alerta.severidade])}>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {alerta.severidade === "CRITICO" && <AlertTriangle className="h-3.5 w-3.5" />}
                    {alerta.titulo}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed opacity-90">{alerta.texto}</p>
                  {alerta.acaoRota && (
                    <Link
                      href={alerta.acaoRota}
                      onClick={() => setAberto(false)}
                      className="mt-2 inline-block text-xs underline underline-offset-4"
                    >
                      Ver
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {admin && (
          <Link
            href="/admin"
            className="rounded-full border border-pauta p-2.5 transition hover:border-acao/40"
            aria-label="Administração"
          >
            <ShieldCheck className="h-4 w-4" />
          </Link>
        )}

        <Link
          href="/configuracoes"
          className="rounded-full border border-pauta p-2.5 transition hover:border-acao/40"
          aria-label="Configurações"
        >
          <Settings className="h-4 w-4" />
        </Link>

        <button
          onClick={sair}
          className="rounded-full border border-pauta p-2.5 transition hover:border-negativo/40"
          aria-label="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}

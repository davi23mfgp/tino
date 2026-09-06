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
export function BarraTopo({
  nome,
  admin,
  competencia,
}: {
  nome: string
  admin?: boolean
  /** Vem do servidor para bater com o mês que o painel mostra. Calcular aqui
      usaria o relógio do navegador, e na virada do mês a barra diria um mês e
      o painel outro. */
  competencia?: string
}) {
  const router = useRouter()
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [carregado, setCarregado] = useState(false)
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    // Falha ao carregar alerta não pode quebrar a barra inteira: o resto da tela
    // continua útil mesmo sem eles.
    buscar<Alerta[]>("/api/tino/alertas")
      .then(setAlertas)
      .catch(() => setAlertas([]))
      .finally(() => setCarregado(true))
  }, [])

  const criticos = alertas.filter((alerta) => alerta.severidade === "CRITICO").length

  async function sair() {
    await enviar("/api/auth/logout", {})
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="flex items-start justify-between gap-4 py-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--texto-3)]">Tino</p>
        {/* 22px com tracking de -0,025em, medido no protótipo. Estava em 26px
            e crescia para 30px no desktop, o que empurrava a linha de resumo
            para longe do título e quebrava o par. */}
        <h1 className="mt-0.5 text-[22px] font-semibold tracking-[-0.025em]">
          Olá, {nome.split(" ")[0]}
        </h1>
        {/* A linha de resumo só aparece depois que os alertas chegam. Antes
            disso ela diria "contas em ordem" sem ter conferido nada — e
            afirmar que está tudo certo por falta de dado é o defeito que esta
            base mais evita. */}
        {carregado && (
          <p className="mt-1 text-[13px] text-[color:var(--texto-2)]">
            {/* `first-letter` e não `capitalize`: o segundo maiusculiza TODA
                palavra e escrevia "Setembro De 2026". */}
            {competencia && <span className="first-letter:uppercase">{competencia}</span>}
            {competencia && " · "}
            {criticos > 0
              ? criticos === 1
                ? "1 decisão esperando você"
                : `${criticos} decisões esperando você`
              : alertas.length > 0
                ? "tem coisa para olhar"
                : "contas em ordem"}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setAberto((atual) => !atual)}
            className="relative rounded-full border border-pauta p-2.5 transition hover:border-acao/40"
            aria-label="Alertas"
          >
            <Bell className="h-4 w-4" />
            {/* Ponto, não número, como no protótipo. A quantidade exata de
                avisos não muda o que a pessoa faz — ela abre a lista de
                qualquer jeito. O que o ponto precisa dizer é "tem coisa
                aqui", e a cor dele diz se é urgente. A contagem continua
                anunciada para leitor de tela, onde ela é a única pista. */}
            {alertas.length > 0 && (
              <>
                <span
                  aria-hidden
                  className={cn(
                    "absolute right-1.5 top-1.5 size-2 rounded-full ring-2 ring-[var(--papel-1)]",
                    criticos > 0 ? "bg-negativo" : "bg-atencao",
                  )}
                />
                <span className="sr-only">
                  {alertas.length} {alertas.length === 1 ? "aviso" : "avisos"}
                </span>
              </>
            )}
          </button>

          {aberto && (
            <div className="absolute right-0 top-12 z-50 w-[min(380px,90vw)] space-y-2 rounded-[var(--raio-cartao)] border border-pauta bg-card p-3 shadow-alta">
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

        {/* A pessoa logada, como no protótipo. O nome some no celular, onde a
            largura vale mais que a confirmação de quem está logado — a
            inicial já resolve isso. */}
        <div className="ml-1 flex items-center gap-2 rounded-[var(--raio-pilula)] bg-papel-2 py-1 pl-1 pr-1 sm:pr-3">
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground"
          >
            {nome.trim().charAt(0).toUpperCase()}
          </span>
          <span className="hidden text-[13px] font-medium sm:inline">{nome.split(" ")[0]}</span>
        </div>
      </div>
    </header>
  )
}

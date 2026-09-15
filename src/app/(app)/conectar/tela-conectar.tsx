"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Banknote, CreditCard, Landmark, LineChart, PiggyBank, RefreshCw } from "lucide-react"

import { enviar } from "@/lib/cliente"
import { formatarMoeda } from "@/lib/dinheiro"
import { SemOpenFinance } from "@/components/sem-open-finance"
import { Skeleton } from "@/components/ui/skeleton"
import type { ContaConectada, EstadoOpenFinance } from "@/lib/open-finance/provedor"

import { BANCOS_VITRINE } from "./bancos"

/** Rótulo humano do tipo de conta — "CARTAO_CREDITO" não é palavra de gente. */
const ROTULO_TIPO: Record<string, string> = {
  CORRENTE: "Conta corrente",
  POUPANCA: "Poupança",
  CARTAO_CREDITO: "Cartão de crédito",
  INVESTIMENTO: "Investimento",
  DINHEIRO: "Dinheiro",
  PJ_MEI: "Conta do CNPJ",
}

const ICONE_TIPO: Record<string, typeof Landmark> = {
  CORRENTE: Landmark,
  POUPANCA: PiggyBank,
  CARTAO_CREDITO: CreditCard,
  INVESTIMENTO: LineChart,
  DINHEIRO: Banknote,
  PJ_MEI: Landmark,
}

/** Quadrado de banco da vitrine. Inicial, não logo — ver `bancos.ts`. */
function QuadradoBanco({ nome, inicial, cor }: { nome: string; inicial: string; cor: string }) {
  return (
    <div
      title={nome}
      aria-label={nome}
      className="grid size-14 shrink-0 place-items-center rounded-[18px] text-[calc(17px*var(--escala-letra))] font-semibold lowercase text-white shadow-[var(--sombra-ios)] sm:size-16"
      style={{ background: cor }}
    >
      {inicial}
    </div>
  )
}

function LinhaConta({ conta }: { conta: ContaConectada }) {
  const Icone = ICONE_TIPO[conta.tipo] ?? Landmark
  return (
    <div className="flex min-h-[56px] items-center gap-3 border-t border-[color:var(--pauta)] px-1 py-3 first:border-t-0">
      <div className="grid size-11 shrink-0 place-items-center rounded-full bg-foreground/[0.08] ring-1 ring-inset ring-border">
        <Icone className="size-[18px] text-foreground" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[calc(14px*var(--escala-letra))] font-medium text-foreground">{conta.nome}</p>
        <p className="truncate text-[calc(12px*var(--escala-letra))] text-[color:var(--texto-3)]">
          {[ROTULO_TIPO[conta.tipo] ?? conta.tipo, conta.instituicao].filter(Boolean).join(" · ")}
        </p>
      </div>
      <p className="shrink-0 text-[calc(14px*var(--escala-letra))] font-semibold tabular-nums text-foreground">
        {formatarMoeda(conta.saldoCentavos)}
      </p>
    </div>
  )
}

export function TelaConectar({ inicial }: { inicial: EstadoOpenFinance }) {
  const router = useRouter()
  const [estado, setEstado] = useState(inicial)
  const [conectando, setConectando] = useState(false)
  const [naoConfigurado, setNaoConfigurado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function conectar() {
    setErro(null)
    setConectando(true)
    try {
      const resposta = await enviar<{ url?: string; naoConfigurado?: boolean; motivo?: string }>("/api/openfinance", {})

      // Sem agregador contratado o Tino não finge conexão: assume que ainda
      // não está ligado e aponta para o caminho que funciona hoje.
      if (resposta.naoConfigurado || !resposta.url) {
        setNaoConfigurado(true)
        setConectando(false)
        return
      }

      // A autenticação acontece no site do banco, nunca dentro do Tino.
      window.location.href = resposta.url
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não consegui iniciar a conexão.")
      setConectando(false)
    }
  }

  async function sincronizar() {
    setErro(null)
    setConectando(true)
    try {
      await enviar("/api/openfinance", {}, "PUT")
      const atualizado = await fetch("/api/openfinance", { cache: "no-store" }).then((r) => r.json())
      setEstado(atualizado as EstadoOpenFinance)
      router.refresh()
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não consegui atualizar agora.")
    } finally {
      setConectando(false)
    }
  }

  // ── Conectando ────────────────────────────────────────────────────────
  if (conectando && !naoConfigurado) {
    return (
      <div className="mx-auto max-w-md py-10">
        <p className="mb-5 text-center text-[calc(15px*var(--escala-letra))] text-[color:var(--texto-2)]">Buscando suas contas…</p>
        <div className="ficha space-y-3 p-4">
          {[0, 1, 2].map((linha) => (
            <div key={linha} className="flex min-h-[56px] items-center gap-3">
              <Skeleton className="size-11 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-[60%]" />
                <Skeleton className="h-2.5 w-[35%]" />
              </div>
              <Skeleton className="h-4 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Conectado ─────────────────────────────────────────────────────────
  if (estado.contas.length > 0) {
    const total = estado.contas.reduce((soma, conta) => soma + conta.saldoCentavos, 0)
    const bancos = Array.from(new Set(estado.conexoes.map((c) => c.instituicao)))

    return (
      <div className="mx-auto max-w-md space-y-4 py-6">
        {estado.dadoFicticio && (
          <div className="ficha p-4 text-[calc(13px*var(--escala-letra))] leading-relaxed text-[color:var(--texto-2)]">
            <span className="font-medium text-atencao">Estes números são fictícios.</span> O Tino está em modo de teste
            (<code>OPEN_FINANCE_PROVIDER=sandbox</code>), sem banco de verdade ligado.
          </div>
        )}

        <div>
          <p className="text-[max(10px,calc(12px*var(--escala-letra)))] uppercase tracking-[0.14em] text-[color:var(--texto-3)]">Saldo total</p>
          <p className="mt-1 text-[calc(36px*var(--escala-letra))] font-bold leading-none tracking-tight tabular-nums text-foreground">
            {formatarMoeda(total)}
          </p>
          <p className="mt-2 text-[calc(12px*var(--escala-letra))] text-[color:var(--texto-3)]">
            {bancos.length === 1 ? bancos[0] : `${bancos.length} bancos conectados`}
          </p>
        </div>

        <div className="ficha px-4 py-1">
          {estado.contas.map((conta) => (
            <LinhaConta key={conta.id} conta={conta} />
          ))}
        </div>

        {erro && <p className="text-[calc(13px*var(--escala-letra))] text-negativo">{erro}</p>}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={sincronizar}
            className="ios-tap inline-flex min-h-[44px] items-center gap-2 rounded-[var(--raio-pilula)] bg-foreground/[0.08] px-5 text-[calc(14px*var(--escala-letra))] font-medium text-foreground"
          >
            <RefreshCw className="size-4" strokeWidth={1.8} />
            Atualizar agora
          </button>
          <Link href="/configuracoes" className="text-[calc(13px*var(--escala-letra))] text-[color:var(--texto-3)] underline-offset-4 hover:underline">
            Desconectar
          </Link>
        </div>
      </div>
    )
  }

  // ── Ainda não configurado ─────────────────────────────────────────────
  // O servidor já sabe que não há agregador: mostrar os caminhos que existem
  // antes de a pessoa tocar em "Conectar" e ouvir um não. `naoConfigurado`
  // continua valendo para o caso de o modo cair depois que a tela abriu.
  if (naoConfigurado || (!estado.configurado && estado.contas.length === 0)) {
    // O que fazer enquanto não há agregador contratado. Antes esta tela
    // oferecia um caminho só (mandar arquivo) e parecia que o app estava pela
    // metade — os outros dois já existiam e ninguém via.
    return <SemOpenFinance />
  }

  // ── Convite ───────────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col py-8">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {/* Grade de 6 bancos, igual à referência: dois blocos de três no
            celular, uma fileira só quando cabe. */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-2.5">
          {BANCOS_VITRINE.map((banco) => (
            <QuadradoBanco key={banco.nome} {...banco} />
          ))}
        </div>

        <h1 className="mt-8 text-balance text-[calc(26px*var(--escala-letra))] font-semibold leading-[1.15] tracking-tight text-foreground sm:text-[calc(28px*var(--escala-letra))]">
          Pra saber se o dinheiro chega até o fim do mês, o Tino precisa ler seu extrato
        </h1>

        <p className="mt-4 text-balance text-[calc(15px*var(--escala-letra))] leading-relaxed text-[color:var(--texto-3)]">
          Open Finance, regulado pelo Banco Central. A senha do banco não passa por aqui, e você desconecta quando
          quiser.
        </p>

        {erro && <p className="mt-5 text-[calc(13px*var(--escala-letra))] text-negativo">{erro}</p>}
      </div>

      <div className="mt-10 space-y-2">
        <button
          type="button"
          onClick={conectar}
          className="ios-tap flex min-h-[52px] w-full items-center justify-center rounded-[var(--raio-pilula)] bg-primary px-6 text-[calc(16px*var(--escala-letra))] font-semibold text-primary-foreground"
        >
          Conectar meu banco
        </button>
        <Link
          href="/painel"
          className="ios-tap flex min-h-[44px] w-full items-center justify-center text-[calc(15px*var(--escala-letra))] text-[color:var(--texto-3)]"
        >
          Agora não
        </Link>
      </div>
    </div>
  )
}

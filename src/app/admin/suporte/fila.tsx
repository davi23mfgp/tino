"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { buscar } from "@/lib/cliente"
import { Cartao, Vazio } from "@/components/ui/painel"

export interface ChamadoNaFila {
  id: string
  tipo: "BUG" | "DUVIDA" | "COBRANCA"
  status: "ABERTO" | "RESOLVIDO"
  mensagem: string
  rota: string | null
  resposta: string | null
  criadoEm: string
  usuario: { nome: string; email: string }
}

const ROTULO_TIPO = { BUG: "defeito", DUVIDA: "dúvida", COBRANCA: "cobrança" } as const

const COR_TIPO = {
  BUG: "border-negativo/40 text-negativo",
  DUVIDA: "border-pauta text-muted-fg",
  COBRANCA: "border-atencao/40 text-atencao",
} as const

/**
 * A fila de chamados.
 *
 * Sem prazo, sem prioridade e sem atribuição: hoje quem atende é uma pessoa só,
 * e campo que ninguém preenche é campo que polui a tela e mente no relatório.
 * O que existe é o suficiente para responder e fechar.
 */
export function FilaDeChamados({ chamados }: { chamados: ChamadoNaFila[] }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [respostas, setRespostas] = useState<Record<string, string>>({})

  async function marcar(chamado: ChamadoNaFila, status: "ABERTO" | "RESOLVIDO") {
    setOcupado(chamado.id)
    setErro(null)
    try {
      await buscar(`/api/admin/chamados/${chamado.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, resposta: respostas[chamado.id] ?? chamado.resposta ?? undefined }),
      })
      router.refresh()
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não consegui atualizar o chamado.")
    } finally {
      setOcupado(null)
    }
  }

  if (chamados.length === 0) {
    return (
      <Cartao>
        <Vazio titulo="Nenhum chamado" texto="Quando alguém relatar um defeito ou tirar uma dúvida no app, cai aqui." />
      </Cartao>
    )
  }

  return (
    <div className="space-y-3">
      {erro && <p className="text-[13px] text-negativo">{erro}</p>}

      {chamados.map((chamado) => (
        <Cartao key={chamado.id} className={chamado.status === "RESOLVIDO" ? "opacity-60" : undefined}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${COR_TIPO[chamado.tipo]}`}>
                  {ROTULO_TIPO[chamado.tipo]}
                </span>
                <span>{chamado.usuario.nome}</span>
                <span className="text-muted-fg">{chamado.usuario.email}</span>
              </p>
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed">{chamado.mensagem}</p>
              <p className="mt-2 text-[12px] text-muted-fg">
                {new Date(chamado.criadoEm).toLocaleString("pt-BR")}
                {chamado.rota && ` · na tela ${chamado.rota}`}
              </p>
            </div>

            <button
              onClick={() => marcar(chamado, chamado.status === "ABERTO" ? "RESOLVIDO" : "ABERTO")}
              disabled={ocupado === chamado.id}
              className="shrink-0 rounded-full border border-pauta px-4 py-2 text-[13px] transition-colors hover:border-acao/40 disabled:opacity-50"
            >
              {chamado.status === "ABERTO" ? "Marcar resolvido" : "Reabrir"}
            </button>
          </div>

          {chamado.status === "ABERTO" && (
            <textarea
              value={respostas[chamado.id] ?? chamado.resposta ?? ""}
              onChange={(evento) => setRespostas({ ...respostas, [chamado.id]: evento.target.value })}
              placeholder="anotação da resposta (fica com o chamado)"
              rows={2}
              className="mt-3 w-full rounded-[var(--raio-campo)] border border-pauta bg-background px-4 py-2.5 text-sm"
            />
          )}

          {chamado.status === "RESOLVIDO" && chamado.resposta && (
            <p className="mt-3 rounded-[var(--raio-cartao)] border border-pauta bg-papel-2 p-3 text-[12px] leading-relaxed text-muted-fg">
              {chamado.resposta}
            </p>
          )}
        </Cartao>
      ))}
    </div>
  )
}

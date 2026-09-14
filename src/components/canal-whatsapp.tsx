"use client"

import { useState } from "react"
import { Check, Copy, MessageCircle, Plus } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Ligar o WhatsApp ao Tino.
 *
 * O canal já funcionava; o que não existia era o caminho para chegar nele. A
 * chave era mostrada no meio de uma mensagem do próprio bot — ou seja, só
 * aparecia para quem já tinha conseguido conversar com ele.
 *
 * A tela diz três coisas, nesta ordem: se está ligado, o que falta, e o que
 * fazer agora. Sem parágrafo explicando o que é WhatsApp.
 */

export interface ChaveDeCanal {
  id: string
  nome: string
  sufixo: string
  origem: string
  ativa: boolean
  conectada: boolean
  usos: number
  ultimoUso: string | null
}

interface Props {
  /** O servidor tem as chaves da Meta? Sem elas o canal não existe de verdade. */
  disponivel: boolean
  chaves: ChaveDeCanal[]
  /** Devolve a chave em claro — que aparece uma vez só. */
  aoGerar: () => Promise<void>
  chaveNova: string | null
}

export function CanalWhatsApp({ disponivel, chaves, aoGerar, chaveNova }: Props) {
  const [copiado, setCopiado] = useState(false)
  const [gerando, setGerando] = useState(false)

  const doCanal = chaves.filter((chave) => chave.origem === "WHATSAPP" && chave.ativa)
  const conectada = doCanal.find((chave) => chave.conectada)
  const esperando = doCanal.find((chave) => !chave.conectada)

  const estado: "ligado" | "esperando" | "desligado" | "sem-canal" = !disponivel
    ? "sem-canal"
    : conectada
      ? "ligado"
      : esperando
        ? "esperando"
        : "desligado"

  return (
    <div className="rounded-[var(--raio-cartao)] border border-pauta p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[calc(14px*var(--escala-letra))] font-medium">
          <MessageCircle className="size-4" /> WhatsApp
        </p>
        <Selo estado={estado} />
      </div>

      {estado === "sem-canal" && (
        <p className="mt-2 text-[calc(12px*var(--escala-letra))] leading-relaxed text-muted-fg">
          O número do Tino ainda não foi ligado à Meta. Enquanto isso, gerar chave aqui não levaria a
          lugar nenhum.
        </p>
      )}

      {estado === "ligado" && (
        <p className="mt-2 text-[calc(12px*var(--escala-letra))] leading-relaxed text-muted-fg">
          Mande um gasto por escrito, um áudio, ou o arquivo da fatura. Pergunta também vale:{" "}
          <b>quanto eu tenho hoje?</b>
        </p>
      )}

      {(estado === "desligado" || estado === "esperando") && (
        <ol className="mt-2 space-y-1.5 text-[calc(12px*var(--escala-letra))] leading-relaxed text-muted-fg">
          <li>1. Gere a chave abaixo.</li>
          <li>
            2. Abra a conversa com o Tino no WhatsApp e mande{" "}
            <code className="rounded bg-papel-2 px-1.5 py-0.5">conectar SUA_CHAVE</code>.
          </li>
          <li>3. Pronto. A partir daí é só falar, escrever ou mandar a fatura.</li>
        </ol>
      )}

      {chaveNova && (
        <div className="mt-3 rounded-2xl border border-acao/40 bg-acao/10 p-3">
          <p className="text-[calc(12px*var(--escala-letra))] text-acao">
            Esta chave aparece uma vez só. Copie a mensagem inteira e mande no WhatsApp.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-xl bg-background px-3 py-2 text-[calc(12px*var(--escala-letra))]">
              conectar {chaveNova}
            </code>
            <button
              type="button"
              aria-label="Copiar mensagem de conexão"
              onClick={() => {
                navigator.clipboard.writeText(`conectar ${chaveNova}`)
                setCopiado(true)
              }}
              className="rounded-xl border border-pauta p-2 transition hover:border-acao/40"
            >
              {copiado ? <Check className="size-4 text-positivo" /> : <Copy className="size-4" />}
            </button>
          </div>
        </div>
      )}

      {estado !== "ligado" && (
        <button
          type="button"
          disabled={!disponivel || gerando}
          onClick={async () => {
            setGerando(true)
            try {
              await aoGerar()
            } finally {
              setGerando(false)
            }
          }}
          className={cn(
            "mt-3 flex items-center gap-1.5 rounded-full border px-4 py-2 text-[calc(12px*var(--escala-letra))] transition",
            disponivel
              ? "border-acao/40 bg-acao/10 text-acao"
              : "cursor-not-allowed border-pauta text-muted-fg opacity-60",
          )}
        >
          <Plus className="size-3.5" /> {esperando ? "gerar outra chave" : "gerar chave do WhatsApp"}
        </button>
      )}

      {conectada && (
        <p className="mt-3 text-[calc(11px*var(--escala-letra))] text-muted-fg">
          {conectada.usos} envio(s)
          {conectada.ultimoUso && ` · último em ${new Date(conectada.ultimoUso).toLocaleString("pt-BR")}`}
        </p>
      )}
    </div>
  )
}

/** Uma palavra, que é o que a pessoa lê antes de qualquer outra coisa. */
function Selo({ estado }: { estado: "ligado" | "esperando" | "desligado" | "sem-canal" }) {
  const texto = {
    ligado: "conectado",
    esperando: "falta mandar a chave",
    desligado: "não conectado",
    "sem-canal": "indisponível",
  }[estado]

  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-[calc(11px*var(--escala-letra))]",
        estado === "ligado" ? "bg-positivo/15 text-positivo" : "bg-papel-2 text-muted-fg",
      )}
    >
      {texto}
    </span>
  )
}

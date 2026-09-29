"use client"

import { useState } from "react"
import { Check, Copy, ExternalLink, Plus, Send } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Ligar o Telegram ao Tino (29/09/2026: o WhatsApp saiu, "deixe só
 * Telegram").
 *
 * O bot já funcionava, mas mandava a pessoa gerar a chave numa tela que não
 * existia. Com o nome do bot configurado (`TELEGRAM_BOT_USUARIO`), a chave vai
 * num link `t.me/<bot>?start=<chave>`: um toque abre o Telegram e conecta,
 * sem copiar nada. Sem o nome, fica o caminho manual `/conectar CHAVE`.
 *
 * A tela diz três coisas, nesta ordem: se está ligado, o que falta, e o que
 * fazer agora.
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
  /** O servidor tem o token do bot? Sem ele o canal não existe de verdade. */
  disponivel: boolean
  /** Nome do bot (sem @), para o link de um toque. */
  usuarioDoBot: string | null
  chaves: ChaveDeCanal[]
  /** Devolve a chave em claro — que aparece uma vez só. */
  aoGerar: () => Promise<void>
  chaveNova: string | null
  /** Dentro de um diálogo que já tem o título: sem a moldura e sem repetir o nome. */
  semCabecalho?: boolean
}

export function CanalTelegram({ disponivel, usuarioDoBot, chaves, aoGerar, chaveNova, semCabecalho = false }: Props) {
  const [copiado, setCopiado] = useState(false)
  const [gerando, setGerando] = useState(false)

  const doCanal = chaves.filter((chave) => chave.origem === "TELEGRAM" && chave.ativa)
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
    <div className={semCabecalho ? undefined : "rounded-[var(--raio-cartao)] border border-pauta p-4"}>
      <div className="flex items-center justify-between gap-3">
        {!semCabecalho && (
          <p className="flex items-center gap-2 text-[calc(14px*var(--escala-letra))] font-medium">
            <Send className="size-4" /> Telegram
          </p>
        )}
        <Selo estado={estado} />
      </div>

      {estado === "sem-canal" && (
        <p className="mt-2 text-[calc(12px*var(--escala-letra))] leading-relaxed text-muted-fg">
          O bot do Tino ainda não foi ligado ao Telegram neste servidor. Enquanto isso, gerar chave aqui
          não levaria a lugar nenhum.
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
            2. {usuarioDoBot ? "Toque em Abrir no Telegram e depois em Começar." : (
              <>
                Abra a conversa com o Tino no Telegram e mande{" "}
                <code className="rounded bg-papel-2 px-1.5 py-0.5">/conectar SUA_CHAVE</code>.
              </>
            )}
          </li>
          <li>3. Pronto. A partir daí é só falar, escrever ou mandar a fatura.</li>
        </ol>
      )}

      {chaveNova && (
        <div className="mt-3 rounded-2xl border border-acao/40 bg-acao/10 p-3">
          <p className="text-[calc(12px*var(--escala-letra))] text-acao">Esta chave aparece uma vez só.</p>
          {usuarioDoBot ? (
            <a
              href={`https://t.me/${usuarioDoBot}?start=${encodeURIComponent(chaveNova)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[calc(13px*var(--escala-letra))] font-semibold text-primary-foreground"
            >
              <ExternalLink className="size-4" /> Abrir no Telegram
            </a>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-xl bg-background px-3 py-2 text-[calc(12px*var(--escala-letra))]">
                /conectar {chaveNova}
              </code>
              <button
                type="button"
                aria-label="Copiar mensagem de conexão"
                onClick={() => {
                  navigator.clipboard.writeText(`/conectar ${chaveNova}`)
                  setCopiado(true)
                }}
                className="rounded-xl border border-pauta p-2 transition hover:border-acao/40"
              >
                {copiado ? <Check className="size-4 text-positivo" /> : <Copy className="size-4" />}
              </button>
            </div>
          )}
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
          <Plus className="size-3.5" /> {esperando ? "gerar outra chave" : "gerar chave do Telegram"}
        </button>
      )}

      {conectada && (
        <p className="mt-3 text-[max(10px,calc(12px*var(--escala-letra)))] text-muted-fg">
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
        "shrink-0 rounded-full px-2.5 py-1 text-[max(10px,calc(12px*var(--escala-letra)))]",
        estado === "ligado" ? "bg-positivo/15 text-positivo" : "bg-papel-2 text-muted-fg",
      )}
    >
      {texto}
    </span>
  )
}

"use client"

import { useState } from "react"

import { usarAtalhoDeLancar } from "@/components/atalho-de-lancar"

/**
 * Liga e desliga o atalho fixo na barra de notificações.
 *
 * A promessa aqui é escrita do jeito que funciona, não do jeito que soa bem: a
 * notificação abre a tela de lançar. Ela não aceita texto dentro dela, e
 * prometer isso faria a pessoa tentar, falhar e concluir que o app é quebrado.
 */
export function ConfigAtalhoLancar() {
  const { suportado, ligado, ligar, desligar } = usarAtalhoDeLancar()
  const [recusado, setRecusado] = useState(false)

  if (!suportado) {
    return (
      <p className="text-[calc(13px*var(--escala-letra))] text-[color:var(--texto-2)]">
        Este navegador não deixa um site fixar notificação. No iPhone, funciona depois de adicionar o Tino à tela de
        início.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-[calc(13px*var(--escala-letra))] text-[color:var(--texto-2)]">
        Um atalho parado na barra de notificações. Toque em <b>Anotar</b> para escrever ou em <b>Ditar</b> para falar — a
        tela abre com o campo pronto. Escrever dentro da própria notificação só existe em aplicativo instalado; pelo
        WhatsApp, o Tino já aceita.
      </p>

      <button
        type="button"
        onClick={async () => {
          if (ligado) return void desligar()
          const deu = await ligar()
          setRecusado(!deu)
        }}
        className={
          ligado
            ? "min-h-11 rounded-[var(--raio-pilula)] border border-pauta px-4 text-[calc(13px*var(--escala-letra))] font-medium"
            : "min-h-11 rounded-[var(--raio-pilula)] bg-acao px-4 text-[calc(13px*var(--escala-letra))] font-semibold text-background"
        }
      >
        {ligado ? "Tirar da barra" : "Deixar na barra"}
      </button>

      {recusado && (
        <p className="text-[calc(13px*var(--escala-letra))] text-atencao">
          O navegador bloqueou as notificações do Tino. Libere nas permissões do site e toque de novo.
        </p>
      )}
    </div>
  )
}

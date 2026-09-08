"use client"

import { useState } from "react"
import Image from "next/image"

import { TinoMascote } from "@/components/tino-mascote"

/**
 * O porquinho da vitrine.
 *
 * Usa o RENDER 3D (`public/mascote/tino.png`) quando o arquivo existe, e cai
 * no desenho vetorial quando não existe. Os dois caminhos são legítimos: o
 * render dá o acabamento de clay glossy que o Davi pediu (e que as duas
 * referências conseguem porque também usam asset renderizado fora do
 * navegador — o herói do Pierre é um MP4), e o vetor mantém a página de pé
 * enquanto o arquivo não chega, sem quadrado quebrado no lugar.
 *
 * A TROCA É NO CLIENTE, por `onError`, e não por `fs.existsSync` no servidor.
 * A primeira versão fazia a checagem no disco do servidor — funcionava aqui e
 * era capaz de falhar na Vercel, onde `process.cwd()` de uma função
 * serverless não necessariamente enxerga `public/`. O resultado seria o pior
 * possível: o arquivo existir, o site continuar mostrando o vetor, e ninguém
 * entender por quê. Perguntar ao navegador se a imagem carregou não depende
 * de suposição nenhuma sobre o sistema de arquivos de produção.
 */

const CAMINHO_RENDER = "/mascote/tino.png"

export function Porquinho({
  tamanho,
  className,
  flutua = false,
  prioritario = false,
}: {
  /** Lado do desenho em pixels — o render é quadrado. */
  tamanho: number
  className?: string
  /** Liga a flutuação lenta. Respeita `prefers-reduced-motion` pelo CSS. */
  flutua?: boolean
  prioritario?: boolean
}) {
  const [semRender, setSemRender] = useState(false)
  const classe = [flutua ? "float-slow" : "", className].filter(Boolean).join(" ")

  if (semRender) {
    // `TinoMascote` não recebe `style` — o tamanho vem do envoltório, que é
    // também quem carrega a flutuação.
    return (
      <span className={classe} style={{ display: "block", width: tamanho }}>
        <TinoMascote estado="tranquilo" animado={!flutua} className="w-full" />
      </span>
    )
  }

  return (
    <Image
      src={CAMINHO_RENDER}
      alt="Tino, o porquinho do app: um cofrinho de porcelana rosa sorrindo"
      width={tamanho}
      height={tamanho}
      priority={prioritario}
      onError={() => setSemRender(true)}
      className={`mascote-img ${classe}`}
      style={{ width: tamanho, height: "auto" }}
    />
  )
}

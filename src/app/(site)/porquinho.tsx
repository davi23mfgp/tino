import fs from "node:fs"
import path from "node:path"

import Image from "next/image"

import { TinoMascote } from "@/components/tino-mascote"

/**
 * O porquinho da vitrine.
 *
 * Usa o RENDER 3D (`public/mascote/tino.png`) quando o arquivo existe, e o
 * desenho vetorial quando não existe. Os dois caminhos são legítimos: o
 * render dá o acabamento de clay glossy que o Davi pediu (e que as duas
 * referências conseguem porque também usam asset renderizado fora do
 * navegador — o herói do Pierre é um MP4), e o vetor mantém a página de pé
 * enquanto o arquivo não chega, sem quadrado quebrado no lugar.
 *
 * A checagem é de servidor e roda no build/render, não no cliente: em
 * componente de servidor, `fs.existsSync` é barato e evita mandar para o
 * navegador a lógica de "tenta a imagem, se falhar troca".
 */

const CAMINHO_RENDER = "/mascote/tino.png"

function temRender() {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", "mascote", "tino.png"))
  } catch {
    return false
  }
}

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
  const classe = [flutua ? "float-slow" : "", className].filter(Boolean).join(" ")

  if (temRender()) {
    return (
      <Image
        src={CAMINHO_RENDER}
        alt="Tino, o porquinho do app, um cofrinho de porcelana rosa sorrindo"
        width={tamanho}
        height={tamanho}
        priority={prioritario}
        className={`mascote-img ${classe}`}
        style={{ width: tamanho, height: "auto" }}
      />
    )
  }

  // `TinoMascote` não recebe `style` — o tamanho vem do envoltório, que é
  // também quem carrega a flutuação.
  return (
    <span className={classe} style={{ display: "block", width: tamanho }}>
      <TinoMascote estado="tranquilo" animado={!flutua} className="w-full" />
    </span>
  )
}

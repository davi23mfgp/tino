import { ImageResponse } from "next/og"

/**
 * Imagem que aparece quando alguém cola o link do Tino no WhatsApp (achado 15:
 * antes saía sem imagem nenhuma). Só texto e as cores da vitrine, de
 * propósito: o desenho definitivo é do canvas (passo 69), e esta serve até lá
 * sem inventar número nem tela.
 */
export const alt = "Tino. Seu dinheiro, mais simples."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Imagem() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 96px", background: "#0f1412", color: "#f2f4f3" }}>
        <div style={{ fontSize: 132, fontWeight: 700, letterSpacing: -4 }}>tino.</div>
        <div style={{ fontSize: 54, marginTop: 12 }}>Seu dinheiro, mais simples.</div>
        <div style={{ fontSize: 30, marginTop: 36, color: "#9aa7a1" }}>Contas, cartões, dívidas e metas. Nada entra no saldo sem você conferir.</div>
      </div>
    ),
    size,
  )
}

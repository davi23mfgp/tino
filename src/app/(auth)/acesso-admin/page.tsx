import type { Metadata } from "next"
import { Suspense } from "react"

import FormularioLogin from "../login/formulario"

/**
 * Entrada do admin (06/10/2026). Nenhuma tela do Tino tem link para cá, e o
 * login comum e o Google recusam conta de admin (`entradaPermitida`). Só
 * e-mail, senha e o código de dois fatores: sem Google, sem "manter
 * conectado", sem cadastro.
 */
export const metadata: Metadata = { title: "Administração", robots: { index: false, follow: false } }

export default function EntradaAdmin() {
  return <Suspense><FormularioLogin googleDisponivel={false} modoAdmin /></Suspense>
}

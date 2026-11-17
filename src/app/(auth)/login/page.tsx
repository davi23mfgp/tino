import type { Metadata } from "next"
import { Suspense } from "react"
import FormularioLogin from "./formulario"

// Login e cadastro não são página de busca: quem procura "Tino" deve cair na vitrine.
export const metadata: Metadata = { title: "Entrar · Tino", robots: { index: false, follow: true } }

export default function Login() {
  const googleDisponivel = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI)
  return <Suspense><FormularioLogin googleDisponivel={googleDisponivel} /></Suspense>
}

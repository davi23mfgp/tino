import { Suspense } from "react"
import FormularioLogin from "../formulario"
export default function LoginMei() {
  const googleDisponivel = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI)
  return <Suspense><FormularioLogin googleDisponivel={googleDisponivel} modoMei /></Suspense>
}

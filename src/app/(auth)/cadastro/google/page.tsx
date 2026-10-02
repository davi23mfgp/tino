import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { COOKIE_CADASTRO_GOOGLE, lerCadastroGoogle } from "@/lib/google-login"
import FormularioCadastroGoogle from "./formulario"

export default async function CadastroGoogle() {
  const jar = await cookies()
  const identidade = await lerCadastroGoogle(jar.get(COOKIE_CADASTRO_GOOGLE)?.value)
  if (!identidade) redirect("/login?erro=google-expirado")
  return <FormularioCadastroGoogle email={identidade.email} nomeInicial={identidade.nome} modoMei={identidade.modoMei} />
}

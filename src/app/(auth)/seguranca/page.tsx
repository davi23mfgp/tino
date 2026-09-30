import { redirect } from "next/navigation"
import { getSessao } from "@/lib/auth"
import { ConfigurarSeguranca } from "@/components/configurar-seguranca"

export const metadata = { title: "Segurança da conta · Tino", robots: { index: false, follow: false } }

export default async function Seguranca() {
  if (!(await getSessao())) redirect("/login")
  return <main className="area-do-app min-h-screen"><div className="mx-auto max-w-xl space-y-4 px-4 py-8"><h1 className="text-xl font-semibold">Segurança da conta</h1><ConfigurarSeguranca /></div></main>
}

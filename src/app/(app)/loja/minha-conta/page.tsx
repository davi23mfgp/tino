import Link from "next/link"
import { MeusDados } from "@/components/meus-dados"

export default function MinhaContaMei() {
  return <div className="mx-auto grid max-w-2xl gap-4">
    <div><h2 className="text-2xl font-semibold">Minha conta MEI</h2><p className="mt-1 text-sm text-muted-fg">Acesso e dados do seu negócio.</p></div>
    <div className="ficha grid gap-3 p-5">
      <Link className="min-h-11 rounded-xl border border-pauta px-4 py-3" href="/loja/dados">Dados da empresa</Link>
      <Link className="min-h-11 rounded-xl border border-pauta px-4 py-3" href="/seguranca">Segurança da conta</Link>
      <Link className="min-h-11 rounded-xl border border-pauta px-4 py-3" href="/assinatura">Plano e assinatura</Link>
    </div>
    <section className="ficha p-5"><h3 className="mb-4 text-lg font-semibold">Seus dados</h3><MeusDados mei /></section>
  </div>
}

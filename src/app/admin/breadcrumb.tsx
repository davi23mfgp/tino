"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export const ABAS = [
  { rota: "/admin", rotulo: "Visão geral" },
  { rota: "/admin/contas", rotulo: "Contas" },
  { rota: "/admin/pagamentos", rotulo: "Pagamentos" },
  { rota: "/admin/suporte", rotulo: "Suporte" },
  { rota: "/admin/configuracoes", rotulo: "Configurações" },
]

/**
 * Trilha "Administração / <aba atual>" — mapeamento do `breadcrumb` do
 * originui (21st.dev). A linha de abas de `admin/layout.tsx` não marca qual
 * está ativa (nenhuma delas ganha destaque), então hoje não há como saber em
 * qual página de administração se está sem olhar a URL. A trilha resolve
 * isso e ainda devolve o caminho para o app com um clique.
 */
export function TrilhaAdmin() {
  const caminho = usePathname()
  const atual = ABAS.find((aba) => aba.rota === caminho) ?? ABAS[0]

  return (
    <Breadcrumb className="mb-3">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/painel">Tino</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/admin">Administração</BreadcrumbLink>
        </BreadcrumbItem>
        {atual.rota !== "/admin" && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{atual.rotulo}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

/**
 * Mesma lista de abas que já existia em `admin/layout.tsx`, só que agora
 * sabendo qual está ativa — antes nenhuma ganhava destaque, e a trilha acima
 * ficava sozinha dizendo onde a pessoa está.
 */
export function AbasAdmin() {
  const caminho = usePathname()
  return (
    <nav className="mb-5 flex flex-wrap gap-1.5 border-b border-pauta pb-3">
      {ABAS.map((aba) => {
        const ativa = aba.rota === caminho
        return (
          <Link
            key={aba.rota}
            href={aba.rota}
            aria-current={ativa ? "page" : undefined}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
              ativa
                ? "border-acao/40 bg-acao/10 text-acao"
                : "border-pauta text-muted-fg hover:border-acao/40 hover:text-foreground",
            )}
          >
            {aba.rotulo}
          </Link>
        )
      })}
    </nav>
  )
}

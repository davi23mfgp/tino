import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

/**
 * Trilha "Loja / <página>" — mapeamento do `breadcrumb` do originui
 * (21st.dev), no exemplo que o próprio Davi deu (`docs/REDESIGN-EM-CURSO.md`).
 *
 * As abas em pílula de `SubAbas` (ver `components/navegacao.tsx`) já deixam
 * ativa qual tela do grupo Loja está aberta — isto não troca aquilo, só
 * nomeia por escrito onde a pessoa está, do mesmo jeito que o resto do app
 * profundo (`/admin/*`) passou a ter.
 */
export function TrilhaLoja({ pagina }: { pagina: string }) {
  return (
    <Breadcrumb className="mb-3">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/loja">Loja</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{pagina}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

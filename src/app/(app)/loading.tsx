import { Skeleton } from "@/components/ui/skeleton"

/**
 * O que aparece no instante do clique, enquanto o servidor monta a tela.
 *
 * Existe por um motivo de velocidade, não de enfeite (Davi, 29/09/2026:
 * "clico em Orçamento e demora uns um segundo para entrar"). Toda tela do app
 * é dinâmica (depende da sessão), e sem `loading.tsx` o Next não pré-carrega
 * rota dinâmica: o clique esperava a página inteira, consultas ao banco
 * incluídas, antes de trocar qualquer coisa. Com este arquivo, os links do
 * menu pré-carregam até aqui e a troca de tela é imediata; os números entram
 * quando chegam.
 *
 * O desenho imita o de uma tela comum (título, um bloco grande, dois médios)
 * para a página não pular quando o conteúdo de verdade chega.
 */
export default function Carregando() {
  return (
    <div className="space-y-4 pt-2" aria-busy="true" aria-label="Carregando">
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-40 w-full rounded-[28px]" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-56 rounded-[24px]" />
        <Skeleton className="h-56 rounded-[24px]" />
      </div>
      <Skeleton className="h-32 w-full rounded-[24px]" />
    </div>
  )
}

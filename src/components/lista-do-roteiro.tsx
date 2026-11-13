import Link from "next/link"
import { Banknote, Check, FileText, Home, Landmark, Ruler } from "lucide-react"

import { PASSOS_DO_ROTEIRO } from "@/lib/roteiro-feitos"
import { Cartao } from "@/components/ui/painel"
import { cn } from "@/lib/utils"

const ICONES = [Landmark, Banknote, Home, Ruler, FileText]

/**
 * A lista de começo no alto do Início (passo 61, opção A, Davi em 13/11/2026).
 *
 * Quem nunca usou abre o app vazio e não sabe a ordem. A lista fica ali até o
 * quinto passo: o que já foi feito aparece apagado, e só o próximo tem o
 * botão Fazer, para a pessoa não ter de escolher. Some sozinha quando acaba,
 * e o resto do Início não muda. O Fazer abre a pergunta daquele passo em
 * `/montar` (opção B, já pronta).
 */
export function ListaDoRoteiro({ feitos }: { feitos: boolean[] }) {
  const quantos = feitos.filter(Boolean).length
  if (quantos === feitos.length) return null
  const proximo = feitos.findIndex((feito) => !feito)

  return (
    <Cartao estatico className="grid gap-3 md:max-w-[460px]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[calc(19px*var(--escala-letra))] font-bold">Montar o seu Tino</h2>
        <span className="text-[calc(14px*var(--escala-letra))] text-muted-fg">{quantos} de {feitos.length}</span>
      </div>
      <div className="flex gap-1.5" role="img" aria-label={`${quantos} de ${feitos.length} passos feitos`}>
        {feitos.map((feito, indice) => <i key={indice} className={cn("h-1.5 flex-1 rounded-full", feito ? "bg-acao" : "bg-foreground/10")} />)}
      </div>
      <ol>
        {PASSOS_DO_ROTEIRO.map((passo, indice) => {
          const Icone = ICONES[indice]
          const feito = feitos[indice]
          const atual = indice === proximo
          return (
            <li key={passo.titulo} className={cn("flex min-h-14 items-center gap-3", feito && "opacity-55")}>
              <span className={cn("grid size-[34px] shrink-0 place-items-center rounded-full", feito ? "bg-acao text-background" : atual ? "border-[1.5px] border-acao text-acao" : "border-[1.5px] border-pauta text-muted-fg")}>
                {feito ? <Check className="size-[18px]" strokeWidth={2.6} aria-hidden /> : <Icone className="size-[17px]" aria-hidden />}
              </span>
              <div className="min-w-0 flex-1">
                <b className="block text-[calc(16px*var(--escala-letra))]">{passo.titulo}</b>
                <span className="text-[calc(13.5px*var(--escala-letra))] text-muted-fg">{passo.apoio}</span>
              </div>
              {atual && (
                <Link href={`/montar?passo=${indice + 1}`} className="flex min-h-11 items-center px-2 text-[calc(14px*var(--escala-letra))] font-bold text-acao" aria-label={`Fazer: ${passo.titulo}`}>
                  Fazer
                </Link>
              )}
              {feito && <span className="text-[calc(13px*var(--escala-letra))] text-muted-fg">feito</span>}
            </li>
          )
        })}
      </ol>
      <p className="text-[calc(13px*var(--escala-letra))] text-muted-fg">Uns 15 minutos no total. Pode parar e voltar quando quiser.</p>
    </Cartao>
  )
}

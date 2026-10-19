"use client"

import type { ReactNode } from "react"
import { Pencil, Trash2 } from "lucide-react"

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

/**
 * A ficha padrão do Tino (passo 57, opção A, 19/10/2026): tocar num item da
 * lista abre esta ficha, com Editar e Excluir escritos. No celular ela sobe de
 * baixo; no computador abre ao lado, e a lista continua à vista.
 *
 * Existe porque cada tela inventava o seu jeito: no Extrato editava-se tocando
 * no próprio texto, sem pista nenhuma, e excluir não existia. A revisão de uso
 * (docs/pesquisas/2026-10-19-revisao-de-uso.md) mostrou que a pessoa que nunca
 * mexeu no app não descobre ação escondida. Excluir não pergunta "tem
 * certeza?": quem chama tira o item na hora e oferece Desfazer.
 */
interface Props {
  aberta: boolean
  aoFechar: () => void
  titulo: string
  /** O que aparece embaixo do título, para leitor de tela e para a pessoa. */
  descricao?: string
  children: ReactNode
  /** Sem `aoEditar`, o botão some (item que não se edita, como transferência). */
  aoEditar?: () => void
  aoExcluir?: () => void
  /** No modo de edição, quem chama troca os botões pelos dele (Salvar, Cancelar). */
  rodape?: ReactNode
  rotuloExcluir?: string
}

export function FichaPadrao({ aberta, aoFechar, titulo, descricao, children, aoEditar, aoExcluir, rodape, rotuloExcluir = "Excluir" }: Props) {
  return (
    <Sheet open={aberta} onOpenChange={(abrir) => { if (!abrir) aoFechar() }}>
      <SheetContent
        className={cn(
          // Celular: folha que sobe de baixo, com a alça no alto.
          "inset-x-0 bottom-0 top-auto h-auto max-h-[88dvh] w-full max-w-none rounded-t-[28px] rounded-l-none border-x-0 border-b-0 border-t px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-3",
          "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
          // Computador: painel na lateral direita, como a opção A no canvas.
          "md:inset-y-0 md:left-auto md:right-0 md:h-[100dvh] md:max-h-none md:w-[420px] md:rounded-l-[28px] md:rounded-tr-none md:border-l md:border-t-0 md:p-7",
          "md:data-[state=open]:slide-in-from-right md:data-[state=closed]:slide-out-to-right",
        )}
      >
        <span aria-hidden className="mx-auto mb-3 block h-[5px] w-10 rounded-full bg-foreground/20 md:hidden" />
        <div className="grid gap-5">
          <div className="pr-10">
            <SheetTitle className="text-xl font-semibold">{titulo}</SheetTitle>
            {descricao && <SheetDescription className="mt-1 text-sm text-muted-fg">{descricao}</SheetDescription>}
          </div>
          {children}
          {rodape ?? ((aoEditar || aoExcluir) && (
            <div className="flex gap-2.5">
              {aoEditar && (
                <button type="button" onClick={aoEditar}
                  className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-[oklch(var(--primary))] px-5 text-[15.5px] font-bold text-[oklch(var(--primary-foreground))]">
                  <Pencil aria-hidden className="size-[18px]" />Editar
                </button>
              )}
              {aoExcluir && (
                <button type="button" onClick={aoExcluir}
                  className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-full border-[1.5px] border-negativo px-5 text-[15.5px] font-bold text-negativo">
                  <Trash2 aria-hidden className="size-[18px]" />{rotuloExcluir}
                </button>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Uma linha "rótulo à esquerda, valor à direita" da ficha. */
export function LinhaDaFicha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[48px] items-center justify-between gap-3 border-t border-pauta py-2.5 first:border-t-0">
      <span className="text-sm text-muted-fg">{rotulo}</span>
      <span className="flex min-w-0 items-center gap-2 text-right text-[15px] font-medium">{children}</span>
    </div>
  )
}

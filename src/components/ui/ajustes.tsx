"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item"

/**
 * Grupo de ajustes e linha de ajuste.
 *
 * É a anatomia da referência aprovada em 13/09: dois cartões lado a lado
 * ("Conta" e "Sistema"), cada um com linhas compactas de título, descrição
 * curta e ação à direita. O formulário completo não fica na tela — aparece
 * quando a linha é aberta.
 *
 * O que isso substitui: seis cartões empilhados, cada um com o conteúdo
 * inteiro sempre visível (formulário de conta, três linhas de texto sobre
 * Open Finance, lista de conexões, dois links grandes). A tela passava de
 * 2.000px de altura para oferecer oito ações.
 *
 * Construído sobre `Card` e `Item` do shadcn/ui, não sobre `div` estilizada:
 * `Item` já traz a semântica de lista, os degraus de tamanho e o `asChild`
 * para virar link sem aninhar âncora dentro de botão.
 *
 * As três formas de linha existem porque as ações são de três naturezas, e
 * tratá-las como uma só é o que produz botão sem função:
 * - `href`: leva para outra tela.
 * - `aoTocar`: dispara uma ação imediata.
 * - `children`: abre conteúdo aqui mesmo, recolhido por padrão.
 */

export function GrupoAjustes({
  titulo,
  children,
  className,
}: {
  titulo: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn("border-pauta bg-papel-1", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-[15px] font-semibold tracking-tight">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ItemGroup className="gap-2">{children}</ItemGroup>
      </CardContent>
    </Card>
  )
}

interface BaseLinha {
  titulo: string
  /** Uma linha, no máximo. O que não cabe aqui pertence à tela que ela abre. */
  descricao?: string
  /** Texto da ação à direita. Padrão conforme a forma da linha. */
  acao?: string
  desabilitado?: boolean
}

const LINHA = "min-h-14 rounded-[14px] px-3.5 text-left sm:px-4"

function Miolo({
  titulo,
  descricao,
  acao,
  girado,
}: {
  titulo: string
  descricao?: string
  acao: string
  girado?: boolean
}) {
  return (
    <>
      <ItemContent className="gap-0.5">
        <ItemTitle className="text-[15px] font-semibold">{titulo}</ItemTitle>
        {descricao && <ItemDescription className="text-[13px]">{descricao}</ItemDescription>}
      </ItemContent>
      <ItemActions className="shrink-0 gap-1 text-[14px] text-muted-fg">
        {acao}
        <ChevronRight
          aria-hidden
          className={cn("size-4 text-[color:var(--texto-3)] transition-transform", girado && "rotate-90")}
        />
      </ItemActions>
    </>
  )
}

export function LinhaAjuste(
  props: BaseLinha &
    (
      | { href: string; aoTocar?: never; children?: never }
      | { aoTocar: () => void; href?: never; children?: never }
      | { children: React.ReactNode; href?: never; aoTocar?: never }
    ),
) {
  const { titulo, descricao, acao, desabilitado } = props
  const [aberto, setAberto] = useState(false)

  if (props.href) {
    return (
      <Item variant="muted" className={LINHA} asChild>
        <Link href={props.href}>
          <Miolo titulo={titulo} descricao={descricao} acao={acao ?? "Abrir"} />
        </Link>
      </Item>
    )
  }

  if (props.aoTocar) {
    return (
      <Item variant="muted" className={cn(LINHA, "disabled:opacity-50")} asChild>
        <button type="button" onClick={props.aoTocar} disabled={desabilitado}>
          <Miolo titulo={titulo} descricao={descricao} acao={acao ?? "Editar"} />
        </button>
      </Item>
    )
  }

  return (
    <div className="rounded-[14px] bg-papel-2">
      <Item variant="muted" className={cn(LINHA, "w-full bg-transparent disabled:opacity-50")} asChild>
        <button
          type="button"
          onClick={() => setAberto((atual) => !atual)}
          aria-expanded={aberto}
          disabled={desabilitado}
        >
          <Miolo titulo={titulo} descricao={descricao} acao={aberto ? "Fechar" : (acao ?? "Abrir")} girado={aberto} />
        </button>
      </Item>
      {aberto && <div className="border-t border-pauta px-3.5 py-3 sm:px-4">{props.children}</div>}
    </div>
  )
}

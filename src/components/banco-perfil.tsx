"use client"

import { useState } from "react"
import { Landmark } from "lucide-react"

import { useIdentidadeVisual } from "@/components/identidades-visuais"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { BANCOS_PERFIL, encontrarBanco, normalizarBanco } from "@/lib/bancos-perfil"

/**
 * A marca da instituição, em três degraus de preferência.
 *
 * 1. Logo que a própria pessoa subiu (identidade visual do lar).
 * 2. Asset oficial guardado em `public/bancos/` (ver `lib/bancos-perfil.ts`).
 * 3. Ícone NEUTRO de instituição — nunca inicial solta.
 *
 * O terceiro degrau mudou em 13/09/2026. Antes ele desenhava as iniciais do
 * nome, e a lista saía com "BP" para BTG Pactual, "X" para XP e "S" para
 * Sicoob: três círculos cinzas que não dizem nada e que Davi apontou como
 * defeito. Ícone de banco com o nome ao lado é honesto — diz "instituição
 * sem logo confirmado" em vez de fingir uma marca.
 */
export function IdentidadeBanco({
  instituicao,
  nome,
  className,
}: {
  instituicao: string | null
  nome?: string
  className?: string
}) {
  const rotulo = instituicao?.trim() || nome?.trim() || "Banco"
  const personalizada = useIdentidadeVisual(rotulo)
  const banco = encontrarBanco(instituicao ?? "")
  const arte = personalizada?.logoUrl ?? banco?.logo

  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center overflow-hidden rounded-[10px] border border-pauta bg-papel-2",
        className,
      )}
    >
      {arte ? (
        // `img` cru e não `next/image`: o asset é local, já vem em 96px e o
        // otimizador não tem o que melhorar num ícone desse tamanho.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={arte} alt="" aria-hidden className="size-full object-contain p-1" />
      ) : personalizada?.emoji ? (
        <span aria-hidden className="text-base leading-none">
          {personalizada.emoji}
        </span>
      ) : (
        <Landmark aria-hidden className="size-[18px] text-[color:var(--texto-3)]" strokeWidth={1.8} />
      )}
    </span>
  )
}

/**
 * Busca de instituição: campo compacto e lista com altura controlada.
 *
 * A captura de 13/09 mostrava esta lista com barra de rolagem do sistema
 * desenhada por cima do último item e cada linha com 44px de botão dentro de
 * outro botão. Agora a lista é `role="listbox"` com 6 linhas visíveis, e a
 * rolagem só aparece quando passa disso.
 */
export function BuscaBancoPerfil({
  valor,
  aoMudar,
  nomesExistentes,
  desabilitado,
}: {
  valor: string
  aoMudar: (nome: string) => void
  nomesExistentes: string[]
  desabilitado: boolean
}) {
  const [mostrando, setMostrando] = useState(false)

  const nomes = [...BANCOS_PERFIL.map((banco) => banco.nome)]
  for (const nome of nomesExistentes) {
    if (!nomes.some((atual) => normalizarBanco(atual) === normalizarBanco(nome))) nomes.push(nome)
  }

  const resultados = nomes.filter((nome) => {
    const banco = encontrarBanco(nome)
    return [nome, ...(banco?.aliases ?? [])].some((apelido) =>
      normalizarBanco(apelido).includes(normalizarBanco(valor)),
    )
  })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {valor && <IdentidadeBanco instituicao={valor} />}
        <Input
          id="conta-instituicao"
          value={valor}
          disabled={desabilitado}
          autoComplete="off"
          placeholder="Buscar banco ou digitar outro"
          aria-describedby="banco-ajuda"
          aria-expanded={mostrando}
          onFocus={() => setMostrando(true)}
          onChange={(evento) => {
            aoMudar(evento.target.value)
            setMostrando(true)
          }}
        />
      </div>

      {mostrando && (
        <ul
          role="listbox"
          aria-label="Instituições encontradas"
          // 6 linhas de 44px: altura previsível, rolagem só quando passa disso.
          className="max-h-[264px] overflow-y-auto overscroll-contain rounded-[12px] border border-pauta bg-papel-1"
        >
          {resultados.map((nome) => (
            <li key={nome}>
              <button
                type="button"
                role="option"
                aria-selected={normalizarBanco(nome) === normalizarBanco(valor)}
                disabled={desabilitado}
                onClick={() => {
                  aoMudar(nome)
                  setMostrando(false)
                }}
                className="flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-sm hover:bg-papel-2 aria-selected:text-acao"
              >
                <IdentidadeBanco instituicao={nome} className="size-7" />
                <span className="min-w-0 flex-1 truncate">{nome}</span>
              </button>
            </li>
          ))}
          {resultados.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-muted-fg">
              Nenhuma conhecida com esse nome. O texto digitado será usado.
            </li>
          )}
        </ul>
      )}

      <p id="banco-ajuda" className="text-xs text-muted-fg">
        Escolha uma instituição ou mantenha o nome digitado.
      </p>
    </div>
  )
}

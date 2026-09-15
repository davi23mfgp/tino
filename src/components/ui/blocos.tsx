import Link from "next/link"
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatarMoeda } from "@/lib/dinheiro"

/**
 * Blocos de leitura compartilhados.
 *
 * Seis peças que as telas do Tino repetiam à mão, cada uma um pouco
 * diferente da outra: situação atual, progresso, comparação entre períodos,
 * próxima ação, etapas e detalhe recolhível. Ter isso solto é o que produziu
 * a tela "grande e pesada" que o Davi rejeitou — cada página escolhia o
 * próprio tamanho de fonte e o próprio recheio.
 *
 * Regras que valem para todos:
 * - Dinheiro entra em CENTAVOS (`Int`), como o resto do repositório.
 * - Indicador de leitura é texto: sem spinner, sem barra de rolagem.
 * - Texto comum 14px, secundário 12-13px, destaque só no valor que manda.
 * - Alvo de toque de 44px no celular, 36px do `sm` para cima.
 */

type Tom = "neutro" | "positivo" | "negativo" | "atencao"

const COR_DO_TOM: Record<Tom, string> = {
  neutro: "text-foreground",
  positivo: "text-positivo",
  negativo: "text-negativo",
  atencao: "text-atencao",
}

/** Moldura comum: 1px de borda e raio de cartão. Sem sombra, sem gradiente. */
function Moldura({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[var(--raio-cartao)] border border-pauta bg-papel-1 p-3 sm:p-4", className)}>
      {children}
    </div>
  )
}

/**
 * Situação atual — o número que responde a pergunta da tela.
 *
 * Um por tela. O tamanho é contido de propósito: o valor de destaque anterior
 * chegava a 56px e empurrava todo o resto para fora da primeira dobra.
 */
export function Situacao({
  rotulo,
  valorCentavos,
  valorTexto,
  apoio,
  tom = "neutro",
  className,
}: {
  rotulo: string
  /** Use este para dinheiro. A formatação é a do app. */
  valorCentavos?: number
  /** Use este quando não for dinheiro (quantidade, prazo, percentual). */
  valorTexto?: string
  /** Uma linha curta. O que não cabe aqui é outra tela. */
  apoio?: string
  tom?: Tom
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[calc(12px*var(--escala-letra))] font-medium uppercase tracking-[0.08em] text-muted-fg">{rotulo}</p>
      <p className={cn("numero mt-1 text-[clamp(24px,4vw,32px)] font-bold leading-none tracking-[-0.03em]", COR_DO_TOM[tom])}>
        {valorCentavos !== undefined ? formatarMoeda(valorCentavos) : valorTexto}
      </p>
      {apoio && <p className="mt-1.5 text-[calc(13px*var(--escala-letra))] leading-snug text-muted-fg">{apoio}</p>}
    </div>
  )
}

/**
 * Progresso — atual, meta e o que falta.
 *
 * O "falta" é calculado aqui e não pedido por parâmetro: duas telas já
 * escreveram essa subtração de jeitos diferentes, e uma delas deixava valor
 * negativo aparecer quando a pessoa passava da meta.
 */
export function Progresso({
  rotulo,
  atualCentavos,
  metaCentavos,
  tom = "positivo",
  className,
}: {
  rotulo?: string
  atualCentavos: number
  metaCentavos: number
  tom?: Tom
  className?: string
}) {
  const meta = Math.max(1, metaCentavos)
  const percentual = Math.min(100, Math.max(0, Math.round((atualCentavos / meta) * 100)))
  const falta = Math.max(0, metaCentavos - atualCentavos)

  return (
    <div className={cn("min-w-0", className)}>
      {rotulo && <p className="text-[calc(13px*var(--escala-letra))] font-medium">{rotulo}</p>}
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <span className={cn("numero text-[calc(18px*var(--escala-letra))] font-semibold tabular-nums", COR_DO_TOM[tom])}>
          {formatarMoeda(atualCentavos)}
        </span>
        <span className="text-[calc(12px*var(--escala-letra))] text-muted-fg">
          de <span className="numero">{formatarMoeda(metaCentavos)}</span> · {percentual}%
        </span>
      </div>
      {/* `<progress>` nativo: leitor de tela anuncia sozinho e o teclado não
          precisa de nada. Barra de 6px — a de 12px lia como controle. */}
      <progress
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
        aria-label={rotulo ? `${rotulo}: ${percentual}%` : `${percentual}%`}
        value={percentual}
        max={100}
      />
      <p className="mt-1.5 text-[calc(12px*var(--escala-letra))] text-muted-fg">
        {falta > 0 ? (
          <>
            Faltam <span className="numero">{formatarMoeda(falta)}</span>
          </>
        ) : (
          "Meta alcançada"
        )}
      </p>
    </div>
  )
}

/**
 * Comparação entre períodos.
 *
 * A seta carrega o sentido junto com a cor — quem não distingue verde de
 * vermelho continua lendo a direção. Em despesa, cair é bom, então o tom não
 * sai do sinal da diferença: quem chama decide, pelo parâmetro `melhorQuando`.
 */
export function Comparacao({
  rotulo,
  atualCentavos,
  anteriorCentavos,
  rotuloAnterior = "mês passado",
  melhorQuando = "sobe",
  className,
}: {
  rotulo: string
  atualCentavos: number
  anteriorCentavos: number
  rotuloAnterior?: string
  /** Em receita, subir é bom. Em despesa, é o contrário. */
  melhorQuando?: "sobe" | "desce"
  className?: string
}) {
  const diferenca = atualCentavos - anteriorCentavos
  const subiu = diferenca > 0
  const igual = diferenca === 0
  const bom = melhorQuando === "sobe" ? subiu : !subiu
  const Seta = subiu ? ArrowUpRight : ArrowDownRight
  const percentual = anteriorCentavos === 0 ? null : Math.round((diferenca / Math.abs(anteriorCentavos)) * 100)

  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[calc(12px*var(--escala-letra))] font-medium uppercase tracking-[0.08em] text-muted-fg">{rotulo}</p>
      <p className="numero mt-1 text-[calc(20px*var(--escala-letra))] font-semibold leading-none">{formatarMoeda(atualCentavos)}</p>
      <p
        className={cn(
          "mt-1.5 flex items-center gap-1 text-[calc(12px*var(--escala-letra))]",
          igual ? "text-muted-fg" : bom ? "text-positivo" : "text-negativo",
        )}
      >
        {igual ? (
          <span aria-hidden>=</span>
        ) : (
          <Seta aria-hidden className="size-3.5 shrink-0" strokeWidth={2.5} />
        )}
        <span className="numero">{formatarMoeda(Math.abs(diferenca))}</span>
        {percentual !== null && <span>({Math.abs(percentual)}%)</span>}
        <span className="text-muted-fg">vs. {rotuloAnterior}</span>
      </p>
    </div>
  )
}

/**
 * Próxima ação — uma por tela, com destino de verdade.
 *
 * Não aceita ação sem `href`: card com botão que não leva a lugar nenhum foi
 * justamente o que o Davi pediu para não existir.
 */
export function ProximaAcao({
  titulo,
  descricao,
  rotuloAcao,
  href,
  className,
}: {
  titulo: string
  descricao?: string
  rotuloAcao: string
  href: string
  className?: string
}) {
  return (
    <Moldura className={cn("flex items-center gap-3", className)}>
      <div className="min-w-0 flex-1">
        <p className="text-[calc(14px*var(--escala-letra))] font-semibold leading-snug">{titulo}</p>
        {descricao && <p className="mt-0.5 text-[calc(12px*var(--escala-letra))] leading-snug text-muted-fg">{descricao}</p>}
      </div>
      <Link
        href={href}
        className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-[calc(13px*var(--escala-letra))] font-medium text-primary-foreground sm:h-9"
      >
        {rotuloAcao}
        <ArrowRight aria-hidden className="size-3.5" />
      </Link>
    </Moldura>
  )
}

/**
 * Etapas concluídas e pendentes.
 *
 * A concluída fica marcada e apagada; a atual fica em destaque. Numeração só
 * aparece porque aqui a ordem É a informação — não dá para pular etapa.
 */
export function Etapas({
  etapas,
  className,
}: {
  etapas: { titulo: string; descricao?: string; concluida?: boolean }[]
  className?: string
}) {
  return (
    <ol className={cn("grid gap-1", className)}>
      {etapas.map((etapa, indice) => (
        <li key={etapa.titulo} className="flex items-start gap-2.5 py-1.5">
          <span
            aria-hidden
            className={cn(
              "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[max(10px,calc(12px*var(--escala-letra)))] font-semibold",
              etapa.concluida ? "bg-positivo/15 text-positivo" : "border border-pauta text-muted-fg",
            )}
          >
            {etapa.concluida ? <Check className="size-3" strokeWidth={3} /> : indice + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn("block text-[calc(13px*var(--escala-letra))] font-medium leading-snug", etapa.concluida && "text-muted-fg line-through decoration-muted-fg/40")}>
              {etapa.titulo}
            </span>
            {etapa.descricao && <span className="mt-0.5 block text-[calc(12px*var(--escala-letra))] leading-snug text-muted-fg">{etapa.descricao}</span>}
          </span>
          <span className="sr-only">{etapa.concluida ? "concluída" : "pendente"}</span>
        </li>
      ))}
    </ol>
  )
}

/**
 * Detalhe recolhível.
 *
 * `<details>` nativo: abre com teclado, é anunciado pelo leitor de tela e
 * não precisa de estado em React. O `+` gira ao abrir, como no resto do app.
 */
export function Detalhes({
  titulo,
  children,
  className,
}: {
  titulo: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <details className={cn("group border-t border-pauta", className)}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2.5 text-[calc(13px*var(--escala-letra))] font-medium sm:min-h-9 [&::-webkit-details-marker]:hidden">
        {titulo}
        <span
          aria-hidden
          className="text-[calc(16px*var(--escala-letra))] leading-none text-muted-fg transition-transform group-open:rotate-45 motion-reduce:transition-none"
        >
          +
        </span>
      </summary>
      <div className="pb-3 text-[calc(13px*var(--escala-letra))] leading-relaxed text-muted-fg">{children}</div>
    </details>
  )
}

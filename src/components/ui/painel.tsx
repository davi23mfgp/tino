import { formatarMoeda } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"

/**
 * Blocos de tela do Tino.
 *
 * Refeitos em 05/09/2026 a partir do brief em `docs/BRIEF-REDESIGN.md`. A ideia
 * que manda aqui: a separação entre as coisas vem de espaçamento, borda de 1px
 * e um degrau de superfície — nunca de contorno colorido. Contorno colorido em
 * seis cartões empilhados vira listra, e a tela passa a gritar toda de uma vez,
 * que é o contrário de hierarquia.
 *
 * Todo valor sai com algarismo tabular. Sem largura fixa por dígito a coluna de
 * números dança conforme o dígito e conferir extrato vira caça ao erro.
 */

export function Cartao({
  children,
  className,
  titulo,
  acao,
  /** Desliga o realce no passar do mouse — use em cartão que não é clicável. */
  estatico = false,
}: {
  children: React.ReactNode
  className?: string
  titulo?: string
  acao?: React.ReactNode
  estatico?: boolean
}) {
  return (
    <section
      className={cn(
        "ficha p-6",
        !estatico &&
          "transition-[transform,border-color] duration-200 ease-[var(--curva)] hover:-translate-y-px hover:border-foreground/[0.14]",
        className,
      )}
    >
      {(titulo || acao) && (
        <header className="mb-5 flex items-center justify-between gap-3">
          {/* 13px, peso normal, cor secundária — medido no protótipo. O título
              do cartão nomeia, não compete: quem manda no cartão é o número
              embaixo dele. Antes era 15px seminegrito, e disputava. */}
          {titulo && (
            <h2 className="text-[13px] tracking-[-0.013em] text-[color:var(--texto-2)]">{titulo}</h2>
          )}
          {acao && <div className="shrink-0 text-[13px] text-acao">{acao}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

type Tom = "neutro" | "positivo" | "negativo" | "atencao"

/** Cor semântica. Cinza para número neutro: só o que exige atenção ganha cor. */
export const TOM: Record<Tom, string> = {
  neutro: "text-foreground",
  positivo: "text-positivo",
  negativo: "text-negativo",
  atencao: "text-atencao",
}

/**
 * O rótulo pequeno em maiúscula.
 *
 * Ele existe para nomear um número sem competir com ele: 11px, espaçado, e na
 * cor terciária. É o nível de texto que a pessoa lê uma vez e depois ignora,
 * porque o que ela volta para ver é o valor.
 */
export function Rotulo({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] uppercase tracking-[0.06em] text-[color:var(--texto-3)]", className)}>{children}</p>
  )
}

/**
 * O número herói: o valor que dá nome ao cartão.
 *
 * Tamanho grande com tracking negativo — em corpo grande o espaçamento normal
 * abre demais e o número perde o bloco. É a mesma regra que a Apple usa no
 * título de sistema.
 */
export function Valor({
  children,
  tom = "neutro",
  tamanho = "heroi",
  className,
}: {
  children: React.ReactNode
  tom?: Tom
  tamanho?: "heroi" | "cartao" | "medio" | "linha"
  className?: string
}) {
  // Três degraus, todos medidos no protótipo com o inspetor, todos em peso 600
  // e tracking de -0,03em. Em corpo grande o espaçamento normal abre demais e
  // o número perde o bloco — por isso ele fecha, na mesma proporção nos três.
  //
  //   heroi   44px  o saldo, um por tela
  //   cartao  28px  o número que dá nome a um cartão
  //   medio   24px  a métrica dentro de um cartão, em grade de quatro
  //
  // A diferença entre 28 e 24 parece pequena escrita, mas é o que separa "este
  // cartão é sobre este número" de "estes quatro números são irmãos".
  const escala = {
    heroi: "text-[44px] leading-[1.05] tracking-[-0.03em]",
    cartao: "text-[28px] leading-[1.1] tracking-[-0.03em]",
    medio: "text-[24px] leading-[1.1] tracking-[-0.03em]",
    linha: "text-[15px] leading-snug tracking-[-0.01em]",
  }[tamanho]

  return <p className={cn("numero font-semibold", escala, TOM[tom], className)}>{children}</p>
}

export function Metrica({
  rotulo,
  valor,
  detalhe,
  tom = "neutro",
  /** Comparação com o período anterior. Percentual sem referência não informa. */
  variacao,
}: {
  rotulo: string
  valor: string
  detalhe?: string
  tom?: Tom
  variacao?: { texto: string; sentido: "sobe" | "desce" | "igual" }
}) {
  return (
    <div className="rounded-[var(--raio-campo)] bg-papel-2 px-4 py-4">
      <Rotulo>{rotulo}</Rotulo>
      <Valor tom={tom} tamanho="medio" className="mt-2">
        {valor}
      </Valor>
      {variacao && (
        <p className="mt-2 text-[12px] leading-snug text-[color:var(--texto-2)]">
          {variacao.sentido === "sobe" ? "↑" : variacao.sentido === "desce" ? "↓" : "="} {variacao.texto}
        </p>
      )}
      {detalhe && <p className="mt-2 text-[12px] leading-snug text-[color:var(--texto-2)]">{detalhe}</p>}
    </div>
  )
}

/** Pílula: rótulo curto que classifica sem pesar. Categoria, status, filtro. */
export function Pilula({
  children,
  tom = "neutro",
  className,
}: {
  children: React.ReactNode
  tom?: Tom | "acao"
  className?: string
}) {
  const estilo =
    tom === "acao"
      ? "bg-acao/12 text-acao"
      : {
          neutro: "bg-foreground/[0.07] text-[color:var(--texto-2)]",
          positivo: "bg-positivo/12 text-positivo",
          negativo: "bg-negativo/12 text-negativo",
          atencao: "bg-atencao/12 text-atencao",
        }[tom]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--raio-pilula)] px-2.5 py-1 text-[12px] leading-none",
        estilo,
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Barra de progresso. Acima de 100% fica vermelha — é o sinal de estouro. */
export function Barra({ percentual, tom }: { percentual: number; tom?: "verde" | "ambar" | "vermelho" }) {
  const limitado = Math.max(0, Math.min(100, percentual))
  const cor =
    tom === "vermelho" || percentual > 100
      ? "bg-negativo"
      : tom === "ambar" || percentual >= 80
        ? "bg-atencao"
        : "bg-positivo"

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/[0.09]">
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-[var(--curva)]", cor)}
        style={{ width: `${limitado}%` }}
      />
    </div>
  )
}

/**
 * Onde o dinheiro do mês foi, em barras.
 *
 * Substitui a rosca no painel. Para quatro a seis categorias, rótulo com valor
 * e barra ao lado lê num relance; a rosca obriga a pessoa a cruzar cor com
 * legenda para descobrir qual fatia é qual. A rosca continua na Análise, onde
 * a pessoa foi justamente comparar proporção.
 *
 * A barra é relativa à MAIOR categoria, não ao total: com o total, a maior
 * categoria de um mês espalhado ocupa 30% da largura e todas as outras viram
 * risquinhos indistinguíveis.
 */
export function BarrasCategorias({
  dados,
  limite = 6,
}: {
  dados: { nome: string; totalCentavos: number }[]
  /** Acima disto a lista deixa de ser um relance e vira tabela. */
  limite?: number
}) {
  const principais = dados.slice(0, limite)
  const maior = Math.max(...principais.map((linha) => linha.totalCentavos), 1)

  return (
    <ul className="space-y-3">
      {principais.map((linha) => (
        <li key={linha.nome}>
          <div className="flex items-baseline justify-between gap-3">
            {/* Nome da categoria em preto, medido no protótipo. Em cinza ele
                virava legenda do valor; em preto os dois pesam igual, que é o
                certo — "Mercado" e "R$ 1.120,00" são a mesma informação lida
                de dois jeitos. */}
            <span className="min-w-0 truncate text-[13px] text-foreground">{linha.nome}</span>
            <span className="numero shrink-0 text-[13px] font-medium">
              {formatarMoeda(linha.totalCentavos)}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.07]">
            <div
              className="h-full rounded-full bg-acao transition-[width] duration-500 ease-[var(--curva)]"
              style={{ width: `${Math.max(2, (linha.totalCentavos / maior) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * Tela sem conteúdo.
 *
 * Nunca só um texto cinza no meio: quem chega aqui não sabe o que fazer, e a
 * tela vazia é o momento em que ela mais precisa de um caminho. Por isso o
 * traço, a frase e — quando existe um próximo passo — o botão.
 */
export function Vazio({
  titulo,
  texto,
  acao,
}: {
  titulo: string
  texto?: string
  acao?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-[var(--raio-campo)] px-4 py-10 text-center">
      {/* Traço mínimo: uma folha com uma linha escrita e o resto por preencher.
          Diz "falta lançar" sem precisar de ilustração colorida. */}
      <svg viewBox="0 0 48 48" aria-hidden className="mb-4 h-9 w-9 text-[color:var(--texto-3)]">
        <rect x="11" y="7" width="26" height="34" rx="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M17 17h14M17 24h14M17 31h7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>
      <p className="text-[14px] font-medium text-foreground">{titulo}</p>
      {texto && <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-[color:var(--texto-2)]">{texto}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  )
}

/**
 * Aviso destacado.
 *
 * Faixa lateral de 3px e fundo levemente tingido — nunca contorno colorido em
 * volta do cartão. O contorno transformava o aviso num retângulo que gritava
 * mais alto que o próprio número, e numa tela com dois avisos a pessoa perdia
 * a ordem de importância.
 */
export function Aviso({
  children,
  tom = "atencao",
}: {
  children: React.ReactNode
  tom?: "atencao" | "critico" | "info"
}) {
  const estilo = {
    critico: "border-l-negativo bg-negativo/[0.07] text-foreground",
    atencao: "border-l-atencao bg-atencao/[0.07] text-foreground",
    info: "border-l-foreground/20 bg-papel-2 text-[color:var(--texto-2)]",
  }[tom]

  return (
    <div
      className={cn(
        "rounded-[var(--raio-campo)] border-l-[3px] py-3.5 pl-4 pr-4 text-[13px] leading-relaxed",
        estilo,
      )}
    >
      {children}
    </div>
  )
}

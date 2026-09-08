import { ArrowDownRight, ArrowUpRight } from "lucide-react"

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
        // Recheio 16px no celular / 20px no desktop — número do spec
        // (PARTE 2), medido nas telas do Calen. Antes era 24px em toda largura,
        // o que somado ao respiro entre cards comia a primeira dobra do mobile.
        "ficha p-4 sm:p-5",
        !estatico &&
          "transition-[transform,border-color] duration-200 ease-[var(--curva)] hover:-translate-y-px hover:border-foreground/[0.14]",
        className,
      )}
    >
      {(titulo || acao) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {/* 15px seminegrito — número do spec (PARTE 2, "título de card").
              No Calen o título do card É lido: ele diz de que assunto é o
              bloco, e o número embaixo responde. Em 13px cinza ele sumia. */}
          {titulo && <h2 className="text-[15px] font-semibold tracking-tight">{titulo}</h2>}
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
    <p
      className={cn(
        // 11px / peso 600 / tracking 0.14em — número do spec (PARTE 2). O
        // espaçamento largo é o que faz a caixa alta virar rótulo em vez de
        // grito: em 0.06em ele ainda lia como texto normal em maiúscula.
        "text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--texto-3)]",
        className,
      )}
    >
      {children}
    </p>
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
  //   heroi   36px (30px no celular)  o número da tela, um por tela
  //   cartao  28px  o número que dá nome a um cartão
  //   medio   30px  a métrica dentro de um cartão, em grade de quatro
  //
  // Os degraus vêm da PARTE 2 do spec, medidos nas telas do Calen. O `heroi`
  // ENCOLHEU de 44 para 36: 44 era grande sem ser hierarquia, porque o texto
  // ao redor era 22px e os dois brigavam. O `medio` CRESCEU de 24 para 30
  // pelo motivo inverso — a grade de quatro números do mês é o segundo lugar
  // onde o olho para, e em 24px ela lia como legenda.
  const escala = {
    heroi: "text-[30px] leading-none tracking-tight sm:text-[36px]",
    cartao: "text-[28px] leading-[1.1] tracking-[-0.03em]",
    medio: "text-[30px] leading-none tracking-tight",
    linha: "text-[15px] leading-snug tracking-[-0.01em]",
  }[tamanho]

  // A cor sozinha nunca é o sinal (chroma zero no app inteiro): positivo e
  // negativo levam a mesma seta que já aparecia como "↑"/"↓" solto em
  // `Metrica` — aqui vira ícone de verdade, herdando a cor do texto (`currentColor`)
  // e o tamanho do próprio número (`em`), então escala sozinho nos quatro
  // tamanhos sem precisar de prop nova.
  const Seta = tom === "positivo" ? ArrowUpRight : tom === "negativo" ? ArrowDownRight : null

  return (
    <p className={cn("numero inline-flex items-baseline gap-0.5 font-semibold", escala, TOM[tom], className)}>
      {Seta && (
        <Seta aria-hidden className="relative top-[0.09em] size-[0.72em] shrink-0" strokeWidth={2.5} />
      )}
      {children}
    </p>
  )
}

export function Metrica({
  rotulo,
  valor,
  detalhe,
  tom = "neutro",
  /** Comparação com o período anterior. Percentual sem referência não informa. */
  variacao,
  /** Ícone dentro de um círculo sólido, como a referência que Davi mandou —
      substitui o halo borrado que tinha antes (gradiente colorido atrás do
      ícone). Opcional: nenhuma tela é obrigada a escolher um ícone por
      métrica, e a maioria das ~20 telas com `<Metrica>` continua sem ele. */
  icone: Icone,
}: {
  rotulo: string
  valor: string
  detalhe?: string
  tom?: Tom
  variacao?: { texto: string; sentido: "sobe" | "desce" | "igual" }
  icone?: React.ComponentType<{ className?: string }>
}) {
  // Recheio 16px, raio de cartão, SEM borda — "sem borda extra, só card"
  // (spec, PARTE 4.1 item 4). A borda existia pra separar os quatro tiles
  // entre si, mas o `gap-4` já faz isso; somada à borda do cartão que os
  // contém ela virava listra dupla, que é o que dava aspecto técnico.
  return (
    <div className="ios-tap relative overflow-hidden rounded-[var(--raio-cartao)] bg-papel-2 p-4">
      {Icone && (
        // Círculo sólido — bg-card (não papel translúcido, pra destacar do
        // fundo do tile) + borda de 1px, ícone em foreground. Chroma zero:
        // nada de gradiente colorido atrás, como a referência mostrava.
        <span
          aria-hidden
          className="mb-3 grid size-9 place-items-center rounded-full border border-pauta bg-card text-foreground"
        >
          <Icone className="size-4" />
        </span>
      )}
      <Rotulo>{rotulo}</Rotulo>
      <Valor tom={tom} tamanho="medio" className="mt-2">
        {valor}
      </Valor>
      {variacao && (
        <p className="mt-2 flex items-center gap-1 text-[12px] leading-snug text-[color:var(--texto-2)]">
          {variacao.sentido === "sobe" ? (
            <ArrowUpRight aria-hidden className="size-3.5 shrink-0" strokeWidth={2.5} />
          ) : variacao.sentido === "desce" ? (
            <ArrowDownRight aria-hidden className="size-3.5 shrink-0" strokeWidth={2.5} />
          ) : (
            <span aria-hidden>=</span>
          )}
          {variacao.texto}
        </p>
      )}
      {detalhe && <p className="mt-2 text-[12px] leading-snug text-[color:var(--texto-2)]">{detalhe}</p>}
    </div>
  )
}

/**
 * O herói da tela: rótulo pequeno em caixa alta, número grande, uma linha de
 * apoio curta. Nada mais.
 *
 * É a anatomia da PARTE 4.1 do spec, copiada da referência: no Calen a
 * primeira coisa da tela é `SALDO TOTAL` / `R$ 9.663,80` — três palavras e um
 * número. O Tino fazia o contrário (duas frases de 30 palavras em 22px, e o
 * número escondido numa caixinha de 20px embaixo), e era esse inverso que o
 * Davi leu como "muita parte técnica".
 *
 * `apoio` tem teto de 8 palavras por contrato do spec, não por estilo: o que
 * não cabe em 8 palavras não é apoio, é outra tela.
 */
export function Heroi({
  rotulo,
  valor,
  tom = "neutro",
  apoio,
  acao,
}: {
  rotulo: string
  valor: string
  tom?: Tom
  apoio?: string
  acao?: React.ReactNode
}) {
  return (
    <section className="px-1 pb-1 pt-2">
      <Rotulo>{rotulo}</Rotulo>
      <Valor tom={tom} className="mt-2">
        {valor}
      </Valor>
      {apoio && <p className="mt-2 text-[12px] leading-snug text-[color:var(--texto-2)]">{apoio}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </section>
  )
}

/**
 * Uma linha de lista, do jeito do Calen: círculo de ícone à esquerda, nome em
 * cima, subtexto embaixo, valor à direita.
 *
 * Existe porque as listas do Tino eram texto puro alinhado em duas colunas
 * ("Centauro … R$ 89,90"), e uma pilha dessas não tem ritmo — o olho precisa
 * LER cada linha pra saber onde uma acaba e a outra começa. O círculo dá o
 * ponto de ancoragem que deixa escanear sem ler, e é por isso que toda linha
 * de toda tela do Calen tem um.
 *
 * 40px no celular / 44px no desktop com ícone de 18px, números do spec
 * (PARTE 2). O 44 não é arredondamento: é o mínimo de área tocável, e a linha
 * inteira costuma ser o alvo do toque.
 */
export function LinhaLista({
  icone: Icone,
  nome,
  detalhe,
  valor,
  tomValor = "neutro",
  href,
}: {
  icone?: React.ComponentType<{ className?: string }>
  nome: string
  detalhe?: string
  valor?: string
  tomValor?: Tom
  href?: string
}) {
  const Raiz = href ? "a" : "div"

  return (
    <Raiz
      {...(href ? { href } : {})}
      className={cn(
        "flex min-h-[44px] items-center gap-3 rounded-[var(--raio-campo)] py-1.5",
        href && "ios-tap -mx-2 px-2 hover:bg-foreground/[0.04]",
      )}
    >
      {Icone ? (
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-foreground/[0.07] text-[color:var(--texto-2)] sm:size-11"
        >
          <Icone className="size-[18px]" />
        </span>
      ) : (
        <span aria-hidden className="size-10 shrink-0 rounded-full bg-foreground/[0.07] sm:size-11" />
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium">{nome}</span>
        {detalhe && (
          <span className="block truncate text-[12px] text-[color:var(--texto-2)]">{detalhe}</span>
        )}
      </span>

      {valor && (
        <span className={cn("numero shrink-0 text-[14px] font-semibold", TOM[tomValor])}>{valor}</span>
      )}
    </Raiz>
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

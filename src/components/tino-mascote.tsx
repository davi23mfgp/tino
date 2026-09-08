import { cn } from "@/lib/utils"

/**
 * O Tino.
 *
 * Corpo de bloco de anotação, fita de cupom saindo do topo e uma linha de pauta
 * atravessando o peito — os três objetos que aparecem em qualquer balcão de
 * loja e em qualquer mesa de contador. Não é um robô nem um porquinho: o
 * assunto aqui é papel conferido peça por peça.
 *
 * Redesenhado em 05/09/2026. O desenho anterior era chapado e anguloso, e o
 * Davi pediu um bicho com cara de gente: forma redonda, volume de verdade,
 * olho com brilho. O que continua igual é a fita de cupom, que é a única
 * coisa que só o Tino tem — nenhum outro app de dinheiro tem papel saindo da
 * cabeça. É nela que a personalidade mora, e é por isso que ela não entra na
 * personalização.
 *
 * A EXPRESSÃO VEM DO ESTADO DAS CONTAS, NUNCA DA PERSONALIZAÇÃO. A pessoa
 * escolhe a cor e o acessório; ela não escolhe se o Tino está tranquilo. Um
 * mascote que sorri porque o dono mandou sorrir mentiria sobre o mês, e essa
 * é a mentira que esta base mais evita.
 */

export type EstadoTino = "tranquilo" | "atento" | "apertado" | "critico" | "comemorando" | "pensando"

/** As cores que a pessoa pode dar a ele. */
export type CorTino = "grafite" | "chumbo" | "cinza" | "prata" | "gelo" | "branco"

/** O que ele pode vestir. Um de cada vez: dois já viram fantasia. */
export type AcessorioTino = "nenhum" | "oculos" | "gravata" | "bone"

export interface AparenciaTino {
  cor: CorTino
  acessorio: AcessorioTino
}

export const APARENCIA_PADRAO: AparenciaTino = { cor: "grafite", acessorio: "nenhum" }

/**
 * Cada cor é dada em dois tons: o corpo e a sombra dele.
 *
 * Em 05/09/2026 a paleta virou escala de cinza junto com o resto do app, e os
 * nomes foram renomeados junto: manter a chave `azul` num tom que não é azul
 * seria o tipo de rótulo mentiroso que esta base não aceita. Renomear saiu de
 * graça porque ainda não existe tela para escolher — toda linha do banco está
 * no padrão.
 *
 * Os seis tons estão espalhados na escala inteira, do quase preto ao quase
 * branco, para que a escolha ainda signifique alguma coisa sem matiz.
 */
const PELE: Record<CorTino, { corpo: string; sombra: string; nome: string }> = {
  grafite: { corpo: "oklch(0.42 0 0)", sombra: "oklch(0.3 0 0)", nome: "Grafite" },
  chumbo: { corpo: "oklch(0.55 0 0)", sombra: "oklch(0.42 0 0)", nome: "Chumbo" },
  cinza: { corpo: "oklch(0.66 0 0)", sombra: "oklch(0.53 0 0)", nome: "Cinza" },
  prata: { corpo: "oklch(0.78 0 0)", sombra: "oklch(0.64 0 0)", nome: "Prata" },
  gelo: { corpo: "oklch(0.88 0 0)", sombra: "oklch(0.74 0 0)", nome: "Gelo" },
  branco: { corpo: "oklch(0.97 0 0)", sombra: "oklch(0.82 0 0)", nome: "Branco" },
}

export const CORES_TINO = (Object.keys(PELE) as CorTino[]).map((cor) => ({ cor, nome: PELE[cor].nome }))

export const ACESSORIOS_TINO: { acessorio: AcessorioTino; nome: string }[] = [
  { acessorio: "nenhum", nome: "Sem nada" },
  { acessorio: "oculos", nome: "Óculos" },
  { acessorio: "gravata", nome: "Gravata" },
  { acessorio: "bone", nome: "Boné" },
]

/** A cor do estado: fita, olho e detalhe. Vem do motor de alertas. */
const COR: Record<EstadoTino, string> = {
  tranquilo: "oklch(var(--lch-positivo))",
  atento: "oklch(var(--lch-atencao))",
  apertado: "oklch(var(--lch-atencao))",
  critico: "oklch(var(--lch-negativo))",
  comemorando: "oklch(var(--lch-positivo))",
  pensando: "oklch(var(--lch-dado))",
}

/** Uma frase por estado, na voz do produto: direta, sem drama e sem apelido. */
export const FRASE: Record<EstadoTino, string> = {
  tranquilo: "As contas fecham.",
  atento: "Tem coisa para olhar.",
  apertado: "O mês está apertado.",
  critico: "Precisa de decisão agora.",
  comemorando: "Meta batida.",
  pensando: "Conferindo os números…",
}

/**
 * O olho é o que faz o desenho parecer vivo, então é onde está o detalhe:
 * íris, pupila e um brilho fora do centro. Um círculo chapado devolveria o
 * boneco anterior.
 *
 * A pálpebra desce conforme aperta. É a mesma ideia da sobrancelha antiga,
 * mas na altura da pálpebra o olho continua legível quando o desenho encolhe.
 */
function Olho({ x, estado, cor }: { x: number; estado: EstadoTino; cor: string }) {
  const fechado = estado === "pensando"
  const palpebra = estado === "critico" ? 3.4 : estado === "apertado" ? 2.2 : estado === "atento" ? 1.2 : 0

  if (fechado) {
    return (
      <path
        d={`M${x - 5.6} 36.6 Q${x} 41 ${x + 5.6} 36.6`}
        fill="none"
        stroke="oklch(0.2 0 0)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    )
  }

  return (
    <g>
      <ellipse cx={x} cy="37" rx="6" ry="6.5" fill="#ffffff" />
      <circle cx={x} cy="37.8" r="3.9" fill={cor} />
      <circle cx={x} cy="37.8" r="2.05" fill="oklch(0.16 0 0)" />
      {/* Brilho fora do centro: no centro vira olho de boneco de vitrine. */}
      <circle cx={x - 1.9} cy="35.2" r="1.5" fill="#ffffff" opacity="0.95" />
      {palpebra > 0 && (
        <path
          d={`M${x - 6.2} ${31.6 + palpebra} a6.2 6.6 0 0 1 12.4 0 Z`}
          fill="var(--tino-corpo)"
        />
      )}
    </g>
  )
}

/** Boca: reta quando está tudo certo, curva conforme aperta ou melhora. */
function Boca({ estado }: { estado: EstadoTino }) {
  const traco = {
    fill: "none",
    stroke: "oklch(0.2 0 0)",
    strokeWidth: 2.3,
    strokeLinecap: "round" as const,
  }

  if (estado === "comemorando") {
    return (
      <g>
        <path d="M25.5 48 Q32 55.5 38.5 48" {...traco} />
        {/* Bochecha só na comemoração: é o único estado em que o desenho pode
            passar da conta sem mentir sobre o mês. */}
        <ellipse cx="17.5" cy="46.5" rx="3.6" ry="2.4" fill="oklch(0.62 0 0)" opacity="0.42" />
        <ellipse cx="46.5" cy="46.5" rx="3.6" ry="2.4" fill="oklch(0.62 0 0)" opacity="0.42" />
      </g>
    )
  }
  if (estado === "critico") return <path d="M26.5 52 Q32 46.2 37.5 52" {...traco} />
  if (estado === "apertado") return <path d="M27 50.4 Q32 47.2 37 50.4" {...traco} />
  if (estado === "pensando") return <path d="M28 49.6 h8" {...traco} />
  return <path d="M27.5 49 Q32 52 36.5 49" {...traco} />
}

function Acessorio({ acessorio, cor }: { acessorio: AcessorioTino; cor: string }) {
  if (acessorio === "oculos") {
    return (
      <g fill="none" stroke="oklch(0.24 0 0)" strokeWidth="1.5" opacity="0.9">
        <circle cx="23" cy="37" r="8.2" />
        <circle cx="41" cy="37" r="8.2" />
        <path d="M31.2 36.2 h1.6" strokeLinecap="round" />
      </g>
    )
  }
  if (acessorio === "gravata") {
    return (
      <g>
        <path d="M32 58 l-2.8 3.6 2.8 6.6 2.8 -6.6 Z" fill={cor} />
        <path d="M29.8 56.2 h4.4 l-2.2 2.8 Z" fill={cor} opacity="0.75" />
      </g>
    )
  }
  if (acessorio === "bone") {
    return (
      <g>
        <path d="M13 23 a19 16.5 0 0 1 38 0 Z" fill={cor} />
        <path d="M51 23 h7 a2 2 0 0 1 0 4.2 h-7 Z" fill={cor} opacity="0.8" />
      </g>
    )
  }
  return null
}

export function TinoMascote({
  estado = "tranquilo",
  aparencia = APARENCIA_PADRAO,
  className,
  animado = true,
}: {
  estado?: EstadoTino
  /** Escolha da pessoa. Não muda a expressão — só cor e acessório. */
  aparencia?: AparenciaTino
  className?: string
  /** Desligue em lista, onde vários mascotes respirando viram ruído. */
  animado?: boolean
}) {
  const cor = COR[estado]
  const pele = PELE[aparencia.cor] ?? PELE.grafite
  // Ids derivados da aparência, não de um contador: duas instâncias com a
  // mesma cor compartilham a mesma definição, o que é correto e barato, e o
  // id fica igual no servidor e no cliente — id sorteado quebraria a
  // hidratação.
  const idVolume = `tino-volume-${aparencia.cor}`

  return (
    <svg
      viewBox="0 0 64 74"
      role="img"
      aria-label={`Tino: ${FRASE[estado]}`}
      className={cn("text-foreground", animado && "motion-safe:animate-respiro", className)}
      style={
        {
          animationDuration: estado === "critico" ? "1.6s" : undefined,
          "--tino-corpo": pele.corpo,
        } as React.CSSProperties
      }
    >
      <defs>
        {/* Volume, não enfeite: a luz vem de cima, como em qualquer objeto
            sobre uma mesa. Sem isso o corpo volta a ser um retângulo pintado. */}
        <linearGradient id={idVolume} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={pele.corpo} />
          <stop offset="100%" stopColor={pele.sombra} />
        </linearGradient>
      </defs>

      {/* Fita de cupom: sai de trás da cabeça e enrola, como a bobina da
          registradora. É a assinatura da casa e não entra na personalização.

          Desenhada como FITA de verdade — forma preenchida com duas bordas e
          largura que afina na ponta — e não como um traço curvo. Traço de
          espessura única virava um laço no ar: lia como alça de bolsa, não
          como papel saindo da máquina. A ponta serrilhada é o que fecha a
          leitura: papel de registradora é rasgado, nunca cortado reto. */}
      <g>
        {/* A tira sobe RETA e inclinada, sem fechar em laço. O laço foi a
            primeira tentativa e lia como alça de bolsa: papel de registradora
            não faz argola, ele sai da máquina e fica de pé até alguém rasgar.
            A serrilha no topo é o rasgo, e é ela que fecha a leitura. */}
        <path
          d="M25.5 19 L29.6 3.4 L31.6 5.2 L33.6 2.2 L35.6 5 L37.6 2.6 L39.4 5.4 L35.5 19 Z"
          fill={cor}
          opacity="0.9"
        />
        {/* Linhas impressas: é o que diferencia papel de fita de tecido. */}
        <g stroke="var(--tino-corpo)" strokeWidth="0.9" strokeLinecap="round" opacity="0.75">
          <path d="M28.9 9.6 l6.3 1.1" />
          <path d="M28.2 12.4 l6.3 1.1" />
          <path d="M27.5 15.2 l4.6 0.8" />
        </g>
      </g>

      {/* Corpo: o bloco de anotação. Mais largo que alto no ombro — a versão
          estreita lia como mochila, e o bloco de balcão é um retângulo
          deitado. */}
      <rect x="6.5" y="16" width="51" height="47" rx="16" fill={`url(#${idVolume})`} />
      {/* Aro fino do mesmo tom escuro: dá borda sem virar contorno de desenho
          animado, que era o que fazia o anterior parecer adesivo. */}
      <rect
        x="6.5"
        y="16"
        width="51"
        height="47"
        rx="16"
        fill="none"
        stroke={pele.sombra}
        strokeWidth="1.2"
        opacity="0.8"
      />

      <Acessorio acessorio={aparencia.acessorio} cor={cor} />

      <Olho x={23} estado={estado} cor={cor} />
      <Olho x={41} estado={estado} cor={cor} />
      <Boca estado={estado} />

      {/* A pauta atravessando o peito: a linha do livro-caixa. */}
      <path d="M15 57.5 h34" stroke={cor} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}

/**
 * Expressão a partir dos alertas abertos.
 *
 * Um alerta CRITICO manda em tudo: não adianta o resto estar bom se o cheque
 * especial estourou. Sem alerta nenhum, o Tino fica tranquilo — o que só
 * acontece quando o motor de fato não achou nada, nunca por falta de dado.
 */
export function estadoPorAlertas(alertas: { severidade: string }[]): EstadoTino {
  if (alertas.some((alerta) => alerta.severidade === "CRITICO")) return "critico"
  if (alertas.some((alerta) => alerta.severidade === "ATENCAO")) return "atento"
  return "tranquilo"
}

/**
 * O Tino em tamanho pequeno — barra lateral, aba, lista.
 *
 * Não é outro personagem: é o mesmo, com o detalhe que não sobrevive a 16px
 * removido. Olho vira ponto cheio, some o brilho, some a sombra, some o
 * acessório. O que fica é a silhueta e a fita, que é o que identifica ele de
 * longe.
 */
export function TinoMarca({
  aparencia = APARENCIA_PADRAO,
  className,
}: {
  aparencia?: AparenciaTino
  className?: string
}) {
  const pele = PELE[aparencia.cor] ?? PELE.grafite

  return (
    <svg viewBox="0 0 64 74" role="img" aria-label="Tino" className={className}>
      <path
        d="M32 13 C32 4.5 41 2.5 45 7 C48.4 10.8 44.6 15.4 41.2 13"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="6.5" y="16" width="51" height="47" rx="16" fill={pele.corpo} />
      <circle cx="23" cy="37" r="4.2" fill="oklch(0.18 0 0)" />
      <circle cx="41" cy="37" r="4.2" fill="oklch(0.18 0 0)" />
      <path d="M15 57 h34" stroke="oklch(0.18 0 0)" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
    </svg>
  )
}

import { cn } from "@/lib/utils"

/**
 * O Tino.
 *
 * PORQUINHO desde 08/09/2026, por pedido direto do Davi ("mude o robozinho
 * para um porquinho em 3d fofo"). O desenho anterior era um bloco de anotação
 * com fita de cupom saindo da cabeça — a justificativa dele está no histórico
 * do git, e caiu porque o dono do produto pediu outra coisa.
 *
 * O que a troca ganha: cofrinho é o único objeto que qualquer pessoa no Brasil
 * já associa a guardar dinheiro sem precisar de legenda. Por isso a FRESTA DE
 * MOEDA nas costas é a assinatura da casa agora — ela é o que diferencia este
 * porco de um porco qualquer, e é ela que faz a silhueta continuar legível a
 * 16px, onde focinho e orelha viram borrão.
 *
 * O volume vem de gradiente radial com a luz vindo de cima e à esquerda, mais
 * um brilho especular e uma sombra no chão. É o mínimo para ler como objeto
 * de porcelana em vez de adesivo chapado — que é o que "3D fofo" quer dizer
 * num desenho vetorial.
 *
 * A EXPRESSÃO VEM DO ESTADO DAS CONTAS, NUNCA DA PERSONALIZAÇÃO. A pessoa
 * escolhe a cor e o acessório; ela não escolhe se o Tino está tranquilo. Um
 * mascote que sorri porque o dono mandou sorrir mentiria sobre o mês, e essa
 * é a mentira que esta base mais evita.
 */

export type EstadoTino = "tranquilo" | "atento" | "apertado" | "critico" | "comemorando" | "pensando"

/** As cores que a pessoa pode dar a ele. */
export type CorTino = "rosa" | "grafite" | "chumbo" | "cinza" | "prata" | "gelo" | "branco"

/** O que ele pode vestir. Um de cada vez: dois já viram fantasia. */
export type AcessorioTino = "nenhum" | "oculos" | "gravata" | "bone"

export interface AparenciaTino {
  cor: CorTino
  acessorio: AcessorioTino
}

/**
 * `rosa` é o padrão desde a virada para porquinho.
 *
 * É a ÚNICA exceção deliberada à regra de chroma zero do app (registrada em
 * `docs/REDESIGN-EM-CURSO.md`): um cofrinho cinza não lê como cofrinho, lê
 * como bicho genérico, e o mascote perderia a única coisa que o identifica de
 * longe. A regra continua valendo em toda interface — botão, badge, moldura,
 * navegação. Quem já tinha escolhido um cinza continua com ele.
 */
export const APARENCIA_PADRAO: AparenciaTino = { cor: "rosa", acessorio: "nenhum" }

/**
 * Cada cor é dada em três tons: a luz, o corpo e a sombra. Três, e não dois,
 * porque o volume agora é de esfera — com dois tons o gradiente fecha cedo
 * demais e a bochecha do porco fica achatada.
 */
const PELE: Record<CorTino, { luz: string; corpo: string; sombra: string; nome: string }> = {
  rosa: { luz: "oklch(0.93 0.045 15)", corpo: "oklch(0.84 0.075 12)", sombra: "oklch(0.7 0.09 10)", nome: "Rosa" },
  grafite: { luz: "oklch(0.55 0 0)", corpo: "oklch(0.42 0 0)", sombra: "oklch(0.3 0 0)", nome: "Grafite" },
  chumbo: { luz: "oklch(0.67 0 0)", corpo: "oklch(0.55 0 0)", sombra: "oklch(0.42 0 0)", nome: "Chumbo" },
  cinza: { luz: "oklch(0.78 0 0)", corpo: "oklch(0.66 0 0)", sombra: "oklch(0.53 0 0)", nome: "Cinza" },
  prata: { luz: "oklch(0.88 0 0)", corpo: "oklch(0.78 0 0)", sombra: "oklch(0.64 0 0)", nome: "Prata" },
  gelo: { luz: "oklch(0.95 0 0)", corpo: "oklch(0.88 0 0)", sombra: "oklch(0.74 0 0)", nome: "Gelo" },
  branco: { luz: "oklch(0.99 0 0)", corpo: "oklch(0.97 0 0)", sombra: "oklch(0.82 0 0)", nome: "Branco" },
}

export const CORES_TINO = (Object.keys(PELE) as CorTino[]).map((cor) => ({ cor, nome: PELE[cor].nome }))

export const ACESSORIOS_TINO: { acessorio: AcessorioTino; nome: string }[] = [
  { acessorio: "nenhum", nome: "Sem nada" },
  { acessorio: "oculos", nome: "Óculos" },
  { acessorio: "gravata", nome: "Gravata" },
  { acessorio: "bone", nome: "Boné" },
]

/** A cor do estado: moeda, íris e a luz da fresta. Vem do motor de alertas. */
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
 * A pálpebra desce conforme aperta — na altura da pálpebra o olho continua
 * legível quando o desenho encolhe, o que a sobrancelha não conseguia.
 */
function Olho({ x, estado, cor }: { x: number; estado: EstadoTino; cor: string }) {
  const fechado = estado === "pensando"
  const palpebra = estado === "critico" ? 3.2 : estado === "apertado" ? 2.1 : estado === "atento" ? 1.1 : 0

  if (fechado) {
    return (
      <path
        d={`M${x - 4.8} 33.4 Q${x} 37.2 ${x + 4.8} 33.4`}
        fill="none"
        stroke="oklch(0.24 0 0)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    )
  }

  return (
    <g>
      <ellipse cx={x} cy="33.4" rx="5.2" ry="5.7" fill="#ffffff" />
      <circle cx={x} cy="34.1" r="3.4" fill={cor} />
      <circle cx={x} cy="34.1" r="1.8" fill="oklch(0.16 0 0)" />
      {/* Brilho fora do centro: no centro vira olho de boneco de vitrine. */}
      <circle cx={x - 1.7} cy="31.8" r="1.35" fill="#ffffff" opacity="0.95" />
      {palpebra > 0 && (
        <path d={`M${x - 5.4} ${28.5 + palpebra} a5.4 5.7 0 0 1 10.8 0 Z`} fill="var(--tino-luz)" />
      )}
    </g>
  )
}

/**
 * A boca fica NO focinho, curta e baixa — em porco a boca é uma fenda pequena
 * logo abaixo das narinas, e desenhá-la larga como em gente devolve o sorriso
 * de emoji que some no tamanho pequeno.
 */
function Boca({ estado }: { estado: EstadoTino }) {
  const traco = {
    fill: "none",
    stroke: "oklch(0.32 0.05 10)",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
  }

  if (estado === "comemorando") return <path d="M28 52.6 Q32 56.6 36 52.6" {...traco} />
  if (estado === "critico") return <path d="M28.8 54.4 Q32 51.4 35.2 54.4" {...traco} />
  if (estado === "apertado") return <path d="M29 53.6 Q32 51.8 35 53.6" {...traco} />
  if (estado === "pensando") return <path d="M29.6 53 h4.8" {...traco} />
  return <path d="M29 52.4 Q32 55 35 52.4" {...traco} />
}

function Acessorio({ acessorio, cor }: { acessorio: AcessorioTino; cor: string }) {
  if (acessorio === "oculos") {
    return (
      <g fill="none" stroke="oklch(0.24 0 0)" strokeWidth="1.4" opacity="0.9">
        <circle cx="23" cy="33.4" r="7.4" />
        <circle cx="41" cy="33.4" r="7.4" />
        <path d="M30.6 32.8 h2.8" strokeLinecap="round" />
      </g>
    )
  }
  if (acessorio === "gravata") {
    return (
      <g>
        <path d="M32 61.5 l-2.6 3.2 2.6 5.8 2.6 -5.8 Z" fill={cor} />
        <path d="M30 59.9 h4 l-2 2.5 Z" fill={cor} opacity="0.75" />
      </g>
    )
  }
  if (acessorio === "bone") {
    return (
      <g>
        <path d="M15 21.5 a17.5 15 0 0 1 34 0 Z" fill={cor} />
        <path d="M49 21.5 h6.5 a2 2 0 0 1 0 4 h-6.5 Z" fill={cor} opacity="0.8" />
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
  const pele = PELE[aparencia.cor] ?? PELE.rosa
  // Ids derivados da aparência, não de um contador: duas instâncias com a
  // mesma cor compartilham a mesma definição, o que é correto e barato, e o
  // id fica igual no servidor e no cliente — id sorteado quebraria a
  // hidratação.
  const idCorpo = `tino-corpo-${aparencia.cor}`
  const idFocinho = `tino-focinho-${aparencia.cor}`

  return (
    <svg
      viewBox="0 0 64 74"
      role="img"
      aria-label={`Tino: ${FRASE[estado]}`}
      className={cn("text-foreground", animado && "motion-safe:animate-respiro", className)}
      style={
        {
          animationDuration: estado === "critico" ? "1.6s" : undefined,
          "--tino-luz": pele.luz,
        } as React.CSSProperties
      }
    >
      <defs>
        {/* Esfera, não retângulo pintado: a luz entra em cima e à esquerda, e
            o tom fecha na sombra embaixo à direita. É esse deslocamento do
            centro do gradiente que dá o volume de porcelana. */}
        <radialGradient id={idCorpo} cx="36%" cy="28%" r="78%">
          <stop offset="0%" stopColor={pele.luz} />
          <stop offset="58%" stopColor={pele.corpo} />
          <stop offset="100%" stopColor={pele.sombra} />
        </radialGradient>
        <radialGradient id={idFocinho} cx="40%" cy="28%" r="80%">
          <stop offset="0%" stopColor={pele.luz} />
          <stop offset="100%" stopColor={pele.corpo} />
        </radialGradient>
      </defs>

      {/* Sombra no chão: sem ela o bicho flutua, e flutuar é o que faz um
          desenho vetorial parecer adesivo em vez de objeto. */}
      <ellipse cx="32" cy="69" rx="19" ry="3" fill="oklch(0.1 0 0)" opacity="0.22" />

      {/* Patas, antes do corpo para ficarem por trás dele. */}
      <rect x="15" y="57" width="9" height="10" rx="4.5" fill={pele.sombra} />
      <rect x="40" y="57" width="9" height="10" rx="4.5" fill={pele.sombra} />

      {/* Rabinho em espiral, do lado direito. */}
      <path
        d="M53 45 q4.6 -1.4 3.6 -4.6 q-0.9 -2.9 -3.9 -1.6 q-2.4 1.1 -0.8 3"
        fill="none"
        stroke={pele.sombra}
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Orelhas, antes do corpo: encostam por trás da cabeça, como em porco
          de verdade, em vez de brotarem por cima como chifre. */}
      <path d="M13.5 26 q-2.5 -10 5.5 -11.5 q3.5 4.2 3 10.5 Z" fill={pele.sombra} />
      <path d="M50.5 26 q2.5 -10 -5.5 -11.5 q-3.5 4.2 -3 10.5 Z" fill={pele.sombra} />

      {/* Corpo/cabeça: uma peça só, redonda. Cofrinho de porcelana não tem
          pescoço, e separar cabeça de corpo devolveria o boneco articulado. */}
      <ellipse cx="32" cy="40" rx="25.5" ry="23" fill={`url(#${idCorpo})`} />

      {/* Brilho especular: a mancha de luz da porcelana. Elipse inclinada e
          bem opaca só na borda de cima — no meio do corpo viraria bolha. */}
      <ellipse cx="21.5" cy="25.5" rx="9" ry="5" fill="#ffffff" opacity="0.3" transform="rotate(-24 21.5 25.5)" />

      {/* A FRESTA DA MOEDA — a assinatura. Fica no alto das costas, com a
          borda escura por dentro (é um buraco, não um risco) e a luz do
          estado escapando dela: é por ali que entra o dinheiro. */}
      <g>
        <rect x="25" y="18.4" width="14" height="3.4" rx="1.7" fill={pele.sombra} />
        <rect x="26" y="19.2" width="12" height="1.8" rx="0.9" fill="oklch(0.2 0 0)" opacity="0.85" />
        <rect x="26" y="19.2" width="12" height="1.8" rx="0.9" fill={cor} opacity="0.5" />
      </g>

      {/* Moeda, só na comemoração: é o único estado em que o desenho pode
          passar da conta sem mentir sobre o mês. */}
      {estado === "comemorando" && (
        <g>
          <circle cx="32" cy="11" r="4.6" fill={cor} />
          <circle cx="32" cy="11" r="4.6" fill="none" stroke="oklch(0.2 0 0)" strokeWidth="0.8" opacity="0.35" />
          <path d="M32 8.6 v4.8 M30.2 10 h3.6 M30.2 12 h3.6" stroke="oklch(0.2 0 0)" strokeWidth="0.9" opacity="0.45" />
        </g>
      )}

      <Acessorio acessorio={aparencia.acessorio} cor={cor} />

      <Olho x={23} estado={estado} cor={cor} />
      <Olho x={41} estado={estado} cor={cor} />

      {/* Focinho: o disco com duas narinas. É a peça que faz o bicho virar
          porco na primeira olhada — por isso ele é grande e fica centrado,
          não escondido. */}
      <g>
        <ellipse cx="32" cy="46.5" rx="10.5" ry="8" fill={`url(#${idFocinho})`} />
        <ellipse cx="32" cy="46.5" rx="10.5" ry="8" fill="none" stroke={pele.sombra} strokeWidth="0.9" opacity="0.7" />
        <ellipse cx="28.4" cy="46.4" rx="1.85" ry="2.5" fill="oklch(0.34 0.05 10)" opacity="0.8" />
        <ellipse cx="35.6" cy="46.4" rx="1.85" ry="2.5" fill="oklch(0.34 0.05 10)" opacity="0.8" />
      </g>

      <Boca estado={estado} />

      {/* Bochechas: o que empurra o desenho de "porco" para "porquinho fofo".
          Mais fortes na comemoração, apagadas no crítico — a cara acompanha o
          mês, igual ao resto. */}
      <ellipse
        cx="14.5"
        cy="44"
        rx="4.2"
        ry="2.8"
        fill="oklch(0.62 0.12 12)"
        opacity={estado === "comemorando" ? 0.45 : estado === "critico" ? 0.1 : 0.25}
      />
      <ellipse
        cx="49.5"
        cy="44"
        rx="4.2"
        ry="2.8"
        fill="oklch(0.62 0.12 12)"
        opacity={estado === "comemorando" ? 0.45 : estado === "critico" ? 0.1 : 0.25}
      />
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
 * O Tino em tamanho pequeno — trilho, aba, lista.
 *
 * Não é outro personagem: é o mesmo, com o detalhe que não sobrevive a 16px
 * removido. Some o gradiente, some o brilho, some a bochecha, some o
 * acessório. O que fica é a silhueta com orelha, o focinho e a fresta da
 * moeda — os três traços que identificam o cofrinho de longe.
 */
export function TinoMarca({
  aparencia = APARENCIA_PADRAO,
  className,
}: {
  aparencia?: AparenciaTino
  className?: string
}) {
  const pele = PELE[aparencia.cor] ?? PELE.rosa

  return (
    <svg viewBox="0 0 64 74" role="img" aria-label="Tino" className={className}>
      <path d="M13.5 26 q-2.5 -10 5.5 -11.5 q3.5 4.2 3 10.5 Z" fill={pele.sombra} />
      <path d="M50.5 26 q2.5 -10 -5.5 -11.5 q-3.5 4.2 -3 10.5 Z" fill={pele.sombra} />
      <ellipse cx="32" cy="40" rx="25.5" ry="23" fill={pele.corpo} />
      <rect x="25" y="18.4" width="14" height="3.4" rx="1.7" fill="oklch(0.2 0 0)" opacity="0.7" />
      <circle cx="23" cy="34" r="3.6" fill="oklch(0.18 0 0)" />
      <circle cx="41" cy="34" r="3.6" fill="oklch(0.18 0 0)" />
      <ellipse cx="32" cy="46.5" rx="10.5" ry="8" fill={pele.sombra} />
      <ellipse cx="28.4" cy="46.4" rx="1.8" ry="2.4" fill="oklch(0.2 0 0)" opacity="0.75" />
      <ellipse cx="35.6" cy="46.4" rx="1.8" ry="2.4" fill="oklch(0.2 0 0)" opacity="0.75" />
    </svg>
  )
}

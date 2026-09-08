import type { Config } from "tailwindcss"

/**
 * Tema do Tino.
 *
 * Os nomes de cor descrevem o que a cor informa, não o tom: `positivo`,
 * `negativo`, `atencao`. Trocar o azul do positivo por outro azul não obriga a
 * mexer em 40 arquivos, e nenhuma tela fica dizendo "verde" quando o verde
 * saiu. O tom em si mora em `globals.css`.
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      // Uma família só, a do sistema. Os três nomes continuam apontando para
      // ela para não quebrar as classes já escritas nas telas: `font-numero`
      // ainda existe, só que hoje o algarismo tabular vem de
      // `font-variant-numeric`, não da troca de fonte.
      fontFamily: {
        sans: ["var(--font-ios)"],
        display: ["var(--font-ios)"],
        numero: ["var(--font-ios)"],
      },
      colors: {
        // `border`/`input` já guardam alfa embutido (`oklch(0 0 0 / 10%)`), por
        // isso ficam em `var()` cru — não precisam (nem podem) de <alpha-value>.
        border: "var(--border)",
        input: "var(--input)",
        ring: "oklch(var(--ring) / <alpha-value>)",
        /* `color-mix` e não `var()` cru.
           Estes tokens guardam a cor INTEIRA (um `oklch(...)` completo), e
           `var()` cru não deixa o Tailwind injetar opacidade: `bg-foreground/[0.09]`
           virava cor inválida, que o navegador desenha como transparente.
           Eram 24 usos assim, e o sintoma era discreto — trilha de barra de
           progresso invisível, realce de hover que não aparecia, fundo que
           sumia. Nada quebrava; as coisas só não apareciam. */
        background: "color-mix(in oklab, var(--background) calc(<alpha-value> * 100%), transparent)",
        foreground: "color-mix(in oklab, var(--foreground) calc(<alpha-value> * 100%), transparent)",
        // Trio "L C H" (chroma sempre 0) interpolado com `oklch(var(--x) /
        // <alpha-value>)` — mesmo padrão de `acao`/`positivo` abaixo. Trocou de
        // `hsl()` pra `oklch()` na skin acromática de 07/09/2026: o valor
        // guardado em `--primary` etc. virou trio oklch, não mais HSL.
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "oklch(var(--popover) / <alpha-value>)",
          foreground: "oklch(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "oklch(var(--card) / <alpha-value>)",
          foreground: "oklch(var(--card-foreground) / <alpha-value>)",
        },

        /* Papel, do mais próximo do olho ao mais fundo. Pelo mesmo motivo do
           par acima, passam por `color-mix` para aceitar opacidade. */
        "papel-1": "color-mix(in oklab, var(--papel-1) calc(<alpha-value> * 100%), transparent)",
        "papel-2": "color-mix(in oklab, var(--papel-2) calc(<alpha-value> * 100%), transparent)",
        "papel-3": "color-mix(in oklab, var(--papel-3) calc(<alpha-value> * 100%), transparent)",
        /* A linha do livro-caixa. Esta já nasce com alfa embutido no próprio
           token, então fica como está: aplicar opacidade sobre opacidade daria
           uma linha ainda mais fraca que a pretendida. */
        pauta: "var(--pauta)",
        "muted-fg": "var(--muted-fg)",

        /* Cada cor é um trio "L C H" numa variável só, que troca entre claro e
           escuro. Interpolar o trio inteiro preserva o modificador de opacidade:
           bg-positivo/10 continua funcionando. */
        acao: "oklch(var(--lch-acao) / <alpha-value>)",
        positivo: "oklch(var(--lch-positivo) / <alpha-value>)",
        negativo: "oklch(var(--lch-negativo) / <alpha-value>)",
        atencao: "oklch(var(--lch-atencao) / <alpha-value>)",
        alerta: "oklch(var(--lch-alerta) / <alpha-value>)",
        destaque: "oklch(var(--lch-destaque) / <alpha-value>)",
        dado: "oklch(var(--lch-dado) / <alpha-value>)",

        /* Variante ESCURA das três cores que também preenchem SUPERFÍCIE
           SÓLIDA com texto branco em cima (botão primário, botão destrutivo,
           faixa crítica, indicador do toggle de preço, mapa de calor no pico).
           A cor "cheia" de cima (`acao`, `negativo`, `positivo`) é clara demais
           para hospedar texto branco em cima — medido: branco sobre `acao`
           cheio dá 2.91:1, bem abaixo do 4.5:1 que WCAG AA pede. Esta variante
           é o mesmo matiz um degrau mais escuro, calculada para dar >=5:1 com
           texto branco (contraste real, não visual — ver docs/REDESIGN-EM-CURSO.md).
           A `acao`/`negativo`/`positivo` claras continuam sendo a cor de
           TEXTO, ícone, anel de foco e pastilha translúcida — não mudam. */
        "acao-solido": "oklch(var(--lch-acao-solido) / <alpha-value>)",
        "negativo-solido": "oklch(var(--lch-negativo-solido) / <alpha-value>)",
        "positivo-solido": "oklch(var(--lch-positivo-solido) / <alpha-value>)",
      },
      borderRadius: {
        sm: "8px",
        md: "10px",
        lg: "var(--radius)",
        xl: "16px",
        "2xl": "20px",
        "3xl": "26px",
      },
      boxShadow: {
        ficha: "var(--sombra-ficha)",
        alta: "var(--sombra-alta)",
      },
      backdropBlur: {
        vidro: "var(--desfoque)",
        "vidro-forte": "var(--desfoque-forte)",
      },
      // `ease-apple` já era escrito em `input.tsx` sem existir — classe morta.
      // Isto a torna real, na mesma curva usada no resto do app (`--curva`).
      transitionTimingFunction: {
        apple: "var(--curva)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out forwards",
        "slide-up": "slide-up 0.3s cubic-bezier(0.32,0.72,0,1) forwards",
        respiro: "respiro 3.4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config

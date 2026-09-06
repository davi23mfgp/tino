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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },

        /* Papel, do mais próximo do olho ao mais fundo. */
        "papel-1": "var(--papel-1)",
        "papel-2": "var(--papel-2)",
        "papel-3": "var(--papel-3)",
        /* A linha do livro-caixa. */
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

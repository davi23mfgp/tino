import type { Metadata, Viewport } from "next"

import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

/**
 * A tipografia agora é a do SISTEMA, declarada em `--font-ios` no globals.css.
 *
 * Decisão do Davi em 05/09/2026, vinda do prompt da camada de vidro. No Mac e
 * no iPhone isso resolve para a San Francisco de verdade, que nenhuma fonte
 * auto-hospedada iguala — era justamente a San Francisco que a Onest tentava
 * imitar. O custo, aceito por ele: no Windows vira Segoe UI e no Android vira
 * Roboto, então o app não é idêntico nas três plataformas.
 *
 * Onest e IBM Plex Mono saíram do `next/font` junto. Não é só limpeza: cada
 * uma baixava arquivos no build e os servia pelo próprio domínio, e agora não
 * há nenhum byte de fonte para baixar nem servir.
 *
 * O algarismo tabular, que era o motivo funcional da monoespaçada, continua —
 * vem de `font-variant-numeric` no `body`, não da família.
 */

export const metadata: Metadata = {
  metadataBase: new URL("https://tino-kappa.vercel.app"),
  title: "Tino, seu contador pessoal",
  description:
    "Organize contas, dívidas e metas em um lugar só. Projeção de caixa, plano de pagamento e ajuda para decidir empréstimo. Para pessoa física e MEI.",
  manifest: "/manifest.webmanifest",
  // Instalado na tela inicial do celular, o app abre sem barra de navegador.
  appleWebApp: { capable: true, title: "Tino", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icones/icone-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icones/icone-192.png", sizes: "192x192" }],
  },
}

export const viewport: Viewport = {
  // Skin acromática clara por padrão, escuro só opcional via `.dark`
  // (decisão do Davi, 07/09/2026, tarde — ver docs/REDESIGN-EM-CURSO.md,
  // que substitui a casca preta forçada da sessão anterior do mesmo dia).
  // Cada entrada aponta pro `--background` do tema correspondente.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f8f8" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1c1c" },
  ],
  width: "device-width",
  initialScale: 1,
  // O app tem tabela de valores: bloquear o zoom prejudicaria quem precisa dele.
  maximumScale: 5,
  // Ocupa a tela toda no celular, inclusive atrás do recorte da câmera.
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className="min-h-screen bg-background antialiased"
      >
        {/* Escuro é a casca do app por padrão agora (direção "Calen",
            07/09/2026, noite — substitui o claro-por-padrão da sessão
            anterior do mesmo dia, ver docs/REDESIGN-EM-CURSO.md). Claro
            virou o opcional, ligado via `.light`. Sem `forcedTheme`: o
            alternador em `theme-toggle.tsx` continua funcionando. */}
        <ThemeProvider attribute="class" defaultTheme="dark">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

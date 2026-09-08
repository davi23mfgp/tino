"use client";

import * as React from "react";

/**
 * Alternador de tema — implementação própria, sem `next-themes`.
 *
 * Trocado em 07/09/2026 (mesma tarde da skin acromática): o `next-themes`
 * injeta um `<script>` cru via `dangerouslySetInnerHTML` pra evitar flash de
 * tema errado no primeiro paint — técnica padrão da lib há anos, mas que essa
 * versão do Next (16.3.2) recusa em dev com "Encountered a script tag while
 * rendering React component", derrubando a página inteira ("This page
 * couldn't load"). Não é bug de versão da lib (testado com a mais recente,
 * 0.4.6, mesmo erro) — é a forma como qualquer versão do next-themes injeta
 * o script que colide com este Next. Solução: tema aplicado só depois de
 * montar, sem script de SSR. Custo aceito: quem já escolheu um tema pode ver
 * um piscar rápido do padrão no primeiro carregamento — melhor que a página
 * não abrir.
 *
 * Padrão virou ESCURO em 07/09/2026, noite (direção "Calen" — ver
 * `globals.css`): `:root` já carrega os tokens escuros, então "sem classe
 * nenhuma" já É o escuro. O claro virou o opcional, ligado via `.light`
 * (não mais `.dark` pra ligar o escuro).
 */

type Tema = "light" | "dark";

type ContextoTema = { theme: Tema; setTheme: (tema: Tema) => void };

const ContextoTema = React.createContext<ContextoTema | undefined>(undefined);

const CHAVE_ARMAZENAMENTO = "theme";

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: React.ReactNode;
  /** Mantido por compatibilidade com o `<ThemeProvider attribute="class" ...>` do layout — sempre usa classe, não há outro modo. */
  attribute?: "class";
  defaultTheme?: Tema;
}) {
  const [theme, setThemeState] = React.useState<Tema>(defaultTheme);

  React.useEffect(() => {
    let salvo: string | null = null;
    try {
      salvo = localStorage.getItem(CHAVE_ARMAZENAMENTO);
    } catch {
      // Storage indisponível (modo privado, política do navegador) — segue no padrão.
    }
    if (salvo === "dark" || salvo === "light") setThemeState(salvo);
  }, []);

  React.useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  const setTheme = React.useCallback((tema: Tema) => {
    setThemeState(tema);
    try {
      localStorage.setItem(CHAVE_ARMAZENAMENTO, tema);
    } catch {
      // Idem — a troca ainda funciona na sessão, só não persiste.
    }
  }, []);

  const valor = React.useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>;
}

export function useTheme() {
  const contexto = React.useContext(ContextoTema);
  if (!contexto) throw new Error("useTheme precisa estar dentro de <ThemeProvider>");
  return contexto;
}

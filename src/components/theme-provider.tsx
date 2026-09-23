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

/**
 * Cor de destaque que a pessoa escolhe em Perfil > Aparência. Os pares de
 * cada uma, medidos para contraste nos dois temas, estão em `globals.css`
 * (`[data-acento]`). "verde" é a marca e não precisa de atributo.
 */
export const ACENTOS = [
  { id: "verde", nome: "Verde Tino", amostra: "oklch(0.85 0.24 145)" },
  { id: "azul", nome: "Azul", amostra: "oklch(0.74 0.15 250)" },
  { id: "turquesa", nome: "Turquesa", amostra: "oklch(0.82 0.13 195)" },
  { id: "grafite", nome: "Grafite", amostra: "oklch(0.93 0 0)" },
  { id: "laranja", nome: "Laranja", amostra: "oklch(0.78 0.16 55)" },
  { id: "rosa", nome: "Rosa", amostra: "oklch(0.78 0.15 355)" },
  { id: "lilas", nome: "Lilás", amostra: "oklch(0.76 0.14 305)" },
] as const;

export type Acento = (typeof ACENTOS)[number]["id"];

type ContextoTema = {
  theme: Tema;
  setTheme: (tema: Tema) => void;
  acento: Acento;
  setAcento: (acento: Acento) => void;
};

const ContextoTema = React.createContext<ContextoTema | undefined>(undefined);

const CHAVE_ARMAZENAMENTO = "theme";
const CHAVE_ACENTO = "acento";

function ehAcento(valor: string | null): valor is Acento {
  return ACENTOS.some((acento) => acento.id === valor);
}

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
  const [acento, setAcentoState] = React.useState<Acento>("verde");

  React.useEffect(() => {
    let salvo: string | null = null;
    let acentoSalvo: string | null = null;
    try {
      salvo = localStorage.getItem(CHAVE_ARMAZENAMENTO);
      acentoSalvo = localStorage.getItem(CHAVE_ACENTO);
    } catch {
      // Storage indisponível (modo privado, política do navegador) — segue no padrão.
    }
    if (salvo === "dark" || salvo === "light") setThemeState(salvo);
    if (ehAcento(acentoSalvo)) setAcentoState(acentoSalvo);
  }, []);

  React.useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  React.useEffect(() => {
    if (acento === "verde") delete document.documentElement.dataset.acento;
    else document.documentElement.dataset.acento = acento;
  }, [acento]);

  const setTheme = React.useCallback((tema: Tema) => {
    setThemeState(tema);
    try {
      localStorage.setItem(CHAVE_ARMAZENAMENTO, tema);
    } catch {
      // Idem — a troca ainda funciona na sessão, só não persiste.
    }
  }, []);

  const setAcento = React.useCallback((novo: Acento) => {
    setAcentoState(novo);
    try {
      localStorage.setItem(CHAVE_ACENTO, novo);
    } catch {
      // A troca vale na sessão, só não persiste.
    }
  }, []);

  const valor = React.useMemo(() => ({ theme, setTheme, acento, setAcento }), [theme, setTheme, acento, setAcento]);

  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>;
}

export function useTheme() {
  const contexto = React.useContext(ContextoTema);
  if (!contexto) throw new Error("useTheme precisa estar dentro de <ThemeProvider>");
  return contexto;
}

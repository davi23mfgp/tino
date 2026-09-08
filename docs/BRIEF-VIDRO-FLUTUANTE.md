# PROMPT — Camada Visual iOS "Vidro Flutuante" (Preto & Branco Puro)

> Cole este prompt inteiro no Claude Code. Ele descreve **apenas a camada visual** — não altere lógica de negócio, rotas, fetch, banco ou tipos. Aplique sobre o projeto existente.

---

## 0. Regra Absoluta — Escala de Cinza Pura

**Toda cor usa `oklch` com chroma `0`.** Zero saturação. Nada de azul, roxo, verde, vermelho, laranja — apenas luminosidade (L) variando entre `0` e `1`, com canal alpha para transparências.

NÃO use `#fff`, `#000`, `rgb(...)`, `hsl(...)`, nem `text-white`/`bg-black` hardcoded. Use **apenas** as variáveis CSS definidas abaixo ou utilidades Tailwind mapeadas a elas.

Se qualquer cor colorida existir no projeto (ex.: `bg-blue-500`, `text-purple-400`, `from-indigo-600`), **substitua** pela escala de cinza correspondente (`bg-primary`, `text-muted-foreground`, `bg-secondary`).

---

## 1. Tokens — Cole Verbatim no `globals.css` / CSS base

### Fonte

```css
--font-ios:
  -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", system-ui,
  sans-serif;
```

### Raio

```css
--radius: 1.125rem;            /* 18px — raio base generoso, estilo iOS */
```

### `:root` (modo claro — padrão)

```css
:root {
  --background: oklch(0.975 0 0);
  --foreground: oklch(0.14 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.14 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.14 0 0);
  --primary: oklch(0.16 0 0);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.94 0 0);
  --secondary-foreground: oklch(0.18 0 0);
  --muted: oklch(0.945 0 0);
  --muted-foreground: oklch(0.5 0 0);
  --accent: oklch(0.92 0 0);
  --accent-foreground: oklch(0.16 0 0);
  --destructive: oklch(0.34 0 0);
  --destructive-foreground: oklch(1 0 0);
  --border: oklch(0 0 0 / 10%);
  --input: oklch(0 0 0 / 12%);
  --ring: oklch(0.16 0 0);
  --success: oklch(0.35 0 0);
  --warning: oklch(0.55 0 0);
  --info: oklch(0.25 0 0);
  --chart-1: oklch(0.18 0 0);
  --chart-2: oklch(0.42 0 0);
  --chart-3: oklch(0.6 0 0);
  --chart-4: oklch(0.75 0 0);
  --chart-5: oklch(0.87 0 0);
  --sidebar: oklch(1 0 0);
  --sidebar-foreground: oklch(0.18 0 0);
  --sidebar-primary: oklch(0.16 0 0);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.94 0 0);
  --sidebar-accent-foreground: oklch(0.14 0 0);
  --sidebar-border: oklch(0 0 0 / 8%);
  --sidebar-ring: oklch(0.16 0 0);

  --glass: oklch(0 0 0 / 4%);
  --glass-strong: oklch(0 0 0 / 7%);
  --gradient-blue:  linear-gradient(135deg, oklch(0.32 0 0), oklch(0.1 0 0));
  --gradient-steel: linear-gradient(135deg, oklch(0.45 0 0), oklch(0.2 0 0));
  --gradient-mint:  linear-gradient(135deg, oklch(0.55 0 0), oklch(0.28 0 0));
  --gradient-sun:   linear-gradient(135deg, oklch(0.62 0 0), oklch(0.36 0 0));
  --gradient-plum:  linear-gradient(135deg, oklch(0.5 0 0), oklch(0.22 0 0));
  --shadow-ios:  0 1px 0 0 oklch(1 0 0 / 70%) inset, 0 18px 40px -24px oklch(0 0 0 / 28%);
  --shadow-float: 0 24px 60px -30px oklch(0 0 0 / 35%);
}
```

### `.dark` (modo escuro — preto profundo com branco)

```css
.dark {
  --background: oklch(0.11 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.175 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.175 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.14 0 0);
  --secondary: oklch(0.25 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.24 0 0);
  --muted-foreground: oklch(0.68 0 0);
  --accent: oklch(0.28 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.75 0 0);
  --destructive-foreground: oklch(0.14 0 0);
  --border: oklch(1 0 0 / 12%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.985 0 0);
  --success: oklch(0.85 0 0);
  --warning: oklch(0.7 0 0);
  --info: oklch(0.9 0 0);
  --chart-1: oklch(0.98 0 0);
  --chart-2: oklch(0.78 0 0);
  --chart-3: oklch(0.6 0 0);
  --chart-4: oklch(0.44 0 0);
  --chart-5: oklch(0.3 0 0);
  --sidebar: oklch(0.15 0 0);
  --sidebar-foreground: oklch(0.95 0 0);
  --sidebar-primary: oklch(0.985 0 0);
  --sidebar-primary-foreground: oklch(0.14 0 0);
  --sidebar-accent: oklch(0.25 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.985 0 0);

  --glass: oklch(1 0 0 / 6%);
  --glass-strong: oklch(1 0 0 / 10%);
  --gradient-blue:  linear-gradient(135deg, oklch(0.98 0 0), oklch(0.72 0 0));
  --gradient-steel: linear-gradient(135deg, oklch(0.88 0 0), oklch(0.6 0 0));
  --gradient-mint:  linear-gradient(135deg, oklch(0.92 0 0), oklch(0.7 0 0));
  --gradient-sun:   linear-gradient(135deg, oklch(0.8 0 0), oklch(0.5 0 0));
  --gradient-plum:  linear-gradient(135deg, oklch(0.85 0 0), oklch(0.55 0 0));
  --shadow-ios:  0 1px 0 0 oklch(1 0 0 / 6%) inset, 0 18px 40px -22px oklch(0 0 0 / 80%);
  --shadow-float: 0 24px 60px -28px oklch(0 0 0 / 90%);
}
```

> **Tailwind v3:** mapeie cada variável em `tailwind.config.ts`:
> ```ts
> colors: {
>   background: "hsl(var(--background))", // se usar HSL, converta oklch->hsl
>   // ... ou use var() direto se o setup suportar
> }
> ```
> Se o projeto usa Tailwind v4 com `@theme inline`, mapeie assim:
> ```css
> @theme inline {
>   --color-background: var(--background);
>   --color-card: var(--card);
>   --color-foreground: var(--foreground);
>   /* ... repita para cada token */
> }
> ```

---

## 2. Fundo do Body — Halos Radiais Fixos

O fundo **não é uma cor sólida**. São dois `radial-gradient` sutis fixos que criam profundidade. Os cartões flutuam sobre esse fundo.

```css
body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: var(--font-ios);
  -webkit-font-smoothing: antialiased;
  background-image:
    radial-gradient(900px 520px at 12% -8%, oklch(0 0 0 / 7%), transparent 62%),
    radial-gradient(760px 480px at 92% 0%, oklch(0 0 0 / 5%), transparent 62%);
  background-attachment: fixed;
}

.dark body {
  background-image:
    radial-gradient(900px 520px at 12% -8%, oklch(1 0 0 / 8%), transparent 62%),
    radial-gradient(760px 480px at 92% 0%, oklch(1 0 0 / 5%), transparent 62%);
}
```

**Claro:** halos escuros translúcidos sobre fundo quase-branco.
**Escuro:** halos brancos translúcidos sobre fundo quase-preto.
**Nunca** troque por cor sólida. É o que dá a sensação de profundidade.

---

## 3. Utilities — Cartão Flutuante e Tap

### `.ios-card` — todo conteúdo visível "flutua"

NÃO use `bg-card` puro. Use `ios-card` — é vidro com blur, transparência e sombra.

```css
@utility ios-card {
  background: color-mix(in oklab, var(--card) 78%, transparent);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid var(--border);
  border-radius: var(--radius-2xl);          /* ~26px */
  box-shadow: var(--shadow-ios);
}
```

(Se Tailwind v3, registre como utility em config ou classe CSS global `.ios-card { ... }`.)

### `.ios-tap` — feedback tátil

```css
@utility ios-tap {
  transition:
    transform 0.18s cubic-bezier(0.22, 1, 0.36, 1),
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}
.ios-tap:active {
  transform: scale(0.97);
}
```

---

## 4. Arquitetura Flutuante — Regra Estrutural

### Layout principal (desktop)

```
┌───────────────────────────────────────────────────────┐
│  BODY (fundo radial fixo — nunca solid)              │
│                                                       │
│  ┌──────────┐  ┌────────────────────────────────────┐ │
│  │          │  │  TOPBAR (ios-card flutuante)       │ │
│  │ SIDEBAR  │  ├────────────────────────────────────┤ │
│  │ (ios-card│  │                                    │ │
│  │ flutuan- │  │   GRID DE CARTÕES ios-card          │ │
│  │  te)     │  │   (cada um independente, 16px gap) │ │
│  │          │  │                                    │ │
│  └──────────┘  └────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

**Regras:**
- Sidebar, topbar e cada card são elementos `ios-card` **independentes e separados**, com margem ao redor (mín. 16px).
- **NUNCA** "dock" a sidebar colada na borda da tela.
- **NUNCA** use cartão full-bleed (largura total sem margem). Cada cartão respira.
- O conteúdo scrolla por baixo dos halos fixos — `background-attachment: fixed` garante que o fundo não se mexe.
- Gap entre cartões: `gap-3 sm:gap-4` (12–16px).

### Sidebar

- É um `ios-card` flutuante vertical, com `border-radius` completo nos quatro cantos.
- Ícones Lucide, 20px, `text-muted-foreground` inativo → `text-foreground` + `bg-accent` ativo.
- Grupos de menu separados por labels `text-xs uppercase muted-foreground` com `tracking-wide`.
- Logo/perfil no topo, item "Assistente" em destaque no rodapé (`bg-primary text-primary-foreground`).

### Topbar

- `ios-card` flutuante horizontal.
- Contém: título da página, breadcrumb (oculto em mobile), busca (oculta em mobile), botão de toggle de tema (Sun/Moon), avatar.
- Em mobile: vira header compacto só com título + avatar + toggle.

### Cards de conteúdo (KPI, painéis, tabelas, gráficos)

Cada um é `ios-card` com `p-4 sm:p-5`. Padding interno generoso. Títulos em `text-sm font-medium muted-foreground`.

### KPIs

```
Mobile (≤640px):  grid-cols-2   →  2 cards por linha
Desktop (≥1280):  grid-cols-4   →  4 cards por linha
Tablet:           grid-cols-2 ou 3
```

Cada KPI: ícone em container quadrado arredondado (`rounded-xl`, `bg-secondary`), número grande (`text-2xl font-semibold`), label pequena (`text-xs muted-foreground`), hint opcional.

---

## 5. Mobile — Regras Obrigatórias

1. **Bottom nav flutuante**: barra de navegação inferior fixa, `ios-card`, visível **só** em `max-width: 1023px`. 4–5 itens principais com ícone + label. Esconde em desktop.
2. **Sidebar esconde em mobile** (`hidden lg:flex`).
3. **KPI grid 2 colunas** no mobile (nunca 1 coluna — aproveita a largura).
4. **Topbar compacta**: esconde busca e breadcrumb; mantém título + avatar + toggle de tema.
5. **Touch targets ≥ 36px** de altura mínima em botões e itens de lista.
6. **Padding**: `px-4` mobile, `px-6 lg:px-8` desktop. Nunca menor que 16px de respiro lateral.
7. **Textos**: títulos de página `text-xl` mobile → `text-2xl lg:text-3xl` desktop.
8. **Sem scroll horizontal**: use `overflow-x-hidden` no container raiz e `min-w-0` em colunas flex/grid para truncar.

---

## 6. Toggle de Tema (claro/escuro)

- Botão Sun ↔ Moon no topbar.
- Aplica/remove classe `.dark` em `document.documentElement`.
- Persiste em `localStorage` (chave tipo `app-theme`).
- Padrão: **light** (claro).
- Lógica:
```ts
function apply(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}
```

---

## 7. Tipografia e Espaçamento

- Fonte: `var(--font-ios)` em todo o projeto. **Sem** Inter, Poppins, Roboto, etc.
- Pesos: `font-medium` (500) para labels, `font-semibold` (600) para números/títulos, `font-normal` (400) para corpo.
- Tamanhos: corpo `text-sm` (14px), captions `text-xs` (12px), números de KPI `text-2xl`/`text-3xl`.
- `tracking-tight` em títulos grandes; `tracking-wide uppercase` em labels de seção.
- `leading-tight` em números, `leading-relaxed` em texto corrido.

---

## 8. Cores em Gráficos (Recharts etc.)

As séries de gráfico usam `--chart-1` até `--chart-5` — **todos em escala de cinza** (do mais escuro ao mais claro, ou inverso no dark). **NUNCA** use cores de paleta padrão do Recharts. Mapeie explicitamente:

```ts
<Area fill="var(--chart-1)" />
<Bar fill="var(--chart-2)" />
// grid/stroke: var(--border) ou var(--muted-foreground) com alpha
```

Grid lines: `stroke="var(--border)"`, axis text: `fill="var(--muted-foreground)"`.

---

## 9. Estados e Chips

- **Chip/Pill ativo**: `bg-primary text-primary-foreground`.
- **Chip inativo**: `bg-secondary text-secondary-foreground` (claro) / `bg-secondary text-foreground` (escuro).
- **Hover de linha/lista**: `hover:bg-accent`.
- **Borda de separação**: `border-border` (10% alpha) — sutil, nunca sólida e grossa.
- **Destruir/erro**: `text-destructive` (cinza escuro no claro, cinza claro no escuro — **não vermelho**).

---

## 10. Checklist de Verificação ( rode após aplicar )

```bash
# 1. Nenhuma cor com chroma > 0 deve existir no CSS/TSX:
rg -n "oklch\([^)]*[1-9]\.[0-9]" src/ | rg -v "0 0" || true
#   → se retornar algo, há cor saturada. Corrija.

# 2. Nenhuma classe Tailwind colorida hardcoded:
rg -n "bg-(blue|red|green|purple|indigo|emerald|amber|rose|cyan|teal)-" src/
#   → deve retornar vazio.

# 3. Fundo do body tem radial-gradient:
rg -n "radial-gradient" src/styles.css src/app/globals.css
#   → deve mostrar 2 radial-gradients.

# 4. ios-card existe:
rg -n "ios-card" src/styles.css src/app/globals.css
#   → deve mostrar a utility definida.

# 5. backdrop-filter com blur(28px):
rg -n "blur\(28px\)" src/styles.css src/app/globals.css
#   → deve existir.
```

### Teste visual (manual)

- [ ] Sidebar, topbar e cards parecem flutuar (margem ao redor, não colados na borda).
- [ ] Fundo tem profundidade (halos), não é sólido.
- [ ] Tudo é preto/branco/cinza — zero cor.
- [ ] Toggle de tema funciona e persiste.
- [ ] Mobile: bottom nav aparece, sidebar some, KPI em 2 colunas, sem scroll horizontal.
- [ ] Gráficos em escala de cinza.

---

## 11. O que NÃO fazer

- ❌ Não altere rotas, handlers, schemas, fetch, autenticação, banco de dados.
- ❌ Não adicione cores (azul, roxo, verde, etc.) — nem em gradientes de ícone, nem em charts.
- ❌ Não use `bg-white`/`bg-black`/`text-white`/`text-black` literais — use tokens.
- ❌ Não "docking" a sidebar/topbar na borda — tudo flutua com margem.
- ❌ Não use sombras genéricas do Tailwind (`shadow-lg` sem var) — use `var(--shadow-ios)`.
- ❌ Não troque a fonte — só SF Pro / system-ui.
- ❌ Não remova os `radial-gradient` do body.
- ❌ Não use `backdrop-filter` menor que `blur(20px)` — o vidro precisa ser pronunciado.

---

**Resumo em uma frase:** Fundo com halos radiais fixos; sidebar, topbar e cada card são `ios-card` de vidro (`blur(28px) saturate(180%)`) flutuando com margem; tudo em `oklch` com chroma 0; toggle claro/escuro; mobile com bottom nav e KPI em 2 colunas.

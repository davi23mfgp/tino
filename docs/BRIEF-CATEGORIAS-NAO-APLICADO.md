# Prompt — Remodelagem da tela de Categorias

Aplique **somente a camada visual e estrutural** da tela de Categorias abaixo. **Não altere regras de negócio, endpoints, autenticação ou fluxos existentes.** A tela deve parecer um app iOS nativo em preto e branco, com cartões flutuantes sobre um fundo com halos radiais sutis.

---

## 1. Tokens de cor obrigatórios (copie exatamente)

Use `oklch` com **cromacia 0** para manter tudo em escala de cinza. Nenhuma cor saturada (azul, roxo, verde, laranja) deve aparecer na interface.

```css
:root {
  --background: oklch(0.975 0 0);
  --foreground: oklch(0.18 0 0);
  --card: oklch(0.99 0 0);
  --card-foreground: oklch(0.18 0 0);
  --popover: oklch(0.99 0 0);
  --popover-foreground: oklch(0.18 0 0);
  --primary: oklch(0.18 0 0);
  --primary-foreground: oklch(0.99 0 0);
  --secondary: oklch(0.92 0 0);
  --secondary-foreground: oklch(0.25 0 0);
  --muted: oklch(0.94 0 0);
  --muted-foreground: oklch(0.45 0 0);
  --accent: oklch(0.9 0 0);
  --accent-foreground: oklch(0.18 0 0);
  --destructive: oklch(0.55 0 0);
  --destructive-foreground: oklch(0.99 0 0);
  --border: oklch(0.88 0 0);
  --input: oklch(0.92 0 0);
  --ring: oklch(0.55 0 0);

  --glass: oklch(0.94 0 0 / 0.55);
  --shadow-float: 0 20px 50px -18px oklch(0 0 0 / 0.18);
  --shadow-ios: 0 4px 24px -8px oklch(0 0 0 / 0.12);
  --gradient-steel: linear-gradient(135deg, oklch(0.35 0 0), oklch(0.18 0 0));
  --gradient-blue: linear-gradient(135deg, oklch(0.45 0 0), oklch(0.22 0 0));
}

.dark {
  --background: oklch(0.12 0 0);
  --foreground: oklch(0.98 0 0);
  --card: oklch(0.18 0 0 / 0.72);
  --card-foreground: oklch(0.98 0 0);
  --popover: oklch(0.18 0 0 / 0.8);
  --popover-foreground: oklch(0.98 0 0);
  --primary: oklch(0.98 0 0);
  --primary-foreground: oklch(0.12 0 0);
  --secondary: oklch(0.22 0 0);
  --secondary-foreground: oklch(0.9 0 0);
  --muted: oklch(0.2 0 0);
  --muted-foreground: oklch(0.55 0 0);
  --accent: oklch(0.25 0 0);
  --accent-foreground: oklch(0.98 0 0);
  --destructive: oklch(0.62 0 0);
  --destructive-foreground: oklch(0.99 0 0);
  --border: oklch(1 0 0 / 0.08);
  --input: oklch(1 0 0 / 0.1);
  --ring: oklch(0.65 0 0);

  --glass: oklch(0.22 0 0 / 0.45);
  --shadow-float: 0 20px 50px -18px oklch(0 0 0 / 0.55);
  --shadow-ios: 0 4px 24px -8px oklch(0 0 0 / 0.35);
  --gradient-steel: linear-gradient(135deg, oklch(0.55 0 0), oklch(0.3 0 0));
  --gradient-blue: linear-gradient(135deg, oklch(0.65 0 0), oklch(0.35 0 0));
}
```

---

## 2. Utilities de superfície flutuante (copie exatamente)

```css
body {
  background:
    radial-gradient(circle at 20% 10%, oklch(0.55 0 0 / 0.08), transparent 35%),
    radial-gradient(circle at 85% 80%, oklch(0.4 0 0 / 0.06), transparent 35%),
    var(--background);
  background-attachment: fixed;
}

.ios-card {
  border-radius: 28px;
  background: oklch(0.99 0 0 / 0.82);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid oklch(1 0 0 / 0.55);
  box-shadow: var(--shadow-float);
}

.dark .ios-card {
  background: oklch(0.18 0 0 / 0.72);
  border: 1px solid oklch(1 0 0 / 0.08);
}

.ios-tap {
  transition: transform 0.12s ease, background-color 0.15s ease;
  cursor: pointer;
}
.ios-tap:active {
  transform: scale(0.97);
}

.bg-glass {
  background: var(--glass);
}
```

---

## 3. Estrutura da tela de Categorias

A tela é um **layout mestre-detalhe** (lista à esquerda, conteúdo à direita no desktop; chips roláveis no mobile + detalhe abaixo).

### 3.1 Container raiz

```tsx
<AppShell title="Categorias">
  <PageHead
    icon={Tags}
    title="Categorias"
    subtitle="{n} categorias · {m} produtos"
    action="Nova categoria"
  />

  <div className="grid items-start gap-3 sm:gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
    {/* Seletor mobile (chips roláveis) */}
    <div className="ios-card flex gap-2 overflow-x-auto p-2.5 lg:hidden">...</div>

    {/* Lista desktop */}
    <section className="ios-card hidden p-3 lg:block">...</section>

    {/* Painel de detalhe */}
    <section className="ios-card min-w-0 p-4 sm:p-5">...</section>
  </div>
</AppShell>
```

### 3.2 Seletor mobile (chips roláveis)

- Container: `.ios-card flex gap-2 overflow-x-auto p-2.5 lg:hidden`
- Cada chip: botão arredondado (`rounded-full`), com ícone, nome truncado e contador de produtos.
- Chip ativo: `bg-primary text-background`.
- Chip inativo: `bg-glass text-muted-foreground`.
- O contador deve ser um badge pequeno dentro do chip.

### 3.3 Lista desktop

- Container: `.ios-card hidden p-3 lg:block`
- Topo: input arredondado `rounded-full border border-border bg-glass` com placeholder "Nova categoria..." + botão redondo `size-9` com ícone `Plus` e fundo `var(--gradient-blue)`.
- Itens: botões `w-full rounded-2xl p-2.5 text-left`.
- Item ativo: `bg-primary text-background` + ícone em círculo `bg-background/15`.
- Item inativo: `hover:bg-secondary/60` + ícone em círculo `border-border bg-glass`.
- Contador de produtos: badge arredondado `rounded-full px-2 py-0.5 text-[11px] font-bold`.

### 3.4 Painel de detalhe

#### Cabeçalho

```tsx
<header className="flex flex-wrap items-center gap-3 sm:gap-4">
  <div
    className="grid size-14 shrink-0 place-items-center rounded-3xl text-background shadow-[var(--shadow-float)] sm:size-16"
    style={{ backgroundImage: "var(--gradient-steel)" }}
  >
    <active.icon className="size-6 sm:size-7" strokeWidth={2} />
  </div>
  <div className="min-w-0 flex-1">
    <h2 className="truncate text-[19px] font-semibold tracking-tight sm:text-[24px]">
      {active.name}
    </h2>
    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
      {active.products.length} produto(s) · {active.services.length} serviço(s)
    </p>
  </div>
  <button
    className="ios-tap flex shrink-0 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold text-background max-sm:w-full"
    style={{ backgroundImage: "var(--gradient-blue)" }}
  >
    <Plus className="size-4" strokeWidth={2.4} />
    Adicionar produtos
  </button>
</header>
```

**Regra mobile:** o botão "Adicionar produtos" deve ocupar a largura total em `max-sm` (`max-sm:w-full`) para não quebrar o layout.

#### Bloco de identidade / upload

```tsx
<div className="mt-5 rounded-2xl border border-border bg-glass p-3.5">
  <div className="flex flex-wrap items-center gap-3">
    <div className="flex items-center rounded-full bg-secondary p-1">
      <button className="ios-tap rounded-full bg-card px-3.5 py-1.5 text-[12px] font-semibold shadow-[var(--shadow-ios)]">
        URL
      </button>
      <button className="ios-tap rounded-full px-3.5 py-1.5 text-[12px] font-medium text-muted-foreground">
        Anexar arquivo
      </button>
    </div>
    <button className="ios-tap flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-[12px] font-medium text-muted-foreground hover:bg-secondary/60">
      <Upload className="size-3.5" />
      Escolher arquivo
    </button>
  </div>
  <p className="mt-2.5 text-[11px] text-muted-foreground">
    Envie um arquivo do computador — forma mais garantida. PNG ou SVG, fundo transparente.
  </p>
</div>
```

#### Abas (Produtos / Serviços)

```tsx
<div className="mt-5 flex items-center gap-1 rounded-full bg-glass p-1 sm:inline-flex">
  <button className={`ios-tap flex-1 rounded-full px-4 py-2 text-[13px] font-semibold sm:flex-none ${tab === "produtos" ? "bg-primary text-background" : "text-muted-foreground"}`}>
    Produtos
  </button>
  <button className={`...`}>Serviços Pré-definidos</button>
</div>
```

#### Grid de produtos

```tsx
<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
  {active.products.map((p) => (
    <div key={p.sku} className="ios-tap overflow-hidden rounded-2xl border border-border bg-glass">
      <div
        className="grid aspect-[4/3] place-items-center text-background"
        style={{ backgroundImage: "var(--gradient-steel)" }}
      >
        <p.icon className="size-9 opacity-90" strokeWidth={1.6} />
      </div>
      <div className="p-3">
        <p className="truncate text-[13px] font-semibold">{p.name}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{p.sku}</p>
      </div>
    </div>
  ))}
</div>
```

#### Estado vazio de produtos

```tsx
<div className="mt-4 grid place-items-center rounded-2xl border border-dashed border-border bg-glass px-4 py-12 text-center">
  <Package className="size-8 text-muted-foreground" strokeWidth={1.6} />
  <p className="mt-3 text-[13px] font-semibold">Nenhum produto nesta categoria</p>
  <p className="mt-1 text-[12px] text-muted-foreground">
    Use “Adicionar produtos” para começar a montar o catálogo.
  </p>
</div>
```

#### Lista de serviços

Use o componente `RowList` com as linhas:

```tsx
<RowList
  rows={active.services.map((s) => ({
    title: s.name,
    meta: s.meta,
    value: s.price,
  }))}
/>
```

O `RowList` deve renderizar itens com:
- container: `space-y-2.5`
- item: `ios-tap rounded-2xl border border-border bg-glass p-3.5 hover:bg-secondary/50`
- título: `truncate text-[14px] font-semibold`
- meta: `mt-0.5 truncate text-[12px] text-muted-foreground`
- valor: `text-[13px] font-semibold`

#### Estado vazio de serviços

Mesmo padrão do estado vazio de produtos, mas com texto "Nenhum serviço pré-definido".

---

## 4. Regras de tipografia e espaçamento

- Títulos de página: `text-[19px] font-semibold tracking-tight sm:text-[22px]`
- Subtítulos: `text-[12px] text-muted-foreground`
- Botões primários: `rounded-full px-3.5 py-2 text-[13px] font-semibold text-background` com fundo `var(--gradient-blue)`
- Inputs: `rounded-full bg-glass text-[13px]` sem borda visível, placeholder `text-muted-foreground`
- Cards internos: `rounded-2xl border border-border bg-glass`
- Ícones grandes: `size-14 sm:size-16 rounded-3xl`
- Ícones pequenos: `size-4` com `strokeWidth={2.1}`

---

## 5. Regras mobile obrigatórias

1. O seletor de categorias no mobile deve ser **chips roláveis horizontais**, nunca uma sidebar comprimida.
2. O botão "Adicionar produtos" no cabeçalho do detalhe deve ocupar `100%` da largura em telas pequenas (`max-sm:w-full`).
3. O grid de produtos deve ser **2 colunas** no mobile, **3 colunas** no tablet, **4 colunas** no desktop.
4. Nenhum elemento deve causar overflow horizontal em `390px` de largura.
5. Textos longos devem ser truncados com `truncate` e `min-w-0` nos containers pai.

---

## 6. Dados mock para teste visual

Use estas 9 categorias para validar o layout:

1. Automação Control4 — ícone `Cpu`
2. Automação Controllux — ícone `Lightbulb`
3. Automação Savant — ícone `Monitor`
4. Drives — ícone `Package`
5. Fechaduras — ícone `Lock`
6. CFTV Hikvision — ícone `Camera`
7. Home Cinema — ícone `Tv`
8. Redes e Wi-Fi — ícone `Network`
9. Energia Solar — ícone `Sun`

Cada categoria deve ter:
- `id`: string
- `name`: string
- `icon`: componente Lucide
- `products`: array de `{ name, sku, icon }`
- `services`: array de `{ name, meta, price }`

---

## 7. Checklist de verificação

Antes de entregar, confirme:

- [ ] Nenhuma cor saturada (azul, roxo, verde, laranja) aparece na interface.
- [ ] O fundo tem halos radiais sutis em escala de cinza.
- [ ] Os cartões usam `backdrop-filter: blur(28px) saturate(180%)`.
- [ ] A lista e o detalhe são cartões flutuantes separados, nunca colados.
- [ ] O mobile tem chips roláveis para troca de categoria.
- [ ] O botão "Adicionar produtos" ocupa largura total no mobile.
- [ ] Grid de produtos responde: 2 / 3 / 4 colunas.
- [ ] Estados vazios usam borda dashed e ícone cinza.
- [ ] Não há overflow horizontal em 390px.
- [ ] O tema escuro alterna corretamente quando `.dark` é aplicado no `html`.

---

## NÃO APLICADO — leia antes de usar

Guardado em 05/09/2026 sem ser aplicado, por decisão do Davi.

**Este prompt não é do Tino.** Os dados de teste dele são "Automação
Control4", "Automação Savant", "CFTV Hikvision", "Home Cinema", "Redes e
Wi-Fi" e "Energia Solar", com produtos, SKU e serviços pré-definidos. Isso é
catálogo de integrador de automação residencial — outro projeto.

No Tino, `Categoria` classifica transação (mercado, farmácia, transporte).
Não existe produto nem SKU dentro de categoria, então metade do prompt não
tem onde encaixar.

Dois destinos possíveis, se o Davi quiser aproveitar:

- **Prateleira do MEI** (`/loja/estoque`), que tem produto de verdade. A
  estrutura mestre-detalhe, os chips roláveis no mobile e o grid de 2/3/4
  colunas servem; o mock de automação se descarta.
- **Categorias de gasto**, usando só o mestre-detalhe e jogando fora o grid
  de produtos.

A camada visual dele (tokens em chroma 0, `ios-card`, halos radiais) já foi
aplicada no app inteiro a partir de `docs/BRIEF-VIDRO-FLUTUANTE.md`, que diz
a mesma coisa. Não é preciso reaplicar daqui.

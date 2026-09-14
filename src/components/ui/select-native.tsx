"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/**
 * Campo de escolha do Tino.
 *
 * O nome vem de quando isto era um `<select>` do navegador. Não é mais: o
 * menu do sistema operacional se desenha com o tema do SO, e no escuro ele
 * abria uma lista branca no meio do app — não há CSS que alcance aquela
 * lista. Agora renderiza o `Select` do projeto, que usa a superfície de vidro
 * do app e marca a opção escolhida.
 *
 * A API continua a de um `<select>`: recebe `<option>` como filhos, aceita
 * `value`/`defaultValue`, `onChange` com `evento.target.value` e `name` para
 * quem lê o formulário com `FormData`. Isso mantém as doze telas que já usam
 * este componente sem nenhuma mudança.
 *
 * Um `<option value="">` vira o texto de espera do campo — o Radix não aceita
 * item de valor vazio, e uma opção vazia selecionável é, na prática, o
 * placeholder.
 */

interface OpcaoLida {
  valor: string
  rotulo: React.ReactNode
  desabilitada?: boolean
}

function lerOpcoes(children: React.ReactNode): { opcoes: OpcaoLida[]; espera?: React.ReactNode } {
  const opcoes: OpcaoLida[] = []
  let espera: React.ReactNode

  React.Children.forEach(children, (filho) => {
    if (!React.isValidElement(filho)) return
    // Aceita fragmentos e listas, que é como as telas montam as opções.
    if (filho.type === React.Fragment) {
      const dentro = lerOpcoes((filho.props as { children?: React.ReactNode }).children)
      opcoes.push(...dentro.opcoes)
      espera = espera ?? dentro.espera
      return
    }
    if (filho.type !== "option") return
    const props = filho.props as React.OptionHTMLAttributes<HTMLOptionElement> & { children?: React.ReactNode }
    const valor = props.value === undefined ? String(props.children ?? "") : String(props.value)
    if (valor === "") { espera = props.children; return }
    opcoes.push({ valor, rotulo: props.children, desabilitada: props.disabled })
  })

  return { opcoes, espera }
}

export const SelectNative = React.forwardRef<
  HTMLButtonElement,
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
    tamanho?: "padrao" | "pilula"
    onChange?: (evento: { target: { value: string; name?: string } }) => void
  }
>(({ className, children, tamanho = "padrao", value, defaultValue, onChange, name, required, disabled, ...props }, ref) => {
  const { opcoes, espera } = lerOpcoes(children)
  const controlado = value !== undefined
  const [interno, setInterno] = React.useState(defaultValue === undefined ? "" : String(defaultValue))
  const atual = controlado ? String(value ?? "") : interno

  function escolher(novo: string) {
    if (!controlado) setInterno(novo)
    onChange?.({ target: { value: novo, name } })
  }

  return (
    <Select value={atual || undefined} onValueChange={escolher} name={name} required={required} disabled={disabled}>
      <SelectTrigger
        ref={ref}
        aria-label={props["aria-label"]}
        id={props.id}
        className={cn(
          // Mesma altura e raio do Input do Tino: o campo continua o mesmo,
          // só a lista que abre é que mudou.
          "h-11 w-full border-pauta bg-papel-2 text-base sm:h-9 sm:text-sm",
          tamanho === "pilula" ? "rounded-[var(--raio-pilula)] px-4" : "rounded-[var(--raio-campo)] px-3.5 sm:px-3",
          className,
        )}
      >
        <SelectValue placeholder={espera ?? "Escolha"} />
      </SelectTrigger>
      <SelectContent>
        {opcoes.map((opcao) => (
          <SelectItem key={opcao.valor} value={opcao.valor} disabled={opcao.desabilitada}>
            {opcao.rotulo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
})
SelectNative.displayName = "SelectNative"

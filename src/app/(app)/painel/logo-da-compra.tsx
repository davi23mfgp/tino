"use client"

import { MarcaPersonalizada } from "@/components/identidades-visuais"

import estilos from "./inicio.module.css"

/**
 * O logo da loja, quando o Tino sabe qual é; senão, o ícone da categoria.
 *
 * Davi, 29/09/2026: "compras recentes, dá para colocar o logo da compra; tem
 * Amazon, tem que colocar o logo da Amazon". O Extrato já fazia isso com
 * `MarcaPersonalizada`; o Início mostrava só o ícone. O ícone vem pronto do
 * servidor e some pelo CSS quando o logo aparece (`:has`), para não piscar.
 */
export function LogoDaCompra({ nome, children }: { nome: string; children: React.ReactNode }) {
  return (
    <span className={estilos.logo}>
      <MarcaPersonalizada nome={nome} />
      {children}
    </span>
  )
}

"use client"

import { motion, useReducedMotion } from "motion/react"
import type { ReactNode } from "react"

/**
 * Entradas da vitrine, com a biblioteca Motion (`motion/react`).
 *
 * Por que existe, já havendo `Revelar`: o `Revelar` acende um `data-reveal` e
 * deixa o CSS animar. Serve para bloco inteiro, mas não sabe encadear filhos
 * nem parar no meio. Isto aqui faz as duas coisas, que é o que a primeira
 * dobra e as listas pedem.
 *
 * Cada movimento tem motivo, nenhum é enfeite:
 * - `Abertura` escalona a primeira dobra (marca, título, apoio, botão) para o
 *   olho chegar na ordem em que a frase é lida;
 * - `EmSequencia` revela lista ou grade na ordem de leitura, uma vez só, e
 *   não repete quando a pessoa rola de volta.
 *
 * Quem pede menos movimento no sistema não recebe animação nenhuma: o
 * conteúdo já nasce no lugar, sem transição (`useReducedMotion`).
 */

const SUAVE = [0.16, 1, 0.3, 1] as const

export function Abertura({ children, atraso = 0 }: { children: ReactNode; atraso?: number }) {
  const semMovimento = useReducedMotion()
  return (
    <motion.div
      initial={semMovimento ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: atraso, ease: SUAVE }}
    >
      {children}
    </motion.div>
  )
}

export function EmSequencia({
  children,
  className,
  passo = 0.07,
}: {
  children: ReactNode[]
  className?: string
  passo?: number
}) {
  const semMovimento = useReducedMotion()
  return (
    <div className={className}>
      {children.map((filho, indice) => (
        <motion.div
          key={indice}
          initial={semMovimento ? false : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.55, delay: indice * passo, ease: SUAVE }}
        >
          {filho}
        </motion.div>
      ))}
    </div>
  )
}

/** Botão que responde ao toque e ao ponteiro. Feedback, não enfeite. */
export function BotaoVivo({ children, className }: { children: ReactNode; className?: string }) {
  const semMovimento = useReducedMotion()
  return (
    <motion.span
      className={className}
      style={{ display: "inline-flex" }}
      whileHover={semMovimento ? undefined : { y: -2 }}
      whileTap={semMovimento ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      {children}
    </motion.span>
  )
}

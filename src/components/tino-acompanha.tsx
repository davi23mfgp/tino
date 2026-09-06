"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"

import { buscar } from "@/lib/cliente"

/**
 * O Tino acompanhando as contas.
 *
 * Não é enfeite de boas-vindas: mostra o que o motor de alertas achou de mais
 * grave agora, com o caminho para resolver.
 *
 * Sem alerta nenhum ele diz isso em uma linha. Não inventa elogio nem dica:
 * silêncio do motor quer dizer que não há nada a apontar.
 *
 * O MASCOTE AQUI É UMA IMAGEM FIXA, e isso é uma mudança de comportamento que
 * vale saber. Antes o desenho mudava de expressão conforme a gravidade, e o
 * documento de identidade tratava isso como regra: "a expressão vem do motor
 * de alertas, nunca de decoração". O protótipo que o Davi mandou copiar usa
 * uma renderização única em todas as telas, então a expressão saiu.
 *
 * O que segura a regra no lugar dela: a GRAVIDADE CONTINUA ESCRITA. O rótulo
 * acima do título muda com a severidade, e é ele — não a cara do bonequinho —
 * que diz se a pessoa precisa parar agora. Sem isso, um robô sorridente ao
 * lado de "precisa de decisão agora" estaria mentindo sobre o mês.
 */

interface Alerta {
  tipo: string
  severidade: "CRITICO" | "ATENCAO" | "INFO"
  titulo: string
  texto: string
  acaoRota?: string | null
}

/**
 * "Recado do Tino", sempre, em azul — igual ao protótipo.
 *
 * Cheguei a fazer o rótulo mudar com a gravidade ("Precisa de decisão" em
 * vermelho) para repor o que a expressão do mascote dizia antes. O Davi pediu
 * idêntico ao protótipo, e idêntico é idêntico.
 *
 * A regra de não esconder gravidade continua de pé por outro caminho: o TÍTULO
 * do cartão é o texto do alerta, e ele diz o problema com todas as letras —
 * "sua reserva cobre pouco tempo" não deixa dúvida. O que se perdeu foi o
 * atalho de cor, não a informação.
 */
const ROTULO = { texto: "Recado do Tino", cor: "text-acao" }

export function TinoAcompanha() {
  const [alertas, setAlertas] = useState<Alerta[] | null>(null)

  const carregar = useCallback(async () => {
    try {
      setAlertas(await buscar<Alerta[]>("/api/tino/alertas"))
    } catch {
      // Falha de rede não vira "está tudo bem": fica sem opinião.
      setAlertas(null)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // O mais grave manda. Entre dois da mesma gravidade, o primeiro que o motor
  // devolveu — ele já ordena por urgência.
  const principal =
    alertas?.find((alerta) => alerta.severidade === "CRITICO") ??
    alertas?.find((alerta) => alerta.severidade === "ATENCAO") ??
    alertas?.[0] ??
    null

  const restantes = (alertas?.length ?? 0) - (principal ? 1 : 0)
  const rotulo = ROTULO

  return (
    <section className="ficha flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
      {/* `next/image` e não `<img>`: o arquivo de origem tem 816px e 604 KB, e
          aqui ele aparece a 96px. Servir o original mandaria meio mega para o
          celular de quem só queria ver o saldo. */}
      <Image
        src="/tino-mascote.png"
        alt=""
        width={96}
        height={96}
        priority
        className="h-24 w-24 shrink-0 object-contain"
      />

      <div className="min-w-0 flex-1">
        {principal ? (
          <>
            <p className={`text-[13px] font-medium ${rotulo.cor}`}>{rotulo.texto}</p>
            <p className="mt-1 text-[17px] font-semibold leading-snug tracking-[-0.01em]">
              {principal.titulo}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[color:var(--texto-2)]">
              {principal.texto}
              {restantes > 0 && (
                <span className="text-[color:var(--texto-3)]">
                  {" "}
                  E mais {restantes} {restantes === 1 ? "aviso" : "avisos"}.
                </span>
              )}
            </p>
          </>
        ) : (
          <>
            <p className="text-[13px] font-medium text-acao">Recado do Tino</p>
            <p className="mt-1 text-[17px] font-semibold leading-snug tracking-[-0.01em]">
              {alertas === null ? "Ainda não li seus números." : "Nada exigindo decisão hoje."}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[color:var(--texto-2)]">
              {alertas === null
                ? "A conexão falhou. Recarregue a página para eu tentar de novo."
                : "Volto a avisar quando algum limite se aproximar."}
            </p>
          </>
        )}
      </div>

      {principal?.acaoRota && (
        <Link
          href={principal.acaoRota}
          className="ios-tap shrink-0 rounded-[var(--raio-pilula)] bg-primary px-5 py-2.5 text-center text-[13px] font-semibold text-primary-foreground"
        >
          Resolver agora
        </Link>
      )}
    </section>
  )
}

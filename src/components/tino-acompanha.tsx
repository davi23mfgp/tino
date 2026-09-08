"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"

import { buscar } from "@/lib/cliente"
import { cn } from "@/lib/utils"
import { estadoPorAlertas, TinoMascote } from "@/components/tino-mascote"

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
 * O que segura a regra no lugar dela: a GRAVIDADE CONTINUA VISÍVEL, em dois
 * lugares. O título é o texto do próprio alerta e diz o problema com todas as
 * letras; e a bolinha ativa do carrossel carrega a cor da severidade. Sem
 * nenhum dos dois, um robô sorridente ao lado de "precisa de decisão agora"
 * estaria mentindo sobre o mês.
 *
 * Os avisos giram em carrossel, um por vez. A alternativa que existia antes
 * era mostrar o mais grave e resumir o resto como "e mais 3 avisos" — o que na
 * prática escondia três coisas que a pessoa precisava ler.
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

/**
 * A cor da bolinha ativa no carrossel.
 *
 * Ela carrega a gravidade do aviso que está na vez, e é o que impede o
 * carrossel de esconder um problema: sem isso, um alerta crítico atrás de dois
 * informativos ficaria invisível até o giro chegar nele.
 */
const SEVERIDADE: Record<Alerta["severidade"], string> = {
  CRITICO: "bg-negativo",
  ATENCAO: "bg-atencao",
  INFO: "bg-acao",
}

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

  // A fila do carrossel: o mais grave primeiro, e dentro da mesma gravidade a
  // ordem que o motor devolveu — ele já ordena por urgência. Isso importa
  // porque o primeiro é o que a pessoa vê antes de qualquer giro, e num
  // carrossel só o primeiro tem visita garantida.
  const fila = useMemo(() => {
    if (!alertas?.length) return []
    const peso = { CRITICO: 0, ATENCAO: 1, INFO: 2 }
    return [...alertas].sort((a, b) => peso[a.severidade] - peso[b.severidade])
  }, [alertas])

  const [indice, setIndice] = useState(0)
  const [pausado, setPausado] = useState(false)

  // Volta ao começo quando a fila muda de tamanho, senão o índice fica
  // apontando para um aviso que não existe mais.
  useEffect(() => {
    setIndice(0)
  }, [fila.length])

  /**
   * O giro automático, com duas travas.
   *
   * Pausa no ponteiro e no foco: puxar da tela um aviso que fala de dinheiro
   * enquanto a pessoa está lendo o número é pior do que não girar.
   *
   * E não gira de jeito nenhum para quem pediu menos movimento no sistema. O
   * conteúdo continua todo alcançável pelas bolinhas, que são botões de
   * verdade — o giro é conveniência, nunca o único caminho até um aviso.
   */
  useEffect(() => {
    if (fila.length < 2 || pausado) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const relogio = setInterval(() => setIndice((atual) => (atual + 1) % fila.length), 7000)
    return () => clearInterval(relogio)
  }, [fila.length, pausado])

  const principal = fila[indice] ?? null
  const rotulo = ROTULO

  return (
    <section
      className="ficha flex flex-col gap-5 p-6 sm:flex-row sm:items-center"
      // A pausa vale para ponteiro e para foco de teclado: quem está lendo ou
      // navegando não pode ter o aviso trocado no meio da frase.
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
    >
      {/* Desenho vetorial, nao mais o PNG de 604 KB: alem de nao mandar meio
          mega para o celular, o SVG mostra a EXPRESSAO do estado das contas,
          que o arquivo estatico nunca conseguiu. */}
      <TinoMascote estado={estadoPorAlertas(alertas ?? [])} className="h-24 w-24 shrink-0" />

      <div className="min-w-0 flex-1">
        {principal ? (
          <>
            <p className={`text-[13px] font-medium ${rotulo.cor}`}>{rotulo.texto}</p>
            {/* `aria-live` educado: o leitor de tela anuncia a troca quando a
                pessoa terminar o que está lendo, em vez de interromper. */}
            <div aria-live="polite">
              <p className="mt-1 text-[17px] font-semibold leading-snug tracking-[-0.01em]">
                {principal.titulo}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[color:var(--texto-2)]">
                {principal.texto}
              </p>
            </div>

            {/* As bolinhas não são só enfeite de posição: a que está ativa
                carrega a COR DA GRAVIDADE daquele aviso. Assim, mesmo antes de
                girar, dá para ver que existe um vermelho na fila. Um carrossel
                que esconde o crítico atrás de dois informativos seria pior que
                a lista que havia antes. */}
            {fila.length > 1 && (
              <div className="mt-3.5 flex items-center gap-2">
                {fila.map((aviso, posicao) => (
                  <button
                    key={`${aviso.tipo}-${posicao}`}
                    onClick={() => setIndice(posicao)}
                    aria-label={`Aviso ${posicao + 1} de ${fila.length}: ${aviso.titulo}`}
                    aria-current={posicao === indice}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300 ease-[var(--curva)]",
                      posicao === indice ? `w-6 ${SEVERIDADE[aviso.severidade]}` : "w-1.5 bg-foreground/20 hover:bg-foreground/40",
                    )}
                  />
                ))}
                <span className="ml-1 text-[12px] text-[color:var(--texto-3)]">
                  {indice + 1} de {fila.length}
                </span>
              </div>
            )}
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
          className="ios-tap shrink-0 rounded-[var(--raio-pilula)] bg-primary px-5 py-2.5 text-center text-[14px] font-medium text-primary-foreground"
        >
          Resolver agora
        </Link>
      )}
    </section>
  )
}

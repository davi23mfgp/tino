"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"

import { IdentidadeBanco } from "@/components/banco-perfil"
import { formatarMoeda } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"
import estilos from "./carteira-cartoes.module.css"

export interface CartaoDaCarteira {
  id: string
  nome: string
  instituicao: string | null
  cor: string
  final: string | null
  bandeira: string
  faturaAtualCentavos: number
  vencimento: string
  proximaRotulo: string
  proximaCentavos: number
  previstoProximoCentavos: number
}

/** Quanto de cada cartão de trás aparece: o bastante para o logo e o banco. */
const FRESTA = 64

/**
 * Os cartões como numa carteira (Davi, 23/09): um atrás do outro, cada um
 * mostrando só a faixa de cima. Tocar num cartão o tira de trás e o põe na
 * frente, inteiro; os outros ficam na fresta, na ordem de sempre. Tocar no
 * cartão da frente leva à tela de cartões.
 *
 * A altura da pilha não muda ao trocar de cartão. Empurrar os da frente para
 * baixo (a primeira versão) deixava todos inteiros na tela ao abrir o de
 * trás — o contrário de economizar espaço.
 *
 * Por que empilhar: com três ou quatro cartões lado a lado, o bloco ocupava
 * a tela inteira do celular. Na pilha, cada cartão a mais custa uma fresta de
 * 64px, e o banco continua reconhecível pela cor e pelo logo.
 *
 * O último cartão começa aberto porque é o que está na frente, como numa
 * carteira de verdade: nada se move até a pessoa tocar.
 */
export function CarteiraCartoes({ cartoes }: { cartoes: CartaoDaCarteira[] }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(cartoes.length - 1)
  const primeiro = useRef<HTMLButtonElement>(null)
  const [altura, setAltura] = useState(0)

  // A altura do cartão depende da largura (proporção de cartão real). Mede o
  // primeiro para a pilha ter a altura certa: frestas mais um cartão inteiro.
  useEffect(() => {
    const elemento = primeiro.current
    if (!elemento) return
    const observador = new ResizeObserver(([entrada]) => setAltura(entrada.borderBoxSize?.[0]?.blockSize ?? entrada.contentRect.height))
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [])

  const alturaTotal = altura ? (cartoes.length - 1) * FRESTA + altura : undefined
  // Ordem na pilha: os outros na ordem original, o aberto por último — na
  // frente, embaixo, onde cabe inteiro.
  const posicao = (indice: number) => (indice === aberto ? cartoes.length - 1 : indice < aberto ? indice : indice - 1)

  return (
    <div className={estilos.carteira} style={{ height: alturaTotal }}>
      {cartoes.map((cartao, indice) => {
        const estaAberto = indice === aberto
        const lugar = posicao(indice)
        return (
          <button
            key={cartao.id}
            ref={indice === 0 ? primeiro : undefined}
            type="button"
            aria-expanded={estaAberto}
            aria-label={estaAberto ? `${cartao.nome}: abrir a tela de cartões` : `Mostrar ${cartao.nome}`}
            onClick={() => (estaAberto ? router.push("/cartoes") : setAberto(indice))}
            className={cn(estilos.cartao, estaAberto && estilos.levantado)}
            style={{ "--cor-banco": cartao.cor, top: lugar * FRESTA, zIndex: lugar + 1 } as CSSProperties}
          >
            <span className={estilos.topo}>
              <IdentidadeBanco instituicao={cartao.instituicao} nome={cartao.nome} className={estilos.logo} />
              <span className={estilos.banco}>
                <strong>{cartao.instituicao ?? "Cartão de crédito"}</strong>
                <small>{cartao.nome}</small>
              </span>
              {cartao.bandeira && <span className={estilos.bandeira}>{cartao.bandeira}</span>}
            </span>
            <span className={estilos.meio}>
              <i className={estilos.chip} aria-hidden />
              {cartao.final && <span className={estilos.final}>•••• {cartao.final}</span>}
            </span>
            <span className={estilos.base}>
              <span>
                <small>Fatura atual</small>
                <strong className="valor-sensivel">{formatarMoeda(cartao.faturaAtualCentavos)}</strong>
              </span>
              <span className={estilos.vencimento}>
                <small>{cartao.vencimento}</small>
                <small title={cartao.previstoProximoCentavos ? `Inclui ${formatarMoeda(cartao.previstoProximoCentavos)} em parcelas previstas` : undefined}>
                  {cartao.proximaRotulo} <b className="valor-sensivel">{formatarMoeda(cartao.proximaCentavos)}</b>
                </small>
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

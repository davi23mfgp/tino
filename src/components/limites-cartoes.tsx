"use client"

import type { CSSProperties } from "react"

import { nomeCurtoDaConta } from "@/components/filtros-do-extrato"
import { corDoBanco } from "@/lib/bancos-perfil"
import { faixaDoUsoDoLimite, faturaEmCobranca, limiteDoCartao, REFERENCIA_USO_LIMITE, type DadosCartao } from "@/lib/cartoes"
import { formatarMoeda, formatarPercentual } from "@/lib/dinheiro"
import Link from "next/link"
import estilos from "./limites-cartoes.module.css"

/**
 * Limites de todos os cartões (Davi, 26/09: opção A do canvas).
 *
 * O número de cima é o que está livre, porque é o que a pessoa vem saber
 * ("posso passar esta compra?"); o percentual usado vem ao lado com a faixa
 * que o qualifica — 56% sozinho não diz se é bom. Cada barra se divide no que
 * prende o limite: a fatura, as parcelas futuras e o que sobra. O arco grande
 * de antes dizia só o percentual e ocupava meia tela.
 *
 * "Usado" é o que o banco já descontou do limite — fatura em aberto, compras
 * da próxima fatura e parcelas futuras (ver `limiteDoCartao`).
 */
export function LimitesDosCartoes({ cartoes, hoje }: { cartoes: DadosCartao[]; hoje: string }) {
  // Cada cartão conta a partir da própria fatura em cobrança: vencimentos
  // diferentes, e a fatura de um já pode ter vencido quando a do outro não.
  const linhas = cartoes.map((cartao) => ({ cartao, limite: limiteDoCartao(cartao, faturaEmCobranca(cartao, hoje)) }))
  const comLimite = linhas.filter((linha) => linha.limite !== null)
  const total = comLimite.reduce((soma, linha) => soma + linha.limite!.limiteCentavos, 0)
  const fatura = comLimite.reduce((soma, linha) => soma + linha.limite!.faturaCentavos, 0)
  const futuras = comLimite.reduce((soma, linha) => soma + linha.limite!.parcelasFuturasCentavos, 0)
  const disponivel = comLimite.reduce((soma, linha) => soma + linha.limite!.disponivelCentavos, 0)
  const usoBps = total > 0 ? Math.round(((fatura + futuras) / total) * 10_000) : 0
  const faixa = faixaDoUsoDoLimite(usoBps)

  if (comLimite.length === 0) {
    return (
      <section className={estilos.bloco}>
        <p className={estilos.nota}>
          Nenhum cartão tem o limite cadastrado. <Link href="/configuracoes">Informe o limite em Configurações</Link> para ver quanto está livre.
        </p>
      </section>
    )
  }

  return (
    <div className={estilos.aba}>
      <section className={estilos.bloco} data-faixa={faixa}>
        <div className={estilos.topo}>
          <div><small>Livre nos cartões</small><b className="valor-sensivel">{semCentavosZerados(disponivel)}</b></div>
          <div className={estilos.uso}>
            <b>{formatarPercentual(usoBps, 0)} usado</b>
            <small>{faixa === "alto" ? `alto: de ${formatarPercentual(REFERENCIA_USO_LIMITE.alto, 0)} para cima` : `bom até ${formatarPercentual(REFERENCIA_USO_LIMITE.saudavel, 0)}`}</small>
          </div>
        </div>
        <Barra limite={total} fatura={fatura} futuras={futuras} grossa rotulo={`${formatarPercentual(usoBps, 0)} do limite total usado`} />
        <p className={estilos.legenda}><span><i data-parte="fatura" />fatura</span><span><i data-parte="futuras" />parcelas futuras</span><span><i />livre</span></p>
      </section>

      <section className={estilos.bloco}>
        <ul className={estilos.cartoes}>
          {linhas.map(({ cartao, limite }) => (
            <li key={cartao.id}>
              <div className={estilos.linha}>
                <span className={estilos.amostra} style={{ "--cor-banco": corDoBanco(cartao.instituicao) } as CSSProperties} aria-hidden />
                <strong>{nomeCurtoDaConta(cartao.nome)}</strong>
                {limite ? <span className={estilos.livre}><small>livre</small><b className="valor-sensivel">{semCentavosZerados(limite.disponivelCentavos)}</b></span> : null}
              </div>
              {limite ? (
                <>
                  <Barra limite={limite.limiteCentavos} fatura={limite.faturaCentavos} futuras={limite.parcelasFuturasCentavos} rotulo={`${cartao.nome}: ${formatarPercentual(limite.usoBps, 0)} do limite usado`} />
                  <p className={estilos.pe}>
                    <span className="valor-sensivel">fatura {semCentavosZerados(limite.faturaCentavos)}{limite.parcelasFuturasCentavos > 0 ? ` · futuras ${semCentavosZerados(limite.parcelasFuturasCentavos)}` : ""}</span>
                    <span className="valor-sensivel">limite {semCentavosZerados(limite.limiteCentavos)}</span>
                  </p>
                </>
              ) : (
                <p className={estilos.nota}>Limite não informado. <Link href="/configuracoes">Cadastrar</Link></p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

/**
 * A barra dividida: fatura cheia, parcelas futuras em verde claro, o resto é
 * o livre. Compra aprovada acima do limite pode passar de 100%; a barra para
 * no fim e o percentual escrito conta o resto.
 */
function Barra({ limite, fatura, futuras, grossa = false, rotulo }: { limite: number; fatura: number; futuras: number; grossa?: boolean; rotulo: string }) {
  const parte = (centavos: number) => `${Math.min(100, (centavos / limite) * 100)}%`
  return (
    <span className={estilos.barra} data-grossa={grossa || undefined} role="img" aria-label={rotulo}>
      <i data-parte="fatura" style={{ width: parte(fatura) }} />
      {futuras > 0 && <i data-parte="futuras" style={{ width: parte(futuras) }} />}
    </span>
  )
}

const semCentavosZerados = (centavos: number) => formatarMoeda(centavos).replace(/,00$/, "")

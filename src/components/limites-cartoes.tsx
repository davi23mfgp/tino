"use client"

import type { CSSProperties } from "react"

import { IdentidadeBanco } from "@/components/banco-perfil"
import { faixaDoUsoDoLimite, faturaEmCobranca, limiteDoCartao, REFERENCIA_USO_LIMITE, type DadosCartao } from "@/lib/cartoes"
import { formatarMoeda, formatarPercentual } from "@/lib/dinheiro"
import Link from "next/link"
import estilos from "./limites-cartoes.module.css"

/**
 * Limites de todos os cartões (Davi, 24/09, com um print de referência): o
 * total utilizado e o disponível, um arco com o percentual e, embaixo, o
 * limite de cada banco.
 *
 * "Utilizado" é o que o banco já descontou do limite — fatura em aberto,
 * compras da próxima fatura e parcelas futuras (ver `limiteDoCartao`). O arco
 * vem com a régua do que é saudável: 35% sozinho não diz se é bom.
 */
export function LimitesDosCartoes({ cartoes, hoje }: { cartoes: DadosCartao[]; hoje: string }) {
  // Cada cartão conta a partir da própria fatura em cobrança: vencimentos
  // diferentes, e a fatura de um já pode ter vencido quando a do outro não.
  const linhas = cartoes.map((cartao) => ({ cartao, limite: limiteDoCartao(cartao, faturaEmCobranca(cartao, hoje)) }))
  const comLimite = linhas.filter((linha) => linha.limite !== null)
  const total = comLimite.reduce((soma, linha) => soma + linha.limite!.limiteCentavos, 0)
  const usado = comLimite.reduce((soma, linha) => soma + linha.limite!.usadoCentavos, 0)
  const disponivel = comLimite.reduce((soma, linha) => soma + linha.limite!.disponivelCentavos, 0)
  const usoBps = total > 0 ? Math.round((usado / total) * 10_000) : 0
  const faixa = faixaDoUsoDoLimite(usoBps)

  if (comLimite.length === 0) {
    return (
      <section className={estilos.painel}>
        <h2>Limites</h2>
        <p className={estilos.nota}>
          Nenhum cartão tem o limite cadastrado. <Link href="/configuracoes">Informe o limite em Configurações</Link> para ver quanto está livre.
        </p>
      </section>
    )
  }

  return (
    <section className={estilos.painel} data-faixa={faixa}>
      <div className={estilos.totais}>
        <p className={estilos.rotulo}>Limite total utilizado</p>
        <p className={estilos.usado}><i aria-hidden />{formatarMoeda(usado)}</p>
        <p className={estilos.disponivel}><i aria-hidden />Limite disponível: {formatarMoeda(disponivel)}</p>
      </div>

      <Arco usoBps={usoBps} />

      <p className={estilos.referencia}>
        {faixa === "saudavel" ? "Uso saudável" : faixa === "atencao" ? "Atenção" : "Uso alto"} · até {formatarPercentual(REFERENCIA_USO_LIMITE.saudavel, 0)} é o que os bancos veem como saudável; de {formatarPercentual(REFERENCIA_USO_LIMITE.alto, 0)} para cima pesa na análise de crédito.
      </p>

      <h3 className={estilos.subtitulo}>Seu limite por banco</h3>
      <ul className={estilos.bancos}>
        {linhas.map(({ cartao, limite }) => (
          <li key={cartao.id}>
            <IdentidadeBanco instituicao={cartao.instituicao ?? ""} nome={cartao.nome} />
            {limite ? (
              <span className={estilos.banco} data-faixa={faixaDoUsoDoLimite(limite.usoBps)}>
                <span className={estilos.linhaBanco}><b>Utilizado: {formatarMoeda(limite.usadoCentavos)}</b><small>{formatarPercentual(limite.usoBps, 0)}</small></span>
                <span className={estilos.barra} role="img" aria-label={`${cartao.nome}: ${formatarPercentual(limite.usoBps, 0)} do limite de ${formatarMoeda(limite.limiteCentavos)} utilizado`}>
                  <span style={{ width: `${Math.min(100, limite.usoBps / 100)}%` } as CSSProperties} />
                </span>
                <span className={estilos.linhaBanco}><span>Disponível: {formatarMoeda(limite.disponivelCentavos)}</span><small>de {formatarMoeda(limite.limiteCentavos)}</small></span>
                {limite.parcelasFuturasCentavos > 0 && (
                  <small className={estilos.composicao}>
                    {formatarMoeda(limite.faturaCentavos)} em faturas + {formatarMoeda(limite.parcelasFuturasCentavos)} em parcelas futuras
                  </small>
                )}
              </span>
            ) : (
              <span className={estilos.banco}>
                <b>{cartao.nome}</b>
                <small className={estilos.composicao}>Limite não informado. <Link href="/configuracoes">Cadastrar</Link></small>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * O arco de três quartos de volta, aberto embaixo, como no print de
 * referência. `stroke-dasharray` num círculo só: o trilho e o preenchido são
 * o mesmo círculo, e o preenchido para no percentual.
 */
function Arco({ usoBps }: { usoBps: number }) {
  const raio = 80
  const circunferencia = 2 * Math.PI * raio
  const arco = circunferencia * 0.75
  const preenchido = arco * Math.min(1, usoBps / 10_000)
  return (
    <div className={estilos.arco} role="img" aria-label={`${formatarPercentual(usoBps, 0)} do limite utilizado`}>
      <svg viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={raio} className={estilos.trilho} strokeDasharray={`${arco} ${circunferencia}`} transform="rotate(135 100 100)" />
        <circle cx="100" cy="100" r={raio} className={estilos.valor} strokeDasharray={`${preenchido} ${circunferencia}`} transform="rotate(135 100 100)" />
      </svg>
      <span>
        <b>{formatarPercentual(usoBps, 0)}</b>
        <small>utilizado</small>
      </span>
    </div>
  )
}

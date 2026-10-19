import Link from "next/link"
import type { CSSProperties, ReactNode } from "react"
import { ChevronRight, CreditCard, Landmark, PiggyBank, Plus, TrendingUp, Wallet } from "lucide-react"

import { fonteDisplay } from "@/app/(site)/tipografia"
import { corDoBanco, encontrarBanco } from "@/lib/bancos-perfil"
import { formatarMoeda } from "@/lib/dinheiro"
import { rotuloCompetencia } from "@/lib/datas"
import estilos from "./bancos.module.css"

/**
 * Bancos (passo 58, opção A, 19/10/2026): um bloco por banco, com a conta, a
 * poupança e o cartão dentro dele. Davi: "na parte de cartão é melhor ser por
 * conta, e naquela conta do banco tenho conta corrente e ou cartão". É como o
 * Monarch agrupa por instituição.
 *
 * Cada linha leva para onde a pessoa resolve aquilo: a conta abre o extrato
 * dela, o cartão abre a fatura. Títulos e números na fonte do site (pedido do
 * Davi no mesmo dia: "aplique o estilo que temos no site").
 */
export interface ProdutoDoBanco {
  id: string
  nome: string
  tipo: string
  instituicao: string | null
  saldoCentavos: number
  cartao?: { faturaCentavos: number; competencia: string; vencimento: string | null; parcelasCentavos: number; limiteCentavos: number | null; usoBps: number | null; disponivelCentavos: number | null }
}

const TIPO: Record<string, { rotulo: string; Icone: typeof Landmark }> = {
  CORRENTE: { rotulo: "Conta corrente", Icone: Landmark },
  PJ_MEI: { rotulo: "Conta do negócio", Icone: Landmark },
  POUPANCA: { rotulo: "Poupança", Icone: PiggyBank },
  INVESTIMENTO: { rotulo: "Investimentos", Icone: TrendingUp },
  DINHEIRO: { rotulo: "Dinheiro", Icone: Wallet },
  CARTAO_CREDITO: { rotulo: "Cartão", Icone: CreditCard },
}

const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

function destino(produto: ProdutoDoBanco) {
  if (produto.tipo === "CARTAO_CREDITO") return `/cartoes?cartao=${produto.id}`
  if (produto.tipo === "INVESTIMENTO") return "/investir"
  return `/transacoes?contaId=${produto.id}`
}

function Linha({ produto }: { produto: ProdutoDoBanco }) {
  const tipo = TIPO[produto.tipo] ?? TIPO.CORRENTE
  const cartao = produto.cartao
  let sub: ReactNode = produto.tipo === "POUPANCA" ? "guardado" : produto.tipo === "INVESTIMENTO" ? "investido" : "saldo hoje"
  let valor = produto.saldoCentavos
  if (cartao) {
    valor = cartao.faturaCentavos
    // Uma linha curta embaixo do nome; parcelas e limite vão para a linha da
    // régua, que ocupa a largura toda (no celular o texto espremia o valor).
    sub = <>fatura de {rotuloCompetencia(cartao.competencia).split(" ")[0]}{cartao.vencimento ? ` · vence ${dataCurta(cartao.vencimento)}` : ""}</>
  }
  return (
    <li>
      <Link href={destino(produto)} className={estilos.linha}>
        <span className={estilos.icone}><tipo.Icone aria-hidden /></span>
        <span className={estilos.texto}>
          <b>{produto.nome && produto.nome !== produto.instituicao ? produto.nome : tipo.rotulo}</b>
          <small>{sub}</small>
        </span>
        <b className={`${estilos.valor} valor-sensivel`} data-negativo={valor < 0 || undefined}>{formatarMoeda(valor)}</b>
        <ChevronRight aria-hidden className={estilos.seta} />
        {cartao?.usoBps != null && cartao.limiteCentavos ? (
          <span className={estilos.limiteLinha}>
            <span className={estilos.limite} role="img" aria-label={`Limite: ${formatarMoeda(cartao.disponivelCentavos ?? 0)} livres de ${formatarMoeda(cartao.limiteCentavos)}`}>
              <i data-faixa={cartao.usoBps <= 3000 ? "bom" : cartao.usoBps <= 7000 ? "atencao" : "alto"} style={{ width: `${Math.min(100, cartao.usoBps / 100)}%` }} />
            </span>
            <small>{formatarMoeda(cartao.disponivelCentavos ?? 0)} livres de {formatarMoeda(cartao.limiteCentavos)} · bom até 30% usado{cartao.parcelasCentavos > 0 ? ` · ${formatarMoeda(cartao.parcelasCentavos)} em parcelas a vir` : ""}</small>
          </span>
        ) : null}
      </Link>
    </li>
  )
}

export function Bancos({ produtos }: { produtos: ProdutoDoBanco[] }) {
  const grupos = new Map<string, ProdutoDoBanco[]>()
  for (const produto of produtos) {
    const nome = produto.tipo === "DINHEIRO" ? "Dinheiro" : encontrarBanco(produto.instituicao ?? "")?.nome ?? produto.instituicao ?? "Outras contas"
    grupos.set(nome, [...(grupos.get(nome) ?? []), produto])
  }
  const emConta = produtos.filter((p) => p.tipo !== "CARTAO_CREDITO" && p.tipo !== "INVESTIMENTO").reduce((s, p) => s + p.saldoCentavos, 0)
  const faturas = produtos.reduce((s, p) => s + (p.cartao?.faturaCentavos ?? 0), 0)
  const ordem = [...grupos.entries()].sort((a, b) => b[1].length - a[1].length)

  return (
    <div className={`${estilos.pagina} ${fonteDisplay.variable}`}>
      <section className={estilos.resumo}>
        <div><small>Em conta, somando os bancos</small><b className="valor-sensivel">{formatarMoeda(emConta)}</b></div>
        <div><small>Faturas abertas</small><b className="valor-sensivel">{formatarMoeda(faturas)}</b></div>
      </section>

      {ordem.length === 0 && (
        <div className={estilos.vazio}><p>Nenhuma conta ainda. Comece pelo banco onde cai o seu salário.</p><Link href="/configuracoes" className={estilos.botao}><Plus aria-hidden />Adicionar conta ou cartão</Link></div>
      )}

      <div className={estilos.grade}>
        {ordem.map(([nome, itens]) => {
          const banco = encontrarBanco(nome)
          const total = itens.filter((p) => p.tipo !== "CARTAO_CREDITO").reduce((s, p) => s + p.saldoCentavos, 0)
          const soCartao = itens.every((p) => p.tipo === "CARTAO_CREDITO")
          // O rótulo diz o que o número soma: só investimento não é "em conta".
          const temConta = itens.some((p) => ["CORRENTE", "POUPANCA", "DINHEIRO", "PJ_MEI"].includes(p.tipo))
          return (
            <section key={nome} className={estilos.banco} style={{ "--cor-banco": corDoBanco(nome) } as CSSProperties}>
              <header>
                <span className={estilos.logo}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {banco?.logo ? <img src={banco.logo} alt="" /> : <Wallet aria-hidden />}
                </span>
                <span className={estilos.nome}><b>{nome}</b><small>{soCartao ? "fatura aberta" : temConta ? "em conta e guardado" : "investido"}</small></span>
                <b className={`${estilos.total} valor-sensivel`}>{formatarMoeda(soCartao ? itens.reduce((s, p) => s + (p.cartao?.faturaCentavos ?? 0), 0) : total)}</b>
              </header>
              <ul>{itens.map((produto) => <Linha key={produto.id} produto={produto} />)}</ul>
              <Link href="/configuracoes" className={estilos.adicionar}><Plus aria-hidden />Adicionar conta ou cartão no {nome === "Banco do Brasil" ? "BB" : nome}</Link>
            </section>
          )
        })}
      </div>

      <Link href="/configuracoes" className={estilos.outroBanco}><Plus aria-hidden />Adicionar outro banco</Link>
    </div>
  )
}

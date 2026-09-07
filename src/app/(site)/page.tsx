import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, Check, Minus } from "lucide-react"

import { formatarMoeda, formatarPercentual } from "@/lib/dinheiro"
import { descontoAnualBps } from "@/lib/planos"
import { diasDeTesteVigentes, planosVigentes } from "@/lib/parametros"
import { TinoMascote } from "@/components/tino-mascote"
import { SiteNavbar } from "@/components/site-navbar"

export const metadata: Metadata = {
  title: "Tino, o contador que olha suas contas todo dia",
  description:
    "Organize contas, dívidas e metas, e saiba o que fazer com o que sobra. Para pessoa física e para o MEI que atende no balcão.",
}

/**
 * A página que vende.
 *
 * O produto não é uma planilha bonita: é alguém olhando os números e dizendo o
 * que fazer. Por isso a primeira coisa da página não é um número grande com
 * gradiente — é o Tino apontando um problema de verdade, com valor e mês, do
 * jeito que ele aparece dentro do app.
 *
 * Os números do exemplo são de uma conta de demonstração e a página diz isso.
 * Inventar um caso de sucesso seria a mesma mentira que o app inteiro existe
 * para não contar.
 */

const PERGUNTAS = [
  {
    pergunta: "Quanto sobra de verdade este mês?",
    resposta:
      "Somando o que entra, o que já foi comprometido em parcela e o que a fatura vai cobrar. Não é o saldo da conta.",
  },
  {
    pergunta: "Qual dívida eu pago primeiro?",
    resposta:
      "A ordem de ataque sai pronta, com a comparação entre pagar a mais cara e pagar a menor primeiro — e quanto cada caminho custa em juros.",
  },
  {
    pergunta: "Quando eu saio do vermelho?",
    resposta: "A projeção mostra o mês em que o caixa vira, e quanto precisa cortar para isso não acontecer.",
  },
  {
    pergunta: "Cortar R$ 200 por mês muda alguma coisa?",
    resposta: "Duas linhas no gráfico: a de hoje e a com o corte. E o que esses R$ 200 viram em vinte anos.",
  },
]

/**
 * Preço lido do banco a cada visita, e não congelado no build.
 *
 * O admin edita o preço sem deploy; se esta página guardasse o valor do build,
 * a propaganda continuaria anunciando o preço velho até o próximo commit — e
 * anunciar um valor e cobrar outro é a pior forma de começar uma relação
 * comercial. Se o banco não responder, `planosVigentes` devolve o padrão do
 * código e a página continua de pé.
 */
export const dynamic = "force-dynamic"

export default async function Vitrine() {
  const [PLANOS, DIAS_DE_TESTE] = await Promise.all([planosVigentes(), diasDeTesteVigentes()])

  return (
    <>
      <SiteNavbar />
      <main>
      {/* ── O que o produto faz, mostrado em vez de prometido ── */}
      <section className="mx-auto max-w-5xl px-5 pb-16 pt-16 sm:pt-24">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-fg">Tino</p>

        <h1 className="font-display mt-3 max-w-2xl text-[34px] font-bold leading-[1.08] tracking-tight sm:text-[52px]">
          Um contador que olha suas contas todo dia e diz o que fazer.
        </h1>

        <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted-fg">
          A planilha guarda o passado. O Tino olha para frente: aponta o mês em que o caixa vira, qual dívida atacar
          primeiro e o que o corte de hoje faz com o seu dinheiro daqui a vinte anos.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/cadastro"
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-[14px] font-medium text-primary-foreground"
          >
            Testar {DIAS_DE_TESTE} dias de graça <ArrowRight className="size-4" />
          </Link>
          <Link href="/login" className="px-2 text-[14px] text-muted-fg hover:text-foreground">
            já tenho conta
          </Link>
        </div>

        <p className="mt-3 text-[12px] text-muted-fg">Sem cartão para começar.</p>

        {/* O aviso do app, do jeito que ele aparece dentro do produto. */}
        <div className="ficha mt-12 flex items-start gap-4 p-5 sm:p-6">
          <TinoMascote estado="critico" className="size-14 shrink-0 sm:size-16" />
          <div className="min-w-0">
            <p className="font-display text-[15px] font-semibold sm:text-[17px]">Precisa de decisão agora.</p>
            <p className="mt-1 text-[14px] font-medium">Seu caixa fica negativo antes do previsto</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-fg">
              Mantendo o ritmo atual, o saldo fica negativo em janeiro de 2027{" "}
              <span className="numero">(−R$ 3.192,32)</span>. Dá para evitar cortando{" "}
              <span className="numero">R$ 3.192,32</span> ao longo dos próximos meses.
            </p>
            <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-fg">
              exemplo de uma conta de demonstração
            </p>
          </div>
        </div>
      </section>

      {/* ── As perguntas que ele responde ── */}
      <section id="perguntas" className="border-y border-pauta bg-papel-2/60">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="font-display text-[24px] font-bold tracking-tight sm:text-[30px]">
            Quatro perguntas que a planilha não responde
          </h2>

          <div className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {PERGUNTAS.map((item) => (
              <div key={item.pergunta}>
                <p className="text-[15px] font-medium">{item.pergunta}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-fg">{item.resposta}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── A loja ── */}
      <section id="loja" className="mx-auto max-w-5xl px-5 py-16">
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-fg">Para quem tem loja</p>
        <h2 className="font-display mt-2 max-w-2xl text-[24px] font-bold tracking-tight sm:text-[30px]">
          A maquininha mostra o bruto. O extrato mostra o líquido três semanas depois.
        </h2>

        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-fg">
          No meio disso, o dono planeja com um dinheiro que não existe. O Tino registra a venda no balcão já com a taxa
          e o prazo da sua maquininha, e diz quanto cai na conta e em que dia.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { titulo: "Balcão", texto: "Venda em poucos toques, com dinheiro, Pix, cartão ou fiado. Caixa que fecha." },
            { titulo: "Prateleira", texto: "Saldo, custo médio e margem por produto. Sem custo, o app diz que falta." },
            { titulo: "Fiado", texto: "Quem deve, há quanto tempo, e o texto de cobrança pronto para você mandar." },
          ].map((bloco) => (
            <div key={bloco.titulo} className="ficha p-5">
              <p className="font-display text-[15px] font-semibold">{bloco.titulo}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-fg">{bloco.texto}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-[13px] leading-relaxed text-muted-fg">
          E o faturamento entra sozinho na competência do MEI — o limite anual e o DAS param de depender de você
          lembrar de redigitar tudo no fim do mês.
        </p>
      </section>

      {/* ── Preço ── */}
      <section id="planos" className="border-t border-pauta bg-papel-2/60">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="font-display text-[24px] font-bold tracking-tight sm:text-[30px]">Quanto custa</h2>
          <p className="mt-2 text-[14px] text-muted-fg">
            {DIAS_DE_TESTE} dias para testar, sem cartão. Cancela quando quiser.
          </p>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {PLANOS.map((linha) => {
              const desconto = descontoAnualBps(linha)

              return (
                <div key={linha.codigo} className="ficha flex flex-col p-6">
                  <p className="font-display text-[17px] font-semibold">{linha.nome}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-fg">{linha.chamada}</p>

                  <p className="numero mt-5 text-[34px] font-bold leading-none">
                    {formatarMoeda(linha.mensalCentavos)}
                    <span className="ml-1.5 font-sans text-[13px] font-normal text-muted-fg">por mês</span>
                  </p>
                  <p className="mt-1.5 text-[12px] text-muted-fg">
                    ou <span className="numero">{formatarMoeda(linha.anualCentavos)}</span> por ano —{" "}
                    {formatarPercentual(desconto, 0)} de desconto
                  </p>

                  <ul className="mt-5 space-y-2">
                    {linha.inclui.map((item) => (
                      <li key={item} className="flex gap-2.5 text-[13px]">
                        <Check className="mt-0.5 size-4 shrink-0 text-positivo" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-5 text-[11px] uppercase tracking-widest text-muted-fg">Não faz</p>
                  <ul className="mt-2 space-y-1.5">
                    {linha.naoInclui.map((item) => (
                      <li key={item} className="flex gap-2.5 text-[13px] text-muted-fg">
                        <Minus className="mt-0.5 size-4 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/cadastro"
                    className="mt-6 rounded-full bg-primary px-5 py-3 text-center text-[14px] font-medium text-primary-foreground"
                  >
                    Começar o teste
                  </Link>
                </div>
              )
            })}
          </div>

          <p className="mt-6 max-w-2xl text-[12px] leading-relaxed text-muted-fg">
            O Tino não é consultor de investimentos nem substitui contador para obrigação fiscal. Ele organiza,
            projeta e mostra a conta com os seus números.
          </p>
        </div>
      </section>

      <footer className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-10 text-[12px] text-muted-fg">
        <div className="flex items-center gap-2.5">
          <TinoMascote estado="tranquilo" animado={false} className="size-7" />
          <span>Tino</span>
        </div>
        <div className="flex gap-5">
          <Link href="/login" className="hover:text-foreground">
            Entrar
          </Link>
          <Link href="/cadastro" className="hover:text-foreground">
            Criar conta
          </Link>
        </div>
      </footer>
      </main>
    </>
  )
}

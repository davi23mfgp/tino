import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, Check, Minus } from "lucide-react"

import { formatarMoeda, formatarPercentual } from "@/lib/dinheiro"
import { descontoAnualBps } from "@/lib/planos"
import { diasDeTesteVigentes, planosVigentes } from "@/lib/parametros"
import { TinoMascote } from "@/components/tino-mascote"
import { FitaDoTempo } from "./fita-do-tempo"
import { TelaNoCelular } from "./tela-no-celular"

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
 * gradiente — é a FITA DO TEMPO, a saída de verdade da tela `/projecao`, com o
 * mês em que o caixa vira marcado. Um número grande não tem data; uma fita de
 * meses tem, e a data é o que o produto vende.
 *
 * Os números do exemplo são de uma conta de demonstração e a página diz isso.
 * Inventar um caso de sucesso seria a mesma mentira que o app inteiro existe
 * para não contar — por isso também não há depoimento nem logo de imprensa.
 */

/**
 * As perguntas que a planilha não responde — cada uma com a RESPOSTA no
 * formato em que o app devolveria. Uma pergunta sem resposta concreta é
 * marketing; com o número do lado, é demonstração.
 */
const PERGUNTAS = [
  {
    pergunta: "Quanto sobra de verdade?",
    resposta:
      "Depois da fatura que ainda vai fechar e da parcela que já está comprada. Não é o saldo que o banco mostra.",
    dado: "R$ 1.284,00",
    unidade: "sobra real deste mês",
    tom: "entra" as const,
  },
  {
    pergunta: "Qual dívida eu pago primeiro?",
    resposta:
      "A ordem sai pronta, com a conta de quanto cada caminho custa em juros até o fim — a mais cara ou a menor primeiro.",
    dado: "R$ 2.847,00",
    unidade: "de juros economizados na ordem certa",
    tom: "entra" as const,
  },
  {
    pergunta: "Cortar R$ 200 por mês muda alguma coisa?",
    resposta: "Duas linhas no mesmo gráfico: o ritmo de hoje e o ritmo com o corte. E o que sobra em vinte anos.",
    dado: "R$ 96.400,00",
    unidade: "em 20 anos, a 0,8% ao mês",
    tom: "entra" as const,
  },
]

const FREQUENTES = [
  {
    pergunta: "Preciso conectar meu banco?",
    resposta:
      "Não. Dá para importar o extrato em arquivo (OFX, CSV ou PDF da fatura) ou escrever “uber 18” que o Tino entende. Conectar pelo Open Finance é o caminho que enche o app sozinho, mas é escolha sua.",
  },
  {
    pergunta: "O Tino investe por mim?",
    resposta:
      "Não, e não recomenda ativo, corretora nem aplicação específica — isso é atividade regulada. Ele mostra o que o seu dinheiro faz em cada cenário e deixa a decisão com você.",
  },
  {
    pergunta: "Serve para quem tem CNPJ?",
    resposta:
      "Serve para MEI. Venda no balcão, prateleira com custo e margem, fiado e o faturamento caindo sozinho na competência — com o limite anual e o DAS acompanhando. Empresa fora do MEI ainda não.",
  },
  {
    pergunta: "Posso cancelar quando quiser?",
    resposta: "Pode, pela própria tela de assinatura. O que você já lançou continua seu, e a exportação não é bloqueada.",
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
      {/* Nav fina, sem fundo e sem grudar: numa página que se lê rolando, a
          barra fixa rouba altura em toda dobra. O CTA volta no fim. */}
      <header className="cerca flex items-center justify-between gap-4 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <TinoMascote estado="tranquilo" animado={false} className="size-8" />
          <span className="display text-[17px]">Tino</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link href="/login" className="botao botao--fantasma">
            Entrar
          </Link>
          <Link href="/cadastro" className="botao">
            Testar {DIAS_DE_TESTE} dias
          </Link>
        </nav>
      </header>

      <main>
        {/* ── Herói: a tese, e a fita logo abaixo dela ── */}
        <section className="cerca faixa">
          <p className="sobrancelha">Contador pessoal · pessoa física e MEI</p>

          <h1 className="display h-hero mt-6 max-w-[15ch]">Seu dinheiro tem uma data de virada.</h1>

          <p className="apoio mt-6">
            A planilha guarda o passado. O Tino olha para frente: diz o mês em que o caixa vira, qual dívida atacar
            primeiro e o que o corte de hoje faz com o seu dinheiro daqui a vinte anos.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/cadastro" className="botao">
              Testar {DIAS_DE_TESTE} dias de graça <ArrowRight className="size-4" />
            </Link>
            <span className="text-[13px] text-[color:var(--areia)]">Sem cartão para começar.</span>
          </div>

          <div className="mt-14">
            <FitaDoTempo />
          </div>
        </section>

        {/* ── Três perguntas, com a resposta em forma de número ── */}
        <section className="perguntas">
          {PERGUNTAS.map((item) => (
            <article key={item.pergunta} className="pergunta">
              <h2 className="pergunta-titulo">{item.pergunta}</h2>
              <p className="pergunta-resposta">{item.resposta}</p>
              <p className="pergunta-dado">
                <span className={`numero ${item.tom === "entra" ? "dado-entra" : "dado-sai"}`}>{item.dado}</span>
                <small>{item.unidade}</small>
              </p>
            </article>
          ))}
        </section>

        {/* ── O app no celular, ao lado do que ele faz ── */}
        <section className="cerca faixa">
          <div className="mostruario">
            <div>
              <p className="sobrancelha">No seu bolso</p>
              <h2 className="display h-secao mt-5 max-w-[16ch]">Abre, olha, entende. Em três segundos.</h2>

              <ul className="lista-marcada">
                <li>
                  <span className="risco-marca" aria-hidden />
                  <span>
                    <strong>Um número manda na tela.</strong> O que sobra depois da fatura e da parcela — não o saldo
                    que o banco mostra.
                  </span>
                </li>
                <li>
                  <span className="risco-marca" aria-hidden />
                  <span>
                    <strong>A fila do que espera você.</strong> Gasto capturado do Pix, da foto da nota ou do extrato,
                    esperando um toque para virar lançamento.
                  </span>
                </li>
                <li>
                  <span className="risco-marca" aria-hidden />
                  <span>
                    <strong>Para onde o mês foi.</strong> Categoria por categoria, sem você classificar nada na mão
                    depois da primeira vez.
                  </span>
                </li>
              </ul>
            </div>

            <div className="mostruario-celular">
              <TelaNoCelular />
            </div>
          </div>
        </section>

        {/* ── A virada para o papel: agora falando com quem atende o balcão ── */}
        <section className="papel">
          <div className="cerca faixa">
            <p className="sobrancelha">Para quem tem loja</p>

            <h2 className="display h-secao mt-5 max-w-[18ch]">
              A maquininha mostra o bruto. O extrato mostra o líquido três semanas depois.
            </h2>

            <p className="apoio mt-6">
              No meio disso, o dono planeja com um dinheiro que não existe. O Tino registra a venda já com a taxa e o
              prazo da sua maquininha, e diz quanto cai na conta e em que dia.
            </p>

            <div className="regua" aria-label="Exemplo: venda de R$ 100,00 no crédito em uma maquininha comum">
              <div className="regua-linha">
                <span className="numero" style={{ minWidth: "6.5rem" }}>
                  R$ 100,00
                </span>
                <span className="regua-trilho">
                  <span className="regua-preenche" style={{ width: "100%" }} />
                </span>
                <span style={{ minWidth: "7.5rem" }}>bruto, hoje</span>
              </div>
              <div className="regua-linha mt-3">
                <span className="numero" style={{ minWidth: "6.5rem" }}>
                  R$ 95,80
                </span>
                <span className="regua-trilho">
                  <span className="regua-preenche" style={{ width: "95.8%" }} />
                </span>
                <span style={{ minWidth: "7.5rem" }}>na conta, em 30 dias</span>
              </div>
            </div>

            <div className="balcao">
              {[
                {
                  titulo: "Balcão",
                  texto: "Venda em poucos toques, com dinheiro, Pix, cartão ou fiado. Caixa que fecha no fim do dia.",
                },
                {
                  titulo: "Prateleira",
                  texto: "Saldo, custo médio e margem por produto. Sem o custo, o app avisa que falta — não inventa.",
                },
                {
                  titulo: "Fiado",
                  texto: "Quem deve, há quanto tempo, e o texto de cobrança pronto para você mandar no WhatsApp.",
                },
              ].map((bloco) => (
                <div key={bloco.titulo} className="balcao-item">
                  <h3 className="balcao-titulo">{bloco.titulo}</h3>
                  <p className="balcao-texto">{bloco.texto}</p>
                </div>
              ))}
            </div>

            <p className="balcao-texto mt-8 max-w-[60ch]">
              E o faturamento entra sozinho na competência do MEI — o limite anual e o DAS param de depender de você
              lembrar de redigitar tudo no fim do mês.
            </p>
          </div>
        </section>

        {/* ── Preço ── */}
        <section id="planos" className="cerca faixa">
          <p className="sobrancelha">Quanto custa</p>
          <h2 className="display h-secao mt-5">{DIAS_DE_TESTE} dias para testar, sem cartão.</h2>

          <div className="planos">
            {PLANOS.map((linha) => {
              const desconto = descontoAnualBps(linha)

              return (
                <article key={linha.codigo} className="plano">
                  <h3 className="display text-[19px]">{linha.nome}</h3>
                  <p className="mt-1.5 text-[14px] text-[color:var(--areia)]">{linha.chamada}</p>

                  <p className="numero plano-preco">
                    {formatarMoeda(linha.mensalCentavos)}
                    <span className="ml-2 font-[family-name:var(--fonte-corpo)] text-[13px] font-normal tracking-normal text-[color:var(--areia)]">
                      por mês
                    </span>
                  </p>
                  <p className="mt-2 text-[13px] text-[color:var(--areia)]">
                    ou {formatarMoeda(linha.anualCentavos)} por ano — {formatarPercentual(desconto, 0)} de desconto
                  </p>

                  <ul className="plano-lista">
                    {linha.inclui.map((item) => (
                      <li key={item}>
                        <Check className="mt-0.5 size-4 shrink-0 text-[color:var(--entra)]" />
                        {item}
                      </li>
                    ))}
                    {linha.naoInclui.map((item) => (
                      <li key={item} className="plano-fora">
                        <Minus className="mt-0.5 size-4 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Link href="/cadastro" className="botao mt-7 self-start">
                    Começar o teste
                  </Link>
                </article>
              )
            })}
          </div>

          <p className="mt-8 max-w-[64ch] text-[13px] text-[color:var(--areia)]">
            O Tino não é consultor de investimentos nem substitui contador para obrigação fiscal. Ele organiza, projeta
            e mostra a conta com os seus números.
          </p>
        </section>

        {/* ── Dúvidas ── */}
        <section className="cerca faixa linha-fina">
          <h2 className="display h-secao">Antes de você perguntar</h2>

          <div className="faq">
            {FREQUENTES.map((item) => (
              <details key={item.pergunta}>
                <summary>{item.pergunta}</summary>
                <p>{item.resposta}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Fecho ── */}
        <section className="cerca faixa linha-fina text-center">
          <TinoMascote estado="comemorando" className="mx-auto size-20" />
          <h2 className="display h-secao mx-auto mt-6 max-w-[16ch]">Descubra sua data antes que ela chegue.</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/cadastro" className="botao">
              Testar {DIAS_DE_TESTE} dias de graça <ArrowRight className="size-4" />
            </Link>
            <Link href="/login" className="botao botao--fantasma">
              Já tenho conta
            </Link>
          </div>
        </section>

        <footer className="cerca rodape">
          <span>Tino · contador pessoal</span>
          <div className="flex gap-5">
            <Link href="/login">Entrar</Link>
            <Link href="/cadastro">Criar conta</Link>
          </div>
        </footer>
      </main>
    </>
  )
}

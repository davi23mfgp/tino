import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, Check, Minus } from "lucide-react"

import { formatarMoeda, formatarPercentual } from "@/lib/dinheiro"
import { descontoAnualBps } from "@/lib/planos"
import { diasDeTesteVigentes, planosVigentes } from "@/lib/parametros"
import { FitaDoTempo } from "./fita-do-tempo"
import { Porquinho } from "./porquinho"
import { TelaNoCelular } from "./tela-no-celular"

export const metadata: Metadata = {
  title: "Tino · Seu dinheiro tem uma data de virada",
  description:
    "Contador pessoal para pessoa física e MEI: mostra o mês em que o caixa vira, qual dívida pagar primeiro e o que sobra de verdade depois da fatura.",
  openGraph: {
    title: "Tino · Seu dinheiro tem uma data de virada",
    description:
      "Contador pessoal para pessoa física e MEI. Ele diz o mês em que o caixa vira, qual dívida atacar primeiro e o que o corte de hoje faz em vinte anos.",
    type: "website",
    locale: "pt_BR",
    siteName: "Tino",
  },
}

/**
 * A página que vende.
 *
 * O produto não é uma planilha bonita: é alguém olhando os números e dizendo o
 * que fazer. Por isso a primeira coisa depois do título é a FITA DO TEMPO, a
 * saída de verdade da tela `/projecao`, com o mês em que o caixa vira marcado.
 * Um número grande não tem data; uma fita de meses tem, e a data é o que o
 * produto vende.
 *
 * Os números são de demonstração e a página diz isso onde aparecem. Não há
 * depoimento nem nota de loja de aplicativo: inventar caso de sucesso seria a
 * mesma mentira que o app inteiro existe para não contar.
 *
 * TODO O CONTEÚDO EDITÁVEL ESTÁ NOS ARRAYS ABAIXO — mexer em texto não exige
 * abrir o JSX.
 */

const NAVEGACAO = [
  { href: "#recursos", rotulo: "Recursos" },
  { href: "#como-funciona", rotulo: "Como funciona" },
  { href: "#planos", rotulo: "Preços" },
  { href: "#duvidas", rotulo: "Dúvidas" },
]

const PILARES = [
  {
    titulo: "Quanto sobra de verdade",
    metrica: "R$ 1.284",
    unidade: "sobra real deste mês, na conta de demonstração",
    texto: "Depois da fatura que ainda vai fechar e da parcela já comprada. Não é o saldo que o banco mostra.",
  },
  {
    titulo: "Qual dívida pagar primeiro",
    metrica: "R$ 2.847",
    unidade: "de juros economizados na ordem certa",
    texto: "A ordem sai pronta, com a conta de quanto cada caminho custa até o fim — a mais cara ou a menor primeiro.",
  },
  {
    titulo: "O efeito do corte",
    metrica: "R$ 96.400",
    unidade: "em 20 anos, cortando R$ 200 por mês",
    texto: "Duas linhas no mesmo gráfico: o ritmo de hoje e o ritmo com o corte. Você decide olhando os dois.",
  },
]

const BOLSO = [
  {
    titulo: "Um número manda na tela.",
    texto: "O que sobra depois da fatura e da parcela — não o saldo que o banco mostra.",
  },
  {
    titulo: "A fila do que espera você.",
    texto: "Gasto capturado do Pix, da foto da nota ou do extrato, esperando um toque para virar lançamento.",
  },
  {
    titulo: "Para onde o mês foi.",
    texto: "Categoria por categoria, sem você classificar nada na mão depois da primeira vez.",
  },
]

const PASSOS = [
  {
    numero: "01",
    titulo: "Traga o que já existe",
    texto: "Importe o extrato em OFX, CSV ou o PDF da fatura. Ou escreva “uber 18” e deixe o Tino entender.",
  },
  {
    numero: "02",
    titulo: "Confirme uma vez",
    texto: "Ele classifica sozinho e mostra a fila para você conferir. O que você corrigir, ele aprende e não erra de novo.",
  },
  {
    numero: "03",
    titulo: "Receba a data",
    texto: "Com lançamento na mão, ele projeta os próximos meses e diz onde o caixa vira — e quanto cortar para não virar.",
  },
]

const RECURSOS = [
  {
    titulo: "Projeção de caixa",
    texto: "Doze meses à frente, com o mês da virada marcado e o corte necessário calculado.",
  },
  {
    titulo: "Plano de dívidas",
    texto: "Ordem de ataque com a comparação entre juro mais alto e menor saldo, em reais.",
  },
  {
    titulo: "Captura automática",
    texto: "Notificação do banco, foto da nota, PDF da fatura ou uma frase escrita à mão.",
  },
  {
    titulo: "Cartões e parcelas",
    texto: "O que já está comprometido em cada mês futuro, antes de qualquer gasto novo.",
  },
  {
    titulo: "Loja do MEI",
    texto: "Balcão, prateleira com margem, fiado e o faturamento caindo na competência.",
  },
  {
    titulo: "Simulador",
    texto: "Empréstimo, corte de gasto ou aporte: a conta aberta, não o resultado sozinho.",
  },
]

const DUVIDAS = [
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
      "Serve para MEI: venda no balcão, prateleira com custo e margem, fiado e o faturamento caindo sozinho na competência, com o limite anual e o DAS acompanhando. Empresa fora do MEI ainda não.",
  },
  {
    pergunta: "Posso cancelar quando quiser?",
    resposta:
      "Pode, pela própria tela de assinatura. O que você já lançou continua seu, e a exportação não é bloqueada em nenhum momento.",
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
      {/* 1 ── Menu flutuante em pílula */}
      <header className="menu-flutuante glass-pill">
        <Link href="/" className="menu-marca">
          <Porquinho tamanho={30} />
          Tino
        </Link>

        <nav className="menu-links" aria-label="Seções da página">
          {NAVEGACAO.map((item) => (
            <a key={item.href} href={item.href}>
              {item.rotulo}
            </a>
          ))}
        </nav>

        <div className="menu-acoes">
          <Link href="/login" className="menu-entrar">
            Entrar
          </Link>
          <Link href="/cadastro" className="botao botao--pequeno">
            Testar {DIAS_DE_TESTE} dias
          </Link>
        </div>
      </header>

      <main>
        {/* 2 ── Herói */}
        <section className="cerca heroi">
          <p className="eyebrow">Contador pessoal · pessoa física e MEI</p>

          <h1 className="display h-hero rise">Seu dinheiro tem uma data de virada.</h1>

          <p className="apoio">
            A planilha guarda o passado. O Tino olha para frente: diz o mês em que o caixa vira, qual dívida atacar
            primeiro e o que o corte de hoje faz daqui a vinte anos.
          </p>

          <div className="heroi-acoes">
            <Link href="/cadastro" className="botao">
              Testar {DIAS_DE_TESTE} dias de graça <ArrowRight className="size-4" />
            </Link>
            <span className="nota">Sem cartão para começar.</span>
          </div>
        </section>

        {/* 3 ── Saldo projetado + o porquinho */}
        <section className="cerca" style={{ paddingBottom: "clamp(4rem, 9vw, 7.5rem)" }}>
          <div className="projecao">
            <FitaDoTempo />

            <div className="mascote-palco">
              <Porquinho tamanho={260} flutua prioritario />
            </div>
          </div>
        </section>

        {/* 4 ── Os três pilares */}
        <section className="cerca faixa linha-fina">
          <p className="eyebrow">O que ele responde</p>
          <h2 className="display h-secao mt-4 max-w-[18ch]">Três perguntas que a planilha não responde.</h2>

          <div className="pilares mt-12">
            {PILARES.map((pilar) => (
              <article key={pilar.titulo} className="pilar soft-card">
                <h3 className="display h-card">{pilar.titulo}</h3>
                <p className="pilar-texto">{pilar.texto}</p>
                <span className="numero pilar-metrica em-alta">{pilar.metrica}</span>
                <span className="pilar-unidade">{pilar.unidade}</span>
              </article>
            ))}
          </div>
        </section>

        {/* 5 ── No seu bolso */}
        <section className="cerca faixa linha-fina">
          <div className="com-celular">
            <div>
              <p className="eyebrow">No seu bolso</p>
              <h2 className="display h-secao mt-4 max-w-[16ch]">Abre, olha, entende. Em três segundos.</h2>

              <ul className="lista-marcada">
                {BOLSO.map((item) => (
                  <li key={item.titulo}>
                    <span className="risco-marca" aria-hidden />
                    <span>
                      <strong>{item.titulo}</strong> {item.texto}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="celular-palco">
              <TelaNoCelular tela="inicio" />
            </div>
          </div>
        </section>

        {/* 5b ── Movimento (aparelho do outro lado) */}
        <section className="cerca faixa linha-fina">
          <div className="com-celular com-celular--invertido">
            <div>
              <p className="eyebrow">Movimento</p>
              <h2 className="display h-secao mt-4 max-w-[17ch]">Você confere. Ele digita.</h2>

              <ul className="lista-marcada">
                <li>
                  <span className="risco-marca" aria-hidden />
                  <span>
                    <strong>Chega pela notificação do banco,</strong> pela foto da nota ou pelo PDF da fatura — e cai
                    numa fila, nunca direto na sua conta.
                  </span>
                </li>
                <li>
                  <span className="risco-marca" aria-hidden />
                  <span>
                    <strong>A categoria vem sugerida.</strong> Corrigiu uma vez, ele não erra de novo naquele
                    estabelecimento.
                  </span>
                </li>
                <li>
                  <span className="risco-marca" aria-hidden />
                  <span>
                    <strong>Transferência não conta como gasto.</strong> Dinheiro que sai da conta e entra na poupança
                    não empobreceu ninguém.
                  </span>
                </li>
              </ul>
            </div>

            <div className="celular-palco">
              <TelaNoCelular tela="movimento" />
            </div>
          </div>
        </section>

        {/* 5c ── Cartões */}
        <section className="cerca faixa linha-fina">
          <div className="com-celular">
            <div>
              <p className="eyebrow">Cartões</p>
              <h2 className="display h-secao mt-4 max-w-[18ch]">A fatura de dezembro já existe hoje.</h2>

              <ul className="lista-marcada">
                <li>
                  <span className="risco-marca" aria-hidden />
                  <span>
                    <strong>Cada mês futuro já tem dono.</strong> O Tino mostra quanto de cada mês está comprometido
                    antes de qualquer gasto novo.
                  </span>
                </li>
                <li>
                  <span className="risco-marca" aria-hidden />
                  <span>
                    <strong>Limite não é dinheiro seu.</strong> Por isso o cartão nunca entra na soma do saldo — só na
                    conta do que você deve.
                  </span>
                </li>
              </ul>
            </div>

            <div className="celular-palco">
              <TelaNoCelular tela="cartoes" />
            </div>
          </div>
        </section>

        {/* 6 ── Como funciona */}
        <section id="como-funciona" className="cerca faixa linha-fina">
          <p className="eyebrow">Como funciona</p>
          <h2 className="display h-secao mt-4 max-w-[16ch]">Três passos, nessa ordem.</h2>

          <div className="passos">
            {PASSOS.map((passo) => (
              <article key={passo.numero} className="passo">
                <p className="passo-numero">{passo.numero}</p>
                <h3 className="passo-titulo">{passo.titulo}</h3>
                <p className="passo-texto">{passo.texto}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 5d ── Plano de pagamento */}
        <section className="cerca faixa linha-fina">
          <div className="com-celular com-celular--invertido">
            <div>
              <p className="eyebrow">Dívidas</p>
              <h2 className="display h-secao mt-4 max-w-[17ch]">A ordem de pagar muda o preço.</h2>

              <ul className="lista-marcada">
                <li>
                  <span className="risco-marca" aria-hidden />
                  <span>
                    <strong>Juro mais alto ou menor saldo?</strong> O Tino faz as duas contas e mostra a diferença em
                    reais, não em teoria.
                  </span>
                </li>
                <li>
                  <span className="risco-marca" aria-hidden />
                  <span>
                    <strong>Com data de fim.</strong> Quantos meses até ficar livre, mantendo o valor que você
                    consegue pagar.
                  </span>
                </li>
              </ul>
            </div>

            <div className="celular-palco">
              <TelaNoCelular tela="plano" />
            </div>
          </div>
        </section>

        {/* 5e ── Loja do MEI */}
        <section className="cerca faixa linha-fina">
          <div className="com-celular">
            <div>
              <p className="eyebrow">Para quem tem loja</p>
              <h2 className="display h-secao mt-4 max-w-[19ch]">
                A maquininha mostra o bruto. O extrato mostra o líquido três semanas depois.
              </h2>

              <ul className="lista-marcada">
                <li>
                  <span className="risco-marca" aria-hidden />
                  <span>
                    <strong>A venda já entra com a taxa e o prazo</strong> da sua maquininha: quanto cai na conta, e em
                    que dia.
                  </span>
                </li>
                <li>
                  <span className="risco-marca" aria-hidden />
                  <span>
                    <strong>Prateleira com margem</strong> por produto. Sem o custo, o app avisa que falta — não
                    inventa número.
                  </span>
                </li>
                <li>
                  <span className="risco-marca" aria-hidden />
                  <span>
                    <strong>O faturamento cai na competência do MEI</strong> sozinho, com o limite anual e o DAS
                    acompanhando.
                  </span>
                </li>
              </ul>
            </div>

            <div className="celular-palco">
              <TelaNoCelular tela="loja" />
            </div>
          </div>
        </section>

        {/* 7 ── Bento de recursos */}
        <section id="recursos" className="cerca faixa linha-fina">
          <p className="eyebrow">Recursos</p>
          <h2 className="display h-secao mt-4 max-w-[16ch]">O que vem junto.</h2>

          <div className="bento">
            {RECURSOS.map((recurso) => (
              <article key={recurso.titulo} className="recurso">
                <h3 className="recurso-titulo">{recurso.titulo}</h3>
                <p className="recurso-texto">{recurso.texto}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 8 ── Preços */}
        <section id="planos" className="cerca faixa linha-fina">
          <p className="eyebrow">Preços</p>
          <h2 className="display h-secao mt-4">{DIAS_DE_TESTE} dias para testar, sem cartão.</h2>

          <div className="planos">
            {PLANOS.map((linha, indice) => {
              const desconto = descontoAnualBps(linha)
              const destaque = indice === PLANOS.length - 1

              return (
                <article key={linha.codigo} className={`plano soft-card ${destaque ? "plano--destaque" : ""}`}>
                  {destaque && <span className="plano-selo">Mais escolhido</span>}

                  <h3 className="display h-card">{linha.nome}</h3>
                  <p className="mt-2 text-[14px] text-[color:var(--creme-2)]">{linha.chamada}</p>

                  <p className="numero plano-preco">
                    {formatarMoeda(linha.mensalCentavos)}
                    <span className="plano-por">por mês</span>
                  </p>
                  <p className="mt-2 text-[13px] text-[color:var(--creme-3)]">
                    ou {formatarMoeda(linha.anualCentavos)} por ano — {formatarPercentual(desconto, 0)} de desconto
                  </p>

                  <ul className="plano-lista">
                    {linha.inclui.map((item) => (
                      <li key={item}>
                        <Check className="mt-0.5 size-4 shrink-0 text-[color:var(--acento)]" aria-hidden />
                        {item}
                      </li>
                    ))}
                    {linha.naoInclui.map((item) => (
                      <li key={item} className="plano-fora">
                        <Minus className="mt-0.5 size-4 shrink-0" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Link href="/cadastro" className="botao mt-8 self-start">
                    Começar o teste
                  </Link>
                </article>
              )
            })}
          </div>

          <p className="mt-8 max-w-[64ch] text-[13px] text-[color:var(--creme-3)]">
            O Tino não é consultor de investimentos nem substitui contador para obrigação fiscal. Ele organiza, projeta
            e mostra a conta com os seus números.
          </p>
        </section>

        {/* 9 ── Dúvidas */}
        <section id="duvidas" className="cerca faixa linha-fina">
          <p className="eyebrow">Dúvidas</p>
          <h2 className="display h-secao mt-4">Antes de você perguntar.</h2>

          <div className="faq">
            {DUVIDAS.map((item) => (
              <details key={item.pergunta}>
                <summary>{item.pergunta}</summary>
                <p>{item.resposta}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 10 ── Fecho e rodapé */}
        <section className="cerca faixa">
          <div className="fecho soft-card">
            <div className="mascote-palco">
              <Porquinho tamanho={128} flutua />
            </div>
            <h2 className="display h-secao mx-auto mt-6 max-w-[15ch]">Descubra sua data antes que ela chegue.</h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/cadastro" className="botao">
                Testar {DIAS_DE_TESTE} dias de graça <ArrowRight className="size-4" />
              </Link>
              <Link href="/login" className="botao botao--fantasma">
                Já tenho conta
              </Link>
            </div>
          </div>
        </section>

        <footer className="cerca rodape">
          <span className="flex items-center gap-2.5">
            <Porquinho tamanho={26} />
            Tino · contador pessoal
          </span>
          <div className="flex gap-5">
            <Link href="/login">Entrar</Link>
            <Link href="/cadastro">Criar conta</Link>
          </div>
        </footer>
      </main>
    </>
  )
}

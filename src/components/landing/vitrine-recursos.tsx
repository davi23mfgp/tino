import { ArrowRight } from "lucide-react"

/**
 * Os quatro blocos embaixo de "Do gasto de hoje ao plano de amanhã".
 *
 * Eram quatro quadrados com gradiente colorido e um ícone de contorno enorme,
 * numerados 01 a 04. O Davi não gostou, e o motivo é o mesmo princípio que
 * manda nas telas de dentro: aquilo era decoração: quatro desenhos genéricos
 * que serviriam para qualquer app de finanças, e nenhum deles mostrava o
 * produto fazendo alguma coisa.
 *
 * Aqui cada bloco carrega um **pedaço de verdade da tela** correspondente —
 * o resultado do mês em barras, a fatura com o prazo, a barra do orçamento
 * estourando, a linha da projeção subindo. Tudo desenhado em CSS e SVG, sem
 * imagem e sem biblioteca: são números da conta de demonstração, os mesmos que
 * aparecem nas capturas logo acima.
 *
 * O verde da marca aparece só no dado — nunca no fundo do cartão inteiro. É a
 * mesma regra do app: o verde diz "isto é seu", não decora.
 */

const RECURSOS = [
  {
    ancora: "visao",
    rotulo: "Seu mês",
    texto: "Entrou, saiu e sobrou. A conta que abre o Tino.",
    arte: <ArteDoMes />,
  },
  {
    ancora: "cartoes",
    rotulo: "Seus cartões",
    texto: "A próxima fatura e as parcelas que já estão marcadas.",
    arte: <ArteDoCartao />,
  },
  {
    ancora: "planejamento",
    rotulo: "Seu orçamento",
    texto: "Quanto do plano já foi, e qual categoria passou.",
    arte: <ArteDoOrcamento />,
  },
  {
    ancora: "planejamento",
    rotulo: "Seu futuro",
    texto: "Onde você chega no ritmo de hoje.",
    arte: <ArteDaProjecao />,
  },
]

export function VitrineRecursos() {
  return (
    <div className="lp-recursos-grade">
      {RECURSOS.map((recurso) => (
        <a key={recurso.rotulo} className="lp-bloco" href={`#${recurso.ancora}`}>
          <div className="lp-bloco-arte">{recurso.arte}</div>
          <h3>
            {recurso.rotulo}
            <ArrowRight size={17} aria-hidden />
          </h3>
          <p>{recurso.texto}</p>
        </a>
      ))}
    </div>
  )
}

/** Resultado do mês: duas barras e a sobra em destaque. */
function ArteDoMes() {
  return (
    <div className="lp-arte-mes">
      <span className="lp-arte-rotulo">Sobrou em setembro</span>
      <strong className="lp-arte-numero">R$ 4.436</strong>
      <div className="lp-arte-barras">
        <i style={{ width: "100%" }} data-tom="entrou" />
        <i style={{ width: "48%" }} data-tom="saiu" />
      </div>
      <div className="lp-arte-legenda">
        <span>entrou 8.600</span>
        <span>saiu 4.164</span>
      </div>
    </div>
  )
}

/** Fatura do cartão: valor, prazo e as parcelas dos próximos meses. */
function ArteDoCartao() {
  return (
    <div className="lp-arte-cartao">
      <span className="lp-arte-rotulo">Próxima fatura</span>
      <strong className="lp-arte-numero">R$ 579,00</strong>
      <span className="lp-arte-pilula">vence em 6 dias</span>
      <div className="lp-arte-meses">
        {[62, 38, 24, 12].map((altura, indice) => (
          <i key={altura} style={{ height: `${altura}%` }} data-aceso={indice === 0} />
        ))}
      </div>
    </div>
  )
}

/** Orçamento: a barra do mês e a categoria que passou do limite. */
function ArteDoOrcamento() {
  return (
    <div className="lp-arte-orcamento">
      <span className="lp-arte-rotulo">Usado do plano</span>
      <strong className="lp-arte-numero">78%</strong>
      <div className="lp-arte-trilho">
        <i style={{ width: "78%" }} />
      </div>
      <div className="lp-arte-linha">
        <span>Mercado</span>
        <b>passou R$ 120</b>
      </div>
    </div>
  )
}

/** Projeção: a linha do saldo e onde ela chega. */
function ArteDaProjecao() {
  return (
    <div className="lp-arte-projecao">
      <span className="lp-arte-rotulo">Em 24 meses</span>
      <strong className="lp-arte-numero">R$ 16.005</strong>
      <svg viewBox="0 0 220 70" preserveAspectRatio="none" aria-hidden className="lp-arte-linha-svg">
        <defs>
          <linearGradient id="lp-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#45f45c" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#45f45c" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 58 L44 52 L88 44 L132 30 L176 22 L220 6 L220 70 L0 70 Z" fill="url(#lp-area)" />
        <path
          d="M0 58 L44 52 L88 44 L132 30 L176 22 L220 6"
          fill="none"
          stroke="#45f45c"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="220" cy="6" r="4" fill="#45f45c" />
      </svg>
    </div>
  )
}

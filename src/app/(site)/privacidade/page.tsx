import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacidade · Tino",
  description: "O que o Tino guarda, por quê, com quem compartilha e como você apaga.",
}

/**
 * Política de privacidade.
 *
 * A estrutura, os fatos técnicos e os direitos são deste documento; o que
 * depende de decisão do Davi está marcado com [A DEFINIR] no próprio texto —
 * é melhor a lacuna aparecer do que ser preenchida com um chute que vira
 * promessa jurídica.
 *
 * O que NÃO é chute e está escrito aqui porque é verdade verificável no código:
 * quais dados o app guarda, quem são os terceiros que recebem alguma coisa
 * (Groq, Vercel, Neon, Stripe/Mercado Pago) e como exercer cada direito.
 */

const SECOES = [
  {
    titulo: "Quem é responsável pelos seus dados",
    conteudo: [
      "O Tino é operado por [A DEFINIR: razão social e CNPJ], com contato em [A DEFINIR: e-mail do encarregado].",
      "A Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018) chama isso de controlador: quem decide o que é feito com seus dados. Para qualquer pedido sobre privacidade, é com esse contato que você fala.",
    ],
  },
  {
    titulo: "O que o Tino guarda",
    conteudo: [
      "Cadastro: seu nome, e-mail e a senha guardada como hash — o Tino não tem como ler sua senha, nem para te ajudar.",
      "Dinheiro: contas, cartões, lançamentos, categorias, orçamentos, metas, dívidas e as simulações que você fez.",
      "Entrada automática: o texto dos avisos de compra que você escolher encaminhar, e o que você escreve ou fala para anotar um gasto.",
      "Uso: data do último acesso e os avisos que o Tino gerou para você.",
      "Se você usa a parte de loja/MEI: produtos, vendas, clientes de fiado e notas emitidas.",
    ],
  },
  {
    titulo: "Para que cada dado serve",
    conteudo: [
      "Executar o que você contratou: mostrar seu saldo, projetar seu mês, avisar antes de a conta vencer. É a base legal do art. 7º, V — execução de contrato.",
      "Cobrar a assinatura, quando houver.",
      "Segurança: contar tentativas de login para barrar ataque de força bruta.",
      "O Tino não vende seus dados, não os usa para anúncio e não os cruza com terceiros para traçar perfil comercial.",
    ],
  },
  {
    titulo: "Quem mais vê alguma coisa",
    conteudo: [
      "Hospedagem e banco: Vercel e Neon, onde o aplicativo roda e os dados ficam guardados — fora do Brasil.",
      "Transcrição de áudio e o assessor: Groq, nos Estados Unidos. Quando você manda um áudio ou pergunta ao assessor, esse conteúdo é enviado para lá para virar texto ou resposta.",
      "Pagamento: Stripe e Mercado Pago recebem o necessário para cobrar. O Tino nunca guarda o número do seu cartão.",
      "Isso é transferência internacional de dados, e a LGPD exige que você saiba: é por isso que está escrito aqui, com nome.",
      "Prazo de guarda: [A DEFINIR: por quanto tempo os dados ficam depois de a conta ser apagada, e o que a obrigação fiscal exige manter].",
    ],
  },
  {
    titulo: "Seus direitos, e onde exercer cada um",
    conteudo: [
      "Saber o que existe e levar embora: em Configurações → Meus dados, você baixa tudo em JSON, num arquivo que serve para importar em outro lugar.",
      "Corrigir: qualquer lançamento, categoria ou dado de cadastro se edita dentro do próprio app.",
      "Apagar: em Configurações → Apagar minha conta. Apaga de verdade — lançamentos, contas, conversas e o restante vão junto, e não há botão de desfazer.",
      "Cobranças já emitidas ficam com o gateway de pagamento, que tem obrigação fiscal própria (LGPD, art. 16, I). Para apagar lá, é preciso falar com eles.",
      "Se algo não for resolvido, você pode reclamar à ANPD, a autoridade nacional.",
    ],
  },
  {
    titulo: "Segurança",
    conteudo: [
      "Senha guardada com bcrypt, nunca em texto. Sessão em cookie httpOnly, que o JavaScript da página não lê.",
      "Tudo trafega por HTTPS, com HSTS.",
      "Limite de tentativas de login, para que ninguém fique testando senha em laço.",
      "Nenhum sistema é inviolável. Se houver incidente com risco relevante, a LGPD manda avisar você e a ANPD — e é o que será feito.",
    ],
  },
  {
    titulo: "Mudanças nesta política",
    conteudo: [
      "Quando algo mudar, a data abaixo muda junto. Mudança que afete seus direitos será avisada dentro do app antes de valer.",
    ],
  },
]

export default function Privacidade() {
  return (
    <main className="lp lp-legal">
      <header>
        <Link href="/" className="lp-legal-voltar">
          ← Tino
        </Link>
        <h1>Privacidade</h1>
        <p>
          O que o Tino guarda, por quê, quem mais vê e como você leva embora ou apaga. Escrito para ser lido, não para
          ser aceito sem ler.
        </p>
        <small>Atualizada em 15 de setembro de 2026.</small>
      </header>

      {SECOES.map((secao) => (
        <section key={secao.titulo}>
          <h2>{secao.titulo}</h2>
          {secao.conteudo.map((paragrafo) => (
            <p key={paragrafo}>{paragrafo}</p>
          ))}
        </section>
      ))}

      <footer>
        <p>
          Dúvida sobre qualquer coisa aqui: <a href="mailto:[A DEFINIR]">[A DEFINIR: e-mail do encarregado]</a>.
        </p>
      </footer>
    </main>
  )
}

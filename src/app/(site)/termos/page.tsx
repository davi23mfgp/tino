import Link from "next/link"
import type { Metadata } from "next"

import { VERSAO_TERMOS } from "@/lib/termos"

export const metadata: Metadata = {
  title: "Termos de Uso · Tino",
  description: "O que o Tino é, o que não é, e as regras de uso, cobrança e cancelamento.",
}

/**
 * Termos de Uso.
 *
 * Mesma regra da política de privacidade: o que depende de decisão do Davi
 * (empresa, CNPJ, endereço, política de reembolso além do mínimo legal) está
 * marcado com [A DEFINIR]. Lacuna visível é melhor do que promessa jurídica
 * inventada. Antes de cobrar de alguém, um advogado precisa ler isto.
 *
 * Três pontos existem aqui por risco concreto, não por formalidade:
 * - "não é consultoria de investimento": a tela Longo prazo e o assessor falam
 *   de divisão de carteira; consultoria de valores mobiliários exige registro
 *   na CVM (Resolução CVM 19/2021). O Tino organiza e explica, não recomenda.
 * - "não é serviço contábil": o assessor se apresenta como quem entende de
 *   contas; escrituração e parecer contábil são privativos de contador com CRC.
 * - arrependimento em 7 dias: contratação pela internet (CDC, art. 49), e
 *   cláusula que tire isso é nula (CDC, art. 51).
 */

const SECOES = [
  {
    titulo: "Quem oferece o Tino",
    conteudo: [
      "O Tino é oferecido por DAVI MARQUES FRANCO DE GODOY PEREIRA (microempreendedor individual), CNPJ 63.443.755/0001-80, com endereço em Travessa Alameda Praia Formosa, 5, Aracaju – SE, e atendimento pelo e-mail davi23mfgp@gmail.com e pela tela Falar com o suporte, dentro do app.",
      "Ao criar a conta você declara que leu e aceita estes termos e a Política de Privacidade. A data e a versão do aceite ficam registradas.",
    ],
  },
  {
    titulo: "O que o Tino é — e o que não é",
    conteudo: [
      "O Tino é uma ferramenta para organizar o próprio dinheiro: anotar gastos, acompanhar contas, projetar o mês, planejar o pagamento de dívidas e juntar para metas.",
      "Não é consultoria de investimentos. Nada no Tino é recomendação para comprar, vender ou manter um ativo. As telas de longo prazo mostram contas e referências gerais; a decisão é sua. Para recomendação personalizada, procure um consultor registrado na CVM.",
      "Não é serviço de contabilidade. O assessor explica números e conceitos, mas não substitui um contador registrado no CRC, nem faz escrituração ou declaração de imposto por você.",
      "Não é banco nem instituição de pagamento. O Tino não guarda, não movimenta e não empresta dinheiro.",
      "Os cálculos usam os dados que você cadastrou. Se um dado estiver faltando ou errado, o resultado também estará — por isso o Tino avisa quando falta informação em vez de inventar um número.",
    ],
  },
  {
    titulo: "Sua conta",
    conteudo: [
      "Para criar uma conta é preciso ter 18 anos ou mais.",
      "Você é responsável por manter a senha em segredo e pelo que for feito com a sua conta. Se desconfiar de acesso indevido, fale com o suporte na hora: as sessões abertas podem ser derrubadas.",
      "Pessoas que você adiciona ao lar (cônjuge, dependentes, convidados, funcionários da loja) acessam o que o papel delas permite. Ao cadastrar um dependente menor de idade, você declara ser o responsável legal por ele (LGPD, art. 14).",
    ],
  },
  {
    titulo: "Dados de outras pessoas que você cadastra",
    conteudo: [
      "Clientes do fiado, funcionários da loja e membros do lar são dados de terceiros. Sobre eles, quem decide o uso é você: para a LGPD, você é o controlador e o Tino é o operador, que trata esses dados só para executar o serviço, seguindo suas instruções.",
      "Cadastre apenas o necessário e tenha uma base legal para isso — por exemplo, a própria venda a prazo, no caso do fiado.",
    ],
  },
  {
    titulo: "Uso permitido",
    conteudo: [
      "Não é permitido: tentar acessar dados de outra conta; burlar limites de uso, de acesso ou de cobrança; automatizar requisições em volume que prejudique o serviço; copiar ou revender o Tino; usar o Tino para atividade ilícita, inclusive ocultação de patrimônio ou lavagem de dinheiro.",
      "Conta usada assim pode ser suspensa. Salvo em caso de fraude ou ordem legal, você é avisado antes e pode exportar seus dados.",
    ],
  },
  {
    titulo: "Plano, cobrança e cancelamento",
    conteudo: [
      "O período de teste, os preços e o que cada plano inclui aparecem na tela Assinatura antes de você contratar. A cobrança é recorrente até você cancelar e é processada pelo Stripe ou pelo Mercado Pago.",
      "Arrependimento: em até 7 dias da primeira contratação paga, você pode desistir e receber de volta tudo o que pagou (Código de Defesa do Consumidor, art. 49).",
      "Cancelamento: a qualquer momento, na tela Assinatura, sem multa. O acesso continua até o fim do período já pago. [A DEFINIR: reembolso proporcional depois dos 7 dias — sim ou não.]",
      "Mudança de preço é avisada com pelo menos 30 dias de antecedência e só vale a partir da cobrança seguinte.",
      "Com a assinatura vencida, você continua vendo e exportando seus dados; só a criação de lançamentos novos fica pausada.",
    ],
  },
  {
    titulo: "Integrações com outros serviços",
    conteudo: [
      "WhatsApp, Telegram, o aviso de compra do seu banco e o envio de faturas por e-mail são opcionais. Ao ligar uma integração, você também usa o serviço de outra empresa, sujeito aos termos dela.",
      "Nota fiscal do MEI: o Tino envia os dados ao emissor, mas a obrigação fiscal é do contribuinte. Confira a nota emitida.",
    ],
  },
  {
    titulo: "Disponibilidade e responsabilidade",
    conteudo: [
      "O Tino é mantido com cuidado, mas pode ficar fora do ar para manutenção ou por falha de fornecedores. Parada programada é avisada com antecedência.",
      "O Tino não garante resultado financeiro: pagar uma dívida antes, atingir uma meta ou economizar depende das suas decisões. Isso não afasta a responsabilidade do Tino por falha do próprio serviço, nos termos do Código de Defesa do Consumidor.",
    ],
  },
  {
    titulo: "Seus dados ao sair",
    conteudo: [
      "Você pode exportar tudo e apagar a conta quando quiser, em Configurações → Meus dados. Os detalhes estão na Política de Privacidade.",
    ],
  },
  {
    titulo: "Mudanças nestes termos",
    conteudo: [
      "Mudança que afete seus direitos ou obrigações é avisada dentro do app antes de valer, e pede novo aceite. Se não concordar, você pode cancelar e exportar seus dados.",
    ],
  },
  {
    titulo: "Lei e foro",
    conteudo: [
      "Vale a lei brasileira. Qualquer disputa pode ser levada ao foro da sua cidade (Código de Defesa do Consumidor, art. 101). Antes disso, fale com o suporte: a maior parte se resolve ali.",
    ],
  },
]

export default function Termos() {
  const [ano, mes, dia] = VERSAO_TERMOS.split("-").map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, dia)).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })

  return (
    <main className="lp lp-legal">
      <header>
        <Link href="/" className="lp-legal-voltar">
          ← Tino
        </Link>
        <h1>Termos de Uso</h1>
        <p>O que o Tino é, o que não é, e as regras de uso, cobrança e cancelamento.</p>
        <small>Versão de {data}.</small>
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
          Veja também a <Link href="/privacidade">Política de Privacidade</Link>.
        </p>
      </footer>
    </main>
  )
}

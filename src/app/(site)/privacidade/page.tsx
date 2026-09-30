import Link from "next/link"
import type { Metadata } from "next"
import { VERSAO_TERMOS } from "@/lib/termos"

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
 * e como exercer cada direito. A lista de terceiros foi conferida contra os
 * endereços que o código chama em 29/09/2026 — ao ligar integração nova,
 * atualize a seção "Quem mais vê alguma coisa" e suba `VERSAO_TERMOS`.
 */

const SECOES = [
  {
    titulo: "Sua vida financeira é privada",
    conteudo: [
      "O Tino organiza as informações que você cadastra para mostrar suas contas, projeções e metas. O painel administrativo não oferece consulta aos seus saldos, gastos, dívidas, investimentos ou conversas com o assistente.",
      "O suporte acessa cadastro, situação da assinatura, mensagens que você envia ao atendimento e informações técnicas necessárias para resolver problemas. Abrir a ficha de atendimento gera um registro de auditoria. Os valores da assinatura são cobranças pelo uso do Tino, não os valores da sua vida financeira.",
      "Sua senha não é armazenada em texto legível: fica um hash bcrypt, usado para conferir o login. O painel administrativo não exibe a senha nem seu hash. Se você entra pelo Google, o Tino não recebe sua senha do Google.",
      "Limite atual da proteção: o Tino ainda não utiliza criptografia de ponta a ponta para os dados financeiros. O servidor processa essas informações para executar as funções do app, e acesso técnico privilegiado à infraestrutura pode permitir sua leitura. A ausência desses dados no painel administrativo não torna o banco ilegível para quem tiver esse acesso.",
      "Acesso técnico a dados pessoais deve se limitar ao necessário para operação, segurança, atendimento de uma solicitação ou cumprimento de obrigação legal. Seus registros financeiros não são destinados a acompanhamento pessoal pelo administrador, publicidade ou venda de dados.",
    ],
  },
  {
    titulo: "Quem é responsável pelos seus dados",
    conteudo: [
      "O Tino é operado por DAVI MARQUES FRANCO DE GODOY PEREIRA (microempreendedor individual), CNPJ 63.443.755/0001-80, com endereço em Travessa Alameda Praia Formosa, 5, Aracaju – SE. O encarregado pelo tratamento de dados pessoais (DPO) atende pelo e-mail davi23mfgp@gmail.com.",
      "A Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018) chama isso de controlador: quem decide o que é feito com seus dados. Para qualquer pedido sobre privacidade, é com esse contato que você fala.",
    ],
  },
  {
    titulo: "O que o Tino guarda",
    conteudo: [
      "Cadastro: seu nome, e-mail, foto de perfil, quando informada, e o hash da senha para contas com senha. Não guardamos a senha em texto legível e o suporte não pode consultar a senha original.",
      "Dinheiro: contas, cartões, lançamentos, categorias, orçamentos, metas, dívidas e as simulações que você fez.",
      "Entrada automática: o texto dos avisos de compra que você escolher encaminhar, e o que você escreve ou fala para anotar um gasto.",
      "Uso: data do último acesso e os avisos que o Tino gerou para você.",
      "Registro de acesso: data, hora e endereço IP de cada entrada na conta, guardados por 6 meses porque o Marco Civil da Internet (Lei 12.965/2014, art. 15) obriga. Ficam em sigilo e só saem por ordem judicial.",
      "Se você usa a parte de loja/MEI: produtos, vendas, clientes de fiado e notas emitidas.",
      "Suporte: as mensagens que você manda pelo app e as respostas, com a tela em que você estava.",
      "Erros: quando algo quebra, registramos informações técnicas, como mensagem, tela e identificador da conta. O registro não coleta deliberadamente o formulário nem os saldos. Há filtros para remover padrões de e-mail, CPF, CNPJ, telefone e credenciais das mensagens; esses filtros reduzem a exposição, mas não garantem a remoção de todo dado pessoal que possa aparecer em um erro.",
    ],
  },
  {
    titulo: "Para que cada dado serve",
    conteudo: [
      "Executar o que você contratou: mostrar seu saldo, projetar seu mês, avisar antes de a conta vencer. É a base legal do art. 7º, V: execução de contrato.",
      "Cobrar a assinatura, quando houver.",
      "Segurança: contar tentativas de login e de uso para barrar ataque e abuso. Base legal do art. 7º, IX (legítimo interesse), limitada ao necessário.",
      "Corrigir defeitos e responder o suporte: o registro de erros e os chamados. Também é legítimo interesse (art. 7º, IX).",
      "Cumprir a lei: registro de acesso (Marco Civil) e o que a obrigação fiscal exigir (art. 7º, II).",
      "O Tino não vende seus dados, não os usa para anúncio e não os cruza com terceiros para traçar perfil comercial.",
    ],
  },
  {
    titulo: "Quem mais vê alguma coisa",
    conteudo: [
      "Hospedagem e banco: Vercel e Neon mantêm a infraestrutura do aplicativo. A localização do processamento depende das regiões contratadas, e esses fornecedores podem realizar operações no exterior. A localização e as condições de proteção devem ser verificadas na configuração e nos contratos dos serviços.",
      "Transcrição de áudio e o assessor: Groq e Anthropic, nos Estados Unidos. Quando você manda um áudio ou pergunta ao assessor, esse conteúdo, com os números da sua conta necessários para a resposta, é enviado para lá para virar texto ou resposta.",
      "Identificar a loja de cada compra (para mostrar o logo): uma vez por dia, textos de compra no cartão que o Tino não reconheceu vão para Groq ou Anthropic, nos Estados Unidos. Vai só o texto como o banco escreve, misturado com o de outras contas, sem valor, sem data e sem dizer de quem é. O logo em si é buscado pelo servidor no serviço de ícones do Google ou do DuckDuckGo, que recebem só o endereço do site da loja.",
      "Importação de fatura: Groq, nos Estados Unidos. Os nomes das lojas que o Tino não soube categorizar sozinho vão para lá, para sugerir a categoria. Transferências e Pix para pessoas não vão. Se a leitura automática de uma fatura em PDF não fechar com o total do banco, as linhas da fatura com data ou valor vão para uma releitura, com CPF e CEP apagados antes do envio. Sem a chave do Groq configurada, nada disso é enviado.",
      "Se você ligar: Telegram recebe as mensagens trocadas com o Tino por esse canal; Resend recebe as faturas que você encaminhar por e-mail; Focus NFe recebe os dados da venda para emitir a nota do MEI.",
      "Notificações no celular passam pelo serviço de push do navegador (Google, Apple ou Mozilla), que recebe só o aviso, não seus lançamentos.",
      "Pagamento: Stripe e Mercado Pago recebem o necessário para cobrar. O Tino nunca guarda o número do seu cartão.",
      "O atendimento lê as mensagens e os arquivos ou valores que você decidir incluir em um chamado. Evite enviar senhas, códigos de autenticação e faturas completas quando uma descrição do problema for suficiente. Pelo contato de privacidade, você pode solicitar informações sobre acessos administrativos registrados. Esses registros documentam a abertura de fichas no app; não são um histórico completo de acessos diretos à infraestrutura.",
      "Isso é transferência internacional de dados, e a LGPD exige que você saiba: é por isso que está escrito aqui, com nome.",
      "Prazo de guarda: os dados necessários ao serviço ficam enquanto a conta existir. A exclusão remove sua conta da base ativa. Se você for a última pessoa do lar, os registros financeiros desse lar também são excluídos; se houver outros usuários, os dados compartilhados permanecem disponíveis a eles. Registros de acesso permanecem pelo prazo legal de 6 meses. Registros técnicos e de auditoria podem permanecer na medida necessária à segurança e à prestação de contas. Provedores de pagamento têm suas próprias obrigações de guarda. O prazo das cópias de segurança do banco ainda precisa ser confirmado; não prometemos exclusão imediata dessas cópias.",
    ],
  },
  {
    titulo: "Seus direitos, e onde exercer cada um",
    conteudo: [
      "Consultar e levar seus dados: em Configurações → Meus dados, você pode baixar um arquivo JSON com cadastro e registros financeiros cobertos pela exportação. Para informações que não estejam nesse arquivo, solicite acesso pelo contato de privacidade. Credenciais e segredos de acesso não são incluídos na exportação.",
      "Corrigir: qualquer lançamento, categoria ou dado de cadastro se edita dentro do próprio app.",
      "Excluir sua conta: em Configurações → Apagar minha conta. Não há botão de desfazer. Quando há outros usuários no lar, os registros compartilhados permanecem para eles; a exclusão do último usuário remove também o lar e seus registros da base ativa. Para pedidos sobre dados pessoais que permaneçam em registros compartilhados, fale com o contato de privacidade.",
      "Cobranças já emitidas ficam com o gateway de pagamento, que tem obrigação fiscal própria (LGPD, art. 16, I). Para apagar lá, é preciso falar com eles.",
      "Qualquer outro pedido (confirmar se tratamos seus dados, saber com quem compartilhamos, revogar consentimento, saber quem acessou sua conta) vai para o e-mail do encarregado, e a resposta sai em até 15 dias (LGPD, art. 19).",
      "Se algo não for resolvido, você pode reclamar à ANPD, a autoridade nacional.",
    ],
  },
  {
    titulo: "Segurança",
    conteudo: [
      "Senha guardada com bcrypt, nunca em texto. Sessão em cookie httpOnly, que o JavaScript da página não lê.",
      "Tudo trafega por HTTPS, com HSTS.",
      "Limite de tentativas de login e de uso, para que ninguém fique testando senha ou varrendo a API em laço.",
      "O servidor confere a sessão, as permissões e o vínculo com o lar para restringir o acesso aos dados autorizados. Ser administrador do produto não concede automaticamente participação no seu lar.",
      "Usamos cookies necessários à sessão, à segurança do login com Google e ao fluxo de convites. O Tino não utiliza cookies de publicidade.",
      "Nenhum sistema é inviolável. Se houver incidente com risco relevante, a LGPD manda avisar você e a ANPD, e é o que será feito.",
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
          Seus valores não aparecem no painel administrativo. Entenda como protegemos sua senha, quais dados o
          serviço processa e quais são os limites atuais dessa proteção.
        </p>
        <small>
          Atualizada em{" "}
          {new Date(`${VERSAO_TERMOS}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}.
        </small>
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
          Dúvida sobre qualquer coisa aqui: <a href="mailto:davi23mfgp@gmail.com">davi23mfgp@gmail.com</a>.
        </p>
      </footer>
    </main>
  )
}

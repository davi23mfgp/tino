import { cn } from "@/lib/utils"

/**
 * A entrada da pessoa numa seção do app.
 *
 * Desenho aprovado pelo Davi na calculadora de reserva, e adotado como o
 * começo de toda tela: um rótulo pequeno diz de que assunto se trata, uma
 * frase grande responde a pergunta daquela seção com o número dentro dela — e
 * só depois vêm as perguntas que guiam o resto.
 *
 * A ordem importa: primeiro a pessoa sabe onde está, depois o app pede
 * informação. O contrário — formulário primeiro, resposta depois — faz
 * preencher campo sem saber para quê.
 *
 * O destaque em verde é para o pedaço da frase que muda com os dados dela
 * ("6 meses", "R$ 1.200"), nunca para a frase inteira: o verde marca o que é
 * seu, não decora o texto.
 */
export function Abertura({
  rotulo,
  titulo,
  apoio,
  children,
  className,
}: {
  /// Assunto da seção, em caixa alta e pequeno. Duas ou três palavras.
  rotulo: string
  /// A resposta, em tamanho de manchete. Use <em> no valor que vem dos dados.
  titulo: React.ReactNode
  /// Uma linha de contexto, quando o número sozinho não basta. Opcional.
  apoio?: React.ReactNode
  /// As perguntas ou controles que guiam a pessoa a partir daqui.
  children?: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("app-abertura", className)}>
      <p className="app-abertura-rotulo">{rotulo}</p>
      <h2 className="app-abertura-titulo">{titulo}</h2>
      {apoio && <p className="app-abertura-apoio">{apoio}</p>}
      {children && <div className="app-abertura-guia">{children}</div>}
    </section>
  )
}

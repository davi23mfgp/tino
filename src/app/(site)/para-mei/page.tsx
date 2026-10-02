import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, Plus, Package, ReceiptText, Banknote, Store } from "lucide-react"
import { Leao } from "../leao"
import { Abertura, BotaoVivo, EmSequencia } from "@/components/landing/entrada"
import { Revelar } from "@/components/landing/movimento"
import { DemonstracaoSistema, PreviaAtual } from "@/components/landing/demonstracao-sistema"
import { Precos } from "@/components/landing/precos"
import { diasDeTesteVigentes, planosVigentes } from "@/lib/parametros"

export const revalidate = 300
export const metadata: Metadata = { title: "Tino MEI · Seu negócio, no controle.", description: "Venda no balcão, acompanhe estoque e fiado e feche o caixa. Um espaço para o seu negócio, com cadastro e acesso próprios." }
const RECURSOS = [
  { Icone: Store, nome: "Balcão", texto: "Registre a venda e como recebeu." },
  { Icone: Package, nome: "Estoque", texto: "Veja quantidade, custo e margem." },
  { Icone: ReceiptText, nome: "Fiado", texto: "Acompanhe quem deve e o que recebeu." },
  { Icone: Banknote, nome: "Caixa", texto: "Confira o dia antes de fechar." },
]
const DUVIDAS = [
  ["Este é o mesmo acesso das finanças pessoais?", "O Tino MEI tem uma entrada própria para o negócio. O cadastro começa pela loja e o login abre a operação do negócio. A autenticação continua protegida pelo Tino."],
  ["Preciso cadastrar todos os produtos para vender?", "Não. Você pode começar pelo valor da venda e pela forma de pagamento. Produtos cadastrados ajudam a acompanhar o estoque."],
  ["O Tino emite nota fiscal?", "Não. Emissão de nota fiscal e integração com maquininhas não estão incluídas neste plano."],
  ["O Tino substitui o contador?", "Não. O Tino organiza vendas e valores e acompanha o limite do MEI e o DAS. Obrigações que exigem um profissional continuam com seu contador."],
]
function ComecarMei() { return <BotaoVivo><Link href="/cadastro/mei" className="lp-botao">Começar meu negócio <ArrowRight size={16} aria-hidden /></Link></BotaoVivo> }
export default async function LandingMei() {
  const [planos, dias] = await Promise.all([planosVigentes(), diasDeTesteVigentes()])
  return <div className="lp lp-mei">
    <a href="#conteudo-mei" className="lp-pular">Pular para o conteúdo</a>
    <header className="lp-menu"><Link href="/para-mei" className="lp-marca"><Leao tamanho={38} /><span>tino+</span></Link><nav aria-label="Navegação MEI"><Link href="/">Para você</Link><a href="#recursos">Recursos</a><a href="#planos">Preços</a><a href="#duvidas">Dúvidas</a></nav><Link href="/login/mei" className="lp-botao lp-entrar">Entrar MEI</Link></header>
    <main id="conteudo-mei">
      <section className="lp-hero"><div className="lp-hero-texto"><Abertura><span className="lp-hero-selo"><span aria-hidden /> Tino para quem empreende.</span></Abertura><Abertura atraso={0.08}><h1>Seu negócio.<br /><span>No seu controle.</span></h1></Abertura><Abertura atraso={0.16}><p>Venda, receba e acompanhe.<br />Do balcão ao fechamento do caixa.</p></Abertura><Abertura atraso={0.24}><div className="lp-hero-acoes"><ComecarMei /><a className="lp-hero-ver" href="#demonstracao">Conhecer por dentro <ArrowRight size={16} /></a></div></Abertura></div><DemonstracaoSistema modoMei /></section>
      <section id="recursos" className="lp-secao"><Revelar className="lp-central"><h2>A rotina anda.<br />O Tino acompanha.</h2><p>As ferramentas do seu negócio no mesmo lugar.</p></Revelar><EmSequencia className="lp-passos lp-passos-mei">{RECURSOS.map(({ Icone, nome, texto }) => <div key={nome}><Icone size={26} strokeWidth={1.5} /><h3>{nome}</h3><p>{texto}</p></div>)}</EmSequencia></section>
      <section className="lp-secao lp-alternada"><Revelar className="lp-secao-texto"><h2>O que vende.<br />O que precisa repor.</h2><p>Quantidade, custo médio e margem por produto. Veja sua prateleira antes de comprar mais.</p><ComecarMei /></Revelar><Revelar className="lp-previa-secao"><PreviaAtual tela="estoque" /></Revelar></section>
      <section className="lp-secao lp-alternada lp-invertida"><Revelar className="lp-secao-texto"><h2>O fiado organizado.<br />O caixa conferido.</h2><p>Saiba quem deve e registre cada recebimento. No fim do dia, compare o dinheiro contado com o valor esperado.</p><ComecarMei /></Revelar><Revelar className="lp-previa-secao"><PreviaAtual tela="fiado" /></Revelar></section>
      <section className="lp-secao lp-negocio"><Revelar className="lp-negocio-conteudo"><span className="lp-tag">MEI acompanhado</span><h2>Seu faturamento.<br />Seu limite. Seu DAS.</h2><p>Acompanhe o negócio sem redigitar as vendas.<br />Organização para o dia a dia, junto do seu contador.</p><div className="lp-chips"><span>Limite anual</span><span>DAS</span><span>Contas a pagar</span><span>Resultado da loja</span></div></Revelar></section>
      <section id="planos" className="lp-secao lp-precos"><Revelar className="lp-central"><h2>Um plano para<br />o seu negócio.</h2><p>{dias} dias para experimentar. Sem cartão para começar.</p></Revelar><Precos planos={planos.filter((plano) => plano.codigo === "loja")} dias={dias} modoMei /></section>
      <section id="duvidas" className="lp-secao lp-duvidas"><div><span className="lp-tag">Antes de começar</span><h2>Sem complicar.</h2></div><EmSequencia>{DUVIDAS.map(([pergunta, resposta]) => <details key={pergunta}><summary>{pergunta}<Plus size={19} aria-hidden /></summary><p>{resposta}</p></details>)}</EmSequencia></section>
      <section className="lp-secao lp-final"><Revelar><Leao tamanho={110} /><h2>Mais tino no negócio.<br />Mais clareza no dia.</h2><ComecarMei /></Revelar></section>
    </main>
    <footer className="lp-secao lp-rodape"><Link href="/para-mei" className="lp-marca"><Leao tamanho={38} /><span>tino+</span></Link><p>Seu negócio, no controle.</p><nav aria-label="Rodapé MEI"><Link href="/">Finanças pessoais</Link><Link href="/login/mei">Entrar MEI</Link><Link href="/termos">Termos</Link><Link href="/privacidade">Privacidade</Link></nav><small>© {new Date().getFullYear()} Tino</small></footer>
  </div>
}

import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, Plus, Wallet, CreditCard, ScanLine, CalendarDays, Store, SlidersHorizontal, Smartphone, TrendingUp } from "lucide-react"
import { diasDeTesteVigentes, planosVigentes } from "@/lib/parametros"
import { Leao } from "./leao"
import { Revelar } from "@/components/landing/movimento"
import { DemonstracaoReal } from "@/components/landing/demonstracao-real"
import { Precos } from "@/components/landing/precos"
import { VitrineRecursos } from "@/components/landing/vitrine-recursos"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Tino — Seu dinheiro, mais simples.",
  description: "Contas, cartões, orçamento e planos em um só lugar. Entenda seu dinheiro e encontre seu próximo passo com o Tino.",
  openGraph: { title: "Tino — Seu dinheiro, mais simples.", description: "Clareza para hoje. Um plano para o que vem depois.", type: "website", locale: "pt_BR", siteName: "Tino" },
}
const PASSOS = [
  { Icone: Wallet, titulo: "Cadastre sua conta", texto: "Comece pelo saldo que você tem hoje." },
  { Icone: ScanLine, titulo: "Traga seus movimentos", texto: "Anote ou importe. Confira antes de confirmar." },
  { Icone: TrendingUp, titulo: "Encontre seu próximo passo", texto: "Acompanhe o mês e planeje o que vem depois." },
]
const FAQ = [
  ["Como começo a usar o Tino?", "Crie sua conta, cadastre uma conta financeira e informe o saldo inicial. Depois, registre seus gastos ou importe um extrato e confira os lançamentos."],
  ["Preciso conectar meu banco?", "Não. Você pode registrar seus movimentos e importar extratos. As opções de conexão dependem da disponibilidade da integração dentro do app."],
  ["Funciona no celular e no computador?", "Sim. O Tino funciona pelo navegador e adapta a interface à sua tela. Use a mesma conta para acessar seus dados nos dois."],
  ["O que aparece nas demonstrações?", "São capturas da interface real do Tino usando a conta de demonstração. Os valores são exemplos; sua conta mostra os seus próprios lançamentos."],
  ["Também posso organizar minha loja?", "Sim. O plano Meu dinheiro e minha loja inclui vendas, estoque, fiado e acompanhamento do MEI, com as contas da loja separadas das de casa."],
  ["O Tino substitui um contador?", "O Tino ajuda a organizar suas finanças e acompanhar o negócio. Obrigações que exigem um profissional continuam com seu contador."],
]
function Comecar({ texto = "Começar agora" }: { texto?: string }) {
  return <Link href="/cadastro" className="lp-botao">{texto}<ArrowRight size={16} aria-hidden /></Link>
}
export default async function Vitrine() {
  const [planos, dias] = await Promise.all([planosVigentes(), diasDeTesteVigentes()])
  return <div className="lp">
    <a href="#conteudo" className="lp-pular">Pular para o conteúdo</a>
    <header className="lp-menu">
      <Link href="/" className="lp-marca" aria-label="Tino — início"><Leao tamanho={38} /><span>tino.</span></Link>
      <nav aria-label="Navegação da página"><a href="#recursos">Recursos</a><a href="#vantagens">Vantagens</a><a href="#planos">Preços</a><a href="#duvidas">Dúvidas</a></nav>
      <Link href="/login" className="lp-botao lp-entrar">Entrar</Link>
    </header>
    <main id="conteudo">
      <section className="lp-hero">
        <div className="lp-hero-texto"><h1>Seu dinheiro organizado.<br />Sua vida com espaço<br />para acontecer.</h1><p>Contas, cartões e planos em um só lugar.<br />Entenda como você está e o que fazer a seguir.</p><Comecar /><small>{dias} dias para conhecer. Sem cartão para começar.</small></div>
        <DemonstracaoReal />
        <div className="lp-confianca"><span><Wallet size={18} /> Contas e cartões juntos</span><span><ScanLine size={18} /> Importação de extratos</span><span><Smartphone size={18} /> No celular e no computador</span></div>
      </section>
      <section className="lp-secao" id="planejamento"><Revelar className="lp-painel-claro"><div><span className="lp-tag">Planeje o próximo passo</span><h2>Hoje, um plano.<br />Amanhã, mais<br />possibilidades.</h2><p>Veja a projeção do seu saldo. Ajuste o orçamento, acompanhe metas e entenda o efeito das suas escolhas.</p><Comecar texto="Começar meu plano" /></div><div className="lp-tela-projecao"><img src="/demonstracao/projecao-desktop.png" alt="Projeção real do Tino com cenários e evolução do saldo" width={1265} height={712} loading="lazy" /></div></Revelar></section>
      <section className="lp-secao lp-faixa-produto" id="vantagens"><Revelar className="lp-produto-grande"><div className="lp-produto-texto"><span className="lp-tag">Tino para sua vida</span><h2>O dinheiro é seu.<br />A clareza também.</h2><p>Saldo, gastos e compromissos.<br />Uma visão completa para decidir melhor.</p><Comecar /></div><div className="lp-desktop lp-desktop-inclinado"><img src="/demonstracao/inicio-desktop.png" alt="Painel real do Tino: resultado do mês, cartões e compras para conferir" width={1265} height={712} loading="lazy" /></div></Revelar></section>
      <section className="lp-secao lp-alternada" id="visao"><Revelar className="lp-secao-texto"><span className="lp-tag">Seu extrato, organizado</span><h2>Encontre cada gasto.<br />Entenda o todo.</h2><p>Busque lançamentos, filtre por conta ou categoria e veja os totais do período. O detalhe aparece quando você precisa.</p><Comecar texto="Organizar meu dinheiro" /></Revelar><Revelar className="lp-moldura-recurso"><img src="/demonstracao/extrato-desktop.png" alt="Extrato real do Tino com busca, filtros e totais" width={1265} height={712} loading="lazy" /></Revelar></section>
      <section className="lp-secao lp-alternada lp-invertida" id="cartoes"><Revelar className="lp-secao-texto"><span className="lp-tag">Cartões e parcelas</span><h2>A próxima fatura<br />já está no radar.</h2><p>Alterne entre seus cartões, confira compras e acompanhe as parcelas dos próximos meses. Defina seu orçamento total e por categoria.</p><Comecar texto="Conhecer meus cartões" /></Revelar><Revelar className="lp-moldura-recurso lp-cartoes-visual"><img src="/demonstracao/cartoes-desktop.png" alt="Tela real de cartões do Tino: cartões empilhados, fatura e previsão mensal" width={1265} height={712} loading="lazy" /></Revelar></section>
      <section className="lp-secao lp-recursos" id="recursos">
        <Revelar className="lp-cabecalho"><div><h2>Um pouco de tino.<br />Em cada decisão.</h2><p>Do gasto de hoje ao plano de amanhã.<br />As ferramentas certas, no mesmo lugar.</p></div><Comecar /></Revelar>
        <VitrineRecursos />
      </section>
      <section className="lp-secao lp-negocio"><Revelar className="lp-negocio-conteudo"><div className="lp-negocio-simbolo"><Store size={62} strokeWidth={1} /><span>tino<span className="lp-mais">+</span></span></div><span className="lp-tag">Para quem empreende</span><h2>Sua vida e sua loja.<br />Cada uma no seu lugar.</h2><p>Vendas, estoque, fiado e MEI.<br />Acompanhe seu negócio sem misturar as contas de casa.</p><div className="lp-chips"><span>Vendas</span><span>Estoque</span><span>Fiado</span><span>MEI</span></div><Comecar texto="Conhecer o Tino para minha loja" /></Revelar></section>
      <section className="lp-secao lp-comecar"><Revelar className="lp-central"><span className="lp-tag">Simples desde o começo</span><h2>Do primeiro registro<br />à próxima conquista.</h2></Revelar><div className="lp-passos">{PASSOS.map(({ Icone, titulo, texto }, i) => <Revelar key={titulo}><span className="lp-numero">0{i+1}</span><Icone size={26} strokeWidth={1.5} /><h3>{titulo}</h3><p>{texto}</p></Revelar>)}</div></section>
      <section className="lp-secao lp-precos" id="planos"><Revelar className="lp-central"><h2>Um plano para você.<br />E para onde quer chegar.</h2><p>Experimente por {dias} dias. Escolha o que faz sentido para sua rotina.</p></Revelar><Precos planos={planos} dias={dias} /></section>
      <section className="lp-secao lp-duvidas" id="duvidas"><div><span className="lp-tag">Ficou alguma dúvida?</span><h2>Vamos simplificar.</h2></div><div>{FAQ.map(([pergunta,resposta]) => <details key={pergunta}><summary>{pergunta}<Plus size={19} aria-hidden /></summary><p>{resposta}</p></details>)}</div></section>
      <section className="lp-secao lp-final"><Revelar><Leao tamanho={136} /><h2>Mais tino no dinheiro.<br />Mais espaço para a vida.</h2><Comecar texto={`Experimentar por ${dias} dias`} /></Revelar></section>
    </main>
    <footer className="lp-secao lp-rodape"><Link href="/" className="lp-marca"><Leao tamanho={38} /><span>tino.</span></Link><p>Seu dinheiro, mais simples.</p><nav aria-label="Rodapé"><a href="#recursos">Recursos</a><a href="#planos">Preços</a><Link href="/login">Entrar</Link></nav><small>© {new Date().getFullYear()} Tino</small></footer>
  </div>
}

import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, Check, Plus, Wallet, CreditCard, ScanLine, CalendarDays, Store, SlidersHorizontal } from "lucide-react"
import { formatarMoeda } from "@/lib/dinheiro"
import { diasDeTesteVigentes, planosVigentes } from "@/lib/parametros"
import { Porquinho } from "./porquinho"
import { FitaDoTempo } from "./fita-do-tempo"
import { TelaNoCelular } from "./tela-no-celular"
import { PalcoDoProduto, Revelar } from "@/components/landing/movimento"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Tino — Seu dinheiro, mais simples.",
  description: "Entenda seu saldo, acompanhe gastos e veja o que vem pela frente. Seu contador pessoal para pessoa física e MEI.",
  openGraph: { title: "Tino — Seu dinheiro, mais simples.", description: "Contas, cartões e planos. Clareza para decidir o próximo passo.", type: "website", locale: "pt_BR", siteName: "Tino", images: [{url:"/mascote/tino.png",width:1024,height:1024,alt:"Porquinho do Tino"}] },
}
const RECURSOS = [
  {titulo:"Tudo em um lugar.",texto:"Contas e lançamentos organizados para encontrar o que você precisa.",Icone:Wallet},
  {titulo:"A fatura sem susto.",texto:"Acompanhe seus cartões e as parcelas que ainda vão chegar.",Icone:CreditCard},
  {titulo:"Anotou. Conferiu. Pronto.",texto:"Registre com texto ou importe um extrato. Confira antes de confirmar.",Icone:ScanLine},
  {titulo:"Olhe para a frente.",texto:"Contas fixas, metas e projeções para planejar os próximos meses.",Icone:CalendarDays},
  {titulo:"Seu negócio também.",texto:"Vendas, estoque, fiado e acompanhamento do MEI no mesmo app.",Icone:Store},
  {titulo:"Mais, quando precisar.",texto:"Análises e simulações a um toque, sem ocupar seu dia a dia.",Icone:SlidersHorizontal},
]
const PASSOS = [
  ["Comece pelo que tem.", "Cadastre sua conta e o saldo inicial. O resto pode vir depois."],
  ["Traga seus movimentos.", "Anote uma compra ou importe um extrato. Você confere os lançamentos."],
  ["Entenda o próximo passo.", "Veja entradas, saídas e contas a vencer. Planeje no seu ritmo."],
]
const FAQ = [
  ["Preciso entender de finanças?", "Não. Comece por saldo, entradas e saídas. Planejamento e análise ficam em Mais, para quando você quiser explorar."],
  ["É só para quem tem empresa?", "Não. Você pode cuidar apenas do seu dinheiro. Quem tem um negócio encontra loja e MEI no plano correspondente."],
  ["Preciso conectar meu banco?", "Você pode começar cadastrando sua conta e registrando os gastos ou importando um extrato. Conectar o banco é uma opção, conforme a disponibilidade da integração."],
  ["Funciona no celular e no computador?", "Sim. O Tino funciona pelo navegador, com uma interface adaptada a cada tela. Entre com a mesma conta para acessar seus dados."],
  ["Os valores das telas são reais?", "As telas desta página usam dados de demonstração. Dentro do Tino, os resumos e projeções usam os lançamentos da sua conta."],
  ["O Tino substitui meu contador?", "O Tino ajuda a organizar o dinheiro e acompanhar o negócio. Obrigações fiscais que exigem um profissional continuam com seu contador."],
]
const TELAS = [
  {n:"01",titulo:"Seu mês, num olhar.",texto:"O que entrou, o que saiu e o que está por vir. O essencial aparece primeiro.",tela:"inicio" as const},
  {n:"02",titulo:"Cada gasto no lugar.",texto:"Movimentos fáceis de encontrar. Filtros e detalhes só quando você precisa.",tela:"movimento" as const},
  {n:"03",titulo:"Cartão sob controle.",texto:"Fatura e parcelas lado a lado. Veja os compromissos dos próximos meses.",tela:"cartoes" as const},
]
export default async function Vitrine() {
  const [planos, dias] = await Promise.all([planosVigentes(),diasDeTesteVigentes()])
  return <>
    <a href="#conteudo" className="landing-skip">Pular para o conteúdo</a>
    <header className="landing-menu glass-pill">
      <Link href="/" className="landing-brand" aria-label="Tino — início"><Porquinho tamanho={38} /><span>tino.</span></Link>
      <nav aria-label="Seções da página"><a href="#recursos">Recursos</a><a href="#como-funciona">Como funciona</a><a href="#planos">Preços</a><a href="#duvidas">Dúvidas</a></nav>
      <div className="landing-menu-actions"><Link href="/login">Entrar</Link><Link href="/cadastro" className="botao botao--pequeno">Testar {dias} dias <ArrowRight size={15} aria-hidden /></Link></div>
    </header>
    <main id="conteudo">
      <section className="landing-hero cerca">
        <p className="eyebrow">Contador pessoal · pessoa física e MEI</p>
        <h1 className="display">Seu dinheiro tem<br />uma <span>data de virada.</span></h1>
        <p className="landing-lead">Saiba o que sobra hoje.<br />Entenda o que vem amanhã.</p>
        <div className="landing-cta-row"><Link href="/cadastro" className="botao">Testar {dias} dias de graça <ArrowRight size={18} aria-hidden /></Link><a href="#no-seu-bolso" className="landing-secondary">Conhecer o Tino <span aria-hidden>↘</span></a></div>
        <p className="landing-note">Sem cartão para começar. No celular e no computador.</p>
        <PalcoDoProduto />
      </section>
      <section className="landing-manifesto cerca" id="no-seu-bolso">
        <Revelar><p className="eyebrow">Menos planilha. Mais vida.</p><h2 className="display">Abre.<br />Olha.<br /><span className="em-alta">Entende.</span></h2><p>Seu dinheiro não precisa de mais complicação.<br />Precisa de um lugar que faça sentido.</p></Revelar>
      </section>
      <section className="cerca landing-feature-grid" id="recursos" aria-label="O Tino no seu bolso">
        {TELAS.map(item => <Revelar key={item.n} className="landing-feature"><div className="landing-feature-copy"><span className="eyebrow">{item.n} / No seu bolso</span><h3 className="display">{item.titulo}</h3><p>{item.texto}</p></div><div className="landing-feature-phone"><TelaNoCelular tela={item.tela} /></div></Revelar>)}
      </section>
      <p className="landing-demo-note">Telas ilustrativas do Tino com valores de demonstração.</p>
      <section className="cerca landing-future">
        <Revelar><p className="eyebrow">Hoje é um bom começo</p><h2 className="display">Antes do aperto.<br /><span className="em-alta">Depois, com calma.</span></h2><p>Veja como seu saldo pode mudar nos próximos meses. Experimente cenários e decida com mais contexto.</p><Link href="/cadastro" className="landing-text-link">Quero enxergar meu próximo mês <ArrowRight size={18} aria-hidden /></Link></Revelar>
        <Revelar className="landing-chart"><FitaDoTempo /></Revelar>
      </section>
      <section className="cerca landing-steps" id="como-funciona">
        <Revelar><p className="eyebrow">Como funciona</p><h2 className="display">Começar é simples.<br />Continuar também.</h2></Revelar>
        <div className="landing-steps-grid">{PASSOS.map(([titulo,texto],i)=><Revelar key={titulo}><span className="landing-step-number">0{i+1}</span><h3>{titulo}</h3><p>{texto}</p></Revelar>)}</div>
      </section>
      <section className="cerca landing-resources">
        <Revelar><p className="eyebrow">Cresce com você</p><h2 className="display">Simples no começo.<br />Completo quando quiser.</h2></Revelar>
        <div className="landing-bento">{RECURSOS.map(({titulo,texto,Icone})=><Revelar key={titulo}><Icone size={24} aria-hidden /><h3>{titulo}</h3><p>{texto}</p></Revelar>)}</div>
      </section>
      <section className="cerca landing-pricing" id="planos">
        <Revelar className="landing-centered"><p className="eyebrow">Cabe nos seus planos</p><h2 className="display">Clareza para o dinheiro.<br />Inclusive no preço.</h2><p>{dias} dias para conhecer o Tino. Sem cartão para começar.</p></Revelar>
        <div className="planos">{planos.map((plano,i)=><article key={plano.codigo} className={`plano soft-card ${i===planos.length-1 ? "plano--destaque" : ""}`}>
          {i===planos.length-1 && <span className="plano-selo">Para ir além</span>}
          <h3 className="display h-card">{plano.nome}</h3><p className="landing-note">{plano.chamada}</p>
          <p className="numero plano-preco">{formatarMoeda(plano.mensalCentavos)}<span className="plano-por">/mês</span></p>
          <p className="landing-note">ou {formatarMoeda(plano.anualCentavos)} por ano</p>
          <Link href="/cadastro" className="botao">Testar {dias} dias <ArrowRight size={17} aria-hidden /></Link>
          <ul className="plano-lista">{plano.inclui.map(item=><li key={item}><Check size={17} className="em-alta shrink-0" aria-hidden />{item}</li>)}</ul>
          {plano.naoInclui.length > 0 && <p className="landing-note">Não inclui: {plano.naoInclui.join(", ")}.</p>}
        </article>)}</div>
      </section>
      <section className="cerca landing-faq" id="duvidas">
        <div><p className="eyebrow">Sem ponto solto</p><h2 className="display">Dúvidas?<br />Vamos lá.</h2></div>
        <div className="faq">{FAQ.map(([pergunta,resposta])=><details key={pergunta}><summary>{pergunta}<Plus size={20} aria-hidden /></summary><p>{resposta}</p></details>)}</div>
      </section>
      <section className="cerca landing-final"><Revelar><p className="eyebrow">Dê um pouco de tino ao seu dinheiro</p><h2 className="display">A sua virada<br />começa aqui.</h2><Link href="/cadastro" className="botao">Testar {dias} dias de graça <ArrowRight size={18} aria-hidden /></Link><p className="landing-note">Um passo de cada vez. Do seu jeito.</p></Revelar><Porquinho tamanho={270} flutua /></section>
    </main>
    <footer className="cerca landing-footer"><Link href="/" className="landing-brand"><Porquinho tamanho={34} /><span>tino.</span></Link><p>Seu dinheiro, mais simples.</p><nav aria-label="Rodapé"><Link href="/login">Entrar</Link><a href="#planos">Planos</a><a href="#duvidas">Dúvidas</a></nav><small>© {new Date().getFullYear()} Tino</small></footer>
  </>
}
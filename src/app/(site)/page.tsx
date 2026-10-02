import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, Plus, Wallet, ScanLine, Smartphone, TrendingUp, Send, Bell, FileText, MessageCircle } from "lucide-react"
import { diasDeTesteVigentes, planosVigentes } from "@/lib/parametros"
import { Leao } from "./leao"
import { Revelar } from "@/components/landing/movimento"
import { Abertura, BotaoVivo, EmSequencia } from "@/components/landing/entrada"
import { DemonstracaoSistema, PreviaAtual } from "@/components/landing/demonstracao-sistema"
import { Precos } from "@/components/landing/precos"
import { VitrineRecursos } from "@/components/landing/vitrine-recursos"

// A vitrine consultava o banco a cada visita só para ler preço e dias de
// teste — números que mudam por decisão de negócio, não a cada segundo. Agora
// ela é gerada e servida do cache, e se refaz a cada 5 minutos: uma mudança de
// preço no painel do admin aparece aqui sem deploy, e ninguém espera o banco
// para ver a primeira dobra.
export const revalidate = 300
export const metadata: Metadata = {
  title: "Tino · Seu dinheiro, mais simples.",
  description: "Contas, cartões, dívidas e planos em um só lugar. Anote pelo Telegram, confira antes de entrar no saldo e saiba quando fica livre das dívidas.",
  openGraph: { title: "Tino · Seu dinheiro, mais simples.", description: "Clareza para hoje. Um plano para o que vem depois.", type: "website", locale: "pt_BR", siteName: "Tino" },
}
const PASSOS = [
  { Icone: Wallet, titulo: "Cadastre sua conta", texto: "Comece pelo saldo que você tem hoje." },
  { Icone: ScanLine, titulo: "Traga seus movimentos", texto: "Anote ou importe. Confira antes de confirmar." },
  { Icone: TrendingUp, titulo: "Encontre seu próximo passo", texto: "Acompanhe o mês e planeje o que vem depois." },
]
const ANOTAR = [
  { Icone: Send, titulo: "Pelo Telegram", texto: "Escreva, mande um áudio ou a fatura em PDF. Cai na fila para conferir." },
  { Icone: Bell, titulo: "Pelo aviso do banco", texto: "No Android, o aviso de compra vira lançamento na hora. Compra negada fica de fora." },
  { Icone: FileText, titulo: "Importando o extrato", texto: "Extrato e fatura do banco, com a soma conferida contra o total." },
]
const FAQ = [
  ["Como começo a usar o Tino?", "Crie sua conta, cadastre uma conta financeira e informe o saldo inicial. Depois, registre seus gastos ou importe um extrato e confira os lançamentos."],
  ["Preciso conectar meu banco?", "Não. O Tino não se conecta ao banco: você anota o gasto, manda pelo Telegram, encaminha o aviso de compra que o banco manda no celular ou importa o extrato e a fatura em PDF. Nada entra no saldo sem você conferir."],
  ["Como funciona pelo Telegram?", "Você liga o Telegram em Anotar e passa a mandar a compra numa mensagem: por escrito, em áudio ou o arquivo da fatura. Ela cai na fila de conferência do app."],
  ["O assistente decide por mim?", "Não. O assistente Tino responde com os seus números: quanto sobrou, qual dívida pagar primeiro, se um empréstimo cabe no mês. Ele explica e simula, mas não recomenda qual investimento comprar."],
  ["Funciona no celular e no computador?", "Sim. O Tino funciona pelo navegador e adapta a interface à sua tela. Use a mesma conta para acessar seus dados nos dois."],
  ["O que aparece nas demonstrações?", "É uma prévia interativa com dados fictícios e componentes atuais do produto. Sua conta mostra seus próprios lançamentos."],
  ["O Tino também atende MEI?", "Sim. O Tino MEI tem uma página e um acesso próprios, com vendas, estoque, fiado e caixa. Conheça em Para MEI."],
  ["O Tino substitui um contador?", "O Tino ajuda a organizar suas finanças e acompanhar o negócio. Obrigações que exigem um profissional continuam com seu contador."],
]
function Comecar({ texto = "Começar agora" }: { texto?: string }) {
  return <BotaoVivo><Link href="/cadastro" className="lp-botao">{texto}<ArrowRight size={16} aria-hidden /></Link></BotaoVivo>
}
export default async function Vitrine() {
  const [planos, dias] = await Promise.all([planosVigentes(), diasDeTesteVigentes()])
  return <div className="lp">
    <a href="#conteudo" className="lp-pular">Pular para o conteúdo</a>
    <header className="lp-menu">
      <Link href="/" className="lp-marca" aria-label="Início do Tino"><Leao tamanho={38} /><span>tino.</span></Link>
      <nav aria-label="Navegação da página"><Link href="/para-mei">Para MEI</Link><a href="#recursos">Recursos</a><a href="#vantagens">Vantagens</a><a href="#planos">Preços</a><a href="#duvidas">Dúvidas</a></nav>
      <Link href="/login" className="lp-botao lp-entrar">Entrar</Link>
    </header>
    <main id="conteudo">
      <section className="lp-hero">
        <div className="lp-hero-texto">
          <Abertura><span className="lp-hero-selo"><span aria-hidden /> Um pouco de tino muda tudo.</span></Abertura>
          <Abertura atraso={0.08}><h1>Seu dinheiro.<br /><span>Uma nova perspectiva.</span></h1></Abertura>
          <Abertura atraso={0.16}><p>Contas, cartões e planos juntos.<br />Clareza para hoje. Espaço para o que vem depois.</p></Abertura>
          <Abertura atraso={0.24}><div className="lp-hero-acoes"><Comecar texto="Começar meu plano" /><a href="#demonstracao" className="lp-hero-ver">Conhecer o Tino <ArrowRight size={16} aria-hidden /></a></div></Abertura>
        </div>
        <DemonstracaoSistema />
        <EmSequencia className="lp-confianca" passo={0.09}>
          {[<span key="contas"><Wallet size={18} /> Contas e cartões juntos</span>,
            <span key="extratos"><ScanLine size={18} /> Importação de extratos</span>,
            <span key="telegram"><Send size={18} /> Anote pelo Telegram</span>,
            <span key="telas"><Smartphone size={18} /> No celular e no computador</span>]}
        </EmSequencia>
      </section>
      <section className="lp-secao" id="planejamento"><Revelar className="lp-painel-claro"><div><span className="lp-tag">Leia seu mês</span><h2>Seu mês.<br />Mais claro.<br />Mais seu.</h2><p>Veja onde gastou, compare os custos e encontre espaço para os seus planos.</p><Comecar texto="Começar meu plano" /></div><div className="lp-previa-secao"><PreviaAtual tela="analise" /></div></Revelar></section>
      <section className="lp-secao lp-faixa-produto" id="vantagens"><Revelar className="lp-produto-grande"><div className="lp-produto-texto"><h2>O dinheiro é seu.<br />A clareza também.</h2><p>Saldo, gastos e compromissos.<br />Uma visão completa para decidir melhor.</p><Comecar /></div><div className="lp-previa-secao"><PreviaAtual tela="inicio" /></div></Revelar></section>
      <section className="lp-secao lp-alternada" id="visao"><Revelar className="lp-secao-texto"><h2>Encontre cada gasto.<br />Entenda o todo.</h2><p>Busque lançamentos, filtre por conta ou categoria e veja os totais do período. O detalhe aparece quando você precisa.</p><Comecar texto="Organizar meu dinheiro" /></Revelar><Revelar className="lp-moldura-recurso"><PreviaAtual tela="extrato" /></Revelar></section>
      <section className="lp-secao lp-alternada lp-invertida" id="cartoes"><Revelar className="lp-secao-texto"><h2>A próxima fatura<br />já está no radar.</h2><p>Alterne entre seus cartões, confira compras e acompanhe as parcelas dos próximos meses. Defina seu orçamento total e por categoria.</p><Comecar texto="Conhecer meus cartões" /></Revelar><Revelar className="lp-moldura-recurso lp-cartoes-visual"><PreviaAtual tela="cartoes" /></Revelar></section>
      <section className="lp-secao lp-alternada" id="dividas"><Revelar className="lp-secao-texto"><h2>Dívida com<br />data para acabar.</h2><p>Veja quanto cada dívida cobra por mês, qual atacar primeiro e quando fica livre. Antes de pegar um empréstimo, o Tino mostra o custo de verdade e se a parcela cabe no mês.</p><Comecar texto="Organizar minhas dívidas" /></Revelar><Revelar className="lp-moldura-recurso"><PreviaAtual tela="dividas" /></Revelar></section>
      <section className="lp-secao lp-comecar" id="anotar"><Revelar className="lp-central"><h2>Anote do jeito<br />mais fácil para você.</h2><p>Nada entra no saldo sem você conferir: aviso de banco erra, e o Tino sabe disso.</p></Revelar><EmSequencia className="lp-passos" passo={0.1}>
        {ANOTAR.map(({ Icone, titulo, texto }) => (
          <div key={titulo}><Icone size={26} strokeWidth={1.5} /><h3>{titulo}</h3><p>{texto}</p></div>
        ))}
      </EmSequencia></section>
      <section className="lp-secao lp-negocio" id="assistente"><Revelar className="lp-negocio-conteudo"><div className="lp-negocio-simbolo"><MessageCircle size={56} strokeWidth={1} /></div><span className="lp-tag">Seu assistente</span><h2>Pergunte ao Tino.<br />Ele responde com os seus números.</h2><p>Quanto sobrou, qual dívida pagar primeiro, se um empréstimo cabe no mês.<br />Explica e simula; não recomenda qual investimento comprar.</p><div className="lp-chips"><span>Quanto sobrou este mês?</span><span>Qual dívida pago primeiro?</span><span>Um empréstimo de R$ 10 mil cabe?</span></div></Revelar></section>
      <section className="lp-secao lp-recursos" id="recursos">
        <Revelar className="lp-cabecalho"><div><h2>Um pouco de tino.<br />Em cada decisão.</h2><p>Do gasto de hoje ao plano de amanhã.<br />As ferramentas certas, no mesmo lugar.</p></div><Comecar /></Revelar>
        <VitrineRecursos />
      </section>
      <section className="lp-secao lp-comecar"><Revelar className="lp-central"><h2>Do primeiro registro<br />à próxima conquista.</h2></Revelar><EmSequencia className="lp-passos" passo={0.1}>
        {/* Sem "01 02 03": a ordem já está na sequência em que os passos
            entram e na leitura da página. O número era rótulo de enfeite. */}
        {PASSOS.map(({ Icone, titulo, texto }) => (
          <div key={titulo}><Icone size={26} strokeWidth={1.5} /><h3>{titulo}</h3><p>{texto}</p></div>
        ))}
      </EmSequencia></section>
      <section className="lp-secao lp-precos" id="planos"><Revelar className="lp-central"><h2>Um plano para você.<br />E para onde quer chegar.</h2><p>Experimente por {dias} dias, sem cartão para começar. Escolha o plano que faz sentido para sua rotina.</p></Revelar><Precos planos={planos.filter((plano) => plano.codigo === "pessoal")} dias={dias} /></section>
      <section className="lp-secao lp-duvidas" id="duvidas"><div><span className="lp-tag">Ficou alguma dúvida?</span><h2>Vamos simplificar.</h2></div><EmSequencia passo={0.05}>{FAQ.map(([pergunta,resposta]) => <details key={pergunta}><summary>{pergunta}<Plus size={19} aria-hidden /></summary><p>{resposta}</p></details>)}</EmSequencia></section>
      <section className="lp-secao lp-final"><Revelar><Leao tamanho={136} /><h2>Mais tino no dinheiro.<br />Mais espaço para a vida.</h2><Comecar texto={`Experimentar por ${dias} dias`} /></Revelar></section>
    </main>
    <footer className="lp-secao lp-rodape"><Link href="/" className="lp-marca"><Leao tamanho={38} /><span>tino.</span></Link><p>Seu dinheiro, mais simples.</p><nav aria-label="Rodapé"><a href="#recursos">Recursos</a><a href="#planos">Preços</a><Link href="/termos">Termos</Link><Link href="/privacidade">Privacidade</Link><Link href="/login">Entrar</Link><Link href="/para-mei">Tino MEI</Link></nav><small>© {new Date().getFullYear()} Tino</small></footer>
  </div>
}

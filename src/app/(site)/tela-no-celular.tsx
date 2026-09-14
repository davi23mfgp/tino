/** As telas do app dentro do celular da vitrine.
 *
 * É HTML, não print. Print de tela envelhece na primeira mudança de skin e
 * sai borrado em tela densa; o miolo em HTML acompanha os tokens do site e
 * fica nítido em qualquer densidade. Os números são os da conta de
 * demonstração — nunca dados de cliente real.
 *
 * O estilo vive em vitrine.css, no bloco `.cel-*`.
 */
export type QualTela = "inicio" | "movimento" | "cartoes"

const ROTULO: Record<QualTela, string> = {
  inicio: "Tela de início do Tino: resultado do mês, entradas, saídas e gastos por categoria. Dados de demonstração.",
  movimento: "Extrato do Tino: lançamentos do dia com categoria e valor. Dados de demonstração.",
  cartoes: "Cartões do Tino: fatura atual e as parcelas que ainda vêm. Dados de demonstração.",
}

function Sistema() {
  return <div className="cel-sistema" aria-hidden>
    <span>9:41</span>
    <span className="cel-ilha" />
    <span className="cel-bateria" />
  </div>
}

function Barra({ativo}:{ativo:string}) {
  return <nav className="cel-barra" aria-hidden>
    {["Início","Extrato"].map(item=><span key={item} className={`cel-item ${item===ativo?"cel-item--ativo":""}`}><span className="cel-icone"/>{item}</span>)}
    <span className="cel-mais">+</span>
    {["Cartões","Mais"].map(item=><span key={item} className={`cel-item ${item===ativo?"cel-item--ativo":""}`}><span className="cel-icone"/>{item}</span>)}
  </nav>
}

const CATEGORIAS = [
  {nome:"Moradia",valor:"R$ 1.480,00",largura:"100%",cor:"oklch(0.74 0.16 162)"},
  {nome:"Mercado",valor:"R$ 986,00",largura:"67%",cor:"oklch(0.72 0.13 200)"},
  {nome:"Transporte",valor:"R$ 612,00",largura:"41%",cor:"oklch(0.74 0.12 95)"},
  {nome:"Lazer",valor:"R$ 318,00",largura:"21%",cor:"oklch(0.70 0.11 320)"},
]

function Inicio() {
  return <>
    <div className="cel-heroi">
      <p className="cel-marca">TINO</p>
      <p className="cel-ola">Olá, Marina.</p>
      <p className="cel-mes">setembro de 2026</p>
    </div>
    <div className="cel-cartao">
      <p className="cel-rotulo">Resultado do mês</p>
      <p className="cel-numero">R$ 4.436,00</p>
      <p className="cel-apoio">Disponível hoje: R$ 15.166,00</p>
      <span className="cel-botao">Ver o próximo mês</span>
    </div>
    <div className="cel-grade">
      <div className="cel-tile"><p className="cel-tile-rotulo">Entrou</p><p className="cel-tile-valor">R$ 8.600,00</p></div>
      <div className="cel-tile"><p className="cel-tile-rotulo">Saiu</p><p className="cel-tile-valor">R$ 4.164,00</p></div>
    </div>
    <div className="cel-cartao">
      <p className="cel-cartao-titulo">Para onde foi</p>
      <div className="cel-categorias">
        {CATEGORIAS.map(categoria=><div key={categoria.nome}>
          <p className="cel-categoria-topo"><span>{categoria.nome}</span><span className="cel-categoria-valor">{categoria.valor}</span></p>
          <span className="cel-barra-trilho"><span className="cel-barra-preenche" style={{width:categoria.largura,background:categoria.cor}}/></span>
        </div>)}
      </div>
    </div>
    <div className="cel-cartao">
      <p className="cel-cartao-titulo">Ainda este mês</p>
      <div style={{marginTop:6}}>
        {PROXIMAS.map(item=><div key={item.nome} className="cel-linha">
          <span className="cel-bolha" />
          <span className="cel-linha-texto"><b className="cel-linha-nome">{item.nome}</b><small className="cel-linha-nota">{item.nota}</small></span>
          <span className="cel-linha-valor">{item.valor}</span>
        </div>)}
      </div>
    </div>
  </>
}

const PROXIMAS = [
  {nome:"Aluguel",nota:"vence dia 5",valor:"R$ 1.480,00"},
  {nome:"Fatura Platinum",nota:"vence dia 6",valor:"R$ 579,00"},
  {nome:"Internet",nota:"vence dia 12",valor:"R$ 129,90"},
  {nome:"Academia",nota:"vence dia 15",valor:"R$ 119,00"},
]

const LANCAMENTOS = [
  {nome:"Supermercado Real",nota:"Mercado · hoje",valor:"− R$ 186,40"},
  {nome:"Salário",nota:"Entrada · 5 set",valor:"+ R$ 6.200,00"},
  {nome:"Aluguel",nota:"Moradia · 5 set",valor:"− R$ 1.480,00"},
  {nome:"Posto Ipiranga",nota:"Transporte · 4 set",valor:"− R$ 210,00"},
  {nome:"Farmácia São Paulo",nota:"Saúde · 3 set",valor:"− R$ 74,90"},
  {nome:"Cinema",nota:"Lazer · 2 set",valor:"− R$ 68,00"},
  {nome:"Conta de luz",nota:"Moradia · 2 set",valor:"− R$ 187,30"},
  {nome:"Padaria",nota:"Mercado · 1 set",valor:"− R$ 32,50"},
  {nome:"Freela de design",nota:"Entrada · 1 set",valor:"+ R$ 2.400,00"},
]

function Movimento() {
  return <>
    <p className="cel-titulo-tela">Extrato</p>
    <div className="cel-grade">
      <div className="cel-tile"><p className="cel-tile-rotulo">No mês</p><p className="cel-tile-valor">142 itens</p></div>
      <div className="cel-tile"><p className="cel-tile-rotulo">A conferir</p><p className="cel-tile-valor">3</p></div>
    </div>
    <div className="cel-cartao">
      <p className="cel-cartao-titulo">Setembro</p>
      <div style={{marginTop:6}}>
        {LANCAMENTOS.map(item=><div key={item.nome} className="cel-linha">
          <span className="cel-bolha" />
          <span className="cel-linha-texto"><b className="cel-linha-nome">{item.nome}</b><small className="cel-linha-nota">{item.nota}</small></span>
          <span className="cel-linha-valor">{item.valor}</span>
        </div>)}
      </div>
    </div>
  </>
}

const PARCELAS = [
  {nome:"Geladeira",nota:"3 de 10",valor:"R$ 289,90"},
  {nome:"Notebook",nota:"5 de 12",valor:"R$ 416,60"},
  {nome:"Passagem",nota:"1 de 6",valor:"R$ 198,00"},
]

function Cartoes() {
  return <>
    <p className="cel-titulo-tela">Cartões</p>
    <div className="cel-plastico">
      <p className="cel-plastico-nome">Platinum · final 8842</p>
      <p className="cel-plastico-valor">R$ 579,00</p>
      <p className="cel-plastico-rodape"><span>Fecha dia 28</span><span>Vence dia 6</span></p>
    </div>
    <div className="cel-plastico" style={{marginTop:7}}>
      <p className="cel-plastico-nome">Gold · final 3317</p>
      <p className="cel-plastico-valor">R$ 236,40</p>
      <p className="cel-plastico-rodape"><span>Fecha dia 20</span><span>Vence dia 28</span></p>
    </div>
    <div className="cel-grade">
      <div className="cel-tile"><p className="cel-tile-rotulo">Limite livre</p><p className="cel-tile-valor">R$ 7.421,00</p></div>
      <div className="cel-tile"><p className="cel-tile-rotulo">Outubro</p><p className="cel-tile-valor">R$ 1.480,00</p></div>
    </div>
    <div className="cel-cartao">
      <p className="cel-cartao-titulo">Parcelas que ainda vêm</p>
      <div style={{marginTop:6}}>
        {PARCELAS.map(item=><div key={item.nome} className="cel-linha">
          <span className="cel-bolha" />
          <span className="cel-linha-texto"><b className="cel-linha-nome">{item.nome}</b><small className="cel-linha-nota">{item.nota}</small></span>
          <span className="cel-linha-valor">{item.valor}</span>
        </div>)}
      </div>
    </div>
  </>
}

const MIOLO: Record<QualTela, {conteudo:()=>React.JSX.Element;aba:string}> = {
  inicio: {conteudo:Inicio,aba:"Início"},
  movimento: {conteudo:Movimento,aba:"Extrato"},
  cartoes: {conteudo:Cartoes,aba:"Cartões"},
}

export function TelaNoCelular({tela="inicio"}:{tela?:QualTela}) {
  const {conteudo:Conteudo,aba}=MIOLO[tela]
  return <div className="celular" role="img" aria-label={ROTULO[tela]}>
    <div className="celular-tela">
      <Sistema />
      <div className="cel-conteudo"><Conteudo /></div>
      <Barra ativo={aba} />
    </div>
  </div>
}

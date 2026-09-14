/** As telas do app dentro do celular da vitrine.
 *
 * É HTML, não print. Print envelhece na primeira mudança de skin e sai
 * borrado em tela densa; o miolo em HTML acompanha os tokens do site e fica
 * nítido em qualquer densidade.
 *
 * O conteúdo não é inventado: rótulo por rótulo e número por número, veio
 * das telas reais rodando com a conta de demonstração (`demo@tino.local`).
 * Se a tela do app mudar de ordem ou de nome, é esta aqui que fica errada —
 * conferir contra `/painel`, `/transacoes` e `/cartoes` antes de mexer.
 *
 * O estilo vive em vitrine.css, no bloco `.cel-*`.
 */
export type QualTela = "inicio" | "movimento" | "cartoes"

const ROTULO: Record<QualTela, string> = {
  inicio: "Tela de início do Tino: resultado do mês, cartões e faturas, e para onde foi o dinheiro. Dados de demonstração.",
  movimento: "Extrato do Tino: entradas e saídas do mês agrupadas por dia. Dados de demonstração.",
  cartoes: "Cartões do Tino: fatura do mês, limite e as compras que entraram nela. Dados de demonstração.",
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

function Linha({nome,nota,valor,cor}:{nome:string;nota:string;valor:string;cor?:string}) {
  return <div className="cel-linha">
    <span className="cel-bolha" style={cor?{background:cor}:undefined} />
    <span className="cel-linha-texto"><b className="cel-linha-nome">{nome}</b><small className="cel-linha-nota">{nota}</small></span>
    <span className="cel-linha-valor">{valor}</span>
  </div>
}

/* --- Início: a ordem e os rótulos de /painel ------------------- */

const CARTOES_DO_PAINEL = [
  {nome:"Cartão Platinum (final 8842)",nota:"Banco do Brasil · fecha dia 28",fatura:"R$ 579,00",cor:"#f5d20a"},
  {nome:"Cartão Gold (final 3317)",nota:"Nubank · vence dia 10",fatura:"R$ 140,00",cor:"#8a05be"},
]

const PARA_ONDE_FOI = [
  {nome:"Aluguel e condomínio",valor:"R$ 2.025,00",largura:"100%",cor:"oklch(0.74 0.16 162)"},
  {nome:"Educação",valor:"R$ 780,00",largura:"39%",cor:"oklch(0.72 0.13 200)"},
  {nome:"Plano de saúde",valor:"R$ 640,00",largura:"32%",cor:"oklch(0.74 0.12 95)"},
  {nome:"Supermercado",valor:"R$ 326,00",largura:"16%",cor:"oklch(0.70 0.11 320)"},
]

function Inicio() {
  return <>
    <div className="cel-heroi">
      <p className="cel-ola">Olá, Marina.</p>
      <p className="cel-mes">setembro de 2026</p>
    </div>
    <div className="cel-cartao cel-cartao--destaque">
      <p className="cel-rotulo">Resultado de setembro de 2026</p>
      <p className="cel-numero">R$ 4.436,00</p>
      <p className="cel-apoio">Saldo disponível: R$ 15.166,00 · aplicado: R$ 17.500,00</p>
      <div className="cel-trio">
        <span><small className="cel-tile-rotulo">Entrou</small><b className="cel-par-valor cel-par-valor--entra">R$ 8.600,00</b></span>
        <span><small className="cel-tile-rotulo">Saiu</small><b className="cel-par-valor cel-par-valor--sai">R$ 4.164,00</b></span>
        <span><small className="cel-tile-rotulo">Saúde</small><b className="cel-par-valor">76<small>/100</small></b></span>
      </div>
    </div>
    <div className="cel-cartao">
      <p className="cel-rotulo">Crédito</p>
      <p className="cel-cartao-titulo">Cartões e faturas</p>
      <div style={{marginTop:6}}>
        {CARTOES_DO_PAINEL.map(cartao=><Linha key={cartao.nome} nome={cartao.nome} nota={cartao.nota} valor={cartao.fatura} cor={cartao.cor} />)}
      </div>
    </div>
    <div className="cel-cartao">
      <p className="cel-rotulo">Este mês</p>
      <p className="cel-cartao-titulo">Para onde foi</p>
      <p className="cel-apoio">R$ 4.024,00 gasto até hoje</p>
      <div className="cel-categorias">
        {PARA_ONDE_FOI.map(item=><div key={item.nome}>
          <p className="cel-categoria-topo"><span>{item.nome}</span><span className="cel-categoria-valor">{item.valor}</span></p>
          <span className="cel-barra-trilho"><span className="cel-barra-preenche" style={{width:item.largura,background:item.cor}}/></span>
        </div>)}
      </div>
    </div>
  </>
}

/* --- Extrato: a fita da semana e os dias de /transacoes -------- */

const SEMANA: [string, string][] = [["dom","13"],["seg","14"],["ter","15"],["qua","16"],["qui","17"],["sex","18"],["sáb","19"]]

const DIAS = [
  {dia:"10 de setembro",itens:[{nome:"Escola do Téo",nota:"Educação · Conta corrente",valor:"− R$ 780,00"}]},
  {dia:"08 de setembro",itens:[{nome:"Plano de saúde",nota:"Plano de saúde · Conta corrente",valor:"− R$ 640,00"}]},
  {dia:"06 de setembro",itens:[{nome:"Cinema e bar",nota:"Lazer e eventos · Cartão Gold",valor:"− R$ 140,00"}]},
  {dia:"05 de setembro",itens:[
    {nome:"Salário Marina",nota:"Salário · Conta corrente",valor:"+ R$ 5.200,00"},
    {nome:"Salário Rafael",nota:"Salário · Conta corrente",valor:"+ R$ 3.400,00"},
    {nome:"Aluguel",nota:"Aluguel e condomínio · Conta corrente",valor:"− R$ 2.025,00"},
  ]},
  {dia:"03 de setembro",itens:[{nome:"Posto Ipiranga",nota:"Combustível · Cartão Platinum",valor:"− R$ 253,00"}]},
]

function Movimento() {
  return <>
    <p className="cel-titulo-tela">Movimentações</p>
    <div className="cel-semana" aria-hidden>
      {SEMANA.map(([sigla,numero])=><span key={numero} className={`cel-dia ${numero==="17"?"cel-dia--hoje":""}`}><small>{sigla}</small>{numero}</span>)}
    </div>
    <div className="cel-trio">
      <span><small className="cel-tile-rotulo">Entradas</small><b className="cel-par-valor cel-par-valor--entra">R$ 8.600,00</b></span>
      <span><small className="cel-tile-rotulo">Saídas</small><b className="cel-par-valor cel-par-valor--sai">R$ 4.164,00</b></span>
      <span><small className="cel-tile-rotulo">Saldo</small><b className="cel-par-valor">R$ 4.436,00</b></span>
    </div>
    {DIAS.map(grupo=><div key={grupo.dia} className="cel-cartao">
      <p className="cel-rotulo">{grupo.dia}</p>
      <div style={{marginTop:4}}>{grupo.itens.map(item=><Linha key={item.nome} nome={item.nome} nota={item.nota} valor={item.valor} />)}</div>
    </div>)}
  </>
}

/* --- Cartões: a fatura e as compras de /cartoes ---------------- */

const FATURAS = [
  {mes:"jul/26",altura:"38%"},
  {mes:"ago/26",altura:"52%"},
  {mes:"set/26",altura:"70%",atual:true},
  {mes:"out/26",altura:"100%",prevista:true},
  {mes:"nov/26",altura:"44%",prevista:true},
  {mes:"dez/26",altura:"30%",prevista:true},
]

function Cartoes() {
  return <>
    <p className="cel-titulo-tela">Cartões</p>
    <div className="cel-plastico">
      <p className="cel-plastico-nome">Banco do Brasil · Platinum (final 8842)</p>
      <p className="cel-rotulo" style={{marginTop:7}}>Fatura de set/26</p>
      <p className="cel-plastico-valor">R$ 579,00</p>
      <p className="cel-plastico-rodape"><span>Fecha dia 28</span><span>Vence dia 6</span><span>Limite R$ 12.000,00</span></p>
    </div>
    <div className="cel-cartao">
      <p className="cel-cartao-titulo">Faturas por mês</p>
      <div className="cel-colunas" aria-hidden>
        {FATURAS.map(fatura=><span key={fatura.mes} className="cel-coluna">
          <span className={`cel-coluna-barra ${fatura.atual?"cel-coluna-barra--atual":""} ${fatura.prevista?"cel-coluna-barra--prevista":""}`} style={{height:fatura.altura}} />
          <small>{fatura.mes}</small>
        </span>)}
      </div>
      <p className="cel-apoio">Confirmado e previsto</p>
    </div>
    <div className="cel-cartao">
      <p className="cel-cartao-titulo">Compras do mês</p>
      <p className="cel-apoio">2 compras · R$ 579,00</p>
      <div style={{marginTop:4}}>
        <Linha nome="Posto Ipiranga" nota="03/09/2026 · Combustível" valor="R$ 253,00" />
        <Linha nome="Supermercado Pão de Açúcar" nota="02/09/2026 · Supermercado" valor="R$ 326,00" />
      </div>
    </div>
  </>
}

const MIOLO: Record<QualTela, {conteudo:()=>React.JSX.Element;aba:string}> = {
  inicio: {conteudo:Inicio,aba:"Início"},
  movimento: {conteudo:Movimento,aba:"Extrato"},
  cartoes: {conteudo:Cartoes,aba:"Cartões"},
}

export const ORDEM_DAS_TELAS: QualTela[] = ["inicio","movimento","cartoes"]

/** O mesmo celular, com as três telas empilhadas e só uma visível.
 *
 * Empilhadas, e não trocadas, por dois motivos: a troca fica instantânea (o
 * HTML já está montado, nada remonta no meio do scroll) e a altura do
 * aparelho não pula quando uma tela tem mais conteúdo que a outra.
 */
export function TelasEmpilhadas({ativa}:{ativa:QualTela}) {
  return <div className="celular" role="img" aria-label={ROTULO[ativa]}>
    <div className="celular-tela">
      <Sistema />
      <div className="cel-pilha">
        {ORDEM_DAS_TELAS.map(tela=>{
          const {conteudo:Conteudo}=MIOLO[tela]
          return <div key={tela} className={`cel-camada ${tela===ativa?"cel-camada--ativa":""}`} aria-hidden={tela!==ativa}><Conteudo /></div>
        })}
      </div>
      <Barra ativo={MIOLO[ativa].aba} />
    </div>
  </div>
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

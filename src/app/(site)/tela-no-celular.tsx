/**
 * O app dentro de um celular, na vitrine.
 *
 * NÃO é imagem: cada tela é remontada em HTML e CSS, com os mesmos números,
 * a mesma ordem e a mesma anatomia do produto (`docs/SPEC-CALEN-PRECISO.md`,
 * PARTE 4.1 — rótulo de 11px, número grande, quatro números em 2×2, linha de
 * lista com círculo de ícone, barra do polegar com o "+" no meio).
 *
 * Por que não print: print envelhece na primeira mudança de skin, borra em
 * tela retina se não for exportado em 3x, e pesa. Remontado fica nítido em
 * qualquer densidade, acompanha o tema e é o mesmo desenho que o produto
 * entrega. Quando existir captura real do aparelho, ela entra no lugar do
 * miolo sem mexer na moldura.
 *
 * Cinco telas, uma por seção — é o que as duas referências que o Davi mandou
 * fazem (lp.pierre.finance e usecalen.com.br): o aparelho reaparece ao longo
 * da rolagem mostrando outra parte do produto a cada vez, em vez de uma
 * imagem só no topo.
 *
 * Proporção 390×844: iPhone 14, o aparelho mais comum do público do Tino.
 */

export type QualTela = "inicio" | "movimento" | "cartoes" | "plano" | "loja"

const CATEGORIAS = [
  { nome: "Aluguel e condomínio", valor: "R$ 1.042", fatia: 100, cor: "oklch(0.74 0.16 162)" },
  { nome: "Supermercado", valor: "R$ 658", fatia: 63, cor: "oklch(0.7 0.12 200)" },
  { nome: "Transporte", valor: "R$ 439", fatia: 42, cor: "oklch(0.72 0.09 250)" },
  { nome: "Lazer e eventos", valor: "R$ 329", fatia: 32, cor: "oklch(0.66 0.05 280)" },
]

const LANCAMENTOS = [
  { nome: "Assaí Atacadista", nota: "hoje · Cartão Gold", valor: "− R$ 74,90" },
  { nome: "Salário", nota: "05/09 · Conta corrente", valor: "+ R$ 8.600", entra: true },
  { nome: "Padaria Real", nota: "ontem · Pix", valor: "− R$ 32,00" },
  { nome: "Centauro", nota: "ontem · Cartão Gold", valor: "− R$ 219,90" },
  { nome: "Uber", nota: "sáb · Cartão Gold", valor: "− R$ 18,40" },
]

const DIVIDAS = [
  { nome: "Cheque especial", nota: "7,8% ao mês", valor: "R$ 3.192", passo: "1º" },
  { nome: "Cartão parcelado", nota: "3,2% ao mês", valor: "R$ 1.870", passo: "2º" },
  { nome: "Empréstimo pessoal", nota: "1,9% ao mês", valor: "R$ 6.400", passo: "3º" },
]

const VENDAS = [
  { nome: "Venda #482", nota: "Pix · agora", valor: "R$ 89,90", entra: true },
  { nome: "Venda #481", nota: "Cartão 2x · D+30", valor: "R$ 240,00", entra: true },
  { nome: "Venda #480", nota: "Fiado · Dona Cleusa", valor: "R$ 46,50" },
]

function Sistema() {
  return (
    <div className="cel-sistema">
      <span>9:41</span>
      <span className="cel-ilha" aria-hidden />
      <span className="cel-bateria" aria-hidden />
    </div>
  )
}

function BarraDoPolegar({ ativo }: { ativo: string }) {
  return (
    <div className="cel-barra">
      {["Início", "Movimento", "+", "Cartões", "Perfil"].map((item) =>
        item === "+" ? (
          <span key={item} className="cel-mais" aria-hidden>
            +
          </span>
        ) : (
          <span key={item} className={`cel-item ${item === ativo ? "cel-item--ativo" : ""}`}>
            <span className="cel-icone" aria-hidden />
            {item}
          </span>
        ),
      )}
    </div>
  )
}

function Linha({
  nome,
  nota,
  valor,
  entra,
}: {
  nome: string
  nota: string
  valor: string
  entra?: boolean
}) {
  return (
    <div className="cel-linha">
      <span className="cel-bolha" aria-hidden />
      <span className="cel-linha-texto">
        <span className="cel-linha-nome">{nome}</span>
        <span className="cel-linha-nota">{nota}</span>
      </span>
      <span className={`cel-linha-valor ${entra ? "em-alta" : ""}`}>{valor}</span>
    </div>
  )
}

const MIOLO: Record<QualTela, { ativo: string; conteudo: React.ReactNode }> = {
  inicio: {
    ativo: "Início",
    conteudo: (
      <>
        <div className="cel-cartao">
          <p className="cel-marca">TINO</p>
          <p className="cel-ola">Olá, Marina</p>
          <p className="cel-mes">setembro de 2026 · contas em ordem</p>
        </div>

        <div className="cel-heroi">
          <p className="cel-rotulo">Sobra deste mês</p>
          <p className="cel-numero">R$ 5.856,00</p>
          <p className="cel-apoio">Conta corrente é sua dívida mais cara.</p>
          <span className="cel-botao">Ver como pagar</span>
        </div>

        <div className="cel-grade">
          {[
            { rotulo: "Saldo", valor: "R$ 16.586" },
            { rotulo: "Entrou", valor: "R$ 8.600", tom: "entra" },
            { rotulo: "Saiu", valor: "R$ 2.744", tom: "sai" },
            { rotulo: "Próxima conta", valor: "R$ 780" },
          ].map((item) => (
            <div key={item.rotulo} className="cel-tile">
              <p className="cel-tile-rotulo">{item.rotulo}</p>
              <p
                className={`cel-tile-valor ${item.tom === "entra" ? "em-alta" : item.tom === "sai" ? "em-queda" : ""}`}
              >
                {item.valor}
              </p>
            </div>
          ))}
        </div>

        <div className="cel-cartao">
          <p className="cel-cartao-titulo">Para onde foi</p>
          <div className="cel-categorias">
            {CATEGORIAS.map((categoria) => (
              <div key={categoria.nome}>
                <div className="cel-categoria-topo">
                  <span>{categoria.nome}</span>
                  <span className="cel-categoria-valor">{categoria.valor}</span>
                </div>
                <span className="cel-barra-trilho">
                  <span
                    className="cel-barra-preenche"
                    style={{ width: `${categoria.fatia}%`, background: categoria.cor }}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
      </>
    ),
  },

  movimento: {
    ativo: "Movimento",
    conteudo: (
      <>
        <p className="cel-titulo-tela">Movimento</p>

        <div className="cel-grade">
          {[
            { rotulo: "Entrou", valor: "R$ 8.600", tom: "entra" },
            { rotulo: "Saiu", valor: "R$ 2.744", tom: "sai" },
          ].map((item) => (
            <div key={item.rotulo} className="cel-tile">
              <p className="cel-tile-rotulo">{item.rotulo}</p>
              <p className={`cel-tile-valor ${item.tom === "entra" ? "em-alta" : "em-queda"}`}>{item.valor}</p>
            </div>
          ))}
        </div>

        <div className="cel-cartao">
          <p className="cel-cartao-titulo">Esperando você</p>
          <div style={{ marginTop: 6 }}>
            <Linha nome="Foto da nota" nota="lida agora · confira o valor" valor="R$ 128,70" />
            <Linha nome="Pix recebido" nota="notificação · classificar" valor="+ R$ 350,00" entra />
          </div>
        </div>

        <div className="cel-cartao">
          <p className="cel-cartao-titulo">Setembro</p>
          <div style={{ marginTop: 4 }}>
            {LANCAMENTOS.map((item) => (
              <Linha key={item.nome} {...item} />
            ))}
          </div>
        </div>
      </>
    ),
  },

  cartoes: {
    ativo: "Cartões",
    conteudo: (
      <>
        <p className="cel-titulo-tela">Cartões</p>

        <div className="cel-plastico">
          <p className="cel-plastico-nome">Cartão Gold · final 3317</p>
          <p className="cel-plastico-valor">R$ 1.284,30</p>
          <div className="cel-plastico-rodape">
            <span>fecha dia 28</span>
            <span>limite R$ 6.000</span>
          </div>
        </div>

        <div className="cel-plastico" style={{ opacity: 0.82 }}>
          <p className="cel-plastico-nome">Cartão Platinum · final 8842</p>
          <p className="cel-plastico-valor">R$ 3.040,00</p>
          <div className="cel-plastico-rodape">
            <span>fecha dia 10</span>
            <span>limite R$ 12.000</span>
          </div>
        </div>

        <div className="cel-cartao">
          <p className="cel-cartao-titulo">Parcelas já compradas</p>
          <div className="cel-categorias">
            {[
              { nome: "outubro", valor: "R$ 1.980", fatia: 100 },
              { nome: "novembro", valor: "R$ 1.640", fatia: 82 },
              { nome: "dezembro", valor: "R$ 980", fatia: 49 },
            ].map((mes) => (
              <div key={mes.nome}>
                <div className="cel-categoria-topo">
                  <span>{mes.nome}</span>
                  <span className="cel-categoria-valor">{mes.valor}</span>
                </div>
                <span className="cel-barra-trilho">
                  <span
                    className="cel-barra-preenche"
                    style={{ width: `${mes.fatia}%`, background: "oklch(0.68 0.17 25)" }}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
      </>
    ),
  },

  plano: {
    ativo: "Início",
    conteudo: (
      <>
        <p className="cel-titulo-tela">Plano de pagamento</p>

        <div className="cel-heroi">
          <p className="cel-rotulo">Economia na ordem certa</p>
          <p className="cel-numero em-alta">R$ 2.847</p>
          <p className="cel-apoio">Pagando a mais cara primeiro, contra a menor primeiro.</p>
        </div>

        <div className="cel-cartao">
          <p className="cel-cartao-titulo">Ataque nesta ordem</p>
          <div style={{ marginTop: 4 }}>
            {DIVIDAS.map((divida) => (
              <div key={divida.nome} className="cel-linha">
                <span className="cel-bolha" aria-hidden style={{ display: "grid", placeItems: "center", fontSize: 8, fontWeight: 700 }}>
                  {divida.passo}
                </span>
                <span className="cel-linha-texto">
                  <span className="cel-linha-nome">{divida.nome}</span>
                  <span className="cel-linha-nota">{divida.nota}</span>
                </span>
                <span className="cel-linha-valor">{divida.valor}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="cel-cartao">
          <p className="cel-cartao-titulo">Livre em</p>
          <p className="cel-numero" style={{ fontSize: 20, marginTop: 4 }}>
            14 meses
          </p>
          <p className="cel-apoio">Mantendo R$ 900 por mês nas dívidas.</p>
        </div>
      </>
    ),
  },

  loja: {
    ativo: "Início",
    conteudo: (
      <>
        <p className="cel-titulo-tela">Balcão</p>

        <div className="cel-grade">
          {[
            { rotulo: "Vendido hoje", valor: "R$ 1.376", tom: "entra" },
            { rotulo: "Cai na conta", valor: "R$ 1.318" },
            { rotulo: "Fiado aberto", valor: "R$ 462" },
            { rotulo: "MEI usado", valor: "38%" },
          ].map((item) => (
            <div key={item.rotulo} className="cel-tile">
              <p className="cel-tile-rotulo">{item.rotulo}</p>
              <p className={`cel-tile-valor ${item.tom === "entra" ? "em-alta" : ""}`}>{item.valor}</p>
            </div>
          ))}
        </div>

        <div className="cel-cartao">
          <p className="cel-cartao-titulo">Vendas de hoje</p>
          <div style={{ marginTop: 4 }}>
            {VENDAS.map((venda) => (
              <Linha key={venda.nome} {...venda} />
            ))}
          </div>
        </div>

        <div className="cel-cartao">
          <p className="cel-cartao-titulo">Prateleira</p>
          <div style={{ marginTop: 4 }}>
            <Linha nome="Café 500g" nota="18 em estoque · margem 34%" valor="R$ 22,90" />
            <Linha nome="Detergente" nota="3 em estoque · repor" valor="R$ 3,40" />
          </div>
        </div>
      </>
    ),
  },
}

const NOME_DA_TELA: Record<QualTela, string> = {
  inicio: "tela Início do Tino, com a sobra do mês e os gastos por categoria",
  movimento: "tela Movimento do Tino, com a fila de lançamentos esperando confirmação",
  cartoes: "tela Cartões do Tino, com faturas e parcelas já compradas",
  plano: "tela Plano de pagamento do Tino, com a ordem de ataque das dívidas",
  loja: "tela Balcão do Tino, com vendas do dia e prateleira",
}

export function TelaNoCelular({ tela = "inicio" }: { tela?: QualTela }) {
  const { ativo, conteudo } = MIOLO[tela]

  return (
    <div className="celular" role="img" aria-label={NOME_DA_TELA[tela]}>
      <div className="celular-tela">
        <Sistema />
        <div className="cel-conteudo">{conteudo}</div>
        <BarraDoPolegar ativo={ativo} />
      </div>
    </div>
  )
}

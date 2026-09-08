/**
 * O app dentro de um celular, na vitrine.
 *
 * NÃO é uma imagem: é a tela Início remontada em HTML e CSS, com os mesmos
 * números, a mesma ordem e a mesma anatomia da tela de verdade
 * (`docs/SPEC-CALEN-PRECISO.md`, PARTE 4.1 — rótulo de 11px, número de 36px,
 * apoio curto, quatro números em 2×2, rosca de categorias, barra do polegar).
 *
 * Por que não um print: print envelhece na primeira mudança de skin, borra em
 * tela retina se não for exportado em 3x, e pesa. Remontado, ele fica nítido
 * em qualquer densidade, acompanha o tema e é o mesmo desenho que o produto
 * entrega. Quando existir print real do aparelho, ele entra no lugar do miolo
 * sem mexer na moldura.
 *
 * A proporção é 390×844 — iPhone 14, o aparelho mais comum do público do
 * Tino.
 */

const CATEGORIAS = [
  { nome: "Aluguel e condomínio", fatia: 38, cor: "oklch(0.72 0.15 165)" },
  { nome: "Supermercado", fatia: 24, cor: "oklch(0.68 0.13 200)" },
  { nome: "Transporte", fatia: 16, cor: "oklch(0.72 0.1 250)" },
  { nome: "Lazer e eventos", fatia: 12, cor: "oklch(0.66 0.06 280)" },
  { nome: "Outras", fatia: 10, cor: "oklch(0.6 0.02 260)" },
]

/** As fatias viram paradas de um `conic-gradient` — rosca sem biblioteca. */
function anelDeCategorias() {
  let acumulado = 0
  const paradas = CATEGORIAS.map((categoria) => {
    const de = acumulado
    acumulado += categoria.fatia
    return `${categoria.cor} ${de}% ${acumulado}%`
  })
  return `conic-gradient(from -90deg, ${paradas.join(", ")})`
}

export function TelaNoCelular() {
  return (
    <div className="celular" aria-label="A tela Início do Tino em um celular">
      <div className="celular-tela">
        {/* Barra do sistema: só o suficiente para ler como aparelho. */}
        <div className="cel-sistema">
          <span>9:41</span>
          <span className="cel-ilha" aria-hidden />
          <span className="cel-bateria" aria-hidden />
        </div>

        <div className="cel-conteudo">
          <div className="cel-cartao cel-topo">
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
                <p className={`cel-tile-valor ${item.tom === "entra" ? "dado-entra" : item.tom === "sai" ? "dado-sai" : ""}`}>
                  {item.valor}
                </p>
              </div>
            ))}
          </div>

          <div className="cel-cartao">
            <p className="cel-cartao-titulo">Para onde foi</p>
            <div className="cel-rosca-linha">
              <span className="cel-rosca" style={{ background: anelDeCategorias() }}>
                <span className="cel-rosca-buraco">
                  <span className="cel-rosca-total">R$ 2.744</span>
                  <span className="cel-rosca-nota">gasto até hoje</span>
                </span>
              </span>
              <ul className="cel-legenda">
                {CATEGORIAS.slice(0, 4).map((categoria) => (
                  <li key={categoria.nome}>
                    <span className="cel-ponto" style={{ background: categoria.cor }} />
                    {categoria.nome}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Barra do polegar: quatro itens e o "+" no meio, como no app. */}
        <div className="cel-barra">
          {["Início", "Movimento", "+", "Cartões", "Perfil"].map((item) =>
            item === "+" ? (
              <span key={item} className="cel-mais">
                +
              </span>
            ) : (
              <span key={item} className={`cel-item ${item === "Início" ? "cel-item--ativo" : ""}`}>
                <span className="cel-icone" aria-hidden />
                {item}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  )
}

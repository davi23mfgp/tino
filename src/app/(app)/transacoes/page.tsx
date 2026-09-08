"use client"

import { useCallback, useEffect, useState } from "react"

import { buscar, enviar } from "@/lib/cliente"
import { competenciaAtual, rotuloCompetencia, ultimasCompetencias } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { Cartao, Metrica, Vazio } from "@/components/ui/painel"
import { EditavelTexto, EditavelMoeda } from "@/components/ui/editavel"
import { showToast } from "@/components/ui/toast"
import { SelectNative } from "@/components/ui/select-native"
import { Checkbox } from "@/components/ui/checkbox"
import { EsqueletoLinhas } from "@/components/ui/skeleton"
import { Paginacao, usePaginacao } from "@/components/ui/paginacao"
import { cn } from "@/lib/utils"
import { iconeDaCategoria } from "@/lib/icone-categoria"

interface Transacao {
  id: string
  data: string
  descricao: string
  valorCentavos: number
  tipo: "RECEITA" | "DESPESA" | "TRANSFERENCIA"
  categoriaId: string | null
  // `grupo` vem da API desde sempre (`include: { categoria: true }`), só não
  // era declarado aqui — é o que escolhe o ícone da linha.
  categoria: { nome: string; cor: string; grupo?: string | null } | null
  conta: { nome: string }
}

interface Categoria {
  id: string
  nome: string
}

export default function Transacoes() {
  const [competencia, setCompetencia] = useState(competenciaAtual())
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [totais, setTotais] = useState({ receitasCentavos: 0, despesasCentavos: 0 })
  const [busca, setBusca] = useState("")
  const [semCategoria, setSemCategoria] = useState(false)
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const parametros = new URLSearchParams({ competencia, limite: "200" })
    if (busca) parametros.set("busca", busca)
    if (semCategoria) parametros.set("semCategoria", "1")

    const dados = await buscar<{ transacoes: Transacao[]; totais: typeof totais }>(
      `/api/transacoes?${parametros.toString()}`,
    )
    setTransacoes(dados.transacoes)
    setTotais(dados.totais)
    setCarregando(false)
  }, [competencia, busca, semCategoria])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    buscar<Categoria[]>("/api/categorias").then(setCategorias)
  }, [])

  /**
   * Trocar a categoria já cria a regra: é o momento em que o usuário está
   * dizendo ao Tino o que aquele lançamento é. Perguntar "quer criar regra?"
   * a cada correção seria atrito puro.
   */
  async function recategorizar(id: string, categoriaId: string) {
    await enviar(`/api/transacoes/${id}`, { categoriaId, criarRegra: true }, "PATCH")
    carregar()
  }

  /**
   * Edição no lugar — item 1 do redesign de experiência (07/09/2026). A
   * linha muda na hora (resultado imediato, mesmo princípio da etapa 3); se
   * o PATCH falhar, volta ao valor anterior e avisa por toast — o único
   * jeito de errar aqui é a rede cair, então some sem exigir confirmação.
   */
  async function salvarEdicao(id: string, parcial: Partial<Pick<Transacao, "descricao" | "valorCentavos">>) {
    const anterior = transacoes.find((t) => t.id === id)
    if (!anterior) return
    setTransacoes((atual) => atual.map((t) => (t.id === id ? { ...t, ...parcial } : t)))
    try {
      await enviar(`/api/transacoes/${id}`, parcial, "PATCH")
    } catch (erro) {
      setTransacoes((atual) => atual.map((t) => (t.id === id ? anterior : t)))
      showToast("Não consegui salvar", {
        description: erro instanceof Error ? erro.message : undefined,
        variant: "error",
      })
    }
  }

  const saldo = totais.receitasCentavos - totais.despesasCentavos
  // 25 por página: cabe sem rolagem excessiva num notebook comum e ainda
  // deixa a paginação útil (mês cheio passa fácil de 25 lançamentos). A API
  // já manda até 200 de uma vez — isto só corta como a lista é MOSTRADA.
  const { pagina, totalPaginas, itensDaPagina, irPara } = usePaginacao(transacoes, 25)

  // Trocar de mês, busca ou filtro com a pessoa parada na página 3 deixaria
  // ela "presa" numa página que pode nem existir mais na lista nova.
  useEffect(() => {
    irPara(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competencia, busca, semCategoria])

  return (
    <div className="space-y-4">
      <Cartao>
        <div className="flex flex-wrap items-center gap-2">
          <SelectNative
            tamanho="pilula"
            value={competencia}
            onChange={(evento) => setCompetencia(evento.target.value)}
            className="w-auto"
          >
            {ultimasCompetencias(18).reverse().map((mes) => (
              <option key={mes} value={mes}>
                {rotuloCompetencia(mes)}
              </option>
            ))}
          </SelectNative>

          <input
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar transações…"
            className="flex-1 rounded-full border border-pauta bg-background px-4 py-2 text-sm outline-none focus:border-acao/50"
          />

          <label className="flex items-center gap-2 rounded-full border border-pauta px-4 py-2 text-sm">
            <Checkbox
              checked={semCategoria}
              onChange={(evento) => setSemCategoria(evento.target.checked)}
            />
            só sem categoria
          </label>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metrica rotulo="Lançamentos" valor={String(transacoes.length)} />
          <Metrica rotulo="Receitas" valor={formatarMoeda(totais.receitasCentavos)} tom="positivo" />
          <Metrica rotulo="Despesas" valor={formatarMoeda(totais.despesasCentavos)} tom="negativo" />
          <Metrica rotulo="Saldo" valor={formatarMoeda(saldo)} tom={saldo >= 0 ? "positivo" : "negativo"} />
        </div>
      </Cartao>

      <Cartao>
        {carregando && <EsqueletoLinhas linhas={6} />}

        {!carregando && transacoes.length === 0 && (
          <Vazio titulo="Nenhum lançamento neste filtro" texto="Troque o mês ou importe um extrato." />
        )}

        {/* Linha de 52px e realce só no passar do mouse, conforme o brief.
            Zebra fixa numa lista longa cria um padrão que compete com o
            próprio dado; o realce que segue o cursor diz onde a pessoa está
            sem pintar a tela inteira. */}
        <div className="divide-y divide-pauta">
          {itensDaPagina.map((transacao) => (
            <div
              key={transacao.id}
              className="-mx-2 flex min-h-[52px] flex-wrap items-center gap-3 rounded-[var(--raio-campo)] px-2 py-2 transition-colors hover:bg-papel-2 sm:flex-nowrap"
            >
              {/* Círculo de 40/44px com ícone de 18px — PARTE 4.3 do spec.
                  O ícone sai da categoria (ver `lib/icone-categoria.ts`), e
                  quando não há categoria ele cai no tipo: nunca fica um
                  buraco, que estragaria justamente o ritmo que ele existe
                  para criar. */}
              {(() => {
                const Icone = iconeDaCategoria(transacao.categoria, transacao.tipo)
                return (
                  <span
                    aria-hidden
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-foreground/[0.07] text-[color:var(--texto-2)] sm:size-11"
                  >
                    <Icone className="size-[18px]" />
                  </span>
                )
              })()}

              <div className="min-w-0 flex-1">
                <EditavelTexto
                  valor={transacao.descricao}
                  aoSalvar={(novo) => salvarEdicao(transacao.id, { descricao: novo })}
                  className="block"
                />
                <p className="px-2 text-[12px] text-[color:var(--texto-3)]">
                  {new Date(transacao.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })} · {transacao.conta.nome}
                </p>
              </div>

              {/* TRANSFERÊNCIA NÃO PEDE CATEGORIA, e por isso não pode ser
                  cobrada em âmbar. Dinheiro que sai da conta corrente e entra
                  na poupança não é gasto de nada — pintar isso de "trabalho
                  pendente" faz o app cobrar uma tarefa que não existe, e ainda
                  ensina a pessoa a ignorar o âmbar quando ele for de verdade. */}
              {transacao.tipo === "TRANSFERENCIA" ? (
                <span className="rounded-[var(--raio-pilula)] bg-foreground/[0.06] px-3 py-1.5 text-[12px] text-[color:var(--texto-3)]">
                  entre contas
                </span>
              ) : (
                // A caixa de 190px é do ENVOLTÓRIO, não do `select`:
                // `SelectNative` desenha um `<div class="w-full">` em volta,
                // e era ELE que esticava — medido ao vivo, a linha ficava com
                // 877px de select, 0px de descrição e 3 alturas de texto.
                // Limitar só o `<select>` por dentro não resolvia nada.
                <div className="w-[190px] shrink-0">
                <SelectNative
                  tamanho="pilula"
                  value={transacao.categoriaId ?? ""}
                  onChange={(evento) => recategorizar(transacao.id, evento.target.value)}
                  className={cn(
                    "w-full truncate text-[12px]",
                    transacao.categoriaId
                      ? "border-transparent bg-foreground/[0.06] text-[color:var(--texto-2)] hover:bg-foreground/[0.1]"
                      : "border-transparent bg-atencao/12 text-atencao",
                  )}
                >
                  <option value="">sem categoria</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </SelectNative>
                </div>
              )}

              {/* O SINAL SÓ APARECE EM DINHEIRO QUE ENTRA OU SAI DO LAR.
                  Transferência tem duas pernas — sai da conta corrente, entra
                  na poupança — e o app gravava as duas. Com menos nos dois
                  lados, pagar R$ 3.040 de fatura aparecia como R$ 6.080 saindo,
                  e a pessoa lia um prejuízo que nunca aconteceu. Agora ela sai
                  sem sinal e em tom secundário: o valor continua conferível,
                  mas não entra na leitura de quanto se gastou.

                  Só a entrada ganha cor. Pintar toda saída de vermelho numa
                  lista de cem linhas faz a pessoa parar de enxergar vermelho, e
                  aí a cor não avisa mais nada. */}
              {transacao.tipo === "TRANSFERENCIA" ? (
                // As duas pernas da transferência têm de continuar batendo uma
                // com a outra — mudar só este lado aqui faria o dinheiro sumir
                // de um lado sem aparecer do outro. Por isso não é editável.
                <span className="numero w-28 text-right text-[14px] font-medium text-[color:var(--texto-3)]">
                  {formatarMoeda(transacao.valorCentavos)}
                </span>
              ) : (
                <span
                  className={cn(
                    "flex items-center",
                    transacao.tipo === "RECEITA" ? "text-positivo" : "",
                  )}
                >
                  <span className="numero text-[14px] font-medium">
                    {transacao.tipo === "RECEITA" ? "+" : "−"}
                  </span>
                  <EditavelMoeda
                    valorCentavos={transacao.valorCentavos}
                    aoSalvar={(novo) => salvarEdicao(transacao.id, { valorCentavos: novo })}
                    className={transacao.tipo === "RECEITA" ? "text-positivo" : ""}
                  />
                </span>
              )}
            </div>
          ))}
        </div>

        <Paginacao pagina={pagina} totalPaginas={totalPaginas} aoMudar={irPara} className="mt-4" />
      </Cartao>
    </div>
  )
}

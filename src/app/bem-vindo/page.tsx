"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react"

import { enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"

/**
 * Conversa inicial.
 *
 * Cada passo pergunta uma coisa só e pode ser pulado. A ordem segue o que o
 * Tino precisa saber para dizer algo útil já no primeiro painel: quanto entra,
 * onde está o dinheiro, o que já está comprometido e para onde você quer ir.
 */

interface ContaForm {
  nome: string
  tipo: "CORRENTE" | "POUPANCA" | "DINHEIRO" | "INVESTIMENTO"
  instituicao: string
  saldo: string
  negativa: boolean
  jurosChequeEspecial: string
}

interface CartaoForm {
  nome: string
  instituicao: string
  limite: string
  diaVencimento: string
  fatura: string
}

interface ParcelaForm {
  descricao: string
  cartaoIndice: number
  valorParcela: string
  parcelasTotal: string
  parcelasPagas: string
}

interface DividaForm {
  credor: string
  tipo: string
  saldo: string
  juros: string
  parcela: string
}

const TIPOS_DIVIDA = [
  { valor: "EMPRESTIMO_PESSOAL", rotulo: "Empréstimo pessoal" },
  { valor: "CONSIGNADO", rotulo: "Consignado" },
  { valor: "CARTAO_ROTATIVO", rotulo: "Rotativo do cartão" },
  { valor: "FINANCIAMENTO_VEICULO", rotulo: "Financiamento de veículo" },
  { valor: "FINANCIAMENTO_IMOVEL", rotulo: "Financiamento de imóvel" },
  { valor: "ESTUDANTIL", rotulo: "Crédito estudantil" },
  { valor: "OUTRO", rotulo: "Outro" },
]

const TIPOS_META = [
  { valor: "RESERVA_EMERGENCIA", rotulo: "Reserva de emergência" },
  { valor: "VIAGEM", rotulo: "Viagem" },
  { valor: "IMOVEL", rotulo: "Imóvel" },
  { valor: "VEICULO", rotulo: "Veículo" },
  { valor: "EDUCACAO", rotulo: "Educação" },
  { valor: "APOSENTADORIA", rotulo: "Aposentadoria" },
  { valor: "OUTRO", rotulo: "Outro" },
]

const campo =
  "w-full rounded-[var(--raio-campo)] border border-pauta bg-background px-4 py-3 text-sm outline-none focus:border-acao/50"

export default function BemVindo() {
  const router = useRouter()
  const [passo, setPasso] = useState(0)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [renda, setRenda] = useState("")
  const [custo, setCusto] = useState("")
  const [diaInicioMes, setDiaInicioMes] = useState("1")

  const [contas, setContas] = useState<ContaForm[]>([
    { nome: "Conta corrente", tipo: "CORRENTE", instituicao: "", saldo: "", negativa: false, jurosChequeEspecial: "" },
  ])
  const [cartoes, setCartoes] = useState<CartaoForm[]>([])
  const [parcelamentos, setParcelamentos] = useState<ParcelaForm[]>([])
  const [dividas, setDividas] = useState<DividaForm[]>([])
  const [meta, setMeta] = useState({ nome: "", tipo: "RESERVA_EMERGENCIA", alvo: "", aporte: "", dataAlvo: "" })
  const [mei, setMei] = useState({ ativo: false, cnpj: "", atividade: "SERVICOS", das: "" })

  async function concluir() {
    setSalvando(true)
    setErro(null)

    try {
      await enviar("/api/onboarding", {
        rendaMensalCentavos: renda ? paraCentavos(renda) : undefined,
        custoMensalEstimadoCentavos: custo ? paraCentavos(custo) : undefined,
        diaInicioMes: Number(diaInicioMes) || 1,
        contas: contas
          .filter((conta) => conta.nome.trim())
          .map((conta) => ({
            nome: conta.nome.trim(),
            tipo: conta.tipo,
            instituicao: conta.instituicao.trim() || undefined,
            // O sinal vem do interruptor, não do texto: pedir para digitar o
            // menos é onde a pessoa erra e o app mostra saldo trocado.
            saldoCentavos: conta.saldo
              ? Math.abs(paraCentavos(conta.saldo)) * (conta.negativa ? -1 : 1)
              : 0,
            jurosChequeEspecialBps:
              conta.negativa && conta.jurosChequeEspecial
                ? Math.round(Number(conta.jurosChequeEspecial.replace(",", ".")) * 100)
                : undefined,
          })),
        cartoes: cartoes
          .filter((cartao) => cartao.nome.trim())
          .map((cartao) => ({
            nome: cartao.nome.trim(),
            instituicao: cartao.instituicao.trim() || undefined,
            limiteCentavos: cartao.limite ? paraCentavos(cartao.limite) : undefined,
            diaVencimento: cartao.diaVencimento ? Number(cartao.diaVencimento) : undefined,
            faturaAtualCentavos: cartao.fatura ? paraCentavos(cartao.fatura) : undefined,
          })),
        parcelamentos: parcelamentos
          .filter((parcelamento) => parcelamento.descricao.trim() && parcelamento.valorParcela)
          .map((parcelamento) => ({
            descricao: parcelamento.descricao.trim(),
            cartaoIndice: parcelamento.cartaoIndice,
            valorParcelaCentavos: paraCentavos(parcelamento.valorParcela),
            parcelasTotal: Number(parcelamento.parcelasTotal) || 1,
            parcelasPagas: Number(parcelamento.parcelasPagas) || 0,
          })),
        dividas: dividas
          .filter((divida) => divida.credor.trim() && divida.saldo)
          .map((divida) => ({
            credor: divida.credor.trim(),
            tipo: divida.tipo,
            saldoDevedorCentavos: paraCentavos(divida.saldo),
            // O usuário digita "2,5" pensando em 2,5% ao mês; o banco guarda em
            // pontos-base para não carregar float na projeção.
            jurosMensalBps: divida.juros ? Math.round(Number(divida.juros.replace(",", ".")) * 100) : 0,
            parcelaCentavos: divida.parcela ? paraCentavos(divida.parcela) : 0,
          })),
        metas: meta.nome.trim() && meta.alvo
          ? [
              {
                nome: meta.nome.trim(),
                tipo: meta.tipo,
                alvoCentavos: paraCentavos(meta.alvo),
                aporteMensalCentavos: meta.aporte ? paraCentavos(meta.aporte) : 0,
                dataAlvo: meta.dataAlvo || undefined,
              },
            ]
          : [],
        mei: mei.ativo
          ? {
              ativo: true,
              cnpj: mei.cnpj || undefined,
              atividade: mei.atividade,
              dasMensalCentavos: mei.das ? paraCentavos(mei.das) : undefined,
            }
          : { ativo: false },
      })

      router.push("/painel")
      router.refresh()
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não consegui salvar.")
      setSalvando(false)
    }
  }

  async function pular() {
    await enviar("/api/onboarding", {}, "PATCH")
    router.push("/painel")
    router.refresh()
  }

  const passos = [
    {
      titulo: "Quanto entra e quanto sai por mês?",
      texto:
        "Não precisa ser exato — é a partir daí que eu calculo sua sobra, sua reserva e a projeção. Dá para corrigir depois.",
      conteudo: (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-widest text-muted-fg">Renda mensal</span>
            <input value={renda} onChange={(e) => setRenda(e.target.value)} placeholder="5.000,00" className={campo} inputMode="decimal" />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-widest text-muted-fg">
              Gasto médio por mês (aproximado)
            </span>
            <input value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="3.500,00" className={campo} inputMode="decimal" />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-widest text-muted-fg">
              Em que dia do mês você recebe?
            </span>
            <input
              value={diaInicioMes}
              onChange={(e) => setDiaInicioMes(e.target.value)}
              placeholder="5"
              className={campo}
              inputMode="numeric"
            />
            <span className="block text-[12px] text-muted-fg">
              Seu mês financeiro passa a começar nesse dia, e não no dia 1º.
            </span>
          </label>
        </div>
      ),
    },
    {
      titulo: "Onde está o seu dinheiro?",
      texto: "Conta corrente, poupança, dinheiro em espécie. Se alguma estiver no negativo, marque o interruptor.",
      conteudo: (
        <div className="space-y-3">
          {contas.map((conta, indice) => (
            <div key={indice} className="space-y-2 rounded-[var(--raio-cartao)] border border-pauta p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={conta.nome}
                  onChange={(e) => atualizar(setContas, indice, { nome: e.target.value })}
                  placeholder="nome da conta"
                  className={campo}
                />
                <select
                  value={conta.tipo}
                  onChange={(e) => atualizar(setContas, indice, { tipo: e.target.value as ContaForm["tipo"] })}
                  className={campo}
                >
                  <option value="CORRENTE">Conta corrente</option>
                  <option value="POUPANCA">Poupança</option>
                  <option value="DINHEIRO">Dinheiro em espécie</option>
                  <option value="INVESTIMENTO">Investimento</option>
                </select>
                <input
                  value={conta.instituicao}
                  onChange={(e) => atualizar(setContas, indice, { instituicao: e.target.value })}
                  placeholder="banco (opcional)"
                  className={campo}
                />
                <input
                  value={conta.saldo}
                  onChange={(e) => atualizar(setContas, indice, { saldo: e.target.value })}
                  placeholder="saldo hoje"
                  className={campo}
                  inputMode="decimal"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={conta.negativa}
                    onChange={(e) => atualizar(setContas, indice, { negativa: e.target.checked })}
                  />
                  esta conta está no negativo
                </label>
                {contas.length > 1 && (
                  <button onClick={() => remover(setContas, indice)} className="text-muted-fg hover:text-negativo">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {conta.negativa && (
                <div className="space-y-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs uppercase tracking-widest text-muted-fg">
                      Juros do cheque especial (% ao mês)
                    </span>
                    <input
                      value={conta.jurosChequeEspecial}
                      onChange={(e) => atualizar(setContas, indice, { jurosChequeEspecial: e.target.value })}
                      placeholder="8,0, veja no seu extrato ou no app do banco"
                      className={campo}
                      inputMode="decimal"
                    />
                  </label>

                  {conta.saldo && (
                    <p className="rounded-xl border border-negativo/30 bg-negativo/10 p-2.5 text-xs text-negativo">
                      Vou registrar {formatarMoeda(-Math.abs(paraCentavos(conta.saldo)))} como cheque especial a{" "}
                      {conta.jurosChequeEspecial || "8,0"}% ao mês. Se você não souber a taxa, deixo no teto legal de 8%
                      e você corrige depois em Configurações — é quase sempre o juro mais caro que você paga, então ela
                      entra no topo do plano.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}

          <BotaoAdicionar
            onClick={() =>
              setContas([
                ...contas,
                { nome: "", tipo: "CORRENTE", instituicao: "", saldo: "", negativa: false, jurosChequeEspecial: "" },
              ])
            }
          >
            adicionar conta
          </BotaoAdicionar>
        </div>
      ),
    },
    {
      titulo: "Tem cartão de crédito?",
      texto:
        "Limite não é dinheiro seu, então cartão fica fora do saldo. Mas a fatura disputa o mesmo mês, e por isso eu preciso conhecê-la.",
      conteudo: (
        <div className="space-y-3">
          {cartoes.map((cartao, indice) => (
            <div key={indice} className="space-y-2 rounded-[var(--raio-cartao)] border border-pauta p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={cartao.nome}
                  onChange={(e) => atualizar(setCartoes, indice, { nome: e.target.value })}
                  placeholder="nome do cartão"
                  className={campo}
                />
                <input
                  value={cartao.instituicao}
                  onChange={(e) => atualizar(setCartoes, indice, { instituicao: e.target.value })}
                  placeholder="banco"
                  className={campo}
                />
                <input
                  value={cartao.limite}
                  onChange={(e) => atualizar(setCartoes, indice, { limite: e.target.value })}
                  placeholder="limite total"
                  className={campo}
                  inputMode="decimal"
                />
                <input
                  value={cartao.diaVencimento}
                  onChange={(e) => atualizar(setCartoes, indice, { diaVencimento: e.target.value })}
                  placeholder="dia do vencimento"
                  className={campo}
                  inputMode="numeric"
                />
                <input
                  value={cartao.fatura}
                  onChange={(e) => atualizar(setCartoes, indice, { fatura: e.target.value })}
                  placeholder="fatura atual em aberto"
                  className={cn(campo, "sm:col-span-2")}
                  inputMode="decimal"
                />
              </div>

              <div className="flex justify-end">
                <button onClick={() => remover(setCartoes, indice)} className="text-muted-fg hover:text-negativo">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <BotaoAdicionar
            onClick={() =>
              setCartoes([...cartoes, { nome: "", instituicao: "", limite: "", diaVencimento: "", fatura: "" }])
            }
          >
            adicionar cartão
          </BotaoAdicionar>

          {cartoes.length === 0 && (
            <p className="text-[12px] text-muted-fg">Se não usa cartão de crédito, siga adiante.</p>
          )}
        </div>
      ),
    },
    {
      titulo: "Tem compra parcelada em andamento?",
      texto:
        "Esta é a pergunta que mais muda o resultado. Parcela some do extrato mas continua tomando um pedaço de cada fatura por meses — se eu não souber, a projeção mente.",
      conteudo: (
        <div className="space-y-3">
          {cartoes.length === 0 && (
            <p className="rounded-[var(--raio-cartao)] border border-pauta p-3 text-sm text-muted-fg">
              Cadastre um cartão no passo anterior para lançar os parcelamentos dele.
            </p>
          )}

          {cartoes.length > 0 && (
            <>
              {parcelamentos.map((parcelamento, indice) => (
                <div key={indice} className="space-y-2 rounded-[var(--raio-cartao)] border border-pauta p-3">
                  <input
                    value={parcelamento.descricao}
                    onChange={(e) => atualizar(setParcelamentos, indice, { descricao: e.target.value })}
                    placeholder="o que foi comprado"
                    className={campo}
                  />

                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      value={parcelamento.valorParcela}
                      onChange={(e) => atualizar(setParcelamentos, indice, { valorParcela: e.target.value })}
                      placeholder="valor da parcela"
                      className={campo}
                      inputMode="decimal"
                    />
                    <input
                      value={parcelamento.parcelasTotal}
                      onChange={(e) => atualizar(setParcelamentos, indice, { parcelasTotal: e.target.value })}
                      placeholder="total de parcelas"
                      className={campo}
                      inputMode="numeric"
                    />
                    <input
                      value={parcelamento.parcelasPagas}
                      onChange={(e) => atualizar(setParcelamentos, indice, { parcelasPagas: e.target.value })}
                      placeholder="já pagas"
                      className={campo}
                      inputMode="numeric"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <select
                      value={parcelamento.cartaoIndice}
                      onChange={(e) =>
                        atualizar(setParcelamentos, indice, { cartaoIndice: Number(e.target.value) })
                      }
                      className={campo}
                    >
                      {cartoes.map((cartao, posicao) => (
                        <option key={posicao} value={posicao}>
                          {cartao.nome || `cartão ${posicao + 1}`}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => remover(setParcelamentos, indice)}
                      className="text-muted-fg hover:text-negativo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {parcelamento.valorParcela && parcelamento.parcelasTotal && (
                    <p className="text-[12px] text-muted-fg">
                      Faltam{" "}
                      {Math.max(0, Number(parcelamento.parcelasTotal) - Number(parcelamento.parcelasPagas || 0))}{" "}
                      parcela(s) —{" "}
                      {formatarMoeda(
                        paraCentavos(parcelamento.valorParcela) *
                          Math.max(0, Number(parcelamento.parcelasTotal) - Number(parcelamento.parcelasPagas || 0)),
                      )}{" "}
                      ainda por pagar.
                    </p>
                  )}
                </div>
              ))}

              <BotaoAdicionar
                onClick={() =>
                  setParcelamentos([
                    ...parcelamentos,
                    { descricao: "", cartaoIndice: 0, valorParcela: "", parcelasTotal: "", parcelasPagas: "0" },
                  ])
                }
              >
                adicionar parcelamento
              </BotaoAdicionar>
            </>
          )}
        </div>
      ),
    },
    {
      titulo: "Deve para mais alguém?",
      texto:
        "Empréstimo, consignado, financiamento, rotativo. Com o juro de cada um eu monto a ordem que faz você pagar menos no total.",
      conteudo: (
        <div className="space-y-3">
          {dividas.map((divida, indice) => (
            <div key={indice} className="space-y-2 rounded-[var(--raio-cartao)] border border-pauta p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={divida.credor}
                  onChange={(e) => atualizar(setDividas, indice, { credor: e.target.value })}
                  placeholder="para quem você deve"
                  className={campo}
                />
                <select
                  value={divida.tipo}
                  onChange={(e) => atualizar(setDividas, indice, { tipo: e.target.value })}
                  className={campo}
                >
                  {TIPOS_DIVIDA.map((tipo) => (
                    <option key={tipo.valor} value={tipo.valor}>
                      {tipo.rotulo}
                    </option>
                  ))}
                </select>
                <input
                  value={divida.saldo}
                  onChange={(e) => atualizar(setDividas, indice, { saldo: e.target.value })}
                  placeholder="quanto falta pagar"
                  className={campo}
                  inputMode="decimal"
                />
                <input
                  value={divida.parcela}
                  onChange={(e) => atualizar(setDividas, indice, { parcela: e.target.value })}
                  placeholder="parcela mensal"
                  className={campo}
                  inputMode="decimal"
                />
                <input
                  value={divida.juros}
                  onChange={(e) => atualizar(setDividas, indice, { juros: e.target.value })}
                  placeholder="juros ao mês em % (ex.: 2,5)"
                  className={cn(campo, "sm:col-span-2")}
                  inputMode="decimal"
                />
              </div>

              <div className="flex justify-end">
                <button onClick={() => remover(setDividas, indice)} className="text-muted-fg hover:text-negativo">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <BotaoAdicionar
            onClick={() =>
              setDividas([...dividas, { credor: "", tipo: "EMPRESTIMO_PESSOAL", saldo: "", juros: "", parcela: "" }])
            }
          >
            adicionar dívida
          </BotaoAdicionar>

          {dividas.length === 0 && (
            <p className="text-[12px] text-muted-fg">Se não deve nada além do cartão, pode seguir.</p>
          )}
        </div>
      ),
    },
    {
      titulo: "Para onde você quer chegar?",
      texto:
        "Uma meta basta para começar. Se você ainda não tem reserva de emergência, ela costuma vir antes de tudo — é o que impede um imprevisto de virar dívida cara.",
      conteudo: (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={meta.nome}
              onChange={(e) => setMeta({ ...meta, nome: e.target.value })}
              placeholder="nome da meta"
              className={campo}
            />
            <select value={meta.tipo} onChange={(e) => setMeta({ ...meta, tipo: e.target.value })} className={campo}>
              {TIPOS_META.map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.rotulo}
                </option>
              ))}
            </select>
            <input
              value={meta.alvo}
              onChange={(e) => setMeta({ ...meta, alvo: e.target.value })}
              placeholder="quanto quer juntar"
              className={campo}
              inputMode="decimal"
            />
            <input
              value={meta.aporte}
              onChange={(e) => setMeta({ ...meta, aporte: e.target.value })}
              placeholder="quanto consegue por mês"
              className={campo}
              inputMode="decimal"
            />
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs uppercase tracking-widest text-muted-fg">Para quando (opcional)</span>
              <input
                type="date"
                value={meta.dataAlvo}
                onChange={(e) => setMeta({ ...meta, dataAlvo: e.target.value })}
                className={campo}
              />
            </label>
          </div>

          {custo && (
            <p className="rounded-[var(--raio-cartao)] border border-pauta p-3 text-[12px] text-muted-fg">
              Pelo gasto que você informou, sua reserva de emergência ideal é{" "}
              {formatarMoeda(paraCentavos(custo) * 6)} (seis meses). Já deixei essa meta criada com esse alvo.
            </p>
          )}
        </div>
      ),
    },
    {
      titulo: "Você é MEI?",
      texto:
        "Se for, eu acompanho o faturamento contra o limite anual, aviso antes de estourar e cobro o DAS em dia.",
      conteudo: (
        <div className="space-y-3">
          <label className="flex items-start gap-3 rounded-[var(--raio-cartao)] border border-pauta px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={mei.ativo}
              onChange={(e) => setMei({ ...mei, ativo: e.target.checked })}
              className="mt-1"
            />
            <span>
              Sim, tenho CNPJ de MEI
              <span className="block text-[12px] text-muted-fg">
                Crio uma conta separada para o CNPJ — misturar PF e PJ é o erro que mais complica MEI.
              </span>
            </span>
          </label>

          {mei.ativo && (
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={mei.cnpj}
                onChange={(e) => setMei({ ...mei, cnpj: e.target.value })}
                placeholder="CNPJ (opcional)"
                className={campo}
              />
              <select
                value={mei.atividade}
                onChange={(e) => setMei({ ...mei, atividade: e.target.value })}
                className={campo}
              >
                <option value="SERVICOS">Serviços</option>
                <option value="COMERCIO">Comércio</option>
                <option value="INDUSTRIA">Indústria</option>
                <option value="COMERCIO_E_SERVICOS">Comércio e serviços</option>
                <option value="TRANSPORTE_CARGA">Transporte de carga</option>
              </select>
              <input
                value={mei.das}
                onChange={(e) => setMei({ ...mei, das: e.target.value })}
                placeholder="valor do DAS mensal"
                className={cn(campo, "sm:col-span-2")}
                inputMode="decimal"
              />
            </div>
          )}
        </div>
      ),
    },
  ]

  const atual = passos[passo]
  const ultimo = passo === passos.length - 1

  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="mb-6 flex gap-1.5">
        {passos.map((_, indice) => (
          <div
            key={indice}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              indice <= passo ? "bg-primary" : "bg-papel-2",
            )}
          />
        ))}
      </div>

      <p className="text-xs uppercase tracking-widest text-muted-fg">
        Passo {passo + 1} de {passos.length}
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">{atual.titulo}</h1>
      <p className="mt-2 text-sm text-muted-fg">{atual.texto}</p>

      <div className="mt-6">{atual.conteudo}</div>

      {erro && <p className="mt-4 text-sm text-negativo">{erro}</p>}

      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={() => (passo === 0 ? pular() : setPasso(passo - 1))}
          className="flex items-center gap-2 rounded-full border border-pauta px-4 py-2.5 text-sm text-muted-fg hover:text-foreground"
        >
          {passo === 0 ? (
            "pular por agora"
          ) : (
            <>
              <ArrowLeft className="h-4 w-4" /> voltar
            </>
          )}
        </button>

        <button
          onClick={() => (ultimo ? concluir() : setPasso(passo + 1))}
          disabled={salvando}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {ultimo ? (salvando ? "Montando seu painel…" : "Concluir") : "Continuar"}
          {!ultimo && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

function BotaoAdicionar({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-pauta py-3 text-sm text-muted-fg transition hover:border-acao/40 hover:text-acao"
    >
      <Plus className="h-4 w-4" />
      {children}
    </button>
  )
}

/** Atualiza um item da lista sem mutar o estado anterior. */
function atualizar<T>(definir: React.Dispatch<React.SetStateAction<T[]>>, indice: number, mudanca: Partial<T>) {
  definir((atual) => atual.map((item, posicao) => (posicao === indice ? { ...item, ...mudanca } : item)))
}

function remover<T>(definir: React.Dispatch<React.SetStateAction<T[]>>, indice: number) {
  definir((atual) => atual.filter((_, posicao) => posicao !== indice))
}
